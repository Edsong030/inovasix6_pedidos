/**
 * Estabelecimentos de demonstração do modo local/API: um restaurante (tenant) por tipo
 * de negócio, cada um com slug, usuários, cardápio, mesas e pedidos próprios.
 * Os cardápios seguem os da demo publicada (web/lib/demo). Dados fictícios.
 */
import { BusinessType, OrderChannel, OrderStatus, PaymentMethod, SaleUnit } from '@prisma/client';

export interface OptionGroupDef {
  id: string; name: string; required: boolean; min: number; max: number; multiple: boolean;
  options: { id: string; name: string; price: number; available: boolean }[];
}

/**
 * Grupo de opções. Obrigatório ⇒ escolha única (salvo `max`);
 * opcional ⇒ múltipla até `max` (padrão: todas). Opções: [id, nome, acréscimo].
 */
function og(
  id: string, name: string, options: Array<[string, string, number]>,
  rule: { required?: boolean; min?: number; max?: number } = {},
): OptionGroupDef {
  const required = !!rule.required;
  const max = rule.max ?? (required ? 1 : options.length);
  return {
    id, name, required, min: rule.min ?? (required ? 1 : 0), max, multiple: max > 1,
    options: options.map(([oid, oname, price]) => ({ id: oid, name: oname, price, available: true })),
  };
}

export interface ProductDef {
  key: string; cat: string; name: string; description: string; price: number; image: string;
  saleUnit?: SaleUnit; madeToOrder?: boolean; minLeadTimeHours?: number; available?: boolean;
  optionGroups?: OptionGroupDef[]; observationOptions?: string[];
}

export interface OrderDef {
  channel: OrderChannel; status: OrderStatus; pay: PaymentMethod; customer: string;
  /** Minutos atrás, em relação ao momento do seed */
  minutesAgo: number;
  /** [produto, quantidade, { opções, observação }] */
  items: Array<[string, number, { optionIds?: string[]; notes?: string }?]>;
  table?: string; phone?: string; address?: string; notes?: string; discount?: number;
  /** Encomenda: horas a partir de agora para retirada/entrega */
  scheduledInHours?: number;
  externalRef?: string;
}

export interface TenantDef {
  slug: string; name: string; businessType: BusinessType; avgPrepMinutes: number;
  phone: string; address: string;
  tables: Array<[number: string, capacity: number]>;
  categories: Array<[key: string, name: string, description: string]>;
  products: ProductDef[];
  /**
   * Pedidos de hoje: poucos exemplos intencionais de prazo (ver comentário em cada tenant).
   * Os horários são relativos ao seed: o "perto do prazo" vira atrasado ~5 min depois;
   * `npm run db:demo-reset -- --confirm` renova os horários.
   */
  orders: OrderDef[];
  /** Histórico dos dias anteriores (relatórios): pedidos por dia e horários de pico */
  history: { perDay: [min: number, max: number]; peaks: [number, number]; drinkCategory: string; channels: OrderChannel[] };
}

const IMG = '/demo/products/images';
const { DINE_IN, DELIVERY, COUNTER, TAKEOUT, IFOOD, WHATSAPP } = OrderChannel;
const { RECEIVED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED } = OrderStatus;
const { PIX, CARD, CASH } = PaymentMethod;

// ═══ RESTAURANTE ══════════════════════════════════════════════════════════════
const ACOMPANHAMENTO = og('acompanhamento', 'Acompanhamento',
  [['arroz-fritas', 'Arroz e batata frita', 0], ['pure', 'Purê de batata', 0], ['legumes', 'Legumes no vapor', 4]], { required: true });
const MOLHOS = og('molhos', 'Molhos extras',
  [['madeira-extra', 'Molho madeira extra', 5], ['chimichurri', 'Chimichurri', 4], ['gorgonzola', 'Molho gorgonzola', 6]], { max: 2 });

