/*
  Warnings:

  - You are about to drop the column `RecurringInterval` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "RecurringInterval",
ADD COLUMN     "recurringInterval" "RecurringInterval";
