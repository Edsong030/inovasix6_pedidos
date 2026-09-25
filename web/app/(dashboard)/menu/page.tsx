'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, Tag, Package } from 'lucide-react'
import api from '@/lib/api'
import { Header } from '@/components/layout/Header'
import { Modal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatCurrency, cn } from '@/lib/utils'
import type { Category, Product } from '@/types'
import toast from 'react-hot-toast'

// ─── Category Form ────────────────────────────────────────────────────────────
function CategoryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Category>
  onSave: (data: Partial<Category>) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName]         = useState(initial?.name || '')
  const [desc, setDesc]         = useState(initial?.description || '')
  const [order, setOrder]       = useState(String(initial?.sortOrder ?? 0))
  const [saving, setSaving]     = useState(false)

  const handle = async () => {
    if (!name.trim()) return
    setSaving(true)
    try { await onSave({ name: name.trim(), description: desc.trim() || undefined, sortOrder: parseInt(order) || 0 }) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome *</label>
        <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Ex: Pizzas, Bebidas..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Descrição</label>
        <input value={desc} onChange={e => setDesc(e.target.value)} className="input" placeholder="Descrição opcional" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Ordem de exibição</label>
        <input type="number" min={0} value={order} onChange={e => setOrder(e.target.value)} className="input" />
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancelar</button>
        <button onClick={handle} disabled={!name.trim() || saving} className="btn-primary flex-1 justify-center">
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {initial?.id ? 'Salvar' : 'Criar'}
        </button>
      </div>
    </div>
  )
}

