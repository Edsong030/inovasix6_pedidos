import { BadRequestException, ConflictException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CategoriesService } from '../categories/categories.service';

/**
 * Isolamento produto ↔ categoria entre dois restaurantes (A e B),
 * com um Prisma em memória que respeita os filtros usados pelos serviços.
 */
type Row = Record<string, any>;

function fakePrisma() {
  const categories: Row[] = [
    { id: 'cat-a', name: 'Lanches A', sortOrder: 0, restaurantId: 'rest-a' },
    { id: 'cat-b', name: 'Segredo B', sortOrder: 0, restaurantId: 'rest-b' },
  ];
  const products: Row[] = [
    { id: 'prod-a', name: 'X-Burger', price: 20, available: true, categoryId: 'cat-a', restaurantId: 'rest-a' },
    { id: 'prod-b', name: 'Produto B', price: 30, available: true, categoryId: 'cat-b', restaurantId: 'rest-b' },
  ];
  const match = (row: Row, where: Row = {}) =>
    Object.entries(where).every(([k, v]) => row[k] === v);
  const withCategory = (p: Row) => ({ ...p, category: categories.find((c) => c.id === p.categoryId) ?? null });
  const writes: string[] = [];

  const prisma = {
    category: {
      findFirst: jest.fn(async ({ where, include }: Row) => {
        const c = categories.find((x) => match(x, where));
        if (!c) return null;
        if (!include?.products) return { ...c };
        return { ...c, products: products.filter((p) => p.categoryId === c.id && match(p, include.products.where)) };
      }),
      findMany: jest.fn(async ({ where, include }: Row) =>
        categories.filter((c) => match(c, where)).map((c) => ({
          ...c,
          _count: { products: products.filter((p) => p.categoryId === c.id && match(p, include._count.select.products.where)).length },
        })),
      ),
      delete: jest.fn(async ({ where }: Row) => { writes.push('category.delete'); return categories.find((c) => c.id === where.id); }),
    },
    product: {
      findFirst: jest.fn(async ({ where }: Row) => {
        const p = products.find((x) => match(x, where));
        return p ? withCategory(p) : null;
      }),
      findMany: jest.fn(async ({ where }: Row) => products.filter((p) => match(p, where)).map(withCategory)),
      count: jest.fn(async ({ where }: Row) => products.filter((p) => match(p, where)).length),
      create: jest.fn(async ({ data }: Row) => {
        writes.push('product.create');
        const p = { id: `prod-${products.length + 1}`, ...data };
        products.push(p);
        return p;
      }),
      updateMany: jest.fn(async ({ where, data }: Row) => {
        writes.push('product.updateMany');
        const list = products.filter((p) => match(p, where));
        list.forEach((p) => Object.assign(p, data));
        return { count: list.length };
      }),
    },
  };
  return { prisma, products, categories, writes };
}

