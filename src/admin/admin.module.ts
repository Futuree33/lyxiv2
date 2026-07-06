import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [AdminController],
})
export class AdminModule {}
