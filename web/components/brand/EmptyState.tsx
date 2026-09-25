import { InovasixLogo } from './InovasixLogo'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?:        React.ReactNode
  title:        string
  description?: string
  action?:      React.ReactNode
  showBrand?:   boolean
  className?:   string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  showBrand = true,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {showBrand && (
        <InovasixLogo size="sm" className="mb-6 opacity-50" />
      )}
      {icon && <div className="mb-4 text-gray-600">{icon}</div>}
      <p className="text-lg font-semibold text-gray-300">{title}</p>
      {description && (
        <p className="text-sm text-gray-500 mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
