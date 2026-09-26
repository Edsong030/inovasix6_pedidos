import { type OrderStatus, type OrderChannel } from '@/types'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export function elapsedMinutes(date: string | Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60000)
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  RECEIVED:         'bg-blue-500/20 text-blue-300 border-blue-500/30',
  PREPARING:        'bg-amber-500/20 text-amber-300 border-amber-500/30',
  READY:            'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  OUT_FOR_DELIVERY: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  DELIVERED:        'bg-gray-500/20 text-gray-400 border-gray-500/30',
  CANCELLED:        'bg-red-500/20 text-red-400 border-red-500/30',
}

export const CHANNEL_COLORS: Record<OrderChannel, string> = {
  DELIVERY: 'bg-orange-500/20 text-orange-300',
  DINE_IN:  'bg-sky-500/20 text-sky-300',
  COUNTER:  'bg-violet-500/20 text-violet-300',
  TAKEOUT:  'bg-teal-500/20 text-teal-300',
  IFOOD:    'bg-red-500/20 text-red-300',
  WHATSAPP: 'bg-emerald-500/20 text-emerald-300',
}

export const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  RECEIVED:         'PREPARING',
  PREPARING:        'READY',
  READY:            'DELIVERED',
  OUT_FOR_DELIVERY: 'DELIVERED',
  DELIVERED:        null,
  CANCELLED:        null,
}

export const NEXT_STATUS_LABEL: Record<OrderStatus, string | null> = {
  RECEIVED:         'Iniciar Preparo',
  PREPARING:        'Marcar Pronto',
  READY:            'Entregar',
  OUT_FOR_DELIVERY: 'Confirmar Entrega',
  DELIVERED:        null,
  CANCELLED:        null,
}
