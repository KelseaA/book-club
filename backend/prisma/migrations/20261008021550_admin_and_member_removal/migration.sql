-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "removedAt" TIMESTAMP(3);
