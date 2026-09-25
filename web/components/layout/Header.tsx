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
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
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
