// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'MANAGER' | 'ATTENDANT' | 'KITCHEN' | 'DELIVERY'

export type OrderChannel = 'DELIVERY' | 'DINE_IN' | 'COUNTER' | 'TAKEOUT'

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
  imageUrl?: string
  available: boolean
  category?: { id: string; name: string }
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
  quantity: number
  unitPrice: number
  totalPrice: number
  notes?: string
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
  avgPrepTime: number
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
  active?: boolean
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}
