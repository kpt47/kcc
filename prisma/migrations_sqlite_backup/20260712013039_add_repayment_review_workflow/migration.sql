-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LoanRepayment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "loanId" INTEGER NOT NULL,
    "receiptNo" TEXT,
    "paymentDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "note" TEXT,
    "transferSlipUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "householdNote" TEXT,
    "committeeReply" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanRepayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LoanRepayment" ("amount", "createdAt", "id", "loanId", "note", "paymentDate", "receiptNo", "transferSlipUrl") SELECT "amount", "createdAt", "id", "loanId", "note", "paymentDate", "receiptNo", "transferSlipUrl" FROM "LoanRepayment";
DROP TABLE "LoanRepayment";
ALTER TABLE "new_LoanRepayment" RENAME TO "LoanRepayment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
