import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered', type: AuthResponseDto })
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in', type: AuthResponseDto })
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token successfully refreshed', type: AuthResponseDto })
  @UseGuards(AuthGuard('jwt'))
  @Post('refresh')
  async refresh(@Request() req: any): Promise<AuthResponseDto> {
    return this.authService.refreshToken(req.user);
  }
}