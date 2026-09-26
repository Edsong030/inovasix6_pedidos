import {
  DEFAULT_PREP_MINUTES, deadlineOf, effectivePrepMinutes, estimateReadyAt, timingState,
} from './order-timing';

const T0 = new Date('2026-09-26T12:00:00Z');
const at = (min: number) => new Date(T0.getTime() + min * 60000);

describe('Previsão de pronto', () => {
  it('usa o tempo médio do negócio a partir do horário informado (servidor)', () => {
    expect(estimateReadyAt(T0, 25)).toEqual(at(25));
    expect(estimateReadyAt(T0, 45)).toEqual(at(45));
  });

  it.each([[null], [undefined], [0], [-5], [241], [12.5], ['30'], [Number.NaN]])(
    'tempo inválido (%p) usa o padrão explícito de %d min', (v) => {
      expect(effectivePrepMinutes(v)).toBe(DEFAULT_PREP_MINUTES);
      expect(estimateReadyAt(T0, v)).toEqual(at(DEFAULT_PREP_MINUTES));
    },
  );

  it('encomenda: previsão é o horário combinado', () => {
    expect(estimateReadyAt(T0, 25, at(180))).toEqual(at(180));
  });

  it('pedido antigo sem previsão: criação + tempo configurado', () => {
    expect(deadlineOf({ createdAt: T0 }, 20)).toEqual(at(20));
    expect(deadlineOf({ createdAt: T0, estimatedReadyAt: at(40) }, 20)).toEqual(at(40));
  });
});

describe('Situação do pedido', () => {
  const order = { createdAt: T0, estimatedReadyAt: at(30) };

  it('no prazo', () => {
    expect(timingState(order, 30, at(10).getTime())).toMatchObject({ state: 'on_time', minutesLeft: 20, minutesLate: 0 });
  });
  it('próximo do prazo (≤ 5 min)', () => {
    expect(timingState(order, 30, at(26).getTime())).toMatchObject({ state: 'due_soon', minutesLeft: 4 });
    expect(timingState(order, 30, at(30).getTime())).toMatchObject({ state: 'due_soon', minutesLeft: 0 });
  });
  it('atrasado', () => {
    expect(timingState(order, 30, at(38).getTime())).toMatchObject({ state: 'late', minutesLate: 8, minutesLeft: 0 });
  });
  it('encomenda: "próximo do prazo" 1h antes', () => {
    const pre = { createdAt: T0, scheduledFor: at(180), estimatedReadyAt: at(180) };
    expect(timingState(pre, 30, at(100).getTime()).state).toBe('on_time');
    expect(timingState(pre, 30, at(130).getTime()).state).toBe('due_soon');
  });
});
