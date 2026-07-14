-- CreateTable
CREATE TABLE "PasswordResetOtp" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemAuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "username" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
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
INSERT INTO "new_User" ("committeeRole", "createdAt", "email", "householdId", "id", "isActive", "lineId", "passwordHash", "phoneNumber", "role", "scopeDistrictId", "scopeProvinceId", "scopeSubDistrictId", "scopeVillageId", "username")
SELECT "committeeRole", "createdAt", 'user-' || "id" || '@placeholder.local', "householdId", "id", "isActive", "lineId", "passwordHash", "phoneNumber", "role", "scopeDistrictId", "scopeProvinceId", "scopeSubDistrictId", "scopeVillageId", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
