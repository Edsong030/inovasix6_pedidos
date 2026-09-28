import axios from 'axios'
import { syncServerClock } from '@/lib/serverClock'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

/**
 * Modo API: a sessão é um cookie HttpOnly gravado pela própria API (o JavaScript não lê
 * nem envia token). withCredentials faz o navegador anexar o cookie nas chamadas.
 */
export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Checagem de sessão e login tratam o 401 por conta própria (sem redirecionar)
const NO_REDIRECT = ['/auth/me', '/auth/login', '/auth/logout']

api.interceptors.response.use(
  (res) => {
    // Alinha as contagens de prazo ao relógio do servidor
    syncServerClock(res.headers?.date)
    return res
  },
  (err) => {
    const url: string = err.config?.url ?? ''
    if (err.response?.status === 401 && typeof window !== 'undefined' && !NO_REDIRECT.some(p => url.endsWith(p))) {
      // Sessão encerrada no servidor (logout, usuário desativado, senha ou papel alterados)
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export default api
