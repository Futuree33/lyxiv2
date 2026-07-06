import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  characterId: number;

  @ApiProperty({ example: 'hey' })
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-...',
    description: 'Client-generated key; retrying the same key returns the original reply instead of sending a new message.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}
