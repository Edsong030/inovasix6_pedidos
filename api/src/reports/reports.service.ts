import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport(restaurantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const orders = await this.prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: start, lte: end },
        status: { not: 'CANCELLED' },
      },
      include: {
        items: { include: { product: { select: { name: true, categoryId: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Totais gerais
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = orders.length;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Por canal
    const byChannel: Record<string, { count: number; revenue: number }> = {};
    orders.forEach((o) => {
      if (!byChannel[o.channel]) byChannel[o.channel] = { count: 0, revenue: 0 };
      byChannel[o.channel].count++;
      byChannel[o.channel].revenue += Number(o.total);
    });

    // Por forma de pagamento
    const byPayment: Record<string, { count: number; revenue: number }> = {};
    orders.forEach((o) => {
      if (!byPayment[o.paymentMethod]) byPayment[o.paymentMethod] = { count: 0, revenue: 0 };
      byPayment[o.paymentMethod].count++;
      byPayment[o.paymentMethod].revenue += Number(o.total);
    });

    // Top produtos
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    orders.forEach((o) => {
      o.items.forEach((item) => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
        }
        productSales[item.productId].qty += item.quantity;
        productSales[item.productId].revenue += Number(item.totalPrice);
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Por dia
    const byDay: Record<string, { count: number; revenue: number }> = {};
    orders.forEach((o) => {
      const day = o.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { count: 0, revenue: 0 };
      byDay[day].count++;
      byDay[day].revenue += Number(o.total);
    });

    return {
      period: { start: startDate, end: endDate },
      summary: { totalRevenue, totalOrders, avgTicket },
      byChannel,
      byPayment,
      topProducts,
      byDay: Object.entries(byDay).map(([date, v]) => ({ date, ...v })),
    };
  }

  async getOrderHistory(
    restaurantId: string,
    page = 1,
    limit = 20,
    filters?: { status?: string; channel?: string },
  ) {
    const where: Record<string, unknown> = { restaurantId };
    if (filters?.status) where['status'] = filters.status;
    if (filters?.channel) where['channel'] = filters.channel;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          table: { select: { number: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
