-- CreateTable
CREATE TABLE "HouseholdProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "age" INTEGER,
    "occupation" TEXT,
    "consentPersonName" TEXT,
    "consentRelation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HouseholdProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommitteeProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "termStartDate" DATETIME,
    "termEndDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommitteeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OfficialProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "positionTitle" TEXT,
    "handoverDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OfficialProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "committeeRole" TEXT,
    "phoneNumber" TEXT,
    "lineId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "householdId" INTEGER,
    "scopeVillageId" INTEGER,
    "scopeSubDistrictId" INTEGER,
    "scopeDistrictId" INTEGER,
    "scopeProvinceId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "TargetHousehold" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_scopeVillageId_fkey" FOREIGN KEY ("scopeVillageId") REFERENCES "Village" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_scopeSubDistrictId_fkey" FOREIGN KEY ("scopeSubDistrictId") REFERENCES "SubDistrict" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_scopeDistrictId_fkey" FOREIGN KEY ("scopeDistrictId") REFERENCES "District" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_scopeProvinceId_fkey" FOREIGN KEY ("scopeProvinceId") REFERENCES "Province" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("committeeRole", "createdAt", "householdId", "id", "isActive", "lineId", "passwordHash", "phoneNumber", "role", "scopeDistrictId", "scopeProvinceId", "scopeSubDistrictId", "scopeVillageId", "username") SELECT "committeeRole", "createdAt", "householdId", "id", "isActive", "lineId", "passwordHash", "phoneNumber", "role", "scopeDistrictId", "scopeProvinceId", "scopeSubDistrictId", "scopeVillageId", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdProfile_userId_key" ON "HouseholdProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommitteeProfile_userId_key" ON "CommitteeProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialProfile_userId_key" ON "OfficialProfile"("userId");

