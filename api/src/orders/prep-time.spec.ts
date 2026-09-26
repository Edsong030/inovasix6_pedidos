import { averagePrepMinutes, prepMinutes } from './prep-time';

const T0 = Date.parse('2026-09-26T12:00:00Z');
const at = (min: number) => new Date(T0 + min * 60000);

describe('Tempo de preparo', () => {
  it('pedido válido: minutos do recebimento até pronto', () => {
    expect(prepMinutes({ createdAt: at(0), prepStartedAt: at(3), readyAt: at(25), deliveredAt: at(30) })).toBe(25);
    expect(prepMinutes({ createdAt: at(0), readyAt: at(12) })).toBe(12);
  });

  it.each([
    ['pronto antes de recebido (caso do seed antigo)', { createdAt: at(0), readyAt: at(-40) }],
    ['preparo antes de recebido', { createdAt: at(0), prepStartedAt: at(-5), readyAt: at(20) }],
    ['preparo depois de pronto', { createdAt: at(0), prepStartedAt: at(30), readyAt: at(20) }],
    ['entregue antes de pronto', { createdAt: at(0), readyAt: at(20), deliveredAt: at(10) }],
    ['sem horário de pronto', { createdAt: at(0), readyAt: null }],
    ['sem recebimento', { createdAt: null, readyAt: at(10) }],
    ['data ilegível', { createdAt: 'data-invalida', readyAt: at(10) }],
  ])('datas inválidas não geram tempo: %s', (_label, order) => {
    expect(prepMinutes(order)).toBeNull();
  });

  it('média usa só os válidos e nunca é negativa', () => {
    const orders = [
      { createdAt: at(0), prepStartedAt: at(2), readyAt: at(20) }, // 20
      { createdAt: at(0), prepStartedAt: at(5), readyAt: at(30) }, // 30
      { createdAt: at(0), readyAt: at(-40) }, // inválido (seria −40)
      { createdAt: at(0), readyAt: null }, // sem dados
    ];
    expect(averagePrepMinutes(orders)).toBe(25);
  });

  it('sem pedidos válidos → null (nunca 0)', () => {
    expect(averagePrepMinutes([])).toBeNull();
    expect(averagePrepMinutes([{ createdAt: at(0), readyAt: at(-21) }])).toBeNull();
  });
});
