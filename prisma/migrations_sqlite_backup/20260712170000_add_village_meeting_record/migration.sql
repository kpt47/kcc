-- CreateTable
CREATE TABLE "VillageMeetingRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "villageId" INTEGER NOT NULL,
    "meetingDate" DATETIME NOT NULL,
    "agendaTopic" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VillageMeetingRecord_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VillageMeetingRecord_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
