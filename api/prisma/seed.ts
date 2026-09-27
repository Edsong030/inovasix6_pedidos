/**
 * Seed do modo local/API: cria quatro estabelecimentos de demonstração independentes
 * (restaurante-demo, lanchonete-demo, confeitaria-demo, japones-demo). Cada um é um
 * restaurante próprio, com usuários, cardápio, mesas, pedidos e histórico — isolados
 * pelo restaurantId como qualquer cliente real.
 *
 *   npm run db:seed        cria o que faltar; nunca apaga nada. Nos quatro estabelecimentos de
 *                          demonstração, restaura o tipo (se foi trocado) e avisa quando os
 *                          pedidos de exemplo estão em aberto há horas
 *   npm run db:demo-reset -- --confirm
 *                          APAGA e recria SÓ esses quatro estabelecimentos (cardápio, mesas e
 *                          pedidos) com horários relativos a agora. Sem --confirm apenas lista o
 *                          que seria apagado. Recusado com NODE_ENV=production.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient, Prisma, UserRole, OrderStatus, TableStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { normalizeOptionGroups, readOptionGroups, resolveSelection, type ProductOptionGroup } from '../src/products/product-options';
import { DEMO_TENANT_TYPES, isDefaultBusinessName } from '../src/restaurants/settings.constants';
import { DEMO_TENANTS, type OrderDef, type TenantDef } from './demo-tenants';

const prisma = new PrismaClient();
const RESET = process.argv.includes('--reset');
const CONFIRM = process.argv.includes('--confirm');
const MIN = 60_000;
const HISTORY_DAYS = 14;
const STALE_HOURS = 3;

const USERS: Array<[email: string, name: string, password: string, role: UserRole]> = [
  ['admin@inovasix.com', 'Administrador', 'admin123', UserRole.ADMIN],
  ['gerente@inovasix.com', 'Carlos Gerente', 'gerente123', UserRole.MANAGER],
  ['atendente@inovasix.com', 'Ana Atendente', 'atendente123', UserRole.ATTENDANT],
  ['cozinha@inovasix.com', 'João Cozinha', 'cozinha123', UserRole.KITCHEN],
  ['entregador@inovasix.com', 'Pedro Entregador', 'entregador123', UserRole.DELIVERY],
];
const CUSTOMERS = ['Ana Souza', 'Bruno Lima', 'Carla Mendes', 'Diego Rocha', 'Elaine Castro', 'Felipe Nunes', 'Gabriela Reis', 'Henrique Dias'];

type Catalog = Map<string, { id: string; name: string; price: number; saleUnit: Prisma.ProductCreateInput['saleUnit']; groups: ProductOptionGroup[] }>;

/** Gerador determinístico (mesmo histórico a cada execução). */
function seeded(seed: string) {
  let a = 2166136261;
  for (let i = 0; i < seed.length; i++) a = Math.imul(a ^ seed.charCodeAt(i), 16777619);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Remove cardápio, mesas e pedidos de um estabelecimento de demonstração (e só dele). */
async function wipeTenant(restaurant: { id: string; slug: string }) {
  if (!DEMO_TENANT_TYPES[restaurant.slug]) throw new Error(`Recusado: "${restaurant.slug}" não é estabelecimento de demonstração`);
  const restaurantId = restaurant.id;
  await prisma.order.deleteMany({ where: { restaurantId } }); // itens e opções em cascata
  await prisma.product.deleteMany({ where: { restaurantId } });
  await prisma.category.deleteMany({ where: { restaurantId } });
  await prisma.table.deleteMany({ where: { restaurantId } });
}

/** Itens com preço e escolhas calculados pelas mesmas regras da API. */
function buildItems(def: TenantDef, catalog: Catalog, items: OrderDef['items']) {
  return items.map(([key, quantity, opts]) => {
    const p = catalog.get(key);
    if (!p) throw new Error(`${def.slug}: produto "${key}" não existe no cardápio`);
    // O cardápio pode ter sido editado depois do seed: usa só opções que existem e
    // completa grupos obrigatórios com a primeira opção disponível
    const known = new Set(p.groups.flatMap((g) => g.options.filter((o) => o.available).map((o) => o.id)));
    const optionIds = (opts?.optionIds ?? []).filter((id) => known.has(id));
    for (const g of p.groups.filter((g) => g.required && !g.options.some((o) => optionIds.includes(o.id)))) {
      const first = g.options.find((o) => o.available);
      if (first) optionIds.push(first.id);
    }
    const selection = resolveSelection(p.name, p.groups, optionIds);
    if ('error' in selection) throw new Error(`${def.slug}: ${selection.error}`);
    const unitPrice = Math.round((p.price + selection.extra) * 100) / 100;
    return {
      productId: p.id, productName: p.name, quantity, unit: p.saleUnit, unitPrice,
      totalPrice: Math.round(unitPrice * quantity * 100) / 100,
      notes: opts?.notes,
      options: selection.chosen.length ? { create: selection.chosen.map((c, i) => ({ ...c, sortOrder: i })) } : undefined,
    };
  });
}

async function seedTenant(def: TenantDef, hashes: Map<string, string>) {
  // ─── Estabelecimento ──────────────────────────────────────────────────────
  const base = { name: def.name, businessType: def.businessType, avgPrepMinutes: def.avgPrepMinutes, phone: def.phone, address: def.address };
  if (DEMO_TENANT_TYPES[def.slug] !== def.businessType) throw new Error(`${def.slug}: tipo diferente de DEMO_TENANT_TYPES`);
  let restaurant = await prisma.restaurant.findUnique({ where: { slug: def.slug } });
  if (!restaurant) {
    restaurant = await prisma.restaurant.create({ data: { slug: def.slug, ...base } });
  } else if (RESET) {
    await wipeTenant(restaurant);
    restaurant = await prisma.restaurant.update({ where: { id: restaurant.id }, data: { ...base, acceptingOrders: true } });
  } else if (restaurant.businessType !== def.businessType) {
    // Versões antigas deixavam trocar o tipo do estabelecimento de demonstração
    // (ex.: "Confeitaria Demo" com pedidos de restaurante). O tipo volta ao do slug;
    // nome personalizado é mantido.
    restaurant = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { businessType: def.businessType, ...(isDefaultBusinessName(restaurant.name) && { name: def.name }) },
    });
    console.log(`🔧 ${def.slug}: tipo restaurado para ${def.businessType}`);
  }
  const restaurantId = restaurant.id;

  // ─── Usuários (mesmas credenciais de demonstração em cada estabelecimento) ─
  const users = new Map<UserRole, string>();
  for (const [email, name, password, role] of USERS) {
    const u = await prisma.user.upsert({
      where: { email_restaurantId: { email, restaurantId } },
      update: RESET ? { name, role, active: true, password: hashes.get(password)! } : {},
      create: { restaurantId, name, email, role, password: hashes.get(password)! },
    });
    users.set(role, u.id);
  }

  // ─── Mesas ────────────────────────────────────────────────────────────────
  const tables = new Map<string, string>();
  for (const [number, capacity] of def.tables) {
    const t = await prisma.table.upsert({
      where: { restaurantId_number: { restaurantId, number } },
      update: {},
      create: { restaurantId, number, capacity },
    });
    tables.set(number, t.id);
  }

  // ─── Categorias e produtos (encontra pelo nome; só cria o que falta) ───────
  const categoryIds = new Map<string, string>();
  for (const [i, [key, name, description]] of def.categories.entries()) {
    const found = await prisma.category.findFirst({ where: { restaurantId, name } });
    const c = found ?? await prisma.category.create({ data: { restaurantId, name, description, sortOrder: i + 1 } });
    categoryIds.set(key, c.id);
  }
  const catalog: Catalog = new Map();
  for (const p of def.products) {
    const groups = normalizeOptionGroups(p.optionGroups ?? []);
    if ('error' in groups) throw new Error(`${def.slug} / ${p.name}: ${groups.error}`);
    let row = await prisma.product.findFirst({ where: { restaurantId, name: p.name } });
    if (!row) {
      row = await prisma.product.create({
        data: {
          restaurantId, categoryId: categoryIds.get(p.cat)!, name: p.name, description: p.description, price: p.price,
          imageUrl: p.image, available: p.available ?? true, saleUnit: p.saleUnit, madeToOrder: p.madeToOrder ?? false,
          minLeadTimeHours: p.minLeadTimeHours, observationOptions: p.observationOptions ?? [],
          optionGroups: groups.groups.length ? (groups.groups as unknown as Prisma.InputJsonValue) : undefined,
        },
      });
    } else if (!row.imageUrl || (row.optionGroups === null && groups.groups.length)) {
      // Completa o que falta em produtos de versões antigas; nada é sobrescrito
      row = await prisma.product.update({
        where: { id: row.id },
        data: {
          ...(!row.imageUrl && { imageUrl: p.image }),
          ...(row.optionGroups === null && groups.groups.length && { optionGroups: groups.groups as unknown as Prisma.InputJsonValue }),
        },
      });
    }
    catalog.set(p.key, { id: row.id, name: row.name, price: Number(row.price), saleUnit: row.saleUnit, groups: readOptionGroups(row.optionGroups) });
  }

  // ─── Pedidos (só em estabelecimento sem pedidos; o reset esvazia antes) ────
  if (await prisma.order.count({ where: { restaurantId } })) {
    console.log(`ℹ️  ${def.name}: já tem pedidos, mantidos`);
    // Os pedidos de exemplo "envelhecem": um banco semeado ontem abre com pedidos em
    // aberto há horas. O seed normal nunca apaga nada; só avisa como renovar.
    const stale = await prisma.order.count({
      where: {
        restaurantId, isPreorder: false,
        status: { in: [OrderStatus.RECEIVED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY] },
        createdAt: { lt: new Date(Date.now() - STALE_HOURS * 3_600_000) },
      },
    });
    if (stale) {
      console.log(`⚠️  ${def.name}: ${stale} pedido(s) em aberto há mais de ${STALE_HOURS} h. Para renovar os horários: npm run db:demo-reset (pede confirmação)`);
    }
    // Bancos criados por versões antigas deste seed têm pedidos "prontos antes de
    // recebidos" (o createdAt ficava com a hora do seed). Recua só o createdAt desses
    // pedidos para antes da primeira etapa. Idempotente.
    const existing = await prisma.order.findMany({
      where: { restaurantId },
      select: { id: true, createdAt: true, prepStartedAt: true, readyAt: true, deliveredAt: true },
    });
    for (const o of existing) {
      const steps = [o.prepStartedAt, o.readyAt, o.deliveredAt].filter((d): d is Date => !!d);
      const first = steps.length ? Math.min(...steps.map((d) => d.getTime())) : null;
      if (first !== null && first < o.createdAt.getTime()) {
        await prisma.order.update({ where: { id: o.id }, data: { createdAt: new Date(first - 3 * MIN) } });
      }
    }
    return;
  }
  try {
    await createOrders(def, restaurantId, users.get(UserRole.ATTENDANT)!, tables, catalog);
  } catch (e) {
    // Sem pedidos pela metade: a próxima execução recomeça do zero
    await prisma.order.deleteMany({ where: { restaurantId } });
    throw e;
  }
}

