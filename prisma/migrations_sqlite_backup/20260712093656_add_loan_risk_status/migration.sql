-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Loan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "householdId" INTEGER NOT NULL,
    "borrowRound" INTEGER NOT NULL,
    "contractNo" TEXT,
    "amount" REAL NOT NULL,
    "receivedDate" DATETIME NOT NULL,
    "dueDate" DATETIME,
    "occupation" TEXT,
    "outstandingBalance" REAL NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedById" INTEGER,
    "approvedAt" DATETIME,
    "riskStatus" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Loan_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "TargetHousehold" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Loan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Loan" ("amount", "approvalStatus", "approvedAt", "approvedById", "borrowRound", "contractNo", "createdAt", "dueDate", "householdId", "id", "isClosed", "occupation", "outstandingBalance", "receivedDate", "updatedAt") SELECT "amount", "approvalStatus", "approvedAt", "approvedById", "borrowRound", "contractNo", "createdAt", "dueDate", "householdId", "id", "isClosed", "occupation", "outstandingBalance", "receivedDate", "updatedAt" FROM "Loan";
DROP TABLE "Loan";
ALTER TABLE "new_Loan" RENAME TO "Loan";
CREATE UNIQUE INDEX "Loan_householdId_borrowRound_key" ON "Loan"("householdId", "borrowRound");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

