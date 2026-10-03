-- Reverte 20260929000000_user_sessions. Aplicar manualmente, com a API parada:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/rollbacks/20260929000000_user_sessions.down.sql
-- Efeito: todas as sessoes deixam de existir (todos precisam entrar de novo).
-- Atencao: a API desta versao exige a tabela; reverta tambem o codigo antes de subir a API.
BEGIN;
DROP TABLE IF EXISTS "user_sessions";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260929000000_user_sessions';
COMMIT;
