import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll(restaurantId: string) {
    return this.prisma.category.findMany({
      where: { restaurantId },
      // Conta só produtos do próprio restaurante
      include: { _count: { select: { products: { where: { restaurantId } } } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, restaurantId: string) {
    const cat = await this.prisma.category.findFirst({
      where: { id, restaurantId },
      include: { products: { where: { available: true, restaurantId }, orderBy: { name: 'asc' } } },
    });
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    return cat;
  }

  create(restaurantId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: { ...dto, restaurantId } });
  }

  async update(id: string, restaurantId: string, dto: Partial<CreateCategoryDto>) {
    await this.findOne(id, restaurantId);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string, restaurantId: string) {
    await this.findOne(id, restaurantId);

    // Impede exclusão se houver produtos vinculados. A mensagem só informa a
    // quantidade do próprio restaurante; vínculo de outro restaurante (dado antigo)
    // também bloqueia, mas sem revelar quantos são.
    const [total, count] = await Promise.all([
      this.prisma.product.count({ where: { categoryId: id } }),
      this.prisma.product.count({ where: { categoryId: id, restaurantId } }),
    ]);
    if (total > 0 && count === 0) {
      throw new ConflictException('Não é possível excluir: categoria em uso.');
    }
    if (count > 0) {
      throw new ConflictException(
        `Não é possível excluir: categoria possui ${count} produto${count > 1 ? 's' : ''} vinculado${count > 1 ? 's' : ''}. Mova ou exclua os produtos primeiro.`,
      );
    }

    return this.prisma.category.delete({ where: { id } });
  }
}
