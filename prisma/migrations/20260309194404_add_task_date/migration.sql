/*
  Warnings:

  - You are about to drop the column `organizationId` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the `Organization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `date` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Property" DROP CONSTRAINT "Property_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_organizationId_fkey";

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "organizationId";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "date" TEXT NOT NULL;

-- DropTable
DROP TABLE "Organization";

-- DropTable
DROP TABLE "User";
