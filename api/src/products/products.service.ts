import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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
    const { addons, ...rest } = dto;
    return this.prisma.product.create({
      data: {
        ...rest,
        restaurantId,
        addons: addons ? (addons as unknown as Prisma.InputJsonArray) : undefined,
      },
    });
  }

  async update(id: string, restaurantId: string, dto: UpdateProductDto) {
    await this.findOne(id, restaurantId);

    // Constrói o objeto passando null explicitamente quando presente,
    // e omitindo campos undefined (Prisma ignora undefined — não sobrescreve).
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        // null é incluído propositalmente → zera o campo no banco
        data[key] = value;
      }
    }

    return this.prisma.product.update({ where: { id }, data });
  }

  async remove(id: string, restaurantId: string) {
    await this.findOne(id, restaurantId);
    return this.prisma.product.delete({ where: { id } });
  }
}
