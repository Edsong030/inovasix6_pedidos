/**
 * Dados demo de Lanchonete, Confeitaria e Japonês (o Restaurante continua em data.ts).
 * Tudo fictício e local: sem banco, sem rede, sem credenciais.
 */
import type { Category, Product, Table, Order, OrderChannel, OrderStatus, PaymentMethod, ProductAddon } from '@/types'

const IMG = '/demo/products/images'

function cat(id: string, name: string, description: string, sortOrder: number, count: number): Category {
  return { id, name, description, sortOrder, active: true, _count: { products: count } }
}

// ─── Pedidos de hoje: montados a partir do catálogo ───────────────────────────
type ItemSpec = [productId: string, quantity: number, opts?: { notes?: string; addonIds?: string[] }]

interface OrderSpec {
  id: string
  n: number
  channel: OrderChannel
  status: OrderStatus
  pay: PaymentMethod
  customer: string
  minutesAgo: number
  items: ItemSpec[]
  phone?: string
  address?: string
  notes?: string
  discount?: number
  table?: Table
  /** Encomenda: horas a partir de agora para retirada/entrega */
  scheduledInHours?: number
  externalRef?: string
}

function buildOrders(products: Product[], specs: OrderSpec[]): Order[] {
  const now = Date.now()
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString()
  return specs.map(s => {
    const items = s.items.map(([pid, qty, opts], i) => {
      const p = products.find(x => x.id === pid)!
      const addons: ProductAddon[] = (opts?.addonIds ?? []).map(aid => p.addons!.find(a => a.id === aid)!)
      const unitPrice = p.price + addons.reduce((sum, a) => sum + a.price, 0)
      return {
        id: `${s.id}-${i}`, productId: p.id, productName: p.name,
        quantity: qty, unit: p.saleUnit ?? 'UNIT', unitPrice,
        totalPrice: Math.round(unitPrice * qty * 100) / 100,
        notes: opts?.notes, addons: addons.length ? addons : undefined,
      }
    })
    const subtotal = Math.round(items.reduce((sum, it) => sum + it.totalPrice, 0) * 100) / 100
    const discount = s.discount ?? 0
    const createdMs = s.minutesAgo * 60000
    const started   = s.status !== 'RECEIVED' && s.status !== 'CANCELLED'
    const ready     = ['READY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(s.status)
    return {
      id: s.id, orderNumber: s.n, channel: s.channel, status: s.status, paymentMethod: s.pay,
      customerName: s.customer, customerPhone: s.phone, deliveryAddress: s.address, notes: s.notes,
      subtotal, discount, total: Math.round((subtotal - discount) * 100) / 100,
      tableId: s.table?.id, table: s.table ? { id: s.table.id, number: s.table.number } : null,
      user: { id: 'demo-admin', name: 'Administrador Demo' },
      items,
      createdAt: iso(createdMs),
      updatedAt: iso(Math.min(createdMs, 2 * 60000)),
      prepStartedAt: started ? iso(createdMs - 2 * 60000) : null,
      readyAt:       ready ? iso(Math.max(60000, createdMs - 15 * 60000)) : null,
      deliveredAt:   s.status === 'DELIVERED' ? iso(Math.max(30000, createdMs - 25 * 60000)) : null,
      cancelledAt:   null,
      isPreorder:    s.scheduledInHours !== undefined,
      scheduledFor:  s.scheduledInHours !== undefined ? new Date(now + s.scheduledInHours * 3_600_000).toISOString() : null,
      externalRef:   s.externalRef ?? null,
    }
  })
}

// ═══ LANCHONETE ═══════════════════════════════════════════════════════════════

const BURGER_ADDONS: ProductAddon[] = [
  { id: 'bacon',       name: 'Bacon extra',   price: 5 },
  { id: 'queijo',      name: 'Queijo extra',  price: 3.5 },
  { id: 'ovo',         name: 'Ovo',           price: 2.5 },
  { id: 'molho',       name: 'Molho extra',   price: 2 },
]
const BURGER_OBS = ['Sem cebola', 'Sem tomate', 'Sem maionese', 'Ponto: mal passado', 'Ponto: ao ponto', 'Ponto: bem passado']
const HOTDOG_ADDONS: ProductAddon[] = [
  { id: 'salsicha', name: 'Salsicha extra', price: 4 },
  { id: 'cheddar',  name: 'Cheddar',        price: 3 },
  { id: 'molho',    name: 'Molho extra',    price: 2 },
]
const ACAI_ADDONS: ProductAddon[] = [
  { id: 'granola',  name: 'Granola',          price: 2 },
  { id: 'leite-cd', name: 'Leite condensado', price: 2.5 },
  { id: 'morango',  name: 'Morango',          price: 3 },
  { id: 'banana',   name: 'Banana',           price: 2 },
  { id: 'pacoca',   name: 'Paçoca',           price: 2.5 },
  { id: 'nutella',  name: 'Creme de avelã',   price: 5 },
]

const SB_CATEGORIES: Category[] = [
  cat('sb-cat-1', 'Hambúrgueres', 'Artesanais e smash',        1, 4),
  cat('sb-cat-2', 'Hot dogs',     'Dogs prensados',            2, 2),
  cat('sb-cat-3', 'Porções',      'Para compartilhar',         3, 2),
  cat('sb-cat-4', 'Combos',       'Lanche + batata + bebida',  4, 2),
  cat('sb-cat-5', 'Açaí',         'Monte do seu jeito',        5, 2),
  cat('sb-cat-6', 'Bebidas',      'Refrigerantes e sucos',     6, 4),
  cat('sb-cat-7', 'Sobremesas',   'Doces e milkshakes',        7, 2),
]

function sbProduct(id: string, categoryId: string, name: string, description: string, price: number, extra: Partial<Product> = {}): Product {
  const c = SB_CATEGORIES.find(x => x.id === categoryId)!
  return { id, categoryId, name, description, price, available: true, saleUnit: 'UNIT', observationOptions: [], category: { id: c.id, name: c.name }, ...extra }
}

const SB_PRODUCTS: Product[] = [
  sbProduct('sb-p-01', 'sb-cat-1', 'X-Burger',        'Pão brioche, burger 150g e queijo',          24.9, { imageUrl: `${IMG}/classic-burger.jpg`, addons: BURGER_ADDONS, observationOptions: BURGER_OBS }),
  sbProduct('sb-p-02', 'sb-cat-1', 'X-Salada',        'Burger 150g, queijo, alface e tomate',       26.9, { imageUrl: `${IMG}/x-salada.webp`, addons: BURGER_ADDONS, observationOptions: BURGER_OBS }),
  sbProduct('sb-p-03', 'sb-cat-1', 'Smash Bacon',     'Dois smash 90g, cheddar e bacon',            32.9, { imageUrl: `${IMG}/smash-bacon.jpg`, addons: BURGER_ADDONS, observationOptions: BURGER_OBS }),
  sbProduct('sb-p-04', 'sb-cat-1', 'Veggie Burger',   'Burger de grão-de-bico e pesto',             29.9, { imageUrl: `${IMG}/veggie-burger.jpg`, addons: BURGER_ADDONS.filter(a => a.id !== 'bacon'), observationOptions: ['Sem cebola', 'Sem tomate'] }),
  sbProduct('sb-p-05', 'sb-cat-2', 'Hot Dog Completo','Salsicha dupla, purê, milho e batata palha', 18.9, { imageUrl: `${IMG}/hot-dog-completo.webp`, addons: HOTDOG_ADDONS, observationOptions: ['Sem purê', 'Sem milho', 'Sem batata palha', 'Molho à parte'] }),
  sbProduct('sb-p-06', 'sb-cat-2', 'Hot Dog Simples', 'Salsicha, molho e batata palha',             12.9, { imageUrl: `${IMG}/hot-dog-simples.webp`, addons: HOTDOG_ADDONS, observationOptions: ['Sem batata palha', 'Molho à parte'] }),
  sbProduct('sb-p-07', 'sb-cat-3', 'Batata Frita',    'Porção 400g, crocante',                      22.9, { imageUrl: `${IMG}/batata-frita.webp`, addons: [{ id: 'cheddar-bacon', name: 'Cheddar e bacon', price: 8 }], observationOptions: ['Sal à parte', 'Bem sequinha'] }),
  sbProduct('sb-p-08', 'sb-cat-3', 'Onion Rings',     'Anéis de cebola empanados',                  24.9, { imageUrl: `${IMG}/onion-rings.webp`, observationOptions: ['Molho à parte'] }),
  sbProduct('sb-p-09', 'sb-cat-4', 'Combo Família',   '4 X-Burger, batata grande e refri 2 L',      89.9, { imageUrl: `${IMG}/combo-familia.webp`, observationOptions: ['Trocar refri por suco', 'Sem cebola'] }),
  sbProduct('sb-p-10', 'sb-cat-4', 'Combo Smash',     'Smash Bacon, batata e refri lata',           44.9, { imageUrl: `${IMG}/combo-smash.webp`, addons: BURGER_ADDONS, observationOptions: BURGER_OBS }),
  sbProduct('sb-p-11', 'sb-cat-5', 'Açaí 500 ml',     'Açaí puro batido na hora',                   22,   { imageUrl: `${IMG}/acai-500.webp`, addons: ACAI_ADDONS, observationOptions: ['Adicionais à parte', 'Pouco açúcar'] }),
  sbProduct('sb-p-12', 'sb-cat-5', 'Açaí 300 ml',     'Açaí puro batido na hora',                   16,   { imageUrl: `${IMG}/acai-300.webp`, addons: ACAI_ADDONS, observationOptions: ['Adicionais à parte'] }),
  sbProduct('sb-p-13', 'sb-cat-6', 'Refrigerante cola', 'Lata 350 ml, servido no copo com gelo',    6,    { imageUrl: `${IMG}/refrigerante-cola.webp`, observationOptions: ['Com gelo e limão'] }),
  sbProduct('sb-p-14', 'sb-cat-6', 'Refrigerante guaraná', 'Lata 350 ml, servido no copo com gelo', 5.5, { imageUrl: `${IMG}/refrigerante-guarana.webp` }),
  sbProduct('sb-p-15', 'sb-cat-6', 'Suco de Laranja', '400 ml natural',                             10,   { imageUrl: `${IMG}/suco-laranja.jpg`, observationOptions: ['Sem açúcar', 'Sem gelo'] }),
  sbProduct('sb-p-16', 'sb-cat-6', 'Água Mineral',    '500 ml com ou sem gás',                      4,    { imageUrl: `${IMG}/agua-mineral.jpg` }),
  sbProduct('sb-p-17', 'sb-cat-7', 'Brownie com Sorvete', 'Brownie quente e sorvete de creme',      16.9, { imageUrl: `${IMG}/brownie-sorvete.webp` }),
  sbProduct('sb-p-18', 'sb-cat-7', 'Milkshake',       'Chocolate, morango ou baunilha — 400 ml',    17.9, { imageUrl: `${IMG}/milkshake.webp`, observationOptions: ['Chocolate', 'Morango', 'Baunilha'] }),
]

const SB_TABLES: Table[] = ['01', '02', '03', '04', '05'].map((number, i) => ({
  id: `sb-t-${i + 1}`, number, capacity: 4, status: 'AVAILABLE' as const, orders: [],
}))

const SB_ORDERS: Order[] = buildOrders(SB_PRODUCTS, [
  { id: 'sb-o-1', n: 1, channel: 'COUNTER',  status: 'PREPARING', pay: 'CARD', customer: 'Lucas Martins', minutesAgo: 14,
    items: [['sb-p-01', 2, { notes: 'Sem cebola · Ponto: ao ponto', addonIds: ['bacon'] }], ['sb-p-07', 1], ['sb-p-13', 2]] },
  { id: 'sb-o-2', n: 2, channel: 'IFOOD',    status: 'RECEIVED',  pay: 'PIX',  customer: 'Cliente iFood', minutesAgo: 4, externalRef: 'IFD-4821',
    address: 'Rua das Flores, 120 - Centro', items: [['sb-p-09', 1, { notes: 'Trocar refri por suco' }]] },
  { id: 'sb-o-3', n: 3, channel: 'WHATSAPP', status: 'READY',     pay: 'PIX',  customer: 'Carla Mendes', minutesAgo: 22, phone: '(11) 98888-1234',
    items: [['sb-p-11', 2, { notes: 'Adicionais à parte', addonIds: ['granola', 'leite-cd'] }]] },
  { id: 'sb-o-4', n: 4, channel: 'DELIVERY', status: 'OUT_FOR_DELIVERY', pay: 'CARD', customer: 'Diego Rocha', minutesAgo: 35,
    address: 'Av. Brasil, 845 - Apto 31', items: [['sb-p-03', 1, { notes: 'Ponto: mal passado', addonIds: ['queijo'] }], ['sb-p-05', 1, { notes: 'Sem purê' }], ['sb-p-14', 2]] },
  { id: 'sb-o-5', n: 5, channel: 'DINE_IN',  status: 'DELIVERED', pay: 'CASH', customer: 'Mesa 02', minutesAgo: 60, table: SB_TABLES[1],
    items: [['sb-p-02', 1], ['sb-p-15', 1]] },
  { id: 'sb-o-6', n: 6, channel: 'COUNTER',  status: 'RECEIVED',  pay: 'PIX',  customer: 'Rafael Gomes', minutesAgo: 2,
    items: [['sb-p-05', 2, { notes: 'Sem batata palha', addonIds: ['cheddar'] }], ['sb-p-13', 2]] },
])

// ═══ CONFEITARIA ══════════════════════════════════════════════════════════════

const CF_CATEGORIES: Category[] = [
  cat('cf-cat-1', 'Bolos',    'Por quilo, vitrine e encomenda', 1, 3),
  cat('cf-cat-2', 'Tortas',   'Fatias e inteiras',              2, 2),
  cat('cf-cat-3', 'Doces',    'Unidade e cento',                3, 4),
  cat('cf-cat-4', 'Salgados', 'Unidade e cento',                4, 2),
  cat('cf-cat-5', 'Kits',     'Kits festa sob encomenda',       5, 2),
  cat('cf-cat-6', 'Bebidas',  'Cafés e sucos',                  6, 4),
]

function cfProduct(id: string, categoryId: string, name: string, description: string, price: number, extra: Partial<Product> = {}): Product {
  const c = CF_CATEGORIES.find(x => x.id === categoryId)!
  return { id, categoryId, name, description, price, available: true, saleUnit: 'UNIT', observationOptions: [], category: { id: c.id, name: c.name }, ...extra }
}

const CF_PRODUCTS: Product[] = [
  cfProduct('cf-p-01', 'cf-cat-1', 'Bolo de Chocolate',     'Massa de cacau e recheio de brigadeiro — vitrine', 89.9,
    { saleUnit: 'KG', imageUrl: `${IMG}/bolo-chocolate.webp`, observationOptions: ['Escrever mensagem', 'Sem cobertura'] }),
  cfProduct('cf-p-02', 'cf-cat-1', 'Bolo de Aniversário',   'Recheio e decoração à escolha', 99.9,
    { saleUnit: 'KG', madeToOrder: true, minLeadTimeHours: 48, imageUrl: `${IMG}/bolo-aniversario.webp`,
      addons: [{ id: 'topo', name: 'Topo personalizado', price: 25 }, { id: 'vela', name: 'Vela de número', price: 6 }, { id: 'morango', name: 'Morangos frescos', price: 18 }],
      observationOptions: ['Tema da festa', 'Mensagem no bolo', 'Sem lactose'] }),
  cfProduct('cf-p-03', 'cf-cat-1', 'Bolo de Cenoura (fatia)','Com cobertura de chocolate', 12.9, { imageUrl: `${IMG}/bolo-cenoura.webp` }),
  cfProduct('cf-p-04', 'cf-cat-2', 'Torta de Morango (fatia)','Creme, morangos e base crocante', 14.9, { imageUrl: `${IMG}/torta-morango-fatia.webp` }),
  cfProduct('cf-p-05', 'cf-cat-2', 'Torta de Morango inteira','Aproximadamente 1,8 kg — 16 fatias', 139.9,
    { madeToOrder: true, minLeadTimeHours: 24, imageUrl: `${IMG}/torta-morango-inteira.webp`, observationOptions: ['Mensagem na torta'] }),
  cfProduct('cf-p-06', 'cf-cat-3', 'Brigadeiro Gourmet',    'Cento — chocolate belga', 180,
    { saleUnit: 'HUNDRED', madeToOrder: true, minLeadTimeHours: 48, imageUrl: `${IMG}/brigadeiro.webp`, observationOptions: ['Forminha dourada', 'Sabores sortidos'] }),
  cfProduct('cf-p-07', 'cf-cat-3', 'Brigadeiro Gourmet (unidade)', 'Chocolate belga', 3.5, { imageUrl: `${IMG}/brigadeiro.webp` }),
  cfProduct('cf-p-08', 'cf-cat-3', 'Beijinho',              'Cento — coco fresco', 170,
    { saleUnit: 'HUNDRED', madeToOrder: true, minLeadTimeHours: 48, imageUrl: `${IMG}/beijinho.webp` }),
  cfProduct('cf-p-09', 'cf-cat-3', 'Pudim de Leite',        'Pudim caseiro com calda de caramelo', 14.9,
    { imageUrl: `${IMG}/pudim-de-leite.jpg`, videoUrl: '/demo/products/videos/pudim-de-leite.mp4' }),
  cfProduct('cf-p-10', 'cf-cat-4', 'Mini Salgados',         'Cento — croquete, bolinha de queijo e risoles', 120,
    { saleUnit: 'HUNDRED', madeToOrder: true, minLeadTimeHours: 24, imageUrl: `${IMG}/mini-salgados.webp`, observationOptions: ['Sem pimenta', 'Fritar na hora da retirada'] }),
  cfProduct('cf-p-11', 'cf-cat-4', 'Croquete (unidade)',    'Croquete de carne crocante', 7.5, { imageUrl: `${IMG}/croquete.webp` }),
  cfProduct('cf-p-12', 'cf-cat-5', 'Kit Festa 10 pessoas',  'Bolo 1,5 kg + 50 doces + 50 salgados', 239.9,
    { madeToOrder: true, minLeadTimeHours: 72, imageUrl: `${IMG}/kit-festa-10.webp`, addons: [{ id: 'topo', name: 'Topo personalizado', price: 25 }], observationOptions: ['Tema da festa', 'Mensagem no bolo'] }),
  cfProduct('cf-p-13', 'cf-cat-5', 'Kit Festa 20 pessoas',  'Bolo 3 kg + 100 doces + 100 salgados', 419.9,
    { madeToOrder: true, minLeadTimeHours: 72, imageUrl: `${IMG}/kit-festa-20.webp`, addons: [{ id: 'topo', name: 'Topo personalizado', price: 25 }], observationOptions: ['Tema da festa', 'Mensagem no bolo'] }),
  cfProduct('cf-p-14', 'cf-cat-6', 'Café Espresso',         '60 ml', 6, { imageUrl: `${IMG}/cafe-espresso.webp` }),
  cfProduct('cf-p-15', 'cf-cat-6', 'Cappuccino',            '200 ml com canela', 9.5, { imageUrl: `${IMG}/cappuccino.webp`, observationOptions: ['Sem canela', 'Leite sem lactose'] }),
  cfProduct('cf-p-16', 'cf-cat-6', 'Suco de Laranja',       '400 ml natural', 10, { imageUrl: `${IMG}/suco-laranja.jpg` }),
  cfProduct('cf-p-17', 'cf-cat-6', 'Água Mineral',          '500 ml com ou sem gás', 4, { imageUrl: `${IMG}/agua-mineral.jpg` }),
]

const CF_TABLES: Table[] = ['01', '02', '03'].map((number, i) => ({
  id: `cf-t-${i + 1}`, number, capacity: 2, status: 'AVAILABLE' as const, orders: [],
}))

const CF_ORDERS: Order[] = buildOrders(CF_PRODUCTS, [
  { id: 'cf-o-1', n: 1, channel: 'WHATSAPP', status: 'RECEIVED',  pay: 'PIX',  customer: 'Mariana Lopes', minutesAgo: 20, phone: '(11) 97777-5566',
    scheduledInHours: 50, notes: 'Retirada na loja',
    items: [['cf-p-02', 2.5, { notes: 'Tema: unicórnio · Mensagem: Parabéns, Alice!', addonIds: ['topo', 'vela'] }], ['cf-p-06', 1, { notes: 'Forminha dourada' }]] },
  { id: 'cf-o-2', n: 2, channel: 'COUNTER',  status: 'DELIVERED', pay: 'CARD', customer: 'Balcão', minutesAgo: 50,
    items: [['cf-p-04', 2], ['cf-p-15', 2, { notes: 'Sem canela' }]] },
  { id: 'cf-o-3', n: 3, channel: 'COUNTER',  status: 'READY',     pay: 'CASH', customer: 'Henrique Dias', minutesAgo: 12,
    items: [['cf-p-11', 4], ['cf-p-16', 1]] },
  { id: 'cf-o-4', n: 4, channel: 'WHATSAPP', status: 'PREPARING', pay: 'PIX',  customer: 'Isabela Pinto', minutesAgo: 95, phone: '(11) 96666-2211',
    scheduledInHours: 2,
    items: [['cf-p-10', 2, { notes: 'Metade sem pimenta' }], ['cf-p-08', 1]] },
  { id: 'cf-o-5', n: 5, channel: 'TAKEOUT',  status: 'RECEIVED',  pay: 'CARD', customer: 'Felipe Nunes', minutesAgo: 6,
    items: [['cf-p-01', 1.2, { notes: 'Escrever mensagem: Feliz aniversário, pai' }]] },
  { id: 'cf-o-6', n: 6, channel: 'DELIVERY', status: 'PREPARING', pay: 'PIX',  customer: 'Gabriela Reis', minutesAgo: 40,
    scheduledInHours: 1.5, address: 'Rua Harmonia, 77 - Casa 2',
    items: [['cf-p-12', 1, { notes: 'Tema: futebol', addonIds: ['topo'] }]] },
])

// ═══ JAPONÊS ══════════════════════════════════════════════════════════════════

const TEMAKI_ADDONS: ProductAddon[] = [
  { id: 'cream',     name: 'Cream cheese',     price: 3 },
  { id: 'cebolinha', name: 'Cebolinha extra',  price: 1 },
  { id: 'tare',      name: 'Molho tarê',       price: 2 },
  { id: 'crispy',    name: 'Crispy de alho-poró', price: 2.5 },
]
const JP_OBS = ['Sem cebolinha', 'Sem gergelim', 'Shoyu light', 'Hashi extra', 'Wasabi à parte']
const COMBO_ADDONS: ProductAddon[] = [
  { id: 'shoyu',  name: 'Shoyu extra',   price: 1.5 },
  { id: 'gengibre', name: 'Gengibre extra', price: 1.5 },
  { id: 'tare',   name: 'Molho tarê',    price: 2 },
]

const JP_CATEGORIES: Category[] = [
  cat('jp-cat-1', 'Entradas',           'Para começar',                1, 3),
  cat('jp-cat-2', 'Sushis e sashimis',  'Niguiri, uramaki e sashimi',  2, 4),
  cat('jp-cat-3', 'Temakis',            'Cone de alga com arroz',      3, 3),
  cat('jp-cat-4', 'Combinados',         'Barcas e combinados',         4, 3),
  cat('jp-cat-5', 'Pratos quentes',     'Yakisoba, lámen e teppan',    5, 3),
  cat('jp-cat-6', 'Bebidas',            'Chás, refrigerantes e saquê', 6, 4),
  cat('jp-cat-7', 'Sobremesas',         'Doces japoneses',             7, 2),
]

function jpProduct(id: string, categoryId: string, name: string, description: string, price: number, extra: Partial<Product> = {}): Product {
  const c = JP_CATEGORIES.find(x => x.id === categoryId)!
  return { id, categoryId, name, description, price, available: true, saleUnit: 'UNIT', observationOptions: [], category: { id: c.id, name: c.name }, ...extra }
}

const JP_PRODUCTS: Product[] = [
  jpProduct('jp-p-01', 'jp-cat-1', 'Guioza (6 un.)',        'Pastel japonês de carne suína grelhado',       24.9, { addons: [{ id: 'tare', name: 'Molho tarê', price: 2 }], observationOptions: ['Molho à parte', 'Bem tostado'] }),
  jpProduct('jp-p-02', 'jp-cat-1', 'Sunomono',              'Salada de pepino agridoce com gergelim',       14.9, { observationOptions: ['Sem gergelim', 'Com kani'] }),
  jpProduct('jp-p-03', 'jp-cat-1', 'Harumaki (4 un.)',      'Rolinho primavera de legumes',                 19.9, { observationOptions: ['Molho agridoce à parte'] }),
  jpProduct('jp-p-04', 'jp-cat-2', 'Sashimi de Salmão',     '10 fatias de salmão fresco',                   42.9, { observationOptions: ['Wasabi à parte', 'Shoyu light'] }),
  jpProduct('jp-p-05', 'jp-cat-2', 'Niguiri de Salmão (4 un.)', 'Bolinho de arroz com fatia de salmão',     24.9, { observationOptions: JP_OBS }),
  jpProduct('jp-p-06', 'jp-cat-2', 'Uramaki Filadélfia (8 un.)', 'Salmão, cream cheese e cebolinha',        29.9, { addons: TEMAKI_ADDONS, observationOptions: JP_OBS }),
  jpProduct('jp-p-07', 'jp-cat-2', 'Hot Roll (10 un.)',     'Empanado com salmão e cream cheese, molho tarê', 32.9, { addons: TEMAKI_ADDONS, observationOptions: ['Molho tarê à parte', 'Sem cebolinha'] }),
  jpProduct('jp-p-08', 'jp-cat-3', 'Temaki de Salmão',      'Salmão, arroz e cebolinha',                    29.9, { imageUrl: `${IMG}/temake.jpg`, addons: TEMAKI_ADDONS, observationOptions: JP_OBS }),
  jpProduct('jp-p-09', 'jp-cat-3', 'Temaki Filadélfia',     'Salmão e cream cheese',                        32.9, { imageUrl: `${IMG}/temake.jpg`, addons: TEMAKI_ADDONS, observationOptions: JP_OBS }),
  jpProduct('jp-p-10', 'jp-cat-3', 'Temaki Skin',           'Pele de salmão crocante e molho tarê',         24.9, { imageUrl: `${IMG}/temake.jpg`, addons: TEMAKI_ADDONS, observationOptions: JP_OBS }),
  jpProduct('jp-p-11', 'jp-cat-4', 'Combinado 20 peças',    'Sashimi, niguiri, uramaki e hossomaki',        69.9, { addons: COMBO_ADDONS, observationOptions: ['Sem pele', 'Sem cream cheese', ...JP_OBS] }),
  jpProduct('jp-p-12', 'jp-cat-4', 'Combinado 40 peças',    'Para 2 pessoas — seleção do sushiman',         129.9, { addons: COMBO_ADDONS, observationOptions: ['Sem pele', 'Sem cream cheese', ...JP_OBS] }),
  jpProduct('jp-p-13', 'jp-cat-4', 'Barca Festa 80 peças',  'Para 4 a 5 pessoas',                           249.9, { madeToOrder: true, minLeadTimeHours: 24, addons: COMBO_ADDONS, observationOptions: ['Sem pele', 'Sem cream cheese', 'Hashi extra'] }),
  jpProduct('jp-p-14', 'jp-cat-5', 'Yakisoba de Frango',    'Macarrão, legumes e frango ao molho',          38.9, { addons: [{ id: 'carne', name: 'Trocar por carne', price: 6 }], observationOptions: ['Sem brócolis', 'Molho extra'] }),
  jpProduct('jp-p-15', 'jp-cat-5', 'Lámen Tonkotsu',        'Caldo de porco, chashu, ovo e cebolinha',      46.9, { addons: [{ id: 'ovo', name: 'Ovo extra', price: 4 }, { id: 'chashu', name: 'Chashu extra', price: 9 }], observationOptions: ['Sem cebolinha', 'Apimentado'] }),
  jpProduct('jp-p-16', 'jp-cat-5', 'Teppan de Salmão',      'Salmão grelhado com legumes na chapa',         56.9, { observationOptions: ['Sem shimeji', 'Molho à parte'] }),
  jpProduct('jp-p-17', 'jp-cat-6', 'Chá Verde Gelado',      '400 ml',                                       9,    { observationOptions: ['Sem açúcar'] }),
  jpProduct('jp-p-18', 'jp-cat-6', 'Refrigerante lata',     '350 ml',                                       6,    { imageUrl: `${IMG}/refrigerante-cola.webp` }),
  jpProduct('jp-p-19', 'jp-cat-6', 'Saquê (dose)',          '100 ml, quente ou gelado',                     14,   { observationOptions: ['Quente', 'Gelado'] }),
  jpProduct('jp-p-20', 'jp-cat-6', 'Água Mineral',          '500 ml com ou sem gás',                        4,    { imageUrl: `${IMG}/agua-mineral.jpg` }),
  jpProduct('jp-p-21', 'jp-cat-7', 'Harumaki de Banana',    'Com canela e sorvete de creme',                18.9),
  jpProduct('jp-p-22', 'jp-cat-7', 'Mochi (2 un.)',         'Morango ou chá verde',                         16.9, { observationOptions: ['Morango', 'Chá verde'] }),
]

const JP_TABLES: Table[] = ['01', '02', '03', '04', '05', '06'].map((number, i) => ({
  id: `jp-t-${i + 1}`, number, capacity: 4, status: 'AVAILABLE' as const, orders: [],
}))

const JP_ORDERS: Order[] = buildOrders(JP_PRODUCTS, [
  { id: 'jp-o-1', n: 1, channel: 'DINE_IN',  status: 'PREPARING', pay: 'CARD', customer: 'Mesa 03', minutesAgo: 12, table: JP_TABLES[2],
    items: [['jp-p-11', 1, { notes: 'Sem pele', addonIds: ['tare'] }], ['jp-p-01', 1], ['jp-p-17', 2]] },
  { id: 'jp-o-2', n: 2, channel: 'IFOOD',    status: 'RECEIVED',  pay: 'PIX',  customer: 'Cliente iFood', minutesAgo: 3, externalRef: 'IFD-7730',
    address: 'Rua Tokyo, 58 - Liberdade', items: [['jp-p-08', 2, { notes: 'Sem cebolinha', addonIds: ['cream'] }], ['jp-p-07', 1]] },
  { id: 'jp-o-3', n: 3, channel: 'DELIVERY', status: 'OUT_FOR_DELIVERY', pay: 'CARD', customer: 'Paula Tanaka', minutesAgo: 38,
    address: 'Av. Paulista, 1200 - Apto 82', items: [['jp-p-12', 1, { notes: 'Hashi extra', addonIds: ['shoyu'] }], ['jp-p-18', 2]] },
  { id: 'jp-o-4', n: 4, channel: 'TAKEOUT',  status: 'READY',     pay: 'PIX',  customer: 'Bruno Sato', minutesAgo: 20,
    items: [['jp-p-15', 1, { notes: 'Apimentado', addonIds: ['ovo'] }], ['jp-p-02', 1]] },
  { id: 'jp-o-5', n: 5, channel: 'WHATSAPP', status: 'RECEIVED',  pay: 'PIX',  customer: 'Renata Ito', minutesAgo: 30, phone: '(11) 95555-8080',
    scheduledInHours: 26, notes: 'Aniversário — retirada na loja',
    items: [['jp-p-13', 1, { notes: 'Sem cream cheese · Hashi extra' }]] },
  { id: 'jp-o-6', n: 6, channel: 'DINE_IN',  status: 'DELIVERED', pay: 'CASH', customer: 'Mesa 01', minutesAgo: 70, table: JP_TABLES[0],
    items: [['jp-p-14', 2], ['jp-p-19', 2, { notes: 'Quente' }], ['jp-p-22', 1, { notes: 'Chá verde' }]] },
])

// ─── Exportação ───────────────────────────────────────────────────────────────
export interface DemoBusinessData {
  restaurantName: string
  categories: Category[]
  products: Product[]
  tables: Table[]
  orders: Order[]
  /** Geração do histórico dos dias anteriores */
  history: {
    seedPrefix: string
    channels: Array<[OrderChannel, number]>
    /** Pedidos por dia: base + aleatório × variação */
    baseOrders: number
    variation: number
    /** Picos de movimento: [[início, duração], [início, duração]] em horas */
    hours?: [[number, number], [number, number]]
    /** Categorias de bebida (entram como acompanhamento) */
    drinkCategoryIds: string[]
  }
}

export const SNACK_BAR_DEMO: DemoBusinessData = {
  restaurantName: 'Lanchonete Demo',
  categories: SB_CATEGORIES,
  products: SB_PRODUCTS,
  tables: SB_TABLES,
  orders: SB_ORDERS,
  history: {
    seedPrefix: 'snack',
    channels: [['COUNTER', 30], ['IFOOD', 25], ['DELIVERY', 18], ['WHATSAPP', 12], ['DINE_IN', 10], ['TAKEOUT', 5]],
    baseOrders: 22, variation: 12,
    hours: [[11, 4], [18, 5]],
    drinkCategoryIds: ['sb-cat-6'],
  },
}

export const CONFECTIONERY_DEMO: DemoBusinessData = {
  restaurantName: 'Confeitaria Demo',
  categories: CF_CATEGORIES,
  products: CF_PRODUCTS,
  tables: CF_TABLES,
  orders: CF_ORDERS,
  history: {
    seedPrefix: 'confect',
    channels: [['COUNTER', 38], ['WHATSAPP', 30], ['TAKEOUT', 14], ['DELIVERY', 12], ['IFOOD', 6]],
    baseOrders: 11, variation: 8,
    hours: [[9, 4], [14, 5]],
    drinkCategoryIds: ['cf-cat-6'],
  },
}

export const JAPANESE_DEMO: DemoBusinessData = {
  restaurantName: 'Japonês Demo',
  categories: JP_CATEGORIES,
  products: JP_PRODUCTS,
  tables: JP_TABLES,
  orders: JP_ORDERS,
  history: {
    seedPrefix: 'japanese',
    channels: [['DELIVERY', 30], ['IFOOD', 28], ['DINE_IN', 22], ['TAKEOUT', 12], ['WHATSAPP', 8]],
    baseOrders: 18, variation: 10,
    hours: [[11, 3], [18, 5]],
    drinkCategoryIds: ['jp-cat-6'],
  },
}
