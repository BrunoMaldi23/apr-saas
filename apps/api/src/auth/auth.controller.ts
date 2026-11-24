import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Public } from '../common/auth/public.decorator';
import { JwtPayload } from '../common/auth/jwt-payload.interface';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('perfil')
  perfil(@CurrentUser() user: JwtPayload) {
    return this.authService.perfil(user);
  }
}
