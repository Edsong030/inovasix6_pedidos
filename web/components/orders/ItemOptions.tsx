import { formatCurrency, cn } from '@/lib/utils'
import { summarizeOptions } from '@/lib/productOptions'
import type { OrderItemOption } from '@/types'

/** Escolhas do item agrupadas: "Ponto da carne: Ao ponto" / "Adicionais: Bacon (+R$ 5,00)". */
export function ItemOptions({ options, className, showPrices = true }: {
  options?: Array<Pick<OrderItemOption, 'groupName' | 'optionName' | 'price'>>
  className?: string
  showPrices?: boolean
}) {
  const groups = summarizeOptions(
    showPrices ? options : options?.map(o => ({ ...o, price: 0 })),
    formatCurrency,
  )
  if (!groups.length) return null
  return (
    <ul className={cn('space-y-0.5 text-xs', className)}>
      {groups.map(g => (
        <li key={g.group} className="text-gray-300">
          <span className="text-gray-500">{g.group}:</span> {g.items.join(', ')}
        </li>
      ))}
    </ul>
  )
}