const RESTAURANT: TenantDef = {
  slug: 'restaurante-demo', name: 'Restaurante Demo', businessType: BusinessType.RESTAURANT, avgPrepMinutes: 30,
  phone: '(11) 99999-9999', address: 'Rua das Flores, 123 - São Paulo/SP',
  tables: [['01', 4], ['02', 4], ['03', 4], ['04', 6], ['05', 4], ['06', 4], ['07', 2], ['08', 8], ['Balcão', 8], ['Varanda', 6]],
  categories: [
    ['entradas', 'Entradas', 'Petiscos e entradas'],
    ['pratos', 'Pratos Principais', 'Pratos quentes e frios'],
    ['pizzas', 'Pizzas', 'Pizzas artesanais'],
    ['lanches', 'Lanches', 'Hambúrgueres e sanduíches'],
    ['bebidas', 'Bebidas', 'Refrigerantes, sucos e cervejas'],
    ['sobremesas', 'Sobremesas', 'Doces e sobremesas'],
  ],
  products: [
    { key: 'bruschetta', cat: 'entradas', name: 'Bruschetta de Tomate', description: 'Pão italiano com tomate, manjericão e azeite', price: 24.9, image: `${IMG}/bruschetta.jpg` },
    { key: 'bacalhau', cat: 'entradas', name: 'Bolinho de Bacalhau (8 un)', description: 'Bolinhos fritos com maionese de ervas', price: 32, image: `${IMG}/bolinho-bacalhau.jpg` },
    { key: 'frios', cat: 'entradas', name: 'Tábua de Frios', description: 'Queijos, frios e antepastos', price: 48, image: `${IMG}/tabua-de-frios.jpg` },
    { key: 'file', cat: 'pratos', name: 'Filé ao Molho Madeira', description: 'Filé mignon grelhado com batata e arroz', price: 58.9, image: `${IMG}/file-madeira.jpg`, optionGroups: [ACOMPANHAMENTO, MOLHOS] },
    { key: 'frango', cat: 'pratos', name: 'Frango Grelhado', description: 'Peito de frango grelhado com legumes', price: 42.9, image: `${IMG}/frango-grelhado.jpg`, optionGroups: [ACOMPANHAMENTO] },
    { key: 'moqueca', cat: 'pratos', name: 'Moqueca de Camarão', description: 'Camarão, leite de coco, dendê e arroz', price: 74.9, image: `${IMG}/moqueca-camarao.jpg` },
    { key: 'risoto', cat: 'pratos', name: 'Risoto de Funghi', description: 'Arroz arbóreo com cogumelos secos', price: 52.9, image: `${IMG}/risoto-funghi.jpg` },
    { key: 'margherita', cat: 'pizzas', name: 'Margherita', description: 'Molho de tomate, mussarela e manjericão', price: 45.9, image: `${IMG}/pizza-margherita.jpg` },
    { key: 'calabresa', cat: 'pizzas', name: 'Calabresa', description: 'Molho, calabresa fatiada e cebola', price: 42.9, image: `${IMG}/pizza-calabresa.jpg` },
    { key: 'frango-catupiry', cat: 'pizzas', name: 'Frango com Catupiry', description: 'Frango desfiado, catupiry e orégano', price: 48.9, image: `${IMG}/pizza-frango.jpg` },
    { key: '4queijos', cat: 'pizzas', name: 'Quatro Queijos', description: 'Mussarela, provolone, gorgonzola e parmesão', price: 52.9, image: `${IMG}/pizza-4queijos.jpg` },
    { key: 'classic', cat: 'lanches', name: 'Classic Burger', description: 'Hambúrguer 180g, queijo, alface e tomate', price: 32.9, image: `${IMG}/classic-burger.jpg` },
    { key: 'smash', cat: 'lanches', name: 'Smash Bacon', description: 'Duplo smash, bacon crocante e cheddar', price: 39.9, image: `${IMG}/smash-bacon.jpg` },
    { key: 'veggie', cat: 'lanches', name: 'Veggie Burger', description: 'Hambúrguer de grão-de-bico, rúcula e pesto', price: 34.9, image: `${IMG}/veggie-burger.jpg` },
    { key: 'coca', cat: 'bebidas', name: 'Coca-Cola Lata', description: '350ml', price: 6, image: `${IMG}/coca-cola.jpg` },
    { key: 'suco', cat: 'bebidas', name: 'Suco de Laranja Natural', description: '400ml natural', price: 12, image: `${IMG}/suco-laranja.jpg` },
    { key: 'agua', cat: 'bebidas', name: 'Água Mineral', description: '500ml com ou sem gás', price: 5, image: `${IMG}/agua-mineral.jpg` },
    { key: 'ipa', cat: 'bebidas', name: 'Cerveja Artesanal IPA', description: 'Long neck 355ml', price: 18, image: `${IMG}/cerveja-ipa.jpg` },
    { key: 'pilsen', cat: 'bebidas', name: 'Cerveja Pilsen', description: 'Lata 350ml', price: 8, image: `${IMG}/cerveja-pilsen.jpg` },
    { key: 'petit', cat: 'sobremesas', name: 'Petit Gateau', description: 'Bolo de chocolate quente com sorvete', price: 22.9, image: `${IMG}/petit-gateau.jpg` },
    { key: 'pudim', cat: 'sobremesas', name: 'Pudim de Leite', description: 'Pudim caseiro com calda de caramelo', price: 14.9, image: `${IMG}/pudim-de-leite.jpg` },
    { key: 'cheesecake', cat: 'sobremesas', name: 'Cheesecake de Morango', description: 'Base de biscoito, recheio cremoso e calda', price: 19.9, image: `${IMG}/cheesecake.jpg` },
  ],
  // Tempo médio 30 min: 1 atrasado (6 min), 1 perto do prazo (faltam 5), 2 no prazo
  orders: [
    { channel: DINE_IN, status: PREPARING, pay: CARD, customer: 'Mesa 01', table: '01', minutesAgo: 36,
      items: [['file', 1, { optionIds: ['pure', 'chimichurri'] }], ['coca', 2], ['bruschetta', 1], ['pudim', 1]] },
    { channel: DELIVERY, status: RECEIVED, pay: PIX, customer: 'Maria Silva', phone: '(11) 98765-4321', address: 'Av. Paulista, 1000 - Apto 52', minutesAgo: 25, discount: 5,
      items: [['margherita', 1], ['coca', 2], ['petit', 1], ['suco', 1]] },
    { channel: COUNTER, status: READY, pay: CASH, customer: 'João Paulo', minutesAgo: 28, items: [['smash', 1], ['ipa', 2]] },
    { channel: TAKEOUT, status: DELIVERED, pay: PIX, customer: 'Fernanda Costa', phone: '(11) 91234-5678', minutesAgo: 65, items: [['moqueca', 1], ['agua', 2]] },
    { channel: DELIVERY, status: OUT_FOR_DELIVERY, pay: CARD, customer: 'Roberto Alves', phone: '(11) 97654-3210', address: 'Rua Augusta, 500 - Apto 12', minutesAgo: 50, discount: 10,
      items: [['4queijos', 1], ['calabresa', 1], ['pilsen', 4]] },
    { channel: DINE_IN, status: PREPARING, pay: CARD, customer: 'Mesa 04', table: '04', minutesAgo: 12,
      items: [['frango', 2, { optionIds: ['arroz-fritas'] }], ['risoto', 1], ['suco', 2]] },
    { channel: COUNTER, status: RECEIVED, pay: PIX, customer: 'Carla Mendes', minutesAgo: 4, items: [['bacalhau', 2]] },
  ],
  history: { perDay: [6, 10], peaks: [12, 19], drinkCategory: 'bebidas', channels: [DINE_IN, DINE_IN, DELIVERY, DELIVERY, COUNTER, TAKEOUT] },
};

