/**
 * Dados demonstrativos para o modo NEXT_PUBLIC_DEMO_MODE=true.
 * Nenhuma chamada de rede é feita — tudo vive em memória no browser.
 */

import type { AuthUser, BusinessType, Category, Product, Table, Order, DashboardData, SalesReport } from '@/types'
import { SNACK_BAR_DEMO, CONFECTIONERY_DEMO, type DemoBusinessData } from './businesses'
import { getDemoBusinessType } from './businessType'

// ─── Usuário demo ──────────────────────────────────────────────────────────────
export const DEMO_USER: AuthUser = {
  id:             'demo-admin',
  name:           'Administrador Demo',
  email:          'admin@inovasix.com',
  role:           'ADMIN',
  restaurantId:   'demo-restaurant',
  restaurantName: 'Restaurante Demo',
  active:         true,
}

export const DEMO_CREDENTIALS = [
  { email: 'admin@inovasix.com',      password: 'admin123',      role: 'ADMIN'     as const },
  { email: 'gerente@inovasix.com',    password: 'gerente123',    role: 'MANAGER'   as const },
  { email: 'atendente@inovasix.com',  password: 'atendente123',  role: 'ATTENDANT' as const },
  { email: 'cozinha@inovasix.com',    password: 'cozinha123',    role: 'KITCHEN'   as const },
  { email: 'entregador@inovasix.com', password: 'entregador123', role: 'DELIVERY'  as const },
]

// ─── Categorias ────────────────────────────────────────────────────────────────
export const DEMO_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Entradas',         description: 'Petiscos e entradas',     sortOrder: 1, active: true, _count: { products: 3 } },
  { id: 'cat-2', name: 'Pratos Principais',description: 'Pratos quentes e frios',  sortOrder: 2, active: true, _count: { products: 4 } },
  { id: 'cat-3', name: 'Pizzas',           description: 'Pizzas artesanais',        sortOrder: 3, active: true, _count: { products: 4 } },
  { id: 'cat-4', name: 'Lanches',          description: 'Hambúrgueres e sanduíches',sortOrder: 4, active: true, _count: { products: 3 } },
  { id: 'cat-5', name: 'Bebidas',          description: 'Sucos, refrigerantes...',  sortOrder: 5, active: true, _count: { products: 5 } },
  { id: 'cat-6', name: 'Sobremesas',       description: 'Doces e sobremesas',       sortOrder: 6, active: true, _count: { products: 3 } },
]

