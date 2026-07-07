import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CharactersService } from './characters.service';
import { CreateCharacterDto } from './dto/create-character-dto';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';

@ApiTags('characters')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('characters')
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @ApiOperation({ summary: 'Create a character' })
  @Post()
  async create(@Body() dto: CreateCharacterDto, @Request() request: AuthenticatedRequest) {
    return await this.charactersService.createCharacter(request.user.id, dto);
  }

  @ApiOperation({ summary: 'List my characters' })
  @Get()
  async list(@Request() request: AuthenticatedRequest) {
    return await this.charactersService.listCharacters(request.user.id);
  }

  @ApiOperation({ summary: 'List public characters' })
  @Get('public/all')
  async listPublic(@Query('page', ParseIntPipe) page = 1, @Query('limit', ParseIntPipe) limit = 20) {
    return await this.charactersService.listPublicCharacters(page, limit);
  }

  @ApiOperation({ summary: 'Get one of my characters' })
  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number, @Request() request: AuthenticatedRequest) {
    return await this.charactersService.getOwnedCharacter(request.user.id, id);
  }

  @ApiOperation({ summary: 'Clone a public character' })
  @Post('clone/:id')
  async clone(@Param('id', ParseIntPipe) id: number, @Request() request: AuthenticatedRequest) {
    return await this.charactersService.cloneCharacter(request.user.id, id);
  }

  @ApiOperation({ summary: 'Toggle character visibility' })
  @Patch(':id/visibility')
  async toggleVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Request() request: AuthenticatedRequest,
    @Body() body: { isPublic: boolean },
  ) {
    return await this.charactersService.updateVisibility(request.user.id, id, body.isPublic);
  }

  @ApiOperation({ summary: 'Generate AI avatar for character' })
  @Post('generate-avatar')
  async generateAvatar(@Body() body: { name: string; description: string }) {
    const url = await this.charactersService.generateAvatar(body.name, body.description);
    return { url };
  }

  @ApiOperation({ summary: 'Generate fast preview avatar (turbo)' })
  @Post('generate-avatar-turbo')
  async generateAvatarTurbo(@Body() body: { name: string; description: string }) {
    const url = await this.charactersService.generateAvatarTurbo(body.name, body.description);
    return { url };
  }

  @ApiOperation({ summary: 'Delete a character' })
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number, @Request() request: AuthenticatedRequest) {
    return await this.charactersService.deleteCharacter(request.user.id, id);
  }
}
