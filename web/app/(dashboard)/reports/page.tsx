'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, ShoppingBag, DollarSign, Receipt, CalendarDays,
  ArrowUpRight, ArrowDownRight, Minus, Trophy,
} from 'lucide-react'
import { dataApi } from '@/hooks/useApi'
import { Header } from '@/components/layout/Header'
import { StatusBadge, ChannelBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { ORDER_CHANNEL_LABEL, ORDER_STATUS_LABEL, PAYMENT_LABEL } from '@/types'
import type { SalesReport, Order, OrderChannel, OrderStatus, PaymentMethod } from '@/types'
import { InovasixLogo } from '@/components/brand'
import toast from 'react-hot-toast'

// ─── Estilo ───────────────────────────────────────────────────────────────────
// Cartões opacos com borda azul sutil (sobrepõe .card; a impressão continua usando .card)
const PANEL = 'card panel-tech'

const PAYMENT_ORDER: PaymentMethod[] = ['PIX', 'CARD', 'CASH']
const PAYMENT_COLOR: Record<PaymentMethod, string> = {
  PIX:  '#22d3ee',
  CARD: '#3d5eff',
  CASH: '#a78bfa',
}
const CHANNEL_ORDER: OrderChannel[] = ['DINE_IN', 'DELIVERY', 'COUNTER', 'TAKEOUT']

const TOOLTIP_STYLE = {
  background: '#0e1428',
  border: '1px solid rgba(96,136,255,0.25)',
  borderRadius: 12,
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
}

// ─── Datas (sempre locais, nunca UTC) ─────────────────────────────────────────
type Preset = 'today' | '7d' | '30d' | 'month' | 'custom'

const PRESETS: Array<[Preset, string]> = [
  ['today', 'Hoje'],
  ['7d',    '7 dias'],
  ['30d',   '30 dias'],
  ['month', 'Este mês'],
  ['custom','Personalizado'],
]

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(s: string, n: number): string {
  const d = parseYmd(s)
  d.setDate(d.getDate() + n)
  return ymd(d)
}

function daysBetween(start: string, end: string): number {
  return Math.round((parseYmd(end).getTime() - parseYmd(start).getTime()) / 86400000) + 1
}

function presetRange(p: Exclude<Preset, 'custom'>): [string, string] {
  const today = ymd(new Date())
  switch (p) {
    case 'today': return [today, today]
    case '7d':    return [addDays(today, -6), today]
    case '30d':   return [addDays(today, -29), today]
    case 'month': return [`${today.slice(0, 7)}-01`, today]
  }
}

function previousRange(start: string, end: string): [string, string] {
  const n = daysBetween(start, end)
  const prevEnd = addDays(start, -1)
  return [addDays(prevEnd, -(n - 1)), prevEnd]
}

const fmtDate      = (s: string) => parseYmd(s).toLocaleDateString('pt-BR')
const fmtDayMonth  = (s: string) => parseYmd(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const fmtLongDay   = (s: string) =>
  parseYmd(s).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })

function fmtRange(start: string, end: string) {
  return start === end ? fmtDate(start) : `${fmtDate(start)} – ${fmtDate(end)}`
}

// ─── Números ──────────────────────────────────────────────────────────────────
const fmtInt = (n: number) => n.toLocaleString('pt-BR')
const fmtPct = (n: number, digits = 1) =>
  `${n.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`

