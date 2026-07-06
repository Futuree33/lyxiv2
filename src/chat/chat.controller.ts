import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Body, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
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

  @ApiOperation({ summary: 'Get generated images for a character' })
  @Get(':characterId/images')
  async getImages(
    @Param('characterId', ParseIntPipe) characterId: number,
    @Request() request: AuthenticatedRequest,
  ) {
    return await this.chatService.getImages(request.user.id, characterId);
  }
}
