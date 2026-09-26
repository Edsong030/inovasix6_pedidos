/**
 * Store em memória para o modo demo.
 * Permite criar, atualizar e deletar dados sem backend.
 * Sobrevive a re-renders mas não a reloads (comportamento esperado para demo).
 */

import { getDemoDataset } from './data'
import { getDemoBusinessType } from './businessType'
import type { BusinessType, Category, Product, Table, Order, OrderStatus, TableStatus } from '@/types'

// ─── Estado mutável em módulo (singleton por aba do browser) ──────────────────
// Carregado a partir do tipo de negócio escolhido na demo
let businessType: BusinessType = getDemoBusinessType()
let categories: Category[] = []
let products:   Product[]  = []
let tables:     Table[]    = []
let orders:     Order[]    = []
let nextOrderNumber        = 1

function load(type: BusinessType) {
  const data = getDemoDataset(type)
  businessType    = type
  categories      = structuredClone(data.categories)
  products        = structuredClone(data.products)
  tables          = structuredClone(data.tables)
  orders          = structuredClone(data.orders)
  nextOrderNumber = data.orders.length + 1
}
load(businessType)

function uid() {
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─── Categories ───────────────────────────────────────────────────────────────
export const demoStore = {
  // categories
  getCategories:     () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
  createCategory:    (dto: Omit<Category, 'id' | '_count'>) => {
    const c = { ...dto, id: uid(), _count: { products: 0 } }
    categories.push(c)
    return c
  },
  updateCategory:    (id: string, dto: Partial<Category>) => {
    categories = categories.map(c => c.id === id ? { ...c, ...dto } : c)
    return categories.find(c => c.id === id)!
  },
  deleteCategory:    (id: string) => { categories = categories.filter(c => c.id !== id) },

  // products
  getProducts:       () => [...products],
  createProduct:     (dto: Omit<Product, 'id' | 'category'>) => {
    const cat = categories.find(c => c.id === dto.categoryId)
    const p   = { ...dto, id: uid(), category: cat ? { id: cat.id, name: cat.name } : undefined }
    products.push(p)
    if (cat) {
      categories = categories.map(c =>
        c.id === cat.id ? { ...c, _count: { products: (c._count?.products ?? 0) + 1 } } : c,
      )
    }
    return p
  },
  updateProduct:     (id: string, dto: Partial<Product>) => {
    products = products.map(p => p.id === id ? { ...p, ...dto } : p)
    return products.find(p => p.id === id)!
  },
  deleteProduct:     (id: string) => { products = products.filter(p => p.id !== id) },

  // tables
  getTables:         () => [...tables],
  createTable:       (dto: { number: string; capacity?: number }) => {
    const t: Table = { id: uid(), number: dto.number, capacity: dto.capacity ?? 4, status: 'AVAILABLE', orders: [] }
    tables.push(t)
    return t
  },
  updateTableStatus: (id: string, status: TableStatus) => {
    tables = tables.map(t => t.id === id ? { ...t, status } : t)
    return tables.find(t => t.id === id)!
  },
  deleteTable:       (id: string) => { tables = tables.filter(t => t.id !== id) },

  // orders
  getOrders: (filters?: { status?: string; channel?: string }) => {
    let res = [...orders]
    if (filters?.status)  res = res.filter(o => o.status  === filters.status)
    if (filters?.channel) res = res.filter(o => o.channel === filters.channel)
    return res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  getOrder: (id: string) => orders.find(o => o.id === id),

  createOrder: (dto: {
    channel: Order['channel']
    paymentMethod: Order['paymentMethod']
    tableId?: string
    customerName?: string
    customerPhone?: string
    deliveryAddress?: string
    notes?: string
    discount?: number
    isPreorder?: boolean
    scheduledFor?: string
    items: { productId: string; quantity: number; notes?: string; addonIds?: string[] }[]
  }, userId = 'demo-admin', userName = 'Demo') => {
    const itemsData = dto.items.map(item => {
      const prod = products.find(p => p.id === item.productId)
      // Mesmo cálculo da API: preço dos adicionais vem do cadastro
      const addons = (item.addonIds ?? [])
        .map(id => prod?.addons?.find(a => a.id === id))
        .filter((a): a is NonNullable<typeof a> => !!a)
      const unitPrice  = Number(prod?.price ?? 0) + addons.reduce((s, a) => s + a.price, 0)
      return {
        id: uid(),
        productId:   item.productId,
        productName: prod?.name ?? 'Produto',
        quantity:    item.quantity,
        unit:        prod?.saleUnit ?? 'UNIT',
        unitPrice,
        totalPrice:  Math.round(unitPrice * item.quantity * 100) / 100,
        notes:       item.notes,
        addons:      addons.length ? addons : undefined,
      }
    })
    const subtotal = itemsData.reduce((s, i) => s + i.totalPrice, 0)
    const discount = dto.discount ?? 0
    const now = new Date().toISOString()
    const order: Order = {
      id:              uid(),
      orderNumber:     nextOrderNumber++,
      channel:         dto.channel,
      status:          'RECEIVED',
      paymentMethod:   dto.paymentMethod,
      customerName:    dto.customerName,
      customerPhone:   dto.customerPhone,
      deliveryAddress: dto.deliveryAddress,
      notes:           dto.notes,
      tableId:         dto.tableId,
      table:           dto.tableId
        ? tables.find(t => t.id === dto.tableId)
          ? { id: dto.tableId, number: tables.find(t => t.id === dto.tableId)!.number }
          : undefined
        : undefined,
      user:            { id: userId, name: userName },
      subtotal,
      discount,
      total:           subtotal - discount,
      items:           itemsData,
      createdAt:       now,
      updatedAt:       now,
      prepStartedAt:   null,
      readyAt:         null,
      deliveredAt:     null,
      cancelledAt:     null,
      isPreorder:      !!dto.isPreorder || !!dto.scheduledFor,
      scheduledFor:    dto.scheduledFor ?? null,
    }
    orders.unshift(order)
    // Ocupa mesa se salão
    if (dto.tableId && dto.channel === 'DINE_IN') {
      demoStore.updateTableStatus(dto.tableId, 'OCCUPIED')
    }
    return order
  },

  updateOrderStatus: (id: string, status: OrderStatus) => {
    const now = new Date().toISOString()
    orders = orders.map(o => {
      if (o.id !== id) return o
      return {
        ...o,
        status,
        updatedAt:       now,
        prepStartedAt:   status === 'PREPARING'        ? now : o.prepStartedAt,
        readyAt:         status === 'READY'            ? now : o.readyAt,
        deliveredAt:     status === 'DELIVERED'        ? now : o.deliveredAt,
        cancelledAt:     status === 'CANCELLED'        ? now : o.cancelledAt,
      }
    })
    const order = orders.find(o => o.id === id)!
    // Libera mesa se encerrado
    if (order.tableId && ['DELIVERED','CANCELLED'].includes(status)) {
      const still = orders.some(
        o => o.id !== id && o.tableId === order.tableId && !['DELIVERED','CANCELLED'].includes(o.status),
      )
      if (!still) demoStore.updateTableStatus(order.tableId, 'AVAILABLE')
    }
    return order
  },

  getKitchenQueue: () => {
    const now = Date.now()
    // Mesma regra da API: encomendas seguem a data de retirada/entrega
    const dueAt = (o: Order) => new Date(o.scheduledFor ?? o.createdAt).getTime()
    return orders
      .filter(o => ['RECEIVED','PREPARING'].includes(o.status))
      .sort((a, b) => dueAt(a) - dueAt(b))
      .map(o => {
        const elapsedMinutes = Math.floor((now - new Date(o.createdAt).getTime()) / 60000)
        const isUrgent = o.scheduledFor
          ? new Date(o.scheduledFor).getTime() - now <= 60 * 60000
          : elapsedMinutes >= 20
        return { ...o, elapsedMinutes, isUrgent }
      })
  },

  // Tipo de negócio atual da demo
  getBusinessType: () => businessType,

  /** Troca a demo (Restaurante, Lanchonete ou Confeitaria) e recarrega os dados. */
  switchBusiness: (type: BusinessType) => {
    if (type !== businessType) load(type)
  },

  // reset (útil para testes)
  reset: () => load(businessType),
}
