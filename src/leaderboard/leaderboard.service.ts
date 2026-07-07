import { Inject, Injectable } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { desc, eq, sql, and } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { users, characters, weeklyStats, relationshipLevels } from '../database/schema';

interface PodiumEntry {
  userId: number;
  username: string;
  value: number;
  characterId?: number;
  characterName?: string;
}

@Injectable()
export class LeaderboardService {
  constructor(@Inject(DRIZZLE) private readonly db: MySql2Database<typeof schema>) {}

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay();
    const diff = (day === 0 ? -6 : 1) - day; // Adjust to Monday
    d.setUTCDate(d.getUTCDate() + diff);
    return d;
  }

  private getNextWeekStart(): Date {
    const now = new Date();
    const currentWeekStart = this.getWeekStart(now);
    const nextWeek = new Date(currentWeekStart);
    nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
    return nextWeek;
  }

  async getWeeklyResetTime() {
    const nextWeek = this.getNextWeekStart();
    return {
      nextReset: nextWeek.toISOString(),
      millisecondsUntilReset: nextWeek.getTime() - Date.now(),
    };
  }

  // Lyxi Tab - Podium 1: Highest Lyxi Level Ever
  async getHighestLyxiLevel(limit = 3): Promise<PodiumEntry[]> {
    const results = await this.db
      .select({
        userId: users.id,
        username: users.username,
        value: users.lyxiLevel,
      })
      .from(users)
      .where(eq(users.isPrivate, false))
      .orderBy(desc(users.lyxiLevel), desc(users.lyxiXp))
      .limit(limit);

    return results.map(r => ({
      userId: r.userId,
      username: r.username,
      value: r.value,
    }));
  }

  // Lyxi Tab - Podium 2: Most Lyxi XP This Week
  async getMostLyxiXpThisWeek(limit = 3): Promise<PodiumEntry[]> {
    const weekStart = this.getWeekStart(new Date());

    const results = await this.db
      .select({
        userId: users.id,
        username: users.username,
        value: weeklyStats.lyxiXpGained,
      })
      .from(weeklyStats)
      .innerJoin(users, eq(weeklyStats.user, users.id))
      .where(and(eq(weeklyStats.weekStart, weekStart), eq(users.isPrivate, false)))
      .orderBy(desc(weeklyStats.lyxiXpGained))
      .limit(limit);

    return results.map(r => ({
      userId: r.userId,
      username: r.username,
      value: r.value,
    }));
  }

  // Lyxi Tab - Podium 3: Highest Companion Relationship Level
  async getHighestRelationshipLevel(limit = 3): Promise<PodiumEntry[]> {
    const results = await this.db
      .select({
        userId: users.id,
        username: users.username,
        value: relationshipLevels.level,
        characterId: characters.id,
        characterName: characters.name,
      })
      .from(relationshipLevels)
      .innerJoin(users, eq(relationshipLevels.user, users.id))
      .innerJoin(characters, eq(relationshipLevels.character, characters.id))
      .where(eq(users.isPrivate, false))
      .orderBy(desc(relationshipLevels.level), desc(relationshipLevels.exp))
      .limit(limit);

    return results.map(r => ({
      userId: r.userId,
      username: r.username,
      value: r.value,
      characterId: r.characterId,
      characterName: r.characterName,
    }));
  }

  // Creator Tab - Podium 1: Highest Creator Level
  async getHighestCreatorLevel(limit = 3): Promise<PodiumEntry[]> {
    const results = await this.db
      .select({
        userId: users.id,
        username: users.username,
        value: users.creatorLevel,
      })
      .from(users)
      .where(eq(users.isPrivate, false))
      .orderBy(desc(users.creatorLevel), desc(users.creatorXp))
      .limit(limit);

    return results.map(r => ({
      userId: r.userId,
      username: r.username,
      value: r.value,
    }));
  }

  // Creator Tab - Podium 2: Most Creator XP This Week
  async getMostCreatorXpThisWeek(limit = 3): Promise<PodiumEntry[]> {
    const weekStart = this.getWeekStart(new Date());

    const results = await this.db
      .select({
        userId: users.id,
        username: users.username,
        value: weeklyStats.creatorXpGained,
      })
      .from(weeklyStats)
      .innerJoin(users, eq(weeklyStats.user, users.id))
      .where(and(eq(weeklyStats.weekStart, weekStart), eq(users.isPrivate, false)))
      .orderBy(desc(weeklyStats.creatorXpGained))
      .limit(limit);

    return results.map(r => ({
      userId: r.userId,
      username: r.username,
      value: r.value,
    }));
  }

  // Creator Tab - Podium 3: Most Popular Characters This Week
  async getMostPopularCharactersThisWeek(limit = 3): Promise<PodiumEntry[]> {
    const weekStart = this.getWeekStart(new Date());

    const results = await this.db.execute(sql`
      SELECT
        u.id as userId,
        u.username,
        c.id as characterId,
        c.name as characterName,
        COALESCE(cws.clone_count, 0) as value
      FROM characters c
      INNER JOIN users u ON c.user_id = u.id
      LEFT JOIN character_weekly_stats cws ON c.id = cws.character_id AND cws.week_start = ${weekStart}
      WHERE c.is_public = 1 AND u.is_private = 0
      ORDER BY value DESC, c.clone_count DESC
      LIMIT ${limit}
    `);

    return (results[0] as any[]).map((r: any) => ({
      userId: r.userId,
      username: r.username,
      value: r.value,
      characterId: r.characterId,
      characterName: r.characterName,
    }));
  }
}
