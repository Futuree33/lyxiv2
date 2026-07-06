import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { CharactersModule } from './characters/characters.module';
import { SettingsModule } from './settings/settings.module';
import { AdminModule } from './admin/admin.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [DatabaseModule, AuthModule, CharactersModule, ChatModule, SettingsModule, AdminModule, UploadModule],
})
export class AppModule {}