async function createOrders(def: TenantDef, restaurantId: string, attendant: string, tables: Map<string, string>, catalog: Catalog) {
  const now = Date.now();
  let number = 0;

  // Histórico dos dias anteriores (relatórios): entregues, dentro do tempo, em dois picos do dia
  const dishes = def.products.filter((p) => p.cat !== def.history.drinkCategory && !p.madeToOrder && p.available !== false);
  const drinks = def.products.filter((p) => p.cat === def.history.drinkCategory);
  for (let back = HISTORY_DAYS; back >= 1; back--) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - back);
    const rnd = seeded(`${def.slug}-${day.toISOString().slice(0, 10)}`);
    const [lo, hi] = def.history.perDay;
    const count = lo + Math.floor(rnd() * (hi - lo + 1));
    for (let i = 0; i < count; i++) {
      const picks: OrderDef['items'] = [];
      const n = 1 + Math.floor(rnd() * 2);
      for (let k = 0; k < n; k++) {
        const p = dishes[Math.floor(rnd() * dishes.length)];
        // Obrigatórios recebem a primeira opção; o resto do item vai sem adicionais
        const optionIds = catalog.get(p.key)!.groups.filter((g) => g.required).map((g) => g.options[0].id);
        picks.push([p.key, p.saleUnit === 'KG' ? 1 : 1 + Math.floor(rnd() * 2), { optionIds }]);
      }
      if (drinks.length && rnd() < 0.7) picks.push([drinks[Math.floor(rnd() * drinks.length)].key, 1 + Math.floor(rnd() * 2)]);
      const items = buildItems(def, catalog, picks);
      const subtotal = Math.round(items.reduce((s, it) => s + it.totalPrice, 0) * 100) / 100;
      const created = new Date(day.getTime() + (def.history.peaks[rnd() < 0.5 ? 0 : 1] + rnd() * 2.5) * 3_600_000);
      const prep = def.avgPrepMinutes * (0.6 + rnd() * 0.5);
      const cancelled = rnd() < 0.04;
      const channel = def.history.channels[Math.floor(rnd() * def.history.channels.length)];
      await prisma.order.create({
        data: {
          restaurantId, userId: attendant, orderNumber: ++number, channel,
          status: cancelled ? OrderStatus.CANCELLED : OrderStatus.DELIVERED,
          paymentMethod: (['PIX', 'CARD', 'CASH'] as const)[Math.floor(rnd() * 3)],
          customerName: CUSTOMERS[Math.floor(rnd() * CUSTOMERS.length)],
          subtotal, total: subtotal,
          createdAt: created,
          prepStartedAt: cancelled ? null : new Date(created.getTime() + 2 * MIN),
          readyAt: cancelled ? null : new Date(created.getTime() + prep * MIN),
          deliveredAt: cancelled ? null : new Date(created.getTime() + (prep + 8) * MIN),
          cancelledAt: cancelled ? new Date(created.getTime() + 5 * MIN) : null,
          estimatedReadyAt: new Date(created.getTime() + def.avgPrepMinutes * MIN),
          items: { create: items },
        },
      });
    }
  }

  // Pedidos de hoje: horários relativos a agora (poucos exemplos intencionais de prazo)
  const occupied = new Set<string>();
  for (const o of def.orders) {
    const items = buildItems(def, catalog, o.items);
    const subtotal = Math.round(items.reduce((s, it) => s + it.totalPrice, 0) * 100) / 100;
    const discount = o.discount ?? 0;
    const created = now - o.minutesAgo * MIN;
    // Cada etapa depois da anterior e nunca no futuro
    const started = o.status !== OrderStatus.RECEIVED;
    const ready = ([OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED] as OrderStatus[]).includes(o.status);
    const startedAt = created + Math.min(2 * MIN, o.minutesAgo * MIN / 4);
    const readyAt = Math.min(now - MIN, created + Math.min(def.avgPrepMinutes, o.minutesAgo - 3) * MIN);
    const deliveredAt = Math.min(now - MIN / 2, readyAt + 5 * MIN);
    const scheduledFor = o.scheduledInHours !== undefined ? new Date(now + o.scheduledInHours * 3_600_000) : null;
    const tableId = o.table ? tables.get(o.table) : undefined;
    if (tableId && !ready) occupied.add(tableId);
    await prisma.order.create({
      data: {
        restaurantId, userId: attendant, tableId, orderNumber: ++number, channel: o.channel, status: o.status,
        paymentMethod: o.pay, customerName: o.customer, customerPhone: o.phone, deliveryAddress: o.address, notes: o.notes,
        externalRef: o.externalRef, subtotal, discount, total: Math.round((subtotal - discount) * 100) / 100,
        createdAt: new Date(created),
        prepStartedAt: started ? new Date(startedAt) : null,
        readyAt: ready ? new Date(Math.max(readyAt, startedAt)) : null,
        deliveredAt: o.status === OrderStatus.DELIVERED ? new Date(Math.max(deliveredAt, readyAt, startedAt)) : null,
        isPreorder: !!scheduledFor, scheduledFor,
        // Mesma regra da API: criação + tempo médio (ou o horário combinado da encomenda)
        estimatedReadyAt: scheduledFor ?? new Date(created + def.avgPrepMinutes * MIN),
        items: { create: items },
      },
    });
  }
  for (const tableId of occupied) await prisma.table.update({ where: { id: tableId }, data: { status: TableStatus.OCCUPIED } });
  console.log(`✅ ${def.name}: ${number} pedidos (${def.orders.length} de hoje)`);
}

