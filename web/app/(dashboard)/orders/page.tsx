'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Filter } from 'lucide-react'
import api from '@/lib/api'
import { Header } from '@/components/layout/Header'
import { OrderCard } from '@/components/orders/OrderCard'
import { NewOrderModal } from '@/components/orders/NewOrderModal'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { ORDER_STATUS_LABEL, ORDER_CHANNEL_LABEL } from '@/types'
import type { Order, OrderStatus, OrderChannel } from '@/types'
import toast from 'react-hot-toast'

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'active',            label: 'Ativos' },
  { value: 'RECEIVED',          label: 'Recebidos' },
  { value: 'PREPARING',         label: 'Em Preparo' },
  { value: 'READY',             label: 'Prontos' },
  { value: 'OUT_FOR_DELIVERY',  label: 'Saiu p/ Entrega' },
  { value: 'DELIVERED',         label: 'Entregues' },
  { value: 'CANCELLED',         label: 'Cancelados' },
]

export default function OrdersPage() {
  const [orders,     setOrders]     = useState<Order[]>([])
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState('active')
  const [channel,    setChannel]    = useState<string>('all')
  const [showNew,    setShowNew]    = useState(false)

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = {}
      if (tab !== 'active' && tab !== 'all') params.status = tab
      if (channel !== 'all') params.channel = channel
      const res = await api.get('/orders', { params })
      setOrders(res.data)
    } catch {
      toast.error('Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }, [tab, channel])

  useEffect(() => { setLoading(true); load() }, [load])

  // Auto-refresh a cada 15s
  useEffect(() => {
    const t = setInterval(load, 15_000)
    return () => clearInterval(t)
  }, [load])

  const handleStatusChange = async (orderId: string, status: string) => {
    await api.patch(`/orders/${orderId}/status`, { status })
    toast.success(`Status atualizado: ${ORDER_STATUS_LABEL[status as OrderStatus]}`)
    load()
  }

  const handleCancel = async (orderId: string) => {
    await api.patch(`/orders/${orderId}/status`, { status: 'CANCELLED' })
    toast.success('Pedido cancelado')
    load()
  }

  const filtered = tab === 'active'
    ? orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status))
    : orders

  const counts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {})
  const activeCount = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)).length

  return (
    <div className="animate-fade-in">
      <Header
        title="Pedidos"
        subtitle={`${filtered.length} pedido${filtered.length !== 1 ? 's' : ''}`}
        onRefresh={load}
        actions={
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus size={16} /> Novo Pedido
          </button>
        }
      />

      {/* Status tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map(({ value, label }) => {
          const count = value === 'active' ? activeCount : (counts[value] || 0)
          return (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                tab === value
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-card-hover border border-transparent'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === value ? 'bg-brand-600 text-white' : 'bg-card-border text-gray-400'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Channel filter */}
      <div className="flex items-center gap-2 mb-5">
        <Filter size={14} className="text-gray-500" />
        <div className="flex gap-1.5 overflow-x-auto">
          {[['all', 'Todos'], ...Object.entries(ORDER_CHANNEL_LABEL)].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setChannel(v)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
                channel === v
                  ? 'bg-brand-600 border-brand-500 text-white'
                  : 'border-card-border text-gray-400 hover:text-white'
              }`}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* Orders grid */}
      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-lg font-medium text-gray-400">Nenhum pedido encontrado</p>
          <p className="text-sm mt-1">Tente outro filtro ou crie um novo pedido</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}

      <NewOrderModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={load}
      />
    </div>
  )
}
