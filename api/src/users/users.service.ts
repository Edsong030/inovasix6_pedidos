import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { canManageRole } from '../common/permissions';

/** Quem está executando a ação (vem do JWT, nunca do corpo da requisição). */
export interface Actor {
  id: string;
  role: UserRole;
  restaurantId: string;
}

const PUBLIC_USER = { id: true, name: true, email: true, role: true, active: true } as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string, restaurantId: string) {
    return this.prisma.user.findUnique({
      where: { email_restaurantId: { email, restaurantId } },
    });
  }

  async findRestaurantBySlug(slug: string) {
    return this.prisma.restaurant.findUnique({ where: { slug } });
  }

  async findAll(restaurantId: string) {
    return this.prisma.user.findMany({
      where: { restaurantId },
      select: { ...PUBLIC_USER, createdAt: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, restaurantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, restaurantId },
      select: { ...PUBLIC_USER, createdAt: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async create(actor: Actor, dto: CreateUserDto) {
    if (!canManageRole(actor.role, dto.role)) {
      throw new ForbiddenException('Seu perfil não pode criar usuários com este papel');
    }
    const exists = await this.findByEmail(dto.email, actor.restaurantId);
    if (exists) throw new ConflictException('E-mail já cadastrado');

    const hash = await bcrypt.hash(dto.password, 10);
    try {
      return await this.prisma.user.create({
        data: { ...dto, password: hash, restaurantId: actor.restaurantId },
        select: PUBLIC_USER,
      });
    } catch (e) {
      throw this.uniqueEmail(e);
    }
  }

  async update(id: string, actor: Actor, dto: UpdateUserDto) {
    const password = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;

    return this.prisma.$transaction(async (tx) => {
      const target = await this.lockTarget(tx, id, actor.restaurantId);
      const self = target.id === actor.id;
      const changesRole = dto.role !== undefined && dto.role !== target.role;
      const deactivates = dto.active === false && target.active;

      if (self) {
        // Pode editar os próprios dados (nome, e-mail, senha), mas não o próprio acesso
        if (changesRole) throw new ForbiddenException('Você não pode alterar o próprio papel');
        if (deactivates) throw new ForbiddenException('Você não pode desativar o próprio usuário');
      } else if (!canManageRole(actor.role, target.role)) {
        throw new ForbiddenException('Seu perfil não pode alterar este usuário');
      }
      if (changesRole && !canManageRole(actor.role, dto.role!)) {
        throw new ForbiddenException('Seu perfil não pode atribuir este papel');
      }
      if (target.role === UserRole.ADMIN && target.active && (changesRole || deactivates)) {
        await this.assertAnotherActiveAdmin(tx, target.id, actor.restaurantId);
      }

      let updated;
      try {
        updated = await tx.user.update({
          where: { id: target.id, restaurantId: actor.restaurantId },
          data: { ...dto, password },
          select: PUBLIC_USER,
        });
      } catch (e) {
        throw this.uniqueEmail(e);
      }
      // Senha, papel ou desativação: todas as sessões do usuário caem na requisição seguinte
      if (password || changesRole || deactivates) await this.revokeSessions(tx, target.id);
      return updated;
    });
  }

  /** Remoção lógica (desativa). */
  async remove(id: string, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      const target = await this.lockTarget(tx, id, actor.restaurantId);
      if (target.id === actor.id) throw new ForbiddenException('Você não pode desativar o próprio usuário');
      if (!canManageRole(actor.role, target.role)) {
        throw new ForbiddenException('Seu perfil não pode alterar este usuário');
      }
      if (target.role === UserRole.ADMIN && target.active) {
        await this.assertAnotherActiveAdmin(tx, target.id, actor.restaurantId);
      }
      const updated = await tx.user.update({
        where: { id: target.id, restaurantId: actor.restaurantId },
        data: { active: false },
        select: PUBLIC_USER,
      });
      await this.revokeSessions(tx, target.id);
      return updated;
    });
  }

  /** Revoga todas as sessões abertas do usuário (efeito imediato: a JwtStrategy confere no banco). */
  private revokeSessions(tx: Prisma.TransactionClient, userId: string) {
    return tx.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  /**
   * Carrega o alvo (só do restaurante de quem age) e trava os ADMINs ativos do restaurante
   * até o fim da transação: dois administradores rebaixando um ao outro ao mesmo tempo
   * são serializados, e o último ADMIN ativo nunca some.
   */
  private async lockTarget(tx: Prisma.TransactionClient, id: string, restaurantId: string) {
    await tx.$queryRaw`
      SELECT id FROM users
      WHERE "restaurantId" = ${restaurantId} AND role = 'ADMIN' AND active = true
      FOR UPDATE`;
    const target = await tx.user.findFirst({
      where: { id, restaurantId },
      select: { id: true, role: true, active: true },
    });
    if (!target) throw new NotFoundException('Usuário não encontrado');
    return target;
  }

  private async assertAnotherActiveAdmin(tx: Prisma.TransactionClient, exceptId: string, restaurantId: string) {
    const others = await tx.user.count({
      where: { restaurantId, role: UserRole.ADMIN, active: true, id: { not: exceptId } },
    });
    if (others === 0) {
      throw new ConflictException('O restaurante precisa de pelo menos um administrador ativo');
    }
  }

  private uniqueEmail(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return new ConflictException('E-mail já cadastrado');
    }
    return e;
  }
}
