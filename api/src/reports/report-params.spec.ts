import { BadRequestException } from '@nestjs/common';
import { parseHistoryParams, parseSalesRange } from './report-params';

const bad = (fn: () => unknown, msg: RegExp) => {
  expect(fn).toThrow(BadRequestException);
  expect(fn).toThrow(msg);
};

describe('parâmetros de /reports/sales', () => {
  it('aceita intervalo válido (inclusive um único dia)', () => {
    expect(parseSalesRange('2026-09-01', '2026-09-30')).toEqual({ startDate: '2026-09-01', endDate: '2026-09-30' });
    expect(parseSalesRange('2026-09-27', '2026-09-27')).toEqual({ startDate: '2026-09-27', endDate: '2026-09-27' });
  });
  it('datas ausentes → 400 dizendo o que falta', () => {
    bad(() => parseSalesRange(undefined, undefined), /data inicial \(startDate\)/);
    bad(() => parseSalesRange('2026-09-01', undefined), /data final \(endDate\)/);
    bad(() => parseSalesRange('', '2026-09-30'), /Informe a data inicial/);
  });
  it('formato inválido → 400', () => {
    for (const v of ['27/09/2026', '2026-9-1', 'hoje', '2026-09-01T00:00:00Z', ['2026-09-01', '2026-09-02']]) {
      bad(() => parseSalesRange(v, '2026-09-30'), /formato AAAA-MM-DD/);
    }
  });
  it('data inexistente → 400', () => {
    bad(() => parseSalesRange('2026-02-30', '2026-03-01'), /inexistente/);
    bad(() => parseSalesRange('2026-09-01', '2026-13-01'), /inexistente/);
  });
  it('início depois do fim → 400', () => {
    bad(() => parseSalesRange('2026-09-30', '2026-09-01'), /Intervalo inválido/);
  });
});

describe('parâmetros de /reports/history', () => {
  it('usa padrões quando ausentes', () => {
    expect(parseHistoryParams({})).toEqual({ page: 1, limit: 20, status: undefined, channel: undefined });
  });
  it('aceita valores válidos', () => {
    expect(parseHistoryParams({ page: '2', limit: '15', status: 'DELIVERED', channel: 'IFOOD' }))
      .toEqual({ page: 2, limit: 15, status: 'DELIVERED', channel: 'IFOOD' });
  });
  it('recusa page/limit inválidos e enums desconhecidos', () => {
    bad(() => parseHistoryParams({ page: 'abc' }), /page inválido/);
    bad(() => parseHistoryParams({ page: '0' }), /page inválido/);
    bad(() => parseHistoryParams({ limit: '5000' }), /limit inválido/);
    bad(() => parseHistoryParams({ status: 'PAGO' }), /status inválido/);
    bad(() => parseHistoryParams({ channel: 'TELEGRAM' }), /channel inválido/);
  });
});
