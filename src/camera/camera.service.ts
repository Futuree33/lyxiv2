import { Inject, Injectable, Logger } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import type { GenerateCameraImageDto } from './camera.controller';
import * as fs from 'fs/promises';
import * as path from 'path';

const VENICE_IMAGE_URL = 'https://api.venice.ai/api/v1/image/generate';
const VENICE_IMAGE_MODEL = 'seedream-v4';
const CHUTES_BASE_URL = 'https://llm.chutes.ai/v1';
const MODEL = 'deepseek-ai/DeepSeek-V3.2-TEE';

@Injectable()
export class CameraService {
  private readonly logger = new Logger(CameraService.name);
  private readonly veniceKey = process.env.VENICE_KEY || 'VENICE_INFERENCE_KEY_cOOL1Dr5zjNfz_oJNSoipt9gKn_1DV2cyAxtEolBgI';
  private readonly apiKey = process.env.CHUTES_API_KEY;

  constructor(@Inject(DRIZZLE) private readonly db: MySql2Database<typeof schema>) {}

  async generateImage(userId: number, dto: GenerateCameraImageDto) {
    let prompt = '';

    try {
      if (dto.mode === 'character') {
        if (!dto.characterIds || dto.characterIds.length === 0) {
          throw new Error('Character mode requires at least one character ID');
        }

        // Get characters
        const characters = await this.db
          .select()
          .from(schema.characters)
          .where(inArray(schema.characters.id, dto.characterIds));

        if (characters.length === 0) {
          throw new Error('No characters found with the provided IDs');
        }

        // Build prompt from characters
        const characterDescriptions = characters.map((char) => {
          const traits = [
            char.name,
            char.gender,
            char.age ? `${char.age} years old` : null,
            char.ethnicity,
         //   char.eyeColor ? `${char.eyeColor} colored eyes` : null,
            char.hairColor && char.hairStyle ? `${char.hairColor} ${char.hairStyle} hair` : null,
            char.height,
            char.build,
          ].filter(Boolean).join(', ');
          return traits;
        });

        const styleNote = dto.artStyle === 'anime'
          ? ', anime style, manga art, japanese animation style'
          : ', photorealistic, professional photography, cinematic lighting, high quality';

        if (characters.length === 1) {
          prompt = `${characterDescriptions[0]}, ${dto.sceneDescription}${styleNote}`;
        } else {
          prompt = `Group photo featuring: ${characterDescriptions.join(' and ')}, ${dto.sceneDescription}${styleNote}`;
        }
      } else if (dto.mode === 'custom') {
        if (!dto.customPerson) {
          throw new Error('Custom mode requires customPerson data');
        }

        // Build prompt from custom person
        const person = dto.customPerson;
        const traits = [
          person.age ? `${person.age} years old` : null,
          person.ethnicity,
          person.gender,
          person.eyeColor ? `${person.eyeColor} eyes` : null,
          person.hairColor && person.hairStyle ? `${person.hairColor} ${person.hairStyle} hair` : null,
          person.height,
          person.build,
          person.clothing,
        ].filter(Boolean).join(', ');

        const styleNote = dto.artStyle === 'anime'
          ? ', anime style, manga art, japanese animation style'
          : ', photorealistic, professional photography, cinematic lighting, high quality';

        // If no traits provided, use generic person
        const personDesc = traits.trim() || 'person';
        prompt = `Portrait of ${personDesc}, ${dto.sceneDescription}${styleNote}`;
      }

      if (!prompt.trim()) {
        throw new Error('Failed to generate prompt from provided data');
      }

      this.logger.log(`Initial prompt: ${prompt}`);

      // Improve prompt using DeepSeek
      const improvedPrompt = await this.improvePrompt(prompt, dto.artStyle || 'realistic');
      this.logger.log(`Improved prompt: ${improvedPrompt}`);

      // Generate image using Venice
      const imageUrl = await this.generateWithVenice(improvedPrompt);

      // Save to database
      if (dto.mode === 'character' && dto.characterIds && dto.characterIds.length > 0) {
        // Create one record per character
        for (const characterId of dto.characterIds) {
          await this.db.insert(schema.chatImages).values({
            user: userId,
            character: characterId,
            chatLog: null,
            imageUrl,
            sceneDescription: dto.sceneDescription,
            createdAt: new Date(),
          });
        }
        this.logger.log(`Saved camera image to ${dto.characterIds.length} character(s)`);
      } else if (dto.mode === 'custom') {
        // Create one record with null character (Camera Model)
        await this.db.insert(schema.chatImages).values({
          user: userId,
          character: null,
          chatLog: null,
          imageUrl,
          sceneDescription: dto.sceneDescription,
          createdAt: new Date(),
        });
        this.logger.log('Saved camera image as Camera Model');
      }

      return {
        url: imageUrl,
        description: improvedPrompt,
      };
    } catch (error) {
      this.logger.error('Camera generation failed:', error);
      throw error;
    }
  }

  private async generateWithVenice(prompt: string): Promise<string> {
    const response = await fetch(VENICE_IMAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.veniceKey}`,
      },
      body: JSON.stringify({
        model: VENICE_IMAGE_MODEL,
        prompt,
        safe_mode: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Venice image generation failed: ${response.status}`, errorText);
      throw new Error(`Venice image generation failed: ${response.status}`);
    }

    const result = await response.json();

    if (typeof result.images?.[0] === 'string') {
      const base64Data = result.images[0];
      return await this.saveImageToFile(base64Data);
    }

    throw new Error('Unexpected Venice response format');
  }

  private async improvePrompt(basicPrompt: string, artStyle: 'realistic' | 'anime'): Promise<string> {
    const systemPrompt = artStyle === 'anime'
      ? 'You are an expert at writing image generation prompts for anime/manga style art. Given a basic description, enhance it with vivid details, composition notes, and technical terms that will produce stunning anime artwork.'
      : 'You are an expert at writing image generation prompts for photorealistic images. Given a basic description, enhance it with vivid details, lighting, composition, and camera settings that will produce stunning realistic photos.';

    const userPrompt = `Improve this image generation prompt by adding vivid details, better composition notes, and technical specifications. Keep the core subject and style intact, but make it more detailed and descriptive.

Original prompt: ${basicPrompt}

Enhanced prompt (respond with ONLY the improved prompt, no explanations):`;

    const response = await fetch(`${CHUTES_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      this.logger.warn(`Prompt improvement failed, using original prompt`);
      return basicPrompt; // Fallback to basic prompt if improvement fails
    }

    const result = await response.json();
    const improvedPrompt = result.choices?.[0]?.message?.content?.trim();

    return improvedPrompt || basicPrompt;
  }

  private async saveImageToFile(base64Data: string): Promise<string> {
    // Detect image type from base64 header
    const imageType = base64Data.startsWith('/9j/') ? 'jpeg' : 'png';
    const buffer = Buffer.from(base64Data, 'base64');

    const uploadsDir = path.join(process.cwd(), 'uploads', 'camera');
    await fs.mkdir(uploadsDir, { recursive: true });

    const filename = `camera-${Date.now()}-${Math.random().toString(36).slice(2)}.${imageType}`;
    const filepath = path.join(uploadsDir, filename);

    await fs.writeFile(filepath, buffer);
    this.logger.log(`Saved camera image to: ${filepath}`);

    return `/uploads/camera/${filename}`;
  }
}
