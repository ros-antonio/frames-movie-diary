/*
  Warnings:

  - Made the column `userId` on table `CustomList` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "CustomList" DROP CONSTRAINT "CustomList_userId_fkey";

-- AlterTable
ALTER TABLE "CustomList" ALTER COLUMN "userId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "CustomList" ADD CONSTRAINT "CustomList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
