import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { characters, users } from '../database/schema';
import { CreateCharacterDto } from './dto/create-character-dto';

@Injectable()
export class CharactersService {
  constructor(@Inject(DRIZZLE) private readonly db: MySql2Database<typeof schema>) {}

  async createCharacter(userId: number, dto: CreateCharacterDto): Promise<object> {
    const [result] = await this.db.insert(schema.characters).values({
      user: userId,
      name: dto.name,
      persona: dto.persona,
      eyeColor: dto.eyeColor ?? null,
      hairColor: dto.hairColor ?? null,
      hairStyle: dto.hairStyle ?? null,
      height: dto.height ?? null,
      build: dto.build ?? null,
      gender: dto.gender ?? null,
      ethnicity: dto.ethnicity ?? null,
      age: dto.age ?? null,
      artStyle: dto.artStyle ?? null,
      backstory: dto.backstory ?? null,
      relationshipToUser: dto.relationshipToUser ?? null,
      avatarUrl: dto.avatarUrl ?? null,
      createdAt: new Date(),
    });

    // Award XP for creating character
    await this.awardXpForCharacterCreation(userId);

    return {
      id: result.insertId,
      name: dto.name,
      persona: dto.persona,
      eyeColor: dto.eyeColor,
      hairColor: dto.hairColor,
      hairStyle: dto.hairStyle,
      height: dto.height,
      build: dto.build,
      gender: dto.gender,
      ethnicity: dto.ethnicity,
      age: dto.age,
      artStyle: dto.artStyle,
      backstory: dto.backstory,
      relationshipToUser: dto.relationshipToUser,
      avatarUrl: dto.avatarUrl,
    };
  }

  async listCharacters(userId: number) {
    return this.db.select().from(schema.characters).where(eq(characters.user, userId));
  }

  async getOwnedCharacter(userId: number, characterId: number) {
    const [result] = await this.db
      .select()
      .from(schema.characters)
      .where(and(eq(characters.id, characterId), eq(characters.user, userId)));

    if (!result) {
      throw new NotFoundException('Character not found');
    }

    return result;
  }

  async listPublicCharacters(page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    return this.db
      .select({
        id: characters.id,
        name: characters.name,
        persona: characters.persona,
        avatarUrl: characters.avatarUrl,
        cloneCount: characters.cloneCount,
        gender: characters.gender,
        eyeColor: characters.eyeColor,
        hairColor: characters.hairColor,
        hairStyle: characters.hairStyle,
        height: characters.height,
        build: characters.build,
        backstory: characters.backstory,
        relationshipToUser: characters.relationshipToUser,
        createdAt: characters.createdAt,
      })
      .from(characters)
      .where(eq(characters.isPublic, 1))
      .orderBy(desc(characters.cloneCount), desc(characters.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async cloneCharacter(userId: number, sourceCharacterId: number) {
    // Get source character (must be public)
    const [source] = await this.db
      .select()
      .from(characters)
      .where(and(eq(characters.id, sourceCharacterId), eq(characters.isPublic, 1)));

    if (!source) {
      throw new NotFoundException('Public character not found');
    }

    // Create clone for user
    const [result] = await this.db.insert(characters).values({
      user: userId,
      name: source.name,
      persona: source.persona,
      eyeColor: source.eyeColor,
      hairColor: source.hairColor,
      hairStyle: source.hairStyle,
      height: source.height,
      build: source.build,
      gender: source.gender,
      backstory: source.backstory,
      relationshipToUser: source.relationshipToUser,
      avatarUrl: source.avatarUrl,
      clonedFrom: sourceCharacterId,
      isPublic: 0, // Clones are private by default
      createdAt: new Date(),
    });

    // Increment clone count on source
    await this.db
      .update(characters)
      .set({ cloneCount: sql`${characters.cloneCount} + 1` })
      .where(eq(characters.id, sourceCharacterId));

    // Award Creator XP to the original creator (20 XP per clone)
    await this.awardCreatorXp(source.user, 20);

    // Award Lyxi XP to the person cloning (for creating a character)
    await this.awardXpForCharacterCreation(userId);

    return {
      id: result.insertId,
      name: source.name,
      persona: source.persona,
      eyeColor: source.eyeColor,
      hairColor: source.hairColor,
      hairStyle: source.hairStyle,
      height: source.height,
      build: source.build,
      gender: source.gender,
      backstory: source.backstory,
      relationshipToUser: source.relationshipToUser,
      avatarUrl: source.avatarUrl,
      clonedFrom: sourceCharacterId,
      isPublic: 0,
    };
  }

  async updateVisibility(userId: number, characterId: number, isPublic: boolean) {
    // Verify ownership
    await this.getOwnedCharacter(userId, characterId);

    await this.db
      .update(characters)
      .set({ isPublic: isPublic ? 1 : 0 })
      .where(eq(characters.id, characterId));

    return { success: true };
  }

  async deleteCharacter(userId: number, characterId: number) {
    // Verify ownership
    await this.getOwnedCharacter(userId, characterId);

    // Delete all related data in a transaction
    await this.db.transaction(async (tx) => {
      // Delete chat images
      await tx.delete(schema.chatImages).where(
        and(
          eq(schema.chatImages.user, userId),
          eq(schema.chatImages.character, characterId)
        )
      );

      // Delete chat logs
      await tx.delete(schema.chatLogs).where(
        and(
          eq(schema.chatLogs.user, userId),
          eq(schema.chatLogs.character, characterId)
        )
      );

      // Delete chat summaries
      await tx.delete(schema.chatSummaries).where(
        and(
          eq(schema.chatSummaries.user, userId),
          eq(schema.chatSummaries.character, characterId)
        )
      );

      // Finally, delete the character
      await tx.delete(characters).where(
        and(
          eq(characters.id, characterId),
          eq(characters.user, userId)
        )
      );
    });

    return { success: true };
  }

  async generateAvatar(characterName: string, description: string): Promise<string> {
    const prompt = `Professional portrait photo of ${characterName}, ${description}, headshot, studio lighting, sharp focus, high quality, centered composition, looking at camera`;

    const response = await fetch('https://fal.run/fal-ai/flux/dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${process.env.FAL_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        image_size: 'square',
        num_inference_steps: 28,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate avatar');
    }

    const result = await response.json();
    return result.images[0].url;
  }

  async generateAvatarTurbo(characterName: string, description: string): Promise<string> {
    const prompt = `Professional portrait photo of ${characterName}, ${description}, headshot, studio lighting, sharp focus, high quality, centered composition, looking at camera`;

    const response = await fetch('https://fal.run/fal-ai/z-image/turbo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${process.env.FAL_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        image_size: 'square_hd',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate preview');
    }

    const result = await response.json();
    return result.images[0].url;
  }

  private async awardXpForCharacterCreation(userId: number) {
    await this.db
      .update(users)
      .set({
        lyxiXp: sql`${users.lyxiXp} + 50`,
        lyxiLevel: sql`FLOOR(${users.lyxiXp} / 100) + 1`,
        // Keep legacy fields
        xp: sql`${users.xp} + 50`,
        charactersCreatedCount: sql`${users.charactersCreatedCount} + 1`,
      })
      .where(eq(users.id, userId));
  }

  private async awardCreatorXp(userId: number, amount: number) {
    await this.db
      .update(users)
      .set({
        creatorXp: sql`${users.creatorXp} + ${amount}`,
        creatorLevel: sql`FLOOR(${users.creatorXp} / 200) + 1`,
      })
      .where(eq(users.id, userId));
  }
}