// ─── Produtos ─────────────────────────────────────────────────────────────────
// imageUrl: caminho relativo a /public — asset() adiciona o basePath em runtime
export const DEMO_PRODUCTS: Product[] = [
  { id: 'p-01', categoryId: 'cat-1', name: 'Bruschetta de Tomate',    description: 'Pão italiano com tomate e manjericão',       price: 24.90, available: true,  imageUrl: '/demo/products/images/bruschetta.jpg',        category: { id: 'cat-1', name: 'Entradas' } },
  { id: 'p-02', categoryId: 'cat-1', name: 'Bolinho de Bacalhau (8)', description: 'Fritos com maionese de ervas',               price: 32.00, available: true,  imageUrl: '/demo/products/images/bolinho-bacalhau.jpg',   videoUrl: '/demo/products/videos/bolinho-bacalhau.mp4', category: { id: 'cat-1', name: 'Entradas' } },
  { id: 'p-03', categoryId: 'cat-1', name: 'Tábua de Frios',         description: 'Queijos, frios e antepastos',                price: 48.00, available: true,  imageUrl: '/demo/products/images/tabua-de-frios.jpg',     category: { id: 'cat-1', name: 'Entradas' } },
  { id: 'p-04', categoryId: 'cat-2', name: 'Filé ao Molho Madeira',  description: 'Filé mignon grelhado com batata e arroz',    price: 58.90, available: true,  imageUrl: '/demo/products/images/file-madeira.jpg',       category: { id: 'cat-2', name: 'Pratos Principais' } },
  { id: 'p-05', categoryId: 'cat-2', name: 'Frango Grelhado',        description: 'Peito de frango com legumes',                price: 42.90, available: true,  imageUrl: '/demo/products/images/frango-grelhado.jpg',    category: { id: 'cat-2', name: 'Pratos Principais' } },
  { id: 'p-06', categoryId: 'cat-2', name: 'Moqueca de Camarão',     description: 'Camarão, leite de coco, dendê e arroz',     price: 74.90, available: true,  imageUrl: '/demo/products/images/moqueca-camarao.jpg',    category: { id: 'cat-2', name: 'Pratos Principais' } },
  { id: 'p-07', categoryId: 'cat-2', name: 'Risoto de Funghi',       description: 'Arroz arbóreo com cogumelos secos',          price: 52.90, available: false, imageUrl: '/demo/products/images/risoto-funghi.jpg',      category: { id: 'cat-2', name: 'Pratos Principais' } },
  { id: 'p-08', categoryId: 'cat-3', name: 'Margherita',             description: 'Molho, mussarela e manjericão',              price: 45.90, available: true,  imageUrl: '/demo/products/images/pizza-margherita.jpg',   category: { id: 'cat-3', name: 'Pizzas' } },
  { id: 'p-09', categoryId: 'cat-3', name: 'Calabresa',              description: 'Calabresa fatiada e cebola',                price: 42.90, available: true,  imageUrl: '/demo/products/images/pizza-calabresa.jpg',    category: { id: 'cat-3', name: 'Pizzas' } },
  { id: 'p-10', categoryId: 'cat-3', name: 'Frango com Catupiry',    description: 'Frango desfiado e catupiry',                 price: 48.90, available: true,  imageUrl: '/demo/products/images/pizza-frango.jpg',       category: { id: 'cat-3', name: 'Pizzas' } },
  { id: 'p-11', categoryId: 'cat-3', name: 'Quatro Queijos',         description: 'Mussarela, provolone, gorgonzola, parmesão', price: 52.90, available: true,  imageUrl: '/demo/products/images/pizza-4queijos.jpg',     category: { id: 'cat-3', name: 'Pizzas' } },
  { id: 'p-12', categoryId: 'cat-4', name: 'Classic Burger',         description: 'Hambúrguer 180g, queijo, alface, tomate',   price: 32.90, available: true,  imageUrl: '/demo/products/images/classic-burger.jpg',     category: { id: 'cat-4', name: 'Lanches' } },
  { id: 'p-13', categoryId: 'cat-4', name: 'Smash Bacon',            description: 'Duplo smash, bacon e cheddar',               price: 39.90, available: true,  imageUrl: '/demo/products/images/smash-bacon.jpg',        category: { id: 'cat-4', name: 'Lanches' } },
  { id: 'p-14', categoryId: 'cat-4', name: 'Veggie Burger',          description: 'Hambúrguer de grão-de-bico e pesto',         price: 34.90, available: true,  imageUrl: '/demo/products/images/veggie-burger.jpg',      category: { id: 'cat-4', name: 'Lanches' } },
  { id: 'p-15', categoryId: 'cat-5', name: 'Coca-Cola Lata',         description: '350ml',                                     price:  6.00, available: true,  imageUrl: '/demo/products/images/coca-cola.jpg',          category: { id: 'cat-5', name: 'Bebidas' } },
  { id: 'p-16', categoryId: 'cat-5', name: 'Suco de Laranja',        description: '400ml natural',                             price: 12.00, available: true,  imageUrl: '/demo/products/images/suco-laranja.jpg',       category: { id: 'cat-5', name: 'Bebidas' } },
  { id: 'p-17', categoryId: 'cat-5', name: 'Água Mineral',           description: '500ml com ou sem gás',                      price:  5.00, available: true,  imageUrl: '/demo/products/images/agua-mineral.jpg',       category: { id: 'cat-5', name: 'Bebidas' } },
  { id: 'p-18', categoryId: 'cat-5', name: 'Cerveja Artesanal IPA',  description: 'Long neck 355ml',                           price: 18.00, available: true,  imageUrl: '/demo/products/images/cerveja-ipa.jpg',        category: { id: 'cat-5', name: 'Bebidas' } },
  { id: 'p-19', categoryId: 'cat-5', name: 'Cerveja Pilsen',         description: 'Lata 350ml',                                price:  8.00, available: true,  imageUrl: '/demo/products/images/cerveja-pilsen.jpg',     category: { id: 'cat-5', name: 'Bebidas' } },
  { id: 'p-20', categoryId: 'cat-6', name: 'Petit Gateau',           description: 'Bolo de chocolate quente com sorvete',       price: 22.90, available: true,  imageUrl: '/demo/products/images/petit-gateau.jpg',       category: { id: 'cat-6', name: 'Sobremesas' } },
  { id: 'p-21', categoryId: 'cat-6', name: 'Pudim de Leite',         description: 'Pudim caseiro com calda de caramelo',        price: 14.90, available: true,  imageUrl: '/demo/products/images/pudim-de-leite.jpg',     category: { id: 'cat-6', name: 'Sobremesas' } },
  { id: 'p-22', categoryId: 'cat-6', name: 'Cheesecake de Morango',  description: 'Base de biscoito e calda de morango',        price: 19.90, available: true,  imageUrl: '/demo/products/images/cheesecake.jpg',         category: { id: 'cat-6', name: 'Sobremesas' } },
]

