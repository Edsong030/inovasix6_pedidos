import { normalizeOptionGroups, resolveSelection, type ProductOptionGroup } from './product-options';

const burger: ProductOptionGroup[] = [
  { id: 'ponto', name: 'Ponto da carne', required: true, min: 1, max: 1, multiple: false, options: [
    { id: 'mal', name: 'Mal passado', price: 0, available: true },
    { id: 'ao-ponto', name: 'Ao ponto', price: 0, available: true },
  ] },
  { id: 'adicionais', name: 'Adicionais', required: false, min: 0, max: 2, multiple: true, options: [
    { id: 'bacon', name: 'Bacon', price: 5, available: true },
    { id: 'queijo', name: 'Queijo', price: 3.5, available: true },
    { id: 'ovo', name: 'Ovo', price: 2.5, available: false },
  ] },
];

describe('Configuração dos grupos (cadastro do produto)', () => {
  const group = (extra: Record<string, unknown> = {}) => ({
    id: 'g', name: 'Tamanho', required: true, min: 1, max: 1, multiple: false,
    options: [{ id: 'p', name: 'P', price: 0 }, { id: 'g2', name: 'G', price: 10 }], ...extra,
  });

  it('produto sem grupos continua válido', () => {
    expect(normalizeOptionGroups(undefined)).toEqual({ groups: [] });
    expect(normalizeOptionGroups([])).toEqual({ groups: [] });
  });

  it('normaliza: escolha única ⇒ máximo 1; obrigatório ⇒ mínimo ≥ 1; disponível por padrão', () => {
    const r = normalizeOptionGroups([group({ min: 0, max: 5 })]) as { groups: ProductOptionGroup[] };
    expect(r.groups[0]).toMatchObject({ min: 1, max: 1, multiple: false });
    expect(r.groups[0].options[0].available).toBe(true);
  });

  it.each([
    [[group({ name: '' })], 'nome'],
    [[group({ options: [] })], 'pelo menos uma opção'],
    [[group({ multiple: true, min: 3, max: 2 })], 'mínimo'],
    [[group({ multiple: true, max: 5 })], 'permite até 5'],
    [[group({ options: [{ id: 'p', name: 'P', price: -1 }] })], 'Preço inválido'],
    [[group(), group()], 'repetido'],
    [[group({ options: [{ id: 'x', name: 'A', price: 0 }, { id: 'x', name: 'B', price: 0 }] })], 'repetida'],
  ])('rejeita configuração inválida (%#)', (input, msg) => {
    const r = normalizeOptionGroups(input) as { error: string };
    expect(r.error).toContain(msg);
  });
});

describe('Escolhas do item e preço', () => {
  it('produto sem opções: acréscimo zero', () => {
    expect(resolveSelection('Refri', [], undefined)).toEqual({ extra: 0, chosen: [] });
  });

  it('calcula o acréscimo com os preços do cadastro e grava o snapshot', () => {
    const r = resolveSelection('X-Burger', burger, ['queijo', 'ao-ponto', 'bacon']) as { extra: number; chosen: { optionName: string; price: number }[] };
    expect(r.extra).toBe(8.5);
    expect(r.chosen.map((c) => c.optionName)).toEqual(['Ao ponto', 'Bacon', 'Queijo']);
    expect(r.chosen.find((c) => c.optionName === 'Bacon')!.price).toBe(5);
  });

  it('obrigatório não escolhido', () => {
    expect(resolveSelection('X-Burger', burger, ['bacon'])).toEqual({ error: 'Escolha "Ponto da carne" em "X-Burger"' });
  });

  it('limite máximo e escolha única', () => {
    expect((resolveSelection('X-Burger', burger, ['ao-ponto', 'mal']) as { error: string }).error).toContain('só uma opção');
    const three = [...burger];
    three[1] = { ...burger[1], options: [...burger[1].options, { id: 'cebola', name: 'Cebola', price: 1, available: true }] };
    expect((resolveSelection('X-Burger', three, ['ao-ponto', 'bacon', 'queijo', 'cebola']) as { error: string }).error).toContain('no máximo 2');
  });

  it('opção indisponível, repetida ou de outro produto', () => {
    expect((resolveSelection('X-Burger', burger, ['ao-ponto', 'ovo']) as { error: string }).error).toContain('indisponível');
    expect((resolveSelection('X-Burger', burger, ['ao-ponto', 'bacon', 'bacon']) as { error: string }).error).toContain('repetida');
    expect((resolveSelection('X-Burger', burger, ['ao-ponto', 'opcao-de-outro-produto']) as { error: string }).error).toContain('inválida');
  });
});
