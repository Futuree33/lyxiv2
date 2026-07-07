import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import type { QueryError } from 'mysql2';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { chatLogs, chatSummaries, users } from '../database/schema';
import { SendMessageDto } from './dto/send-message-dto';
import { CharactersService } from '../characters/characters.service';
import { SettingsService } from '../settings/settings.service';
import { SceneAnalysisService } from './scene-analysis.service';
import { NarrativeTrackerService, type NarrativeArc } from './narrative-tracker.service';
import { IntimacyPrompterService } from './intimacy-prompter.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { Response } from 'express';

const MODEL = 'deepseek-ai/DeepSeek-V3.2-TEE';
const CHUTES_BASE_URL = 'https://llm.chutes.ai/v1';
const FAL_IMAGE_URL = 'https://fal.run/fal-ai/z-image/turbo';
// How many of the most recent messages to keep accessible (last 10 messages always available)
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
    private readonly sceneAnalysis: SceneAnalysisService,
    private readonly narrativeTracker: NarrativeTrackerService,
    private readonly intimacyPrompter: IntimacyPrompterService,
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
    const { longTermMemory, summary, history } = await this.loadConversation(userId, characterId);

    // Build enhanced system prompt with atmospheric context
    const sceneContext = {
      location: character.currentLocation,
      sceneDescription: character.currentSceneDescription,
      mood: character.currentMood,
      timeOfDay: character.timeOfDay,
    };

    // Parse narrative arc if it exists
    let narrativeArc: NarrativeArc | null = null;
    if (character.narrativeArc) {
      try {
        narrativeArc = JSON.parse(character.narrativeArc);
      } catch (e) {
        this.logger.warn('Failed to parse narrative arc', e);
      }
    }

    // Build intimacy guidelines
    const intimacyGuidelines = this.intimacyPrompter.buildIntimacyGuidelines(
      character.intimacyLevel || 0,
      character.intimateMemories || '',
      character.currentMood || 'neutral',
      narrativeArc?.tension || 5
    );

    // Construct enhanced system prompt
    const scenePrompt = sceneContext.location ? `
=== SCENE CONTEXT ===
Location: ${sceneContext.location || 'Unspecified'}
Atmosphere: ${sceneContext.sceneDescription || 'Normal setting'}
Time of Day: ${sceneContext.timeOfDay || 'Daytime'}
Your Current Mood: ${sceneContext.mood || 'Neutral'}
` : '';

    const narrativePrompt = narrativeArc ? `
=== NARRATIVE STATE ===
Story Arc: ${narrativeArc.arc}
Story Beat: ${narrativeArc.beat}
Tension Level: ${narrativeArc.tension}/10
` : '';

    const enhancedSystemPrompt = `${basePrompt}
${scenePrompt}${narrativePrompt}${intimacyGuidelines}
=== CHARACTER ===
${character.persona}`;

    const context: ChatMessage[] = [
      { role: 'system', content: enhancedSystemPrompt },
      // Add long-term memory if it exists
      ...(longTermMemory
        ? [{ role: 'system' as const, content: `Important memories about this relationship:\n${longTermMemory}` }]
        : []),
      // Add accumulated conversation summaries
      ...(summary
        ? [{ role: 'system' as const, content: `Previous conversation history:\n${summary}` }]
        : []),
      // Add recent uncompacted messages
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

      // Background atmospheric context analysis (async, non-blocking)
      this.analyzeAndUpdateContext(
        userId,
        characterId,
        character,
        history,
        message,
        reply,
        logId
      ).catch(err => this.logger.error('Background context analysis failed', err));
    } catch (error) {
      if (idempotencyKey && isDuplicateEntryError(error)) {
        // lost the race to a concurrent retry using the same key; return what it wrote
        const existing = await this.findByIdempotencyKey(idempotencyKey);
        if (existing) return { message: existing.content };
      }
      throw error;
    }

    await this.compactIfNeeded(userId, characterId);

    return {
      message: reply,
      ...(imageData && { image: imageData }),
      ...(expGained !== undefined && { expGained }),
    };
  }

  async sendMessageStream(userId: number, dto: SendMessageDto, res: Response) {
    const { characterId, message, idempotencyKey } = dto;

    // Helper to send SSE events
    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      if (idempotencyKey) {
        const existing = await this.findByIdempotencyKey(idempotencyKey);
        if (existing) {
          sendEvent('message', { content: existing.content });
          sendEvent('done', {});
          res.end();
          return;
        }
      }

      const character = await this.charactersService.getOwnedCharacter(userId, characterId);
      const basePrompt = await this.settingsService.get('base_system_prompt');
      const { longTermMemory, summary, history } = await this.loadConversation(userId, characterId);

      // Build enhanced system prompt with atmospheric context
      const sceneContext = {
        location: character.currentLocation,
        sceneDescription: character.currentSceneDescription,
        mood: character.currentMood,
        timeOfDay: character.timeOfDay,
      };

      // Parse narrative arc if it exists
      let narrativeArc: NarrativeArc | null = null;
      if (character.narrativeArc) {
        try {
          narrativeArc = JSON.parse(character.narrativeArc);
        } catch (e) {
          this.logger.warn('Failed to parse narrative arc', e);
        }
      }

      // Build intimacy guidelines
      const intimacyGuidelines = this.intimacyPrompter.buildIntimacyGuidelines(
        character.intimacyLevel || 0,
        character.intimateMemories || '',
        character.currentMood || 'neutral',
        narrativeArc?.tension || 5
      );

      // Construct enhanced system prompt
      const scenePrompt = sceneContext.location ? `
=== SCENE CONTEXT ===
Location: ${sceneContext.location || 'Unspecified'}
Atmosphere: ${sceneContext.sceneDescription || 'Normal setting'}
Time of Day: ${sceneContext.timeOfDay || 'Daytime'}
Your Current Mood: ${sceneContext.mood || 'Neutral'}
` : '';

      const narrativePrompt = narrativeArc ? `
=== NARRATIVE STATE ===
Story Arc: ${narrativeArc.arc}
Story Beat: ${narrativeArc.beat}
Tension Level: ${narrativeArc.tension}/10
` : '';

      const enhancedSystemPrompt = `${basePrompt}
${scenePrompt}${narrativePrompt}${intimacyGuidelines}
=== CHARACTER ===
${character.persona}`;

      const context: ChatMessage[] = [
        { role: 'system', content: enhancedSystemPrompt },
        ...(longTermMemory
          ? [{ role: 'system' as const, content: `Important memories about this relationship:\n${longTermMemory}` }]
          : []),
        ...(summary ? [{ role: 'system' as const, content: `Previous conversation history:\n${summary}` }] : []),
        ...history.map((log) => ({ role: log.role as Role, content: log.content })),
        { role: 'user', content: message },
      ];

      // Stream the completion
      let fullReply = '';
      await this.completeStream(context, { temperature: 1.05, presencePenalty: 0.4 }, (chunk) => {
        fullReply += chunk;
        sendEvent('token', { content: chunk });
      });

      // Determine if image should be generated
      const generateImage = await this.shouldGenerateImage(userId, characterId);
      let imageData: { url: string; description: string } | undefined;

      if (generateImage) {
        try {
          sendEvent('generating_image', {});
          const sceneDescription = await this.generateSceneDescription(character, history, fullReply);
          const imageUrl = await this.generateImage(sceneDescription);
          imageData = { url: imageUrl, description: sceneDescription };
          sendEvent('image', imageData);
        } catch (error) {
          this.logger.error('Failed to generate image', error);
        }
      }

      // Determine if EXP should be awarded
      const awardExp = await this.shouldAwardExp(userId, characterId);
      let expGained: number | undefined;

      if (awardExp) {
        try {
          const conversationForAnalysis = [
            ...history.map((log) => ({ role: log.role, content: log.content })),
            { role: 'user', content: message },
            { role: 'assistant', content: fullReply },
          ];
          const emotionalScore = await this.analyzeEmotionalDepth(conversationForAnalysis);
          expGained = emotionalScore;
          await this.awardCharacterExp(characterId, emotionalScore);
          sendEvent('exp', { amount: expGained });
        } catch (error) {
          this.logger.error('Failed to analyze emotional depth', error);
        }
      }

      try {
        const logId = await this.recordTurn(userId, characterId, message, fullReply, idempotencyKey);
        await this.awardXp(userId, 5);

        if (imageData) {
          await this.recordImage(userId, characterId, logId, imageData.url, imageData.description);
        }

        // Background atmospheric context analysis (async, non-blocking)
        this.analyzeAndUpdateContext(
          userId,
          characterId,
          character,
          history,
          message,
          fullReply,
          logId
        ).catch((err: Error) => this.logger.error('Background context analysis failed', err));
      } catch (error) {
        if (idempotencyKey && isDuplicateEntryError(error)) {
          const existing = await this.findByIdempotencyKey(idempotencyKey);
          if (existing) {
            sendEvent('message', { content: existing.content });
          }
        } else {
          throw error;
        }
      }

      await this.compactIfNeeded(userId, characterId);

      sendEvent('done', {});
      res.end();
    } catch (error) {
      this.logger.error('Stream error', error);
      sendEvent('error', { message: error instanceof Error ? error.message : 'Unknown error' });
      res.end();
    }
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

  async getNarratorMessages(userId: number, characterId: number) {
    await this.charactersService.getOwnedCharacter(userId, characterId);

    return this.db
      .select({
        id: schema.narratorMessages.id,
        type: schema.narratorMessages.type,
        content: schema.narratorMessages.content,
        insertedAfterMessageId: schema.narratorMessages.insertedAfterMessageId,
        createdAt: schema.narratorMessages.createdAt,
      })
      .from(schema.narratorMessages)
      .where(and(eq(schema.narratorMessages.user, userId), eq(schema.narratorMessages.character, characterId)))
      .orderBy(asc(schema.narratorMessages.id));
  }

  async getImages(userId: number, characterId: number) {
    await this.charactersService.getOwnedCharacter(userId, characterId);

    return this.db
      .select()
      .from(schema.chatImages)
      .where(and(eq(schema.chatImages.user, userId), eq(schema.chatImages.character, characterId)))
      .orderBy(asc(schema.chatImages.id));
  }

  async getAllImages(userId: number) {
    return this.db
      .select({
        id: schema.chatImages.id,
        imageUrl: schema.chatImages.imageUrl,
        sceneDescription: schema.chatImages.sceneDescription,
        createdAt: schema.chatImages.createdAt,
        characterId: schema.chatImages.character,
        characterName: schema.characters.name,
        characterAvatarUrl: schema.characters.avatarUrl,
      })
      .from(schema.chatImages)
      .leftJoin(schema.characters, eq(schema.chatImages.character, schema.characters.id))
      .where(eq(schema.chatImages.user, userId))
      .orderBy(asc(schema.chatImages.createdAt));
  }

  async deleteImage(userId: number, imageId: number) {
    // Get the image and verify ownership
    const [image] = await this.db
      .select()
      .from(schema.chatImages)
      .where(eq(schema.chatImages.id, imageId));

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    if (image.user !== userId) {
      throw new NotFoundException('Image not found');
    }

    // Delete the file from disk if it's a local file (not a data URL or external URL)
    if (image.imageUrl && !image.imageUrl.startsWith('data:') && !image.imageUrl.startsWith('http')) {
      try {
        const filepath = path.join(process.cwd(), image.imageUrl);
        await fs.unlink(filepath);
        this.logger.log(`Deleted image file: ${filepath}`);
      } catch (error) {
        this.logger.warn(`Failed to delete image file: ${image.imageUrl}`, error);
      }
    }

    // Delete from database
    await this.db.delete(schema.chatImages).where(eq(schema.chatImages.id, imageId));

    return { success: true };
  }

  async getGreeting(userId: number, characterId: number): Promise<{ message: string }> {
    const character = await this.charactersService.getOwnedCharacter(userId, characterId);

    // Check if a greeting already exists (any message in the conversation)
    const [existingMessage] = await this.db
      .select()
      .from(schema.chatLogs)
      .where(
        and(
          eq(chatLogs.user, userId),
          eq(chatLogs.character, characterId),
        ),
      )
      .limit(1);

    // If greeting already exists, return it instead of creating a duplicate
    if (existingMessage) {
      return { message: existingMessage.content };
    }

    const basePrompt = await this.settingsService.get('base_system_prompt');

    // Generate a greeting based on the character's persona
    const greetingPrompt = `You are ${character.name}. Based on your personality and relationship with the user, write a warm, engaging first message to start the conversation. Be natural, friendly, and true to your character. Keep it concise (2-3 sentences).

Character details:
- Name: ${character.name}
- Personality: ${character.persona}
${character.relationshipToUser ? `- Relationship: ${character.relationshipToUser}` : ''}
${character.backstory ? `- Background: ${character.backstory.substring(0, 200)}` : ''}

Write your greeting message now:`;

    const context: ChatMessage[] = [
      { role: 'system', content: `${basePrompt}\n${character.persona}` },
      { role: 'user', content: greetingPrompt },
    ];

    const greeting = await this.complete(context, { temperature: 0.9 });

    // Record the greeting as the first assistant message
    const now = new Date();
    await this.db.insert(schema.chatLogs).values({
      user: userId,
      character: characterId,
      role: 'assistant',
      content: greeting,
      createdAt: now,
    });

    return { message: greeting };
  }

  async generateStandaloneImage(
    userId: number,
    characterId: number,
    customPrompt?: string,
  ): Promise<{ url: string; description: string }> {
    const character = await this.charactersService.getOwnedCharacter(userId, characterId);

    let sceneDescription: string;

    if (customPrompt && customPrompt.trim()) {
      // Use custom prompt but add character name and style
      const styleNote = character.artStyle === 'anime'
        ? ', anime style, manga art, japanese animation style'
        : ', photorealistic, professional photography, cinematic lighting';

      sceneDescription = `${customPrompt.trim()}, featuring ${character.name}${styleNote}`;
    } else {
      // Build description using only character's physical attributes (default)
      const physicalTraits = [
        character.age ? `${character.age} years old` : null,
        character.ethnicity ? `${character.ethnicity}` : null,
        character.gender ? `${character.gender}` : null,
        character.height ? `${character.height}` : null,
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

      sceneDescription = `POV portrait of ${character.name}, ${physicalTraits}, looking directly at camera, making eye contact with viewer, engaging expression, close-up shot, intimate framing, high quality, detailed${styleNote}`;
    }

    this.logger.log(`Generating standalone image for ${character.name}: ${sceneDescription}`);

    try {
      const imageUrl = await this.generateImage(sceneDescription);

      // Record the image without a chat log entry (null chatLog for standalone images)
      await this.recordImage(userId, characterId, null, imageUrl, sceneDescription);

      return { url: imageUrl, description: sceneDescription };
    } catch (error) {
      this.logger.error('Failed to generate standalone image', error);
      throw new Error('Image generation failed');
    }
  }

  private async loadConversation(userId: number, characterId: number) {
    // Get accumulated short-term summary
    const [summaryRow] = await this.db
      .select()
      .from(schema.chatSummaries)
      .where(and(eq(chatSummaries.user, userId), eq(chatSummaries.character, characterId)));

    // Get character's long-term memory
    const [character] = await this.db
      .select({ longTermMemory: schema.characters.longTermMemory })
      .from(schema.characters)
      .where(eq(schema.characters.id, characterId));

    // Get ONLY the last 10 messages (compacted or not) for natural conversation flow
    const history = await this.db
      .select()
      .from(schema.chatLogs)
      .where(and(eq(chatLogs.user, userId), eq(chatLogs.character, characterId)))
      .orderBy(desc(chatLogs.id))
      .limit(10);

    // Reverse to get chronological order
    history.reverse();

    return {
      longTermMemory: character?.longTermMemory,
      summary: summaryRow?.summary,
      history,
    };
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

  private async completeStream(
    messages: ChatMessage[],
    options: { temperature?: number; presencePenalty?: number },
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const response = await fetch(`${CHUTES_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: true,
        temperature: options?.temperature,
        presence_penalty: options?.presencePenalty,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.error(`Chutes stream request failed (${response.status})`, detail);
      throw new Error(`Chutes returned ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async shouldGenerateImage(userId: number, characterId: number): Promise<boolean> {
    // Get recent messages to determine if we should generate an image
    // Only look at last 20 messages to avoid count drift after compaction
    const recentMessages = await this.db
      .select({ role: chatLogs.role })
      .from(schema.chatLogs)
      .where(and(eq(chatLogs.user, userId), eq(chatLogs.character, characterId)))
      .orderBy(desc(chatLogs.id))
      .limit(20);

    // Count assistant messages in recent history
    const assistantCount = recentMessages.filter((m) => m.role === 'assistant').length;

    // Generate image every 2 assistant messages (2nd, 4th, 6th, 8th, etc.)
    // This ensures images don't generate on every message, giving spacing
    return assistantCount % 2 === 0 && assistantCount > 0;
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
      character.height ? `${character.height}` : null,
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
    this.logger.log(`Calling fal.ai turbo with prompt: ${sceneDescription.substring(0, 100)}...`);

    const response = await fetch(FAL_IMAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${this.falKey}`,
      },
      body: JSON.stringify({
        prompt: sceneDescription,
        image_size: 'landscape_16_9',
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.error(`fal.ai turbo image generation failed (${response.status})`, detail);
      throw new Error(`Image generation failed: ${response.status} - ${detail}`);
    }

    const result = await response.json();
    this.logger.log(`fal.ai turbo response received`);
    return result.images[0].url;
  }

  private async saveImageToFile(base64DataUrl: string): Promise<string> {
    // Extract base64 data from data URL
    const matches = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid data URL format');
    }

    const [, extension, base64Data] = matches;
    const buffer = Buffer.from(base64Data, 'base64');

    // Create unique filename
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

    // Use absolute path from project root
    const fs = await import('fs/promises');
    const path = await import('path');
    const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
    const filepath = path.join(uploadsDir, filename);

    // Ensure directory exists
    await fs.mkdir(uploadsDir, { recursive: true });

    // Write file
    await fs.writeFile(filepath, buffer);

    this.logger.log(`Saved image to: ${filepath}`);

    // Return URL path
    return `/uploads/images/${filename}`;
  }

  private async recordImage(
    userId: number,
    characterId: number,
    chatLogId: number | null,
    imageUrl: string,
    sceneDescription: string,
  ) {
    // If it's a data URL, save as file
    let finalUrl = imageUrl;
    if (imageUrl.startsWith('data:')) {
      finalUrl = await this.saveImageToFile(imageUrl);
    }

    await this.db.insert(schema.chatImages).values({
      user: userId,
      character: characterId,
      chatLog: chatLogId,
      imageUrl: finalUrl,
      sceneDescription,
      createdAt: new Date(),
    });
  }

  private async compactIfNeeded(userId: number, characterId: number) {
    // Get ALL messages for this conversation (compacted or not)
    const allMessages = await this.db
      .select()
      .from(schema.chatLogs)
      .where(and(eq(chatLogs.user, userId), eq(chatLogs.character, characterId)))
      .orderBy(asc(chatLogs.id));

    // Only compact if we have more than 10 messages
    if (allMessages.length <= KEEP_RECENT) {
      return;
    }

    // Every 10 messages, compact everything older than the last 10
    // Keep last 10 messages uncompacted, compact everything before that
    const toCompact = allMessages.slice(0, allMessages.length - KEEP_RECENT);

    // Only compact messages that aren't already compacted
    const uncompactedToCompact = toCompact.filter((log) => !log.compacted);

    if (uncompactedToCompact.length === 0) {
      return; // Nothing new to compact
    }

    // Create short-term summary from newly compacted messages
    const shortSummary = await this.createShortSummary(uncompactedToCompact);

    // Extract long-term memories and append to character
    await this.extractLongTermMemory(userId, characterId, uncompactedToCompact);

    const lastLogId = uncompactedToCompact[uncompactedToCompact.length - 1].id;
    const compactedIds = uncompactedToCompact.map((log) => log.id);
    const now = new Date();

    // Get existing summary to append to it
    const [existingRow] = await this.db
      .select()
      .from(schema.chatSummaries)
      .where(and(eq(chatSummaries.user, userId), eq(chatSummaries.character, characterId)));

    // Append new summary with timestamp separator
    const updatedSummary = existingRow?.summary
      ? `${existingRow.summary}\n\n---[${now.toISOString()}]---\n${shortSummary}`
      : shortSummary;

    // Store/update summary and mark messages as compacted
    await this.db.transaction(async (tx) => {
      await tx
        .insert(schema.chatSummaries)
        .values({
          user: userId,
          character: characterId,
          summary: updatedSummary,
          lastLog: lastLogId,
          createdAt: existingRow?.createdAt || now,
          updatedAt: now,
        })
        .onDuplicateKeyUpdate({
          set: {
            summary: updatedSummary,
            lastLog: lastLogId,
            updatedAt: now,
          },
        });

      await tx.update(chatLogs).set({ compacted: true }).where(inArray(chatLogs.id, compactedIds));
    });

    this.logger.log(
      `Compacted ${uncompactedToCompact.length} messages for user ${userId} / character ${characterId}. Keeping last ${KEEP_RECENT} messages accessible.`,
    );
  }

  private async createShortSummary(logs: { role: string; content: string }[]): Promise<string> {
    const transcript = logs.map((log) => `${log.role}: ${log.content}`).join('\n');

    const summary = await this.complete([
      {
        role: 'system',
        content:
          'Create a concise summary of this conversation segment. Focus on key topics discussed, decisions made, and emotional tone. Keep it under 150 words.',
      },
      { role: 'user', content: `Recent conversation:\n${transcript}` },
    ]);

    return summary || '';
  }

  private async extractLongTermMemory(
    userId: number,
    characterId: number,
    logs: { role: string; content: string }[],
  ): Promise<void> {
    const transcript = logs.map((log) => `${log.role}: ${log.content}`).join('\n');

    // Get character's existing long-term memory
    const [character] = await this.db
      .select({ longTermMemory: schema.characters.longTermMemory })
      .from(schema.characters)
      .where(eq(schema.characters.id, characterId));

    const existingMemory = character?.longTermMemory || '';

    // AI extracts important long-term details
    const memoryExtraction = await this.complete([
      {
        role: 'system',
        content: `You are a memory extraction system. Analyze conversations and extract ONLY the most important long-term information that should be remembered permanently.

Extract:
- Nicknames or pet names used
- Important personal facts revealed (birthdays, favorites, dislikes, etc.)
- Key life events mentioned
- Significant relationship developments
- Important promises or commitments
- Core personality traits revealed
- Meaningful shared experiences

Format: Output as a bulleted list. Each item should be 1-2 sentences max. Only include NEW information not already in existing memories.

If nothing important enough for long-term storage, output "NONE".`,
      },
      {
        role: 'user',
        content: `Existing long-term memories:\n${existingMemory || 'None yet'}\n\nNew conversation:\n${transcript}`,
      },
    ]);

    // Only update if new memories were extracted
    if (memoryExtraction && memoryExtraction.trim() !== 'NONE') {
      const updatedMemory = existingMemory
        ? `${existingMemory}\n\n${memoryExtraction}`
        : memoryExtraction;

      await this.db
        .update(schema.characters)
        .set({ longTermMemory: updatedMemory })
        .where(eq(schema.characters.id, characterId));

      this.logger.log(`Extracted long-term memories for character ${characterId}`);
    }
  }

  private async awardXp(userId: number, amount: number) {
    // Award Lyxi XP (for engagement)
    await this.db
      .update(users)
      .set({
        lyxiXp: sql`${users.lyxiXp} + ${amount}`,
        lyxiLevel: sql`FLOOR(${users.lyxiXp} / 100) + 1`,
        // Keep legacy fields for backward compatibility
        xp: sql`${users.xp} + ${amount}`,
        messagesCount: sql`${users.messagesCount} + 1`,
      })
      .where(eq(users.id, userId));

    // Update weekly stats (lazy calculation approach)
    await this.updateWeeklyStats(userId, amount, 0);
  }

  private async updateWeeklyStats(userId: number, lyxiXp: number, creatorXp: number) {
    const now = new Date();
    const weekStart = this.getWeekStart(now);

    // Try to update existing week stats
    await this.db.execute(sql`
      INSERT INTO weekly_stats (user_id, week_start, lyxi_xp_gained, creator_xp_gained, created_at, updated_at)
      VALUES (${userId}, ${weekStart}, ${lyxiXp}, ${creatorXp}, ${now}, ${now})
      ON DUPLICATE KEY UPDATE
        lyxi_xp_gained = lyxi_xp_gained + ${lyxiXp},
        creator_xp_gained = creator_xp_gained + ${creatorXp},
        updated_at = ${now}
    `);
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay();
    const diff = (day === 0 ? -6 : 1) - day; // Adjust to Monday
    d.setUTCDate(d.getUTCDate() + diff);
    return d;
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
    // Update character EXP
    await this.db
      .update(schema.characters)
      .set({
        exp: sql`${schema.characters.exp} + ${amount}`,
      })
      .where(eq(schema.characters.id, characterId));

    // Get the character to find the user
    const [character] = await this.db
      .select({ user: schema.characters.user, exp: schema.characters.exp })
      .from(schema.characters)
      .where(eq(schema.characters.id, characterId));

    if (!character) return;

    // Update or create relationship level entry (for leaderboard)
    const newExp = character.exp + amount;
    const newLevel = Math.floor(newExp / 10) + 1; // 10 EXP per relationship level

    await this.db.execute(sql`
      INSERT INTO relationship_levels (user_id, character_id, level, exp, created_at, updated_at)
      VALUES (${character.user}, ${characterId}, ${newLevel}, ${newExp}, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        exp = ${newExp},
        level = ${newLevel},
        updated_at = NOW()
    `);
  }

  private async analyzeAndUpdateContext(
    userId: number,
    characterId: number,
    character: any,
    history: any[],
    userMessage: string,
    assistantReply: string,
    lastMessageId: number
  ): Promise<void> {
    // Get message count for conditional analysis
    const [countResult] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.chatLogs)
      .where(
        and(
          eq(chatLogs.user, userId),
          eq(chatLogs.character, characterId),
          eq(chatLogs.role, 'assistant'),
        ),
      );
    const messageCount = countResult.count;

    // Build recent conversation including new messages
    const recentMessages = [
      ...history.slice(-6).map((log) => ({ role: log.role, content: log.content })),
      { role: 'user', content: userMessage },
      { role: 'assistant', content: assistantReply },
    ];

    // Run analyses in parallel
    await Promise.all([
      // Scene analysis (every message)
      this.sceneAnalysis.analyzeSceneContext(
        {
          location: character.currentLocation,
          timeOfDay: character.timeOfDay,
          mood: character.currentMood,
        },
        recentMessages,
        character.name
      ).then(async (sceneContext) => {
        await this.sceneAnalysis.updateCharacterContext(characterId, sceneContext);

        // Record scene transition if detected OR every 4 messages for narrative beats
        const shouldInsertNarrator = sceneContext.transitionDetected || (messageCount % 4 === 0 && messageCount > 0);

        if (sceneContext.transitionDetected) {
          await this.sceneAnalysis.recordSceneTransition(userId, characterId, sceneContext);
        }

        // Insert narrator message on transitions or periodically
        if (shouldInsertNarrator && sceneContext.narratorMessage) {
          await this.insertNarratorMessage(
            userId,
            characterId,
            sceneContext.transitionDetected ? 'scene_transition' : 'narrative_beat',
            sceneContext.narratorMessage,
            lastMessageId
          );
        }
      }),

      // Narrative progression (every 5 messages)
      messageCount % 5 === 0 ? (async () => {
        // Parse current arc
        let currentArc: NarrativeArc | null = null;
        if (character.narrativeArc) {
          try {
            currentArc = JSON.parse(character.narrativeArc);
          } catch (e) {
            this.logger.warn('Failed to parse narrative arc for analysis', e);
          }
        }

        const recentConversation = recentMessages
          .map(m => `${m.role}: ${m.content}`)
          .join('\n');

        const narrativeArc = await this.narrativeTracker.analyzeNarrativeProgression(
          currentArc,
          recentConversation,
          character.relationshipLevel || 0,
          character.intimacyLevel || 0
        );

        await this.narrativeTracker.updateNarrativeArc(characterId, narrativeArc);
      })() : Promise.resolve(),

      // Intimacy tracking (every 3 messages)
      messageCount % 3 === 0 ? (async () => {
        const intimacyAnalysis = await this.intimacyPrompter.analyzeIntimacyLevel(
          recentMessages,
          character.intimacyLevel || 0
        );

        await this.intimacyPrompter.updateIntimacyLevel(
          characterId,
          intimacyAnalysis.newLevel,
          intimacyAnalysis.newMemory
        );
      })() : Promise.resolve(),
    ]);
  }

  private async insertNarratorMessage(
    userId: number,
    characterId: number,
    type: string,
    content: string,
    insertedAfterMessageId: number
  ): Promise<void> {
    try {
      await this.db.insert(schema.narratorMessages).values({
        user: userId,
        character: characterId,
        type,
        content,
        insertedAfterMessageId,
        createdAt: new Date(),
      });

      this.logger.log(`Inserted narrator message: ${type} - "${content.substring(0, 50)}..."`);
    } catch (error) {
      this.logger.error('Failed to insert narrator message', error);
    }
  }
}