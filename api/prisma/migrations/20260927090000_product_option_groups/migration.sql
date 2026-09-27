-- Grupos de opcoes por produto e escolhas gravadas no item do pedido.
-- Evolui a estrutura anterior (products.addons e order_items.addons, ambas JSON)
-- sem perder dados: converte primeiro, remove as colunas antigas no final.
-- Comentarios somente em ASCII (bancos em WIN1252).

-- 1) Nova configuracao no produto
ALTER TABLE "products" ADD COLUMN "optionGroups" JSONB;

-- Adicionais antigos viram um grupo opcional "Adicionais" (multipla escolha)
UPDATE "products" AS p
SET "optionGroups" = jsonb_build_array(jsonb_build_object(
  'id', 'adicionais',
  'name', 'Adicionais',
  'required', false,
  'min', 0,
  'max', jsonb_array_length(p."addons"),
  'multiple', true,
  'options', (
    SELECT jsonb_agg(jsonb_build_object(
      'id', COALESCE(NULLIF(t.a->>'id', ''), 'opcao-' || t.ord),
      'name', COALESCE(NULLIF(t.a->>'name', ''), 'Adicional ' || t.ord),
      'price', COALESCE((t.a->>'price')::numeric, 0),
      'available', true
    ) ORDER BY t.ord)
    FROM jsonb_array_elements(p."addons") WITH ORDINALITY AS t(a, ord)
  )
))
WHERE jsonb_typeof(p."addons") = 'array'
  AND jsonb_array_length(p."addons") > 0;

-- 2) Escolhas do item do pedido (snapshot: nome e preco do momento)
CREATE TABLE "order_item_options" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_item_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_item_options_orderItemId_idx" ON "order_item_options"("orderItemId");

ALTER TABLE "order_item_options" ADD CONSTRAINT "order_item_options_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Adicionais ja gravados nos pedidos existentes viram linhas de escolha
INSERT INTO "order_item_options" ("id", "orderItemId", "groupId", "groupName", "optionId", "optionName", "price", "sortOrder")
SELECT
  oi."id" || '-opt-' || t.ord,
  oi."id",
  'adicionais',
  'Adicionais',
  COALESCE(NULLIF(t.a->>'id', ''), 'opcao-' || t.ord),
  COALESCE(NULLIF(t.a->>'name', ''), 'Adicional'),
  COALESCE((t.a->>'price')::numeric, 0),
  (t.ord - 1)::int
FROM "order_items" AS oi
CROSS JOIN LATERAL jsonb_array_elements(oi."addons") WITH ORDINALITY AS t(a, ord)
WHERE jsonb_typeof(oi."addons") = 'array';

-- 3) Estrutura antiga, ja convertida
ALTER TABLE "products" DROP COLUMN "addons";
ALTER TABLE "order_items" DROP COLUMN "addons";
