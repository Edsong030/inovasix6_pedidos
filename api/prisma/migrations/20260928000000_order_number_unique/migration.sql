-- Numero de pedido unico por restaurante + contador atomico.
-- Comentarios somente em ASCII: bancos em WIN1252 recusam caracteres acentuados.
-- Rollback: prisma/rollbacks/20260928000000_order_number_unique.down.sql

-- 1) Pre-checagem: nao aplica sobre dados inconsistentes (nada e alterado se falhar)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "orders" GROUP BY "restaurantId", "orderNumber" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'orders: ha orderNumber repetido no mesmo restaurante. Renumere antes de aplicar esta migration.';
  END IF;
END $$;

-- 2) Contador por restaurante, iniciado no maior numero ja emitido
ALTER TABLE "restaurants" ADD COLUMN "orderSeq" INTEGER NOT NULL DEFAULT 0;

UPDATE "restaurants" AS r
SET "orderSeq" = COALESCE((SELECT max(o."orderNumber") FROM "orders" AS o WHERE o."restaurantId" = r."id"), 0);

-- 3) Garantia no banco: o mesmo numero nunca se repete dentro de um restaurante
CREATE UNIQUE INDEX "orders_restaurantId_orderNumber_key" ON "orders"("restaurantId", "orderNumber");
