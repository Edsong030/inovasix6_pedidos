-- Reverte 20260928000000_order_number_unique. Aplicar manualmente, com a API parada:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/rollbacks/20260928000000_order_number_unique.down.sql
-- Depois disso, "prisma migrate deploy" volta a aplicar a migration quando desejado.
-- Nenhum dado de pedido e perdido: remove apenas o indice unico e o contador.
BEGIN;
DROP INDEX IF EXISTS "orders_restaurantId_orderNumber_key";
ALTER TABLE "restaurants" DROP COLUMN IF EXISTS "orderSeq";
-- Registro do Prisma: sem isto ele considera a migration ainda aplicada
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260928000000_order_number_unique';
COMMIT;
