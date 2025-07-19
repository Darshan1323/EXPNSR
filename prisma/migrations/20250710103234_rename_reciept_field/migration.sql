/*
  Warnings:

  - You are about to drop the column `recieptUrl` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "recieptUrl",
ADD COLUMN     "receiptUrl" TEXT;