/** Eixo do gráfico: "R$ 850", "R$ 2,5 mil", "R$ 1,2 mi" — nunca "R$0k". */
function fmtAxisBRL(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (abs >= 1_000)     return `R$ ${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return `R$ ${Math.round(v).toLocaleString('pt-BR')}`
}

/** Marcas "redondas" do eixo Y (0, 1 mil, 2 mil…), até o primeiro valor acima do máximo. */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 25, 50, 75, 100]
  const raw  = max / 4
  const pow  = 10 ** Math.floor(Math.log10(raw))
  const step = ([1, 2, 2.5, 5, 10].find(m => m * pow >= raw) ?? 10) * pow
  const count = Math.max(2, Math.ceil(max / step))
  return Array.from({ length: count + 1 }, (_, i) => i * step)
}

type Delta ={ kind: 'up' | 'down' | 'flat' | 'new' | 'none'; pct: number }

function delta(current: number, previous: number): Delta {
  if (previous === 0) return current === 0 ? { kind: 'none', pct: 0 } : { kind: 'new', pct: 0 }
  const pct = ((current - previous) / previous) * 100
  if (Math.abs(pct) < 0.05) return { kind: 'flat', pct: 0 }
  return { kind: pct > 0 ? 'up' : 'down', pct }
}

// ─── Componentes ──────────────────────────────────────────────────────────────
function DeltaPill({ d }: { d: Delta }) {
  if (d.kind === 'none') {
    return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-white/5 text-gray-400"><Minus size={12} /> sem dados</span>
  }
  if (d.kind === 'new') {
    return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-brand-500/15 text-brand-300"><ArrowUpRight size={12} /> novo</span>
  }
  if (d.kind === 'flat') {
    return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-white/5 text-gray-300"><Minus size={12} /> 0,0%</span>
  }
  const up = d.kind === 'up'
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
      up ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300',
    )}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {up ? '+' : '−'}{fmtPct(Math.abs(d.pct))}
    </span>
  )
}

function KpiCard({ label, value, icon, iconClass, d, previous }: {
  label: string
  value: string
  icon: React.ReactNode
  iconClass: string
  d: Delta
  previous: string
}) {
  return (
    <div className={cn(PANEL, 'p-5 flex flex-col gap-3 min-w-0')}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-400">{label}</p>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', iconClass)}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-white tracking-tight leading-tight">{value}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <DeltaPill d={d} />
        <span className="text-xs text-gray-500">vs. período anterior</span>
      </div>
      <p className="text-xs text-gray-500 -mt-1">{previous}</p>
    </div>
  )
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </div>
  )
}

function RevenueTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { date: string; revenue: number; count: number } }> }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2">
      <p className="text-xs text-gray-400 capitalize">{fmtLongDay(p.date)}</p>
      <p className="text-sm font-semibold text-white mt-0.5">{formatCurrency(p.revenue)}</p>
      <p className="text-xs text-gray-400">{fmtInt(p.count)} {p.count === 1 ? 'pedido' : 'pedidos'}</p>
    </div>
  )
}

function PaymentTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; count: number; pct: number } }> }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2">
      <p className="text-xs text-gray-400">{p.name} · {fmtPct(p.pct)}</p>
      <p className="text-sm font-semibold text-white mt-0.5">{formatCurrency(p.value)}</p>
      <p className="text-xs text-gray-400">{fmtInt(p.count)} {p.count === 1 ? 'pedido' : 'pedidos'}</p>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [tab, setTab] = useState<'sales' | 'history'>('sales')

  // Período
  const [preset,    setPreset]    = useState<Preset>('month')
  const [startDate, setStartDate] = useState(() => presetRange('month')[0])
  const [endDate,   setEndDate]   = useState(() => presetRange('month')[1])

  const [report,   setReport]   = useState<SalesReport | null>(null)
  const [previous, setPrevious] = useState<SalesReport | null>(null)
  const [loading,  setLoading]  = useState(false)
  const requestId = useRef(0)

  // Histórico
  const [history,      setHistory]      = useState<Order[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [page,         setPage]         = useState(1)
  const [totalPages,   setTotalPages]   = useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  const todayStr     = ymd(new Date())
  const invalidRange = !startDate || !endDate || startDate > endDate
  const [prevStart, prevEnd] = invalidRange ? ['', ''] : previousRange(startDate, endDate)
  const periodDays   = invalidRange ? 0 : daysBetween(startDate, endDate)

  const loadSales = useCallback(async () => {
    if (!startDate || !endDate || startDate > endDate) return
    const id = ++requestId.current
    const [ps, pe] = previousRange(startDate, endDate)
    setLoading(true)
    try {
      const [cur, prev] = await Promise.all([
        dataApi.getSalesReport(startDate, endDate),
        dataApi.getSalesReport(ps, pe),
      ])
      if (id !== requestId.current) return
      setReport(cur.data)
      setPrevious(prev.data)
    } catch {
      if (id === requestId.current) toast.error('Erro ao gerar relatório')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [startDate, endDate])

  const loadHistory = useCallback(async (p = 1, status = statusFilter) => {
    setHistoryLoading(true)
    try {
      const res = await dataApi.getOrderHistory(p, 15, { status: status || undefined })
      setHistory(res.data.data)
      setTotalPages(Math.max(1, res.data.meta.totalPages))
      setPage(p)
    } catch { toast.error('Erro ao carregar histórico') }
    finally { setHistoryLoading(false) }
  }, [statusFilter])

  // Recarrega automaticamente quando o período muda
  useEffect(() => {
    if (tab === 'sales') loadSales()
  }, [tab, loadSales])

  const switchTab = (t: 'sales' | 'history') => {
    setTab(t)
    if (t === 'history') loadHistory(1)
  }

  const choosePreset = (p: Preset) => {
    setPreset(p)
    if (p === 'custom') return
    const [s, e] = presetRange(p)
    setStartDate(s)
    setEndDate(e)
  }

  // ─── Dados derivados ──────────────────────────────────────────────────────
  const summary     = report?.summary
  const prevSummary = previous?.summary

  const revenue     = summary?.totalRevenue ?? 0
  const prevRevenue = prevSummary?.totalRevenue ?? 0
  const growth      = delta(revenue, prevRevenue)
  const diffRevenue = revenue - prevRevenue

  // Garante todos os dias do período no gráfico (zeros nos dias sem venda)
  const dayData = (() => {
    if (!report || invalidRange) return []
    const map = new Map(report.byDay.map(d => [d.date, d]))
    return Array.from({ length: periodDays }, (_, i) => {
      const date = addDays(startDate, i)
      const d = map.get(date)
      return { date, revenue: d?.revenue ?? 0, count: d?.count ?? 0 }
    })
  })()

  const paymentTotalRevenue = PAYMENT_ORDER.reduce((s, k) => s + (report?.byPayment[k]?.revenue ?? 0), 0)
  const paymentData = PAYMENT_ORDER.map(k => {
    const v = report?.byPayment[k] ?? { count: 0, revenue: 0 }
    return {
      key: k,
      name: PAYMENT_LABEL[k],
      value: v.revenue,
      count: v.count,
      pct: paymentTotalRevenue > 0 ? (v.revenue / paymentTotalRevenue) * 100 : 0,
      color: PAYMENT_COLOR[k],
    }
  })

  const channelTotal = CHANNEL_ORDER.reduce((s, k) => s + (report?.byChannel[k]?.count ?? 0), 0)
  const channelData = CHANNEL_ORDER
    .map(k => {
      const v = report?.byChannel[k] ?? { count: 0, revenue: 0 }
      return { key: k, name: ORDER_CHANNEL_LABEL[k], count: v.count, revenue: v.revenue, pct: channelTotal > 0 ? (v.count / channelTotal) * 100 : 0 }
    })
    .sort((a, b) => b.count - a.count)
  const channelMax = Math.max(1, ...channelData.map(c => c.count))

  const topProducts = report?.topProducts.slice(0, 5) ?? []
  const hasSales    = (summary?.totalOrders ?? 0) > 0

  // Espaçamento dos rótulos do eixo X conforme o tamanho do período
  const yTicks    = niceTicks(Math.max(0, ...dayData.map(d => d.revenue)))
  const xInterval =periodDays <= 10 ? 0 : periodDays <= 31 ? Math.ceil(periodDays / 10) - 1 : Math.ceil(periodDays / 8) - 1

  return (
    <div className="animate-fade-in relative">
      <Header title="Relatórios" subtitle="Acompanhe vendas, formas de pagamento e canais do seu restaurante" />

      {/* Abas */}
      <div className="flex flex-wrap gap-1 mb-5 p-1 rounded-xl w-fit border panel-tech print:hidden">
        {([['sales', 'Relatório de Vendas', TrendingUp], ['history', 'Histórico de Pedidos', ShoppingBag]] as const).map(([v, l, Icon]) => (
          <button
            key={v}
            onClick={() => switchTab(v)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              tab === v ? 'bg-brand-600 text-white shadow-glow' : 'text-gray-400 hover:text-white hover:bg-white/5',
            )}
          >
            <Icon size={15} /> {l}
          </button>
        ))}
      </div>

      {/* ── RELATÓRIO DE VENDAS ─────────────────────────────────────────── */}
      {tab === 'sales' && (
        <>
          {/* Período */}
          <div className={cn(PANEL, 'p-4 mb-5 print:hidden')}>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(([p, label]) => (
                  <button
                    key={p}
                    onClick={() => choosePreset(p)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all whitespace-nowrap',
                      preset === p
                        ? 'bg-brand-600/25 border-brand-500/50 text-white'
                        : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:border-brand-500/30',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-end gap-3 xl:ml-auto">
                <div>
                  <label htmlFor="rep-start" className="block text-xs font-medium text-gray-400 mb-1">Data inicial</label>
                  <input
                    id="rep-start" type="date" value={startDate} max={endDate || todayStr}
                    onChange={e => { setPreset('custom'); setStartDate(e.target.value) }}
                    className="input text-sm w-[10.5rem] bg-[#0c1330] [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label htmlFor="rep-end" className="block text-xs font-medium text-gray-400 mb-1">Data final</label>
                  <input
                    id="rep-end" type="date" value={endDate} min={startDate} max={todayStr}
                    onChange={e => { setPreset('custom'); setEndDate(e.target.value) }}
                    className="input text-sm w-[10.5rem] bg-[#0c1330] [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-white/5 text-xs">
              {invalidRange ? (
                <span className="text-red-300">A data inicial precisa ser anterior ou igual à data final.</span>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <CalendarDays size={13} className="text-brand-400" />
                    {fmtRange(startDate, endDate)}
                    <span className="text-gray-500">· {periodDays} {periodDays === 1 ? 'dia' : 'dias'}</span>
                  </span>
                  <span className="text-gray-500">Comparado com {fmtRange(prevStart, prevEnd)}</span>
                  {loading && <span className="text-brand-300">Atualizando…</span>}
                </>
              )}
            </div>
          </div>

          {!report && loading && <PageLoader />}

          {report && !invalidRange && (
            <div className={cn('transition-opacity', loading && 'opacity-60')}>
              {/* Cabeçalho de impressão */}
              <div className="hidden print:flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                <InovasixLogo size="sm" />
                <div className="ml-auto text-right text-sm text-gray-600">
                  <p className="font-semibold">Relatório de Vendas</p>
                  <p>{fmtRange(startDate, endDate)}</p>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
                <KpiCard
                  label="Faturamento"
                  value={formatCurrency(revenue)}
                  icon={<DollarSign size={18} className="text-emerald-300" />}
                  iconClass="bg-emerald-500/15"
                  d={growth}
                  previous={`Anterior: ${formatCurrency(prevRevenue)}`}
                />
                <KpiCard
                  label="Pedidos"
                  value={fmtInt(summary?.totalOrders ?? 0)}
                  icon={<ShoppingBag size={18} className="text-brand-300" />}
                  iconClass="bg-brand-500/15"
                  d={delta(summary?.totalOrders ?? 0, prevSummary?.totalOrders ?? 0)}
                  previous={`Anterior: ${fmtInt(prevSummary?.totalOrders ?? 0)} pedidos`}
                />
                <KpiCard
                  label="Ticket médio"
                  value={formatCurrency(summary?.avgTicket ?? 0)}
                  icon={<Receipt size={18} className="text-violet-300" />}
                  iconClass="bg-violet-500/15"
                  d={delta(summary?.avgTicket ?? 0, prevSummary?.avgTicket ?? 0)}
                  previous={`Anterior: ${formatCurrency(prevSummary?.avgTicket ?? 0)}`}
                />
                <KpiCard
                  label="Crescimento"
                  value={
                    growth.kind === 'up' || growth.kind === 'down'
                      ? `${growth.pct > 0 ? '+' : '−'}${fmtPct(Math.abs(growth.pct))}`
                      : growth.kind === 'flat' ? '0,0%' : '—'
                  }
                  icon={growth.kind === 'down'
                    ? <TrendingDown size={18} className="text-red-300" />
                    : <TrendingUp size={18} className="text-cyan-300" />}
                  iconClass={growth.kind === 'down' ? 'bg-red-500/15' : 'bg-cyan-500/15'}
                  d={growth}
                  previous={`${diffRevenue >= 0 ? '+' : '−'}${formatCurrency(Math.abs(diffRevenue))} em faturamento`}
                />
              </div>

              {/* Faturamento por dia + Pagamentos */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
                <div className={cn(PANEL, 'xl:col-span-2 p-5 min-w-0')}>
                  <SectionTitle title="Faturamento por dia" hint={fmtRange(startDate, endDate)} />
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dayData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="#3d5eff" stopOpacity={0.45} />
                            <stop offset="100%" stopColor="#3d5eff" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={fmtDayMonth}
                          interval={xInterval}
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          axisLine={false} tickLine={false} tickMargin={8}
                          padding={{ left: 8, right: 8 }}
                        />
                        <YAxis
                          width={78}
                          tickFormatter={fmtAxisBRL}
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          axisLine={false} tickLine={false}
                          ticks={yTicks}
                          domain={[0, yTicks[yTicks.length - 1]]}
                        />
                        <Tooltip content={<RevenueTooltip />} cursor={{ stroke: 'rgba(96,136,255,0.4)', strokeWidth: 1 }} />
                        <Area
                          type="monotone" dataKey="revenue" name="Faturamento"
                          stroke="#6088ff" strokeWidth={2.5}
                          fill="url(#revFill)"
                          dot={dayData.length <= 1 ? { r: 5, fill: '#6088ff', strokeWidth: 0 } : false}
                          activeDot={{ r: 5, fill: '#6088ff', stroke: '#0b1020', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={cn(PANEL, 'p-5 min-w-0')}>
                  <SectionTitle title="Pagamentos" hint="por faturamento" />
                  {paymentTotalRevenue > 0 ? (
                    <>
                      <div className="relative h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={paymentData.filter(p => p.value > 0)}
                              dataKey="value" nameKey="name"
                              cx="50%" cy="50%" innerRadius={60} outerRadius={84}
                              paddingAngle={3} stroke="none"
                            >
                              {paymentData.filter(p => p.value > 0).map(p => <Cell key={p.key} fill={p.color} />)}
                            </Pie>
                            <Tooltip content={<PaymentTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[11px] text-gray-500">Total</span>
                          <span className="text-sm font-bold text-white">{formatCurrency(paymentTotalRevenue)}</span>
                        </div>
                      </div>
                      <ul className="mt-4 space-y-2.5">
                        {paymentData.map(p => (
                          <li key={p.key} className="flex items-start gap-3">
                            <span className="mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                                <span className="text-sm text-white font-medium">{p.name}</span>
                                <span className="text-sm text-white font-semibold">{formatCurrency(p.value)}</span>
                              </div>
                              <p className="text-xs text-gray-500">
                                {fmtPct(p.pct)} · {fmtInt(p.count)} {p.count === 1 ? 'pedido' : 'pedidos'}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="py-16 text-center text-sm text-gray-500">Sem pagamentos no período.</p>
                  )}
                </div>
              </div>

              {/* Canais + Top 5 */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className={cn(PANEL, 'p-5 min-w-0')}>
                  <SectionTitle title="Pedidos por canal" hint={`${fmtInt(channelTotal)} pedidos`} />
                  <ul className="space-y-4">
                    {channelData.map(c => (
                      <li key={c.key}>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-2 mb-1.5">
                          <span className="text-sm text-white font-medium">{c.name}</span>
                          <span className="text-sm text-gray-300">
                            <span className="font-semibold text-white">{fmtInt(c.count)}</span>
                            <span className="text-gray-500"> · {fmtPct(c.pct)}</span>
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-violet-500 transition-all duration-500"
                            style={{ width: `${(c.count / channelMax) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={cn(PANEL, 'xl:col-span-2 p-5 min-w-0')}>
                  <SectionTitle title="Top 5 produtos" hint="por faturamento no período" />
                  {topProducts.length > 0 ? (
                    <div className="overflow-x-auto -mx-5">
                      <table className="w-full text-sm min-w-[460px]">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="text-left py-2.5 pl-5 pr-2 text-xs font-medium text-gray-500 uppercase tracking-wider w-14">#</th>
                            <th className="text-left py-2.5 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                            <th className="text-right py-2.5 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Qtd.</th>
                            <th className="text-right py-2.5 pl-2 pr-5 text-xs font-medium text-gray-500 uppercase tracking-wider">Faturamento</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {topProducts.map((p, i) => (
                            <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-3 pl-5 pr-2">
                                <span className={cn(
                                  'inline-flex w-7 h-7 items-center justify-center rounded-lg text-xs font-bold',
                                  i === 0 ? 'bg-amber-400/15 text-amber-300'
                                    : i < 3 ? 'bg-brand-500/15 text-brand-300'
                                    : 'bg-white/5 text-gray-400',
                                )}>
                                  {i === 0 ? <Trophy size={13} /> : i + 1}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-white font-medium">{p.name}</td>
                              <td className="py-3 px-2 text-right text-gray-300 whitespace-nowrap tabular-nums">{fmtInt(p.qty)}</td>
                              <td className="py-3 pl-2 pr-5 text-right font-semibold text-white whitespace-nowrap tabular-nums">{formatCurrency(p.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="py-12 text-center text-sm text-gray-500">Nenhum produto vendido no período.</p>
                  )}
                </div>
              </div>

              {!hasSales && (
                <p className="mt-4 text-center text-sm text-gray-500">Nenhuma venda registrada neste período.</p>
              )}
            </div>
          )}
        </>
      )}

      {/* ── HISTÓRICO DE PEDIDOS ────────────────────────────────────────── */}
      {tab === 'history' && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); loadHistory(1, e.target.value) }}
              className="input text-sm w-52 bg-[#0c1330]"
              aria-label="Filtrar por status"
            >
              <option value="">Todos os status</option>
              {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map(s => (
                <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>

          {historyLoading ? <PageLoader /> : (
            <>
              <div className={cn(PANEL, 'overflow-hidden')}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        {['#', 'Status', 'Canal', 'Cliente', 'Itens', 'Total', 'Pagamento', 'Data'].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {history.map(order => (
                        <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-bold text-white whitespace-nowrap">#{order.orderNumber}</td>
                          <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                          <td className="py-3 px-4"><ChannelBadge channel={order.channel} /></td>
                          <td className="py-3 px-4 text-gray-300 whitespace-nowrap">
                            {order.customerName || (order.table ? `Mesa ${order.table.number}` : '—')}
                          </td>
                          <td className="py-3 px-4 text-gray-400 whitespace-nowrap">{order.items?.length ?? 0} item(s)</td>
                          <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">{formatCurrency(Number(order.total))}</td>
                          <td className="py-3 px-4 text-gray-400 whitespace-nowrap">{PAYMENT_LABEL[order.paymentMethod]}</td>
                          <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">{formatDate(order.createdAt)}</td>
                        </tr>
                      ))}
                      {history.length === 0 && (
                        <tr><td colSpan={8} className="py-12 text-center text-gray-500">Nenhum pedido encontrado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button onClick={() => loadHistory(page - 1)} disabled={page <= 1} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40">Anterior</button>
                  <span className="flex items-center px-3 text-sm text-gray-400">Página {page} de {totalPages}</span>
                  <button onClick={() => loadHistory(page + 1)} disabled={page >= totalPages} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40">Próxima</button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
