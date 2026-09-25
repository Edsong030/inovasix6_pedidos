import { cn } from '@/lib/utils'
import { ORDER_STATUS_LABEL, ORDER_CHANNEL_LABEL, type OrderStatus, type OrderChannel } from '@/types'
import { STATUS_COLORS, CHANNEL_COLORS } from '@/lib/utils'

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn('badge border', STATUS_COLORS[status])}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  )
}

export function ChannelBadge({ channel }: { channel: OrderChannel }) {
  return (
    <span className={cn('badge', CHANNEL_COLORS[channel])}>
      {ORDER_CHANNEL_LABEL[channel]}
    </span>
  )
}
