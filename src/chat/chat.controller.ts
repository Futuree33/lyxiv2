import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Body, Delete, Get, Param, ParseIntPipe, Post, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { SendMessageDto } from './dto/send-message-dto';
import { ChatService } from './chat.service';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: 'Send message with streaming' })
  @Post('send-message-stream')
  async sendMessageStream(
    @Body() body: SendMessageDto,
    @Request() request: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await this.chatService.sendMessageStream(request.user.id, body, res);
  }

  @ApiOperation({ summary: 'Send message' })
  @Post('send-message')
  async sendMessage(@Body() body: SendMessageDto, @Request() request: AuthenticatedRequest) {
    return await this.chatService.sendMessage(request.user.id, body);
  }

  @ApiOperation({ summary: 'Get chat history with a character' })
  @Get(':characterId/history')
  async getHistory(
    @Param('characterId', ParseIntPipe) characterId: number,
    @Request() request: AuthenticatedRequest,
  ) {
    return await this.chatService.getHistory(request.user.id, characterId);
  }

  @ApiOperation({ summary: 'Get narrator messages for a character' })
  @Get(':characterId/narrator-messages')
  async getNarratorMessages(
    @Param('characterId', ParseIntPipe) characterId: number,
    @Request() request: AuthenticatedRequest,
  ) {
    return await this.chatService.getNarratorMessages(request.user.id, characterId);
  }

  @ApiOperation({ summary: 'Get generated images for a character' })
  @Get(':characterId/images')
  async getImages(
    @Param('characterId', ParseIntPipe) characterId: number,
    @Request() request: AuthenticatedRequest,
  ) {
    return await this.chatService.getImages(request.user.id, characterId);
  }

  @ApiOperation({ summary: 'Get all generated images for user' })
  @Get('images/all')
  async getAllImages(@Request() request: AuthenticatedRequest) {
    return await this.chatService.getAllImages(request.user.id);
  }

  @ApiOperation({ summary: 'Get initial greeting from character' })
  @Get(':characterId/greeting')
  async getGreeting(
    @Param('characterId', ParseIntPipe) characterId: number,
    @Request() request: AuthenticatedRequest,
  ) {
    return await this.chatService.getGreeting(request.user.id, characterId);
  }

  @ApiOperation({ summary: 'Generate standalone character image' })
  @Post(':characterId/generate-image')
  async generateStandaloneImage(
    @Param('characterId', ParseIntPipe) characterId: number,
    @Request() request: AuthenticatedRequest,
    @Body() body: { prompt?: string },
  ) {
    return await this.chatService.generateStandaloneImage(request.user.id, characterId, body.prompt);
  }

  @ApiOperation({ summary: 'Delete a chat image' })
  @Delete('images/:imageId')
  async deleteImage(
    @Param('imageId', ParseIntPipe) imageId: number,
    @Request() request: AuthenticatedRequest,
  ) {
    return await this.chatService.deleteImage(request.user.id, imageId);
  }
}
