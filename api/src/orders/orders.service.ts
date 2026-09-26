import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private orderInclude = {
    items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
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
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Pedido deve ter pelo menos um item');
    }

    // Busca produtos e calcula valores
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, restaurantId },
    });

    if (products.length !== productIds.length) {
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

      // Adicionais: preços sempre do cadastro, nunca do cliente
      const catalog = Array.isArray(product.addons)
        ? (product.addons as Array<{ id: string; name: string; price: number }>)
        : [];
      const addons = (item.addonIds ?? []).map((addonId) => {
        const addon = catalog.find((a) => a.id === addonId);
        if (!addon) throw new BadRequestException(`Adicional inválido para "${product.name}"`);
        return { id: addon.id, name: addon.name, price: Number(addon.price) };
      });
      const addonsPrice = addons.reduce((s, a) => s + a.price, 0);

      const unitPrice = Number(product.price) + addonsPrice;
      const totalPrice = Math.round(unitPrice * item.quantity * 100) / 100;
      return {
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unit: product.saleUnit,
        unitPrice,
        totalPrice,
        notes: item.notes,
        addons: addons.length ? addons : undefined,
      };
    });

    const subtotal = itemsData.reduce((sum, i) => sum + i.totalPrice, 0);
    const discount = dto.discount ?? 0;
    const total = subtotal - discount;

    // Número sequencial do pedido por restaurante
    const lastOrder = await this.prisma.order.findFirst({
      where: { restaurantId },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

    const order = await this.prisma.order.create({
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
        subtotal,
        discount,
        total,
        items: { create: itemsData },
      },
      include: this.orderInclude,
    });

    // Ocupa mesa se for salão
    if (dto.tableId && dto.channel === 'DINE_IN') {
      await this.prisma.table.update({
        where: { id: dto.tableId },
        data: { status: 'OCCUPIED' },
      });
    }

    return order;
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
      where: { id },
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
          tableId: order.tableId,
          status: { in: ['RECEIVED', 'PREPARING', 'READY'] },
        },
      });
      if (activeOrders === 0) {
        await this.prisma.table.update({
          where: { id: order.tableId },
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

    // Tempo médio de preparo (do received ao ready)
    const completedToday = await this.prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: today, lt: tomorrow },
        status: { in: [OrderStatus.DELIVERED, OrderStatus.READY] },
        prepStartedAt: { not: null },
        readyAt: { not: null },
      },
      select: { createdAt: true, readyAt: true },
    });

    let avgPrepTime = 0;
    if (completedToday.length > 0) {
      const totalMs = completedToday.reduce((sum, o) => {
        return sum + (o.readyAt!.getTime() - o.createdAt.getTime());
      }, 0);
      avgPrepTime = Math.round(totalMs / completedToday.length / 60000); // minutos
    }

    return {
      ordersToday,
      inPreparation,
      revenueToday: Number(revenueToday._sum.total ?? 0),
      avgPrepTime,
      recentOrders,
    };
  }
}
