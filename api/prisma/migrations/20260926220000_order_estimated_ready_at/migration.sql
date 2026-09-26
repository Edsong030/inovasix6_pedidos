-- Previsao de pronto do pedido (calculada no servidor ao criar o pedido).
-- Comentarios somente em ASCII: bancos em WIN1252 recusam caracteres como setas.
ALTER TABLE "orders" ADD COLUMN "estimatedReadyAt" TIMESTAMP(3);

-- Pedidos ja existentes: encomenda usa o horario combinado; os demais usam
-- criacao + tempo medio do PROPRIO restaurante (fora de 1 a 240 min usa 30 min).
UPDATE "orders" AS o
SET "estimatedReadyAt" = COALESCE(
  o."scheduledFor",
  o."createdAt" + make_interval(mins => CASE
    WHEN r."avgPrepMinutes" BETWEEN 1 AND 240 THEN r."avgPrepMinutes"
    ELSE 30
  END)
)
FROM "restaurants" AS r
WHERE r."id" = o."restaurantId"
  AND o."estimatedReadyAt" IS NULL;
