import { InovasixLogo } from './InovasixLogo'
import { asset } from '@/lib/asset'

export function BrandFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 max-md:px-4 py-3 border-t border-card-border mt-auto no-print">
      <InovasixLogo size="xs" />
      <p className="text-xs text-gray-600">
        © {new Date().getFullYear()} · Todos os direitos reservados
      </p>
    </footer>
  )
}

/** Versão para impressão/comprovante — usa asset() para basePath correto */
export function BrandFooterPrint() {
  return (
    <div className="hidden print:flex items-center justify-between pt-4 mt-6 border-t border-gray-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset('/brand/inovasix6-pedidos-logo.png')}
        alt="Inovasix6 Pedidos"
        style={{ height: 28, width: 'auto' }}
      />
      <p style={{ fontSize: 10, color: '#9ca3af' }}>
        © {new Date().getFullYear()} Inovasix6 Pedidos
      </p>
    </div>
  )
}
