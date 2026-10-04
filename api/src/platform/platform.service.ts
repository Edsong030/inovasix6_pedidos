import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { addressLine } from '../restaurants/restaurants.service';
import { DEMO_TENANT_TYPES } from '../restaurants/settings.constants';
import {
  CreateEstablishmentDto,
  UpdateEstablishmentDto,
} from './dto/establishment.dto';

/** Colunas da listagem (nada de segredos; usuários só na tela de detalhe). */
const LIST_SELECT = {
  id: true,
  name: true,
  slug: true,
  businessType: true,
  ownerName: true,
  email: true,
  phone: true,
  city: true,
  state: true,
  active: true,
  createdAt: true,
} as const satisfies Prisma.RestaurantSelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  whatsapp: true,
  cnpj: true,
  cpf: true,
  zipCode: true,
  street: true,
  addressNumber: true,
  complement: true,
  district: true,
  updatedAt: true,
  // Só os administradores do próprio estabelecimento (nunca senha)
  users: {
    where: { role: UserRole.ADMIN },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  },
} as const satisfies Prisma.RestaurantSelect;

type DetailRow = Prisma.RestaurantGetPayload<{ select: typeof DETAIL_SELECT }>;

/** Formato da API: CPF/CNPJ num campo só, número do endereço como "number". */
function toDetail(r: DetailRow) {
  const { cnpj, cpf, addressNumber, ...rest } = r;
  return { ...rest, document: cnpj ?? cpf ?? '', number: addressNumber ?? '' };
}

/** CNPJ vai para o campo cnpj (o mesmo da tela Configurações); CPF para o campo cpf. */
function documentFields(document: string) {
  return document.length === 14
    ? { cnpj: document, cpf: null }
    : { cnpj: null, cpf: document };
}

/** Campos obrigatórios no cadastro: na edição podem faltar, mas nunca ser apagados. */
const REQUIRED_ON_UPDATE = [
  'name',
  'businessType',
  'document',
  'ownerName',
  'email',
  'phone',
  'zipCode',
  'street',
  'city',
  'state',
] as const;

@Injectable()
export class PlatformService {
  constructor(private prisma: PrismaService) {}

  /** Estabelecimentos clientes (o interno da plataforma nunca aparece). */
  list() {
    return this.prisma.restaurant.findMany({
      where: { isPlatform: false },
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return toDetail(await this.findRow(id));
  }

  /**
   * Estabelecimento e primeiro ADMIN na mesma transação: ou os dois existem, ou nenhum.
   * O ADMIN fica vinculado só ao restaurantId recém-criado (gerado pelo banco).
   */
  async create(dto: CreateEstablishmentDto) {
    if (DEMO_TENANT_TYPES[dto.slug]) {
      throw new ConflictException(
        'Este slug é reservado para os estabelecimentos de demonstração',
      );
    }
    const {
      admin,
      document,
      number,
      slug,
      active,
      complement,
      district,
      whatsapp,
      ...fields
    } = dto;
    const address = {
      ...fields,
      whatsapp: whatsapp ?? null,
      addressNumber: number ?? null,
      complement: complement ?? null,
      district: district ?? null,
    };
    const password = await bcrypt.hash(admin.password, 10);

    try {
      const id = await this.prisma.$transaction(async (tx) => {
        const restaurant = await tx.restaurant.create({
          data: {
            ...address,
            ...documentFields(document),
            slug,
            active: active ?? true,
            isPlatform: false,
            address: addressLine(address),
          },
          select: { id: true },
        });
        await tx.user.create({
          data: {
            restaurantId: restaurant.id,
            name: admin.name,
            email: admin.email,
            password,
            role: UserRole.ADMIN,
          },
        });
        return restaurant.id;
      });
      return this.findOne(id);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe um estabelecimento com este slug',
        );
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateEstablishmentDto) {
    const current = await this.findRow(id);
    for (const field of REQUIRED_ON_UPDATE) {
      if (dto[field] === null)
        throw new BadRequestException(`O campo ${field} não pode ficar vazio`);
    }
    // Estabelecimento de demonstração tem tipo fixo (mesma regra da tela Configurações)
    const demoType = DEMO_TENANT_TYPES[current.slug];
    if (demoType && dto.businessType && dto.businessType !== demoType) {
      throw new BadRequestException(
        'Estabelecimento de demonstração tem tipo fixo.',
      );
    }

    const { document, number, ...fields } = dto;
    const data: Prisma.RestaurantUpdateInput = {
      ...fields,
      ...(number !== undefined && { addressNumber: number }),
      ...(document !== undefined && documentFields(document)),
    };
    const merged = {
      street: fields.street ?? current.street,
      addressNumber: number !== undefined ? number : current.addressNumber,
      complement:
        fields.complement !== undefined
          ? fields.complement
          : current.complement,
      district:
        fields.district !== undefined ? fields.district : current.district,
      city: fields.city ?? current.city,
      state: fields.state ?? current.state,
      zipCode: fields.zipCode ?? current.zipCode,
    };
    data.address = addressLine(merged);

    await this.prisma.restaurant.update({ where: { id: current.id }, data });
    return this.findOne(id);
  }

  /** Ativa ou inativa. Inativar derruba na hora todas as sessões do estabelecimento. */
  async setStatus(id: string, active: boolean) {
    const current = await this.findRow(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.restaurant.update({
        where: { id: current.id },
        data: { active },
      });
      if (!active) {
        await tx.userSession.updateMany({
          where: { restaurantId: current.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    });
    return this.findOne(id);
  }

  /** Só estabelecimentos clientes: o interno da plataforma responde 404. */
  private async findRow(id: string) {
    const row = await this.prisma.restaurant.findFirst({
      where: { id, isPlatform: false },
      select: DETAIL_SELECT,
    });
    if (!row) throw new NotFoundException('Estabelecimento não encontrado');
    return row;
  }
}
