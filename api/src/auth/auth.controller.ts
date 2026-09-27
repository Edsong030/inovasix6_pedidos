import { Controller, Post, Get, Body, HttpCode, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiTags, ApiOperation, ApiCookieAuth, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginRateLimiter } from './login-rate-limiter';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from './strategies/jwt.strategy';
import {
  SESSION_COOKIE, clearSessionCookieOptions, durationMs, readCookie, sessionCookieOptions, type SessionPayload,
} from './session';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private limiter: LoginRateLimiter,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Login: grava a sessão no cookie HttpOnly "inx_session" (o token não vem no corpo)',
    description: 'No Swagger, execute este endpoint primeiro: o navegador guarda o cookie e as próximas chamadas já saem autenticadas.',
  })
  @ApiResponse({ status: 200, description: 'Sessão criada; corpo traz só os dados do usuário' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas (mensagem genérica)' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas para este IP/e-mail/estabelecimento' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'desconhecido';
    this.limiter.assertAllowed(ip, dto.email, dto.restaurantSlug);

    const sessionMs = durationMs(this.config.get<string>('JWT_EXPIRES_IN', '8h'));
    try {
      const result = await this.authService.login(dto.email, dto.password, dto.restaurantSlug, sessionMs);
      this.limiter.recordSuccess(ip, dto.email, dto.restaurantSlug);
      res.cookie(SESSION_COOKIE, result.token, sessionCookieOptions(sessionMs));
      return { user: result.user, expiresAt: result.expiresAt };
    } catch (e) {
      if (e instanceof UnauthorizedException) this.limiter.recordFailure(ip, dto.email, dto.restaurantSlug);
      throw e;
    }
  }

  /**
   * Encerra a sessão atual: revoga no banco e apaga o cookie. Funciona mesmo com a
   * sessão já expirada/revogada (sempre limpa o cookie).
   */
  @Post('logout')
  @HttpCode(204)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Logout: revoga a sessão no servidor e apaga o cookie' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) {
      try {
        const payload = this.jwt.verify<SessionPayload>(token);
        if (payload?.sid) await this.authService.logout(payload.sid);
      } catch {
        // token inválido/expirado: nada a revogar
      }
    }
    res.clearCookie(SESSION_COOKIE, clearSessionCookieOptions());
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Usuário da sessão atual (401 se a sessão não é mais válida)' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.id, user.restaurantId);
  }
}
