// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'MANAGER' | 'ATTENDANT' | 'KITCHEN' | 'DELIVERY'

export type BusinessType = 'RESTAURANT' | 'SNACK_BAR' | 'CONFECTIONERY' | 'JAPANESE'

/** Unidade de venda do produto: por unidade, por quilo ou por cento. */
export type SaleUnit = 'UNIT' | 'KG' | 'HUNDRED'

/** IFOOD e WHATSAPP: origens preparadas para integração futura. */
export type OrderChannel = 'DELIVERY' | 'DINE_IN' | 'COUNTER' | 'TAKEOUT' | 'IFOOD' | 'WHATSAPP'

export type OrderStatus =
  | 'RECEIVED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'

export type PaymentMethod = 'PIX' | 'CARD' | 'CASH'

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'

// ─── Labels ──────────────────────────────────────────────────────────────────

export const ORDER_CHANNEL_LABEL: Record<OrderChannel, string> = {
  DELIVERY:  'Delivery',
  DINE_IN:   'Salão',
  COUNTER:   'Balcão',
  TAKEOUT:   'Retirada',
  IFOOD:     'iFood',
  WHATSAPP:  'WhatsApp',
}

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  RESTAURANT:    'Restaurante',
  SNACK_BAR:     'Lanchonete',
  CONFECTIONERY: 'Confeitaria',
  JAPANESE:      'Japonês',
}

export const SALE_UNIT_LABEL: Record<SaleUnit, string> = {
  UNIT:    'Unidade',
  KG:      'Quilo (kg)',
  HUNDRED: 'Cento',
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  RECEIVED:         'Recebido',
  PREPARING:        'Em Preparo',
  READY:            'Pronto',
  OUT_FOR_DELIVERY: 'Saiu p/ Entrega',
  DELIVERED:        'Entregue',
  CANCELLED:        'Cancelado',
}

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  PIX:  'Pix',
  CARD: 'Cartão',
  CASH: 'Dinheiro',
}

export const TABLE_STATUS_LABEL: Record<TableStatus, string> = {
  AVAILABLE: 'Disponível',
  OCCUPIED:  'Ocupada',
  RESERVED:  'Reservada',
}

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN:     'Administrador',
  MANAGER:   'Gerente',
  ATTENDANT: 'Atendente',
  KITCHEN:   'Cozinha',
  DELIVERY:  'Entregador',
}

// ─── Entities ────────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  active: boolean
  restaurantId: string
  restaurantName: string
}

export interface Category {
  id: string
  name: string
  description?: string
  sortOrder: number
  active: boolean
  _count?: { products: number }
}

export interface Product {
  id: string
  categoryId: string
  name: string
  description?: string
  price: number
  imageUrl?: string | null
  videoUrl?: string | null
  available: boolean
  category?: { id: string; name: string }
  /** Unidade de venda (padrão: UNIT) */
  saleUnit?: SaleUnit
  /** Feito sob encomenda: exige data/hora de retirada ou entrega */
  madeToOrder?: boolean
  /** Antecedência mínima da encomenda, em horas */
  minLeadTimeHours?: number | null
  /** Adicionais pagos (ex.: bacon extra, molho extra) */
  addons?: ProductAddon[] | null
  /** Observações rápidas sugeridas (ex.: sem cebola, ponto da carne) */
  observationOptions?: string[]
}

export interface ProductAddon {
  id: string
  name: string
  price: number
}

export interface Table {
  id: string
  number: string
  capacity: number
  status: TableStatus
  orders?: OrderSummary[]
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  /** Na unidade de venda (fracionada para kg). A API pode enviar como string decimal. */
  quantity: number
  unit?: SaleUnit
  unitPrice: number
  totalPrice: number
  notes?: string
  addons?: ProductAddon[] | null
  product?: { name: string; imageUrl?: string }
}

export interface Order {
  id: string
  orderNumber: number
  channel: OrderChannel
  status: OrderStatus
  paymentMethod: PaymentMethod
  customerName?: string
  customerPhone?: string
  deliveryAddress?: string
  notes?: string
  subtotal: number
  discount: number
  total: number
  tableId?: string
  table?: { id: string; number: string } | null
  user?: { id: string; name: string }
  items: OrderItem[]
  createdAt: string
  updatedAt: string
  prepStartedAt?: string | null
  readyAt?: string | null
  deliveredAt?: string | null
  cancelledAt?: string | null
  /** Encomenda com data/hora de retirada ou entrega */
  isPreorder?: boolean
  scheduledFor?: string | null
  /** Previsão de pronto, gravada pelo servidor (ou pelo store da demo) ao criar o pedido */
  estimatedReadyAt?: string | null
  /** Identificador no canal de origem (iFood, WhatsApp) — integração futura */
  externalRef?: string | null
  elapsedMinutes?: number
  isUrgent?: boolean
}

export interface OrderSummary {
  id: string
  orderNumber: number
  status: OrderStatus
  total: number
}

export interface DashboardData {
  ordersToday: number
  inPreparation: number
  revenueToday: number
  /** Minutos do recebimento até pronto; null sem pedidos com horários válidos */
  avgPrepTime: number | null
  recentOrders: Order[]
}

export interface SalesReport {
  period: { start: string; end: string }
  summary: { totalRevenue: number; totalOrders: number; avgTicket: number }
  byChannel: Record<string, { count: number; revenue: number }>
  byPayment: Record<string, { count: number; revenue: number }>
  topProducts: Array<{ id: string; name: string; qty: number; revenue: number }>
  byDay: Array<{ date: string; count: number; revenue: number }>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  restaurantId: string
  restaurantName: string
  /** Tipo de negócio do estabelecimento (padrão: RESTAURANT) */
  businessType?: BusinessType
  active?: boolean
}

// ─── Configurações do negócio ────────────────────────────────────────────────

/** Paletas de destaque pré-aprovadas (contraste AA sobre o tema escuro). */
export type AccentColor = 'inovasix' | 'violet' | 'cyan' | 'emerald' | 'rose' | 'orange'

/** Horário de um dia da semana (0 = domingo … 6 = sábado), horas em HH:MM. */
export interface OpeningHour {
  day: number
  open: boolean
  opensAt: string
  closesAt: string
}

/** Configurações do estabelecimento. Telefones, CEP e CNPJ guardados só com dígitos. */
export interface BusinessSettings {
  name: string
  businessType: BusinessType
  phone: string
  whatsapp: string
  email: string
  cnpj: string
  logoUrl: string
  accentColor: AccentColor
  zipCode: string
  street: string
  number: string
  complement: string
  district: string
  city: string
  state: string
  openingHours: OpeningHour[]
  avgPrepMinutes: number
  acceptingOrders: boolean
  showUnavailableProducts: boolean
  orderMessage: string
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}
