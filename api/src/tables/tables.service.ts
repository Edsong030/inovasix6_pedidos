import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTableDto, UpdateTableStatusDto } from './dto/create-table.dto';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  findAll(restaurantId: string) {
    return this.prisma.table.findMany({
      where: { restaurantId },
      include: {
        orders: {
          where: { status: { in: ['RECEIVED', 'PREPARING', 'READY'] } },
          select: { id: true, orderNumber: true, status: true, total: true },
        },
      },
      orderBy: { number: 'asc' },
    });
  }

  async findOne(id: string, restaurantId: string) {
    const t = await this.prisma.table.findFirst({ where: { id, restaurantId } });
    if (!t) throw new NotFoundException('Mesa não encontrada');
    return t;
  }

  async create(restaurantId: string, dto: CreateTableDto) {
    const exists = await this.prisma.table.findUnique({
      where: { restaurantId_number: { restaurantId, number: dto.number } },
    });
    if (exists) throw new ConflictException('Número de mesa já existe');
    return this.prisma.table.create({ data: { ...dto, restaurantId } });
  }

  async updateStatus(id: string, restaurantId: string, dto: UpdateTableStatusDto) {
    await this.findOne(id, restaurantId);
    return this.prisma.table.update({ where: { id }, data: { status: dto.status } });
  }

  async remove(id: string, restaurantId: string) {
    await this.findOne(id, restaurantId);
    return this.prisma.table.delete({ where: { id } });
  }
}
