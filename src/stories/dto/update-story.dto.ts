import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStoryDto {
  @ApiPropertyOptional({ example: 'Updated Title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description...' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: ['fantasy', 'romance'] })
  @IsOptional()
  @IsArray()
  genre?: string[];

  @ApiPropertyOptional({ example: 'Updated plot idea...' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  plotIdea?: string;

  @ApiPropertyOptional({ example: 'Updated story plan...' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  storyPlan?: string;

  @ApiPropertyOptional({ example: '/uploads/story-covers/new-cover.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: 'in_progress' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string; // 'draft', 'in_progress', 'completed', 'abandoned'
}
