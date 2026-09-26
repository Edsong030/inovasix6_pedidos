import { BusinessType } from '@prisma/client';

/** Paletas de destaque aceitas (as mesmas do frontend; todas com contraste AA). */
export const ACCENT_COLORS = ['inovasix', 'violet', 'cyan', 'emerald', 'rose', 'orange'] as const;

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface OpeningHour {
  day: number;
  open: boolean;
  opensAt: string;
  closesAt: string;
}

const HOURS_BY_TYPE: Record<BusinessType, { opensAt: string; closesAt: string; closed: number[] }> = {
  RESTAURANT:    { opensAt: '11:00', closesAt: '23:00', closed: [1] },
  SNACK_BAR:     { opensAt: '18:00', closesAt: '02:00', closed: [1] },
  CONFECTIONERY: { opensAt: '09:00', closesAt: '19:00', closed: [0] },
  JAPANESE:      { opensAt: '18:00', closesAt: '23:30', closed: [1] },
};

/** Horário padrão por tipo de negócio (0 = domingo … 6 = sábado). */
export function defaultOpeningHours(type: BusinessType): OpeningHour[] {
  const h = HOURS_BY_TYPE[type] ?? HOURS_BY_TYPE.RESTAURANT;
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    open: !h.closed.includes(day),
    opensAt: h.opensAt,
    closesAt: h.closesAt,
  }));
}

/** Nome de fábrica de cada tipo (o mesmo de web/lib/business.ts). */
export const DEFAULT_BUSINESS_NAMES: Record<BusinessType, string> = {
  RESTAURANT:    'Restaurante Demo',
  SNACK_BAR:     'Lanchonete Demo',
  CONFECTIONERY: 'Confeitaria Demo',
  JAPANESE:      'Japonês Demo',
};

export function isDefaultBusinessName(name: string): boolean {
  return Object.values(DEFAULT_BUSINESS_NAMES).includes((name ?? '').trim());
}

/** Valida CNPJ (14 dígitos + dígitos verificadores). */
export function isValidCnpj(value: string): boolean {
  const d = (value ?? '').replace(/\D/g, '');
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((s, w, i) => s + Number(d[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}
