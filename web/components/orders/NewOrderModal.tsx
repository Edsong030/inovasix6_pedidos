'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Search, Loader2, CalendarClock, TriangleAlert, MessageSquareText, Pencil, SlidersHorizontal } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { dataApi } from '@/hooks/useApi'
import { useBusiness } from '@/hooks/useBusiness'
import { useSettings } from '@/hooks/useSettings'
import { formatCurrency, cn } from '@/lib/utils'
import { priceSuffix, quantityStep } from '@/lib/business'
import { hasOptions, readOptionGroups, resolveSelection } from '@/lib/productOptions'
import { ItemCustomizer, type ItemChoice } from '@/components/orders/ItemCustomizer'
import { ItemOptions } from '@/components/orders/ItemOptions'
import { ORDER_CHANNEL_LABEL, PAYMENT_LABEL } from '@/types'
import type { Product, Category, Table } from '@/types'
import toast from 'react-hot-toast'

const schema = z.object({
  channel:       z.enum(['DELIVERY', 'DINE_IN', 'COUNTER', 'TAKEOUT', 'IFOOD', 'WHATSAPP']),
  paymentMethod: z.enum(['PIX', 'CARD', 'CASH']),
  tableId:       z.string().optional(),
  customerName:  z.string().optional(),
  customerPhone: z.string().optional(),
  deliveryAddress: z.string().optional(),
  notes:         z.string().optional(),
  discount:      z.number().min(0).optional(),
  isPreorder:    z.boolean().optional(),
  /** datetime-local (horário local) */
  scheduledFor:  z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity:  z.number().positive('Quantidade inválida'),
    notes:     z.string().optional(),
    optionIds: z.array(z.string()).optional(),
  })).min(1, 'Adicione pelo menos um item'),
})
type FormData = z.infer<typeof schema>

interface NewOrderModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