// ═══ LANCHONETE ═══════════════════════════════════════════════════════════════
const PONTO = og('ponto', 'Ponto da carne', [['mal', 'Mal passado', 0], ['ao-ponto', 'Ao ponto', 0], ['bem', 'Bem passado', 0]], { required: true });
const BURGER_EXTRAS = og('adicionais', 'Adicionais', [['bacon', 'Bacon extra', 5], ['queijo', 'Queijo extra', 3.5], ['ovo', 'Ovo', 2.5], ['molho', 'Molho extra', 2]], { max: 3 });
const REMOVER = og('remover', 'Remover ingredientes', [['sem-cebola', 'Sem cebola', 0], ['sem-tomate', 'Sem tomate', 0], ['sem-picles', 'Sem picles', 0], ['sem-maionese', 'Sem maionese', 0]]);
const BURGER = [PONTO, BURGER_EXTRAS, REMOVER];
const BURGER_OBS = ['Pão bem tostado', 'Molho à parte', 'Cortar ao meio'];
const HOTDOG = [og('adicionais', 'Adicionais', [['salsicha', 'Salsicha extra', 4], ['cheddar', 'Cheddar', 3], ['molho', 'Molho extra', 2]])];
const ACAI = [og('complementos', 'Complementos', [
  ['granola', 'Granola', 2], ['leite-cd', 'Leite condensado', 2.5], ['morango', 'Morango', 3],
  ['banana', 'Banana', 2], ['pacoca', 'Paçoca', 2.5], ['nutella', 'Creme de avelã', 5],
], { max: 4 })];

