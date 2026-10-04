'use client'

import { useState } from 'react'
import { Loader2, XCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { CANCEL_REASON_MAX, cancelReasonProblem } from '@/lib/orderCancellation'
import type { Order } from '@/types'

/**
 * Confirmação de cancelamento com motivo obrigatório. A página decide o que fazer com
 * a resposta: `onConfirm` devolve uma mensagem para exibir aqui (modal continua
 * aberto) ou null quando o fluxo terminou (sucesso ou 409, que recarrega os dados).
 * Use key={order.id}: cada pedido abre com o campo vazio.
 */
export function CancelOrderModal({
  order, onClose, onConfirm,
}: {
  order: Order | null
  onClose: () => void
  onConfirm: (reason: string) => Promise<string | null>
}) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const problem = cancelReasonProblem(reason)
  const length = reason.trim().length

  const close = () => { if (!submitting) onClose() }

  const confirm = async () => {
    setTouched(true)
    if (problem || submitting) return
    setSubmitting(true)
    setApiError(null)
    try { setApiError(await onConfirm(reason)) }
    finally { setSubmitting(false) }
  }

  return (
    <Modal open={!!order} onClose={close} title="Cancelar pedido" size="md">
      <form onSubmit={(e) => { e.preventDefault(); void confirm() }} className="space-y-4" noValidate>
        <p className="text-sm text-gray-300">
          {order && <span className="font-semibold text-white">Pedido #{order.orderNumber}. </span>}
          Informe o motivo do cancelamento.
        </p>

        <div>
          <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-300 mb-1.5">
            Motivo do cancelamento *
          </label>
          <textarea
            id="cancel-reason"
            className="input min-h-[96px] resize-y"
            value={reason}
            autoFocus
            rows={3}
            placeholder="Ex.: cliente desistiu, item em falta, pedido duplicado"
            aria-invalid={touched && !!problem}
            aria-describedby="cancel-reason-help"
            onChange={(e) => { setReason(e.target.value); setTouched(true); setApiError(null) }}
          />
          <div id="cancel-reason-help" className="mt-1 flex items-start justify-between gap-3 text-xs">
            <span className="text-red-400" role={touched && problem ? 'alert' : undefined}>
              {touched && problem ? problem : ''}
            </span>
            <span className={length > CANCEL_REASON_MAX ? 'text-red-400' : 'text-gray-500'}>
              {length}/{CANCEL_REASON_MAX}
            </span>
          </div>
        </div>

        {apiError && (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {apiError}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={close} disabled={submitting} className="btn-secondary max-sm:flex-1 max-sm:justify-center">
            Voltar
          </button>
          <button type="submit" disabled={!!problem || submitting} className="btn-danger max-sm:flex-1 max-sm:justify-center disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
            Confirmar cancelamento
          </button>
        </div>
      </form>
    </Modal>
  )
}
