import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, restaurantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, restaurantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async create(restaurantId: string, dto: CreateUserDto) {
    const exists = await this.findByEmail(dto.email, restaurantId);
    if (exists) throw new ConflictException('E-mail já cadastrado');

    const hash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { ...dto, password: hash, restaurantId },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
  }

  async update(id: string, restaurantId: string, dto: UpdateUserDto) {
    await this.findOne(id, restaurantId);
    const data: Record<string, unknown> = { ...dto };
    if (dto.password) {
      data['password'] = await bcrypt.hash(dto.password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true },
    });
  }

  async remove(id: string, restaurantId: string) {
    await this.findOne(id, restaurantId);
    return this.prisma.user.update({
      where: { id },
      data: { active: false },
    });
  }
}