// ─── Mesas ─────────────────────────────────────────────────────────────────────
export const DEMO_TABLES: Table[] = [
  { id: 't-01', number: '01', capacity: 4, status: 'OCCUPIED',  orders: [{ id: 'o-1', orderNumber: 1, status: 'PREPARING', total: 110.80 }] },
  { id: 't-02', number: '02', capacity: 4, status: 'AVAILABLE', orders: [] },
  { id: 't-03', number: '03', capacity: 4, status: 'AVAILABLE', orders: [] },
  { id: 't-04', number: '04', capacity: 6, status: 'RESERVED',  orders: [] },
  { id: 't-05', number: '05', capacity: 4, status: 'AVAILABLE', orders: [] },
  { id: 't-06', number: '06', capacity: 4, status: 'OCCUPIED',  orders: [{ id: 'o-3', orderNumber: 3, status: 'READY', total: 72.80 }] },
  { id: 't-07', number: '07', capacity: 2, status: 'AVAILABLE', orders: [] },
  { id: 't-08', number: '08', capacity: 8, status: 'AVAILABLE', orders: [] },
  { id: 't-09', number: 'Balcão',  capacity: 8, status: 'OCCUPIED', orders: [{ id: 'o-3', orderNumber: 3, status: 'READY', total: 72.80 }] },
  { id: 't-10', number: 'Varanda', capacity: 6, status: 'AVAILABLE', orders: [] },
]

const now = new Date()
const ago = (min: number) => new Date(now.getTime() - min * 60000).toISOString()

