import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import type { QueryError } from 'mysql2';
import type { Request } from 'express';
import { LoginDto } from './dto/login-dto';
import { RegisterDto } from './dto/register-dto';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { compareSync, hashSync } from 'bcrypt';
import { and, eq, sql } from 'drizzle-orm';
import { chatLogs, characters, users } from '../database/schema';
import { JwtService } from '@nestjs/jwt';

function getDuplicateEntryError(error: unknown): QueryError | undefined {
  if (!(error instanceof Error)) return undefined;
  const cause = 'cause' in error ? error.cause : undefined;
  const candidate = (cause ?? error) as QueryError;
  return candidate.code === 'ER_DUP_ENTRY' ? candidate : undefined;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: MySql2Database<typeof schema>,
    private readonly jwtService: JwtService,
  ) {}

  async loginUser(loginDto: LoginDto, request: Request): Promise<object> {
    const [result] = await this.db
      .select()
      .from(schema.users)
      .where(eq(users.email, loginDto.email));

    if (!result) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!compareSync(loginDto.password, result.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.db.insert(schema.loginLog).values({
      user: result.id,
      ip_address: request.ip ?? 'unknown',
      userAgent: request.headers['user-agent'] ?? 'unknown',
      timestamp: new Date(),
    });

    return {
      access_token: await this.jwtService.signAsync({ sub: result.id, email: result.email }),
    };
  }

  async registerUser(registerDto: RegisterDto): Promise<object> {
    try {
      await this.db.insert(schema.users).values({
        username: registerDto.username,
        email: registerDto.email,
        password: hashSync(registerDto.password, 12),
        createdAt: new Date(),
      });

      this.logger.log(`Created user ${registerDto.username}`);
      return { message: 'registered' };
    } catch (error) {
      const duplicateEntryError = getDuplicateEntryError(error);
      if (duplicateEntryError) {
        throw new ConflictException('Username or email already in use');
      }

      this.logger.error(
        `Failed to register user ${registerDto.username}`,
        error instanceof Error ? error.stack : error,
      );
      throw new InternalServerErrorException('Failed to register user');
    }
  }

  async getUserById(userId: number) {
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        isAdmin: users.isAdmin,
        isPrivate: users.isPrivate,
        // Dual level fields
        lyxiLevel: users.lyxiLevel,
        lyxiXp: users.lyxiXp,
        creatorLevel: users.creatorLevel,
        creatorXp: users.creatorXp,
        // Legacy fields
        level: users.level,
        xp: users.xp,
        messagesCount: users.messagesCount,
        charactersCreatedCount: users.charactersCreatedCount,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async getUserStats(userId: number) {
    const user = await this.getUserById(userId);

    // Get character count
    const [characterCount] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(characters)
      .where(eq(characters.user, userId));

    // Get message count (user messages only)
    const [messageCount] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(chatLogs)
      .where(and(eq(chatLogs.user, userId), eq(chatLogs.role, 'user')));

    // Calculate Lyxi level and XP to next level
    const lyxiLevel = Math.floor(user.lyxiXp / 100) + 1;
    const lyxiXpToNextLevel = (lyxiLevel * 100) - user.lyxiXp;

    // Calculate Creator level and XP to next level
    const creatorLevel = Math.floor(user.creatorXp / 200) + 1;
    const creatorXpToNextLevel = (creatorLevel * 200) - user.creatorXp;

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
      isPrivate: user.isPrivate,
      createdAt: user.createdAt,
      stats: {
        // Dual level system
        lyxiLevel,
        lyxiXp: user.lyxiXp,
        lyxiXpToNextLevel,
        creatorLevel,
        creatorXp: user.creatorXp,
        creatorXpToNextLevel,
        // Legacy fields for backward compatibility
        level: lyxiLevel,
        xp: user.lyxiXp,
        xpToNextLevel: lyxiXpToNextLevel,
        // Stats
        charactersCreated: characterCount.count,
        messagesSent: messageCount.count,
      },
    };
  }

  async updateProfile(userId: number, data: { username?: string; email?: string }) {
    await this.db
      .update(users)
      .set({
        ...(data.username && { username: data.username }),
        ...(data.email && { email: data.email }),
      })
      .where(eq(users.id, userId));

    return { success: true };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!compareSync(currentPassword, user.password)) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.db
      .update(users)
      .set({ password: hashSync(newPassword, 12) })
      .where(eq(users.id, userId));

    return { success: true };
  }

  async updatePrivacy(userId: number, isPrivate: boolean) {
    await this.db
      .update(users)
      .set({ isPrivate })
      .where(eq(users.id, userId));

    return { success: true, isPrivate };
  }
}
