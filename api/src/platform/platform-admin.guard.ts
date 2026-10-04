import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

/**
 * Área da plataforma: além do papel PLATFORM_ADMIN, o usuário precisa pertencer ao
 * estabelecimento interno da Inovasix6 (Restaurant.isPlatform). Um PLATFORM_ADMIN gravado
 * por engano num estabelecimento cliente não ganha acesso a nada aqui.
 * Usar depois de JwtAuthGuard (request.user já vem validado do banco).
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (user?.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Acesso não permitido para este perfil');
    }
    const home = await this.prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      select: { isPlatform: true },
    });
    if (!home?.isPlatform)
      throw new ForbiddenException('Acesso não permitido para este perfil');
    return true;
  }
}
