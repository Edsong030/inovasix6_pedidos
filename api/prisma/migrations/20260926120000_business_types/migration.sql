-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('RESTAURANT', 'SNACK_BAR', 'CONFECTIONERY');

-- CreateEnum
CREATE TYPE "SaleUnit" AS ENUM ('UNIT', 'KG', 'HUNDRED');

-- AlterEnum

ALTER TYPE "OrderChannel" ADD VALUE 'IFOOD';
ALTER TYPE "OrderChannel" ADD VALUE 'WHATSAPP';

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "businessType" "BusinessType" NOT NULL DEFAULT 'RESTAURANT';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "addons" JSONB,
ADD COLUMN     "madeToOrder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minLeadTimeHours" INTEGER,
ADD COLUMN     "observationOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "saleUnit" "SaleUnit" NOT NULL DEFAULT 'UNIT';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "isPreorder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scheduledFor" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "addons" JSONB,
ADD COLUMN     "unit" "SaleUnit" NOT NULL DEFAULT 'UNIT',
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,3);

