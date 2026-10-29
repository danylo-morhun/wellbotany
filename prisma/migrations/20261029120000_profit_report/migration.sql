-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('ADS_GOOGLE', 'ADS_META', 'ADS_ALLEGRO', 'ADS_OTHER', 'SHIPPING', 'PACKAGING', 'SERVICES', 'OTHER');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "unitCostPln" INTEGER;

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amountPln" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");
