/**
 * Dados demonstrativos para o modo NEXT_PUBLIC_DEMO_MODE=true.
 * Nenhuma chamada de rede é feita — tudo vive em memória no browser.
 */

import type { AuthUser, Category, Product, Table, Order, DashboardData, SalesReport } from '@/types'

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
export const DEMO_PRODUCTS: Product[] = [
  { id: 'p-01', categoryId: 'cat-1', name: 'Bruschetta de Tomate',    description: 'Pão italiano com tomate e manjericão',     price: 24.90, available: true,  category: { id: 'cat-1', name: 'Entradas' } },
  { id: 'p-02', categoryId: 'cat-1', name: 'Bolinho de Bacalhau (8)', description: 'Fritos com maionese de ervas',             price: 32.00, available: true,  category: { id: 'cat-1', name: 'Entradas' } },
  { id: 'p-03', categoryId: 'cat-1', name: 'Tábua de Frios',         description: 'Queijos, frios e antepastos',              price: 48.00, available: true,  category: { id: 'cat-1', name: 'Entradas' } },
  { id: 'p-04', categoryId: 'cat-2', name: 'Filé ao Molho Madeira',  description: 'Filé mignon grelhado com batata e arroz',  price: 58.90, available: true,  category: { id: 'cat-2', name: 'Pratos Principais' } },
  { id: 'p-05', categoryId: 'cat-2', name: 'Frango Grelhado',        description: 'Peito de frango com legumes',              price: 42.90, available: true,  category: { id: 'cat-2', name: 'Pratos Principais' } },
  { id: 'p-06', categoryId: 'cat-2', name: 'Moqueca de Camarão',     description: 'Camarão, leite de coco, dendê e arroz',   price: 74.90, available: true,  category: { id: 'cat-2', name: 'Pratos Principais' } },
  { id: 'p-07', categoryId: 'cat-2', name: 'Risoto de Funghi',       description: 'Arroz arbóreo com cogumelos secos',        price: 52.90, available: false, category: { id: 'cat-2', name: 'Pratos Principais' } },
  { id: 'p-08', categoryId: 'cat-3', name: 'Margherita',             description: 'Molho, mussarela e manjericão',            price: 45.90, available: true,  category: { id: 'cat-3', name: 'Pizzas' } },
  { id: 'p-09', categoryId: 'cat-3', name: 'Calabresa',              description: 'Calabresa fatiada e cebola',              price: 42.90, available: true,  category: { id: 'cat-3', name: 'Pizzas' } },
  { id: 'p-10', categoryId: 'cat-3', name: 'Frango com Catupiry',    description: 'Frango desfiado e catupiry',               price: 48.90, available: true,  category: { id: 'cat-3', name: 'Pizzas' } },
  { id: 'p-11', categoryId: 'cat-3', name: 'Quatro Queijos',         description: 'Mussarela, provolone, gorgonzola, parmesão',price: 52.90, available: true,  category: { id: 'cat-3', name: 'Pizzas' } },
  { id: 'p-12', categoryId: 'cat-4', name: 'Classic Burger',         description: 'Hambúrguer 180g, queijo, alface, tomate', price: 32.90, available: true,  category: { id: 'cat-4', name: 'Lanches' } },
  { id: 'p-13', categoryId: 'cat-4', name: 'Smash Bacon',            description: 'Duplo smash, bacon e cheddar',             price: 39.90, available: true,  category: { id: 'cat-4', name: 'Lanches' } },
  { id: 'p-14', categoryId: 'cat-4', name: 'Veggie Burger',          description: 'Hambúrguer de grão-de-bico e pesto',       price: 34.90, available: true,  category: { id: 'cat-4', name: 'Lanches' } },
  { id: 'p-15', categoryId: 'cat-5', name: 'Coca-Cola Lata',         description: '350ml',                                   price:  6.00, available: true,  category: { id: 'cat-5', name: 'Bebidas' } },
  { id: 'p-16', categoryId: 'cat-5', name: 'Suco de Laranja',        description: '400ml natural',                           price: 12.00, available: true,  category: { id: 'cat-5', name: 'Bebidas' } },
  { id: 'p-17', categoryId: 'cat-5', name: 'Água Mineral',           description: '500ml com ou sem gás',                    price:  5.00, available: true,  category: { id: 'cat-5', name: 'Bebidas' } },
  { id: 'p-18', categoryId: 'cat-5', name: 'Cerveja Artesanal IPA',  description: 'Long neck 355ml',                         price: 18.00, available: true,  category: { id: 'cat-5', name: 'Bebidas' } },
  { id: 'p-19', categoryId: 'cat-5', name: 'Cerveja Pilsen',         description: 'Lata 350ml',                              price:  8.00, available: true,  category: { id: 'cat-5', name: 'Bebidas' } },
  { id: 'p-20', categoryId: 'cat-6', name: 'Petit Gateau',           description: 'Bolo de chocolate quente com sorvete',     price: 22.90, available: true,  category: { id: 'cat-6', name: 'Sobremesas' } },
  { id: 'p-21', categoryId: 'cat-6', name: 'Pudim de Leite',         description: 'Pudim caseiro com calda de caramelo',      price: 14.90, available: true,  category: { id: 'cat-6', name: 'Sobremesas' } },
  { id: 'p-22', categoryId: 'cat-6', name: 'Cheesecake de Morango',  description: 'Base de biscoito e calda de morango',      price: 19.90, available: true,  category: { id: 'cat-6', name: 'Sobremesas' } },
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

// ─── Relatório de vendas demo ──────────────────────────────────────────────────
export function buildDemoSalesReport(orders: Order[]): SalesReport {
  const finished = orders.filter(o => o.status !== 'CANCELLED')
  const totalRevenue = finished.reduce((s, o) => s + Number(o.total), 0)
  const totalOrders  = finished.length
  const avgTicket    = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const byChannel: Record<string, { count: number; revenue: number }> = {}
  const byPayment:  Record<string, { count: number; revenue: number }> = {}
  const productMap:  Record<string, { name: string; qty: number; revenue: number }> = {}

  finished.forEach(o => {
    byChannel[o.channel]       ??= { count: 0, revenue: 0 }
    byChannel[o.channel].count++
    byChannel[o.channel].revenue += Number(o.total)

    byPayment[o.paymentMethod]       ??= { count: 0, revenue: 0 }
    byPayment[o.paymentMethod].count++
    byPayment[o.paymentMethod].revenue += Number(o.total)

    o.items.forEach(item => {
      productMap[item.productId] ??= { name: item.productName, qty: 0, revenue: 0 }
      productMap[item.productId].qty     += item.quantity
      productMap[item.productId].revenue += Number(item.totalPrice)
    })
  })

  const today = new Date().toISOString().split('T')[0]

  return {
    period:   { start: today, end: today },
    summary:  { totalRevenue, totalOrders, avgTicket },
    byChannel,
    byPayment,
    topProducts: Object.entries(productMap)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    byDay: [{ date: today, count: totalOrders, revenue: totalRevenue }],
  }
}
