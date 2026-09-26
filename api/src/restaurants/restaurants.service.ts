import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateRestaurantSettingsDto } from './dto/update-restaurant-settings.dto';

const SETTINGS_SELECT = { id: true, name: true, slug: true, businessType: true } as const;

@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: SETTINGS_SELECT,
    });
    if (!restaurant) throw new NotFoundException('Estabelecimento não encontrado');
    return restaurant;
  }

  async updateSettings(restaurantId: string, dto: UpdateRestaurantSettingsDto) {
    await this.getSettings(restaurantId);
    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { businessType: dto.businessType },
      select: SETTINGS_SELECT,
    });
  }
}
