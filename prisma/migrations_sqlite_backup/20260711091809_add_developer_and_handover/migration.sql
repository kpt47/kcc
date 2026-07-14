-- CreateTable
CREATE TABLE "Developer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "position" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VillageAssignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "developerId" INTEGER NOT NULL,
    "villageId" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "VillageAssignment_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VillageAssignment_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HandoverLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "handoverDate" DATETIME NOT NULL,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "villageCount" INTEGER NOT NULL,
    "notes" TEXT,
    CONSTRAINT "HandoverLog_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Developer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HandoverLog_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Developer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
