import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @MinLength(4)
  @MaxLength(100)
  email: string;

  @ApiProperty({ example: 'coolusername' })
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(25)
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(100)
  password: string;
}
