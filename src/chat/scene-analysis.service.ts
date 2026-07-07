import { Inject, Injectable, Logger } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { characters, sceneHistory } from '../database/schema';

const CHUTES_BASE_URL = 'https://llm.chutes.ai/v1';
const MODEL = 'deepseek-ai/DeepSeek-V3.2-TEE';

interface SceneContext {
  location: string | null;
  sceneDescription: string;
  mood: string;
  timeOfDay: string;
  transitionDetected: boolean;
  transitionType?: 'natural' | 'time_skip' | 'location_change';
  narratorMessage?: string;
}

interface CurrentContext {
  location?: string;
  timeOfDay?: string;
  mood?: string;
}

@Injectable()
export class SceneAnalysisService {
  private readonly logger = new Logger(SceneAnalysisService.name);
  private readonly apiKey = process.env.CHUTES_API_KEY;

  constructor(
    @Inject(DRIZZLE) private readonly db: MySql2Database<typeof schema>,
  ) {}

  async analyzeSceneContext(
    currentContext: CurrentContext,
    recentMessages: { role: string; content: string }[],
    characterName: string
  ): Promise<SceneContext> {
    // Build analysis prompt
    const conversation = recentMessages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');

    const prompt = `Analyze this conversation for environmental and atmospheric context.

Character: ${characterName}
Current location: ${currentContext.location || 'Unknown'}
Current time: ${currentContext.timeOfDay || 'Unknown'}
Current mood: ${currentContext.mood || 'Unknown'}

Recent conversation:
${conversation}

Extract and update:
1. LOCATION: Where is this conversation taking place? (cafe, bedroom, park, etc.) - be specific. If unknown, infer a natural location from the conversation tone/content.
2. SCENE DESCRIPTION: Brief atmospheric details (lighting, sounds, temperature, ambiance) - max 1 sentence
3. MOOD: Character's emotional state (playful, tense, intimate, melancholic, content, nervous, excited, etc.)
4. TIME OF DAY: morning/afternoon/evening/night (infer from context or maintain current)
5. TRANSITION: Did the scene change from previous state? (true/false) If yes, type: natural/time_skip/location_change. Also set true if this is establishing initial context (when current values are "Unknown").
6. NARRATOR MESSAGE: Write a brief, poetic narrator line describing the atmosphere or moment (e.g., "*The cafe grows quieter as evening approaches*", "*A comfortable silence settles between them*"). ALWAYS provide this, even for subtle shifts in mood or atmosphere.

IMPORTANT: If current location is "Unknown", you MUST establish context immediately and set transitionDetected to true with transitionType "natural".

Respond ONLY with valid JSON format:
{
  "location": "string",
  "sceneDescription": "string",
  "mood": "string",
  "timeOfDay": "morning|afternoon|evening|night",
  "transitionDetected": boolean,
  "transitionType": "natural|time_skip|location_change",
  "narratorMessage": "string or null"
}`;

    try {
      const response = await this.complete(prompt, { temperature: 0.5 });

      // Strip markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }

      // Parse JSON response
      const parsed = JSON.parse(cleanedResponse) as SceneContext;

      // Validate required fields
      if (!parsed.location || !parsed.mood || !parsed.timeOfDay) {
        this.logger.warn('Incomplete scene context, using defaults');
        return {
          location: parsed.location || currentContext.location || 'Unknown location',
          sceneDescription: parsed.sceneDescription || 'A quiet moment',
          mood: parsed.mood || currentContext.mood || 'neutral',
          timeOfDay: parsed.timeOfDay || currentContext.timeOfDay || 'afternoon',
          transitionDetected: false,
        };
      }

      return parsed;
    } catch (error) {
      this.logger.error('Failed to analyze scene context', error);
      // Return current context unchanged on error
      return {
        location: currentContext.location || 'Unknown location',
        sceneDescription: 'Continuing the conversation',
        mood: currentContext.mood || 'neutral',
        timeOfDay: currentContext.timeOfDay || 'afternoon',
        transitionDetected: false,
      };
    }
  }

  async updateCharacterContext(
    characterId: number,
    sceneContext: SceneContext
  ): Promise<void> {
    try {
      await this.db
        .update(characters)
        .set({
          currentLocation: sceneContext.location,
          currentSceneDescription: sceneContext.sceneDescription,
          currentMood: sceneContext.mood,
          timeOfDay: sceneContext.timeOfDay,
        })
        .where(eq(characters.id, characterId));

      this.logger.log(`Updated scene context for character ${characterId}: ${sceneContext.location} (${sceneContext.timeOfDay})`);
    } catch (error) {
      this.logger.error(`Failed to update character context for ${characterId}`, error);
    }
  }

  async recordSceneTransition(
    userId: number,
    characterId: number,
    sceneContext: SceneContext
  ): Promise<void> {
    if (!sceneContext.transitionDetected) return;

    try {
      await this.db.insert(sceneHistory).values({
        user: userId,
        character: characterId,
        location: sceneContext.location,
        sceneDescription: sceneContext.sceneDescription,
        mood: sceneContext.mood,
        timeOfDay: sceneContext.timeOfDay,
        transitionType: sceneContext.transitionType || 'natural',
        createdAt: new Date(),
      });

      this.logger.log(`Recorded scene transition: ${sceneContext.transitionType} - ${sceneContext.location}`);
    } catch (error) {
      this.logger.error('Failed to record scene transition', error);
    }
  }

  private async complete(
    prompt: string,
    options?: { temperature?: number }
  ): Promise<string> {
    const response = await fetch(`${CHUTES_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing conversational context and extracting environmental details. Always respond with valid JSON ONLY. Do not use markdown code blocks or any formatting - output raw JSON directly.'
          },
          { role: 'user', content: prompt }
        ],
        stream: false,
        temperature: options?.temperature || 0.5,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.error(`Chutes request failed (${response.status})`, detail);
      throw new Error(`Chutes returned ${response.status}`);
    }

    const result = await response.json() as any;
    return result.choices?.[0]?.message?.content ?? '';
  }
}
