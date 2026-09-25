'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingBag, ChefHat, DollarSign, Clock,
  TrendingUp, ArrowRight, Circle,
} from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import api from '@/lib/api'
import { dataApi } from '@/hooks/useApi'
import { Header } from '@/components/layout/Header'
import { StatusBadge, ChannelBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatTime } from '@/lib/utils'
import type { DashboardData, Order } from '@/types'
import { ORDER_STATUS_LABEL } from '@/types'

// ─── KPI Card ────────────────────────────────────────────────────────────────
interface KpiProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  color: string
  trend?: number
}

function KpiCard({ label, value, sub, icon, color, trend }: KpiProps) {
  return (
    <div className="card p-5 flex items-start gap-4 hover:border-brand-500/30 transition-colors">
      <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full
          ${trend >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
          <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  )
}

// ─── Recent Order Row ─────────────────────────────────────────────────────────
function RecentOrderRow({ order }: { order: Order }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-card-border last:border-0 hover:bg-card-hover/50 px-2 -mx-2 rounded-lg transition-colors">
      <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center text-brand-400 text-xs font-bold flex-shrink-0">
        #{order.orderNumber}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {order.customerName || order.table?.number || 'Sem nome'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <ChannelBadge channel={order.channel} />
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-white">{formatCurrency(Number(order.total))}</p>
        <p className="text-xs text-gray-500">{formatTime(order.createdAt)}</p>
      </div>
      <StatusBadge status={order.status} />
    </div>
  )
}

// ─── Active Status Summary ────────────────────────────────────────────────────
interface StatusCountProps { status: string; count: number; color: string }
function StatusDot({ status, count, color }: StatusCountProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Circle size={8} className={color} fill="currentColor" />
        <span className="text-sm text-gray-300">{status}</span>
      </div>
      <span className={`text-sm font-semibold ${color}`}>{count}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData]       = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await dataApi.getDashboard()
      setData(res.data)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh a cada 30s
  useEffect(() => {
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [load])

  if (loading) return <PageLoader />
  if (!data)   return <p className="text-gray-400">Erro ao carregar dashboard.</p>

  const statusCounts = data.recentOrders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {})

  // Gráfico de pedidos por hora (mock baseado em recentOrders)
  const hourly = Array.from({ length: 12 }, (_, i) => {
    const h = i + 8
    const count = data.recentOrders.filter(
      (o) => new Date(o.createdAt).getHours() === h,
    ).length
    const rev = data.recentOrders
      .filter((o) => new Date(o.createdAt).getHours() === h)
      .reduce((s, o) => s + Number(o.total), 0)
    return { hora: `${h}h`, pedidos: count, faturamento: rev }
  })

  return (
    <div className="animate-fade-in">
      <Header
        title="Dashboard"
        subtitle={`Resumo do dia — ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}`}
        onRefresh={load}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Pedidos Hoje"
          value={data.ordersToday}
          sub="total do dia"
          icon={<ShoppingBag size={20} className="text-blue-300" />}
          color="bg-blue-500/20"
        />
        <KpiCard
          label="Em Preparo"
          value={data.inPreparation}
          sub="aguardando cozinha"
          icon={<ChefHat size={20} className="text-amber-300" />}
          color="bg-amber-500/20"
        />
        <KpiCard
          label="Faturamento"
          value={formatCurrency(data.revenueToday)}
          sub="entregas concluídas"
          icon={<DollarSign size={20} className="text-emerald-300" />}
          color="bg-emerald-500/20"
        />
        <KpiCard
          label="Tempo Médio"
          value={`${data.avgPrepTime} min`}
          sub="recebido → pronto"
          icon={<Clock size={20} className="text-purple-300" />}
          color="bg-purple-500/20"
        />
      </div>

      {/* Chart + Status sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        {/* Area Chart */}
        <div className="xl:col-span-2 card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Pedidos e Faturamento por Hora</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={hourly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPedidos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3d5eff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3d5eff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradFat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
              <XAxis dataKey="hora" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 10 }}
                labelStyle={{ color: '#e8eaf0' }}
              />
              <Area type="monotone" dataKey="pedidos" stroke="#3d5eff" fill="url(#gradPedidos)" strokeWidth={2} name="Pedidos" />
              <Area type="monotone" dataKey="faturamento" stroke="#22c55e" fill="url(#gradFat)" strokeWidth={2} name="Faturamento (R$)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status dos pedidos */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Status Atual</h3>
          <div className="divide-y divide-card-border">
            <StatusDot status="Recebidos"       count={statusCounts['RECEIVED'] || 0}         color="text-blue-400" />
            <StatusDot status="Em Preparo"       count={statusCounts['PREPARING'] || 0}        color="text-amber-400" />
            <StatusDot status="Prontos"          count={statusCounts['READY'] || 0}            color="text-emerald-400" />
            <StatusDot status="Saiu p/ Entrega"  count={statusCounts['OUT_FOR_DELIVERY'] || 0} color="text-purple-400" />
            <StatusDot status="Entregues"        count={statusCounts['DELIVERED'] || 0}        color="text-gray-400" />
            <StatusDot status="Cancelados"       count={statusCounts['CANCELLED'] || 0}        color="text-red-400" />
          </div>
          <Link href="/orders" className="mt-4 flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Ver todos os pedidos <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Recent orders */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Pedidos Recentes</h3>
          <Link href="/orders" className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1">
            Ver todos <ArrowRight size={12} />
          </Link>
        </div>
        {data.recentOrders.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">Nenhum pedido hoje.</p>
        ) : (
          <div>
            {data.recentOrders.slice(0, 8).map((o) => (
              <RecentOrderRow key={o.id} order={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
