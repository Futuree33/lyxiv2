import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateBookmarkDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  chapterId: number;

  @ApiProperty({ example: 1250 })
  @IsInt()
  @Min(0)
  chapterPosition: number; // character position in chapter text

  @ApiPropertyOptional({ example: '...the hero realized the truth...' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  snippet?: string;

  @ApiPropertyOptional({ example: 'Great twist here!' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({ example: 'accent' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string; // 'accent', 'warn', 'presence'
}
