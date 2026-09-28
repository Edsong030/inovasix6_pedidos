import type { CookieOptions, Request } from 'express';

/**
 * Sessão por cookie HttpOnly.
 *
 * • O JWT fica só no cookie `inx_session`: HttpOnly (o JavaScript da página não lê),
 *   Secure em produção, SameSite configurável (padrão Strict), Path /api.
 * • O token carrega apenas ids (sub = usuário, sid = sessão, rid = restaurante). Papel,
 *   status e restaurante são lidos do banco a cada requisição (JwtStrategy), então
 *   desativar, trocar senha ou papel tem efeito na requisição seguinte.
 */
export const SESSION_COOKIE = 'inx_session';
export const SESSION_COOKIE_PATH = '/api';

export interface SessionPayload {
  sub: string;
  sid: string;
  rid: string;
}

/** "8h", "30m", "2d", "3600s" ou segundos → milissegundos (padrão: 8 h). */
export function durationMs(value: string | undefined): number {
  const m = /^(\d+)\s*([smhd]?)$/.exec((value ?? '').trim());
  if (!m) return 8 * 3_600_000;
  const n = Number(m[1]);
  const unit = { '': 1_000, s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]]!;
  return n * unit;
}

function sameSite(): 'strict' | 'lax' | 'none' {
  const v = (process.env.COOKIE_SAMESITE ?? 'strict').toLowerCase();
  return v === 'lax' || v === 'none' ? v : 'strict';
}

export function sessionCookieOptions(maxAgeMs: number): CookieOptions {
  const secure = process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true';
  return {
    httpOnly: true,
    secure,
    // SameSite=None exige Secure; sem isso o navegador recusa o cookie
    sameSite: sameSite() === 'none' && !secure ? 'lax' : sameSite(),
    path: SESSION_COOKIE_PATH,
    maxAge: maxAgeMs,
    ...(process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN }),
  };
}

/** Opções para apagar o cookie (mesmo path/domínio, expirado). */
export function clearSessionCookieOptions(): CookieOptions {
  const { maxAge: _, ...rest } = sessionCookieOptions(0);
  return rest;
}

/** Lê um cookie do cabeçalho da requisição (sem depender de cookie-parser). */
export function readCookie(req: Pick<Request, 'headers'>, name: string): string | null {
  const header = req.headers?.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}
