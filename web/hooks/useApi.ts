/**
 * Hook que abstrai todas as chamadas de dados.
 * Em modo demo, retorna dados do demoStore sem rede.
 * Em modo normal, chama a API real via axios.
 */

import { IS_DEMO, demoStore, buildDemoDashboard, buildDemoSalesReport } from '@/lib/demo'
import api from '@/lib/api'
import type { OrderStatus, TableStatus } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ok<T>(data: T) {
  return Promise.resolve({ data })
}

// ─── API surface usada pelas páginas ─────────────────────────────────────────
export const dataApi = {

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

  // Reports
  getSalesReport: (startDate: string, endDate: string) =>
    IS_DEMO
      ? ok(buildDemoSalesReport(demoStore.getOrders()))
      : api.get('/reports/sales', { params: { startDate, endDate } }),

  getOrderHistory: (page: number, limit: number, filters?: { status?: string; channel?: string }) =>
    IS_DEMO
      ? (() => {
          const all  = demoStore.getOrders({ status: filters?.status, channel: filters?.channel })
          const from = (page - 1) * limit
          return ok({
            data: all.slice(from, from + limit),
            meta: { total: all.length, page, limit, totalPages: Math.ceil(all.length / limit) },
          })
        })()
      : api.get('/reports/history', { params: { page, limit, ...filters } }),
}
