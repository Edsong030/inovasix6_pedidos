'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { InovasixLogo } from '@/components/brand/InovasixLogo'

const schema = z.object({
  email:          z.string().email('E-mail inválido'),
  password:       z.string().min(1, 'Senha obrigatória'),
  restaurantSlug: z.string().min(1, 'Slug do restaurante obrigatório'),
})
type FormData = z.infer<typeof schema>

function LoginForm() {
  const { login } = useAuth()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { restaurantSlug: 'restaurante-demo' },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try { await login(data.email, data.password, data.restaurantSlug) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      {/* Fundo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-brand-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">

        {/* ── Logo oficial Inovasix6 Pedidos ── */}
        <div className="flex justify-center mb-8">
          <InovasixLogo size="xl" />
        </div>

        {/* Card de login */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Entrar na plataforma</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Restaurante</label>
              <input
                {...register('restaurantSlug')}
                className="input"
                placeholder="slug-do-restaurante"
              />
              {errors.restaurantSlug && (
                <p className="text-red-400 text-xs mt-1">{errors.restaurantSlug.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">E-mail</label>
              <input
                {...register('email')}
                type="email"
                className="input"
                placeholder="seu@email.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 mt-2"
            >
              {loading
                ? <><LoadingSpinner size="sm" /> Entrando...</>
                : 'Entrar'}
            </button>
          </form>

          {/* Credenciais de demonstração */}
          <div className="mt-6 p-4 bg-surface-50 rounded-xl border border-card-border">
            <p className="text-xs font-medium text-gray-400 mb-2">Credenciais de demonstração:</p>
            <div className="space-y-1 text-xs text-gray-500">
              <p><span className="text-brand-400">Admin:</span> admin@inovasix.com / admin123</p>
              <p><span className="text-brand-400">Gerente:</span> gerente@inovasix.com / gerente123</p>
              <p><span className="text-brand-400">Cozinha:</span> cozinha@inovasix.com / cozinha123</p>
            </div>
          </div>
        </div>

        {/* Rodapé da tela de login */}
        <div className="flex justify-center mt-6">
          <InovasixLogo size="xs" className="opacity-40" />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  )
}