// ─── Pedidos ───────────────────────────────────────────────────────────────────
export const DEMO_ORDERS: Order[] = [
  {
    id: 'o-1', orderNumber: 1, channel: 'DINE_IN', status: 'PREPARING',
    paymentMethod: 'CARD', customerName: 'Mesa 01',
    subtotal: 110.80, discount: 0, total: 110.80,
    tableId: 't-01', table: { id: 't-01', number: '01' },
    user: { id: 'demo-admin', name: 'Administrador Demo' },
    createdAt: ago(18), updatedAt: ago(12), prepStartedAt: ago(12),
    readyAt: null, deliveredAt: null, cancelledAt: null,
    items: [
      { id: 'oi-1a', productId: 'p-04', productName: 'Filé ao Molho Madeira', quantity: 1, unitPrice: 58.90, totalPrice: 58.90 },
      { id: 'oi-1b', productId: 'p-15', productName: 'Coca-Cola Lata',        quantity: 2, unitPrice:  6.00, totalPrice: 12.00 },
      { id: 'oi-1c', productId: 'p-01', productName: 'Bruschetta de Tomate',  quantity: 1, unitPrice: 24.90, totalPrice: 24.90 },
      { id: 'oi-1d', productId: 'p-21', productName: 'Pudim de Leite',        quantity: 1, unitPrice: 14.90, totalPrice: 14.90 },
    ],
  },
  {
    id: 'o-2', orderNumber: 2, channel: 'DELIVERY', status: 'RECEIVED',
    paymentMethod: 'PIX', customerName: 'Maria Silva',
    customerPhone: '(11) 98765-4321', deliveryAddress: 'Av. Paulista, 1000 - Apto 52',
    subtotal: 87.80, discount: 5.00, total: 82.80,
    user: { id: 'demo-admin', name: 'Administrador Demo' },
    createdAt: ago(5), updatedAt: ago(5),
    prepStartedAt: null, readyAt: null, deliveredAt: null, cancelledAt: null,
    items: [
      { id: 'oi-2a', productId: 'p-08', productName: 'Margherita',          quantity: 1, unitPrice: 45.90, totalPrice: 45.90 },
      { id: 'oi-2b', productId: 'p-15', productName: 'Coca-Cola Lata',      quantity: 2, unitPrice:  6.00, totalPrice: 12.00 },
      { id: 'oi-2c', productId: 'p-20', productName: 'Petit Gateau',        quantity: 1, unitPrice: 22.90, totalPrice: 22.90 },
      { id: 'oi-2d', productId: 'p-16', productName: 'Suco de Laranja',     quantity: 1, unitPrice: 12.00, totalPrice: 12.00 },
    ],
  },
  {
    id: 'o-3', orderNumber: 3, channel: 'COUNTER', status: 'READY',
    paymentMethod: 'CASH', customerName: 'João Paulo',
    subtotal: 72.80, discount: 0, total: 72.80,
    user: { id: 'demo-admin', name: 'Administrador Demo' },
    createdAt: ago(28), updatedAt: ago(3), prepStartedAt: ago(25), readyAt: ago(3),
    deliveredAt: null, cancelledAt: null,
    items: [
      { id: 'oi-3a', productId: 'p-13', productName: 'Smash Bacon',            quantity: 1, unitPrice: 39.90, totalPrice: 39.90 },
      { id: 'oi-3b', productId: 'p-18', productName: 'Cerveja Artesanal IPA',  quantity: 2, unitPrice: 18.00, totalPrice: 36.00 },
    ],
  },
  {
    id: 'o-4', orderNumber: 4, channel: 'TAKEOUT', status: 'DELIVERED',
    paymentMethod: 'PIX', customerName: 'Fernanda Costa',
    customerPhone: '(11) 91234-5678',
    subtotal: 94.80, discount: 0, total: 94.80,
    user: { id: 'demo-admin', name: 'Administrador Demo' },
    createdAt: ago(75), updatedAt: ago(35), prepStartedAt: ago(70), readyAt: ago(45), deliveredAt: ago(35),
    cancelledAt: null,
    items: [
      { id: 'oi-4a', productId: 'p-06', productName: 'Moqueca de Camarão',  quantity: 1, unitPrice: 74.90, totalPrice: 74.90 },
      { id: 'oi-4b', productId: 'p-17', productName: 'Água Mineral',        quantity: 2, unitPrice:  5.00, totalPrice: 10.00 },
      { id: 'oi-4c', productId: 'p-22', productName: 'Cheesecake de Morango',quantity: 0, unitPrice: 19.90, totalPrice:  0.00 },
    ],
  },
  {
    id: 'o-5', orderNumber: 5, channel: 'DELIVERY', status: 'OUT_FOR_DELIVERY',
    paymentMethod: 'CARD', customerName: 'Roberto Alves',
    customerPhone: '(11) 97654-3210', deliveryAddress: 'Rua Augusta, 500 - Apto 12',
    subtotal: 130.80, discount: 10.00, total: 120.80,
    user: { id: 'demo-admin', name: 'Administrador Demo' },
    createdAt: ago(50), updatedAt: ago(20), prepStartedAt: ago(45), readyAt: ago(20),
    deliveredAt: null, cancelledAt: null,
    items: [
      { id: 'oi-5a', productId: 'p-11', productName: 'Quatro Queijos',   quantity: 1, unitPrice: 52.90, totalPrice:  52.90 },
      { id: 'oi-5b', productId: 'p-09', productName: 'Calabresa',        quantity: 1, unitPrice: 42.90, totalPrice:  42.90 },
      { id: 'oi-5c', productId: 'p-19', productName: 'Cerveja Pilsen',   quantity: 4, unitPrice:  8.00, totalPrice:  32.00 },
    ],
  },
  {
    id: 'o-6', orderNumber: 6, channel: 'COUNTER', status: 'RECEIVED',
    paymentMethod: 'PIX', customerName: 'Teste E2E',
    subtotal: 64.00, discount: 0, total: 64.00,
    user: { id: 'demo-admin', name: 'Administrador Demo' },
    createdAt: ago(2), updatedAt: ago(2),
    prepStartedAt: null, readyAt: null, deliveredAt: null, cancelledAt: null,
    items: [
      { id: 'oi-6a', productId: 'p-02', productName: 'Bolinho de Bacalhau (8)', quantity: 2, unitPrice: 32.00, totalPrice: 64.00 },
    ],
  },
]

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export function buildDemoDashboard(orders: Order[]): DashboardData {
  const active = orders.filter(o => !['DELIVERED','CANCELLED'].includes(o.status))
  const inPrep = active.filter(o => o.status === 'PREPARING').length
  const revenue = orders
    .filter(o => ['DELIVERED','READY','OUT_FOR_DELIVERY'].includes(o.status))
    .reduce((s, o) => s + Number(o.total), 0)

  const completed = orders.filter(o =>
    o.status === 'DELIVERED' && o.prepStartedAt && o.readyAt,
  )
  const avgPrepTime = completed.length > 0
    ? Math.round(
        completed.reduce((s, o) =>
          s + (new Date(o.readyAt!).getTime() - new Date(o.createdAt).getTime()), 0
        ) / completed.length / 60000,
      )
    : 18

  return {
    ordersToday:   orders.filter(o => o.status !== 'CANCELLED').length,
    inPreparation: inPrep,
    revenueToday:  revenue,
    avgPrepTime,
    recentOrders:  [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ).slice(0, 8),
  }
}

