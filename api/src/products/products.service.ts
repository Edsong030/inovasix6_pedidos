import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  findAll(restaurantId: string) {
    return this.prisma.product.findMany({
      where: { restaurantId },
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });
  }

  async findOne(id: string, restaurantId: string) {
    const p = await this.prisma.product.findFirst({
      where: { id, restaurantId },
      include: { category: true },
    });
    if (!p) throw new NotFoundException('Produto não encontrado');
    return p;
  }

  create(restaurantId: string, dto: CreateProductDto) {
    return this.prisma.product.create({ data: { ...dto, restaurantId } });
  }

  async update(id: string, restaurantId: string, dto: Partial<CreateProductDto>) {
    await this.findOne(id, restaurantId);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(id: string, restaurantId: string) {
    await this.findOne(id, restaurantId);
    return this.prisma.product.delete({ where: { id } });
  }
}
