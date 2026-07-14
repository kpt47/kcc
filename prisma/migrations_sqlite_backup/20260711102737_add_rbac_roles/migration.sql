-- AlterTable
ALTER TABLE "User" ADD COLUMN "committeeRole" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BankTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bankAccountId" INTEGER NOT NULL,
    "transactionDate" DATETIME NOT NULL,
    "documentNo" TEXT,
    "description" TEXT NOT NULL,
    "depositAmount" REAL NOT NULL DEFAULT 0,
    "withdrawAmount" REAL NOT NULL DEFAULT 0,
    "balance" REAL NOT NULL,
    "note" TEXT,
    "chairmanApprovedById" INTEGER,
    "chairmanApprovedAt" DATETIME,
    "financeApprovedById" INTEGER,
    "financeApprovedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BankTransaction_chairmanApprovedById_fkey" FOREIGN KEY ("chairmanApprovedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BankTransaction_financeApprovedById_fkey" FOREIGN KEY ("financeApprovedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BankTransaction" ("balance", "bankAccountId", "createdAt", "depositAmount", "description", "documentNo", "id", "note", "transactionDate", "withdrawAmount") SELECT "balance", "bankAccountId", "createdAt", "depositAmount", "description", "documentNo", "id", "note", "transactionDate", "withdrawAmount" FROM "BankTransaction";
DROP TABLE "BankTransaction";
ALTER TABLE "new_BankTransaction" RENAME TO "BankTransaction";
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Loan_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "TargetHousehold" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Loan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Loan" ("amount", "borrowRound", "contractNo", "createdAt", "dueDate", "householdId", "id", "isClosed", "occupation", "outstandingBalance", "receivedDate", "updatedAt") SELECT "amount", "borrowRound", "contractNo", "createdAt", "dueDate", "householdId", "id", "isClosed", "occupation", "outstandingBalance", "receivedDate", "updatedAt" FROM "Loan";
DROP TABLE "Loan";
ALTER TABLE "new_Loan" RENAME TO "Loan";
CREATE UNIQUE INDEX "Loan_householdId_borrowRound_key" ON "Loan"("householdId", "borrowRound");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
