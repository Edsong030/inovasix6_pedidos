import { useEffect, useState } from 'react'
import { serverNow } from '@/lib/serverClock'

/** Horário do servidor, atualizado periodicamente (padrão: a cada 30 s). */
export function useServerNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => serverNow())
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
