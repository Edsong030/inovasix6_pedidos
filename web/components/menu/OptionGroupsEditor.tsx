'use client'

import { Plus, Trash2, Eye, EyeOff, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'
import { describeRule, slugId, type ProductOptionGroup } from '@/lib/productOptions'

/** Rascunho editável (campos numéricos como texto enquanto o usuário digita). */
export interface OptionDraft { key: string; id: string; name: string; price: string; available: boolean }
export interface GroupDraft {
  key: string; id: string; name: string
  required: boolean; multiple: boolean
  min: string; max: string
  options: OptionDraft[]
}

let seq = 0
const key = () => `k${Date.now().toString(36)}${(seq++).toString(36)}`

export function toDrafts(groups: ProductOptionGroup[] | null | undefined): GroupDraft[] {
  return (groups ?? []).map(g => ({
    key: key(), id: g.id, name: g.name, required: g.required, multiple: g.multiple,
    min: String(g.min), max: String(g.max),
    options: g.options.map(o => ({ key: key(), id: o.id, name: o.name, price: o.price ? o.price.toFixed(2).replace('.', ',') : '', available: o.available })),
  }))
}

/** "4,50", "4.50" e "1.234,50" → número. Com vírgula, o ponto é separador de milhar. */
export function parsePrice(s: string): number {
  const t = s.trim().replace(/^R\$\s*/i, '')
  if (t === '') return 0
  return Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
}

/**
 * Converte os rascunhos no formato salvo. Linhas totalmente vazias são ignoradas;
 * ids de itens novos são gerados a partir do nome. A validação final (mín./máx.,
 * repetidos, preços) é feita por normalizeOptionGroups — aqui e na API.
 */
export function fromDrafts(drafts: GroupDraft[]): unknown[] {
  const groupIds = new Set(drafts.map(d => d.id).filter(Boolean))
  const optionIds = new Set(drafts.flatMap(d => d.options.map(o => o.id)).filter(Boolean))
  return drafts
    .filter(d => d.name.trim() || d.options.some(o => o.name.trim()))
    .map(d => {
      const options = d.options
        .filter(o => o.name.trim() || o.price.trim())
        .map(o => ({ id: o.id || slugId(o.name, optionIds), name: o.name.trim(), price: parsePrice(o.price), available: o.available }))
      const multiple = d.multiple
      const min = d.min.trim() === '' ? (d.required ? 1 : 0) : Number(d.min)
      const max = !multiple ? 1 : d.max.trim() === '' ? Math.max(1, options.length) : Number(d.max)
      return { id: d.id || slugId(d.name || 'grupo', groupIds), name: d.name.trim(), required: d.required, multiple, min, max, options }
    })
}

function newGroup(): GroupDraft {
  return { key: key(), id: '', name: '', required: false, multiple: true, min: '', max: '', options: [newOption()] }
}
function newOption(): OptionDraft {
  return { key: key(), id: '', name: '', price: '', available: true }
}

/** Prévia da regra como o atendente vai ver no pedido. */
function rulePreview(d: GroupDraft): string {
  const count = Math.max(1, d.options.filter(o => o.name.trim()).length)
  const g = fromDrafts([{ ...d, name: d.name || 'x', options: d.options.length ? d.options : [newOption()] }])[0] as ProductOptionGroup | undefined
  if (!g) return ''
  return describeRule({ ...g, max: Math.min(g.max, Math.max(count, 1)) })
}

export function OptionGroupsEditor({ value, onChange }: { value: GroupDraft[]; onChange: (v: GroupDraft[]) => void }) {
  const setGroup = (k: string, patch: Partial<GroupDraft>) => onChange(value.map(g => (g.key === k ? { ...g, ...patch } : g)))
  const setOption = (gk: string, ok: string, patch: Partial<OptionDraft>) =>
    onChange(value.map(g => (g.key === gk ? { ...g, options: g.options.map(o => (o.key === ok ? { ...o, ...patch } : o)) } : g)))

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-400 flex items-center gap-1.5"><ListChecks size={14} className="text-brand-300" /> Grupos de opções</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Ex.: Tamanho, Adicionais, Remover ingredientes, Molhos, Sabor.</p>
        </div>
        <button type="button" onClick={() => onChange([...value, newGroup()])}
          className="shrink-0 text-xs font-medium text-brand-300 hover:text-white flex items-center gap-1 rounded-lg border border-brand-500/30 px-2.5 py-1.5">
          <Plus size={13} /> Grupo
        </button>
      </div>

      {value.length === 0 && (
        <p className="rounded-xl border border-dashed border-card-border px-3 py-3 text-xs text-gray-500">
          Sem opções: o produto entra direto no pedido, como hoje.
        </p>
      )}

      {value.map((g, gi) => (
        <fieldset key={g.key} className="rounded-xl border border-card-border bg-surface-50/60 p-3 space-y-3 min-w-0">
          <legend className="sr-only">Grupo {gi + 1}</legend>
          <div className="flex gap-2">
            <input value={g.name} onChange={e => setGroup(g.key, { name: e.target.value })} maxLength={80}
              className="input text-sm flex-1 min-w-0" placeholder="Nome do grupo (ex.: Tamanho)" aria-label={`Nome do grupo ${gi + 1}`} />
            <button type="button" onClick={() => onChange(value.filter(x => x.key !== g.key))}
              className="shrink-0 rounded-lg border border-card-border px-2.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10" aria-label={`Remover grupo ${g.name || gi + 1}`}>
              <Trash2 size={15} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-card-border p-0.5" role="radiogroup" aria-label="Tipo de escolha">
              {([[false, 'Escolha única'], [true, 'Múltipla']] as const).map(([m, label]) => (
                <button key={label} type="button" role="radio" aria-checked={g.multiple === m}
                  onClick={() => setGroup(g.key, { multiple: m })}
                  className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition-colors', g.multiple === m ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white')}>
                  {label}
                </button>
              ))}
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
              <input type="checkbox" checked={g.required} onChange={e => setGroup(g.key, { required: e.target.checked })} className="accent-brand-500" />
              Obrigatório
            </label>
            {g.multiple && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <label htmlFor={`min-${g.key}`}>Mín.</label>
                <input id={`min-${g.key}`} type="number" min={0} value={g.min} onChange={e => setGroup(g.key, { min: e.target.value })}
                  className="input text-xs py-1 w-14 px-2" placeholder={g.required ? '1' : '0'} />
                <label htmlFor={`max-${g.key}`}>Máx.</label>
                <input id={`max-${g.key}`} type="number" min={1} value={g.max} onChange={e => setGroup(g.key, { max: e.target.value })}
                  className="input text-xs py-1 w-14 px-2" placeholder="todas" />
              </div>
            )}
          </div>
          <p className="text-[11px] text-gray-500 -mt-1">No pedido: {rulePreview(g)}</p>

          <div className="space-y-2">
            {g.options.map((o, oi) => (
              <div key={o.key} className={cn('flex flex-wrap sm:flex-nowrap gap-2 items-center', !o.available && 'opacity-60')}>
                <input value={o.name} onChange={e => setOption(g.key, o.key, { name: e.target.value })} maxLength={80}
                  className="input text-sm flex-1 min-w-0 basis-full sm:basis-auto" placeholder={`Opção ${oi + 1} (ex.: Bacon)`} aria-label={`Nome da opção ${oi + 1}`} />
                <div className="relative w-28 shrink-0">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-500 pointer-events-none">+R$</span>
                  <input value={o.price} onChange={e => setOption(g.key, o.key, { price: e.target.value })} inputMode="decimal"
                    className="input text-sm pl-9" placeholder="0,00" aria-label={`Preço adicional da opção ${o.name || oi + 1}`} />
                </div>
                <button type="button" onClick={() => setOption(g.key, o.key, { available: !o.available })}
                  aria-pressed={o.available} title={o.available ? 'Disponível' : 'Indisponível'}
                  className={cn('flex items-center gap-1 rounded-lg border px-2 py-2 text-xs shrink-0',
                    o.available ? 'border-emerald-400/30 text-emerald-300' : 'border-card-border text-gray-500')}>
                  {o.available ? <Eye size={14} /> : <EyeOff size={14} />}
                  <span className="sm:sr-only">{o.available ? 'Disponível' : 'Indisponível'}</span>
                </button>
                <button type="button" onClick={() => setGroup(g.key, { options: g.options.filter(x => x.key !== o.key) })}
                  className="shrink-0 px-1.5 text-gray-500 hover:text-red-400 ml-auto sm:ml-0" aria-label={`Remover opção ${o.name || oi + 1}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setGroup(g.key, { options: [...g.options, newOption()] })}
              className="text-xs text-brand-300 hover:text-white flex items-center gap-1">
              <Plus size={12} /> Adicionar opção
            </button>
          </div>
        </fieldset>
      ))}
    </div>
  )
}
