/**
 * Hook que abstrai todas as chamadas de dados.
 * Em modo demo, retorna dados do demoStore sem rede.
 * Em modo normal, chama a API real via axios.
 */

import { IS_DEMO, demoStore, buildDemoDashboard, buildDemoSalesReport, getDemoHistoryOrders, toLocalYMD } from '@/lib/demo'
import api from '@/lib/api'
import type { BusinessType, Order, OrderStatus, TableStatus } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ok<T>(data: T) {
  return Promise.resolve({ data })
}

// Relatórios demo: histórico gerado dos dias anteriores + pedidos do dia (store)
function demoReportOrders(filters?: { status?: string; channel?: string }) {
  const history = getDemoHistoryOrders().filter(o =>
    (!filters?.status  || o.status  === filters.status) &&
    (!filters?.channel || o.channel === filters.channel),
  )
  return [...demoStore.getOrders(filters), ...history]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// ─── API surface usada pelas páginas ─────────────────────────────────────────
export const dataApi = {

  // Upload de imagem de produto (apenas disponível fora do modo demo)
  uploadProductImage: async (file: File): Promise<string> => {
    if (IS_DEMO) throw new Error('DEMO_MODE')
    const form = new FormData()
    form.append('file', file)
    // Usar fetch diretamente para multipart/form-data (axios adiciona boundary automático com fetch também)
    const token = (await import('js-cookie')).default.get('token')
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
    const res = await fetch(`${apiUrl}/uploads/products`, {
      method:  'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    form,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.message || `Erro ${res.status} no upload`)
    }
    const data = await res.json()
    return data.url as string
  },

  // Upload de vídeo de produto (apenas disponível fora do modo demo)
  uploadProductVideo: async (file: File): Promise<string> => {
    if (IS_DEMO) throw new Error('DEMO_MODE')
    const form = new FormData()
    form.append('file', file)
    const token = (await import('js-cookie')).default.get('token')
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
    const res = await fetch(`${apiUrl}/uploads/products/videos`, {
      method:  'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    form,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.message || `Erro ${res.status} no upload de video`)
    }
    const data = await res.json()
    return data.url as string
  },

  // Dashboard
  getDashboard: () =>
    IS_DEMO
      ? ok(buildDemoDashboard(demoStore.getOrders()))
      : api.get('/orders/dashboard'),

  // Orders
  getOrders: (params?: { status?: string; channel?: string; date?: string }) =>
    IS_DEMO
      ? ok(demoStore.getOrders({ status: params?.status, channel: params?.channel }))
      : api.get('/orders', { params }),

  /**
   * Pedidos criados nos dias informados (datas locais YYYY-MM-DD), de qualquer status.
   * A API filtra `date` em UTC; por isso também busca os dias vizinhos e
   * refiltra pelo dia local no navegador.
   */
  getOrdersForDays: async (days: string[]): Promise<{ data: Order[] }> => {
    const wanted = new Set(days)
    const inDays = (o: Order) => wanted.has(toLocalYMD(new Date(o.createdAt)))
    const byNewest = (a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (IS_DEMO) return { data: demoReportOrders().filter(inDays) }

    const shift = (d: string, n: number) => {
      const x = new Date(`${d}T00:00:00`)
      x.setDate(x.getDate() + n)
      return toLocalYMD(x)
    }
    const utcDays = Array.from(new Set(days.flatMap(d => [shift(d, -1), d, shift(d, 1)])))
    const responses = await Promise.all(utcDays.map(date => api.get<Order[]>('/orders', { params: { date } })))
    const unique = new Map<string, Order>()
    responses.forEach(r => r.data.forEach(o => unique.set(o.id, o)))
    return { data: Array.from(unique.values()).filter(inDays).sort(byNewest) }
  },

  getOrder: (id: string) =>
    IS_DEMO
      ? ok(demoStore.getOrder(id))
      : api.get(`/orders/${id}`),

  createOrder: (body: Record<string, unknown>) =>
    IS_DEMO
      ? ok(demoStore.createOrder(body as Parameters<typeof demoStore.createOrder>[0]))
      : api.post('/orders', body),

  updateOrderStatus: (id: string, status: string) =>
    IS_DEMO
      ? ok(demoStore.updateOrderStatus(id, status as OrderStatus))
      : api.patch(`/orders/${id}/status`, { status }),

  // Kitchen
  getKitchenQueue: () =>
    IS_DEMO
      ? ok(demoStore.getKitchenQueue())
      : api.get('/kitchen/queue'),

  // Tables
  getTables: () =>
    IS_DEMO ? ok(demoStore.getTables()) : api.get('/tables'),

  createTable: (body: { number: string; capacity?: number }) =>
    IS_DEMO ? ok(demoStore.createTable(body)) : api.post('/tables', body),

  updateTableStatus: (id: string, status: TableStatus) =>
    IS_DEMO
      ? ok(demoStore.updateTableStatus(id, status))
      : api.patch(`/tables/${id}/status`, { status }),

  deleteTable: (id: string) =>
    IS_DEMO ? ok(demoStore.deleteTable(id)) : api.delete(`/tables/${id}`),

  // Categories
  getCategories: () =>
    IS_DEMO ? ok(demoStore.getCategories()) : api.get('/categories'),

  createCategory: (body: Record<string, unknown>) =>
    IS_DEMO ? ok(demoStore.createCategory(body as never)) : api.post('/categories', body),

  updateCategory: (id: string, body: Record<string, unknown>) =>
    IS_DEMO
      ? ok(demoStore.updateCategory(id, body as never))
      : api.patch(`/categories/${id}`, body),

  deleteCategory: (id: string) =>
    IS_DEMO ? ok(demoStore.deleteCategory(id)) : api.delete(`/categories/${id}`),

  // Products
  getProducts: () =>
    IS_DEMO ? ok(demoStore.getProducts()) : api.get('/products'),

  createProduct: (body: Record<string, unknown>) =>
    IS_DEMO ? ok(demoStore.createProduct(body as never)) : api.post('/products', body),

  updateProduct: (id: string, body: Record<string, unknown>) =>
    IS_DEMO
      ? ok(demoStore.updateProduct(id, body as never))
      : api.patch(`/products/${id}`, body),

  deleteProduct: (id: string) =>
    IS_DEMO ? ok(demoStore.deleteProduct(id)) : api.delete(`/products/${id}`),

  // Users (demo: lista estática, sem edição)
  getUsers: () =>
    IS_DEMO
      ? ok([
          { id: 'u1', name: 'Administrador',  email: 'admin@inovasix.com',     role: 'ADMIN',     active: true },
          { id: 'u2', name: 'Carlos Gerente',  email: 'gerente@inovasix.com',   role: 'MANAGER',   active: true },
          { id: 'u3', name: 'Ana Atendente',   email: 'atendente@inovasix.com', role: 'ATTENDANT', active: true },
          { id: 'u4', name: 'João Cozinha',    email: 'cozinha@inovasix.com',   role: 'KITCHEN',   active: true },
          { id: 'u5', name: 'Pedro Entregador',email: 'entregador@inovasix.com',role: 'DELIVERY',  active: true },
        ])
      : api.get('/users'),

  createUser: (body: Record<string, unknown>) =>
    IS_DEMO ? ok({ ...body, id: `u-${Date.now()}` }) : api.post('/users', body),

  updateUser: (id: string, body: Record<string, unknown>) =>
    IS_DEMO ? ok({ id, ...body }) : api.patch(`/users/${id}`, body),

  // Configurações do estabelecimento (tipo de negócio)
  updateBusinessType: (businessType: BusinessType) =>
    IS_DEMO
      ? ok({ businessType })
      : api.patch('/restaurants/settings', { businessType }),

  // Reports
  getSalesReport: (startDate: string, endDate: string) =>
    IS_DEMO
      ? ok(buildDemoSalesReport(demoReportOrders(), startDate, endDate))
      : api.get('/reports/sales', { params: { startDate, endDate } }),

  getOrderHistory: (page: number, limit: number, filters?: { status?: string; channel?: string }) =>
    IS_DEMO
      ? (() => {
          const all  = demoReportOrders(filters)
          const from = (page - 1) * limit
          return ok({
            data: all.slice(from, from + limit),
            meta: { total: all.length, page, limit, totalPages: Math.ceil(all.length / limit) },
          })
        })()
      : api.get('/reports/history', { params: { page, limit, ...filters } }),
}
