import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Response } from 'express';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { GenerateChapterDto } from './dto/generate-chapter.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { SaveDraftDto } from './dto/save-draft.dto';
import { CharactersService } from '../characters/characters.service';

const MODEL = 'deepseek-ai/DeepSeek-V3.2-TEE';
const CHUTES_BASE_URL = 'https://llm.chutes.ai/v1';
const WORDS_PER_MINUTE = 200; // Average reading speed

type Role = 'system' | 'user' | 'assistant';
type ChatMessage = { role: Role; content: string };

type ChutesCompletion = {
  choices?: Array<{ message?: { role?: string; content?: string | null } }>;
};

@Injectable()
export class StoriesService {
  private readonly logger = new Logger(StoriesService.name);
  private readonly apiKey = process.env.CHUTES_API_KEY;

  constructor(
    @Inject(DRIZZLE) private readonly db: MySql2Database<typeof schema>,
    private readonly charactersService: CharactersService,
  ) {}

  // ==================== CRUD Operations ====================

  async createStory(userId: number, dto: CreateStoryDto) {
    const now = new Date();

    // Create story record
    const [storyResult] = await this.db.insert(schema.stories).values({
      user: userId,
      title: dto.title,
      description: dto.description,
      pov: dto.pov,
      genre: dto.genre ? JSON.stringify(dto.genre) : null,
      plotIdea: dto.plotIdea,
      storyPlan: dto.storyPlan,
      coverImageUrl: dto.coverImageUrl,
      status: 'draft',
      chapterCount: 0,
      totalWordCount: 0,
      averageReadingTime: 0,
      createdAt: now,
      updatedAt: now,
    });

    const storyId = storyResult.insertId;

    // Attach characters if provided
    if (dto.characterIds && dto.characterIds.length > 0) {
      for (const characterId of dto.characterIds) {
        const character = await this.charactersService.getOwnedCharacter(userId, characterId);
        const role = dto.characterRoles?.[characterId] || 'supporting';

        // Create character snapshot
        const snapshot = {
          name: character.name,
          persona: character.persona,
          eyeColor: character.eyeColor,
          hairColor: character.hairColor,
          hairStyle: character.hairStyle,
          height: character.height,
          build: character.build,
          gender: character.gender,
          ethnicity: character.ethnicity,
          age: character.age,
          backstory: character.backstory,
        };

        await this.db.insert(schema.storyCharacters).values({
          story: storyId,
          character: characterId,
          role,
          characterSnapshot: JSON.stringify(snapshot),
          createdAt: now,
        });
      }
    }

    // Generate Chapter 1
    const chapter1Content = await this.generateFirstChapter(userId, storyId, dto);

    // Award Creator XP
    await this.awardCreatorXp(userId, 100); // Story creation
    await this.awardCreatorXp(userId, 50); // Chapter 1

    // Return story with first chapter
    return {
      id: storyId,
      ...dto,
      chapterCount: 1,
      totalWordCount: chapter1Content.wordCount,
      status: 'in_progress',
      createdAt: now,
      updatedAt: now,
      firstChapter: chapter1Content,
    };
  }

  async listMyStories(userId: number) {
    const stories = await this.db
      .select()
      .from(schema.stories)
      .where(eq(schema.stories.user, userId))
      .orderBy(desc(schema.stories.updatedAt));

    // Parse genre JSON for each story
    return stories.map((story) => ({
      ...story,
      genre: story.genre ? JSON.parse(story.genre) : [],
    }));
  }

