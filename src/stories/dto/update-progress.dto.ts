import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateProgressDto {
  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  lastChapterNumber: number;

  @ApiProperty({ example: 45 })
  @IsInt()
  @Min(0)
  @Max(100)
  scrollPosition: number;

  @ApiProperty({ example: 120 })
  @IsOptional()
  @IsInt()
  @Min(0)
  readingTimeSeconds?: number; // incremental reading time for this session
}
