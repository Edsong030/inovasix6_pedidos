-- Configurações do negócio (tela Configurações)
-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "accentColor" TEXT NOT NULL DEFAULT 'inovasix',
ADD COLUMN     "acceptingOrders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "addressNumber" TEXT,
ADD COLUMN     "avgPrepMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "complement" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "openingHours" JSONB,
ADD COLUMN     "orderMessage" TEXT,
ADD COLUMN     "showUnavailableProducts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "whatsapp" TEXT,
ADD COLUMN     "zipCode" TEXT;

