'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react'
import api from '@/lib/api'
import { Header } from '@/components/layout/Header'
import { ChannelBadge } from '@/components/ui/Badge'
import { formatTime, cn } from '@/lib/utils'
import { ORDER_STATUS_LABEL } from '@/types'
import type { Order, OrderStatus } from '@/types'
import toast from 'react-hot-toast'

const STATUS_COLOR: Record<string, string> = {
  RECEIVED: 'border-blue-500/50 bg-blue-500/5',
  PREPARING: 'border-amber-500/50 bg-amber-500/5',
}

const URGENT_COLOR = 'border-red-500/60 bg-red-500/8 animate-pulse2'

function KitchenCard({ order, onAdvance }: { order: Order & { elapsedMinutes: number; isUrgent: boolean }; onAdvance: (id: string, status: string) => Promise<void> }) {
  const [loading, setLoading] = useState(false)

  const nextStatus: Record<OrderStatus, string | null> = {
    RECEIVED: 'PREPARING',
    PREPARING: 'READY',
    READY: null,
    OUT_FOR_DELIVERY: null,
    DELIVERED: null,
    CANCELLED: null,
  }
  const next = nextStatus[order.status]

  const nextLabel: Record<string, string> = {
    PREPARING: 'Iniciar Preparo',
    READY: 'Marcar Pronto ✓',
  }

  const handleAdvance = async () => {
    if (!next) return
    setLoading(true)
    try { await onAdvance(order.id, next) }
    finally { setLoading(false) }
  }

  return (
    <div className={cn(
      'border rounded-2xl flex flex-col transition-all duration-300',
      order.isUrgent ? URGENT_COLOR : (STATUS_COLOR[order.status] || 'border-card-border bg-card'),
    )}>
      {/* Card Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">#{order.orderNumber}</span>
            {order.isUrgent && <AlertTriangle size={16} className="text-red-400" />}
          </div>
          <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold',
            order.elapsedMinutes >= 25 ? 'bg-red-500/20 text-red-400' :
            order.elapsedMinutes >= 15 ? 'bg-amber-500/20 text-amber-400' :
            'bg-emerald-500/20 text-emerald-400',
          )}>
            <Clock size={13} />
            {order.elapsedMinutes}min
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ChannelBadge channel={order.channel} />
          <span className={cn(
            'badge border text-xs',
            order.status === 'RECEIVED' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          )}>
            {ORDER_STATUS_LABEL[order.status]}
          </span>
          {order.table && (
            <span className="badge bg-slate-500/20 text-slate-300 border border-slate-500/20">
              Mesa {order.table.number}
            </span>
          )}
        </div>
        {order.customerName && (
          <p className="text-sm text-gray-300 mt-2 font-medium">{order.customerName}</p>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 p-4 space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-surface-50 border border-card-border flex items-center justify-center text-sm font-bold text-brand-400">
              {item.quantity}
            </span>
            <div>
              <p className="text-sm font-medium text-white">{item.productName}</p>
              {item.notes && (
                <p className="text-xs text-amber-400 mt-0.5 flex items-center gap-1">
                  <AlertTriangle size={10} /> {item.notes}
                </p>
              )}
            </div>
          </div>
        ))}

        {order.notes && (
          <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
            📝 {order.notes}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span>Recebido {formatTime(order.createdAt)}</span>
          {order.prepStartedAt && <span>Preparo {formatTime(order.prepStartedAt)}</span>}
        </div>
        {next && (
          <button
            onClick={handleAdvance}
            disabled={loading}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
              next === 'READY'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-brand-600 hover:bg-brand-500 text-white',
            )}
          >
            {loading
              ? <Loader2 size={15} className="animate-spin" />
              : <CheckCircle size={15} />}
            {nextLabel[next]}
          </button>
        )}
      </div>
    </div>
  )
}

export default function KitchenPage() {
  const [orders, setOrders]         = useState<(Order & { elapsedMinutes: number; isUrgent: boolean })[]>([])
  const [loading, setLoading]       = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const load = useCallback(async () => {
    try {
      const res = await api.get('/kitchen/queue')
      setOrders(res.data)
      setLastUpdate(new Date())
    } catch {
      toast.error('Erro ao carregar fila da cozinha')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh a cada 10s
  useEffect(() => {
    const t = setInterval(load, 10_000)
    return () => clearInterval(t)
  }, [load])

  const handleAdvance = async (orderId: string, status: string) => {
    await api.patch(`/orders/${orderId}/status`, { status })
    toast.success(status === 'READY' ? '✅ Pedido pronto!' : '🍳 Preparo iniciado!')
    load()
  }

  const received  = orders.filter(o => o.status === 'RECEIVED')
  const preparing = orders.filter(o => o.status === 'PREPARING')
  const urgent    = orders.filter(o => o.isUrgent)

  return (
    <div className="animate-fade-in">
      <Header
        title="Cozinha"
        subtitle={`Fila: ${orders.length} pedido${orders.length !== 1 ? 's' : ''} · Atualizado ${formatTime(lastUpdate)}`}
        onRefresh={load}
      />

      {/* Summary bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-blue-300 font-medium">{received.length} aguardando</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-300 font-medium">{preparing.length} em preparo</span>
        </div>
        {urgent.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-red-300 font-medium">{urgent.length} atrasado{urgent.length !== 1 ? 's' : ''} (&gt;20min)</span>
          </div>
        )}
        <div className="ml-auto">
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw size={12} /> Atualizar agora
          </button>
        </div>
      </div>

      {orders.length === 0 && !loading ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🧑‍🍳</p>
          <p className="text-xl font-semibold text-gray-300">Fila vazia!</p>
          <p className="text-gray-500 mt-2">Nenhum pedido aguardando preparo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {orders.map(order => (
            <KitchenCard key={order.id} order={order} onAdvance={handleAdvance} />
          ))}
        </div>
      )}
    </div>
  )
}
