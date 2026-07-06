import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { CharactersModule } from '../characters/characters.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [CharactersModule, SettingsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
