import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

/**
 * Limite de tentativas de login (em memória, por instância da API).
 *
 * • Chave principal: IP + e-mail + estabelecimento — até MAX_PER_ACCOUNT falhas por janela.
 * • Teto por IP: até MAX_PER_IP falhas por janela, somando todos os e-mails (dificulta
 *   testar muitas contas a partir do mesmo IP).
 * • Enquanto bloqueado, responde 429 mesmo com a senha certa (não vira oráculo de senha).
 * • Login bem-sucedido zera a chave principal daquela conta.
 *
 * Com mais de uma instância da API, cada uma conta separadamente; para um limite global,
 * troque o Map por um armazenamento compartilhado (ex.: Redis).
 */
export const LOGIN_WINDOW_MS = 15 * 60_000;
export const MAX_PER_ACCOUNT = 5;
export const MAX_PER_IP = 30;
const MAX_KEYS = 50_000;

type Bucket = { count: number; resetAt: number };

@Injectable()
export class LoginRateLimiter {
  private buckets = new Map<string, Bucket>();

  /** Relógio (substituível nos testes). */
  now: () => number = () => Date.now();

  private keys(ip: string, email: string, slug: string) {
    const norm = (s: string) => (s ?? '').trim().toLowerCase();
    return { account: `a|${norm(ip)}|${norm(email)}|${norm(slug)}`, ip: `i|${norm(ip)}` };
  }

  private live(key: string): Bucket | null {
    const b = this.buckets.get(key);
    if (!b) return null;
    if (b.resetAt <= this.now()) {
      this.buckets.delete(key);
      return null;
    }
    return b;
  }

  /** Lança 429 se a conta (neste IP) ou o IP já estouraram o limite. */
  assertAllowed(ip: string, email: string, slug: string) {
    const k = this.keys(ip, email, slug);
    const blocked = [
      [this.live(k.account), MAX_PER_ACCOUNT],
      [this.live(k.ip), MAX_PER_IP],
    ].find(([b, max]) => b && (b as Bucket).count >= (max as number)) as [Bucket, number] | undefined;
    if (blocked) {
      const retryAfter = Math.max(1, Math.ceil((blocked[0].resetAt - this.now()) / 1000));
      throw new HttpException(
        { statusCode: 429, message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.', retryAfter },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  recordFailure(ip: string, email: string, slug: string) {
    if (this.buckets.size > MAX_KEYS) this.prune();
    const k = this.keys(ip, email, slug);
    for (const key of [k.account, k.ip]) {
      const b = this.live(key);
      if (b) b.count++;
      else this.buckets.set(key, { count: 1, resetAt: this.now() + LOGIN_WINDOW_MS });
    }
  }

  recordSuccess(ip: string, email: string, slug: string) {
    this.buckets.delete(this.keys(ip, email, slug).account);
  }

  private prune() {
    const now = this.now();
    for (const [k, b] of this.buckets) if (b.resetAt <= now) this.buckets.delete(k);
  }
}
