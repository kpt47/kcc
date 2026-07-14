-- CreateTable
CREATE TABLE "Region" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Province" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "regionId" INTEGER NOT NULL,
    CONSTRAINT "Province_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "District" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "provinceId" INTEGER NOT NULL,
    CONSTRAINT "District_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubDistrict" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "districtId" INTEGER NOT NULL,
    CONSTRAINT "SubDistrict_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "scopeVillageId" INTEGER,
    "scopeSubDistrictId" INTEGER,
    "scopeDistrictId" INTEGER,
    "scopeProvinceId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_scopeVillageId_fkey" FOREIGN KEY ("scopeVillageId") REFERENCES "Village" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_scopeSubDistrictId_fkey" FOREIGN KEY ("scopeSubDistrictId") REFERENCES "SubDistrict" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_scopeDistrictId_fkey" FOREIGN KEY ("scopeDistrictId") REFERENCES "District" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_scopeProvinceId_fkey" FOREIGN KEY ("scopeProvinceId") REFERENCES "Province" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Village" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "registryNo" INTEGER,
    "villageNo" TEXT NOT NULL,
    "villageName" TEXT NOT NULL,
    "subDistrict" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "subDistrictId" INTEGER,
    "budgetYear" INTEGER NOT NULL,
    "budgetAmount" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Village_subDistrictId_fkey" FOREIGN KEY ("subDistrictId") REFERENCES "SubDistrict" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Village" ("budgetAmount", "budgetYear", "createdAt", "district", "id", "province", "registryNo", "subDistrict", "updatedAt", "villageName", "villageNo") SELECT "budgetAmount", "budgetYear", "createdAt", "district", "id", "province", "registryNo", "subDistrict", "updatedAt", "villageName", "villageNo" FROM "Village";
DROP TABLE "Village";
ALTER TABLE "new_Village" RENAME TO "Village";
CREATE UNIQUE INDEX "Village_villageNo_subDistrict_district_province_key" ON "Village"("villageNo", "subDistrict", "district", "province");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Region_name_key" ON "Region"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Province_name_key" ON "Province"("name");

-- CreateIndex
CREATE UNIQUE INDEX "District_provinceId_name_key" ON "District"("provinceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SubDistrict_districtId_name_key" ON "SubDistrict"("districtId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
