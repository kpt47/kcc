-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Village" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "registryNo" INTEGER,
    "villageNo" TEXT NOT NULL,
    "villageName" TEXT NOT NULL,
    "subDistrictId" INTEGER NOT NULL,
    "budgetYear" INTEGER NOT NULL,
    "budgetAmount" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Village_subDistrictId_fkey" FOREIGN KEY ("subDistrictId") REFERENCES "SubDistrict" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Village" ("budgetAmount", "budgetYear", "createdAt", "id", "registryNo", "subDistrictId", "updatedAt", "villageName", "villageNo") SELECT "budgetAmount", "budgetYear", "createdAt", "id", "registryNo", "subDistrictId", "updatedAt", "villageName", "villageNo" FROM "Village";
DROP TABLE "Village";
ALTER TABLE "new_Village" RENAME TO "Village";
CREATE UNIQUE INDEX "Village_villageNo_subDistrictId_key" ON "Village"("villageNo", "subDistrictId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

