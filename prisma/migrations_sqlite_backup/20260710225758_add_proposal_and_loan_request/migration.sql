-- CreateTable
CREATE TABLE "ProjectProposal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "householdId" INTEGER NOT NULL,
    "volumeNo" TEXT,
    "proposalNo" TEXT,
    "applicantAge" INTEGER NOT NULL,
    "occupation" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "proposedDate" DATETIME NOT NULL,
    "workerOpinion" TEXT,
    "workerReason" TEXT,
    "workerName" TEXT,
    "workerDate" DATETIME,
    "committeeDecision" TEXT,
    "committeeAmount" REAL,
    "committeeReason" TEXT,
    "committeeChairName" TEXT,
    "committeeDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectProposal_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "TargetHousehold" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectProposalItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proposalId" INTEGER NOT NULL,
    "itemNo" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    CONSTRAINT "ProjectProposalItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ProjectProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoanRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "householdId" INTEGER NOT NULL,
    "volumeNo" TEXT,
    "requestNo" TEXT,
    "applicantAge" INTEGER NOT NULL,
    "occupation" TEXT NOT NULL,
    "requestedAmount" REAL NOT NULL,
    "agreesToRegulations" BOOLEAN NOT NULL DEFAULT false,
    "spouseConsentName" TEXT,
    "requestDate" DATETIME NOT NULL,
    "workerOpinion" TEXT,
    "workerReason" TEXT,
    "workerName" TEXT,
    "workerDate" DATETIME,
    "committeeDecision" TEXT,
    "committeeAmount" REAL,
    "committeeReason" TEXT,
    "committeeChairName" TEXT,
    "committeeDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoanRequest_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "TargetHousehold" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
