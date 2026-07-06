import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateSettingDto {
  @ApiProperty({ example: 'You are playing a fictional character...' })
  @IsString()
  @IsNotEmpty()
  value: string;
}
