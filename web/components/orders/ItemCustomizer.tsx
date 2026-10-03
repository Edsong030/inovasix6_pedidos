'use client'

import { useMemo, useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { cn, formatCurrency } from '@/lib/utils'
import { priceSuffix, quantityStep } from '@/lib/business'
import { describeRule, groupError, readOptionGroups, resolveSelection } from '@/lib/productOptions'
import type { Product } from '@/types'

export interface ItemChoice {
  quantity: number
  notes: string
  optionIds: string[]
}

/**
 * Personalização do item antes de entrar no carrinho (ou ao editar um item já adicionado).
 * O total é só uma prévia: a API recalcula o preço a partir do cadastro.
 */
export function ItemCustomizer({ product, initial, onConfirm, onClose }: {
  product: Product
  initial?: ItemChoice
  onConfirm: (choice: ItemChoice) => void
  onClose: () => void
}) {
  const groups = useMemo(() => readOptionGroups(product.optionGroups), [product.optionGroups])
  const step = quantityStep(product.saleUnit)
  const [selected, setSelected] = useState<string[]>(initial?.optionIds ?? [])
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1)
  const [tried, setTried] = useState(false)

  const countIn = (groupId: string) => {
    const ids = new Set(groups.find(g => g.id === groupId)?.options.map(o => o.id))
    return selected.filter(id => ids.has(id)).length
  }

  const toggle = (groupId: string, optionId: string) => {
    const group = groups.find(g => g.id === groupId)!
    const inGroup = new Set(group.options.map(o => o.id))
    setSelected(prev => {
      if (!group.multiple) return [...prev.filter(id => !inGroup.has(id)), optionId]
      if (prev.includes(optionId)) return prev.filter(id => id !== optionId)
      if (prev.filter(id => inGroup.has(id)).length >= group.max) return prev
      return [...prev, optionId]
    })
  }

  const addObservation = (text: string) => {
    const current = notes.trim()
    if (current.split(' · ').includes(text)) return
    setNotes(current ? `${current} · ${text}` : text)
  }

  const result = resolveSelection(product.name, groups, selected)
  const chosen = 'chosen' in result ? result.chosen : []
  const extra = chosen.reduce((s, c) => s + c.price, 0)
  const unit = Number(product.price) + extra
  const qtyValid = Number.isFinite(quantity) && quantity >= step && (product.saleUnit === 'KG' || Number.isInteger(quantity))
  const total = Math.round(unit * (qtyValid ? quantity : 0) * 100) / 100
  const isEdit = !!initial

  const confirm = () => {
    setTried(true)
    if ('error' in result || !qtyValid) return
    onConfirm({ quantity, notes: notes.trim(), optionIds: result.chosen.map(c => c.optionId) })
  }

  return (
    <Modal open onClose={onClose} title={product.name} size="lg">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-gray-400 min-w-0">{product.description}</p>
          <p className="shrink-0 text-sm text-gray-300 whitespace-nowrap">
            Preço base <span className="font-semibold text-white">{formatCurrency(Number(product.price))}{priceSuffix(product.saleUnit)}</span>
          </p>
        </div>

        {groups.map(group => {
          const count = countIn(group.id)
          const error = groupError(group, count)
          const showError = !!error && (tried || count > group.max)
          return (
            <fieldset key={group.id} className="min-w-0" aria-describedby={`rule-${group.id}`}>
              <legend className="w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">{group.name}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    group.required ? 'bg-amber-500/15 text-amber-200' : 'bg-white/5 text-gray-400')}>
                    {group.required ? 'Obrigatório' : 'Opcional'}
                  </span>
                  <span className="ml-auto text-xs text-gray-500 tabular-nums">{count}/{group.max}</span>
                </div>
                <p id={`rule-${group.id}`} className={cn('text-xs mt-0.5', showError ? 'text-red-300' : 'text-gray-500')}>
                  {showError ? error : describeRule(group).split(' · ')[1].replace(/^escolha/, 'Escolha')}
                </p>
              </legend>
              <div className="mt-2 grid gap-1.5">
                {group.options.map(option => {
                  const checked = selected.includes(option.id)
                  const full = group.multiple && !checked && count >= group.max
                  const disabled = !option.available || full
                  return (
                    <label key={option.id}
                      className={cn('flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                        checked ? 'border-brand-500/60 bg-brand-600/15' : 'border-card-border',
                        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-white/20')}>
                      <input
                        type={group.multiple ? 'checkbox' : 'radio'}
                        name={`grp-${group.id}`}
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(group.id, option.id)}
                        className="sr-only peer"
                      />
                      <span aria-hidden="true" className={cn('flex h-5 w-5 shrink-0 items-center justify-center border transition-colors',
                        group.multiple ? 'rounded-md' : 'rounded-full',
                        checked ? 'border-brand-400 bg-brand-600' : 'border-white/25',
                        'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500')}>
                        {checked && <Check size={13} className="text-white" />}
                      </span>
                      <span className="min-w-0 flex-1 text-gray-100">{option.name}</span>
                      <span className={cn('shrink-0 text-xs whitespace-nowrap', option.available ? 'text-gray-400' : 'text-gray-500')}>
                        {!option.available ? 'Indisponível' : option.price > 0 ? `+ ${formatCurrency(option.price)}` : 'sem custo'}
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )
        })}

        <div>
          <label htmlFor="item-notes" className="block text-sm font-semibold text-white mb-1.5">Observação do item</label>
          {!!product.observationOptions?.length && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {product.observationOptions.map(o => (
                <button key={o} type="button" onClick={() => addObservation(o)}
                  className="text-xs px-2.5 py-1 rounded-full border border-amber-400/25 text-amber-200/90 hover:border-amber-400/50">
                  {o}
                </button>
              ))}
            </div>
          )}
          <textarea id="item-notes" value={notes} onChange={e => setNotes(e.target.value)} maxLength={200} rows={2}
            className="input text-sm resize-none" placeholder="Ex.: sem sal, mensagem no bolo, cortar ao meio" />
          <p className="mt-1 text-right text-[11px] text-gray-600">{notes.length}/200</p>
        </div>

        {/* Resumo e confirmação — fixo no rodapé do modal */}
        <div className="sticky bottom-0 -mx-6 max-sm:-mx-4 px-6 max-sm:px-4 pt-3 pb-1 border-t border-card-border bg-card space-y-3">
          <div className="space-y-1 text-xs text-gray-400">
            <div className="flex justify-between gap-3"><span>Preço base</span><span className="tabular-nums">{formatCurrency(Number(product.price))}</span></div>
            {chosen.filter(c => c.price > 0).map(c => (
              <div key={c.optionId} className="flex justify-between gap-3"><span className="truncate">+ {c.optionName}</span><span className="tabular-nums">{formatCurrency(c.price)}</span></div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border border-card-border" role="group" aria-label="Quantidade">
              <button type="button" onClick={() => setQuantity(q => Math.max(step, Math.round((q - step) * 1000) / 1000))}
                className="p-2.5 text-gray-300 hover:text-white disabled:opacity-40" disabled={quantity <= step} aria-label="Diminuir quantidade">
                <Minus size={15} />
              </button>
              <input type="number" value={Number.isFinite(quantity) ? quantity : ''} min={step} step={step}
                onChange={e => setQuantity(e.target.value === '' ? NaN : Number(e.target.value))}
                className="w-14 bg-transparent text-center text-sm text-white outline-hidden" aria-label="Quantidade" />
              <button type="button" onClick={() => setQuantity(q => Math.round(((Number.isFinite(q) ? q : 0) + step) * 1000) / 1000)}
                className="p-2.5 text-gray-300 hover:text-white" aria-label="Aumentar quantidade">
                <Plus size={15} />
              </button>
            </div>
            <button type="button" onClick={confirm} className="btn-primary flex-1 justify-center py-2.5 whitespace-nowrap min-w-48">
              {isEdit ? 'Salvar item' : 'Adicionar'} · {formatCurrency(total)}
            </button>
          </div>
          {tried && ('error' in result || !qtyValid) && (
            <p role="alert" className="text-xs text-red-300">{'error' in result ? result.error : 'Quantidade inválida'}</p>
          )}
        </div>
      </div>
    </Modal>
  )
}
