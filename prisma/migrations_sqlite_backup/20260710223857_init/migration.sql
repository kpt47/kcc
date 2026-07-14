-- CreateTable
CREATE TABLE "Village" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "registryNo" INTEGER,
    "villageNo" TEXT NOT NULL,
    "villageName" TEXT NOT NULL,
    "subDistrict" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "budgetYear" INTEGER NOT NULL,
    "budgetAmount" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TargetHousehold" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "villageId" INTEGER NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "headFirstName" TEXT NOT NULL,
    "headLastName" TEXT NOT NULL,
    "houseNo" TEXT,
    "memberCount" INTEGER,
    "incomeBeforeLoan" REAL,
    "isDefaulted" BOOLEAN NOT NULL DEFAULT false,
    "defaultedAmount" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TargetHousehold_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HouseholdIncomeRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "householdId" INTEGER NOT NULL,
    "yearsAfterLoan" INTEGER NOT NULL,
    "income" REAL NOT NULL,
    CONSTRAINT "HouseholdIncomeRecord_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "TargetHousehold" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommitteeMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "villageId" INTEGER NOT NULL,
    "setNo" INTEGER,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    CONSTRAINT "CommitteeMember_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DevelopmentWorkerAssignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "villageId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    CONSTRAINT "DevelopmentWorkerAssignment_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VisitLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "villageId" INTEGER NOT NULL,
    "visitDate" DATETIME NOT NULL,
    "visitorName" TEXT NOT NULL,
    "visitorTitle" TEXT,
    "notes" TEXT,
    CONSTRAINT "VisitLog_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Loan" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Loan_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "TargetHousehold" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoanRepayment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "loanId" INTEGER NOT NULL,
    "receiptNo" TEXT,
    "paymentDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanRepayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "villageId" INTEGER NOT NULL,
    "bankName" TEXT,
    "branch" TEXT,
    "accountNo" TEXT,
    "accountName" TEXT,
    CONSTRAINT "BankAccount_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bankAccountId" INTEGER NOT NULL,
    "transactionDate" DATETIME NOT NULL,
    "documentNo" TEXT,
    "description" TEXT NOT NULL,
    "depositAmount" REAL NOT NULL DEFAULT 0,
    "withdrawAmount" REAL NOT NULL DEFAULT 0,
    "balance" REAL NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VillageHandover" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "villageId" INTEGER NOT NULL,
    "handoverNo" INTEGER NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromPosition" TEXT,
    "toName" TEXT NOT NULL,
    "toPosition" TEXT,
    "handoverDate" DATETIME NOT NULL,
    CONSTRAINT "VillageHandover_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VillageStatusSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "villageId" INTEGER NOT NULL,
    "handoverId" INTEGER,
    "totalHouseholds" INTEGER NOT NULL,
    "householdsReceivedLoan" INTEGER NOT NULL,
    "householdsRepaying" INTEGER NOT NULL,
    "fundWithHouseholds" REAL NOT NULL,
    "fundInBankAccount" REAL NOT NULL,
    "fundElsewhere" REAL NOT NULL,
    "purpleBookExists" BOOLEAN NOT NULL,
    "purpleBookCorrect" BOOLEAN,
    "greenBookExists" BOOLEAN NOT NULL,
    "greenBookCorrect" BOOLEAN,
    "yellowBookExists" BOOLEAN NOT NULL,
    "yellowBookCorrect" BOOLEAN,
    "hasDefaultedHouseholds" BOOLEAN NOT NULL,
    "defaultedAmount" REAL,
    "note" TEXT,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VillageStatusSnapshot_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VillageStatusSnapshot_handoverId_fkey" FOREIGN KEY ("handoverId") REFERENCES "VillageHandover" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Village_villageNo_subDistrict_district_province_key" ON "Village"("villageNo", "subDistrict", "district", "province");

-- CreateIndex
CREATE UNIQUE INDEX "TargetHousehold_villageId_sequenceNo_key" ON "TargetHousehold"("villageId", "sequenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdIncomeRecord_householdId_yearsAfterLoan_key" ON "HouseholdIncomeRecord"("householdId", "yearsAfterLoan");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_householdId_borrowRound_key" ON "Loan"("householdId", "borrowRound");