const SNACK_BAR: TenantDef = {
  slug: 'lanchonete-demo', name: 'Lanchonete Demo', businessType: BusinessType.SNACK_BAR, avgPrepMinutes: 15,
  phone: '(11) 98888-0000', address: 'Avenida Paulista, 900 - São Paulo/SP',
  tables: [['01', 4], ['02', 4], ['03', 4], ['04', 4], ['05', 4]],
  categories: [
    ['burgers', 'Hambúrgueres', 'Artesanais e smash'],
    ['dogs', 'Hot dogs', 'Dogs prensados'],
    ['porcoes', 'Porções', 'Para compartilhar'],
    ['combos', 'Combos', 'Lanche + batata + bebida'],
    ['acai', 'Açaí', 'Monte do seu jeito'],
    ['bebidas', 'Bebidas', 'Refrigerantes e sucos'],
    ['sobremesas', 'Sobremesas', 'Doces e milkshakes'],
  ],
  products: [
    { key: 'x-burger', cat: 'burgers', name: 'X-Burger', description: 'Pão brioche, burger 150g e queijo', price: 24.9, image: `${IMG}/classic-burger.jpg`, optionGroups: BURGER, observationOptions: BURGER_OBS },
    { key: 'x-salada', cat: 'burgers', name: 'X-Salada', description: 'Burger 150g, queijo, alface e tomate', price: 26.9, image: `${IMG}/x-salada.webp`, optionGroups: BURGER, observationOptions: BURGER_OBS },
    { key: 'smash', cat: 'burgers', name: 'Smash Bacon', description: 'Dois smash 90g, cheddar e bacon', price: 32.9, image: `${IMG}/smash-bacon.jpg`, optionGroups: BURGER, observationOptions: BURGER_OBS },
    { key: 'veggie', cat: 'burgers', name: 'Veggie Burger', description: 'Burger de grão-de-bico e pesto', price: 29.9, image: `${IMG}/veggie-burger.jpg`,
      optionGroups: [og('adicionais', 'Adicionais', [['queijo', 'Queijo extra', 3.5], ['ovo', 'Ovo', 2.5], ['molho', 'Molho extra', 2]]), REMOVER], observationOptions: ['Molho à parte'] },
    { key: 'dog-completo', cat: 'dogs', name: 'Hot Dog Completo', description: 'Salsicha dupla, purê, milho e batata palha', price: 18.9, image: `${IMG}/hot-dog-completo.webp`, optionGroups: HOTDOG, observationOptions: ['Sem purê', 'Sem milho', 'Sem batata palha', 'Molho à parte'] },
    { key: 'dog-simples', cat: 'dogs', name: 'Hot Dog Simples', description: 'Salsicha, molho e batata palha', price: 12.9, image: `${IMG}/hot-dog-simples.webp`, optionGroups: HOTDOG, observationOptions: ['Sem batata palha', 'Molho à parte'] },
    { key: 'batata', cat: 'porcoes', name: 'Batata Frita', description: 'Porção 400g, crocante', price: 22.9, image: `${IMG}/batata-frita.webp`, optionGroups: [og('adicionais', 'Adicionais', [['cheddar-bacon', 'Cheddar e bacon', 8]])], observationOptions: ['Sal à parte', 'Bem sequinha'] },
    { key: 'onion', cat: 'porcoes', name: 'Onion Rings', description: 'Anéis de cebola empanados', price: 24.9, image: `${IMG}/onion-rings.webp`, observationOptions: ['Molho à parte'] },
    { key: 'combo-familia', cat: 'combos', name: 'Combo Família', description: '4 X-Burger, batata grande e refri 2 L', price: 89.9, image: `${IMG}/combo-familia.webp`, observationOptions: ['Trocar refri por suco', 'Sem cebola'] },
    { key: 'combo-smash', cat: 'combos', name: 'Combo Smash', description: 'Smash Bacon, batata e refri lata', price: 44.9, image: `${IMG}/combo-smash.webp`, optionGroups: BURGER, observationOptions: BURGER_OBS },
    { key: 'acai-500', cat: 'acai', name: 'Açaí 500 ml', description: 'Açaí puro batido na hora', price: 22, image: `${IMG}/acai-500.webp`, optionGroups: ACAI, observationOptions: ['Adicionais à parte', 'Pouco açúcar'] },
    { key: 'acai-300', cat: 'acai', name: 'Açaí 300 ml', description: 'Açaí puro batido na hora', price: 16, image: `${IMG}/acai-300.webp`, optionGroups: ACAI, observationOptions: ['Adicionais à parte'] },
    { key: 'cola', cat: 'bebidas', name: 'Refrigerante cola', description: 'Lata 350 ml, servido no copo com gelo', price: 6, image: `${IMG}/refrigerante-cola.webp`, observationOptions: ['Com gelo e limão'] },
    { key: 'guarana', cat: 'bebidas', name: 'Refrigerante guaraná', description: 'Lata 350 ml, servido no copo com gelo', price: 5.5, image: `${IMG}/refrigerante-guarana.webp` },
    { key: 'suco', cat: 'bebidas', name: 'Suco de Laranja', description: '400 ml natural', price: 10, image: `${IMG}/suco-laranja.jpg`, observationOptions: ['Sem açúcar', 'Sem gelo'] },
    { key: 'agua', cat: 'bebidas', name: 'Água Mineral', description: '500 ml com ou sem gás', price: 4, image: `${IMG}/agua-mineral.jpg` },
    { key: 'brownie', cat: 'sobremesas', name: 'Brownie com Sorvete', description: 'Brownie quente e sorvete de creme', price: 16.9, image: `${IMG}/brownie-sorvete.webp` },
    { key: 'milkshake', cat: 'sobremesas', name: 'Milkshake', description: 'Chocolate, morango ou baunilha — 400 ml', price: 17.9, image: `${IMG}/milkshake.webp`, observationOptions: ['Chocolate', 'Morango', 'Baunilha'] },
  ],
  // Tempo médio 15 min: 1 atrasado (6 min), 1 perto do prazo (faltam 5), 1 no prazo
  orders: [
    { channel: COUNTER, status: PREPARING, pay: CARD, customer: 'Lucas Martins', minutesAgo: 21,
      items: [['x-burger', 2, { optionIds: ['ao-ponto', 'bacon', 'sem-cebola'] }], ['batata', 1], ['cola', 2]] },
    { channel: IFOOD, status: RECEIVED, pay: PIX, customer: 'Cliente iFood', minutesAgo: 10, externalRef: 'IFD-4821', address: 'Rua das Flores, 120 - Centro',
      items: [['combo-familia', 1, { notes: 'Trocar refri por suco' }]] },
    { channel: WHATSAPP, status: READY, pay: PIX, customer: 'Carla Mendes', phone: '(11) 98888-1234', minutesAgo: 22,
      items: [['acai-500', 2, { notes: 'Adicionais à parte', optionIds: ['granola', 'leite-cd'] }]] },
    { channel: DELIVERY, status: OUT_FOR_DELIVERY, pay: CARD, customer: 'Diego Rocha', address: 'Av. Brasil, 845 - Apto 31', minutesAgo: 35,
      items: [['smash', 1, { optionIds: ['mal', 'queijo'] }], ['dog-completo', 1, { notes: 'Sem purê' }], ['guarana', 2]] },
    { channel: DINE_IN, status: DELIVERED, pay: CASH, customer: 'Mesa 02', table: '02', minutesAgo: 60, items: [['x-salada', 1, { optionIds: ['bem'] }], ['suco', 1]] },
    { channel: COUNTER, status: RECEIVED, pay: PIX, customer: 'Rafael Gomes', minutesAgo: 2,
      items: [['dog-completo', 2, { notes: 'Sem batata palha', optionIds: ['cheddar'] }], ['cola', 2]] },
  ],
  history: { perDay: [9, 15], peaks: [12, 19], drinkCategory: 'bebidas', channels: [COUNTER, COUNTER, IFOOD, IFOOD, DELIVERY, WHATSAPP, DINE_IN, TAKEOUT] },
};

