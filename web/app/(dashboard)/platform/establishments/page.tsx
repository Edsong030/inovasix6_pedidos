'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Eye, Pencil, Plus, Power, PowerOff, Search, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { Modal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { getBusinessProfile } from '@/lib/business'
import { formatCep, formatPhone } from '@/lib/settings'
import { apiMessage, formatDocument, platformApi } from '@/lib/platform'
import { cn } from '@/lib/utils'
import type { EstablishmentDetail, EstablishmentSummary } from '@/types'

const date = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={cn('badge border', active
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
      : 'bg-gray-500/15 text-gray-400 border-gray-500/25')}>
      {active ? 'Ativo' : 'Inativo'}
    </span>
  )
}

/** Ações da linha: visualizar, editar e ativar/inativar (sem exclusão). */
function Actions({ e, onView, onToggle, busy }: {
  e: EstablishmentSummary; onView: () => void; onToggle: () => void; busy: boolean
}) {
  const btn = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-card-border text-gray-300 hover:text-white hover:bg-card-hover transition-colors disabled:opacity-50'
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={onView} className={btn}><Eye size={13} /> Ver</button>
      <Link href={`/platform/establishments/edit?id=${encodeURIComponent(e.id)}`} className={btn}><Pencil size={13} /> Editar</Link>
      <button type="button" onClick={onToggle} disabled={busy}
        className={cn(btn, e.active ? 'hover:text-red-300 hover:bg-red-500/10' : 'hover:text-emerald-300 hover:bg-emerald-500/10')}>
        {e.active ? <><PowerOff size={13} /> Inativar</> : <><Power size={13} /> Ativar</>}
      </button>
    </div>
  )
}

function Detail({ d }: { d: EstablishmentDetail }) {
  const row = (label: string, value?: string | null) => (
    <div className="min-w-0">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-200 break-words">{value || '—'}</dd>
    </div>
  )
  const address = [[d.street, d.number].filter(Boolean).join(', '), d.complement, d.district, [d.city, d.state].filter(Boolean).join('/')]
    .filter(Boolean).join(' - ')
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {row('Slug (login)', d.slug)}
        {row('Segmento', getBusinessProfile(d.businessType).label)}
        {row('CNPJ / CPF', formatDocument(d.document))}
        {row('Status', d.active ? 'Ativo' : 'Inativo')}
        {row('Responsável', d.ownerName)}
        {row('E-mail', d.email)}
        {row('Telefone', d.phone ? formatPhone(d.phone) : null)}
        {row('WhatsApp', d.whatsapp ? formatPhone(d.whatsapp) : null)}
        {row('Endereço', address)}
        {row('CEP', d.zipCode ? formatCep(d.zipCode) : null)}
        {row('Cadastrado em', date(d.createdAt))}
      </dl>
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Administradores</h3>
        {d.users.length === 0 ? <p className="text-sm text-gray-500">Nenhum administrador.</p> : (
          <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
            {d.users.map(u => (
              <li key={u.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{u.name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
                <StatusBadge active={u.active} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function EstablishmentsPage() {
  const [items, setItems] = useState<EstablishmentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [detail, setDetail] = useState<EstablishmentDetail | null>(null)

  const load = useCallback(async () => {
    try { setItems((await platformApi.list()).data) }
    catch (err) { toast.error(apiMessage(err, 'Erro ao carregar estabelecimentos')) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(e => [e.name, e.slug, e.ownerName ?? '', e.city ?? ''].some(s => s.toLowerCase().includes(q)))
  }, [items, query])

  const view = async (e: EstablishmentSummary) => {
    try { setDetail((await platformApi.get(e.id)).data) }
    catch (err) { toast.error(apiMessage(err, 'Erro ao carregar o estabelecimento')) }
  }

  const toggle = async (e: EstablishmentSummary) => {
    const msg = e.active
      ? `Inativar "${e.name}"? Os usuários dele saem na hora e não conseguem entrar até a reativação.`
      : `Reativar "${e.name}"? Os usuários ativos dele voltam a entrar.`
    if (!confirm(msg)) return
    setBusyId(e.id)
    try {
      await platformApi.setActive(e.id, !e.active)
      toast.success(e.active ? 'Estabelecimento inativado' : 'Estabelecimento reativado')
      await load()
    } catch (err) { toast.error(apiMessage(err, 'Não foi possível alterar o status')) }
    finally { setBusyId(null) }
  }

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in">
      <Header
        title="Estabelecimentos"
        subtitle={`${items.length} cliente${items.length !== 1 ? 's' : ''} cadastrado${items.length !== 1 ? 's' : ''}`}
        onRefresh={load}
        actions={
          <Link href="/platform/establishments/new" className="btn-primary">
            <Plus size={16} /> Novo estabelecimento
          </Link>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input className="input pl-9" placeholder="Buscar por nome, slug, responsável ou cidade" value={query}
          onChange={(e) => setQuery(e.target.value)} aria-label="Buscar estabelecimentos" />
      </div>

      {filtered.length === 0 ? (
        <div className="card panel-tech p-10 text-center">
          <Building2 size={32} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">{items.length ? 'Nenhum estabelecimento encontrado.' : 'Nenhum estabelecimento cadastrado ainda.'}</p>
        </div>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="card panel-tech overflow-hidden max-md:hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-white/10">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Segmento</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Responsável</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Criado em</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{e.name}</td>
                    <td className="px-4 py-3 text-gray-300">{getBusinessProfile(e.businessType).label}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{e.slug}</td>
                    <td className="px-4 py-3 text-gray-300">{e.ownerName || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge active={e.active} /></td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{date(e.createdAt)}</td>
                    <td className="px-4 py-3"><Actions e={e} busy={busyId === e.id} onView={() => view(e)} onToggle={() => toggle(e)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cartões */}
          <div className="grid gap-3 md:hidden">
            {filtered.map(e => (
              <div key={e.id} className="card panel-tech p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{e.name}</p>
                    <p className="text-xs text-gray-500 font-mono truncate">{e.slug}</p>
                  </div>
                  <StatusBadge active={e.active} />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {getBusinessProfile(e.businessType).label} · {e.ownerName || 'sem responsável'} · desde {date(e.createdAt)}
                </p>
                <div className="mt-3"><Actions e={e} busy={busyId === e.id} onView={() => view(e)} onToggle={() => toggle(e)} /></div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ''} size="lg">
        {detail && <Detail d={detail} />}
      </Modal>
    </div>
  )
}
