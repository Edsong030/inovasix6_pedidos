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

  const productsList = [
    // Entradas
    { categoryId: getCatId('Entradas'), name: 'Bruschetta de Tomate', description: 'Pão italiano com tomate, manjericão e azeite', price: 24.90 },
    { categoryId: getCatId('Entradas'), name: 'Bolinho de Bacalhau (8 un)', description: 'Bolinhos fritos com maionese de ervas', price: 32.00 },
    { categoryId: getCatId('Entradas'), name: 'Tábua de Frios', description: 'Queijos, frios e antepastos', price: 48.00 },
    // Pratos Principais
    { categoryId: getCatId('Pratos Principais'), name: 'Filé ao Molho Madeira', description: 'Filé mignon grelhado com batata e arroz', price: 58.90 },
    { categoryId: getCatId('Pratos Principais'), name: 'Frango Grelhado', description: 'Peito de frango grelhado com legumes', price: 42.90 },
    { categoryId: getCatId('Pratos Principais'), name: 'Moqueca de Camarão', description: 'Camarão, leite de coco, dendê e arroz', price: 74.90 },
    { categoryId: getCatId('Pratos Principais'), name: 'Risoto de Funghi', description: 'Arroz arbóreo com cogumelos secos', price: 52.90 },
    // Pizzas
    { categoryId: getCatId('Pizzas'), name: 'Margherita', description: 'Molho de tomate, mussarela e manjericão', price: 45.90 },
    { categoryId: getCatId('Pizzas'), name: 'Calabresa', description: 'Molho, calabresa fatiada e cebola', price: 42.90 },
    { categoryId: getCatId('Pizzas'), name: 'Frango com Catupiry', description: 'Frango desfiado, catupiry e orégano', price: 48.90 },
    { categoryId: getCatId('Pizzas'), name: 'Quatro Queijos', description: 'Mussarela, provolone, gorgonzola e parmesão', price: 52.90 },
    // Lanches
    { categoryId: getCatId('Lanches'), name: 'Classic Burger', description: 'Hambúrguer 180g, queijo, alface e tomate', price: 32.90 },
    { categoryId: getCatId('Lanches'), name: 'Smash Bacon', description: 'Duplo smash, bacon crocante e cheddar', price: 39.90 },
    { categoryId: getCatId('Lanches'), name: 'Veggie Burger', description: 'Hambúrguer de grão-de-bico, rúcula e pesto', price: 34.90 },
    // Bebidas
    { categoryId: getCatId('Bebidas'), name: 'Coca-Cola Lata', description: '350ml', price: 6.00 },
    { categoryId: getCatId('Bebidas'), name: 'Suco de Laranja Natural', description: '400ml', price: 12.00 },
    { categoryId: getCatId('Bebidas'), name: 'Água Mineral', description: '500ml com ou sem gás', price: 5.00 },
    { categoryId: getCatId('Bebidas'), name: 'Cerveja Artesanal IPA', description: 'Long neck 355ml', price: 18.00 },
    { categoryId: getCatId('Bebidas'), name: 'Cerveja Pilsen', description: 'Lata 350ml', price: 8.00 },
    // Sobremesas
    { categoryId: getCatId('Sobremesas'), name: 'Petit Gateau', description: 'Bolo de chocolate quente com sorvete', price: 22.90 },
    { categoryId: getCatId('Sobremesas'), name: 'Pudim de Leite', description: 'Pudim caseiro com calda de caramelo', price: 14.90 },
    { categoryId: getCatId('Sobremesas'), name: 'Cheesecake de Morango', description: 'Base de biscoito, recheio cremoso e calda', price: 19.90 },
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
    }
    products.push(p);
  }
  console.log('✅ Produtos criados');

  // ─── Pedidos de exemplo ───────────────────────────────────────────────────
  const existingOrders = await prisma.order.count({ where: { restaurantId: restaurant.id } });
  if (existingOrders === 0) {
    const getProduct = (name: string) => products.find((p) => p.name === name)!;

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
        prepStartedAt: new Date(Date.now() - 12 * 60000),
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
        prepStartedAt: new Date(Date.now() - 25 * 60000),
        readyAt: new Date(Date.now() - 3 * 60000),
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
        prepStartedAt: new Date(Date.now() - 60 * 60000),
        readyAt: new Date(Date.now() - 40 * 60000),
        deliveredAt: new Date(Date.now() - 35 * 60000),
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
        prepStartedAt: new Date(Date.now() - 45 * 60000),
        readyAt: new Date(Date.now() - 20 * 60000),
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
      await prisma.order.create({ data: orderData as any });
    }

    // Atualiza status das mesas com pedidos ativos
    await prisma.table.update({
      where: { id: tables[0].id },
      data: { status: TableStatus.OCCUPIED },
    });

    console.log('✅ Pedidos de exemplo criados');
  } else {
    console.log('ℹ️  Pedidos já existem, pulando...');
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
