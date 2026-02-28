/*
  Warnings:

  - A unique constraint covering the columns `[category,month]` on the table `Budget` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Budget_category_key";

-- CreateIndex
CREATE UNIQUE INDEX "Budget_category_month_key" ON "Budget"("category", "month");
