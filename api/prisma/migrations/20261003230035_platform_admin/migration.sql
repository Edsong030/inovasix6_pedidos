-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'PLATFORM_ADMIN';

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "isPlatform" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ownerName" TEXT;
