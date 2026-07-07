import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ProfileService, PublicProfile } from './profile.service';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('username/:username')
  async getProfileByUsername(@Param('username') username: string): Promise<PublicProfile> {
    return this.profileService.getProfileByUsername(username);
  }

  @Get('id/:id')
  async getProfileById(@Param('id', ParseIntPipe) id: number): Promise<PublicProfile> {
    return this.profileService.getProfileById(id);
  }
}
