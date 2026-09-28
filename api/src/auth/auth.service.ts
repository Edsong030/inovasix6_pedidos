import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionPayload } from './session';

/** Hash descartável: com e-mail ou estabelecimento inexistente, o login gasta o mesmo
 *  tempo do bcrypt de uma senha errada (não revela quais contas existem). */
const DUMMY_HASH = bcrypt.hashSync('inovasix-dummy-password', 10);
const INVALID = 'Credenciais inválidas';

export interface LoginResult {
  token: string;
  expiresAt: Date;
  user: Awaited<ReturnType<AuthService['me']>>;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Valida credenciais e abre uma sessão. Qualquer falha (estabelecimento, e-mail,
   * senha ou usuário inativo) responde a mesma mensagem genérica.
   */
  async login(email: string, password: string, restaurantSlug: string, sessionMs: number): Promise<LoginResult> {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { slug: restaurantSlug }, select: { id: true } });
    const user = await this.validateUser(email, password, restaurant?.id ?? null);

    const now = Date.now();
    // Limpeza oportunista: sessões expiradas deste usuário
    await this.prisma.userSession.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date(now) } } });
    const session = await this.prisma.userSession.create({
      data: { userId: user.id, restaurantId: user.restaurantId, expiresAt: new Date(now + sessionMs) },
    });
    const payload: SessionPayload = { sub: user.id, sid: session.id, rid: user.restaurantId };
    return {
      token: this.jwtService.sign(payload, { expiresIn: Math.floor(sessionMs / 1000) }),
      expiresAt: session.expiresAt,
      user: await this.me(user.id, user.restaurantId),
    };
  }

  /** Usuário ativo com a senha correta no restaurante informado; senão 401 genérico. */
  async validateUser(email: string, password: string, restaurantId: string | null) {
    const user = restaurantId
      ? await this.prisma.user.findUnique({ where: { email_restaurantId: { email, restaurantId } } })
      : null;
    const valid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
    if (!user || !valid || !user.active) throw new UnauthorizedException(INVALID);
    return user;
  }

  /** Revoga só esta sessão (os outros aparelhos do usuário continuam logados). */
  async logout(sessionId: string) {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Dados exibidos pelo frontend (nunca inclui senha nem token). */
  async me(userId: string, restaurantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, restaurantId },
      select: {
        id: true, name: true, email: true, role: true, restaurantId: true,
        restaurant: { select: { name: true, slug: true, businessType: true } },
      },
    });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
      restaurantName: user.restaurant.name,
      restaurantSlug: user.restaurant.slug,
      businessType: user.restaurant.businessType,
    };
  }
}