// ═══ CONFEITARIA ══════════════════════════════════════════════════════════════
const CONFECTIONERY: TenantDef = {
  slug: 'confeitaria-demo', name: 'Confeitaria Demo', businessType: BusinessType.CONFECTIONERY, avgPrepMinutes: 45,
  phone: '(11) 97777-0000', address: 'Rua Augusta, 450 - São Paulo/SP',
  tables: [['01', 2], ['02', 2], ['03', 2]],
  categories: [
    ['bolos', 'Bolos', 'Por quilo, vitrine e encomenda'],
    ['tortas', 'Tortas', 'Fatias e inteiras'],
    ['doces', 'Doces', 'Unidade e cento'],
    ['salgados', 'Salgados', 'Unidade e cento'],
    ['kits', 'Kits', 'Kits festa sob encomenda'],
    ['bebidas', 'Bebidas', 'Cafés e sucos'],
  ],
  products: [
    { key: 'bolo-chocolate', cat: 'bolos', name: 'Bolo de Chocolate', description: 'Massa de cacau e recheio de brigadeiro — vitrine', price: 89.9, saleUnit: SaleUnit.KG, image: `${IMG}/bolo-chocolate.webp`, observationOptions: ['Escrever mensagem', 'Sem cobertura'] },
    { key: 'bolo-aniversario', cat: 'bolos', name: 'Bolo de Aniversário', description: 'Escolha tamanho e recheio; mensagem no bolo na observação', price: 99.9, madeToOrder: true, minLeadTimeHours: 48, image: `${IMG}/bolo-aniversario.webp`,
      optionGroups: [
        og('tamanho', 'Tamanho', [['p', 'P · 1 kg (10 fatias)', 0], ['m', 'M · 2 kg (20 fatias)', 90], ['g', 'G · 3 kg (30 fatias)', 180]], { required: true }),
        og('recheio', 'Recheio', [['brigadeiro', 'Brigadeiro', 0], ['ninho-morango', 'Ninho com morango', 15], ['doce-leite', 'Doce de leite com nozes', 12]], { required: true }),
        og('extras', 'Extras', [['topo', 'Topo personalizado', 25], ['vela', 'Vela de número', 6], ['morango', 'Morangos frescos', 18]]),
      ],
      observationOptions: ['Mensagem no bolo:', 'Tema da festa:', 'Sem lactose'] },
    { key: 'bolo-cenoura', cat: 'bolos', name: 'Bolo de Cenoura (fatia)', description: 'Com cobertura de chocolate', price: 12.9, image: `${IMG}/bolo-cenoura.webp` },
    { key: 'torta-fatia', cat: 'tortas', name: 'Torta de Morango (fatia)', description: 'Creme, morangos e base crocante', price: 14.9, image: `${IMG}/torta-morango-fatia.webp` },
    { key: 'torta-inteira', cat: 'tortas', name: 'Torta de Morango inteira', description: 'Aproximadamente 1,8 kg — 16 fatias', price: 139.9, madeToOrder: true, minLeadTimeHours: 24, image: `${IMG}/torta-morango-inteira.webp`, observationOptions: ['Mensagem na torta'] },
    { key: 'brigadeiro-cento', cat: 'doces', name: 'Brigadeiro Gourmet', description: 'Cento — chocolate belga', price: 180, saleUnit: SaleUnit.HUNDRED, madeToOrder: true, minLeadTimeHours: 48, image: `${IMG}/brigadeiro.webp`, observationOptions: ['Forminha dourada', 'Sabores sortidos'] },
    { key: 'brigadeiro-un', cat: 'doces', name: 'Brigadeiro Gourmet (unidade)', description: 'Chocolate belga', price: 3.5, image: `${IMG}/brigadeiro.webp` },
    { key: 'beijinho', cat: 'doces', name: 'Beijinho', description: 'Cento — coco fresco', price: 170, saleUnit: SaleUnit.HUNDRED, madeToOrder: true, minLeadTimeHours: 48, image: `${IMG}/beijinho.webp` },
    { key: 'pudim', cat: 'doces', name: 'Pudim de Leite', description: 'Pudim caseiro com calda de caramelo', price: 14.9, image: `${IMG}/pudim-de-leite.jpg` },
    { key: 'mini-salgados', cat: 'salgados', name: 'Mini Salgados', description: 'Cento — croquete, bolinha de queijo e risoles', price: 120, saleUnit: SaleUnit.HUNDRED, madeToOrder: true, minLeadTimeHours: 24, image: `${IMG}/mini-salgados.webp`, observationOptions: ['Sem pimenta', 'Fritar na hora da retirada'] },
    { key: 'croquete', cat: 'salgados', name: 'Croquete (unidade)', description: 'Croquete de carne crocante', price: 7.5, image: `${IMG}/croquete.webp` },
    { key: 'kit-10', cat: 'kits', name: 'Kit Festa 10 pessoas', description: 'Bolo 1,5 kg + 50 doces + 50 salgados', price: 239.9, madeToOrder: true, minLeadTimeHours: 72, image: `${IMG}/kit-festa-10.webp`,
      optionGroups: [og('extras', 'Extras', [['topo', 'Topo personalizado', 25]])], observationOptions: ['Tema da festa', 'Mensagem no bolo'] },
    { key: 'kit-20', cat: 'kits', name: 'Kit Festa 20 pessoas', description: 'Bolo 3 kg + 100 doces + 100 salgados', price: 419.9, madeToOrder: true, minLeadTimeHours: 72, image: `${IMG}/kit-festa-20.webp`,
      optionGroups: [og('extras', 'Extras', [['topo', 'Topo personalizado', 25]])], observationOptions: ['Tema da festa', 'Mensagem no bolo'] },
    { key: 'espresso', cat: 'bebidas', name: 'Café Espresso', description: '60 ml', price: 6, image: `${IMG}/cafe-espresso.webp` },
    { key: 'cappuccino', cat: 'bebidas', name: 'Cappuccino', description: '200 ml com canela', price: 9.5, image: `${IMG}/cappuccino.webp`, observationOptions: ['Sem canela', 'Leite sem lactose'] },
    { key: 'suco', cat: 'bebidas', name: 'Suco de Laranja', description: '400 ml natural', price: 10, image: `${IMG}/suco-laranja.jpg` },
    { key: 'agua', cat: 'bebidas', name: 'Água Mineral', description: '500 ml com ou sem gás', price: 4, image: `${IMG}/agua-mineral.jpg` },
  ],
  // Tempo médio 45 min: 1 atrasado (6 min), 1 perto do prazo (faltam 5), encomendas no prazo
  orders: [
    { channel: WHATSAPP, status: RECEIVED, pay: PIX, customer: 'Mariana Lopes', phone: '(11) 97777-5566', minutesAgo: 20, scheduledInHours: 50, notes: 'Retirada na loja',
      items: [['bolo-aniversario', 1, { notes: 'Mensagem no bolo: Parabéns, Alice! · Tema da festa: unicórnio', optionIds: ['m', 'ninho-morango', 'topo', 'vela'] }], ['brigadeiro-cento', 1, { notes: 'Forminha dourada' }]] },
    { channel: COUNTER, status: DELIVERED, pay: CARD, customer: 'Balcão', minutesAgo: 50, items: [['torta-fatia', 2], ['cappuccino', 2, { notes: 'Sem canela' }]] },
    { channel: COUNTER, status: READY, pay: CASH, customer: 'Henrique Dias', minutesAgo: 12, items: [['croquete', 4], ['suco', 1]] },
    { channel: WHATSAPP, status: PREPARING, pay: PIX, customer: 'Isabela Pinto', phone: '(11) 96666-2211', minutesAgo: 95, scheduledInHours: 2,
      items: [['mini-salgados', 2, { notes: 'Metade sem pimenta' }], ['beijinho', 1]] },
    { channel: TAKEOUT, status: RECEIVED, pay: CARD, customer: 'Felipe Nunes', minutesAgo: 40, items: [['bolo-chocolate', 1.2, { notes: 'Escrever mensagem: Feliz aniversário, pai' }]] },
    { channel: DELIVERY, status: PREPARING, pay: PIX, customer: 'Gabriela Reis', address: 'Rua Harmonia, 77 - Casa 2', minutesAgo: 40, scheduledInHours: 4,
      items: [['kit-10', 1, { notes: 'Tema da festa: futebol', optionIds: ['topo'] }]] },
    { channel: COUNTER, status: PREPARING, pay: PIX, customer: 'Ana Souza', minutesAgo: 51, items: [['bolo-cenoura', 2], ['espresso', 2]] },
  ],
  history: { perDay: [5, 9], peaks: [10, 15], drinkCategory: 'bebidas', channels: [COUNTER, COUNTER, WHATSAPP, WHATSAPP, TAKEOUT, DELIVERY] },
};

