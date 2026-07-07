import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { eq, desc, and } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { users, characters } from '../database/schema';

export interface PublicProfile {
  id: number;
  username: string;
  lyxiLevel: number;
  lyxiXp: number;
  creatorLevel: number;
  creatorXp: number;
  createdAt: string;
  publicCharacters: Array<{
    id: number;
    name: string;
    persona: string;
    avatarUrl?: string;
    cloneCount: number;
    createdAt: string;
  }>;
}

@Injectable()
export class ProfileService {
  constructor(@Inject(DRIZZLE) private readonly db: MySql2Database<typeof schema>) {}

  async getProfileByUsername(username: string): Promise<PublicProfile> {
    // Get user data
    const [user] = await this.db
      .select({
        id: users.id,
        username: users.username,
        lyxiLevel: users.lyxiLevel,
        lyxiXp: users.lyxiXp,
        creatorLevel: users.creatorLevel,
        creatorXp: users.creatorXp,
        isPrivate: users.isPrivate,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.username, username));

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isPrivate) {
      throw new NotFoundException('This profile is private');
    }

    // Get public characters
    const publicChars = await this.db
      .select({
        id: characters.id,
        name: characters.name,
        persona: characters.persona,
        avatarUrl: characters.avatarUrl,
        cloneCount: characters.cloneCount,
        createdAt: characters.createdAt,
      })
      .from(characters)
      .where(and(eq(characters.user, user.id), eq(characters.isPublic, 1)))
      .orderBy(desc(characters.cloneCount), desc(characters.createdAt));

    return {
      id: user.id,
      username: user.username,
      lyxiLevel: user.lyxiLevel,
      lyxiXp: user.lyxiXp,
      creatorLevel: user.creatorLevel,
      creatorXp: user.creatorXp,
      createdAt: user.createdAt.toISOString(),
      publicCharacters: publicChars.map(c => ({
        id: c.id,
        name: c.name,
        persona: c.persona,
        avatarUrl: c.avatarUrl || undefined,
        cloneCount: c.cloneCount || 0,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  async getProfileById(userId: number): Promise<PublicProfile> {
    // Get user data
    const [user] = await this.db
      .select({
        id: users.id,
        username: users.username,
        lyxiLevel: users.lyxiLevel,
        lyxiXp: users.lyxiXp,
        creatorLevel: users.creatorLevel,
        creatorXp: users.creatorXp,
        isPrivate: users.isPrivate,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isPrivate) {
      throw new NotFoundException('This profile is private');
    }

    // Get public characters
    const publicChars = await this.db
      .select({
        id: characters.id,
        name: characters.name,
        persona: characters.persona,
        avatarUrl: characters.avatarUrl,
        cloneCount: characters.cloneCount,
        createdAt: characters.createdAt,
      })
      .from(characters)
      .where(and(eq(characters.user, user.id), eq(characters.isPublic, 1)))
      .orderBy(desc(characters.cloneCount), desc(characters.createdAt));

    return {
      id: user.id,
      username: user.username,
      lyxiLevel: user.lyxiLevel,
      lyxiXp: user.lyxiXp,
      creatorLevel: user.creatorLevel,
      creatorXp: user.creatorXp,
      createdAt: user.createdAt.toISOString(),
      publicCharacters: publicChars.map(c => ({
        id: c.id,
        name: c.name,
        persona: c.persona,
        avatarUrl: c.avatarUrl || undefined,
        cloneCount: c.cloneCount || 0,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }
}
