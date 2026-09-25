import { cn } from '@/lib/utils'
import { InovasixLogo } from '@/components/brand/InovasixLogo'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-card-border border-t-brand-500',
        sizes[size], className,
      )}
    />
  )
}

/** Loader de página — logo + spinner centrados */
export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
      <InovasixLogo size="md" />
      <LoadingSpinner size="lg" />
    </div>
  )
}

/** Loader tela cheia */
export function FullPageLoader() {
  return (
    <div className="fixed inset-0 bg-surface z-50 flex flex-col items-center justify-center gap-8">
      <InovasixLogo size="xl" />
      <LoadingSpinner size="lg" />
      <p className="text-sm text-gray-500 animate-pulse2">Carregando...</p>
    </div>
  )
}
