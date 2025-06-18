/*
  Warnings:

  - You are about to drop the column `config` on the `CustomProvider` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `CustomProvider` table. All the data in the column will be lost.
  - Added the required column `model` to the `CustomProvider` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CustomProvider" DROP COLUMN "config",
DROP COLUMN "provider",
ADD COLUMN     "model" TEXT NOT NULL;
