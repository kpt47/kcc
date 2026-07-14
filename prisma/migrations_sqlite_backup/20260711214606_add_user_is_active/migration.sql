-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
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
INSERT INTO "new_User" ("committeeRole", "createdAt", "displayName", "householdId", "id", "lineId", "passwordHash", "phoneNumber", "role", "scopeDistrictId", "scopeProvinceId", "scopeSubDistrictId", "scopeVillageId", "username") SELECT "committeeRole", "createdAt", "displayName", "householdId", "id", "lineId", "passwordHash", "phoneNumber", "role", "scopeDistrictId", "scopeProvinceId", "scopeSubDistrictId", "scopeVillageId", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
