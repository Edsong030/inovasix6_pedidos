'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ShoppingBag, ChefHat, DollarSign, Clock, Plus, FileText, ChevronRight, CalendarDays,
  ChartColumn, ChartLine, ClipboardList, CircleCheck, Bike, PackageCheck, CircleX,
  TriangleAlert, CircleAlert, Store, UtensilsCrossed, MessageCircle, Timer, Sparkles,
  ArrowUpRight, ArrowDownRight, Minus, CakeSlice, CalendarClock,
} from 'lucide-react'
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { dataApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { useBusiness } from '@/hooks/useBusiness'
import { Header } from '@/components/layout/Header'
import { StatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { NewOrderModal } from '@/components/orders/NewOrderModal'
import { formatCurrency, formatTime, cn } from '@/lib/utils'
import type { Order, OrderStatus, UserRole } from '@/types'

// ─── Estilo (mesmo padrão visual de Relatórios) ───────────────────────────────
const PANEL = 'card panel-tech'
const TOOLTIP_STYLE = {
  background: '#0e1428',
  border: '1px solid rgba(96,136,255,0.25)',
  borderRadius: 12,
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
}

/** Pedido recebido/em preparo há mais que isso é destacado. */
const WAIT_ALERT_MIN = 10
const WAITING_STATUSES: OrderStatus[] = ['RECEIVED', 'PREPARING']
const REVENUE_STATUSES: OrderStatus[] = ['READY', 'OUT_FOR_DELIVERY', 'DELIVERED']

const STATUS_ROWS: Array<{ status: OrderStatus; label: string; icon: React.ElementType; dot: string; text: string }> = [
  { status: 'RECEIVED',         label: 'Recebidos',         icon: ClipboardList, dot: 'bg-blue-400',    text: 'text-blue-300' },
  { status: 'PREPARING',        label: 'Em preparo',        icon: ChefHat,       dot: 'bg-amber-400',   text: 'text-amber-300' },
  { status: 'READY',            label: 'Prontos',           icon: CircleCheck,   dot: 'bg-emerald-400', text: 'text-emerald-300' },
  { status: 'OUT_FOR_DELIVERY', label: 'Saiu para entrega', icon: Bike,          dot: 'bg-violet-400',  text: 'text-violet-300' },
  { status: 'DELIVERED',        label: 'Entregues',         icon: PackageCheck,  dot: 'bg-slate-400',   text: 'text-slate-200' },
  { status: 'CANCELLED',        label: 'Cancelados',        icon: CircleX,       dot: 'bg-red-400',     text: 'text-red-300' },
]

/**
 * Origem do pedido. Inclui iFood e WhatsApp já estilizados para quando
 * esses canais forem integrados (hoje o tipo OrderChannel ainda não os tem).
 */
const ORIGIN_STYLE: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  DINE_IN:  { label: 'Mesa',     icon: UtensilsCrossed, className: 'bg-sky-500/15 text-sky-300 border-sky-400/20' },
  COUNTER:  { label: 'Balcão',   icon: Store,           className: 'bg-violet-500/15 text-violet-300 border-violet-400/20' },
  DELIVERY: { label: 'Delivery', icon: Bike,            className: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/20' },
  TAKEOUT:  { label: 'Retirada', icon: ShoppingBag,     className: 'bg-teal-500/15 text-teal-300 border-teal-400/20' },
  IFOOD:    { label: 'iFood',    icon: Bike,            className: 'bg-red-500/15 text-red-300 border-red-400/25' },
  WHATSAPP: { label: 'WhatsApp', icon: MessageCircle,   className: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20' },
}

function OriginBadge({ channel }: { channel: string }) {
  const s = ORIGIN_STYLE[channel] ?? { label: channel, icon: ShoppingBag, className: 'bg-white/5 text-gray-300 border-white/10' }
  const Icon = s.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium whitespace-nowrap', s.className)}>
      <Icon size={13} /> {s.label}
    </span>
  )
}

// ─── Datas e números ──────────────────────────────────────────────────────────
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const minutesSince = (iso: string, now: number) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000))
const fmtInt = (n: number) => n.toLocaleString('pt-BR')
const fmtPct = (n: number) => `${Math.abs(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`