// ─── Product Form ─────────────────────────────────────────────────────────────
function ProductForm({
  initial,
  categories,
  onSave,
  onCancel,
}: {
  initial?: Partial<Product>
  categories: Category[]
  onSave: (data: Partial<Product>) => Promise<void>
  onCancel: () => void
}) {
  const [name,     setName]     = useState(initial?.name || '')
  const [desc,     setDesc]     = useState(initial?.description || '')
  const [price,    setPrice]    = useState(String(initial?.price ?? ''))
  const [catId,    setCatId]    = useState(initial?.categoryId || (categories[0]?.id ?? ''))
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || '')
  const [available,setAvailable]= useState(initial?.available ?? true)
  const [saving,   setSaving]   = useState(false)

  const handle = async () => {
    if (!name.trim() || !price || !catId) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: desc.trim() || undefined,
        price: parseFloat(price),
        categoryId: catId,
        imageUrl: imageUrl.trim() || undefined,
        available,
      })
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome *</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Nome do produto" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Categoria *</label>
          <select value={catId} onChange={e => setCatId(e.target.value)} className="input text-sm">
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Preço (R$) *</label>
          <input
            type="number" min={0} step={0.01}
            value={price} onChange={e => setPrice(e.target.value)}
            className="input" placeholder="0,00"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Descrição</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} className="input h-16 resize-none" placeholder="Ingredientes, acompanhamentos..." />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">URL da Imagem</label>
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="input" placeholder="https://..." />
        </div>
        <div className="col-span-2 flex items-center gap-3">
          <button type="button" onClick={() => setAvailable(!available)} className="text-gray-400 hover:text-white">
            {available ? <ToggleRight size={24} className="text-brand-400" /> : <ToggleLeft size={24} />}
          </button>
          <span className="text-sm text-gray-300">{available ? 'Disponível no cardápio' : 'Indisponível'}</span>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancelar</button>
        <button onClick={handle} disabled={!name.trim() || !price || !catId || saving} className="btn-primary flex-1 justify-center">
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {initial?.id ? 'Salvar' : 'Criar Produto'}
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products,   setProducts]   = useState<Product[]>([])
  const [loading,    setLoading]    = useState(true)
  const [activeTab,  setActiveTab]  = useState<'categories' | 'products'>('products')
  const [selCat,     setSelCat]     = useState<string>('all')

  // Modals
  const [catModal,  setCatModal]  = useState(false)
  const [prodModal, setProdModal] = useState(false)
  const [editCat,   setEditCat]   = useState<Category | undefined>()
  const [editProd,  setEditProd]  = useState<Product | undefined>()

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([api.get('/categories'), api.get('/products')])
      setCategories(c.data)
      setProducts(p.data)
    } catch { toast.error('Erro ao carregar cardápio') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Category CRUD
  const saveCategory = async (data: Partial<Category>) => {
    if (editCat?.id) {
      await api.patch(`/categories/${editCat.id}`, data)
      toast.success('Categoria atualizada')
    } else {
      await api.post('/categories', data)
      toast.success('Categoria criada')
    }
    setCatModal(false)
    setEditCat(undefined)
    load()
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('Remover categoria? Os produtos serão afetados.')) return
    await api.delete(`/categories/${id}`)
    toast.success('Categoria removida')
    load()
  }

  // Product CRUD
  const saveProduct = async (data: Partial<Product>) => {
    if (editProd?.id) {
      await api.patch(`/products/${editProd.id}`, data)
      toast.success('Produto atualizado')
    } else {
      await api.post('/products', data)
      toast.success('Produto criado')
    }
    setProdModal(false)
    setEditProd(undefined)
    load()
  }

  const toggleAvailable = async (product: Product) => {
    await api.patch(`/products/${product.id}`, { available: !product.available })
    toast.success(product.available ? 'Produto desativado' : 'Produto ativado')
    load()
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Remover produto?')) return
    await api.delete(`/products/${id}`)
    toast.success('Produto removido')
    load()
  }

  const filteredProducts = selCat === 'all' ? products : products.filter(p => p.categoryId === selCat)
  const getCatName = (id: string) => categories.find(c => c.id === id)?.name || '—'

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in">
      <Header
        title="Cardápio"
        subtitle={`${categories.length} categorias · ${products.length} produtos`}
        onRefresh={load}
        actions={
          <div className="flex gap-2">
            {activeTab === 'categories' ? (
              <button onClick={() => { setEditCat(undefined); setCatModal(true) }} className="btn-primary">
                <Plus size={16} /> Nova Categoria
              </button>
            ) : (
              <button onClick={() => { setEditProd(undefined); setProdModal(true) }} className="btn-primary">
                <Plus size={16} /> Novo Produto
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-surface-100 p-1 rounded-xl w-fit border border-card-border">
        {([['products', 'Produtos', Package], ['categories', 'Categorias', Tag]] as const).map(([v, l, Icon]) => (
          <button
            key={v}
            onClick={() => setActiveTab(v)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === v ? 'bg-brand-600 text-white shadow-glow' : 'text-gray-400 hover:text-white',
            )}
          >
            <Icon size={15} /> {l}
          </button>
        ))}
      </div>

      {/* ── PRODUCTS TAB ─────────────────────────────────────────── */}
      {activeTab === 'products' && (
        <>
          {/* Category filter */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {[['all', 'Todos'], ...categories.map(c => [c.id, c.name])].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setSelCat(v)}
                className={cn(
                  'text-sm px-3 py-1.5 rounded-full border transition-colors',
                  selCat === v ? 'bg-brand-600 border-brand-500 text-white' : 'border-card-border text-gray-400 hover:text-white',
                )}
              >{l}</button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map(product => (
              <div key={product.id} className={cn('card p-4 transition-all', !product.available && 'opacity-50')}>
                {product.imageUrl && (
                  <div className="w-full h-28 rounded-xl overflow-hidden mb-3 bg-surface-50">
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-white text-sm leading-snug">{product.name}</p>
                  <span className="text-brand-400 font-bold text-sm flex-shrink-0">{formatCurrency(Number(product.price))}</span>
                </div>
                <p className="text-xs text-gray-500 mb-1">{getCatName(product.categoryId)}</p>
                {product.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{product.description}</p>}

                <div className="flex items-center gap-1 mt-auto">
                  <button
                    onClick={() => toggleAvailable(product)}
                    title={product.available ? 'Desativar' : 'Ativar'}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-card-border text-xs text-gray-400 hover:text-white hover:bg-card-hover transition-colors"
                  >
                    {product.available ? <ToggleRight size={14} className="text-brand-400" /> : <ToggleLeft size={14} />}
                    {product.available ? 'Ativo' : 'Inativo'}
                  </button>
                  <button
                    onClick={() => { setEditProd(product); setProdModal(true) }}
                    className="p-1.5 rounded-lg border border-card-border text-gray-400 hover:text-white hover:bg-card-hover transition-colors"
                  ><Pencil size={14} /></button>
                  <button
                    onClick={() => deleteProduct(product.id)}
                    className="p-1.5 rounded-lg border border-card-border text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  ><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                <Package size={40} className="mx-auto mb-3 opacity-30" />
                <p>Nenhum produto nesta categoria</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── CATEGORIES TAB ───────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center text-brand-400 font-bold text-lg flex-shrink-0">
                {cat.sortOrder}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">{cat.name}</p>
                {cat.description && <p className="text-xs text-gray-500">{cat.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 px-2 py-1 bg-surface-50 rounded-lg">
                  {cat._count?.products ?? 0} produtos
                </span>
                <button
                  onClick={() => { setEditCat(cat); setCatModal(true) }}
                  className="p-1.5 rounded-lg border border-card-border text-gray-400 hover:text-white hover:bg-card-hover transition-colors"
                ><Pencil size={14} /></button>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="p-1.5 rounded-lg border border-card-border text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                ><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Tag size={40} className="mx-auto mb-3 opacity-30" />
              <p>Nenhuma categoria criada</p>
            </div>
          )}
        </div>
      )}

      {/* Category Modal */}
      <Modal
        open={catModal}
        onClose={() => { setCatModal(false); setEditCat(undefined) }}
        title={editCat ? 'Editar Categoria' : 'Nova Categoria'}
        size="sm"
      >
        <CategoryForm
          initial={editCat}
          onSave={saveCategory}
          onCancel={() => { setCatModal(false); setEditCat(undefined) }}
        />
      </Modal>

      {/* Product Modal */}
      <Modal
        open={prodModal}
        onClose={() => { setProdModal(false); setEditProd(undefined) }}
        title={editProd ? 'Editar Produto' : 'Novo Produto'}
        size="md"
      >
        <ProductForm
          initial={editProd}
          categories={categories}
          onSave={saveProduct}
          onCancel={() => { setProdModal(false); setEditProd(undefined) }}
        />
      </Modal>
    </div>
  )
}
