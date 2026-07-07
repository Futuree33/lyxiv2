import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('leaderboard')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @ApiOperation({ summary: 'Get weekly reset timer' })
  @Get('reset-time')
  async getResetTime() {
    return this.leaderboardService.getWeeklyResetTime();
  }

  @ApiOperation({ summary: 'Lyxi Podium 1: Highest Lyxi Level Ever' })
  @Get('lyxi/highest-level')
  async getHighestLyxiLevel() {
    return this.leaderboardService.getHighestLyxiLevel();
  }

  @ApiOperation({ summary: 'Lyxi Podium 2: Most Lyxi XP This Week' })
  @Get('lyxi/most-xp-week')
  async getMostLyxiXpThisWeek() {
    return this.leaderboardService.getMostLyxiXpThisWeek();
  }

  @ApiOperation({ summary: 'Lyxi Podium 3: Highest Companion Relationship Level' })
  @Get('lyxi/highest-relationship')
  async getHighestRelationshipLevel() {
    return this.leaderboardService.getHighestRelationshipLevel();
  }

  @ApiOperation({ summary: 'Creator Podium 1: Highest Creator Level' })
  @Get('creator/highest-level')
  async getHighestCreatorLevel() {
    return this.leaderboardService.getHighestCreatorLevel();
  }

  @ApiOperation({ summary: 'Creator Podium 2: Most Creator XP This Week' })
  @Get('creator/most-xp-week')
  async getMostCreatorXpThisWeek() {
    return this.leaderboardService.getMostCreatorXpThisWeek();
  }

  @ApiOperation({ summary: 'Creator Podium 3: Most Popular Characters This Week' })
  @Get('creator/most-popular-week')
  async getMostPopularCharactersThisWeek() {
    return this.leaderboardService.getMostPopularCharactersThisWeek();
  }
}
