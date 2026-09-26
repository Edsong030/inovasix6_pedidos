'use client'

import { useState } from 'react'
import { CalendarClock, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  /** Valor no formato datetime-local (yyyy-MM-ddTHH:mm) */
  value?: string
  onChange: (value: string) => void
  /** Mínimo permitido, no mesmo formato de `value` */
  min?: string
  placeholder?: string
  'aria-label'?: string
}

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

function formatDisplay(value: string): string {
  const [date, time] = value.split('T')
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y} ${time}`
}

/**
 * Seletor de data e hora com confirmação explícita (botão OK).
 * O picker nativo de datetime-local não tem botão de confirmar no Chrome.
 */
export function DateTimePicker({ value, onChange, min, placeholder = 'Selecionar data e hora', ...rest }: DateTimePickerProps) {
  const [open,   setOpen]   = useState(false)
  const [date,   setDate]   = useState('')
  const [hour,   setHour]   = useState('12')
  const [minute, setMinute] = useState('00')

  const openPanel = () => {
    const base = value || min || ''
    const [d = '', t = '12:00'] = base.split('T')
    const [h, m] = t.split(':')
    setDate(d)
    setHour(h)
    // arredonda para o próximo múltiplo de 5 disponível na lista
    setMinute(String(Math.min(55, Math.ceil(Number(m) / 5) * 5)).padStart(2, '0'))
    setOpen(true)
  }

  const draft = date ? `${date}T${hour}:${minute}` : ''
  const tooEarly = !!(draft && min && draft < min)
  const minLabel = min ? formatDisplay(min) : ''

  const confirm = () => {
    if (!draft || tooEarly) return
    onChange(draft)
    setOpen(false)
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        className={cn('input text-sm flex items-center justify-between text-left', !value && 'text-gray-500')}
        aria-label={rest['aria-label']}
        aria-expanded={open}
      >
        <span>{value ? formatDisplay(value) : placeholder}</span>
        <CalendarClock size={15} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="rounded-xl border border-card-border bg-surface-50 p-3 space-y-3">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data</label>
              <input
                type="date"
                value={date}
                min={min?.split('T')[0]}
                onChange={e => setDate(e.target.value)}
                className="input text-sm [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Hora</label>
              <div className="flex items-center gap-1">
                <select value={hour} onChange={e => setHour(e.target.value)} className="input text-sm w-auto px-2">
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-gray-400">:</span>
                <select value={minute} onChange={e => setMinute(e.target.value)} className="input text-sm w-auto px-2">
                  {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {tooEarly && (
            <p className="text-xs text-red-400">Escolha um horário a partir de {minLabel}.</p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-sm px-3 py-1.5">
              <X size={14} /> Cancelar
            </button>
            <button type="button" onClick={confirm} disabled={!draft || tooEarly} className="btn-primary text-sm px-3 py-1.5">
              <Check size={14} /> OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