/** Valor para <input type="datetime-local"> no horário local. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function NewOrderModal({ open, onClose, onCreated }: NewOrderModalProps) {
  const business = useBusiness()
  const { settings } = useSettings()
  const paused = !!settings && !settings.acceptingOrders
  const [products,   setProducts]   = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tables,     setTables]     = useState<Table[]>([])
  const [search,     setSearch]     = useState('')
  const [selCat,     setSelCat]     = useState<string>('all')
  const [saving,     setSaving]     = useState(false)
  /** Personalização aberta: produto e, ao editar, a linha do carrinho */
  const [customizing, setCustomizing] = useState<{ product: Product; index: number | null } | null>(null)

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        channel: 'COUNTER',
        paymentMethod: 'PIX',
        discount: 0,
        isPreorder: false,
        items: [],
      },
    })

  const { fields, append, remove, update } = useFieldArray({ control, name: 'items' })
  const channel    = watch('channel')
  const itemsW     = watch('items')
  const discountW  = watch('discount') ?? 0
  const preorderW  = watch('isPreorder')

  useEffect(() => {
    if (!open) return
    Promise.all([
      dataApi.getProducts(),
      dataApi.getCategories(),
      dataApi.getTables(),
    ]).then(([p, c, t]) => {
      setProducts(p.data)
      setCategories(c.data)
      setTables((t.data as Table[]).filter((tb) => tb.status === 'AVAILABLE'))
    }).catch(() => {})
  }, [open])

  const filteredProducts = products.filter(p => {
    const matchCat = selCat === 'all' || p.categoryId === selCat
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    // Configurações → Operação: indisponíveis aparecem (desabilitados) só se o negócio quiser
    return matchCat && matchSearch && (p.available || !!settings?.showUnavailableProducts)
  })

  const getProduct = useCallback((id: string) => products.find(p => p.id === id), [products])

  /** Prévia do preço (a API recalcula tudo a partir do cadastro). */
  const itemSelection = (productId: string, optionIds?: string[]) => {
    const p = getProduct(productId)
    if (!p) return null
    const r = resolveSelection(p.name, readOptionGroups(p.optionGroups), optionIds)
    return { product: p, ...('error' in r ? { extra: 0, chosen: [], error: r.error } : { ...r, error: null }) }
  }
  const itemUnitPrice = (productId: string, optionIds?: string[]) => {
    const sel = itemSelection(productId, optionIds)
    return sel ? Number(sel.product.price) + sel.extra : 0
  }

  const subtotal = itemsW.reduce((sum, item) => sum + itemUnitPrice(item.productId, item.optionIds) * (item.quantity || 0), 0)
  const total = Math.max(0, subtotal - discountW)

  // Encomenda: obrigatória quando há produto sob encomenda; respeita a maior antecedência
  const cartProducts = itemsW.map(i => getProduct(i.productId)).filter((p): p is Product => !!p)
  const needsPreorder = cartProducts.some(p => p.madeToOrder)
  const leadHours = Math.max(0, ...cartProducts.map(p => (p.madeToOrder ? p.minLeadTimeHours ?? 0 : 0)))
  const isPreorder = needsPreorder || !!preorderW
  const minSchedule = toLocalInput(new Date(Date.now() + leadHours * 3_600_000))

  const addItem = (product: Product) => {
    // Com grupos de opções: personaliza antes de entrar no carrinho (cada escolha é uma linha)
    if (hasOptions(product.optionGroups)) { setCustomizing({ product, index: null }); return }
    // Sem opções: entra direto; clicar de novo soma à mesma linha (se ela não tem observação)
    const existing = itemsW.findIndex(i => i.productId === product.id && !i.notes?.trim() && !i.optionIds?.length)
    if (existing >= 0) {
      // Quilo soma 0,5 kg por clique; unidade e cento somam 1
      const increment = product.saleUnit === 'KG' ? 0.5 : 1
      setValue(`items.${existing}.quantity`, (itemsW[existing].quantity || 0) + increment)
    } else {
      append({ productId: product.id, quantity: 1, notes: '', optionIds: [] })
    }
  }

  const confirmCustomization = (choice: ItemChoice) => {
    if (!customizing) return
    const line = { productId: customizing.product.id, ...choice }
    if (customizing.index === null) append(line)
    else update(customizing.index, line)
    setCustomizing(null)
  }

  const onSubmit = async (data: FormData) => {
    if (isPreorder && !data.scheduledFor) {
      toast.error('Informe a data e hora de retirada/entrega da encomenda')
      return
    }
    for (const item of data.items) {
      const p = getProduct(item.productId)
      if (p && p.saleUnit !== 'KG' && !Number.isInteger(item.quantity)) {
        toast.error(`Quantidade de "${p.name}" deve ser um número inteiro`)
        return
      }
      // Escolhas ainda válidas para o cadastro atual (a API confere de novo)
      const sel = itemSelection(item.productId, item.optionIds)
      if (sel?.error) { toast.error(sel.error); return }
    }

    // Só envia o que a API conhece (ela rejeita campos extras)
    const payload: Record<string, unknown> = {
      channel: data.channel,
      paymentMethod: data.paymentMethod,
      discount: data.discount ?? 0,
      items: data.items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        ...(i.notes?.trim() ? { notes: i.notes.trim() } : {}),
        ...(i.optionIds?.length ? { optionIds: i.optionIds } : {}),
      })),
    }
    if (data.channel === 'DINE_IN' && data.tableId) payload.tableId = data.tableId
    if (data.customerName?.trim())    payload.customerName = data.customerName.trim()
    if (data.customerPhone?.trim())   payload.customerPhone = data.customerPhone.trim()
    if (data.deliveryAddress?.trim()) payload.deliveryAddress = data.deliveryAddress.trim()
    if (data.notes?.trim())           payload.notes = data.notes.trim()
    if (isPreorder && data.scheduledFor) {
      payload.isPreorder = true
      payload.scheduledFor = new Date(data.scheduledFor).toISOString()
    }

    setSaving(true)
    try {
      await dataApi.createOrder(payload)
      toast.success(isPreorder ? 'Encomenda registrada!' : 'Pedido criado com sucesso!')
      reset()
      onCreated()
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Erro ao criar pedido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    {/* Esc/fechar valem só para a personalização quando ela está aberta */}
    <Modal open={open} onClose={() => { if (!customizing) onClose() }} title={isPreorder ? 'Nova Encomenda' : 'Novo Pedido'} size="xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        {paused && (
          <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <TriangleAlert size={14} className="mt-0.5 flex-shrink-0" />
            O recebimento de pedidos está pausado em Configurações. Novos pedidos não podem ser registrados até um administrador ou gerente reativar.
          </p>
        )}
        {settings?.orderMessage && (
          <p className="mb-4 flex items-start gap-2 rounded-xl border border-brand-500/20 bg-brand-500/10 px-3 py-2 text-xs text-gray-200">
            <MessageSquareText size={14} className="mt-0.5 flex-shrink-0 text-brand-300" />
            {settings.orderMessage}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: order info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Origem *</label>
                <select {...register('channel')} className="input text-sm">
                  {business.channels.map(v => (
                    <option key={v} value={v}>{ORDER_CHANNEL_LABEL[v]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Pagamento *</label>
                <select {...register('paymentMethod')} className="input text-sm">
                  {Object.entries(PAYMENT_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            {channel === 'DINE_IN' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Mesa</label>
                <select {...register('tableId')} className="input text-sm">
                  <option value="">Selecione a mesa</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>Mesa {t.number}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Cliente</label>
                <input {...register('customerName')} className="input text-sm" placeholder="Nome do cliente" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Telefone</label>
                <input {...register('customerPhone')} className="input text-sm" placeholder="(11) 99999-9999" />
              </div>
            </div>

            {(channel === 'DELIVERY' || channel === 'IFOOD') && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Endereço de Entrega</label>
                <input {...register('deliveryAddress')} className="input text-sm" placeholder="Rua, número, complemento" />
              </div>
            )}

            {/* Encomenda */}
            <div className={cn('rounded-xl border p-3 space-y-2', isPreorder ? 'border-violet-400/30 bg-violet-500/[0.06]' : 'border-card-border')}>
              <label className="flex items-center gap-2 text-sm text-gray-200">
                <input
                  type="checkbox"
                  {...register('isPreorder')}
                  checked={isPreorder}
                  disabled={needsPreorder}
                  className="accent-brand-500"
                />
                <CalendarClock size={15} className="text-violet-300" />
                Encomenda com data de retirada/entrega
              </label>
              {needsPreorder && (
                <p className="text-xs text-violet-200/80">
                  Há produto sob encomenda no pedido{leadHours ? ` — antecedência mínima de ${leadHours}h` : ''}.
                </p>
              )}
              {isPreorder && (
                <DateTimePicker
                  value={watch('scheduledFor')}
                  onChange={v => setValue('scheduledFor', v, { shouldDirty: true })}
                  min={minSchedule}
                  aria-label="Data e hora de retirada ou entrega"
                />
              )}
            </div>

            <div>
              <label htmlFor="order-notes" className="block text-xs font-medium text-gray-400 mb-1">Observação geral do pedido</label>
              <textarea id="order-notes" {...register('notes')} maxLength={500} className="input text-sm h-14 resize-none" placeholder="Troco, alergias, ponto de referência… (vale para o pedido todo)" />
            </div>

            {/* Items list */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Itens do Pedido</label>
              {fields.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4 border border-dashed border-card-border rounded-xl">
                  <span className="md:hidden">Selecione produtos abaixo ↓</span>
                  <span className="max-md:hidden">Selecione produtos ao lado →</span>
                </p>
              ) : (
                <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {fields.map((field, idx) => {
                    const item = itemsW[idx] ?? field
                    const sel = itemSelection(field.productId, item.optionIds)
                    const prod = sel?.product
                    const unit = itemUnitPrice(field.productId, item.optionIds)
                    return (
                      <li key={field.id} className={cn('bg-surface-50 rounded-lg p-2.5 space-y-1.5', sel?.error && 'ring-1 ring-red-400/50')}>
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{prod?.name}</p>
                            <p className="text-xs text-brand-400 tabular-nums">
                              {formatCurrency(unit)}{priceSuffix(prod?.saleUnit)}
                              {(item.quantity || 0) !== 1 && <span className="text-gray-500"> · {formatCurrency(unit * (item.quantity || 0))}</span>}
                            </p>
                          </div>
                          <input
                            type="number"
                            min={quantityStep(prod?.saleUnit)}
                            step={quantityStep(prod?.saleUnit)}
                            {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                            className="w-16 input text-xs py-1 text-center"
                            aria-label={`Quantidade de ${prod?.name ?? 'item'}`}
                          />
                          {prod?.saleUnit === 'KG' && <span className="text-xs text-gray-500 self-center">kg</span>}
                          {prod?.saleUnit === 'HUNDRED' && <span className="text-xs text-gray-500 self-center">cento</span>}
                        </div>
                        <ItemOptions options={sel?.chosen} />
                        {item.notes?.trim() && <p className="text-xs text-amber-300/90">Obs.: {item.notes}</p>}
                        {sel?.error && <p className="text-xs text-red-300">{sel.error}</p>}
                        <div className="flex gap-3 pt-0.5">
                          <button type="button" onClick={() => prod && setCustomizing({ product: prod, index: idx })}
                            className="text-xs text-brand-300 hover:text-white flex items-center gap-1" aria-label={`Editar ${prod?.name ?? 'item'}`}>
                            <Pencil size={12} /> {hasOptions(prod?.optionGroups) ? 'Editar opções' : 'Observação'}
                          </button>
                          <button type="button" onClick={() => remove(idx)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 ml-auto" aria-label={`Remover ${prod?.name ?? 'item'}`}>
                            <Trash2 size={12} /> Remover
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              {errors.items && <p className="text-red-400 text-xs mt-1">{String(errors.items.message || '')}</p>}
            </div>

            {/* Totals */}
            <div className="bg-surface-50 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">Desconto (R$)</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  {...register('discount', { valueAsNumber: true })}
                  className="input text-xs py-1 w-24 ml-auto text-right"
                />
              </div>
              <div className="flex justify-between font-bold text-white border-t border-card-border pt-1.5">
                <span>Total</span><span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Right: product picker */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input text-sm pl-8"
                placeholder="Buscar produto..."
              />
            </div>

            <div className="flex gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelCat('all')}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selCat === 'all' ? 'bg-brand-600 border-brand-500 text-white' : 'border-card-border text-gray-400 hover:text-white'}`}
              >Todos</button>
              {categories.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelCat(c.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selCat === c.id ? 'bg-brand-600 border-brand-500 text-white' : 'border-card-border text-gray-400 hover:text-white'}`}
                >{c.name}</button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[520px]">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addItem(product)}
                  disabled={!product.available}
                  title={product.available ? undefined : 'Produto indisponível'}
                  className="w-full flex items-center justify-between p-3 bg-surface-50 hover:bg-card-hover border border-card-border rounded-xl transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-brand-300">{product.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {!product.available && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-300">Indisponível</span>
                      )}
                      {product.madeToOrder && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300">
                          Sob encomenda{product.minLeadTimeHours ? ` · ${product.minLeadTimeHours}h` : ''}
                        </span>
                      )}
                      {hasOptions(product.optionGroups) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-300 inline-flex items-center gap-1">
                          <SlidersHorizontal size={10} /> personalizável
                        </span>
                      )}
                      {product.description && (
                        <span className="text-xs text-gray-500 truncate">{product.description}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className="text-sm font-semibold text-brand-400 whitespace-nowrap">
                      {formatCurrency(Number(product.price))}{priceSuffix(product.saleUnit)}
                    </span>
                    <Plus size={16} className="text-gray-400 group-hover:text-brand-400" />
                  </div>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-8">Nenhum produto encontrado</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-card-border">
          <button type="button" onClick={onClose} className="btn-secondary max-sm:flex-1 max-sm:justify-center">Cancelar</button>
          <button type="submit" disabled={saving || fields.length === 0 || paused} className="btn-primary max-sm:flex-1 max-sm:justify-center">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Criando...</> : isPreorder ? 'Registrar encomenda' : 'Criar Pedido'}
          </button>
        </div>
      </form>
    </Modal>
    {customizing && (
      <ItemCustomizer
        key={`${customizing.product.id}-${customizing.index ?? 'novo'}`}
        product={customizing.product}
        initial={customizing.index !== null ? {
          quantity: itemsW[customizing.index]?.quantity ?? 1,
          notes: itemsW[customizing.index]?.notes ?? '',
          optionIds: itemsW[customizing.index]?.optionIds ?? [],
        } : undefined}
        onConfirm={confirmCustomization}
        onClose={() => setCustomizing(null)}
      />
    )}
    </>
  )
}
