/**
 * InovasixLogo — Componente oficial de marca Inovasix6 Pedidos.
 *
 * REGRA DE MARCA:
 *   Nunca usar emoji, ícone genérico, SVG recriado ou texto puro para
 *   representar a marca. Sempre usar este componente com a imagem oficial.
 *
 * Imagem oficial: /brand/inovasix6-pedidos-logo.png
 *   - Texto exato: "Inovasix6 PEDIDOS"
 *   - Visual: neon azul/roxo em fundo escuro
 *   - "I" maiúsculo claramente visível separado do "n"
 *
 * Variantes:
 *   "sidebar" → largura 180px fixa, altura auto, nunca cortada
 *   "full"    → altura fixa pelo `size`, largura auto (proporcional)
 */

'use client'

import { cn } from '@/lib/utils'
import { asset } from '@/lib/asset'

// ─── Tamanhos da variante "full" (altura em px) ───────────────────────────────
const FULL_SIZES = {
  xs:    28,
  sm:    40,
  md:    56,
  lg:    72,
  xl:   100,
  '2xl': 140,
} as const

type FullSize = keyof typeof FULL_SIZES

interface InovasixLogoFullProps {
  variant?: 'full'
  size?: FullSize
  className?: string
}
interface InovasixLogoSidebarProps {
  variant: 'sidebar'
  className?: string
}
type InovasixLogoProps = InovasixLogoFullProps | InovasixLogoSidebarProps

export function InovasixLogo(props: InovasixLogoProps) {
  // O asset() injeta o basePath correto em modo demo (GitHub Pages)
  const logoSrc = asset('/brand/inovasix6-pedidos-logo.png')

  if (props.variant === 'sidebar') {
    return (
      <div
        className={cn('flex items-center justify-center w-full flex-shrink-0', props.className)}
        style={{ minHeight: 80, padding: '4px 0' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt="Inovasix6 Pedidos"
          style={{
            width: 180, maxWidth: 190, height: 'auto',
            objectFit: 'contain', imageRendering: 'crisp-edges', display: 'block',
          }}
          loading="eager"
          decoding="sync"
        />
      </div>
    )
  }

  const h = FULL_SIZES[(props as InovasixLogoFullProps).size ?? 'md']

  return (
    <div className={cn('inline-flex items-center justify-center flex-shrink-0', props.className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt="Inovasix6 Pedidos"
        style={{
          height: h, width: 'auto', maxWidth: '100%',
          objectFit: 'contain', display: 'block',
        }}
        loading="eager"
        decoding="sync"
      />
    </div>
  )
}

export const InovasixSymbol = InovasixLogo
export default InovasixLogo
