'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, AlertTriangle, CheckCircle, Loader2, RefreshCw, CalendarClock, Plus } from 'lucide-react'
import api from '@/lib/api'
import { dataApi } from '@/hooks/useApi'
import { Header } from '@/components/layout/Header'
import { ChannelBadge } from '@/components/ui/Badge'
import { formatTime, cn } from '@/lib/utils'
import { ORDER_STATUS_LABEL } from '@/types'
import { useBusiness } from '@/hooks/useBusiness'
import { formatQuantity } from '@/lib/business'
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
  const dueMinutes = order.scheduledFor
    ? Math.round((new Date(order.scheduledFor).getTime() - Date.now()) / 60000)
    : null

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
          {dueMinutes !== null ? (
            // Encomenda: tempo até a retirada/entrega
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold',
              order.isUrgent ? 'bg-red-500/20 text-red-400' : 'bg-violet-500/20 text-violet-300',
            )}>
              <CalendarClock size={13} />
              {dueMinutes >= 0
                ? `em ${dueMinutes >= 60
                    ? `${Math.floor(dueMinutes / 60)}h${dueMinutes % 60 && dueMinutes < 24 * 60 ? String(dueMinutes % 60).padStart(2, '0') : ''}`
                    : `${dueMinutes}min`}`
                : `${-dueMinutes}min atraso`}
            </div>
          ) : (
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold',
              order.elapsedMinutes >= 25 ? 'bg-red-500/20 text-red-400' :
              order.elapsedMinutes >= 15 ? 'bg-amber-500/20 text-amber-400' :
              'bg-emerald-500/20 text-emerald-400',
            )}>
              <Clock size={13} />
              {order.elapsedMinutes}min
            </div>
          )}
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
        {order.scheduledFor && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-violet-500/15 border border-violet-400/25 px-2 py-1 text-xs font-medium text-violet-200">
            <CalendarClock size={12} />
            Encomenda · {new Date(order.scheduledFor).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 p-4 space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <span className="flex-shrink-0 min-w-7 h-7 px-1.5 rounded-lg bg-surface-50 border border-card-border flex items-center justify-center text-sm font-bold text-brand-400 whitespace-nowrap">
              {item.unit && item.unit !== 'UNIT' ? formatQuantity(item.quantity, item.unit) : Number(item.quantity)}
            </span>
            <div>
              <p className="text-sm font-medium text-white">{item.productName}</p>
              {!!item.addons?.length && (
                <p className="text-xs text-brand-300 mt-0.5 flex items-center gap-1">
                  <Plus size={10} /> {item.addons.map(a => a.name).join(', ')}
                </p>
              )}
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
  const business = useBusiness()
  const [orders, setOrders]         = useState<(Order & { elapsedMinutes: number; isUrgent: boolean })[]>([])
  const [loading, setLoading]       = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const load = useCallback(async () => {
    try {
      const res = await dataApi.getKitchenQueue()
      setOrders(res.data)
      setLastUpdate(new Date())
    } catch {
      toast.error(`Erro ao carregar fila ${business.type === 'CONFECTIONERY' ? 'da produção' : 'da cozinha'}`)
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
    await dataApi.updateOrderStatus(orderId, status)
    toast.success(status === 'READY' ? '✅ Pedido pronto!' : '🍳 Preparo iniciado!')
    load()
  }

  const received  = orders.filter(o => o.status === 'RECEIVED')
  const preparing = orders.filter(o => o.status === 'PREPARING')
  const urgent    = orders.filter(o => o.isUrgent)

  return (
    <div className="animate-fade-in">
      <Header
        title={business.kitchenLabel}
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
            <span className="text-red-300 font-medium">{urgent.length} urgente{urgent.length !== 1 ? 's' : ''}</span>
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
          <p className="text-5xl mb-4">{business.type === 'CONFECTIONERY' ? '🎂' : '🧑‍🍳'}</p>
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
