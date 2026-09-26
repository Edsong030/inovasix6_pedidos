import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Restaurant, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateRestaurantSettingsDto } from './dto/update-restaurant-settings.dto';
import { defaultOpeningHours, type OpeningHour } from './settings.constants';

/**
 * Somente campos públicos do estabelecimento. Nada de segredos, tokens
 * ou dados de outros restaurantes: toda consulta filtra pelo restaurantId do token.
 */
const SETTINGS_SELECT = {
  id: true, name: true, slug: true, businessType: true,
  phone: true, whatsapp: true, email: true, cnpj: true, logoUrl: true, accentColor: true,
  zipCode: true, street: true, addressNumber: true, complement: true, district: true, city: true, state: true,
  openingHours: true, avgPrepMinutes: true, acceptingOrders: true, showUnavailableProducts: true, orderMessage: true,
} as const satisfies Prisma.RestaurantSelect;

type SettingsRow = Pick<Restaurant, keyof typeof SETTINGS_SELECT>;

function isOpeningHours(value: unknown): value is OpeningHour[] {
  return Array.isArray(value) && value.length === 7 && value.every(
    (h) => h && typeof h === 'object' && typeof h.day === 'number' && typeof h.open === 'boolean',
  );
}

/** Formato consumido pelo frontend (textos vazios em vez de null). */
function toSettings(r: SettingsRow) {
  return {
    name: r.name,
    businessType: r.businessType,
    phone: r.phone ?? '',
    whatsapp: r.whatsapp ?? '',
    email: r.email ?? '',
    cnpj: r.cnpj ?? '',
    logoUrl: r.logoUrl ?? '',
    accentColor: r.accentColor,
    zipCode: r.zipCode ?? '',
    street: r.street ?? '',
    number: r.addressNumber ?? '',
    complement: r.complement ?? '',
    district: r.district ?? '',
    city: r.city ?? '',
    state: r.state ?? '',
    openingHours: isOpeningHours(r.openingHours)
      ? [...r.openingHours].sort((a, b) => a.day - b.day)
      : defaultOpeningHours(r.businessType),
    avgPrepMinutes: r.avgPrepMinutes,
    acceptingOrders: r.acceptingOrders,
    showUnavailableProducts: r.showUnavailableProducts,
    orderMessage: r.orderMessage ?? '',
  };
}

/** "Rua X, 123 - Compl. - Bairro - Cidade/UF - CEP 00000-000" para o campo legado `address`. */
function addressLine(r: SettingsRow): string | null {
  const street = [r.street, r.addressNumber].filter(Boolean).join(', ');
  const city = [r.city, r.state].filter(Boolean).join('/');
  const cep = r.zipCode ? `CEP ${r.zipCode.replace(/^(\d{5})(\d{3})$/, '$1-$2')}` : '';
  const parts = [street, r.complement, r.district, city, cep].filter(Boolean);
  return parts.length ? parts.join(' - ') : null;
}

const ADDRESS_FIELDS = ['zipCode', 'street', 'number', 'complement', 'district', 'city', 'state'] as const;

@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService) {}

  private async findRow(restaurantId: string): Promise<SettingsRow> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: SETTINGS_SELECT,
    });
    if (!restaurant) throw new NotFoundException('Estabelecimento não encontrado');
    return restaurant;
  }

  async getSettings(restaurantId: string) {
    return toSettings(await this.findRow(restaurantId));
  }

  async updateSettings(restaurantId: string, role: UserRole, dto: UpdateRestaurantSettingsDto) {
    const current = await this.findRow(restaurantId);

    // Trocar o tipo de negócio muda textos e recursos do sistema inteiro: só o administrador
    if (dto.businessType && dto.businessType !== current.businessType && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Somente o administrador pode alterar o tipo de negócio');
    }

    if (dto.openingHours) {
      const days = new Set(dto.openingHours.map((h) => h.day));
      if (days.size !== 7) throw new BadRequestException('Informe os 7 dias da semana, sem repetir');
      const same = dto.openingHours.find((h) => h.open && h.opensAt === h.closesAt);
      if (same) throw new BadRequestException('Abertura e encerramento não podem ser iguais');
    }

    const { number, openingHours, ...rest } = dto;
    const data: Prisma.RestaurantUpdateInput = {
      ...rest,
      ...(number !== undefined && { addressNumber: number }),
      ...(openingHours && {
        openingHours: [...openingHours]
          .sort((a, b) => a.day - b.day)
          .map(({ day, open, opensAt, closesAt }) => ({ day, open, opensAt, closesAt })),
      }),
    };

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data,
      select: SETTINGS_SELECT,
    });

    // Mantém o endereço em uma linha (usado em outros pontos) coerente com os campos
    if (ADDRESS_FIELDS.some((f) => dto[f] !== undefined)) {
      await this.prisma.restaurant.update({
        where: { id: restaurantId },
        data: { address: addressLine(updated) },
      });
    }

    return toSettings(updated);
  }
}