describe('Isolamento de categoria entre restaurantes', () => {
  let db: ReturnType<typeof fakePrisma>;
  let productsA: ProductsService;
  let categoriesA: CategoriesService;

  beforeEach(() => {
    db = fakePrisma();
    productsA = new ProductsService(db.prisma as any);
    categoriesA = new CategoriesService(db.prisma as any);
  });

  const expectNoLeak = async (p: Promise<unknown>) => {
    const err = await p.then(() => null, (e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    const body = JSON.stringify(err.getResponse());
    expect(body).toContain('Categoria não encontrada');
    expect(body).not.toMatch(/Segredo B|rest-b|cat-b/);
  };

  it('criar produto com categoria de outro restaurante falha sem gravar e sem expor dados', async () => {
    await expectNoLeak(productsA.create('rest-a', { categoryId: 'cat-b', name: 'Invasor', price: 10 } as any));
    expect(db.writes).toEqual([]);
    expect(db.products).toHaveLength(2);
  });

  it('categoria inexistente e outro restaurante recebem a mesma resposta', async () => {
    await expectNoLeak(productsA.create('rest-a', { categoryId: 'nao-existe', name: 'X', price: 1 } as any));
  });

  it('editar produto para categoria de outro restaurante falha sem atualização parcial', async () => {
    const before = { ...db.products[0] };
    await expectNoLeak(productsA.update('prod-a', 'rest-a', { categoryId: 'cat-b', name: 'Nome novo', price: 99 }));
    expect(db.writes).toEqual([]);
    expect(db.products[0]).toEqual(before);
  });

  it('editar com categoryId nulo ou vazio é rejeitado', async () => {
    await expectNoLeak(productsA.update('prod-a', 'rest-a', { categoryId: null as any }));
    await expectNoLeak(productsA.update('prod-a', 'rest-a', { categoryId: '  ' }));
    expect(db.writes).toEqual([]);
  });

  it('criar e editar com categoria do próprio restaurante continuam funcionando', async () => {
    db.categories.push({ id: 'cat-a2', name: 'Bebidas A', sortOrder: 1, restaurantId: 'rest-a' });
    const created = await productsA.create('rest-a', { categoryId: 'cat-a', name: 'Suco', price: 8 } as any);
    expect(created).toMatchObject({ categoryId: 'cat-a', restaurantId: 'rest-a' });

    const updated = await productsA.update('prod-a', 'rest-a', { categoryId: 'cat-a2', name: 'X-Salada' });
    expect(updated).toMatchObject({ name: 'X-Salada', categoryId: 'cat-a2', category: { id: 'cat-a2', name: 'Bebidas A' } });
    expect((updated.category as Row).restaurantId).toBeUndefined();

    // Edição sem categoryId não consulta categoria e segue normal
    const priceOnly = await productsA.update('prod-a', 'rest-a', { price: 25 });
    expect(priceOnly).toMatchObject({ price: 25, categoryId: 'cat-a2' });
  });

  it('restaurante não edita produto de outro restaurante (404, sem gravar)', async () => {
    await expect(productsA.update('prod-b', 'rest-a', { categoryId: 'cat-a' })).rejects.toThrow('Produto não encontrado');
    expect(db.writes).toEqual([]);
  });

  it('vínculo antigo com categoria de outro restaurante não aparece nas respostas de produto', async () => {
    db.products[0].categoryId = 'cat-b';
    const list = await productsA.findAll('rest-a');
    expect(list).toHaveLength(1);
    expect(list[0].category).toBeNull();
    expect(JSON.stringify(list)).not.toMatch(/Segredo B|rest-b/);
    const one = await productsA.findOne('prod-a', 'rest-a');
    expect(one.category).toBeNull();
  });

  it('categorias: listagem, contagem e detalhe nunca incluem produtos de outro restaurante', async () => {
    db.products[1].categoryId = 'cat-a'; // vínculo antigo: produto de B apontando para categoria de A
    const list = await categoriesA.findAll('rest-a');
    expect(list.map((c: Row) => c.id)).toEqual(['cat-a']);
    expect((list[0] as Row)._count.products).toBe(1);
    const one = await categoriesA.findOne('cat-a', 'rest-a');
    expect(one.products.map((p: Row) => p.id)).toEqual(['prod-a']);
    await expect(categoriesA.findOne('cat-b', 'rest-a')).rejects.toThrow('Categoria não encontrada');
  });

  it('categorias: exclusão não revela quantos produtos de outro restaurante usam a categoria', async () => {
    db.products[0].categoryId = 'cat-x';
    db.products[1].categoryId = 'cat-a';
    const err = await categoriesA.remove('cat-a', 'rest-a').catch((e) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.message).toBe('Não é possível excluir: categoria em uso.');
    expect(db.writes).toEqual([]);
  });

  it('categorias: exclusão conta só os produtos do próprio restaurante', async () => {
    await expect(categoriesA.remove('cat-a', 'rest-a')).rejects.toThrow('possui 1 produto vinculado');
    db.products[0].categoryId = 'cat-x';
    await categoriesA.remove('cat-a', 'rest-a');
    expect(db.writes).toEqual(['category.delete']);
  });
});
