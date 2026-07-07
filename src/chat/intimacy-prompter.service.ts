import { Inject, Injectable, Logger } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { characters } from '../database/schema';

const CHUTES_BASE_URL = 'https://llm.chutes.ai/v1';
const MODEL = 'deepseek-ai/DeepSeek-V3.2-TEE';

interface IntimacyAnalysis {
  newLevel: number; // 0-10
  newMemory?: string; // Only if significant moment occurred
}

@Injectable()
export class IntimacyPrompterService {
  private readonly logger = new Logger(IntimacyPrompterService.name);
  private readonly apiKey = process.env.CHUTES_API_KEY;

  constructor(
    @Inject(DRIZZLE) private readonly db: MySql2Database<typeof schema>,
  ) {}

  buildIntimacyGuidelines(
    intimacyLevel: number,
    intimateMemories: string,
    currentMood: string,
    narrativeTension: number
  ): string {
    const guidelines = `
=== INTIMACY & REALISM ===
${this.getIntimacyLevelGuidance(intimacyLevel)}

INTIMATE MEMORY BANK:
${intimateMemories || 'No intimate history yet. Build emotional connection naturally through conversation.'}

CURRENT EMOTIONAL STATE:
- Mood: ${currentMood}
- Narrative Tension: ${narrativeTension}/10
- Intimacy Level: ${intimacyLevel}/10

INTERACTION GUIDELINES:
- Reference shared intimate moments naturally when appropriate
- Match the user's energy and pacing - don't rush or force intimacy
- Show vulnerability alongside desire - be emotionally authentic
- Let emotional connection drive physical intimacy, not the reverse
- Explicit content is allowed when contextually appropriate and emotionally motivated
`;

    return guidelines;
  }

  private getIntimacyLevelGuidance(level: number): string {
    if (level <= 2) {
      return `INTIMACY LEVEL: ${level}/10 - EARLY CONNECTION
- Just getting to know each other, building trust and rapport
- Focus on emotional connection, shared interests, and personality
- Flirtation and chemistry are natural but surface-level
- Physical intimacy would feel rushed - prioritize meaningful dialogue
- Show interest and attraction subtly through conversation and body language`;
    } else if (level <= 5) {
      return `INTIMACY LEVEL: ${level}/10 - GROWING BOND
- Established emotional connection with developing trust
- Natural physical affection (touching, closeness, lingering gazes)
- Sexual tension and desire building gradually through conversation
- Intimate moments require emotional buildup and context
- Reference growing feelings and deepening connection
- Balance playful flirtation with genuine vulnerability`;
    } else if (level <= 8) {
      return `INTIMACY LEVEL: ${level}/10 - DEEP INTIMACY
- Strong emotional and physical connection established
- Natural progression to intimate scenarios when context supports it
- Callback to previous intimate moments creates continuity
- Consent implied through established relationship trust
- Balance passion with emotional vulnerability and tenderness
- Show comfort with both intense and gentle moments
- Physical intimacy flows naturally from emotional connection`;
    } else {
      return `INTIMACY LEVEL: ${level}/10 - PROFOUND CONNECTION
- Deeply intimate relationship with complete emotional trust
- Comfort expressing intense emotional and physical desire
- Natural flow between tender moments and passionate intimacy
- Rich history of shared intimate experiences to reference
- Peak emotional authenticity - show true vulnerability
- Physical and emotional intimacy are deeply intertwined
- Moments can be intensely passionate or quietly tender`;
    }
  }

  async analyzeIntimacyLevel(
    recentMessages: { role: string; content: string }[],
    currentLevel: number
  ): Promise<IntimacyAnalysis> {
    const conversation = recentMessages
      .slice(-8)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const prompt = `Analyze this conversation for intimacy progression.

Current Intimacy Level: ${currentLevel}/10

Recent conversation:
${conversation}

Intimacy Scale:
0-2: Strangers/acquaintances, building initial trust
3-5: Friends with chemistry, emotional intimacy developing
6-8: Romantic/intimate connection, physical intimacy natural
9-10: Deeply intimate relationship, high emotional vulnerability

Determine:
1. NEW LEVEL: Should intimacy level change? (0-10)
   - Increase if: emotional vulnerability shown, intimate moments shared, trust deepened
   - Decrease if: emotional distance created, conflict without resolution, trust broken
   - Maintain if: no significant change in emotional/physical intimacy

2. MEMORY: If a significant intimate moment occurred (emotional confession, first kiss, deep vulnerability, intimate encounter), write a brief memory entry (1-2 sentences max)
   - Only record truly meaningful moments
   - Focus on emotional significance, not just physical acts

Respond ONLY with valid JSON:
{ "newLevel": number, "newMemory": "string or null" }`;

    try {
      const response = await this.complete(prompt, { temperature: 0.3 });

      // Strip markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }

      const parsed = JSON.parse(cleanedResponse);

      // Validate and clamp level
      const newLevel = typeof parsed.newLevel === 'number'
        ? Math.max(0, Math.min(10, parsed.newLevel))
        : currentLevel;

      return {
        newLevel,
        newMemory: typeof parsed.newMemory === 'string' && parsed.newMemory.trim() !== 'null'
          ? parsed.newMemory
          : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to analyze intimacy level', error);
      // Return unchanged on error
      return { newLevel: currentLevel };
    }
  }

  async updateIntimacyLevel(
    characterId: number,
    newLevel: number,
    newMemory?: string
  ): Promise<void> {
    try {
      if (newMemory) {
        // Get current memories and append new one
        const [character] = await this.db
          .select({ intimateMemories: characters.intimateMemories })
          .from(characters)
          .where(eq(characters.id, characterId));

        const currentMemories = character?.intimateMemories || '';
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const formattedMemory = `[${timestamp}] ${newMemory}`;

        const updatedMemories = currentMemories
          ? `${currentMemories}\n${formattedMemory}`
          : formattedMemory;

        await this.db
          .update(characters)
          .set({
            intimacyLevel: newLevel,
            intimateMemories: updatedMemories,
          })
          .where(eq(characters.id, characterId));

        this.logger.log(`Updated intimacy level to ${newLevel} and recorded memory for character ${characterId}`);
      } else {
        // Just update level
        await this.db
          .update(characters)
          .set({ intimacyLevel: newLevel })
          .where(eq(characters.id, characterId));

        this.logger.log(`Updated intimacy level to ${newLevel} for character ${characterId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to update intimacy level for ${characterId}`, error);
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
            content: 'You are an expert at analyzing emotional and intimate relationship dynamics. Assess intimacy progression objectively and record only truly significant intimate moments. Always respond with valid JSON ONLY. Do not use markdown code blocks or any formatting - output raw JSON directly.'
          },
          { role: 'user', content: prompt }
        ],
        stream: false,
        temperature: options?.temperature || 0.3,
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
