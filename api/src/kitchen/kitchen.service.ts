import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KitchenService {
  constructor(private prisma: PrismaService) {}

  async getQueue(restaurantId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: ['RECEIVED', 'PREPARING'] },
      },
      include: {
        items: {
          include: { product: { select: { name: true } } },
        },
        table: { select: { number: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const now = Date.now();
    return orders.map((o) => ({
      ...o,
      elapsedMinutes: Math.floor((now - o.createdAt.getTime()) / 60000),
      isUrgent: Math.floor((now - o.createdAt.getTime()) / 60000) >= 20,
    }));
  }
}
