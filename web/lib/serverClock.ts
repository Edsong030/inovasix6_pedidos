/**
 * Relógio do servidor: contagens de prazo usam o horário da API, não o do navegador.
 * A cada resposta da API, o cabeçalho Date ajusta a diferença (offset) em relação ao
 * relógio local. Na demo não há servidor e o offset fica 0.
 */
let offsetMs = 0

/** Chamado pelo cliente HTTP com o cabeçalho Date da resposta. */
export function syncServerClock(dateHeader: string | undefined | null) {
  if (!dateHeader) return
  const server = Date.parse(dateHeader)
  if (!Number.isFinite(server)) return
  const diff = server - Date.now()
  // O cabeçalho tem resolução de 1 s: ignora diferenças menores que isso
  offsetMs = Math.abs(diff) < 1500 ? 0 : diff
}

export function serverNow(): number {
  return Date.now() + offsetMs
}
