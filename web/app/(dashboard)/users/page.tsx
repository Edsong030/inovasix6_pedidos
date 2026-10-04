'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, UserX, Loader2, ShieldCheck } from 'lucide-react'
import api from '@/lib/api'
import { dataApi } from '@/hooks/useApi'
import { Header } from '@/components/layout/Header'
import { Modal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { ROLE_LABEL } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { MANAGEABLE_ROLES, canManageRole, passwordProblem } from '@/lib/permissions'
import type { AuthUser, UserRole } from '@/types'
import toast from 'react-hot-toast'

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN:     'bg-red-500/15 text-red-300 border-red-500/20',
  MANAGER:   'bg-purple-500/15 text-purple-300 border-purple-500/20',
  ATTENDANT: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  KITCHEN:   'bg-amber-500/15 text-amber-300 border-amber-500/20',
  DELIVERY:  'bg-teal-500/15 text-teal-300 border-teal-500/20',
  PLATFORM_ADMIN: 'bg-brand-500/15 text-brand-300 border-brand-500/20',
}

interface UserFormData {
  name: string; email: string; password: string; role: UserRole
}

function UserForm({
  initial, onSave, onCancel, roleOptions, lockRole,
}: {
  initial?: Partial<AuthUser>
  onSave: (data: UserFormData) => Promise<void>
  onCancel: () => void
  /** Papéis que quem está logado pode atribuir */
  roleOptions: readonly UserRole[]
  /** Editando o próprio usuário: o papel não pode ser alterado */
  lockRole: boolean
}) {
  const [name,    setName]    = useState(initial?.name || '')
  const [email,   setEmail]   = useState(initial?.email || '')
  const [password,setPassword]= useState('')
  const [role,    setRole]    = useState<UserRole>(initial?.role || roleOptions[roleOptions.length - 1] || 'ATTENDANT')
  const [saving,  setSaving]  = useState(false)

  // Senha nova (criação ou troca): mesma regra da API
  const pwError = password ? passwordProblem(password) : null

  const handle = async () => {
    if (!name || !email) return
    if (!initial?.id && !password) return
    if (pwError) return
    setSaving(true)
    try { await onSave({ name, email, password, role }) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome *</label>
        <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Nome completo" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">E-mail *</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="email@exemplo.com" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Senha {initial?.id ? '(deixe em branco para manter)' : '*'}
        </label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="Mínimo 10 caracteres, com letras e números" aria-invalid={!!pwError} />
        {pwError && <p className="mt-1 text-xs text-amber-300">{pwError}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Perfil *</label>
        <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="input disabled:opacity-60" disabled={lockRole}>
          {(lockRole ? [role] : roleOptions).map(v => (
            <option key={v} value={v}>{ROLE_LABEL[v]}</option>
          ))}
        </select>
        {lockRole && <p className="mt-1 text-xs text-gray-500">Você não pode alterar o próprio perfil.</p>}
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancelar</button>
        <button onClick={handle} disabled={!name || !email || (!initial?.id && !password) || !!pwError || saving} className="btn-primary flex-1 justify-center">
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {initial?.id ? 'Salvar' : 'Criar Usuário'}
        </button>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const [users,   setUsers]   = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [editUser,setEditUser]= useState<AuthUser | undefined>()
  const me = useAuth().user
  // Espelho da regra da API: MANAGER não altera ADMIN nem MANAGER; ninguém se desativa
  const roleOptions = me ? MANAGEABLE_ROLES[me.role] : []
  const canEdit       = (u: AuthUser) => !!me && (u.id === me.id || canManageRole(me.role, u.role))
  const canDeactivate = (u: AuthUser) => !!me && u.id !== me.id && canManageRole(me.role, u.role)

  const load = useCallback(async () => {
    try {
      const res = await dataApi.getUsers()
      setUsers(res.data)
    } catch { toast.error('Erro ao carregar usuários') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async (data: UserFormData) => {
    try {
      const payload: Record<string, unknown> = { ...data }
      if (!payload.password) delete payload.password
      if (editUser?.id) {
        await dataApi.updateUser(editUser.id, payload)
        toast.success('Usuário atualizado')
      } else {
        await dataApi.createUser(payload)
        toast.success('Usuário criado')
      }
      setModal(false); setEditUser(undefined); load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Erro ao salvar')
      throw err
    }
  }

  const deactivate = async (user: AuthUser) => {
    if (!confirm(`Desativar ${user.name}?`)) return
    await dataApi.updateUser(user.id, { active: false })
    toast.success('Usuário desativado'); load()
  }

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in">
      <Header
        title="Usuários"
        subtitle={`${users.length} usuário${users.length !== 1 ? 's' : ''} cadastrado${users.length !== 1 ? 's' : ''}`}
        onRefresh={load}
        actions={
          <button onClick={() => { setEditUser(undefined); setModal(true) }} className="btn-primary">
            <Plus size={16} /> Novo Usuário
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {users.map(user => (
          <div key={user.id} className={`card p-4 transition-all ${!user.active ? 'opacity-50' : ''}`}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-300 font-bold text-lg shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white truncate">{user.name}</p>
                  {!user.active && <span className="text-xs text-red-400">(inativo)</span>}
                </div>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                <span className={`badge border mt-1.5 ${ROLE_COLORS[user.role]}`}>
                  <ShieldCheck size={10} />
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {canEdit(user) && <button
                onClick={() => { setEditUser(user); setModal(true) }}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400 hover:text-white border border-card-border hover:bg-card-hover rounded-lg transition-colors"
              >
                <Pencil size={12} /> Editar
              </button>}
              {user.active && canDeactivate(user) && (
                <button
                  onClick={() => deactivate(user)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400 hover:text-red-400 border border-card-border hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <UserX size={12} /> Desativar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modal}
        onClose={() => { setModal(false); setEditUser(undefined) }}
        title={editUser ? 'Editar Usuário' : 'Novo Usuário'}
        size="sm"
      >
        <UserForm
          initial={editUser}
          onSave={save}
          onCancel={() => { setModal(false); setEditUser(undefined) }}
          roleOptions={roleOptions}
          lockRole={!!editUser && editUser.id === me?.id}
        />
      </Modal>
    </div>
  )
}
