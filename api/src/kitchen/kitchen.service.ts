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
    // Encomendas seguem a data de retirada/entrega: urgentes a menos de 1h do horário
    const dueAt = (o: (typeof orders)[number]) => (o.scheduledFor ?? o.createdAt).getTime();
    return orders
      .map((o) => {
        const elapsedMinutes = Math.floor((now - o.createdAt.getTime()) / 60000);
        const isUrgent = o.scheduledFor
          ? o.scheduledFor.getTime() - now <= 60 * 60000
          : elapsedMinutes >= 20;
        return { ...o, elapsedMinutes, isUrgent };
      })
      .sort((a, b) => dueAt(a) - dueAt(b));
  }
}
