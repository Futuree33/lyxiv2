import { Inject, Injectable, Logger } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { characters } from '../database/schema';

const CHUTES_BASE_URL = 'https://llm.chutes.ai/v1';
const MODEL = 'deepseek-ai/DeepSeek-V3.2-TEE';

export interface NarrativeArc {
  arc: string; // "First meeting", "Growing closer", "Building trust", "Exploring intimacy", etc.
  beat: number; // Current story beat within arc (1-10+)
  tension: number; // 0-10 emotional/dramatic tension
  lastUpdate: string; // ISO timestamp
}

@Injectable()
export class NarrativeTrackerService {
  private readonly logger = new Logger(NarrativeTrackerService.name);
  private readonly apiKey = process.env.CHUTES_API_KEY;

  constructor(
    @Inject(DRIZZLE) private readonly db: MySql2Database<typeof schema>,
  ) {}

  async analyzeNarrativeProgression(
    currentArc: NarrativeArc | null,
    recentConversation: string,
    relationshipLevel: number,
    intimacyLevel: number
  ): Promise<NarrativeArc> {
    const prompt = `Analyze the narrative progression of this relationship story.

Current Arc: ${currentArc?.arc || 'Not yet established'}
Current Beat: ${currentArc?.beat || 0}
Current Tension: ${currentArc?.tension || 5}/10
Relationship Level: ${relationshipLevel}
Intimacy Level: ${intimacyLevel}/10

Recent conversation:
${recentConversation}

Determine:
1. ARC: What narrative arc are they in? Examples: "Strangers becoming friends", "Building trust and connection", "Exploring deeper intimacy", "Facing challenges together", "Growing apart", "Reconciling differences", "Comfortable companionship"
2. BEAT: Story beat within arc (increment if significant progression detected, otherwise maintain)
3. TENSION: Emotional/dramatic tension level (0=calm/peaceful, 5=moderate engagement, 10=peak intensity/conflict)

Consider:
- Has the relationship dynamic shifted?
- Are there unresolved conflicts or growing closeness?
- Has intimacy deepened or emotional walls come down?
- Are they experiencing a pivotal moment?

Respond ONLY with valid JSON:
{ "arc": "string", "beat": number, "tension": number }`;

    try {
      const response = await this.complete(prompt, { temperature: 0.4 });

      // Strip markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }

      const parsed = JSON.parse(cleanedResponse);

      // Validate and return
      return {
        arc: parsed.arc || 'Building connection',
        beat: typeof parsed.beat === 'number' ? parsed.beat : (currentArc?.beat || 1),
        tension: typeof parsed.tension === 'number' ? Math.max(0, Math.min(10, parsed.tension)) : 5,
        lastUpdate: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to analyze narrative progression', error);
      // Return current arc or default on error
      return currentArc || {
        arc: 'Building connection',
        beat: 1,
        tension: 5,
        lastUpdate: new Date().toISOString(),
      };
    }
  }

  async updateNarrativeArc(
    characterId: number,
    narrativeArc: NarrativeArc
  ): Promise<void> {
    try {
      await this.db
        .update(characters)
        .set({
          narrativeArc: JSON.stringify(narrativeArc),
        })
        .where(eq(characters.id, characterId));

      this.logger.log(`Updated narrative arc for character ${characterId}: "${narrativeArc.arc}" (beat ${narrativeArc.beat}, tension ${narrativeArc.tension})`);
    } catch (error) {
      this.logger.error(`Failed to update narrative arc for ${characterId}`, error);
    }
  }

  async recordStoryBeat(
    characterId: number,
    beatDescription: string
  ): Promise<void> {
    try {
      // Get current story beats
      const [character] = await this.db
        .select({ storyBeats: characters.storyBeats })
        .from(characters)
        .where(eq(characters.id, characterId));

      const currentBeats = character?.storyBeats || '';
      const timestamp = new Date().toISOString();
      const newBeat = `[${timestamp}] ${beatDescription}`;

      // Append new beat
      const updatedBeats = currentBeats
        ? `${currentBeats}\n${newBeat}`
        : newBeat;

      await this.db
        .update(characters)
        .set({ storyBeats: updatedBeats })
        .where(eq(characters.id, characterId));

      this.logger.log(`Recorded story beat for character ${characterId}`);
    } catch (error) {
      this.logger.error('Failed to record story beat', error);
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
            content: 'You are an expert narrative analyst. Analyze relationship stories and identify dramatic arcs, story beats, and emotional tension. Always respond with valid JSON ONLY. Do not use markdown code blocks or any formatting - output raw JSON directly.'
          },
          { role: 'user', content: prompt }
        ],
        stream: false,
        temperature: options?.temperature || 0.4,
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
