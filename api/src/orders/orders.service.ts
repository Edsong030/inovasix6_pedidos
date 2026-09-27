import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';
import { averagePrepMinutes } from './prep-time';
import { estimateReadyAt } from './order-timing';
import { readOptionGroups, resolveSelection } from '../products/product-options';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private orderInclude = {
    items: {
      include: {
        product: { select: { id: true, name: true, imageUrl: true } },
        options: { orderBy: { sortOrder: 'asc' as const } },
      },
    },
    table: { select: { id: true, number: true } },
    user: { select: { id: true, name: true } },
  };

  async findAll(restaurantId: string, filters?: { status?: string; channel?: string; date?: string }) {
    const where: Record<string, unknown> = { restaurantId };

    if (filters?.status) where['status'] = filters.status;
    if (filters?.channel) where['channel'] = filters.channel;
    if (filters?.date) {
      const d = new Date(filters.date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where['createdAt'] = { gte: d, lt: next };
    }

    return this.prisma.order.findMany({
      where,
      include: this.orderInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, restaurantId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, restaurantId },
      include: this.orderInclude,
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return order;
  }

  async create(restaurantId: string, userId: string, dto: CreateOrderDto) {
    // Regra definitiva (o frontend só reflete): configuração do restaurante do token
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { acceptingOrders: true, avgPrepMinutes: true },
    });
    if (!restaurant) throw new NotFoundException('Estabelecimento não encontrado');
    if (!restaurant.acceptingOrders) {
      throw new ConflictException(
        'O recebimento de pedidos está pausado. Um administrador ou gerente pode reativar em Configurações.',
      );
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Pedido deve ter pelo menos um item');
    }

    // Busca produtos e calcula valores
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, restaurantId },
    });

    // O mesmo produto pode aparecer em mais de uma linha (ex.: pontos diferentes)
    if (products.length !== new Set(productIds).size) {
      throw new BadRequestException('Um ou mais produtos não encontrados');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Encomenda: data/hora obrigatória quando marcada ou quando há produto sob encomenda
    const scheduledFor = dto.scheduledFor ? new Date(dto.scheduledFor) : null;
    const hasMadeToOrder = products.some((p) => p.madeToOrder);
    const isPreorder = !!dto.isPreorder || hasMadeToOrder;
    if (isPreorder && !scheduledFor) {
      throw new BadRequestException('Informe a data e hora de retirada/entrega da encomenda');
    }
    if (scheduledFor) {
      const leadHours = Math.max(0, ...products.map((p) => p.minLeadTimeHours ?? 0));
      const earliest = Date.now() + leadHours * 3_600_000;
      if (scheduledFor.getTime() < earliest - 60_000) {
        throw new BadRequestException(
          leadHours > 0
            ? `Esta encomenda precisa de pelo menos ${leadHours}h de antecedência`
            : 'A data da encomenda precisa ser futura',
        );
      }
    }

    const itemsData = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;

      // Quilo aceita fração; unidade e cento, apenas inteiros
      if (product.saleUnit !== 'KG' && !Number.isInteger(item.quantity)) {
        throw new BadRequestException(`Quantidade de "${product.name}" deve ser um número inteiro`);
      }

      if (!product.available) {
        throw new BadRequestException(`"${product.name}" está indisponível no momento`);
      }

      // Opções: validadas contra o cadastro DESTE produto (já filtrado pelo restaurantId);
      // preço e nomes vêm do cadastro, nunca do cliente
      const selection = resolveSelection(product.name, readOptionGroups(product.optionGroups), item.optionIds);
      if ('error' in selection) throw new BadRequestException(selection.error);

      const unitPrice = Math.round((Number(product.price) + selection.extra) * 100) / 100;
      const totalPrice = Math.round(unitPrice * item.quantity * 100) / 100;
      return {
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unit: product.saleUnit,
        unitPrice,
        totalPrice,
        notes: item.notes?.trim() || undefined,
        // Snapshot do que foi escolhido, com o preço aplicado agora
        options: selection.chosen.length
          ? { create: selection.chosen.map((c, i) => ({ ...c, sortOrder: i })) }
          : undefined,
      };
    });

    const subtotal = itemsData.reduce((sum, i) => sum + i.totalPrice, 0);
    const discount = dto.discount ?? 0;
    const total = subtotal - discount;

    // Tudo ou nada: mesa, número, pedido, itens e ocupação da mesa na mesma transação.
    // Se qualquer passo falhar, nada é gravado e o número não é consumido.
    return this.prisma.$transaction(async (tx) => {
      // A mesa precisa ser do restaurante do token (nunca confiar no id enviado)
      if (dto.tableId) {
        const table = await tx.table.findFirst({
          where: { id: dto.tableId, restaurantId },
          select: { id: true },
        });
        if (!table) throw new NotFoundException('Mesa não encontrada');
      }

      // Número sequencial por restaurante: UPDATE ... RETURNING trava a linha do
      // restaurante até o fim da transação, então pedidos simultâneos recebem números
      // distintos (o índice único restaurantId + orderNumber garante no banco)
      const { orderSeq: orderNumber } = await tx.restaurant.update({
        where: { id: restaurantId },
        data: { orderSeq: { increment: 1 } },
        select: { orderSeq: true },
      });

      const order = await tx.order.create({
        data: {
          restaurantId,
          userId,
          tableId: dto.tableId,
          orderNumber,
          channel: dto.channel,
          paymentMethod: dto.paymentMethod,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          deliveryAddress: dto.deliveryAddress,
          notes: dto.notes,
          isPreorder,
          scheduledFor,
          // Relógio do servidor + tempo médio do negócio (nunca vem do navegador)
          estimatedReadyAt: estimateReadyAt(new Date(), restaurant.avgPrepMinutes, scheduledFor),
          subtotal,
          discount,
          total,
          items: { create: itemsData },
        },
        include: this.orderInclude,
      });

      // Ocupa mesa se for salão (filtro por restaurantId também na escrita)
      if (dto.tableId && dto.channel === 'DINE_IN') {
        await tx.table.update({
          where: { id: dto.tableId, restaurantId },
          data: { status: 'OCCUPIED' },
        });
      }

      return order;
    });
  }

  async updateStatus(id: string, restaurantId: string, dto: UpdateOrderStatusDto) {
    const order = await this.findOne(id, restaurantId);

    const validTransitions: Record<string, OrderStatus[]> = {
      RECEIVED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
      READY: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      DELIVERED: [],
      CANCELLED: [],
    };

    const status = dto.status as OrderStatus;
    const allowed = validTransitions[order.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Transição inválida: ${order.status} → ${status}`,
      );
    }

    const now = new Date();
    const timestamps: Record<string, Date | null> = {};
    if (status === OrderStatus.PREPARING) timestamps['prepStartedAt'] = now;
    if (status === OrderStatus.READY) timestamps['readyAt'] = now;
    if (status === OrderStatus.DELIVERED) timestamps['deliveredAt'] = now;
    if (status === OrderStatus.CANCELLED) timestamps['cancelledAt'] = now;

    const updated = await this.prisma.order.update({
      where: { id, restaurantId },
      data: { status, ...timestamps },
      include: this.orderInclude,
    });

    // Libera mesa quando pedido é encerrado
    if (
      order.tableId &&
      (status === OrderStatus.DELIVERED || status === OrderStatus.CANCELLED)
    ) {
      const activeOrders = await this.prisma.order.count({
        where: {
          restaurantId,
          tableId: order.tableId,
          status: { in: ['RECEIVED', 'PREPARING', 'READY'] },
        },
      });
      if (activeOrders === 0) {
        // updateMany com restaurantId: nunca libera mesa de outro restaurante
        await this.prisma.table.updateMany({
          where: { id: order.tableId, restaurantId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    return updated;
  }

  async getDashboard(restaurantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      ordersToday,
      inPreparation,
      revenueToday,
      recentOrders,
    ] = await Promise.all([
      this.prisma.order.count({
        where: {
          restaurantId,
          createdAt: { gte: today, lt: tomorrow },
          status: { not: OrderStatus.CANCELLED },
        },
      }),
      this.prisma.order.count({
        where: { restaurantId, status: OrderStatus.PREPARING },
      }),
      this.prisma.order.aggregate({
        where: {
          restaurantId,
          createdAt: { gte: today, lt: tomorrow },
          status: { in: [OrderStatus.DELIVERED, OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY] },
        },
        _sum: { total: true },
      }),
      this.prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: today, lt: tomorrow } },
        include: this.orderInclude,
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Tempo médio de preparo (do recebimento até pronto), só com cronologia válida.
    // null quando não há pedidos válidos — o frontend exibe "—", nunca "0 min".
    const completedToday = await this.prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: today, lt: tomorrow },
        status: { not: OrderStatus.CANCELLED },
        readyAt: { not: null },
      },
      select: { createdAt: true, prepStartedAt: true, readyAt: true, deliveredAt: true },
    });
    const avgPrepTime = averagePrepMinutes(completedToday);

    return {
      ordersToday,
      inPreparation,
      revenueToday: Number(revenueToday._sum.total ?? 0),
      avgPrepTime,
      recentOrders,
    };
  }
}
