import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStoryDto {
  @ApiProperty({ example: 'The Chronicles of Midnight' })
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'A thrilling adventure through time and space...' })
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  description: string;

  @ApiProperty({ example: 'first_person' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  pov: string; // 'first_person', 'third_person', 'second_person'

  @ApiPropertyOptional({ example: ['fantasy', 'adventure', 'romance'] })
  @IsOptional()
  @IsArray()
  genre?: string[];

  @ApiPropertyOptional({ example: 'A lone hero discovers a hidden power...' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  plotIdea?: string;

  @ApiPropertyOptional({ example: 'Chapter 1: Discovery\nChapter 2: Training\n...' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  storyPlan?: string;

  @ApiPropertyOptional({ example: '/uploads/story-covers/cover-123.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: [1, 5, 12] })
  @IsOptional()
  @IsArray()
  characterIds?: number[];

  @ApiPropertyOptional({ example: { '1': 'protagonist', '5': 'supporting' } })
  @IsOptional()
  characterRoles?: Record<string, string>;

  @ApiProperty({ example: 'Write the opening scene where the hero discovers their power...' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  firstChapterPrompt: string;
}
