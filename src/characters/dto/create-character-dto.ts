import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateCharacterDto {
  @ApiProperty({ example: 'Luna' })
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'You are Luna, a warm and playful AI companion who loves sci-fi movies.' })
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(4000)
  persona: string;

  // Physical appearance - all optional
  @ApiProperty({ example: 'blue', required: false })
  @IsOptional()
  @MaxLength(50)
  eyeColor?: string;

  @ApiProperty({ example: 'blonde', required: false })
  @IsOptional()
  @MaxLength(50)
  hairColor?: string;

  @ApiProperty({ example: 'long and wavy', required: false })
  @IsOptional()
  @MaxLength(100)
  hairStyle?: string;

  @ApiProperty({ example: '5\'6"', required: false })
  @IsOptional()
  @MaxLength(50)
  height?: string;

  @ApiProperty({ example: 'athletic', required: false })
  @IsOptional()
  @MaxLength(50)
  build?: string;

  @ApiProperty({ example: 'female', required: false })
  @IsOptional()
  @MaxLength(50)
  gender?: string;

  @ApiProperty({ example: 'East Asian', required: false })
  @IsOptional()
  @MaxLength(50)
  ethnicity?: string;

  @ApiProperty({ example: 25, required: false })
  @IsOptional()
  age?: number;

  @ApiProperty({ example: 'realistic', required: false })
  @IsOptional()
  @MaxLength(20)
  artStyle?: string;

  @ApiProperty({ example: 'A former astronaut who now works as a consultant...', required: false })
  @IsOptional()
  @MaxLength(4000)
  backstory?: string;

  @ApiProperty({ example: 'childhood friend', required: false })
  @IsOptional()
  @MaxLength(200)
  relationshipToUser?: string;

  @ApiProperty({ example: '/uploads/avatars/avatar-123456.png', required: false })
  @IsOptional()
  @MaxLength(500)
  avatarUrl?: string;
}
