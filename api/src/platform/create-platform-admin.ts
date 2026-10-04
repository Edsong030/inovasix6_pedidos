/**
 * Cria (ou redefine) um usuário PLATFORM_ADMIN da equipe Inovasix6.
 *
 * Único jeito de criar esse papel: nenhum endpoint da API o atribui. Os dados vêm de
 * variáveis de ambiente (a senha nunca passa pela linha de comando):
 *
 *   PLATFORM_ADMIN_EMAIL     obrigatório
 *   PLATFORM_ADMIN_PASSWORD  obrigatório (10+ caracteres, com letras e números)
 *   PLATFORM_ADMIN_NAME      opcional (padrão: Equipe Inovasix6)
 *   PLATFORM_SLUG            opcional (padrão: inovasix-plataforma) — slug usado no login
 *
 * Desenvolvimento:  npm run platform:create-admin
 * Imagem Docker:    node dist/platform/create-platform-admin.js
 *
 * O estabelecimento interno da plataforma (isPlatform) é criado na primeira execução.
 * Se o usuário já existir nele, a senha é redefinida, o papel e o acesso são
 * restaurados e as sessões abertas são encerradas.
 */
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const DEFAULT_SLUG = 'inovasix-plataforma';
const PLATFORM_NAME = 'Inovasix6 Plataforma';

function fail(message: string): never {
  console.error(`⛔ ${message}`);
  process.exit(1);
}

async function main() {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim();
  const password = process.env.PLATFORM_ADMIN_PASSWORD ?? '';
  const name = process.env.PLATFORM_ADMIN_NAME?.trim() || 'Equipe Inovasix6';
  const slug = (
    process.env.PLATFORM_SLUG?.trim() || DEFAULT_SLUG
  ).toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fail('Defina PLATFORM_ADMIN_EMAIL com um e-mail válido.');
  // Mesma regra de senha nova da API (CreateUserDto)
  if (
    password.length < 10 ||
    password.length > 128 ||
    !/\p{L}/u.test(password) ||
    !/\d/.test(password)
  ) {
    fail(
      'Defina PLATFORM_ADMIN_PASSWORD com 10 a 128 caracteres, incluindo letras e números.',
    );
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    fail('PLATFORM_SLUG inválido (minúsculas, números e hífens).');

  const prisma = new PrismaClient();
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await prisma.$transaction(async (tx) => {
      let home = await tx.restaurant.findUnique({
        where: { slug },
        select: { id: true, isPlatform: true },
      });
      // Nunca transforma um cliente em estabelecimento da plataforma
      if (home && !home.isPlatform) {
        throw new Error(
          `O slug "${slug}" pertence a um estabelecimento cliente. Use outro PLATFORM_SLUG.`,
        );
      }
      home ??= await tx.restaurant.create({
        data: {
          name: PLATFORM_NAME,
          slug,
          isPlatform: true,
          acceptingOrders: false,
        },
        select: { id: true, isPlatform: true },
      });

      const existing = await tx.user.findUnique({
        where: { email_restaurantId: { email, restaurantId: home.id } },
        select: { id: true },
      });
      if (existing) {
        await tx.user.update({
          where: { id: existing.id },
          data: {
            name,
            password: hash,
            role: UserRole.PLATFORM_ADMIN,
            active: true,
          },
        });
        await tx.userSession.updateMany({
          where: { userId: existing.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return 'atualizado';
      }
      await tx.user.create({
        data: {
          restaurantId: home.id,
          name,
          email,
          password: hash,
          role: UserRole.PLATFORM_ADMIN,
        },
      });
      return 'criado';
    });

    console.log(`✔ PLATFORM_ADMIN ${result}: ${email}`);
    console.log(
      `  Login: estabelecimento "${slug}", e-mail ${email} e a senha definida em PLATFORM_ADMIN_PASSWORD.`,
    );
  } catch (e) {
    console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
