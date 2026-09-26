-- Alinha o nome padrão ao tipo de negócio em estabelecimentos que trocaram de tipo
-- antes desta regra existir (ex.: Confeitaria chamada "Restaurante Demo").
-- Só altera nomes de fábrica; nomes personalizados não são tocados.
UPDATE "restaurants"
SET "name" = CASE "businessType"
    WHEN 'RESTAURANT'    THEN 'Restaurante Demo'
    WHEN 'SNACK_BAR'     THEN 'Lanchonete Demo'
    WHEN 'CONFECTIONERY' THEN 'Confeitaria Demo'
    WHEN 'JAPANESE'      THEN 'Japonês Demo'
  END,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" IN ('Restaurante Demo', 'Lanchonete Demo', 'Confeitaria Demo', 'Japonês Demo')
  AND "name" <> CASE "businessType"
    WHEN 'RESTAURANT'    THEN 'Restaurante Demo'
    WHEN 'SNACK_BAR'     THEN 'Lanchonete Demo'
    WHEN 'CONFECTIONERY' THEN 'Confeitaria Demo'
    WHEN 'JAPANESE'      THEN 'Japonês Demo'
  END;
