import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { jwtSecret } from '../jwt-secret';
import { SESSION_COOKIE, readCookie, type SessionPayload } from '../session';

/** O que os controllers recebem em request.user (sempre lido do banco). */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  restaurantId: string;
  sessionId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      // Só o cookie HttpOnly: não há token em header nem no corpo das respostas
      jwtFromRequest: (req: Request) => readCookie(req, SESSION_COOKIE),
      ignoreExpiration: false,
      secretOrKey: jwtSecret(config),
    });
  }

  /**
   * A assinatura válida não basta: a sessão precisa existir, não estar revogada nem
   * expirada, e o usuário precisa estar ativo no mesmo restaurante. O papel vem do
   * banco, então mudanças valem já na requisição seguinte.
   */
  async validate(payload: SessionPayload): Promise<AuthUser> {
    if (!payload?.sid || !payload.sub || !payload.rid) throw new UnauthorizedException();
    const session = await this.prisma.userSession.findUnique({
      where: { id: payload.sid },
      select: {
        userId: true, restaurantId: true, expiresAt: true, revokedAt: true,
        user: { select: { id: true, email: true, role: true, active: true, restaurantId: true } },
      },
    });
    const valid =
      session &&
      !session.revokedAt &&
      session.expiresAt.getTime() > Date.now() &&
      session.userId === payload.sub &&
      session.restaurantId === payload.rid &&
      session.user.active &&
      session.user.restaurantId === payload.rid;
    if (!valid) throw new UnauthorizedException('Sessão expirada ou encerrada. Entre novamente.');
    return {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      restaurantId: session.user.restaurantId,
      sessionId: payload.sid,
    };
  }
}
