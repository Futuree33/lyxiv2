import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Controller, Body, Post, Request, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString, IsArray, IsNumber, IsIn, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { CameraService } from './camera.service';

class CustomPersonDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  eyeColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hairColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hairStyle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  height?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  build?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ethnicity?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  age?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clothing?: string;
}

export class GenerateCameraImageDto {
  @ApiProperty({ enum: ['character', 'custom'] })
  @IsNotEmpty()
  @IsIn(['character', 'custom'])
  mode: 'character' | 'custom';

  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  characterIds?: number[];

  @ApiProperty({ required: false, type: CustomPersonDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomPersonDto)
  customPerson?: CustomPersonDto;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  sceneDescription: string;

  @ApiProperty({ required: false, enum: ['realistic', 'anime'] })
  @IsOptional()
  @IsIn(['realistic', 'anime'])
  artStyle?: 'realistic' | 'anime';
}

@ApiTags('camera')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('camera')
export class CameraController {
  constructor(private readonly cameraService: CameraService) {}

  @ApiOperation({ summary: 'Generate camera image' })
  @Post('generate')
  async generateImage(@Body() dto: GenerateCameraImageDto, @Request() request: AuthenticatedRequest) {
    return await this.cameraService.generateImage(request.user.id, dto);
  }
}