  async getStory(userId: number, storyId: number) {
    const [story] = await this.db
      .select()
      .from(schema.stories)
      .where(and(eq(schema.stories.id, storyId), eq(schema.stories.user, userId)));

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    // Get story characters
    const storyCharacters = await this.db
      .select({
        id: schema.storyCharacters.id,
        characterId: schema.storyCharacters.character,
        role: schema.storyCharacters.role,
        snapshot: schema.storyCharacters.characterSnapshot,
      })
      .from(schema.storyCharacters)
      .where(eq(schema.storyCharacters.story, storyId));

    return {
      ...story,
      genre: story.genre ? JSON.parse(story.genre) : [],
      characters: storyCharacters.map((sc) => ({
        ...sc,
        snapshot: sc.snapshot ? JSON.parse(sc.snapshot) : null,
      })),
    };
  }

  async updateStory(userId: number, storyId: number, dto: UpdateStoryDto) {
    await this.verifyStoryOwnership(userId, storyId);

    const updateData: any = {
      ...dto,
      genre: dto.genre ? JSON.stringify(dto.genre) : undefined,
      updatedAt: new Date(),
    };

    await this.db.update(schema.stories).set(updateData).where(eq(schema.stories.id, storyId));

    return { success: true };
  }

  async deleteStory(userId: number, storyId: number) {
    await this.verifyStoryOwnership(userId, storyId);

    // Cascade deletes handled by database constraints
    await this.db.delete(schema.stories).where(eq(schema.stories.id, storyId));

    return { success: true };
  }

  // ==================== Chapter Operations ====================