// ═══ JAPONÊS ══════════════════════════════════════════════════════════════════
const TEMAKI = [og('adicionais', 'Adicionais', [
  ['cream', 'Cream cheese', 3], ['cebolinha', 'Cebolinha extra', 1], ['tare', 'Molho tarê', 2], ['crispy', 'Crispy de alho-poró', 2.5],
], { max: 3 })];
const JP_OBS = ['Sem cebolinha', 'Sem gergelim', 'Shoyu light', 'Wasabi à parte'];
const COMBO = [
  og('molho-extra', 'Molho extra', [['shoyu', 'Shoyu extra', 1.5], ['gengibre', 'Gengibre extra', 1.5], ['tare', 'Molho tarê', 2]], { max: 2 }),
  og('hashis', 'Hashis', [['hashi-1', '1 par', 0], ['hashi-2', '2 pares', 0], ['sem-hashi', 'Sem hashi', 0]], { required: true }),
];

const JAPANESE: TenantDef = {
  slug: 'japones-demo', name: 'Japonês Demo', businessType: BusinessType.JAPANESE, avgPrepMinutes: 35,
  phone: '(11) 96666-0000', address: 'Rua Galvão Bueno, 88 - São Paulo/SP',
  tables: [['01', 4], ['02', 4], ['03', 4], ['04', 4], ['05', 4], ['06', 4]],
  categories: [
    ['entradas', 'Entradas', 'Para começar'],
    ['sushis', 'Sushis e sashimis', 'Niguiri, uramaki e sashimi'],
    ['temakis', 'Temakis', 'Cone de alga com arroz'],
    ['combinados', 'Combinados', 'Barcas e combinados'],
    ['quentes', 'Pratos quentes', 'Yakisoba, lámen e teppan'],
    ['bebidas', 'Bebidas', 'Chás, refrigerantes e saquê'],
    ['sobremesas', 'Sobremesas', 'Doces japoneses'],
  ],
  products: [
    { key: 'guioza', cat: 'entradas', name: 'Guioza (6 un.)', description: 'Pastel japonês de carne suína grelhado', price: 24.9, image: `${IMG}/guioza.jpg`, optionGroups: [og('molho-extra', 'Molho extra', [['tare', 'Molho tarê', 2]])], observationOptions: ['Molho à parte', 'Bem tostado'] },
    { key: 'sunomono', cat: 'entradas', name: 'Sunomono', description: 'Salada de pepino agridoce com gergelim', price: 14.9, image: `${IMG}/sunomono.jpg`, observationOptions: ['Sem gergelim', 'Com kani'] },
    { key: 'harumaki', cat: 'entradas', name: 'Harumaki (4 un.)', description: 'Rolinho primavera de legumes', price: 19.9, image: `${IMG}/harumaki.jpg`, observationOptions: ['Molho agridoce à parte'] },
    { key: 'sashimi', cat: 'sushis', name: 'Sashimi de Salmão', description: '10 fatias de salmão fresco', price: 42.9, image: `${IMG}/sashimi-salmao.jpg`, observationOptions: ['Wasabi à parte', 'Shoyu light'] },
    { key: 'niguiri', cat: 'sushis', name: 'Niguiri de Salmão (4 un.)', description: 'Bolinho de arroz com fatia de salmão', price: 24.9, image: `${IMG}/niguiri-salmao.jpg`, observationOptions: JP_OBS },
    { key: 'uramaki', cat: 'sushis', name: 'Uramaki Filadélfia (8 un.)', description: 'Salmão, cream cheese e cebolinha', price: 29.9, image: `${IMG}/uramaki-filadelfia.jpg`, optionGroups: TEMAKI, observationOptions: JP_OBS },
    { key: 'hot-roll', cat: 'sushis', name: 'Hot Roll (10 un.)', description: 'Empanado com salmão e cream cheese, molho tarê', price: 32.9, image: `${IMG}/hot-roll.jpg`, optionGroups: TEMAKI, observationOptions: ['Molho tarê à parte', 'Sem cebolinha'] },
    { key: 'temaki-salmao', cat: 'temakis', name: 'Temaki de Salmão', description: 'Salmão, arroz e cebolinha', price: 29.9, image: `${IMG}/temake.jpg`, optionGroups: TEMAKI, observationOptions: JP_OBS },
    { key: 'temaki-filadelfia', cat: 'temakis', name: 'Temaki Filadélfia', description: 'Salmão e cream cheese', price: 32.9, image: `${IMG}/temake.jpg`, optionGroups: TEMAKI, observationOptions: JP_OBS },
    { key: 'temaki-skin', cat: 'temakis', name: 'Temaki Skin', description: 'Pele de salmão crocante e molho tarê', price: 24.9, image: `${IMG}/temake.jpg`, optionGroups: TEMAKI, observationOptions: JP_OBS },
    { key: 'combo-20', cat: 'combinados', name: 'Combinado 20 peças', description: 'Sashimi, niguiri, uramaki e hossomaki', price: 69.9, image: `${IMG}/combinado-20.jpg`, optionGroups: COMBO, observationOptions: ['Sem pele', 'Sem cream cheese', ...JP_OBS] },
    { key: 'combo-40', cat: 'combinados', name: 'Combinado 40 peças', description: 'Para 2 pessoas — seleção do sushiman', price: 129.9, image: `${IMG}/combinado-40.jpg`, optionGroups: COMBO, observationOptions: ['Sem pele', 'Sem cream cheese', ...JP_OBS] },
    { key: 'barca', cat: 'combinados', name: 'Barca Festa 80 peças', description: 'Para 4 a 5 pessoas', price: 249.9, madeToOrder: true, minLeadTimeHours: 24, image: `${IMG}/barca-sushi.jpg`, optionGroups: COMBO, observationOptions: ['Sem pele', 'Sem cream cheese'] },
    { key: 'yakisoba', cat: 'quentes', name: 'Yakisoba de Frango', description: 'Macarrão, legumes e frango ao molho', price: 38.9, image: `${IMG}/yakisoba.jpg`, optionGroups: [og('proteina', 'Trocar proteína', [['carne', 'Trocar por carne', 6]])], observationOptions: ['Sem brócolis', 'Molho extra'] },
    { key: 'lamen', cat: 'quentes', name: 'Lámen Tonkotsu', description: 'Caldo de porco, chashu, ovo e cebolinha', price: 46.9, image: `${IMG}/lamen.jpg`, optionGroups: [og('adicionais', 'Adicionais', [['ovo', 'Ovo extra', 4], ['chashu', 'Chashu extra', 9]])], observationOptions: ['Sem cebolinha', 'Apimentado'] },
    { key: 'teppan', cat: 'quentes', name: 'Teppan de Salmão', description: 'Salmão grelhado com legumes na chapa', price: 56.9, image: `${IMG}/teppan-salmao.jpg`, observationOptions: ['Sem shimeji', 'Molho à parte'] },
    { key: 'cha', cat: 'bebidas', name: 'Chá Verde Gelado', description: '400 ml', price: 9, image: `${IMG}/cha-verde-gelado.jpg`, observationOptions: ['Sem açúcar'] },
    { key: 'refri', cat: 'bebidas', name: 'Refrigerante lata', description: '350 ml', price: 6, image: `${IMG}/refrigerante-cola.webp` },
    { key: 'saque', cat: 'bebidas', name: 'Saquê (dose)', description: '100 ml, quente ou gelado', price: 14, image: `${IMG}/saque.jpg`, observationOptions: ['Quente', 'Gelado'] },
    { key: 'agua', cat: 'bebidas', name: 'Água Mineral', description: '500 ml com ou sem gás', price: 4, image: `${IMG}/agua-mineral.jpg` },
    { key: 'harumaki-banana', cat: 'sobremesas', name: 'Harumaki de Banana', description: 'Com canela e sorvete de creme', price: 18.9, image: `${IMG}/harumaki-banana.jpg` },
    { key: 'mochi', cat: 'sobremesas', name: 'Mochi (2 un.)', description: 'Morango ou chá verde', price: 16.9, image: `${IMG}/mochi.jpg`, observationOptions: ['Morango', 'Chá verde'] },
  ],
  // Tempo médio 35 min: 1 atrasado (6 min), 1 perto do prazo (faltam 5), 2 no prazo, 1 encomenda
  orders: [
    { channel: DINE_IN, status: PREPARING, pay: CARD, customer: 'Mesa 03', table: '03', minutesAgo: 12,
      items: [['combo-20', 1, { notes: 'Sem pele', optionIds: ['tare', 'hashi-2'] }], ['guioza', 1], ['cha', 2]] },
    { channel: IFOOD, status: RECEIVED, pay: PIX, customer: 'Cliente iFood', minutesAgo: 3, externalRef: 'IFD-7730', address: 'Rua Tokyo, 58 - Liberdade',
      items: [['temaki-salmao', 2, { notes: 'Sem cebolinha', optionIds: ['cream'] }], ['hot-roll', 1]] },
    { channel: DELIVERY, status: OUT_FOR_DELIVERY, pay: CARD, customer: 'Paula Tanaka', address: 'Av. Paulista, 1200 - Apto 82', minutesAgo: 38,
      items: [['combo-40', 1, { optionIds: ['shoyu', 'hashi-2'] }], ['refri', 2]] },
    { channel: TAKEOUT, status: READY, pay: PIX, customer: 'Bruno Sato', minutesAgo: 20, items: [['lamen', 1, { notes: 'Apimentado', optionIds: ['ovo'] }], ['sunomono', 1]] },
    { channel: WHATSAPP, status: RECEIVED, pay: PIX, customer: 'Renata Ito', phone: '(11) 95555-8080', minutesAgo: 30, scheduledInHours: 26, notes: 'Aniversário — retirada na loja',
      items: [['barca', 1, { notes: 'Sem cream cheese', optionIds: ['hashi-2'] }]] },
    { channel: DINE_IN, status: DELIVERED, pay: CASH, customer: 'Mesa 01', table: '01', minutesAgo: 70,
      items: [['yakisoba', 2], ['saque', 2, { notes: 'Quente' }], ['mochi', 1, { notes: 'Chá verde' }]] },
    { channel: DELIVERY, status: PREPARING, pay: CARD, customer: 'Marcos Kato', address: 'Rua Galvão Bueno, 300 - Apto 14', minutesAgo: 41,
      items: [['temaki-filadelfia', 1], ['uramaki', 1]] },
    { channel: COUNTER, status: RECEIVED, pay: PIX, customer: 'Júlia Hayashi', minutesAgo: 30, items: [['sashimi', 1]] },
  ],
  history: { perDay: [8, 13], peaks: [12, 19], drinkCategory: 'bebidas', channels: [DELIVERY, DELIVERY, IFOOD, IFOOD, DINE_IN, DINE_IN, TAKEOUT, WHATSAPP] },
};

export const DEMO_TENANTS: TenantDef[] = [RESTAURANT, SNACK_BAR, CONFECTIONERY, JAPANESE];
export const DEMO_SLUGS = DEMO_TENANTS.map((t) => t.slug);
