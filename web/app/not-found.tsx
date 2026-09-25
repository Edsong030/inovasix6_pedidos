import Link from 'next/link'
import { InovasixLogo } from '@/components/brand/InovasixLogo'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        {/* Logo oficial */}
        <InovasixLogo size="lg" />

        {/* Erro */}
        <div>
          <p className="text-8xl font-black text-brand-600/20 leading-none select-none">404</p>
          <p className="text-xl font-semibold text-white mt-3">Página não encontrada</p>
          <p className="text-gray-400 mt-2 text-sm">
            A página que você procura não existe ou foi movida.
          </p>
          <Link href="/dashboard" className="btn-primary mt-6 mx-auto">
            Voltar ao Dashboard
          </Link>
        </div>

        {/* Rodapé */}
        <InovasixLogo size="xs" className="opacity-30 mt-4" />
      </div>
    </div>
  )
}