// ─── Histórico demo (dias anteriores) ──────────────────────────────────────────
// Pedidos gerados de forma determinística (semente = data), para que os
// relatórios tenham dados em qualquer período dos últimos meses e sejam
// sempre os mesmos a cada recarga.
const HISTORY_DAYS = 120

/** Data local no formato YYYY-MM-DD (sem conversão para UTC). */
export function toLocalYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function seededRandom(seed: string) {
  let a = 2166136261
  for (let i = 0; i < seed.length; i++) a = Math.imul(a ^ seed.charCodeAt(i), 16777619)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickWeighted<T>(rnd: () => number, entries: Array<[T, number]>): T {
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = rnd() * total
  for (const [v, w] of entries) {
    if ((r -= w) < 0) return v
  }
  return entries[entries.length - 1][0]
}

const CUSTOMER_NAMES = [
  'Ana Souza', 'Bruno Lima', 'Carla Mendes', 'Diego Rocha', 'Elaine Castro', 'Felipe Nunes',
  'Gabriela Reis', 'Henrique Dias', 'Isabela Pinto', 'Lucas Martins', 'Mariana Lopes', 'Rafael Gomes',
]

// ─── Conjuntos de dados por tipo de negócio ────────────────────────────────────
export const RESTAURANT_DEMO: DemoBusinessData = {
  restaurantName: 'Restaurante Demo',
  categories: DEMO_CATEGORIES,
  products: DEMO_PRODUCTS,
  tables: DEMO_TABLES,
  orders: DEMO_ORDERS,
  history: {
    seedPrefix: '',
    channels: [['DINE_IN', 40], ['DELIVERY', 30], ['COUNTER', 15], ['TAKEOUT', 15]],
    baseOrders: 14, variation: 9,
    drinkCategoryIds: ['cat-5'],
  },
}

const DEMO_DATASETS: Record<BusinessType, DemoBusinessData> = {
  RESTAURANT:    RESTAURANT_DEMO,
  SNACK_BAR:     SNACK_BAR_DEMO,
  CONFECTIONERY: CONFECTIONERY_DEMO,
}

export function getDemoDataset(type: BusinessType = getDemoBusinessType()): DemoBusinessData {
  return DEMO_DATASETS[type] ?? RESTAURANT_DEMO
}

const historyCache = new Map<BusinessType, Order[]>()

/** Histórico dos dias anteriores do tipo de negócio (padrão: o escolhido na demo). */
export function getDemoHistoryOrders(type: BusinessType = getDemoBusinessType()): Order[] {
  const cached = historyCache.get(type)
  if (cached) return cached

  const data = getDemoDataset(type)
  const cfg  = data.history
  const [[lunchStart, lunchLen], [dinnerStart, dinnerLen]] = cfg.hours ?? [[11, 3], [18, 5]]
  const out: Order[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const available  = data.products.filter(p => p.available)
  const drinks     = available.filter(p => cfg.drinkCategoryIds.includes(p.categoryId))
  const dishes     = available.filter(p => !cfg.drinkCategoryIds.includes(p.categoryId))
  const dineTables = data.tables.filter(t => /^\d+$/.test(t.number))

  for (let back = HISTORY_DAYS; back >= 1; back--) {
    const day = new Date(today)
    day.setDate(day.getDate() - back)
    const key = toLocalYMD(day)
    const rnd = seededRandom(cfg.seedPrefix ? `${cfg.seedPrefix}-${key}` : key)

    const dow     = day.getDay()
    const weekend = dow === 5 || dow === 6 ? 1.4 : dow === 0 ? 1.25 : 1
    const trend   = 1 + ((HISTORY_DAYS - back) / HISTORY_DAYS) * 0.2
    const count   = Math.round((cfg.baseOrders + rnd() * cfg.variation) * weekend * trend)

    for (let i = 0; i < count; i++) {
      let channel = pickWeighted<Order['channel']>(rnd, cfg.channels)
      const payment = pickWeighted<Order['paymentMethod']>(rnd, [['PIX', 46], ['CARD', 40], ['CASH', 14]])

      const chosen = new Map<string, number>()
      const nDishes = 1 + Math.floor(rnd() * 2.4)
      for (let k = 0; k < nDishes; k++) {
        let p = dishes[Math.floor(rnd() * dishes.length)]
        // Encomendas (kits, bolos de festa) são menos frequentes que a vitrine
        for (let tries = 0; p.madeToOrder && tries < 3 && rnd() > 0.2; tries++) {
          p = dishes[Math.floor(rnd() * dishes.length)]
        }
        chosen.set(p.id, (chosen.get(p.id) ?? 0) + 1)
      }
      if (rnd() < 0.75) {
        const d = drinks[Math.floor(rnd() * drinks.length)]
        chosen.set(d.id, (chosen.get(d.id) ?? 0) + 1 + Math.floor(rnd() * 2))
      }

      let leadHours = 0
      const items = Array.from(chosen.entries()).map(([pid, qty], idx) => {
        const p = data.products.find(x => x.id === pid)!
        // Quilo e cento têm quantidades próprias (o Restaurante só vende por unidade)
        if (p.saleUnit === 'KG') qty = [1, 1.5, 2, 2.5, 3][Math.floor(rnd() * 5)]
        else if (p.saleUnit === 'HUNDRED') qty = 1 + Math.floor(rnd() * 2)
        if (p.madeToOrder) leadHours = Math.max(leadHours, p.minLeadTimeHours ?? 24, 24)
        return {
          id: `h-${key}-${i}-${idx}`, productId: p.id, productName: p.name,
          quantity: qty, unit: p.saleUnit, unitPrice: p.price, totalPrice: Math.round(p.price * qty * 100) / 100,
        }
      })
      const subtotal = Math.round(items.reduce((s, it) => s + it.totalPrice, 0) * 100) / 100
      const discount = rnd() < 0.08 ? 5 : 0

      // Horário concentrado em dois picos do dia (almoço/jantar ou manhã/tarde)
      const created = new Date(day)
      const hour = rnd() < 0.45 ? lunchStart + rnd() * lunchLen : dinnerStart + rnd() * dinnerLen
      created.setMinutes(Math.floor(hour * 60))
      const done = new Date(created.getTime() + (25 + rnd() * 30) * 60000)
      const cancelled = rnd() < 0.04
      if (channel === 'DINE_IN' && dineTables.length === 0) channel = 'COUNTER'
      const table = channel === 'DINE_IN' ? dineTables[Math.floor(rnd() * dineTables.length)] : null
      const scheduledFor = leadHours ? new Date(created.getTime() + leadHours * 3_600_000).toISOString() : null

      out.push({
        id: `h-${key}-${i}`, orderNumber: i + 1, channel,
        status: cancelled ? 'CANCELLED' : 'DELIVERED',
        paymentMethod: payment,
        customerName: table ? `Mesa ${table.number}` : CUSTOMER_NAMES[Math.floor(rnd() * CUSTOMER_NAMES.length)],
        subtotal, discount, total: Math.round((subtotal - discount) * 100) / 100,
        tableId: table?.id, table: table ? { id: table.id, number: table.number } : null,
        user: { id: 'demo-admin', name: 'Administrador Demo' },
        items,
        createdAt: created.toISOString(), updatedAt: done.toISOString(),
        prepStartedAt: cancelled ? null : created.toISOString(),
        readyAt:       cancelled ? null : done.toISOString(),
        deliveredAt:   cancelled ? null : done.toISOString(),
        cancelledAt:   cancelled ? done.toISOString() : null,
        ...(scheduledFor ? { isPreorder: true, scheduledFor } : {}),
      })
    }
  }

  historyCache.set(type, out)
  return out
}


// ─── Relatório de vendas demo ──────────────────────────────────────────────────
/**
 * Monta o relatório no mesmo formato da API, considerando apenas os pedidos
 * criados entre startDate e endDate (datas locais, inclusivas).
 * byDay inclui todos os dias do período, com zero nos dias sem vendas.
 */
export function buildDemoSalesReport(orders: Order[], startDate?: string, endDate?: string): SalesReport {
  const today = toLocalYMD(new Date())
  const start = startDate || today
  const end   = endDate   || today

  const finished = orders.filter(o => {
    if (o.status === 'CANCELLED') return false
    const day = toLocalYMD(new Date(o.createdAt))
    return day >= start && day <= end
  })
  const totalRevenue = finished.reduce((s, o) => s + Number(o.total), 0)
  const totalOrders  = finished.length
  const avgTicket    = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const byChannel: Record<string, { count: number; revenue: number }> = {}
  const byPayment:  Record<string, { count: number; revenue: number }> = {}
  const productMap:  Record<string, { name: string; qty: number; revenue: number }> = {}
  const dayMap:      Record<string, { count: number; revenue: number }> = {}

  // Todos os dias do período, inclusive os sem vendas
  const cursor = new Date(`${start}T00:00:00`)
  const last   = new Date(`${end}T00:00:00`)
  while (cursor <= last) {
    dayMap[toLocalYMD(cursor)] = { count: 0, revenue: 0 }
    cursor.setDate(cursor.getDate() + 1)
  }

  finished.forEach(o => {
    byChannel[o.channel]       ??= { count: 0, revenue: 0 }
    byChannel[o.channel].count++
    byChannel[o.channel].revenue += Number(o.total)

    byPayment[o.paymentMethod]       ??= { count: 0, revenue: 0 }
    byPayment[o.paymentMethod].count++
    byPayment[o.paymentMethod].revenue += Number(o.total)

    const day = toLocalYMD(new Date(o.createdAt))
    dayMap[day] ??= { count: 0, revenue: 0 }
    dayMap[day].count++
    dayMap[day].revenue += Number(o.total)

    o.items.forEach(item => {
      if (item.quantity <= 0) return
      productMap[item.productId] ??= { name: item.productName, qty: 0, revenue: 0 }
      productMap[item.productId].qty     += item.quantity
      productMap[item.productId].revenue += Number(item.totalPrice)
    })
  })

  return {
    period:   { start, end },
    summary:  { totalRevenue, totalOrders, avgTicket },
    byChannel,
    byPayment,
    topProducts: Object.entries(productMap)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    byDay: Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v })),
  }
}
