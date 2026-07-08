import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { GenerateChapterDto } from './dto/generate-chapter.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { SaveDraftDto } from './dto/save-draft.dto';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';

@ApiTags('stories')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  // ==================== Static Routes (must be first!) ====================

  // Draft Auto-Save
  @ApiOperation({ summary: 'Save story draft' })
  @Post('drafts')
  async saveDraft(@Body() dto: SaveDraftDto, @Request() request: AuthenticatedRequest) {
    return await this.storiesService.saveDraft(request.user.id, dto);
  }

  @ApiOperation({ summary: 'Get saved draft' })
  @Get('drafts')
  async getDraft(@Request() request: AuthenticatedRequest) {
    return await this.storiesService.getDraft(request.user.id);
  }

  @ApiOperation({ summary: 'Delete draft' })
  @Delete('drafts')
  async deleteDraft(@Request() request: AuthenticatedRequest) {
    return await this.storiesService.deleteDraft(request.user.id);
  }

  // Public Operations
  @ApiOperation({ summary: 'Browse public stories' })
  @Get('public/all')
  async getPublicStories(
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 20,
    @Query('genre') genre?: string,
    @Query('sortBy') sortBy = 'newest',
  ) {
    return await this.storiesService.getPublicStories(page, limit, genre, sortBy);
  }

  @ApiOperation({ summary: 'Get public story details' })
  @Get('public/:id')
  async getPublicStory(@Param('id', ParseIntPipe) id: number) {
    return await this.storiesService.getPublicStory(id);
  }

  @ApiOperation({ summary: 'Clone story' })
  @Post('clone/:id')
  async cloneStory(@Param('id', ParseIntPipe) id: number, @Request() request: AuthenticatedRequest) {
    return await this.storiesService.cloneStory(request.user.id, id);
  }

  @ApiOperation({ summary: 'Delete bookmark' })
  @Delete('bookmarks/:bookmarkId')
  async deleteBookmark(@Param('bookmarkId', ParseIntPipe) bookmarkId: number, @Request() request: AuthenticatedRequest) {
    return await this.storiesService.deleteBookmark(request.user.id, bookmarkId);
  }

  // ==================== CRUD Operations ====================

  @ApiOperation({ summary: 'Create story (includes Chapter 1 generation)' })
  @Post()
  async create(@Body() dto: CreateStoryDto, @Request() request: AuthenticatedRequest) {
    return await this.storiesService.createStory(request.user.id, dto);
  }

  @ApiOperation({ summary: 'List my stories' })
  @Get()
  async listMyStories(@Request() request: AuthenticatedRequest) {
    return await this.storiesService.listMyStories(request.user.id);
  }

  @ApiOperation({ summary: 'Get story details' })
  @Get(':id')
  async getStory(@Param('id', ParseIntPipe) id: number, @Request() request: AuthenticatedRequest) {
    return await this.storiesService.getStory(request.user.id, id);
  }

  @ApiOperation({ summary: 'Update story metadata' })
  @Patch(':id')
  async updateStory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStoryDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return await this.storiesService.updateStory(request.user.id, id, dto);
  }

  @ApiOperation({ summary: 'Delete story (cascade chapters/bookmarks)' })
  @Delete(':id')
  async deleteStory(@Param('id', ParseIntPipe) id: number, @Request() request: AuthenticatedRequest) {
    return await this.storiesService.deleteStory(request.user.id, id);
  }

  // ==================== Chapter Operations ====================

  @ApiOperation({ summary: 'Generate next chapter (streaming)' })
  @Post(':id/chapters/generate')
  async generateChapterStream(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GenerateChapterDto,
    @Request() request: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await this.storiesService.generateChapterStream(request.user.id, id, dto, res);
  }

  @ApiOperation({ summary: 'List all chapters for a story' })
  @Get(':id/chapters')
  async getChapters(@Param('id', ParseIntPipe) id: number, @Request() request: AuthenticatedRequest) {
    return await this.storiesService.getChapters(request.user.id, id);
  }

  @ApiOperation({ summary: 'Get specific chapter' })
  @Get(':id/chapters/:chapterNumber')
  async getChapter(
    @Param('id', ParseIntPipe) id: number,
    @Param('chapterNumber', ParseIntPipe) chapterNumber: number,
    @Request() request: AuthenticatedRequest,
  ) {
    return await this.storiesService.getChapter(request.user.id, id, chapterNumber);
  }

  @ApiOperation({ summary: 'Update chapter content' })
  @Patch(':id/chapters/:chapterNumber')
  async updateChapter(
    @Param('id', ParseIntPipe) id: number,
    @Param('chapterNumber', ParseIntPipe) chapterNumber: number,
    @Body() dto: { title?: string; content?: string },
    @Request() request: AuthenticatedRequest,
  ) {
    return await this.storiesService.updateChapter(request.user.id, id, chapterNumber, dto);
  }

  @ApiOperation({ summary: 'Delete chapter' })
  @Delete(':id/chapters/:chapterNumber')
  async deleteChapter(
    @Param('id', ParseIntPipe) id: number,
    @Param('chapterNumber', ParseIntPipe) chapterNumber: number,
    @Request() request: AuthenticatedRequest,
  ) {
    return await this.storiesService.deleteChapter(request.user.id, id, chapterNumber);
  }

  @ApiOperation({ summary: 'Toggle public/private visibility' })
  @Patch(':id/visibility')
  async toggleVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isPublic: boolean },
    @Request() request: AuthenticatedRequest,
  ) {
    return await this.storiesService.toggleVisibility(request.user.id, id, body.isPublic);
  }

  // ==================== Reading Experience ====================

  @ApiOperation({ summary: 'Get reading progress' })
  @Get(':id/progress')
  async getReadingProgress(@Param('id', ParseIntPipe) id: number, @Request() request: AuthenticatedRequest) {
    return await this.storiesService.getReadingProgress(request.user.id, id);
  }

  @ApiOperation({ summary: 'Update reading progress (auto-save)' })
  @Post(':id/progress')
  async updateReadingProgress(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProgressDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return await this.storiesService.updateReadingProgress(request.user.id, id, dto);
  }

  @ApiOperation({ summary: 'Create bookmark' })
  @Post(':id/bookmarks')
  async createBookmark(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateBookmarkDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return await this.storiesService.createBookmark(request.user.id, id, dto);
  }

  @ApiOperation({ summary: 'List bookmarks' })
  @Get(':id/bookmarks')
  async getBookmarks(@Param('id', ParseIntPipe) id: number, @Request() request: AuthenticatedRequest) {
    return await this.storiesService.getBookmarks(request.user.id, id);
  }

  // ==================== Statistics ====================

  @ApiOperation({ summary: 'Increment view count' })
  @Post(':id/view')
  async incrementView(@Param('id', ParseIntPipe) id: number) {
    return await this.storiesService.incrementView(id);
  }

  @ApiOperation({ summary: 'Get story statistics' })
  @Get(':id/stats')
  async getStoryStats(@Param('id', ParseIntPipe) id: number, @Request() request: AuthenticatedRequest) {
    return await this.storiesService.getStoryStats(request.user.id, id);
  }
}
