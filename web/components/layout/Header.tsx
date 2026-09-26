'use client'

import { RefreshCw } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  onRefresh?: () => void
}

export function Header({ title, subtitle, actions, onRefresh }: HeaderProps) {
  return (
    // No mobile as ações quebram para a linha de baixo em vez de espremer o título
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5 md:mb-6">
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 max-md:ml-auto">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl border border-card-border hover:bg-card-hover text-gray-400 hover:text-white transition-all"
            title="Atualizar"
          >
            <RefreshCw size={16} />
          </button>
        )}
        {actions}
      </div>
    </div>
  )
}
