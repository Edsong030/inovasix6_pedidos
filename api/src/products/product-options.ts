/**
 * Grupos de opções do produto ("Tamanho", "Adicionais", "Remover ingredientes"…)
 * e validação/preço das escolhas feitas no pedido. Regra definitiva: o preço do
 * item é sempre recalculado aqui, a partir do cadastro — nunca vem do navegador.
 * A mesma regra existe no frontend/demo (web/lib/productOptions.ts).
 */

export interface ProductOption {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

export interface ProductOptionGroup {
  id: string;
  name: string;
  /** Obrigatório: exige pelo menos `min` (≥ 1) escolhas */
  required: boolean;
  /** Mínimo de escolhas (obrigatório) / mínimo quando o cliente decide escolher (opcional) */
  min: number;
  /** Máximo de escolhas; escolha única ⇒ 1 */
  max: number;
  /** false = escolha única (rádio); true = múltipla */
  multiple: boolean;
  options: ProductOption[];
}

/** Snapshot gravado no item do pedido: nome e preço aplicados naquele momento. */
export interface ChosenOption {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
}

export const OPTION_LIMITS = { groups: 20, optionsPerGroup: 30, name: 80, id: 60, price: 99_999 };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Normaliza e valida a configuração enviada no cadastro do produto.
 * Retorna os grupos limpos ou a primeira mensagem de erro.
 */
export function normalizeOptionGroups(input: unknown): { groups: ProductOptionGroup[] } | { error: string } {
  if (input === null || input === undefined) return { groups: [] };
  if (!Array.isArray(input)) return { error: 'Grupos de opções inválidos' };
  if (input.length > OPTION_LIMITS.groups) return { error: `Máximo de ${OPTION_LIMITS.groups} grupos de opções por produto` };

  const groupIds = new Set<string>();
  const optionIds = new Set<string>();
  const groups: ProductOptionGroup[] = [];

  for (const raw of input as Array<Record<string, unknown>>) {
    const name = String(raw?.name ?? '').trim();
    const id = String(raw?.id ?? '').trim();
    if (!name) return { error: 'Todo grupo de opções precisa de um nome' };
    if (name.length > OPTION_LIMITS.name) return { error: `Nome do grupo "${name.slice(0, 20)}…" é muito longo` };
    if (!id || id.length > OPTION_LIMITS.id) return { error: `Grupo "${name}" sem identificador válido` };
    if (groupIds.has(id)) return { error: `Grupo "${name}" repetido` };
    groupIds.add(id);

    const rawOptions = Array.isArray(raw.options) ? (raw.options as Array<Record<string, unknown>>) : [];
    if (rawOptions.length === 0) return { error: `O grupo "${name}" precisa de pelo menos uma opção` };
    if (rawOptions.length > OPTION_LIMITS.optionsPerGroup) return { error: `Máximo de ${OPTION_LIMITS.optionsPerGroup} opções no grupo "${name}"` };

    const options: ProductOption[] = [];
    for (const o of rawOptions) {
      const oName = String(o?.name ?? '').trim();
      const oId = String(o?.id ?? '').trim();
      const price = Number(o?.price ?? 0);
      if (!oName) return { error: `Há uma opção sem nome no grupo "${name}"` };
      if (oName.length > OPTION_LIMITS.name) return { error: `Nome da opção "${oName.slice(0, 20)}…" é muito longo` };
      if (!oId || oId.length > OPTION_LIMITS.id) return { error: `Opção "${oName}" sem identificador válido` };
      if (optionIds.has(oId)) return { error: `Opção "${oName}" repetida no produto` };
      if (!Number.isFinite(price) || price < 0 || price > OPTION_LIMITS.price) return { error: `Preço inválido na opção "${oName}"` };
      optionIds.add(oId);
      options.push({ id: oId, name: oName, price: round2(price), available: o?.available !== false });
    }

    const multiple = raw.multiple === true;
    const required = raw.required === true;
    let min = Number.isInteger(raw.min) ? (raw.min as number) : 0;
    let max = Number.isInteger(raw.max) ? (raw.max as number) : (multiple ? options.length : 1);
    if (!multiple) max = 1;
    if (required) min = Math.max(1, min);
    if (min < 0 || max < 1) return { error: `Mínimo/máximo inválidos no grupo "${name}"` };
    if (max > options.length) return { error: `O grupo "${name}" permite até ${max} escolhas, mas tem ${options.length} opções` };
    if (min > max) return { error: `No grupo "${name}" o mínimo (${min}) é maior que o máximo (${max})` };

    groups.push({ id, name, required, min, max, multiple, options });
  }
  return { groups };
}

/** Lê os grupos gravados no produto (tolerante a dados antigos/inválidos). */
export function readOptionGroups(value: unknown): ProductOptionGroup[] {
  const r = normalizeOptionGroups(value);
  return 'groups' in r ? r.groups : [];
}

/**
 * Valida as escolhas de um item contra o cadastro do próprio produto e calcula
 * o acréscimo. Opções de outro produto (ou restaurante) simplesmente não existem aqui.
 */
export function resolveSelection(
  productName: string,
  groups: ProductOptionGroup[],
  optionIds: string[] | undefined,
): { extra: number; chosen: ChosenOption[] } | { error: string } {
  const ids = optionIds ?? [];
  if (new Set(ids).size !== ids.length) return { error: `Opção repetida em "${productName}"` };

  const byId = new Map<string, { group: ProductOptionGroup; option: ProductOption }>();
  for (const group of groups) for (const option of group.options) byId.set(option.id, { group, option });

  const chosen: ChosenOption[] = [];
  for (const id of ids) {
    const found = byId.get(id);
    if (!found) return { error: `Opção inválida para "${productName}"` };
    if (!found.option.available) return { error: `"${found.option.name}" está indisponível em "${productName}"` };
    chosen.push({
      groupId: found.group.id, groupName: found.group.name,
      optionId: found.option.id, optionName: found.option.name, price: found.option.price,
    });
  }

  for (const group of groups) {
    const count = chosen.filter((c) => c.groupId === group.id).length;
    if (group.required && count < group.min) {
      return { error: group.min === 1 ? `Escolha "${group.name}" em "${productName}"` : `Escolha pelo menos ${group.min} em "${group.name}" (${productName})` };
    }
    if (!group.required && count > 0 && count < group.min) {
      return { error: `Escolha pelo menos ${group.min} em "${group.name}" (${productName})` };
    }
    if (count > group.max) {
      return { error: group.max === 1 ? `Escolha só uma opção em "${group.name}" (${productName})` : `Escolha no máximo ${group.max} em "${group.name}" (${productName})` };
    }
  }

  // Ordem do cadastro (grupo, depois opção) para exibir sempre igual
  const order = new Map<string, number>();
  let i = 0;
  for (const g of groups) for (const o of g.options) order.set(o.id, i++);
  chosen.sort((a, b) => order.get(a.optionId)! - order.get(b.optionId)!);

  return { extra: round2(chosen.reduce((s, c) => s + c.price, 0)), chosen };
}
