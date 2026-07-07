import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { SceneAnalysisService } from './scene-analysis.service';
import { NarrativeTrackerService } from './narrative-tracker.service';
import { IntimacyPrompterService } from './intimacy-prompter.service';
import { CharactersModule } from '../characters/characters.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [CharactersModule, SettingsModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    SceneAnalysisService,
    NarrativeTrackerService,
    IntimacyPrompterService,
  ],
})
export class ChatModule {}
