'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Search, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import api from '@/lib/api'
import { dataApi } from '@/hooks/useApi'
import { formatCurrency } from '@/lib/utils'
import { ORDER_CHANNEL_LABEL, PAYMENT_LABEL } from '@/types'
import type { Product, Category, Table } from '@/types'
import toast from 'react-hot-toast'

const schema = z.object({
  channel:       z.enum(['DELIVERY', 'DINE_IN', 'COUNTER', 'TAKEOUT']),
  paymentMethod: z.enum(['PIX', 'CARD', 'CASH']),
  tableId:       z.string().optional(),
  customerName:  z.string().optional(),
  customerPhone: z.string().optional(),
  deliveryAddress: z.string().optional(),
  notes:         z.string().optional(),
  discount:      z.number().min(0).optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity:  z.number().min(1),
    notes:     z.string().optional(),
  })).min(1, 'Adicione pelo menos um item'),
})
type FormData = z.infer<typeof schema>

interface NewOrderModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function NewOrderModal({ open, onClose, onCreated }: NewOrderModalProps) {
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
        items: [],
      },
    })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const channel   = watch('channel')
  const itemsW    = watch('items')
  const discountW = watch('discount') ?? 0

  useEffect(() => {
    if (!open) return
    Promise.all([
      dataApi.getProducts(),
      dataApi.getCategories(),
      dataApi.getTables(),
    ]).then(([p, c, t]) => {
      setProducts(p.data)
      setCategories(c.data)
      setTables((t.data as import('@/types').Table[]).filter((tb) => tb.status === 'AVAILABLE'))
    }).catch(() => {})
  }, [open])

  const filteredProducts = products.filter(p => {
    const matchCat = selCat === 'all' || p.categoryId === selCat
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch && p.available
  })

  const getProduct = useCallback((id: string) => products.find(p => p.id === id), [products])

  const subtotal = itemsW.reduce((sum, item) => {
    const p = getProduct(item.productId)
    return sum + (p ? Number(p.price) * item.quantity : 0)
  }, 0)
  const total = Math.max(0, subtotal - discountW)

  const addItem = (product: Product) => {
    const existing = fields.findIndex(f => f.productId === product.id)
    if (existing >= 0) {
      setValue(`items.${existing}.quantity`, itemsW[existing].quantity + 1)
    } else {
      append({ productId: product.id, quantity: 1, notes: '' })
    }
  }

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      await dataApi.createOrder(data as Record<string, unknown>)
      toast.success('Pedido criado com sucesso!')
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
    <Modal open={open} onClose={onClose} title="Novo Pedido" size="xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: order info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Canal *</label>
                <select {...register('channel')} className="input text-sm">
                  {Object.entries(ORDER_CHANNEL_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
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

            {channel === 'DELIVERY' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Endereço de Entrega</label>
                <input {...register('deliveryAddress')} className="input text-sm" placeholder="Rua, número, complemento" />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Observações</label>
              <textarea {...register('notes')} className="input text-sm h-16 resize-none" placeholder="Sem cebola, alergia..." />
            </div>

            {/* Items list */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Itens do Pedido</label>
              {fields.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4 border border-dashed border-card-border rounded-xl">
                  Selecione produtos ao lado →
                </p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {fields.map((field, idx) => {
                    const prod = getProduct(field.productId)
                    return (
                      <div key={field.id} className="flex items-center gap-2 bg-surface-50 rounded-lg p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{prod?.name}</p>
                          <p className="text-xs text-brand-400">{formatCurrency(Number(prod?.price || 0))}</p>
                        </div>
                        <input
                          type="number"
                          min={1}
                          {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                          className="w-14 input text-xs py-1 text-center"
                        />
                        <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-300 p-1">
                          <Trash2 size={14} />
                        </button>
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

            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[380px]">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addItem(product)}
                  className="w-full flex items-center justify-between p-3 bg-surface-50 hover:bg-card-hover border border-card-border rounded-xl transition-colors text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-brand-300">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{product.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className="text-sm font-semibold text-brand-400">{formatCurrency(Number(product.price))}</span>
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
            {saving ? <><Loader2 size={14} className="animate-spin" /> Criando...</> : 'Criar Pedido'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
