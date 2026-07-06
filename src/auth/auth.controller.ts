import { Body, Controller, Get, Post, Req, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { LoginDto } from './dto/login-dto';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register-dto';
import { AuthGuard } from './auth.guard';
import type { AuthenticatedRequest } from './auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login' })
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() request: ExpressRequest): Promise<object> {
    return await this.authService.loginUser(loginDto, request);
  }

  @ApiOperation({ summary: 'Register' })
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<object> {
    return await this.authService.registerUser(registerDto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Current user' })
  @Get('me')
  async me(@Request() request: AuthenticatedRequest) {
    return request.user;
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'User stats and level' })
  @Get('stats')
  async getStats(@Request() request: AuthenticatedRequest) {
    return await this.authService.getUserStats(request.user.id);
  }
}
