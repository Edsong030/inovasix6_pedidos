import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { normalizeOptionGroups } from './product-options';

/** Valida as regras dos grupos (mín./máx., ids únicos…) e devolve o JSON a gravar. */
function optionGroupsJson(input: unknown): Prisma.InputJsonValue {
  const r = normalizeOptionGroups(input);
  if ('error' in r) throw new BadRequestException(r.error);
  return r.groups as unknown as Prisma.InputJsonValue;
}

/**
 * Mensagem única para categoria inexistente ou de outro restaurante:
 * não revela se o id existe em outro estabelecimento.
 */
const INVALID_CATEGORY = 'Categoria não encontrada';

type WithCategory<T> = T & { category: { restaurantId: string } | null };

/** Defesa em profundidade: nunca devolve categoria de outro restaurante (dados antigos). */
function ownCategoryOnly<T>(product: WithCategory<T>, restaurantId: string) {
  const { category, ...rest } = product;
  if (!category || category.restaurantId !== restaurantId) return { ...rest, category: null };
  const { restaurantId: _r, ...safe } = category as Record<string, unknown>;
  return { ...rest, category: safe };
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  /** Garante que a categoria pertence ao restaurante do token (antes de qualquer gravação). */
  private async assertOwnCategory(categoryId: unknown, restaurantId: string) {
    if (typeof categoryId !== 'string' || !categoryId.trim()) throw new BadRequestException(INVALID_CATEGORY);
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, restaurantId },
      select: { id: true },
    });
    if (!category) throw new BadRequestException(INVALID_CATEGORY);
  }

  async findAll(restaurantId: string) {
    const products = await this.prisma.product.findMany({
      where: { restaurantId },
      include: { category: { select: { id: true, name: true, restaurantId: true } } },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });
    return products.map((p) => ownCategoryOnly(p, restaurantId));
  }

  async findOne(id: string, restaurantId: string) {
    const p = await this.prisma.product.findFirst({
      where: { id, restaurantId },
      include: { category: true },
    });
    if (!p) throw new NotFoundException('Produto não encontrado');
    return ownCategoryOnly(p, restaurantId);
  }

  async create(restaurantId: string, dto: CreateProductDto) {
    const { optionGroups, ...rest } = dto;
    // Todas as validações antes de gravar
    await this.assertOwnCategory(dto.categoryId, restaurantId);
    const groups = optionGroups ? optionGroupsJson(optionGroups) : undefined;
    return this.prisma.product.create({
      data: { ...rest, restaurantId, optionGroups: groups },
    });
  }

  async update(id: string, restaurantId: string, dto: UpdateProductDto) {
    await this.findOne(id, restaurantId);

    // Validações antes de gravar: nada é salvo se a categoria for inválida
    if (dto.categoryId !== undefined) await this.assertOwnCategory(dto.categoryId, restaurantId);

    // Constrói o objeto passando null explicitamente quando presente,
    // e omitindo campos undefined (Prisma ignora undefined — não sobrescreve).
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        // null é incluído propositalmente → zera o campo no banco
        data[key] = value;
      }
    }

    if (dto.optionGroups !== undefined) data.optionGroups = optionGroupsJson(dto.optionGroups);

    // restaurantId no filtro: a atualização só alcança produto deste restaurante
    const { count } = await this.prisma.product.updateMany({
      where: { id, restaurantId },
      data: data as Prisma.ProductUncheckedUpdateManyInput,
    });
    if (count === 0) throw new NotFoundException('Produto não encontrado');
    return this.findOne(id, restaurantId);
  }

  async remove(id: string, restaurantId: string) {
    await this.findOne(id, restaurantId);
    return this.prisma.product.delete({ where: { id } });
  }
}
