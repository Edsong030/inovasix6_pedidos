import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { timingState } from '../orders/order-timing';

@Injectable()
export class KitchenService {
  constructor(private prisma: PrismaService) {}

  async getQueue(restaurantId: string) {
    const [orders, restaurant] = await Promise.all([
      this.prisma.order.findMany({
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
      }),
      this.prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { avgPrepMinutes: true } }),
    ]);

    // Relógio do servidor. Ordem: previsão de pronto mais próxima (atrasados primeiro)
    const now = Date.now();
    return orders
      .map((o) => {
        const timing = timingState(o, restaurant?.avgPrepMinutes, now);
        const elapsedMinutes = Math.max(0, Math.floor((now - o.createdAt.getTime()) / 60000));
        // Encomenda: urgente já perto do horário combinado; demais: quando passam da previsão
        const isUrgent = timing.state === 'late' || (!!o.scheduledFor && timing.state === 'due_soon');
        return {
          ...o,
          estimatedReadyAt: timing.deadline,
          elapsedMinutes,
          isUrgent,
          timingState: timing.state,
          minutesLeft: timing.minutesLeft,
          minutesLate: timing.minutesLate,
        };
      })
      .sort((a, b) => a.estimatedReadyAt.getTime() - b.estimatedReadyAt.getTime());
  }
}