function fmtAxisBRL(v: number): string {
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return `R$ ${Math.round(v).toLocaleString('pt-BR')}`
}

// ─── Métricas ─────────────────────────────────────────────────────────────────
type Metrics = { orders: number; revenue: number; avgMinutes: number | null }

/** Métricas dos pedidos criados até o minuto do dia `untilMinute` (ou todos). */
function metrics(orders: Order[], untilMinute?: number): Metrics {
  const scoped = orders.filter(o => {
    if (o.status === 'CANCELLED') return false
    if (untilMinute === undefined) return true
    const d = new Date(o.createdAt)
    return d.getHours() * 60 + d.getMinutes() <= untilMinute
  })
  const revenue = scoped
    .filter(o => REVENUE_STATUSES.includes(o.status))
    .reduce((s, o) => s + Number(o.total), 0)
  const prepTimes = scoped
    .filter(o => o.readyAt)
    .map(o => (new Date(o.readyAt!).getTime() - new Date(o.createdAt).getTime()) / 60000)
  return {
    orders: scoped.length,
    revenue,
    avgMinutes: prepTimes.length ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length) : null,
  }
}

type Trend = { pct: number; good: boolean } | null

/** Variação vs. ontem; null quando não há base de comparação. */
function trend(current: number | null, previous: number | null, lowerIsBetter = false): Trend {
  if (current === null || previous === null || previous === 0) return null
  const pct = ((current - previous) / previous) * 100
  return { pct, good: lowerIsBetter ? pct <= 0 : pct >= 0 }
}

// ─── Componentes ──────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, iconClass, t, hint }: {
  label: string
  value: string
  icon: React.ReactNode
  iconClass: string
  t: Trend
  hint: string
}) {
  return (
    <div className={cn(PANEL, 'p-5 flex items-start gap-4 min-w-0')}>
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', iconClass)}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-white tracking-tight leading-tight mt-0.5">{value}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
          {t ? (
            <>
              <span className={cn('inline-flex items-center gap-0.5 font-semibold', t.good ? 'text-emerald-300' : 'text-red-300')}>
                {Math.abs(t.pct) < 0.5 ? <Minus size={12} /> : t.pct > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {t.pct > 0 ? '+' : t.pct < 0 ? '−' : ''}{fmtPct(t.pct)}
              </span>
              <span className="text-gray-500">vs. ontem até agora</span>
            </>
          ) : (
            <span className="text-gray-500">{hint}</span>
          )}
        </div>
      </div>
    </div>
  )
}

type HourPoint = { hour: number; label: string; count: number; revenue: number }

function HourTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: HourPoint }> }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2">
      <p className="text-xs text-gray-400">{String(p.hour).padStart(2, '0')}h – {String(p.hour + 1).padStart(2, '0')}h</p>
      <p className="text-sm font-semibold text-white mt-0.5">{fmtInt(p.count)} {p.count === 1 ? 'pedido' : 'pedidos'}</p>
      <p className="text-xs text-gray-300">{formatCurrency(p.revenue)}</p>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
const ROLES_NEW_ORDER: UserRole[] = ['ADMIN', 'MANAGER', 'ATTENDANT']
const ROLES_KITCHEN:   UserRole[] = ['ADMIN', 'MANAGER', 'KITCHEN', 'ATTENDANT']
const ROLES_ORDERS:    UserRole[] = ['ADMIN', 'MANAGER', 'ATTENDANT', 'DELIVERY']

