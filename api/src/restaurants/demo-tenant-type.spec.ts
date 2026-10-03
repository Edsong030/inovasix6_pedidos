import { BadRequestException } from '@nestjs/common';
import { BusinessType, UserRole } from '@prisma/client';
import { RestaurantsService } from './restaurants.service';

/** Estabelecimentos de demonstração têm tipo fixo; restaurante real continua podendo trocar. */
function serviceFor(slug: string, businessType: BusinessType) {
  const row = { id: 'r1', slug, businessType, name: 'Restaurante Demo', accentColor: 'inovasix', openingHours: null, avgPrepMinutes: 30 };
  const update = jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...row, ...data }));
  const prisma = { restaurant: { findUnique: jest.fn(async () => row), update } };
  return { svc: new RestaurantsService(prisma as never), update };
}

describe('tipo de negócio dos estabelecimentos de demonstração', () => {
  it('recusa trocar o tipo do restaurante-demo, mesmo para o administrador', async () => {
    const { svc, update } = serviceFor('restaurante-demo', BusinessType.RESTAURANT);
    await expect(svc.updateSettings('r1', UserRole.ADMIN, { businessType: BusinessType.CONFECTIONERY }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('aceita salvar o próprio tipo do estabelecimento de demonstração', async () => {
    const { svc, update } = serviceFor('confeitaria-demo', BusinessType.CONFECTIONERY);
    await svc.updateSettings('r1', UserRole.ADMIN, { businessType: BusinessType.CONFECTIONERY });
    expect(update).toHaveBeenCalled();
  });

  it('restaurante real: administrador continua podendo trocar o tipo', async () => {
    const { svc, update } = serviceFor('pizzaria-do-ze', BusinessType.RESTAURANT);
    await svc.updateSettings('r1', UserRole.ADMIN, { businessType: BusinessType.SNACK_BAR });
    expect(update.mock.calls[0][0].data).toMatchObject({ businessType: BusinessType.SNACK_BAR });
  });
});
