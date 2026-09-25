'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Users, Trash2, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { Header } from '@/components/layout/Header'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatCurrency, cn } from '@/lib/utils'
import { TABLE_STATUS_LABEL } from '@/types'
import type { Table, TableStatus } from '@/types'
import toast from 'react-hot-toast'

const STATUS_STYLE: Record<TableStatus, string> = {
  AVAILABLE: 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-400/60',
  OCCUPIED:  'border-amber-500/50  bg-amber-500/5  hover:border-amber-400/60',
  RESERVED:  'border-blue-500/40   bg-blue-500/5   hover:border-blue-400/60',
}

const STATUS_DOT: Record<TableStatus, string> = {
  AVAILABLE: 'bg-emerald-400',
  OCCUPIED:  'bg-amber-400 animate-pulse',
  RESERVED:  'bg-blue-400',
}

function TableCard({
  table,
  onStatusChange,
  onDelete,
}: {
  table: Table
  onStatusChange: (id: string, status: TableStatus) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const totalActive = table.orders?.reduce((s, o) => s + Number(o.total), 0) ?? 0
  const hasOrders   = (table.orders?.length ?? 0) > 0

  const cycle: Record<TableStatus, TableStatus> = {
    AVAILABLE: 'RESERVED',
    RESERVED:  'OCCUPIED',
    OCCUPIED:  'AVAILABLE',
  }

  const handleCycle = async () => {
    setLoading(true)
    try { await onStatusChange(table.id, cycle[table.status]) }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!confirm(`Remover mesa ${table.number}?`)) return
    setLoading(true)
    try { await onDelete(table.id) }
    finally { setLoading(false) }
  }

  return (
    <div className={cn('border rounded-2xl p-4 transition-all cursor-pointer', STATUS_STYLE[table.status])}>
      {/* Number + dot */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', STATUS_DOT[table.status])} />
            <span className="text-xl font-bold text-white">Mesa {table.number}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
            <Users size={12} />
            <span>{table.capacity} lugares</span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={hasOrders || loading}
          title={hasOrders ? 'Mesa com pedidos ativos' : 'Remover mesa'}
          className="p-1.5 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Status badge */}
      <div className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        table.status === 'AVAILABLE' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' :
        table.status === 'OCCUPIED'  ? 'bg-amber-500/15  text-amber-300  border-amber-500/25'  :
                                       'bg-blue-500/15   text-blue-300   border-blue-500/25',
      )}>
        {TABLE_STATUS_LABEL[table.status]}
      </div>

      {/* Active orders */}
      {hasOrders && (
        <div className="mt-3 space-y-1.5">
          {table.orders!.map(o => (
            <div key={o.id} className="flex justify-between text-xs text-gray-400 bg-surface-50/50 rounded-lg px-2 py-1">
              <span>Pedido #{o.orderNumber}</span>
              <span className="text-white font-medium">{formatCurrency(Number(o.total))}</span>
            </div>
          ))}
          {totalActive > 0 && (
            <div className="flex justify-between text-xs font-semibold text-white border-t border-white/5 pt-1.5 mt-1">
              <span>Total aberto</span>
              <span>{formatCurrency(totalActive)}</span>
            </div>
          )}
        </div>
      )}

      {/* Cycle button */}
      <button
        onClick={handleCycle}
        disabled={loading}
        className="w-full mt-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white border border-card-border hover:border-white/20 rounded-xl transition-all flex items-center justify-center gap-1"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : null}
        Mudar: {TABLE_STATUS_LABEL[cycle[table.status]]}
      </button>
    </div>
  )
}

export default function TablesPage() {
  const [tables,  setTables]  = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newNumber,   setNewNumber]   = useState('')
  const [newCapacity, setNewCapacity] = useState('4')
  const [saving,  setSaving]  = useState(false)
  const [filter,  setFilter]  = useState<TableStatus | 'all'>('all')

  const load = useCallback(async () => {
    try {
      const res = await api.get('/tables')
      setTables(res.data)
    } catch {
      toast.error('Erro ao carregar mesas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setInterval(load, 20_000)
    return () => clearInterval(t)
  }, [load])

  const handleStatusChange = async (id: string, status: TableStatus) => {
    await api.patch(`/tables/${id}/status`, { status })
    toast.success(`Mesa ${TABLE_STATUS_LABEL[status]}`)
    load()
  }

  const handleDelete = async (id: string) => {
    await api.delete(`/tables/${id}`)
    toast.success('Mesa removida')
    load()
  }

  const handleCreate = async () => {
    if (!newNumber.trim()) return
    setSaving(true)
    try {
      await api.post('/tables', { number: newNumber.trim(), capacity: parseInt(newCapacity) || 4 })
      toast.success(`Mesa ${newNumber} criada!`)
      setNewNumber('')
      setNewCapacity('4')
      setShowNew(false)
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao criar mesa')
    } finally {
      setSaving(false)
    }
  }

  const counts = tables.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  const filtered = filter === 'all' ? tables : tables.filter(t => t.status === filter)

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in">
      <Header
        title="Mesas & Comandas"
        subtitle={`${tables.length} mesa${tables.length !== 1 ? 's' : ''} cadastrada${tables.length !== 1 ? 's' : ''}`}
        onRefresh={load}
        actions={
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus size={16} /> Nova Mesa
          </button>
        }
      />

      {/* Summary + filter */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {([['all', 'Todas', tables.length], ['AVAILABLE', 'Disponíveis', counts['AVAILABLE'] || 0], ['OCCUPIED', 'Ocupadas', counts['OCCUPIED'] || 0], ['RESERVED', 'Reservadas', counts['RESERVED'] || 0]] as [string, string, number][]).map(([v, l, c]) => (
          <button
            key={v}
            onClick={() => setFilter(v as TableStatus | 'all')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border transition-all',
              filter === v
                ? 'bg-brand-600/20 text-brand-400 border-brand-500/30'
                : 'text-gray-400 hover:text-white border-card-border hover:bg-card-hover',
            )}
          >
            {l}
            <span className={cn('text-xs px-1.5 py-0.5 rounded-full', filter === v ? 'bg-brand-600 text-white' : 'bg-card-border text-gray-400')}>
              {c}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🪑</p>
          <p className="text-lg font-medium text-gray-400">Nenhuma mesa encontrada</p>
          <button onClick={() => setShowNew(true)} className="btn-primary mt-4 mx-auto">
            <Plus size={16} /> Adicionar Mesa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map(table => (
            <TableCard
              key={table.id}
              table={table}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* New table modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nova Mesa" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Número / Identificação *</label>
            <input
              value={newNumber}
              onChange={e => setNewNumber(e.target.value)}
              className="input"
              placeholder="Ex: 01, Varanda, Balcão..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Capacidade (pessoas)</label>
            <input
              type="number"
              min={1}
              max={50}
              value={newCapacity}
              onChange={e => setNewCapacity(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowNew(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button onClick={handleCreate} disabled={!newNumber.trim() || saving} className="btn-primary flex-1 justify-center">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Criar Mesa
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