/** NODE_ENV do terminal ou, se ausente, do api/.env (o mesmo arquivo que dá o DATABASE_URL). */
function nodeEnv(): string | undefined {
  if (process.env.NODE_ENV) return process.env.NODE_ENV;
  try {
    const line = readFileSync(join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/).find((l) => /^\s*NODE_ENV\s*=/.test(l));
    return line?.split('=')[1].trim().replace(/^["']|["']$/g, '');
  } catch {
    return undefined;
  }
}

/**
 * O reset apaga dados. Antes de qualquer escrita: recusa produção, lista o que será
 * apagado em cada estabelecimento de demonstração e só segue com --confirm.
 * Retorna false quando deve abortar.
 */
async function confirmReset(): Promise<boolean> {
  if (nodeEnv() === 'production') {
    console.error('⛔ db:demo-reset recusado: NODE_ENV=production. Este comando só roda em ambiente local/desenvolvimento.');
    return false;
  }
  const slugs = DEMO_TENANTS.map((t) => t.slug);
  if (slugs.some((s) => !DEMO_TENANT_TYPES[s])) throw new Error('DEMO_TENANTS contém slug fora de DEMO_TENANT_TYPES');
  const found = await prisma.restaurant.findMany({
    where: { slug: { in: slugs } },
    select: {
      id: true, slug: true, name: true,
      _count: { select: { orders: true, products: true, categories: true, tables: true } },
      products: { select: { name: true } },
    },
  });

  console.log('\n⚠️  db:demo-reset APAGA pedidos, produtos, categorias e mesas destes estabelecimentos de demonstração');
  console.log('   e os recria com os dados de exemplo. Usuários são mantidos. Nenhum outro restaurante é tocado.\n');
  for (const def of DEMO_TENANTS) {
    const r = found.find((x) => x.slug === def.slug);
    if (!r) {
      console.log(`   • ${def.slug.padEnd(18)} não existe ainda (será criado)`);
      continue;
    }
    const c = r._count;
    console.log(`   • ${def.slug.padEnd(18)} "${r.name}": ${c.orders} pedidos, ${c.products} produtos, ${c.categories} categorias, ${c.tables} mesas`);
    const seeded = new Set(def.products.map((p) => p.name));
    const manual = r.products.map((p) => p.name).filter((n) => !seeded.has(n));
    if (manual.length) console.log(`     ↳ produtos criados manualmente que serão perdidos: ${manual.join(', ')}`);
  }

  if (!CONFIRM) {
    console.log('\n✋ Nada foi alterado. Para confirmar, rode:\n\n   npm run db:demo-reset -- --confirm\n');
    return false;
  }
  console.log('\n✔ Confirmado (--confirm).');
  return true;
}

async function main() {
  if (RESET && !(await confirmReset())) {
    process.exitCode = 1;
    return;
  }
  console.log(RESET ? '🔄 Recriando estabelecimentos de demonstração...' : '🌱 Iniciando seed...');
  const hashes = new Map<string, string>();
  for (const [, , password] of USERS) hashes.set(password, await bcrypt.hash(password, 10));

  for (const def of DEMO_TENANTS) await seedTenant(def, hashes);

  console.log('\n✨ Seed concluído!');
  console.log('\n📋 Estabelecimentos (slug no login):');
  for (const def of DEMO_TENANTS) console.log(`   ${def.slug.padEnd(18)} ${def.name}`);
  console.log('\n   Mesmos usuários em todos:');
  for (const [email, , password, role] of USERS) console.log(`   ${role.padEnd(10)} ${email.padEnd(26)} / ${password}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
