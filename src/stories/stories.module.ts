import { Module } from '@nestjs/common';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { CharactersModule } from '../characters/characters.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [CharactersModule, SettingsModule],
  controllers: [StoriesController],
  providers: [StoriesService],
  exports: [StoriesService],
})
export class StoriesModule {}
