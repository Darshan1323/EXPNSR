/*
  Warnings:

  - You are about to drop the column `receiptUrl` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "receiptUrl",
ADD COLUMN     "recieptUrl" TEXT;