export default function DashboardPage() {
  const { user } = useAuth()
  const business = useBusiness()
  const KitchenIcon = business.type === 'CONFECTIONERY' ? CakeSlice : ChefHat
  const [today,     setToday]     = useState<Order[]>([])
  const [yesterday, setYesterday] = useState<Order[]>([])
  const [loading,   setLoading]   = useState(true)
  const [failed,    setFailed]    = useState(false)
  const [now,       setNow]       = useState(() => Date.now())
  const [chartMode, setChartMode] = useState<'orders' | 'revenue'>('orders')
  const [showNew,   setShowNew]   = useState(false)

  const load = useCallback(async () => {
    const d = new Date()
    const todayKey = ymd(d)
    d.setDate(d.getDate() - 1)
    const yesterdayKey = ymd(d)
    try {
      const res = await dataApi.getOrdersForDays([todayKey, yesterdayKey])
      setToday(res.data.filter(o => ymd(new Date(o.createdAt)) === todayKey))
      setYesterday(res.data.filter(o => ymd(new Date(o.createdAt)) === yesterdayKey))
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setNow(Date.now())
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Atualiza dados a cada 30s e os tempos de espera a cada 30s
  useEffect(() => {
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [load])

  if (loading) return <PageLoader />

  const can = (roles: UserRole[]) => !!user && roles.includes(user.role)

  // ─── KPIs ──────────────────────────────────────────────────────────────────
  const nowDate   = new Date(now)
  const minuteNow = nowDate.getHours() * 60 + nowDate.getMinutes()
  const cur       = metrics(today)
  const prev      = yesterday.length ? metrics(yesterday, minuteNow) : null
  const inPrep    = today.filter(o => o.status === 'PREPARING').length

  // ─── Espera ────────────────────────────────────────────────────────────────
  const waiting = today
    .filter(o => WAITING_STATUSES.includes(o.status))
    // Encomenda com retirada/entrega daqui a mais de 1h ainda não está atrasada
    .filter(o => !o.scheduledFor || new Date(o.scheduledFor).getTime() - now <= 60 * 60000)
    .map(o => ({ order: o, minutes: minutesSince(o.createdAt, now) }))
    .sort((a, b) => b.minutes - a.minutes)
  const late     = waiting.filter(w => w.minutes >= WAIT_ALERT_MIN)
  const critical = late[0]
  const lateIds  = new Set(late.map(w => w.order.id))

  // ─── Status ────────────────────────────────────────────────────────────────
  const statusCounts = today.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {})

  // ─── Gráfico por hora ──────────────────────────────────────────────────────
  const hoursWithData = today.filter(o => o.status !== 'CANCELLED').map(o => new Date(o.createdAt).getHours())
  const firstHour = Math.min(8, ...hoursWithData)
  const lastHour  = Math.max(22, ...hoursWithData)
  const hourly: HourPoint[] = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => {
    const hour = firstHour + i
    const inHour = today.filter(o => o.status !== 'CANCELLED' && new Date(o.createdAt).getHours() === hour)
    return {
      hour,
      label: `${hour}h`,
      count: inHour.length,
      revenue: inHour.reduce((s, o) => s + Number(o.total), 0),
    }
  })
  const chartEmpty = hourly.every(h => h.count === 0)

  const recent = today.slice(0, 8)
  const todayLabel = nowDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })

  return (
    <div className="animate-fade-in">
      <Header
        title="Dashboard"
        subtitle="Resumo da operação de hoje"
        onRefresh={load}
        actions={
          <span className="hidden sm:inline-flex items-center gap-2 rounded-xl border panel-tech px-3 py-2 text-sm text-gray-200 whitespace-nowrap">
            <CalendarDays size={15} className="text-brand-400" /> Hoje, {todayLabel}
          </span>
        }
      />

      {failed && (
        <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          Não foi possível atualizar os dados agora. Tentaremos novamente em instantes.
        </p>
      )}

      {/* Ações rápidas + alerta de espera */}
      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] gap-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {can(ROLES_NEW_ORDER) && (
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center justify-center gap-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 px-4 py-3.5 text-sm font-semibold text-white shadow-glow transition-colors"
            >
              <Plus size={18} /> Novo pedido
            </button>
          )}
          {can(ROLES_KITCHEN) && (
            <Link href="/kitchen" className={cn(PANEL, 'flex items-center justify-center gap-2.5 px-4 py-3.5 text-sm font-semibold text-white hover:border-brand-400/40 transition-colors')}>
              <KitchenIcon size={18} className="text-brand-300" /> Ver {business.kitchenLabel.toLowerCase()}
            </Link>
          )}
          {can(ROLES_ORDERS) && (
            <Link href="/orders" className={cn(PANEL, 'flex items-center justify-center gap-2.5 px-4 py-3.5 text-sm font-semibold text-white hover:border-brand-400/40 transition-colors')}>
              <FileText size={18} className="text-brand-300" /> Ver todos os pedidos
            </Link>
          )}
        </div>

        {late.length > 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/[0.07] px-4 py-3">
            <TriangleAlert size={20} className="text-amber-300 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-200">
                {late.length} {late.length === 1 ? 'pedido aguardando' : 'pedidos aguardando'} há mais de {WAIT_ALERT_MIN} min
              </p>
              <p className="text-xs text-amber-200/60">Recebidos ou em preparo sem ficar prontos</p>
            </div>
            <Link href="/kitchen" className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg border border-amber-400/40 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/10 transition-colors">
              Ver agora <ChevronRight size={14} />
            </Link>
          </div>
        ) : (
          <div className={cn(PANEL, 'flex items-center gap-3 px-4 py-3')}>
            <Sparkles size={18} className="text-emerald-300 flex-shrink-0" />
            <p className="text-sm text-gray-300">Nenhum pedido aguardando há mais de {WAIT_ALERT_MIN} min.</p>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <KpiCard
          label="Pedidos hoje"
          value={fmtInt(cur.orders)}
          icon={<ShoppingBag size={20} className="text-brand-300" />}
          iconClass="bg-brand-500/15"
          t={trend(cur.orders, prev?.orders ?? null)}
          hint="sem dados de ontem para comparar"
        />
        <KpiCard
          label="Em preparo"
          value={fmtInt(inPrep)}
          icon={<ChefHat size={20} className="text-amber-300" />}
          iconClass="bg-amber-500/15"
          t={null}
          hint={late.length ? `${late.length} aguardando há +${WAIT_ALERT_MIN} min` : `${business.inKitchen} agora`}
        />
        <KpiCard
          label="Faturamento"
          value={formatCurrency(cur.revenue)}
          icon={<DollarSign size={20} className="text-emerald-300" />}
          iconClass="bg-emerald-500/15"
          t={trend(cur.revenue, prev?.revenue ?? null)}
          hint="pedidos prontos e entregues"
        />
        <KpiCard
          label="Tempo médio"
          value={cur.avgMinutes === null ? '—' : `${cur.avgMinutes} min`}
          icon={<Clock size={20} className="text-violet-300" />}
          iconClass="bg-violet-500/15"
          t={trend(cur.avgMinutes, prev?.avgMinutes ?? null, true)}
          hint="do recebimento até pronto"
        />
      </div>

      {/* Gráfico + Status */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <div className={cn(PANEL, 'xl:col-span-2 p-5 min-w-0')}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-semibold text-white">Pedidos e faturamento por hora</h3>
            <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1" role="tablist" aria-label="Métrica do gráfico">
              {([['orders', 'Pedidos', ChartColumn], ['revenue', 'Faturamento', ChartLine]] as const).map(([mode, label, Icon]) => (
                <button
                  key={mode}
                  role="tab"
                  aria-selected={chartMode === mode}
                  onClick={() => setChartMode(mode)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap',
                    chartMode === mode ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white',
                  )}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'orders' ? (
                <BarChart data={hourly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={8} />
                  <YAxis hide={chartEmpty} width={36} allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  {!chartEmpty && <Tooltip content={<HourTooltip />} cursor={{ fill: 'rgba(96,136,255,0.08)' }} />}
                  {!chartEmpty && <Bar dataKey="count" fill="#3d5eff" radius={[6, 6, 0, 0]} maxBarSize={28} />}
                </BarChart>
              ) : (
                <AreaChart data={hourly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashRevFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#3d5eff" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#3d5eff" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={8} />
                  <YAxis hide={chartEmpty} width={72} tickFormatter={fmtAxisBRL} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  {!chartEmpty && <Tooltip content={<HourTooltip />} cursor={{ stroke: 'rgba(96,136,255,0.4)' }} />}
                  {!chartEmpty && (
                    <Area type="monotone" dataKey="revenue" stroke="#6088ff" strokeWidth={2.5} fill="url(#dashRevFill)"
                      activeDot={{ r: 5, fill: '#6088ff', stroke: '#0b1020', strokeWidth: 2 }} />
                  )}
                </AreaChart>
              )}
            </ResponsiveContainer>

            {chartEmpty && (
              <div className="absolute inset-0 bottom-6 flex flex-col items-center justify-center text-center pointer-events-none px-6">
                <div className="w-14 h-14 rounded-full border border-brand-400/25 bg-brand-500/10 flex items-center justify-center mb-3">
                  <ChartColumn size={24} className="text-brand-300" />
                </div>
                <p className="text-sm font-semibold text-white">Ainda não há pedidos hoje</p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">Os dados aparecerão aqui, hora a hora, conforme os pedidos forem registrados.</p>
              </div>
            )}
          </div>
        </div>

        <div className={cn(PANEL, 'p-5 min-w-0')}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">Status atual</h3>
            <span className="text-xs text-gray-500">{fmtInt(today.length)} hoje</span>
          </div>
          <ul className="divide-y divide-white/5">
            {STATUS_ROWS.map(({ status, label, icon: Icon, dot, text }) => (
              <li key={status}>
                <Link
                  href={`/orders?status=${status}`}
                  className="group flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                  title={`Ver pedidos: ${label.toLowerCase()}`}
                >
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dot)} />
                  <Icon size={16} className={cn('flex-shrink-0', text)} />
                  <span className="flex-1 text-sm text-gray-200">{label}</span>
                  <span className={cn('text-base font-bold tabular-nums', text)}>{fmtInt(statusCounts[status] || 0)}</span>
                  <ChevronRight size={15} className="text-gray-600 group-hover:text-gray-300 transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Pedidos recentes + pedido crítico */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={cn(PANEL, 'xl:col-span-2 p-5 min-w-0')}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Pedidos recentes</h3>
            <Link href="/orders" className="text-xs text-brand-400 hover:text-brand-300 transition-colors inline-flex items-center gap-1">
              Ver todos <ChevronRight size={13} />
            </Link>
          </div>

          {recent.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-10">Nenhum pedido hoje.</p>
          ) : (
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/5 text-xs text-gray-500">
                    <th className="text-left font-medium py-2 pl-5 pr-2">#</th>
                    <th className="text-left font-medium py-2 px-2">Cliente / Mesa</th>
                    <th className="text-left font-medium py-2 px-2">Origem</th>
                    <th className="text-left font-medium py-2 px-2">Horário</th>
                    <th className="text-right font-medium py-2 px-2">Total</th>
                    <th className="text-left font-medium py-2 px-2">Status</th>
                    <th className="py-2 pr-5 w-6" aria-hidden="true" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recent.map(o => {
                    const isLate  = lateIds.has(o.id)
                    const active  = !['DELIVERED', 'CANCELLED'].includes(o.status)
                    const minutes = minutesSince(o.createdAt, now)
                    return (
                      <tr key={o.id} className={cn('transition-colors', isLate ? 'bg-amber-500/[0.06] hover:bg-amber-500/10' : 'hover:bg-white/[0.02]')}>
                        <td className={cn('py-3 pl-5 pr-2 font-bold whitespace-nowrap', isLate ? 'text-amber-300 border-l-2 border-amber-400' : 'text-white')}>
                          #{o.orderNumber}
                        </td>
                        <td className="py-3 px-2">
                          <p className="text-white font-medium whitespace-nowrap">{o.customerName || (o.table ? `Mesa ${o.table.number}` : 'Sem nome')}</p>
                          {o.table && o.customerName !== `Mesa ${o.table.number}` && (
                            <p className="text-xs text-gray-500">Mesa {o.table.number}</p>
                          )}
                        </td>
                        <td className="py-3 px-2"><OriginBadge channel={o.channel} /></td>
                        <td className="py-3 px-2 whitespace-nowrap">
                          <p className="text-gray-200 tabular-nums">{formatTime(o.createdAt)}</p>
                          {o.scheduledFor && (
                            <p className="text-xs text-violet-300 flex items-center gap-1" title="Retirada/entrega da encomenda">
                              <CalendarClock size={11} /> {new Date(o.scheduledFor).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                          {active && (
                            <p className={cn('text-xs flex items-center gap-1', isLate ? 'text-amber-300' : 'text-gray-500')}>
                              <Timer size={11} /> há {minutes} min
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right font-semibold text-white whitespace-nowrap tabular-nums">{formatCurrency(Number(o.total))}</td>
                        <td className="py-3 px-2"><StatusBadge status={o.status} /></td>
                        <td className="py-3 pr-5">
                          <Link href={`/orders?status=${o.status}`} aria-label={`Ver pedido #${o.orderNumber}`} className="text-gray-600 hover:text-gray-300">
                            <ChevronRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {critical ? (
          <div className="rounded-2xl border border-amber-400/30 bg-[#140f08] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.45)] flex flex-col min-w-0 xl:self-start">
            <div className="flex items-center gap-2 mb-4">
              <CircleAlert size={18} className="text-amber-300" />
              <h3 className="text-sm font-semibold text-amber-200">Pedido aguardando há mais tempo</h3>
            </div>
            <p className="text-2xl font-bold text-white">#{critical.order.orderNumber}</p>
            <p className="text-sm font-medium text-gray-200 mt-1">
              {critical.order.customerName || (critical.order.table ? `Mesa ${critical.order.table.number}` : 'Sem nome')}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <OriginBadge channel={critical.order.channel} />
              <StatusBadge status={critical.order.status} />
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/[0.04] px-4 py-3">
              <Clock size={20} className="text-amber-300 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Aguardando há</p>
                <p className="text-lg font-bold text-amber-200">{critical.minutes} min</p>
              </div>
              <p className="ml-auto text-sm font-semibold text-white tabular-nums">{formatCurrency(Number(critical.order.total))}</p>
            </div>
            {can(ROLES_KITCHEN) && (
              <Link href="/kitchen" className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-2.5 text-sm font-semibold text-gray-900 transition-colors">
                Ver {business.inKitchen} <ChevronRight size={16} />
              </Link>
            )}
          </div>
        ) : (
          <div className={cn(PANEL, 'p-5 py-10 flex flex-col items-center justify-center text-center min-w-0 xl:self-start')}>
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center mb-3">
              <CircleCheck size={22} className="text-emerald-300" />
            </div>
            <p className="text-sm font-semibold text-white">Operação em dia</p>
            <p className="text-xs text-gray-500 mt-1 max-w-[16rem]">
              {waiting.length
                ? `${waiting.length} ${waiting.length === 1 ? 'pedido' : 'pedidos'} na fila, todos dentro de ${WAIT_ALERT_MIN} min.`
                : `Nenhum pedido aguardando ${business.inKitchen}.`}
            </p>
          </div>
        )}
      </div>

      <NewOrderModal open={showNew} onClose={() => setShowNew(false)} onCreated={load} />
    </div>
  )
}