  async generateChapterStream(userId: number, storyId: number, dto: GenerateChapterDto, res: Response) {
    const story = await this.getStory(userId, storyId);

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Get previous chapters for context
      const previousChapters = await this.getChapters(userId, storyId);
      const nextChapterNumber = previousChapters.length + 1;

      // Build chapter generation prompt
      const messages = this.buildChapterPrompt(story, previousChapters, dto.continuationPrompt);

      let fullContent = '';
      const chapterTitle = dto.chapterTitle || `Chapter ${nextChapterNumber}`;

      // Stream chapter generation
      await this.completeStream(
        messages,
        { temperature: 0.9, presencePenalty: 0.3 },
        (chunk: string) => {
          fullContent += chunk;
          sendEvent('token', { content: chunk });
        },
      );

      // Calculate word count and reading time
      const wordCount = this.countWords(fullContent);
      const readingTime = Math.ceil(wordCount / WORDS_PER_MINUTE);

      // Save chapter to database
      const [chapterResult] = await this.db.insert(schema.storyChapters).values({
        story: storyId,
        chapterNumber: nextChapterNumber,
        title: chapterTitle,
        content: fullContent,
        continuationPrompt: dto.continuationPrompt,
        wordCount,
        readingTime,
        createdAt: new Date(),
      });

      // Update story statistics
      const totalWordCount = previousChapters.reduce((sum, ch) => sum + ch.wordCount, 0) + wordCount;
      const totalChapters = nextChapterNumber;
      const avgReadingTime = Math.ceil(totalWordCount / WORDS_PER_MINUTE);

      await this.db
        .update(schema.stories)
        .set({
          chapterCount: totalChapters,
          totalWordCount,
          averageReadingTime: avgReadingTime,
          status: 'in_progress',
          updatedAt: new Date(),
        })
        .where(eq(schema.stories.id, storyId));

      // Award Creator XP
      await this.awardCreatorXp(userId, 50);

      sendEvent('done', {
        chapterId: chapterResult.insertId,
        chapterNumber: nextChapterNumber,
        title: chapterTitle,
        wordCount,
        readingTime,
        expGained: 50,
      });
    } catch (error) {
      this.logger.error('Chapter generation failed', error);
      sendEvent('error', { message: 'Chapter generation failed' });
    } finally {
      res.end();
    }
  }

  async getChapters(userId: number, storyId: number) {
    await this.verifyStoryOwnership(userId, storyId);

    return this.db
      .select()
      .from(schema.storyChapters)
      .where(eq(schema.storyChapters.story, storyId))
      .orderBy(asc(schema.storyChapters.chapterNumber));
  }

  async getChapter(userId: number, storyId: number, chapterNumber: number) {
    await this.verifyStoryOwnership(userId, storyId);

    const [chapter] = await this.db
      .select()
      .from(schema.storyChapters)
      .where(and(eq(schema.storyChapters.story, storyId), eq(schema.storyChapters.chapterNumber, chapterNumber)));

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    return chapter;
  }

  async updateChapter(userId: number, storyId: number, chapterNumber: number, dto: { title?: string; content?: string }) {
    await this.verifyStoryOwnership(userId, storyId);

    const updateData: any = {};
    if (dto.title) updateData.title = dto.title;
    if (dto.content) {
      updateData.content = dto.content;
      updateData.wordCount = this.countWords(dto.content);
      updateData.readingTime = Math.ceil(updateData.wordCount / WORDS_PER_MINUTE);
    }

    await this.db
      .update(schema.storyChapters)
      .set(updateData)
      .where(and(eq(schema.storyChapters.story, storyId), eq(schema.storyChapters.chapterNumber, chapterNumber)));

    // Recalculate story statistics
    await this.recalculateStoryStats(storyId);

    return { success: true };
  }

  async deleteChapter(userId: number, storyId: number, chapterNumber: number) {
    await this.verifyStoryOwnership(userId, storyId);

    await this.db
      .delete(schema.storyChapters)
      .where(and(eq(schema.storyChapters.story, storyId), eq(schema.storyChapters.chapterNumber, chapterNumber)));

    // Recalculate story statistics
    await this.recalculateStoryStats(storyId);

    return { success: true };
  }

  // ==================== Public Operations ====================

  async getPublicStories(page: number, limit: number, genre?: string, sortBy = 'newest') {
    let query = this.db
      .select()
      .from(schema.stories)
      .where(eq(schema.stories.isPublic, 1));

    // Genre filter
    if (genre) {
      query = query.where(sql`JSON_CONTAINS(${schema.stories.genre}, '"${genre}"')`);
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        query = query.orderBy(desc(schema.stories.viewCount));
        break;
      case 'cloned':
        query = query.orderBy(desc(schema.stories.cloneCount));
        break;
      case 'newest':
      default:
        query = query.orderBy(desc(schema.stories.createdAt));
        break;
    }

    // Pagination
    const offset = (page - 1) * limit;
    const results = await query.limit(limit).offset(offset);

    return results.map((story) => ({
      ...story,
      genre: story.genre ? JSON.parse(story.genre) : [],
    }));
  }

  async getPublicStory(storyId: number) {
    const [story] = await this.db
      .select()
      .from(schema.stories)
      .where(and(eq(schema.stories.id, storyId), eq(schema.stories.isPublic, 1)));

    if (!story) {
      throw new NotFoundException('Story not found or not public');
    }

    return {
      ...story,
      genre: story.genre ? JSON.parse(story.genre) : [],
    };
  }

  async cloneStory(userId: number, sourceStoryId: number) {
    const sourceStory = await this.getPublicStory(sourceStoryId);
    const now = new Date();

    // Clone story metadata
    const [newStoryResult] = await this.db.insert(schema.stories).values({
      user: userId,
      title: `${sourceStory.title} (Clone)`,
      description: sourceStory.description,
      pov: sourceStory.pov,
      genre: sourceStory.genre,
      plotIdea: sourceStory.plotIdea,
      storyPlan: sourceStory.storyPlan,
      coverImageUrl: sourceStory.coverImageUrl,
      status: sourceStory.status,
      chapterCount: sourceStory.chapterCount,
      totalWordCount: sourceStory.totalWordCount,
      averageReadingTime: sourceStory.averageReadingTime,
      clonedFrom: sourceStoryId,
      createdAt: now,
      updatedAt: now,
    });

    const newStoryId = newStoryResult.insertId;

    // Clone all chapters
    const sourceChapters = await this.db
      .select()
      .from(schema.storyChapters)
      .where(eq(schema.storyChapters.story, sourceStoryId))
      .orderBy(asc(schema.storyChapters.chapterNumber));

    for (const chapter of sourceChapters) {
      await this.db.insert(schema.storyChapters).values({
        story: newStoryId,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        content: chapter.content,
        continuationPrompt: chapter.continuationPrompt,
        wordCount: chapter.wordCount,
        readingTime: chapter.readingTime,
        createdAt: now,
      });
    }

    // Increment clone count on original
    await this.db
      .update(schema.stories)
      .set({ cloneCount: sql`${schema.stories.cloneCount} + 1` })
      .where(eq(schema.stories.id, sourceStoryId));

    // Award Creator XP to original author (30 XP per clone)
    await this.awardCreatorXp(sourceStory.user, 30);

    return { id: newStoryId, success: true };
  }

  async toggleVisibility(userId: number, storyId: number, isPublic: boolean) {
    await this.verifyStoryOwnership(userId, storyId);

    await this.db
      .update(schema.stories)
      .set({ isPublic: isPublic ? 1 : 0, updatedAt: new Date() })
      .where(eq(schema.stories.id, storyId));

    return { success: true };
  }

  // ==================== Reading Experience ====================

  async getReadingProgress(userId: number, storyId: number) {
    const [progress] = await this.db
      .select()
      .from(schema.storyReadingProgress)
      .where(and(eq(schema.storyReadingProgress.user, userId), eq(schema.storyReadingProgress.story, storyId)));

    return progress || null;
  }

  async updateReadingProgress(userId: number, storyId: number, dto: UpdateProgressDto) {
    const now = new Date();

    // Check if progress exists
    const existing = await this.getReadingProgress(userId, storyId);

    if (existing) {
      // Update
      await this.db
        .update(schema.storyReadingProgress)
        .set({
          lastChapterNumber: dto.lastChapterNumber,
          scrollPosition: dto.scrollPosition,
          totalReadingTime: dto.readingTimeSeconds
            ? sql`${schema.storyReadingProgress.totalReadingTime} + ${dto.readingTimeSeconds}`
            : undefined,
          updatedAt: now,
        })
        .where(eq(schema.storyReadingProgress.id, existing.id));
    } else {
      // Create
      await this.db.insert(schema.storyReadingProgress).values({
        user: userId,
        story: storyId,
        lastChapterNumber: dto.lastChapterNumber,
        scrollPosition: dto.scrollPosition,
        totalReadingTime: dto.readingTimeSeconds || 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  }

  async createBookmark(userId: number, storyId: number, dto: CreateBookmarkDto) {
    await this.verifyStoryOwnership(userId, storyId);

    const [result] = await this.db.insert(schema.storyBookmarks).values({
      user: userId,
      story: storyId,
      chapter: dto.chapterId,
      chapterPosition: dto.chapterPosition,
      snippet: dto.snippet,
      note: dto.note,
      color: dto.color || 'accent',
      createdAt: new Date(),
    });

    return { id: result.insertId, success: true };
  }

  async getBookmarks(userId: number, storyId: number) {
    await this.verifyStoryOwnership(userId, storyId);

    return this.db
      .select()
      .from(schema.storyBookmarks)
      .where(and(eq(schema.storyBookmarks.user, userId), eq(schema.storyBookmarks.story, storyId)))
      .orderBy(desc(schema.storyBookmarks.createdAt));
  }

  async deleteBookmark(userId: number, bookmarkId: number) {
    const [bookmark] = await this.db
      .select()
      .from(schema.storyBookmarks)
      .where(eq(schema.storyBookmarks.id, bookmarkId));

    if (!bookmark || bookmark.user !== userId) {
      throw new NotFoundException('Bookmark not found');
    }

    await this.db.delete(schema.storyBookmarks).where(eq(schema.storyBookmarks.id, bookmarkId));

    return { success: true };
  }

  // ==================== Draft Auto-Save ====================

  async saveDraft(userId: number, dto: SaveDraftDto) {
    const now = new Date();

    const [existing] = await this.db
      .select()
      .from(schema.storyDrafts)
      .where(eq(schema.storyDrafts.user, userId));

    if (existing) {
      await this.db
        .update(schema.storyDrafts)
        .set({
          draftData: JSON.stringify(dto.draftData),
          updatedAt: now,
        })
        .where(eq(schema.storyDrafts.user, userId));
    } else {
      await this.db.insert(schema.storyDrafts).values({
        user: userId,
        draftData: JSON.stringify(dto.draftData),
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  }

  async getDraft(userId: number) {
    const [draft] = await this.db
      .select()
      .from(schema.storyDrafts)
      .where(eq(schema.storyDrafts.user, userId));

    return draft ? { draftData: JSON.parse(draft.draftData) } : null;
  }

  async deleteDraft(userId: number) {
    await this.db.delete(schema.storyDrafts).where(eq(schema.storyDrafts.user, userId));

    return { success: true };
  }

  // ==================== Statistics ====================

  async incrementView(storyId: number) {
    await this.db
      .update(schema.stories)
      .set({ viewCount: sql`${schema.stories.viewCount} + 1` })
      .where(eq(schema.stories.id, storyId));

    return { success: true };
  }

  async getStoryStats(userId: number, storyId: number) {
    await this.verifyStoryOwnership(userId, storyId);

    const [story] = await this.db
      .select()
      .from(schema.stories)
      .where(eq(schema.stories.id, storyId));

    return {
      viewCount: story.viewCount,
      cloneCount: story.cloneCount,
      chapterCount: story.chapterCount,
      totalWordCount: story.totalWordCount,
      averageReadingTime: story.averageReadingTime,
    };
  }

  // ==================== Helper Methods ====================

  private async verifyStoryOwnership(userId: number, storyId: number) {
    const [story] = await this.db
      .select()
      .from(schema.stories)
      .where(and(eq(schema.stories.id, storyId), eq(schema.stories.user, userId)));

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    return story;
  }

  private async generateFirstChapter(userId: number, storyId: number, dto: CreateStoryDto) {
    const messages = this.buildFirstChapterPrompt(dto);

    const content = await this.complete(messages, { temperature: 0.9, presencePenalty: 0.3 });

    const wordCount = this.countWords(content);
    const readingTime = Math.ceil(wordCount / WORDS_PER_MINUTE);

    const [chapterResult] = await this.db.insert(schema.storyChapters).values({
      story: storyId,
      chapterNumber: 1,
      title: 'Chapter 1',
      content,
      continuationPrompt: dto.firstChapterPrompt,
      wordCount,
      readingTime,
      createdAt: new Date(),
    });

    // Update story stats
    await this.db
      .update(schema.stories)
      .set({
        chapterCount: 1,
        totalWordCount: wordCount,
        averageReadingTime: readingTime,
        updatedAt: new Date(),
      })
      .where(eq(schema.stories.id, storyId));

    return {
      id: chapterResult.insertId,
      chapterNumber: 1,
      title: 'Chapter 1',
      content,
      wordCount,
      readingTime,
    };
  }

  private buildFirstChapterPrompt(dto: CreateStoryDto): ChatMessage[] {
    let characterContext = '';

    if (dto.characterIds && dto.characterIds.length > 0) {
      characterContext = 'Characters in this story:\n';
      // Note: Character snapshots will be available after story creation
      // For now, we'll note that characters are included
      characterContext += dto.characterIds.map((id) => `- Character ID ${id} (${dto.characterRoles?.[id] || 'supporting'})`).join('\n');
    }

    const povInstructions = {
      first_person: 'Write in first person POV (I, me, my)',
      third_person: 'Write in third person POV (he, she, they)',
      second_person: 'Write in second person POV (you, your)',
    }[dto.pov] || 'Write in third person POV';

    const systemPrompt = `You are a creative storytelling AI. Write the first chapter of a new story.

=== STORY METADATA ===
Title: ${dto.title}
Genre: ${dto.genre?.join(', ') || 'General'}
POV: ${dto.pov}
Plot Concept: ${dto.plotIdea || 'To be developed'}
${dto.storyPlan ? `Story Plan: ${dto.storyPlan}` : ''}

${characterContext}

=== WRITING GUIDELINES ===
- ${povInstructions}
- Match the ${dto.genre?.join('/')} genre conventions
- Target 1500-2500 words for this first chapter
- Include dialogue, action, and vivid description
- Establish the setting, main character(s), and initial conflict
- End with a hook that makes readers want to continue
- Be creative, engaging, and immersive

Write the first chapter now:`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: dto.firstChapterPrompt },
    ];
  }

  private buildChapterPrompt(story: any, previousChapters: any[], continuationPrompt: string): ChatMessage[] {
    // Character context from snapshots
    let characterContext = '';
    if (story.characters && story.characters.length > 0) {
      characterContext = 'Characters in this story:\n';
      characterContext += story.characters
        .map((sc: any) => {
          const char = sc.snapshot;
          return `- ${char.name} (${sc.role}): ${char.persona}`;
        })
        .join('\n');
    }

    // Previous chapters summary (last 2 chapters for context)
    const recentChapters = previousChapters.slice(-2);
    const previousContext = recentChapters
      .map((ch) => `Chapter ${ch.chapterNumber}: ${ch.title}\n${ch.content.substring(0, 500)}...`)
      .join('\n\n');

    const povInstructions = {
      first_person: 'Write in first person POV (I, me, my)',
      third_person: 'Write in third person POV (he, she, they)',
      second_person: 'Write in second person POV (you, your)',
    }[story.pov] || 'Write in third person POV';

    const systemPrompt = `You are a creative storytelling AI. Write the next chapter of this ongoing story.

=== STORY METADATA ===
Title: ${story.title}
Genre: ${story.genre?.join(', ') || 'General'}
POV: ${story.pov}
Plot Concept: ${story.plotIdea || 'To be developed'}
${story.storyPlan ? `Story Plan: ${story.storyPlan}` : ''}

${characterContext}

=== PREVIOUS CHAPTERS (FOR CONTEXT) ===
${previousContext}

=== WRITING GUIDELINES ===
- ${povInstructions} consistently
- Match the ${story.genre?.join('/')} genre conventions
- Continue naturally from the previous chapter
- Target 1500-2500 words
- Include dialogue, action, and vivid description
- Maintain character personalities and relationships
- Follow the story plan while allowing organic development
- End with a hook for the next chapter

Write the next chapter now:`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: continuationPrompt },
    ];
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  private async recalculateStoryStats(storyId: number) {
    const chapters = await this.db
      .select()
      .from(schema.storyChapters)
      .where(eq(schema.storyChapters.story, storyId));

    const totalWordCount = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
    const avgReadingTime = Math.ceil(totalWordCount / WORDS_PER_MINUTE);

    await this.db
      .update(schema.stories)
      .set({
        chapterCount: chapters.length,
        totalWordCount,
        averageReadingTime: avgReadingTime,
        updatedAt: new Date(),
      })
      .where(eq(schema.stories.id, storyId));
  }

  private async awardCreatorXp(userId: number, amount: number) {
    await this.db
      .update(schema.users)
      .set({
        creatorXp: sql`${schema.users.creatorXp} + ${amount}`,
        creatorLevel: sql`FLOOR(${schema.users.creatorXp} / 200) + 1`,
      })
      .where(eq(schema.users.id, userId));
  }

  // ==================== LLM Integration ====================

  private async complete(messages: ChatMessage[], options?: { temperature?: number; presencePenalty?: number }): Promise<string> {
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
    return result.choices?.[0]?.message?.content ?? '';
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
}
