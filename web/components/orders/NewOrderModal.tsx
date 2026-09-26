'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Search, Loader2, CalendarClock } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { dataApi } from '@/hooks/useApi'
import { useBusiness } from '@/hooks/useBusiness'
import { formatCurrency, cn } from '@/lib/utils'
import { priceSuffix, quantityStep } from '@/lib/business'
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
    addonIds:  z.array(z.string()).optional(),
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
  const [products,   setProducts]   = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tables,     setTables]     = useState<Table[]>([])
  const [search,     setSearch]     = useState('')
  const [selCat,     setSelCat]     = useState<string>('all')
  const [saving,     setSaving]     = useState(false)

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

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
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
    return matchCat && matchSearch && p.available
  })

  const getProduct = useCallback((id: string) => products.find(p => p.id === id), [products])

  const itemUnitPrice = (productId: string, addonIds?: string[]) => {
    const p = getProduct(productId)
    if (!p) return 0
    const addons = (addonIds ?? []).reduce((s, id) => s + (p.addons?.find(a => a.id === id)?.price ?? 0), 0)
    return Number(p.price) + addons
  }

  const subtotal = itemsW.reduce((sum, item) => sum + itemUnitPrice(item.productId, item.addonIds) * (item.quantity || 0), 0)
  const total = Math.max(0, subtotal - discountW)

  // Encomenda: obrigatória quando há produto sob encomenda; respeita a maior antecedência
  const cartProducts = itemsW.map(i => getProduct(i.productId)).filter((p): p is Product => !!p)
  const needsPreorder = cartProducts.some(p => p.madeToOrder)
  const leadHours = Math.max(0, ...cartProducts.map(p => (p.madeToOrder ? p.minLeadTimeHours ?? 0 : 0)))
  const isPreorder = needsPreorder || !!preorderW
  const minSchedule = toLocalInput(new Date(Date.now() + leadHours * 3_600_000))

  const addItem = (product: Product) => {
    const existing = fields.findIndex(f => f.productId === product.id)
    if (existing >= 0) {
      // Quilo soma 0,5 kg por clique; unidade e cento somam 1
      const increment = product.saleUnit === 'KG' ? 0.5 : 1
      setValue(`items.${existing}.quantity`, (itemsW[existing].quantity || 0) + increment)
    } else {
      append({ productId: product.id, quantity: 1, notes: '', addonIds: [] })
    }
  }

  const toggleAddon = (idx: number, addonId: string) => {
    const current = itemsW[idx]?.addonIds ?? []
    setValue(`items.${idx}.addonIds`, current.includes(addonId) ? current.filter(a => a !== addonId) : [...current, addonId])
  }

  const addObservation = (idx: number, text: string) => {
    const current = (itemsW[idx]?.notes ?? '').trim()
    if (current.split(' · ').includes(text)) return
    setValue(`items.${idx}.notes`, current ? `${current} · ${text}` : text)
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
        ...(i.addonIds?.length ? { addonIds: i.addonIds } : {}),
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
    <Modal open={open} onClose={onClose} title={isPreorder ? 'Nova Encomenda' : 'Novo Pedido'} size="xl">
      <form onSubmit={handleSubmit(onSubmit)}>
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
                <input
                  type="datetime-local"
                  {...register('scheduledFor')}
                  min={minSchedule}
                  className="input text-sm [color-scheme:dark]"
                  aria-label="Data e hora de retirada ou entrega"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Observações do pedido</label>
              <textarea {...register('notes')} className="input text-sm h-14 resize-none" placeholder="Alergias, troco, ponto de referência..." />
            </div>

            {/* Items list */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Itens do Pedido</label>
              {fields.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4 border border-dashed border-card-border rounded-xl">
                  Selecione produtos ao lado →
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {fields.map((field, idx) => {
                    const prod = getProduct(field.productId)
                    const selectedAddons = itemsW[idx]?.addonIds ?? []
                    return (
                      <div key={field.id} className="bg-surface-50 rounded-lg p-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white truncate">{prod?.name}</p>
                            <p className="text-xs text-brand-400">
                              {formatCurrency(itemUnitPrice(field.productId, selectedAddons))}{priceSuffix(prod?.saleUnit)}
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
                          {prod?.saleUnit === 'KG' && <span className="text-xs text-gray-500">kg</span>}
                          {prod?.saleUnit === 'HUNDRED' && <span className="text-xs text-gray-500">cento</span>}
                          <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-300 p-1" aria-label="Remover item">
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {!!prod?.addons?.length && (
                          <div className="flex flex-wrap gap-1">
                            {prod.addons.map(a => {
                              const on = selectedAddons.includes(a.id)
                              return (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => toggleAddon(idx, a.id)}
                                  aria-pressed={on}
                                  className={cn(
                                    'text-[11px] px-2 py-0.5 rounded-full border transition-colors',
                                    on ? 'bg-brand-600/30 border-brand-500/60 text-white' : 'border-card-border text-gray-400 hover:text-white',
                                  )}
                                >
                                  + {a.name} {formatCurrency(a.price)}
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {!!prod?.observationOptions?.length && (
                          <div className="flex flex-wrap gap-1">
                            {prod.observationOptions.map(o => (
                              <button
                                key={o}
                                type="button"
                                onClick={() => addObservation(idx, o)}
                                className="text-[11px] px-2 py-0.5 rounded-full border border-amber-400/20 text-amber-200/80 hover:text-amber-100 hover:border-amber-400/40 transition-colors"
                              >
                                {o}
                              </button>
                            ))}
                          </div>
                        )}

                        <input
                          {...register(`items.${idx}.notes`)}
                          className="input text-xs py-1"
                          placeholder="Observação do item (ex.: sem cebola)"
                        />
                      </div>
                    )
                  })}
                </div>
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
                  className="w-full flex items-center justify-between p-3 bg-surface-50 hover:bg-card-hover border border-card-border rounded-xl transition-colors text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-brand-300">{product.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {product.madeToOrder && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300">
                          Sob encomenda{product.minLeadTimeHours ? ` · ${product.minLeadTimeHours}h` : ''}
                        </span>
                      )}
                      {!!product.addons?.length && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-300">+ adicionais</span>
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
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving || fields.length === 0} className="btn-primary">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Criando...</> : isPreorder ? 'Registrar encomenda' : 'Criar Pedido'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
