'use client'

import { useState } from 'react'
import { Clock, ChevronDown, ChevronUp, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { StatusBadge, ChannelBadge } from '@/components/ui/Badge'
import { formatCurrency, formatTime, elapsedMinutes, NEXT_STATUS, NEXT_STATUS_LABEL, cn } from '@/lib/utils'
import { PAYMENT_LABEL } from '@/types'
import { dataApi } from '@/hooks/useApi'
import type { Order } from '@/types'

interface OrderCardProps {
  order: Order
  onStatusChange: (orderId: string, status: string) => Promise<void>
  onCancel: (orderId: string) => Promise<void>
}

export function OrderCard({ order, onStatusChange, onCancel }: OrderCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading]   = useState(false)

  const elapsed     = elapsedMinutes(order.createdAt)
  const nextStatus  = NEXT_STATUS[order.status]
  const nextLabel   = NEXT_STATUS_LABEL[order.status]
  const canCancel   = !['DELIVERED', 'CANCELLED'].includes(order.status)
  const isFinished  = ['DELIVERED', 'CANCELLED'].includes(order.status)

  const handleNext = async () => {
    if (!nextStatus) return
    setLoading(true)
    try { await onStatusChange(order.id, nextStatus) }
    finally { setLoading(false) }
  }

  const handleCancel = async () => {
    if (!confirm('Cancelar este pedido?')) return
    setLoading(true)
    try { await onCancel(order.id) }
    finally { setLoading(false) }
  }

  return (
    <div className={cn(
      'card border transition-all duration-200',
      order.status === 'CANCELLED' && 'opacity-60',
      elapsed >= 20 && !isFinished && 'border-amber-500/40',
    )}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-white">#{order.orderNumber}</span>
            <StatusBadge status={order.status} />
            <ChannelBadge channel={order.channel} />
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
            <Clock size={12} />
            <span className={elapsed >= 20 && !isFinished ? 'text-amber-400 font-medium' : ''}>
              {elapsed}min
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">
              {order.customerName || order.table?.number || '—'}
            </p>
            {order.deliveryAddress && (
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{order.deliveryAddress}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-base font-bold text-white">{formatCurrency(Number(order.total))}</p>
            <p className="text-xs text-gray-500">{PAYMENT_LABEL[order.paymentMethod]} · {formatTime(order.createdAt)}</p>
          </div>
        </div>

        {/* Items summary */}
        <div className="mt-3 flex flex-wrap gap-1">
          {order.items.slice(0, 3).map((item) => (
            <span key={item.id} className="text-xs bg-surface-50 border border-card-border text-gray-300 px-2 py-0.5 rounded-full">
              {item.quantity}× {item.productName}
            </span>
          ))}
          {order.items.length > 3 && (
            <span className="text-xs text-gray-500 px-2 py-0.5">+{order.items.length - 3}</span>
          )}
        </div>
      </div>

      {/* Expandable details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-2 text-xs text-gray-500 hover:text-gray-300 border-t border-card-border transition-colors"
      >
        {expanded ? <><ChevronUp size={14} /> Ocultar detalhes</> : <><ChevronDown size={14} /> Ver detalhes</>}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-card-border bg-surface-300/30 space-y-3">
          <div className="pt-3 space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between text-sm gap-2">
                <div>
                  <span className="text-white">{item.quantity}× {item.productName}</span>
                  {item.notes && <p className="text-xs text-amber-400 mt-0.5">⚠ {item.notes}</p>}
                </div>
                <span className="text-gray-400 flex-shrink-0">{formatCurrency(Number(item.totalPrice))}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-card-border pt-2 space-y-1 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span><span>{formatCurrency(Number(order.subtotal))}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Desconto</span><span>-{formatCurrency(Number(order.discount))}</span>
              </div>
            )}
            <div className="flex justify-between text-white font-semibold">
              <span>Total</span><span>{formatCurrency(Number(order.total))}</span>
            </div>
          </div>
          {order.notes && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-xs text-amber-300">
              📝 {order.notes}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {!isFinished && (
        <div className="flex gap-2 px-4 pb-4">
          {nextLabel && (
            <button onClick={handleNext} disabled={loading} className="btn-primary flex-1 justify-center text-sm py-2">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {nextLabel}
            </button>
          )}
          {canCancel && (
            <button onClick={handleCancel} disabled={loading} className="btn-secondary px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <XCircle size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
