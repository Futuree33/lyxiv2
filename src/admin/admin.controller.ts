import { BadRequestException, Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { SettingsService, SETTINGS_DEFAULTS, type SettingKey } from '../settings/settings.service';
import { UpdateSettingDto } from './dto/update-setting-dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
@Controller('admin/settings')
export class AdminController {
  constructor(private readonly settingsService: SettingsService) {}

  @ApiOperation({ summary: 'List all settings' })
  @Get()
  async list() {
    return await this.settingsService.getAll();
  }

  @ApiOperation({ summary: 'Update a setting' })
  @Put(':key')
  async update(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    if (!(key in SETTINGS_DEFAULTS)) {
      throw new BadRequestException(`Unknown setting: ${key}`);
    }
    await this.settingsService.set(key as SettingKey, dto.value);
    return { key, value: dto.value };
  }
}
