/*
  Warnings:

  - Added the required column `recordedById` to the `VisitLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `VisitLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `visitType` to the `VisitLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VisitLog" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "recordedById" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "visitType" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "VisitLogAttachment" (
    "id" SERIAL NOT NULL,
    "visitLogId" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitLogAttachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VisitLog" ADD CONSTRAINT "VisitLog_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitLogAttachment" ADD CONSTRAINT "VisitLogAttachment_visitLogId_fkey" FOREIGN KEY ("visitLogId") REFERENCES "VisitLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
