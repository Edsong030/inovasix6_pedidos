'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EstablishmentForm } from '@/components/platform/EstablishmentForm'
import { apiMessage, platformApi, type EstablishmentForm as FormValues } from '@/lib/platform'
import type { EstablishmentDetail } from '@/types'

/** Detalhe da API → valores do formulário (campos vazios como texto vazio). */
function toForm(d: EstablishmentDetail): FormValues {
  return {
    name: d.name, slug: d.slug, businessType: d.businessType, document: d.document,
    ownerName: d.ownerName ?? '', email: d.email ?? '', phone: d.phone ?? '', whatsapp: d.whatsapp ?? '',
    zipCode: d.zipCode ?? '', street: d.street ?? '', number: d.number ?? '', complement: d.complement ?? '',
    district: d.district ?? '', city: d.city ?? '', state: d.state ?? '', active: d.active,
  }
}

function EditEstablishment() {
  const router = useRouter()
  // ?id= em vez de rota dinâmica: a demo estática (GitHub Pages) não gera páginas por id
  const id = useSearchParams().get('id') ?? ''
  const [initial, setInitial] = useState<FormValues | null>(null)

  useEffect(() => {
    if (!id) { router.replace('/platform/establishments'); return }
    platformApi.get(id)
      .then(({ data }) => setInitial(toForm(data)))
      .catch((err) => {
        toast.error(apiMessage(err, 'Estabelecimento não encontrado'))
        router.replace('/platform/establishments')
      })
  }, [id, router])

  const save = async (values: FormValues) => {
    try {
      const { slug: _slug, active: _active, ...data } = values
      await platformApi.update(id, data)
      toast.success('Estabelecimento atualizado')
      router.push('/platform/establishments')
    } catch (err) {
      toast.error(apiMessage(err, 'Não foi possível salvar'))
      throw err
    }
  }

  if (!initial) return <PageLoader />
  return (
    <div className="animate-fade-in max-w-4xl">
      <Header title="Editar estabelecimento" subtitle={initial.name} />
      <EstablishmentForm mode="edit" initial={initial} onSubmit={save} />
    </div>
  )
}

export default function EditEstablishmentPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <EditEstablishment />
    </Suspense>
  )
}
