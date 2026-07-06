import { Inject, Injectable, Logger } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import type { QueryError } from 'mysql2';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { chatLogs, chatSummaries, users } from '../database/schema';
import { SendMessageDto } from './dto/send-message-dto';
import { CharactersService } from '../characters/characters.service';
import { SettingsService } from '../settings/settings.service';

const MODEL = 'deepseek-ai/DeepSeek-V3.2-TEE';
const CHUTES_BASE_URL = 'https://llm.chutes.ai/v1';
const FAL_IMAGE_URL = 'https://fal.run/fal-ai/flux/dev';
// once uncompacted history passes this many messages, roll the oldest ones into a summary
const COMPACTION_THRESHOLD = 100;
// how many of the most recent messages to keep as raw, verbatim history after compacting
const KEEP_RECENT = 10;

type Role = 'system' | 'user' | 'assistant';
type ChatMessage = { role: Role; content: string };

// only the fields we actually read off the OpenAI-compatible completion response
type ChutesCompletion = {
  choices?: Array<{ message?: { role?: string; content?: string | null } }>;
};

function isDuplicateEntryError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const cause = 'cause' in error ? error.cause : undefined;
  return ((cause ?? error) as QueryError).code === 'ER_DUP_ENTRY';
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly apiKey = process.env.CHUTES_API_KEY;
  private readonly falKey = process.env.FAL_KEY;

  constructor(
    @Inject(DRIZZLE) private readonly db: MySql2Database<typeof schema>,
    private readonly charactersService: CharactersService,
    private readonly settingsService: SettingsService,
  ) {}

  async sendMessage(
    userId: number,
    dto: SendMessageDto,
  ): Promise<{ message: string; image?: { url: string; description: string }; expGained?: number }> {
    const { characterId, message, idempotencyKey } = dto;

    if (idempotencyKey) {
      const existing = await this.findByIdempotencyKey(idempotencyKey);
      if (existing) return { message: existing.content };
    }

    const character = await this.charactersService.getOwnedCharacter(userId, characterId);
    const basePrompt = await this.settingsService.get('base_system_prompt');
    const { summary, history } = await this.loadConversation(userId, characterId);

    const context: ChatMessage[] = [
      { role: 'system', content: `${basePrompt}\n${character.persona}` },
      ...(summary ? [{ role: 'system' as const, content: `Summary of the conversation so far: ${summary}` }] : []),
      ...history.map((log) => ({ role: log.role as Role, content: log.content })),
      { role: 'user', content: message },
    ];
    const reply = await this.complete(context, { temperature: 1.05, presencePenalty: 0.4 });

    // Determine if image should be generated
    const generateImage = await this.shouldGenerateImage(userId, characterId);
    this.logger.log(`Should generate image: ${generateImage}`);
    let imageData: { url: string; description: string } | undefined;

    if (generateImage) {
      try {
        this.logger.log('Starting image generation...');
        const sceneDescription = await this.generateSceneDescription(character, history, reply);
        this.logger.log(`Scene description: ${sceneDescription}`);
        const imageUrl = await this.generateImage(sceneDescription);
        this.logger.log(`Image generated: ${imageUrl}`);
        imageData = { url: imageUrl, description: sceneDescription };
      } catch (error) {
        this.logger.error('Failed to generate image - continuing without image', error);
        // Don't throw - conversation should succeed even if image fails
      }
    }

    // Determine if EXP should be awarded
    const awardExp = await this.shouldAwardExp(userId, characterId);
    this.logger.log(`Should award EXP: ${awardExp}`);
    let expGained: number | undefined;

    if (awardExp) {
      try {
        this.logger.log('Analyzing emotional depth...');
        // Build conversation context including the new messages
        const conversationForAnalysis = [
          ...history.map((log) => ({ role: log.role, content: log.content })),
          { role: 'user', content: message },
          { role: 'assistant', content: reply },
        ];
        const emotionalScore = await this.analyzeEmotionalDepth(conversationForAnalysis);
        this.logger.log(`Emotional depth score: ${emotionalScore}`);
        expGained = emotionalScore;
        await this.awardCharacterExp(characterId, emotionalScore);
      } catch (error) {
        this.logger.error('Failed to analyze emotional depth - continuing without EXP', error);
      }
    }

    try {
      const logId = await this.recordTurn(userId, characterId, message, reply, idempotencyKey);

      // Award XP for sending message
      await this.awardXp(userId, 5);

      // Store image if generated
      if (imageData) {
        await this.recordImage(userId, characterId, logId, imageData.url, imageData.description);
      }
    } catch (error) {
      if (idempotencyKey && isDuplicateEntryError(error)) {
        // lost the race to a concurrent retry using the same key; return what it wrote
        const existing = await this.findByIdempotencyKey(idempotencyKey);
        if (existing) return { message: existing.content };
      }
      throw error;
    }

    await this.compactIfNeeded(userId, characterId, summary);

    return {
      message: reply,
      ...(imageData && { image: imageData }),
      ...(expGained !== undefined && { expGained }),
    };
  }

  async getHistory(userId: number, characterId: number) {
    await this.charactersService.getOwnedCharacter(userId, characterId);

    return this.db
      .select({
        id: chatLogs.id,
        role: chatLogs.role,
        content: chatLogs.content,
        createdAt: chatLogs.createdAt,
      })
      .from(schema.chatLogs)
      .where(and(eq(chatLogs.user, userId), eq(chatLogs.character, characterId)))
      .orderBy(asc(chatLogs.id));
  }

  async getImages(userId: number, characterId: number) {
    await this.charactersService.getOwnedCharacter(userId, characterId);

    return this.db
      .select()
      .from(schema.chatImages)
      .where(and(eq(schema.chatImages.user, userId), eq(schema.chatImages.character, characterId)))
      .orderBy(asc(schema.chatImages.id));
  }

  private async loadConversation(userId: number, characterId: number) {
    const [summaryRow] = await this.db
      .select()
      .from(schema.chatSummaries)
      .where(and(eq(chatSummaries.user, userId), eq(chatSummaries.character, characterId)));

    const history = await this.db
      .select()
      .from(schema.chatLogs)
      .where(
        and(eq(chatLogs.user, userId), eq(chatLogs.character, characterId), eq(chatLogs.compacted, false)),
      )
      .orderBy(asc(chatLogs.id));

    return { summary: summaryRow?.summary, history };
  }

  private async recordTurn(
    userId: number,
    characterId: number,
    userMessage: string,
    reply: string,
    idempotencyKey?: string,
  ): Promise<number> {
    const now = new Date();
    // one statement, one transaction: the user turn and the assistant reply always land together
    const [result] = await this.db.transaction((tx) =>
      tx.insert(schema.chatLogs).values([
        { user: userId, character: characterId, role: 'user', content: userMessage, createdAt: now },
        {
          user: userId,
          character: characterId,
          role: 'assistant',
          content: reply,
          idempotencyKey: idempotencyKey ?? null,
          createdAt: now,
        },
      ]),
    );

    // Return the assistant message ID (second insert)
    return result.insertId;
  }

  private async findByIdempotencyKey(idempotencyKey: string) {
    const [existing] = await this.db
      .select()
      .from(schema.chatLogs)
      .where(eq(chatLogs.idempotencyKey, idempotencyKey));
    return existing;
  }

  private async complete(
    messages: ChatMessage[],
    options?: { temperature?: number; presencePenalty?: number },
  ): Promise<string> {
    const response = await fetch(`${CHUTES_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: false,
        temperature: options?.temperature,
        presence_penalty: options?.presencePenalty,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.error(`Chutes request failed (${response.status})`, detail);
      throw new Error(`Chutes returned ${response.status}`);
    }

    const result = (await response.json()) as ChutesCompletion;

    if (!Array.isArray(result.choices)) {
      this.logger.error('Unexpected Chutes response', result);
      throw new Error('Chutes returned an unexpected response');
    }

    return result.choices[0]?.message?.content ?? '';
  }

  private async shouldGenerateImage(userId: number, characterId: number): Promise<boolean> {
    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.chatLogs)
      .where(
        and(
          eq(chatLogs.user, userId),
          eq(chatLogs.character, characterId),
          eq(chatLogs.role, 'assistant'),
        ),
      );

    // Generate image for every other assistant message (2nd, 4th, 6th, etc.)
    // If count is odd (1, 3, 5), the next message (2, 4, 6) should have an image
    return result.count % 2 === 1;
  }

  private async shouldAwardExp(userId: number, characterId: number): Promise<boolean> {
    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.chatLogs)
      .where(
        and(
          eq(chatLogs.user, userId),
          eq(chatLogs.character, characterId),
          eq(chatLogs.role, 'assistant'),
        ),
      );

    // Award EXP for every other assistant message (same pattern as images)
    return result.count % 2 === 1;
  }

  private async generateSceneDescription(
    character: any,
    recentHistory: { role: string; content: string }[],
    currentReply: string,
  ): Promise<string> {
    const physicalTraits = [
      character.age ? `${character.age} years old` : null,
      character.ethnicity ? `${character.ethnicity}` : null,
      character.gender ? `${character.gender}` : null,
      character.eyeColor ? `${character.eyeColor} eyes` : null,
      character.hairColor ? `${character.hairColor} hair` : null,
      character.hairStyle ? `${character.hairStyle}` : null,
      character.build ? `${character.build} build` : null,
    ]
      .filter(Boolean)
      .join(', ');

    const styleNote = character.artStyle === 'anime'
      ? ', anime style, manga art, japanese animation style'
      : ', photorealistic, professional photography, cinematic lighting';

    const prompt = `Based on this conversation and character details, create a vivid POV (point-of-view) scene description for an image generator.

Character: ${character.name}
${physicalTraits ? `Physical description: ${physicalTraits}` : ''}
${character.backstory ? `Context: ${character.backstory.substring(0, 200)}` : ''}

Recent conversation:
${recentHistory.slice(-4).map((m) => `${m.role}: ${m.content}`).join('\n')}

Latest message: ${currentReply}

Create a single paragraph POV scene description showing ${character.name} in this moment. IMPORTANT POV requirements:
- Camera angle: First-person perspective, as if YOU are looking at ${character.name}
- Eye contact: ${character.name} should be looking directly at the viewer/camera
- Framing: Close-up or medium shot, intimate and engaging
- Interaction: ${character.name} is engaging directly with YOU (the viewer)
- Position: Describe what ${character.name} is doing TOWARD you or in front of you

Include:
- ${character.name}'s facial expression and direct gaze at viewer
- Their body language and position relative to viewer
- The intimate setting/environment around them
- Mood, lighting, and atmosphere
- Physical details that match the conversation's intensity

Be vivid and immersive. Make the viewer feel present in the scene. Match the content level of the conversation. Keep under 200 words.
APPEND THIS EXACT STYLE SUFFIX TO THE END: ${styleNote}`;

    return await this.complete(
      [
        {
          role: 'system',
          content: 'You are an expert at creating immersive POV (point-of-view) scene descriptions for image generation. Always describe scenes from a first-person camera perspective with the character engaging directly with the viewer. Create intimate, engaging descriptions that make the viewer feel present.',
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.8 },
    );
  }

  private async generateImage(sceneDescription: string): Promise<string> {
    const response = await fetch(FAL_IMAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${this.falKey}`,
      },
      body: JSON.stringify({
        prompt: sceneDescription,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.error(`fal.ai image generation failed (${response.status})`, detail);
      throw new Error(`Image generation failed: ${response.status}`);
    }

    const result = await response.json();
    return result.images[0].url;
  }

  private async recordImage(
    userId: number,
    characterId: number,
    chatLogId: number,
    imageUrl: string,
    sceneDescription: string,
  ) {
    await this.db.insert(schema.chatImages).values({
      user: userId,
      character: characterId,
      chatLog: chatLogId,
      imageUrl,
      sceneDescription,
      createdAt: new Date(),
    });
  }

  private async compactIfNeeded(userId: number, characterId: number, previousSummary?: string) {
    const uncompacted = await this.db
      .select()
      .from(schema.chatLogs)
      .where(
        and(eq(chatLogs.user, userId), eq(chatLogs.character, characterId), eq(chatLogs.compacted, false)),
      )
      .orderBy(asc(chatLogs.id));

    if (uncompacted.length <= COMPACTION_THRESHOLD) {
      return;
    }

    const toCompact = uncompacted.slice(0, uncompacted.length - KEEP_RECENT);
    const summary = await this.summarize(toCompact, previousSummary);
    const lastLogId = toCompact[toCompact.length - 1].id;
    const compactedIds = toCompact.map((log) => log.id);

    // the new summary and the compacted flags must commit together, or messages could
    // be marked compacted without their content ever making it into the summary
    await this.db.transaction(async (tx) => {
      await tx
        .insert(schema.chatSummaries)
        .values({ user: userId, character: characterId, summary, lastLog: lastLogId, updatedAt: new Date() })
        .onDuplicateKeyUpdate({ set: { summary, lastLog: lastLogId, updatedAt: new Date() } });

      await tx.update(chatLogs).set({ compacted: true }).where(inArray(chatLogs.id, compactedIds));
    });

    this.logger.log(`Compacted ${toCompact.length} messages for user ${userId} / character ${characterId}`);
  }

  private async summarize(
    logs: { role: string; content: string }[],
    previousSummary?: string,
  ): Promise<string> {
    const transcript = logs.map((log) => `${log.role}: ${log.content}`).join('\n');
    const prompt = previousSummary
      ? `Existing summary of the conversation so far:\n${previousSummary}\n\nNew messages to fold in:\n${transcript}`
      : `Conversation so far:\n${transcript}`;

    const summary = await this.complete([
      {
        role: 'system',
        content:
          'Summarize the conversation below into a concise third-person summary that preserves important facts, preferences, and context. Keep it under 200 words.',
      },
      { role: 'user', content: prompt },
    ]);

    return summary || previousSummary || '';
  }

  private async awardXp(userId: number, amount: number) {
    await this.db
      .update(users)
      .set({
        xp: sql`${users.xp} + ${amount}`,
        messagesCount: sql`${users.messagesCount} + 1`,
      })
      .where(eq(users.id, userId));
  }

  private async analyzeEmotionalDepth(
    recentHistory: { role: string; content: string }[],
  ): Promise<number> {
    // Get last 4 messages (2 from each party)
    const last4 = recentHistory.slice(-4);

    // Compile into single text for analysis
    const conversationText = last4
      .map((msg, idx) => `Message ${idx + 1} (${msg.role}): ${msg.content}`)
      .join('\n\n');

    const prompt = `Analyze the emotional depth and authenticity of this conversation exchange.

${conversationText}

Rate the emotional depth and meaningful connection demonstrated in these messages on a scale of 1-10, where:

1-3: Shallow, generic responses. No real emotional engagement. Formulaic or robotic.
4-6: Moderate engagement. Some personality showing through, but still somewhat surface-level.
7-8: Good emotional depth. Genuine feelings expressed. Personal and meaningful.
9-10: Deep emotional connection. Vulnerable, authentic, and truly meaningful conversation. Real relationship building.

Consider:
- Authenticity and vulnerability shown
- Depth of emotional expression
- Personal investment in the conversation
- Quality of emotional engagement (not just quantity of words)
- Meaningfulness of the interaction

Respond with ONLY a single number from 1-10. No explanation needed.`;

    try {
      const response = await this.complete(
        [
          {
            role: 'system',
            content: 'You are an expert at analyzing emotional depth and authenticity in conversations. Rate conversations objectively based on genuine emotional connection.',
          },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.3 },
      );

      const score = parseInt(response.trim());
      return isNaN(score) ? 5 : Math.max(1, Math.min(10, score)); // Clamp between 1-10
    } catch (error) {
      this.logger.error('Failed to analyze emotional depth', error);
      return 5; // Default to middle score on error
    }
  }

  private async awardCharacterExp(characterId: number, amount: number) {
    await this.db
      .update(schema.characters)
      .set({
        exp: sql`${schema.characters.exp} + ${amount}`,
      })
      .where(eq(schema.characters.id, characterId));
  }
}