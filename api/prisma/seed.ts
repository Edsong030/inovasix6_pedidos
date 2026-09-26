import { PrismaClient, UserRole, OrderChannel, OrderStatus, PaymentMethod, TableStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ─── Restaurante ─────────────────────────────────────────────────────────
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'restaurante-demo' },
    update: {},
    create: {
      name: 'Restaurante Demo',
      slug: 'restaurante-demo',
      phone: '(11) 99999-9999',
      address: 'Rua das Flores, 123 - São Paulo/SP',
    },
  });
  console.log(`✅ Restaurante: ${restaurant.name}`);

  // ─── Usuários ─────────────────────────────────────────────────────────────
  const hashAdmin = await bcrypt.hash('admin123', 10);
  const hashManager = await bcrypt.hash('gerente123', 10);
  const hashAttendant = await bcrypt.hash('atendente123', 10);
  const hashKitchen = await bcrypt.hash('cozinha123', 10);
  const hashDelivery = await bcrypt.hash('entregador123', 10);

  const admin = await prisma.user.upsert({
    where: { email_restaurantId: { email: 'admin@inovasix.com', restaurantId: restaurant.id } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Administrador',
      email: 'admin@inovasix.com',
      password: hashAdmin,
      role: UserRole.ADMIN,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email_restaurantId: { email: 'gerente@inovasix.com', restaurantId: restaurant.id } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Carlos Gerente',
      email: 'gerente@inovasix.com',
      password: hashManager,
      role: UserRole.MANAGER,
    },
  });

  const attendant = await prisma.user.upsert({
    where: { email_restaurantId: { email: 'atendente@inovasix.com', restaurantId: restaurant.id } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Ana Atendente',
      email: 'atendente@inovasix.com',
      password: hashAttendant,
      role: UserRole.ATTENDANT,
    },
  });

  await prisma.user.upsert({
    where: { email_restaurantId: { email: 'cozinha@inovasix.com', restaurantId: restaurant.id } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'João Cozinha',
      email: 'cozinha@inovasix.com',
      password: hashKitchen,
      role: UserRole.KITCHEN,
    },
  });

  await prisma.user.upsert({
    where: { email_restaurantId: { email: 'entregador@inovasix.com', restaurantId: restaurant.id } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Pedro Entregador',
      email: 'entregador@inovasix.com',
      password: hashDelivery,
      role: UserRole.DELIVERY,
    },
  });
  console.log('✅ Usuários criados');

  // ─── Mesas ────────────────────────────────────────────────────────────────
  const tableNumbers = ['01', '02', '03', '04', '05', '06', '07', '08', 'Balcão', 'Varanda'];
  const tables: { id: string; number: string }[] = [];
  for (const number of tableNumbers) {
    const t = await prisma.table.upsert({
      where: { restaurantId_number: { restaurantId: restaurant.id, number } },
      update: {},
      create: {
        restaurantId: restaurant.id,
        number,
        capacity: number === 'Balcão' ? 8 : number === 'Varanda' ? 6 : 4,
      },
    });
    tables.push(t);
  }
  console.log('✅ Mesas criadas');

  // ─── Categorias ───────────────────────────────────────────────────────────
  const catNames = [
    { name: 'Entradas', description: 'Petiscos e entradas', sortOrder: 1 },
    { name: 'Pratos Principais', description: 'Pratos quentes e frios', sortOrder: 2 },
    { name: 'Pizzas', description: 'Pizzas artesanais', sortOrder: 3 },
    { name: 'Lanches', description: 'Hambúrgueres e sanduíches', sortOrder: 4 },
    { name: 'Bebidas', description: 'Refrigerantes, sucos e cervejas', sortOrder: 5 },
    { name: 'Sobremesas', description: 'Doces e sobremesas', sortOrder: 6 },
  ];

  const categories: { id: string; name: string }[] = [];
  for (const cat of catNames) {
    // Verificar se já existe
    let c = await prisma.category.findFirst({
      where: { restaurantId: restaurant.id, name: cat.name },
    });
    if (!c) {
      c = await prisma.category.create({
        data: { restaurantId: restaurant.id, ...cat },
      });
    }
    categories.push(c);
  }
  console.log('✅ Categorias criadas');

  // ─── Produtos ─────────────────────────────────────────────────────────────
  const getCatId = (name: string) => categories.find((c) => c.name === name)!.id;

  // Imagens: Unsplash com IDs fixos (estáveis, licença livre para uso demonstrativo)
  const productsList = [
    // Entradas
    { categoryId: getCatId('Entradas'), name: 'Bruschetta de Tomate',     description: 'Pão italiano com tomate, manjericão e azeite', price: 24.90, imageUrl: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400&q=80' },
    { categoryId: getCatId('Entradas'), name: 'Bolinho de Bacalhau (8 un)',description: 'Bolinhos fritos com maionese de ervas',         price: 32.00, imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&q=80' },
    { categoryId: getCatId('Entradas'), name: 'Tábua de Frios',           description: 'Queijos, frios e antepastos',                   price: 48.00, imageUrl: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?w=400&q=80' },
    // Pratos Principais
    { categoryId: getCatId('Pratos Principais'), name: 'Filé ao Molho Madeira', description: 'Filé mignon grelhado com batata e arroz', price: 58.90, imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80' },
    { categoryId: getCatId('Pratos Principais'), name: 'Frango Grelhado',       description: 'Peito de frango grelhado com legumes',    price: 42.90, imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400&q=80' },
    { categoryId: getCatId('Pratos Principais'), name: 'Moqueca de Camarão',    description: 'Camarão, leite de coco, dendê e arroz',   price: 74.90, imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80' },
    { categoryId: getCatId('Pratos Principais'), name: 'Risoto de Funghi',      description: 'Arroz arbóreo com cogumelos secos',        price: 52.90, imageUrl: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&q=80' },
    // Pizzas
    { categoryId: getCatId('Pizzas'), name: 'Margherita',          description: 'Molho de tomate, mussarela e manjericão', price: 45.90, imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80' },
    { categoryId: getCatId('Pizzas'), name: 'Calabresa',           description: 'Molho, calabresa fatiada e cebola',       price: 42.90, imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=80' },
    { categoryId: getCatId('Pizzas'), name: 'Frango com Catupiry', description: 'Frango desfiado, catupiry e orégano',     price: 48.90, imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80' },
    { categoryId: getCatId('Pizzas'), name: 'Quatro Queijos',      description: 'Mussarela, provolone, gorgonzola e parmesão', price: 52.90, imageUrl: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&q=80' },
    // Lanches
    { categoryId: getCatId('Lanches'), name: 'Classic Burger', description: 'Hambúrguer 180g, queijo, alface e tomate',     price: 32.90, imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80' },
    { categoryId: getCatId('Lanches'), name: 'Smash Bacon',    description: 'Duplo smash, bacon crocante e cheddar',        price: 39.90, imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&q=80' },
    { categoryId: getCatId('Lanches'), name: 'Veggie Burger',  description: 'Hambúrguer de grão-de-bico, rúcula e pesto',   price: 34.90, imageUrl: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400&q=80' },
    // Bebidas
    { categoryId: getCatId('Bebidas'), name: 'Coca-Cola Lata',        description: '350ml',                 price:  6.00, imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80' },
    { categoryId: getCatId('Bebidas'), name: 'Suco de Laranja Natural',description: '400ml natural',        price: 12.00, imageUrl: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&q=80' },
    { categoryId: getCatId('Bebidas'), name: 'Água Mineral',          description: '500ml com ou sem gás', price:  5.00, imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=80' },
    { categoryId: getCatId('Bebidas'), name: 'Cerveja Artesanal IPA', description: 'Long neck 355ml',      price: 18.00, imageUrl: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&q=80' },
    { categoryId: getCatId('Bebidas'), name: 'Cerveja Pilsen',        description: 'Lata 350ml',           price:  8.00, imageUrl: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&q=80' },
    // Sobremesas
    { categoryId: getCatId('Sobremesas'), name: 'Petit Gateau',          description: 'Bolo de chocolate quente com sorvete',   price: 22.90, imageUrl: 'https://images.unsplash.com/photo-1611329532992-0b7af95a3b14?w=400&q=80' },
    { categoryId: getCatId('Sobremesas'), name: 'Pudim de Leite',         description: 'Pudim caseiro com calda de caramelo',    price: 14.90, imageUrl: 'https://images.unsplash.com/photo-1515467837915-15c4777cd6f0?w=400&q=80' },
    { categoryId: getCatId('Sobremesas'), name: 'Cheesecake de Morango',  description: 'Base de biscoito, recheio cremoso e calda', price: 19.90, imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&q=80' },
  ];

  const products: { id: string; name: string; price: Decimal }[] = [];
  for (const prod of productsList) {
    let p = await prisma.product.findFirst({
      where: { restaurantId: restaurant.id, name: prod.name },
    });
    if (!p) {
      p = await prisma.product.create({
        data: { restaurantId: restaurant.id, ...prod },
      });
    } else if (!p.imageUrl && prod.imageUrl) {
      // Atualiza imagem se o produto já existia sem imagem
      p = await prisma.product.update({
        where: { id: p.id },
        data: { imageUrl: prod.imageUrl },
      });
    }
    products.push(p);
  }
  console.log('✅ Produtos criados/atualizados');

  // ─── Pedidos de exemplo ───────────────────────────────────────────────────
  const existingOrders = await prisma.order.count({ where: { restaurantId: restaurant.id } });
  if (existingOrders === 0) {
    const getProduct = (name: string) => products.find((p) => p.name === name)!;
    // Horários relativos a agora, sempre em ordem: recebido ≤ preparo ≤ pronto ≤ entregue
    const minutesAgo = (m: number) => new Date(Date.now() - m * 60000);

    const ordersData = [
      // Pedido 1 - Salão mesa 01 - Em preparo
      {
        restaurantId: restaurant.id,
        userId: attendant.id,
        tableId: tables[0].id,
        orderNumber: 1,
        channel: OrderChannel.DINE_IN,
        status: OrderStatus.PREPARING,
        customerName: 'Mesa 01',
        paymentMethod: PaymentMethod.CARD,
        subtotal: 110.80,
        discount: 0,
        total: 110.80,
        // Passou da previsão (36 min > 30 min): exemplo de pedido atrasado
        createdAt: minutesAgo(36),
        prepStartedAt: minutesAgo(30),
        items: {
          create: [
            { productId: getProduct('Filé ao Molho Madeira').id, productName: 'Filé ao Molho Madeira', quantity: 1, unitPrice: 58.90, totalPrice: 58.90 },
            { productId: getProduct('Coca-Cola Lata').id, productName: 'Coca-Cola Lata', quantity: 2, unitPrice: 6.00, totalPrice: 12.00 },
            { productId: getProduct('Bruschetta de Tomate').id, productName: 'Bruschetta de Tomate', quantity: 1, unitPrice: 24.90, totalPrice: 24.90 },
            { productId: getProduct('Pudim de Leite').id, productName: 'Pudim de Leite', quantity: 1, unitPrice: 14.90, totalPrice: 14.90 },
          ],
        },
      },
      // Pedido 2 - Delivery - Recebido
      {
        restaurantId: restaurant.id,
        userId: attendant.id,
        orderNumber: 2,
        channel: OrderChannel.DELIVERY,
        status: OrderStatus.RECEIVED,
        customerName: 'Maria Silva',
        customerPhone: '(11) 98765-4321',
        deliveryAddress: 'Av. Paulista, 1000 - Apto 52',
        paymentMethod: PaymentMethod.PIX,
        subtotal: 87.80,
        discount: 5.00,
        total: 82.80,
        createdAt: minutesAgo(4),
        items: {
          create: [
            { productId: getProduct('Margherita').id, productName: 'Margherita', quantity: 1, unitPrice: 45.90, totalPrice: 45.90 },
            { productId: getProduct('Coca-Cola Lata').id, productName: 'Coca-Cola Lata', quantity: 2, unitPrice: 6.00, totalPrice: 12.00 },
            { productId: getProduct('Petit Gateau').id, productName: 'Petit Gateau', quantity: 1, unitPrice: 22.90, totalPrice: 22.90 },
            { productId: getProduct('Suco de Laranja Natural').id, productName: 'Suco de Laranja Natural', quantity: 1, unitPrice: 12.00, totalPrice: 12.00 },
          ],
        },
      },
      // Pedido 3 - Balcão - Pronto
      {
        restaurantId: restaurant.id,
        userId: manager.id,
        orderNumber: 3,
        channel: OrderChannel.COUNTER,
        status: OrderStatus.READY,
        customerName: 'João Paulo',
        paymentMethod: PaymentMethod.CASH,
        subtotal: 72.80,
        discount: 0,
        total: 72.80,
        createdAt: minutesAgo(28),
        prepStartedAt: minutesAgo(25),
        readyAt: minutesAgo(3),
        items: {
          create: [
            { productId: getProduct('Smash Bacon').id, productName: 'Smash Bacon', quantity: 1, unitPrice: 39.90, totalPrice: 39.90 },
            { productId: getProduct('Cerveja Artesanal IPA').id, productName: 'Cerveja Artesanal IPA', quantity: 2, unitPrice: 18.00, totalPrice: 36.00 },
          ],
        },
      },
      // Pedido 4 - Retirada - Entregue (histórico)
      {
        restaurantId: restaurant.id,
        userId: attendant.id,
        orderNumber: 4,
        channel: OrderChannel.TAKEOUT,
        status: OrderStatus.DELIVERED,
        customerName: 'Fernanda Costa',
        customerPhone: '(11) 91234-5678',
        paymentMethod: PaymentMethod.PIX,
        subtotal: 94.80,
        discount: 0,
        total: 94.80,
        createdAt: minutesAgo(65),
        prepStartedAt: minutesAgo(60),
        readyAt: minutesAgo(40),
        deliveredAt: minutesAgo(35),
        items: {
          create: [
            { productId: getProduct('Moqueca de Camarão').id, productName: 'Moqueca de Camarão', quantity: 1, unitPrice: 74.90, totalPrice: 74.90 },
            { productId: getProduct('Água Mineral').id, productName: 'Água Mineral', quantity: 2, unitPrice: 5.00, totalPrice: 10.00 },
            { productId: getProduct('Cheesecake de Morango').id, productName: 'Cheesecake de Morango', quantity: 0, unitPrice: 19.90, totalPrice: 0 },
          ],
        },
      },
      // Pedido 5 - Delivery - Saiu para entrega
      {
        restaurantId: restaurant.id,
        userId: manager.id,
        orderNumber: 5,
        channel: OrderChannel.DELIVERY,
        status: OrderStatus.OUT_FOR_DELIVERY,
        customerName: 'Roberto Alves',
        customerPhone: '(11) 97654-3210',
        deliveryAddress: 'Rua Augusta, 500 - Apto 12',
        paymentMethod: PaymentMethod.CARD,
        subtotal: 130.80,
        discount: 10.00,
        total: 120.80,
        createdAt: minutesAgo(50),
        prepStartedAt: minutesAgo(45),
        readyAt: minutesAgo(20),
        items: {
          create: [
            { productId: getProduct('Quatro Queijos').id, productName: 'Quatro Queijos', quantity: 1, unitPrice: 52.90, totalPrice: 52.90 },
            { productId: getProduct('Calabresa').id, productName: 'Calabresa', quantity: 1, unitPrice: 42.90, totalPrice: 42.90 },
            { productId: getProduct('Cerveja Pilsen').id, productName: 'Cerveja Pilsen', quantity: 4, unitPrice: 8.00, totalPrice: 32.00 },
          ],
        },
      },
    ];

    for (const orderData of ordersData) {
      // Previsão de pronto: criação + tempo médio do restaurante (mesma regra da API)
      const estimatedReadyAt = new Date(orderData.createdAt.getTime() + restaurant.avgPrepMinutes * 60000);
      await prisma.order.create({ data: { ...orderData, estimatedReadyAt } as any });
    }

    // Atualiza status das mesas com pedidos ativos
    await prisma.table.update({
      where: { id: tables[0].id },
      data: { status: TableStatus.OCCUPIED },
    });

    console.log('✅ Pedidos de exemplo criados');
  } else {
    console.log('ℹ️  Pedidos já existem, pulando...');

    // Bancos criados por versões antigas deste seed têm pedidos "prontos antes de
    // recebidos" (o createdAt ficava com a hora do seed). Recua só o createdAt desses
    // pedidos da loja demo para antes da primeira etapa. Idempotente.
    const demoOrders = await prisma.order.findMany({
      where: { restaurantId: restaurant.id },
      select: { id: true, createdAt: true, prepStartedAt: true, readyAt: true, deliveredAt: true },
    });
    let repaired = 0;
    for (const o of demoOrders) {
      const steps = [o.prepStartedAt, o.readyAt, o.deliveredAt].filter((d): d is Date => !!d);
      const first = steps.length ? Math.min(...steps.map((d) => d.getTime())) : null;
      if (first !== null && first < o.createdAt.getTime()) {
        await prisma.order.update({ where: { id: o.id }, data: { createdAt: new Date(first - 3 * 60000) } });
        repaired++;
      }
    }
    if (repaired) console.log(`🔧 ${repaired} pedido(s) de exemplo com horários fora de ordem corrigido(s)`);
  }

  console.log('\n✨ Seed concluído com sucesso!');
  console.log('\n📋 Credenciais de acesso:');
  console.log('   Slug do restaurante: restaurante-demo');
  console.log('   Admin:       admin@inovasix.com       / admin123');
  console.log('   Gerente:     gerente@inovasix.com     / gerente123');
  console.log('   Atendente:   atendente@inovasix.com   / atendente123');
  console.log('   Cozinha:     cozinha@inovasix.com     / cozinha123');
  console.log('   Entregador:  entregador@inovasix.com  / entregador123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
