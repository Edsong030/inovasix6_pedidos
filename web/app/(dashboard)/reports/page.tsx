'use client'

import { useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Search, Download, TrendingUp, ShoppingBag, DollarSign, Ticket } from 'lucide-react'
import api from '@/lib/api'
import { dataApi } from '@/hooks/useApi'
import { Header } from '@/components/layout/Header'
import { StatusBadge, ChannelBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { ORDER_CHANNEL_LABEL, PAYMENT_LABEL } from '@/types'
import type { SalesReport, Order } from '@/types'
import { InovasixLogo } from '@/components/brand'
import toast from 'react-hot-toast'

const COLORS = ['#3d5eff', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4']

const today     = new Date().toISOString().split('T')[0]
const monthStart = `${today.slice(0, 7)}-01`

function KpiMini({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', color)}>{icon}</div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(monthStart)
  const [endDate,   setEndDate]   = useState(today)
  const [report,    setReport]    = useState<SalesReport | null>(null)
  const [history,   setHistory]   = useState<Order[]>([])
  const [loading,   setLoading]   = useState(false)
  const [tab,       setTab]       = useState<'sales' | 'history'>('sales')

  // History pagination
  const [page,      setPage]      = useState(1)
  const [totalPages,setTotalPages]= useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  const loadSales = useCallback(async () => {
    if (!startDate || !endDate) return
    setLoading(true)
    try {
      const res = await dataApi.getSalesReport(startDate, endDate)
      setReport(res.data)
    } catch { toast.error('Erro ao gerar relatório') }
    finally { setLoading(false) }
  }, [startDate, endDate])

  const loadHistory = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await dataApi.getOrderHistory(p, 15, { status: statusFilter || undefined })
      setHistory(res.data.data)
      setTotalPages(res.data.meta.totalPages)
      setPage(p)
    } catch { toast.error('Erro ao carregar histórico') }
    finally { setLoading(false) }
  }, [statusFilter])

  // Load on tab change
  const switchTab = (t: 'sales' | 'history') => {
    setTab(t)
    if (t === 'history') loadHistory(1)
    else if (t === 'sales' && !report) loadSales()
  }

  const channelData = report
    ? Object.entries(report.byChannel).map(([k, v]) => ({
        name: ORDER_CHANNEL_LABEL[k as keyof typeof ORDER_CHANNEL_LABEL] || k,
        pedidos: v.count,
        faturamento: v.revenue,
      }))
    : []

  const paymentData = report
    ? Object.entries(report.byPayment).map(([k, v], i) => ({
        name: PAYMENT_LABEL[k as keyof typeof PAYMENT_LABEL] || k,
        value: v.revenue,
        count: v.count,
        color: COLORS[i],
      }))
    : []

  return (
    <div className="animate-fade-in">
      <Header title="Relatórios" subtitle="Histórico e análise de vendas" />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-surface-100 p-1 rounded-xl w-fit border border-card-border">
        {([['sales', 'Relatório de Vendas', TrendingUp], ['history', 'Histórico de Pedidos', ShoppingBag]] as const).map(([v, l, Icon]) => (
          <button
            key={v}
            onClick={() => switchTab(v)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === v ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white',
            )}
          >
            <Icon size={15} /> {l}
          </button>
        ))}
      </div>

      {/* ── SALES REPORT ──────────────────────────────────────────── */}
      {tab === 'sales' && (
        <>
          {/* Date range + generate */}
          <div className="flex items-end gap-3 mb-5 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Data Início</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input text-sm w-40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Data Fim</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input text-sm w-40" />
            </div>
            <button onClick={loadSales} disabled={loading} className="btn-primary">
              <Search size={15} />
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </button>
          </div>

          {loading && <PageLoader />}

          {!loading && !report && (
            <div className="text-center py-16 text-gray-500">
              <TrendingUp size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-lg font-medium text-gray-400">Selecione o período e clique em Gerar</p>
            </div>
          )}

          {report && !loading && (
            <>
              {/* Print header — visível na impressão */}
              <div className="hidden print:flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                <InovasixLogo size="sm" />
                <div className="ml-auto text-right text-sm text-gray-600">
                  <p className="font-semibold">Relatório de Vendas</p>
                  <p>{report.period.start} até {report.period.end}</p>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiMini label="Faturamento" value={formatCurrency(report.summary.totalRevenue)} icon={<DollarSign size={18} className="text-emerald-300" />} color="bg-emerald-500/20" />
                <KpiMini label="Pedidos" value={String(report.summary.totalOrders)} icon={<ShoppingBag size={18} className="text-blue-300" />} color="bg-blue-500/20" />
                <KpiMini label="Ticket Médio" value={formatCurrency(report.summary.avgTicket)} icon={<Ticket size={18} className="text-purple-300" />} color="bg-purple-500/20" />
                <KpiMini label="Período" value={`${report.byDay.length} dias`} icon={<TrendingUp size={18} className="text-amber-300" />} color="bg-amber-500/20" />
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
                {/* Revenue by day */}
                <div className="xl:col-span-2 card p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">Faturamento por Dia</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={report.byDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
                      <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 10 }}
                        formatter={(v: number) => [formatCurrency(v), 'Faturamento']}
                        labelStyle={{ color: '#e8eaf0' }}
                      />
                      <Bar dataKey="revenue" fill="#3d5eff" radius={[4, 4, 0, 0]} name="Faturamento" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Payment pie */}
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">Pagamentos</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                        {paymentData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 10 }}
                        formatter={(v: number) => [formatCurrency(v)]}
                        labelStyle={{ color: '#e8eaf0' }}
                      />
                      <Legend
                        formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Channel breakdown */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">Pedidos por Canal</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={channelData} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
                      <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 10 }} labelStyle={{ color: '#e8eaf0' }} />
                      <Bar dataKey="pedidos" fill="#6088ff" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Top products */}
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">Top 5 Produtos</h3>
                  <div className="space-y-2">
                    {report.topProducts.slice(0, 5).map((p, i) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-600 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-white truncate">{p.name}</span>
                            <span className="text-brand-400 font-medium ml-2 flex-shrink-0">{formatCurrency(p.revenue)}</span>
                          </div>
                          <div className="h-1.5 bg-surface-50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-600 rounded-full"
                              style={{ width: `${(p.revenue / (report.topProducts[0]?.revenue || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">{p.qty}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── ORDER HISTORY ─────────────────────────────────────────── */}
      {tab === 'history' && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); loadHistory(1) }}
              className="input text-sm w-44"
            >
              <option value="">Todos os status</option>
              {['RECEIVED','PREPARING','READY','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button onClick={() => loadHistory(1)} className="btn-secondary text-sm">Filtrar</button>
          </div>

          {loading ? <PageLoader /> : (
            <>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-card-border">
                        {['#', 'Status', 'Canal', 'Cliente', 'Itens', 'Total', 'Pagamento', 'Data'].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                      {history.map(order => (
                        <tr key={order.id} className="hover:bg-card-hover/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-white">#{order.orderNumber}</td>
                          <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                          <td className="py-3 px-4"><ChannelBadge channel={order.channel} /></td>
                          <td className="py-3 px-4 text-gray-300 max-w-[120px] truncate">
                            {order.customerName || (order as any).table?.number || '—'}
                          </td>
                          <td className="py-3 px-4 text-gray-400">{order.items?.length ?? 0} item(s)</td>
                          <td className="py-3 px-4 font-semibold text-white">{formatCurrency(Number(order.total))}</td>
                          <td className="py-3 px-4 text-gray-400">{PAYMENT_LABEL[order.paymentMethod]}</td>
                          <td className="py-3 px-4 text-gray-500 text-xs">{formatDate(order.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
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
