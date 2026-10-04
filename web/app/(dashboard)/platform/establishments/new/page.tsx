'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { EstablishmentForm } from '@/components/platform/EstablishmentForm'
import { apiMessage, platformApi, type EstablishmentForm as FormValues, type InitialAdminForm } from '@/lib/platform'

/** Dados para repassar ao cliente (a senha é a que a própria equipe digitou; a API nunca a devolve). */
interface Credentials { name: string; slug: string; email: string; password: string }

export default function NewEstablishmentPage() {
  const [done, setDone] = useState<Credentials | null>(null)

  const create = async (values: FormValues, admin: InitialAdminForm | null) => {
    if (!admin) return
    try {
      const { data } = await platformApi.create(values, admin)
      toast.success('Estabelecimento cadastrado')
      setDone({ name: data.name, slug: data.slug, email: admin.email.trim(), password: admin.password })
    } catch (err) {
      toast.error(apiMessage(err, 'Não foi possível cadastrar o estabelecimento'))
      throw err
    }
  }

  if (done) {
    const text = `Acesso ao Inovasix6 Pedidos\nEstabelecimento: ${done.slug}\nE-mail: ${done.email}\nSenha inicial: ${done.password}`
    const copy = async () => {
      try { await navigator.clipboard.writeText(text); toast.success('Credenciais copiadas') }
      catch { toast.error('Não foi possível copiar') }
    }
    return (
      <div className="animate-fade-in max-w-xl">
        <Header title="Estabelecimento cadastrado" subtitle={done.name} />
        <div className="card panel-tech p-5 space-y-4">
          <p className="flex items-start gap-2 text-sm text-emerald-200">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            O estabelecimento e o administrador inicial foram criados. Entregue as credenciais ao cliente por um canal seguro.
          </p>
          <dl className="grid gap-3 rounded-xl border border-white/10 bg-white/2 p-4 text-sm">
            <div><dt className="text-xs text-gray-500">Estabelecimento (campo do login)</dt><dd className="font-mono text-white break-all">{done.slug}</dd></div>
            <div><dt className="text-xs text-gray-500">E-mail</dt><dd className="text-white break-all">{done.email}</dd></div>
            <div><dt className="text-xs text-gray-500">Senha inicial</dt><dd className="font-mono text-white break-all">{done.password}</dd></div>
          </dl>
          <div className="flex flex-wrap gap-3 justify-end">
            <button type="button" onClick={copy} className="btn-secondary max-sm:flex-1 max-sm:justify-center"><Copy size={16} /> Copiar credenciais</button>
            <Link href="/platform/establishments" className="btn-primary max-sm:flex-1 max-sm:justify-center">Ir para a lista</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-4xl">
      <Header title="Novo estabelecimento" subtitle="Cadastro do cliente e do primeiro administrador" />
      <EstablishmentForm mode="create" onSubmit={create} />
    </div>
  )
}
