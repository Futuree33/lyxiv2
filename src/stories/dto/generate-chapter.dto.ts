import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateChapterDto {
  @ApiProperty({ example: 'The hero trains with their newfound power...' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  continuationPrompt: string;

  @ApiPropertyOptional({ example: 'Chapter 2: Training' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  chapterTitle?: string;
}
