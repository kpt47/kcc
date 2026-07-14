-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('HOUSEHOLD', 'VILLAGE_COMMITTEE', 'SUB_DISTRICT_ADMIN', 'DISTRICT_ADMIN', 'PROVINCIAL_ADMIN', 'GLOBAL_ADMIN', 'IT_SUPPORT');

-- CreateEnum
CREATE TYPE "CommitteeRole" AS ENUM ('CHAIRMAN', 'SECRETARY', 'FINANCE_MEMBER', 'NORMAL_MEMBER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ALERT', 'REMINDER');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('NORMAL', 'WATCHLIST', 'HIGH_RISK');

-- CreateTable
CREATE TABLE "Region" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Province" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "regionId" INTEGER NOT NULL,

    CONSTRAINT "Province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "provinceId" INTEGER NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubDistrict" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "districtId" INTEGER NOT NULL,

    CONSTRAINT "SubDistrict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "GlobalRole" NOT NULL,
    "committeeRole" "CommitteeRole",
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "lineId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "householdId" INTEGER,
    "scopeVillageId" INTEGER,
    "scopeSubDistrictId" INTEGER,
    "scopeDistrictId" INTEGER,
    "scopeProvinceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "age" INTEGER,
    "occupation" TEXT,
    "consentPersonName" TEXT,
    "consentRelation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitteeProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "termStartDate" TIMESTAMP(3),
    "termEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommitteeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficialProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "positionTitle" TEXT,
    "handoverDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficialProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Village" (
    "id" SERIAL NOT NULL,
    "registryNo" INTEGER,
    "villageNo" TEXT NOT NULL,
    "villageName" TEXT NOT NULL,
    "subDistrictId" INTEGER NOT NULL,
    "budgetYear" INTEGER NOT NULL,
    "budgetAmount" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Village_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetHousehold" (
    "id" SERIAL NOT NULL,
    "villageId" INTEGER NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "headFirstName" TEXT NOT NULL,
    "headLastName" TEXT NOT NULL,
    "houseNo" TEXT,
    "memberCount" INTEGER,
    "incomeBeforeLoan" DOUBLE PRECISION,
    "isDefaulted" BOOLEAN NOT NULL DEFAULT false,
    "defaultedAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TargetHousehold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdIncomeRecord" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "yearsAfterLoan" INTEGER NOT NULL,
    "income" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "HouseholdIncomeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitteeMember" (
    "id" SERIAL NOT NULL,
    "villageId" INTEGER NOT NULL,
    "setNo" INTEGER,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "CommitteeMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevelopmentWorkerAssignment" (
    "id" SERIAL NOT NULL,
    "villageId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "DevelopmentWorkerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitLog" (
    "id" SERIAL NOT NULL,
    "villageId" INTEGER NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "visitorName" TEXT NOT NULL,
    "visitorTitle" TEXT,
    "notes" TEXT,

    CONSTRAINT "VisitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Developer" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "position" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Developer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VillageAssignment" (
    "id" SERIAL NOT NULL,
    "developerId" INTEGER NOT NULL,
    "villageId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "VillageAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoverLog" (
    "id" SERIAL NOT NULL,
    "handoverDate" TIMESTAMP(3) NOT NULL,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "villageCount" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "HandoverLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "borrowRound" INTEGER NOT NULL,
    "contractNo" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "occupation" TEXT,
    "outstandingBalance" DOUBLE PRECISION NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "riskStatus" "RiskStatus" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanRepayment" (
    "id" SERIAL NOT NULL,
    "loanId" INTEGER NOT NULL,
    "receiptNo" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "transferSlipUrl" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "householdNote" TEXT,
    "committeeReply" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanRepayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" SERIAL NOT NULL,
    "villageId" INTEGER NOT NULL,
    "bankName" TEXT,
    "branch" TEXT,
    "accountNo" TEXT,
    "accountName" TEXT,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" SERIAL NOT NULL,
    "bankAccountId" INTEGER NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "documentNo" TEXT,
    "description" TEXT NOT NULL,
    "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "withdrawAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "passbookImageUrl" TEXT,
    "chairmanApprovedById" INTEGER,
    "chairmanApprovedAt" TIMESTAMP(3),
    "financeApprovedById" INTEGER,
    "financeApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VillageHandover" (
    "id" SERIAL NOT NULL,
    "villageId" INTEGER NOT NULL,
    "handoverNo" INTEGER NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromPosition" TEXT,
    "toName" TEXT NOT NULL,
    "toPosition" TEXT,
    "handoverDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VillageHandover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VillageStatusSnapshot" (
    "id" SERIAL NOT NULL,
    "villageId" INTEGER NOT NULL,
    "handoverId" INTEGER,
    "totalHouseholds" INTEGER NOT NULL,
    "householdsReceivedLoan" INTEGER NOT NULL,
    "householdsRepaying" INTEGER NOT NULL,
    "fundWithHouseholds" DOUBLE PRECISION NOT NULL,
    "fundInBankAccount" DOUBLE PRECISION NOT NULL,
    "fundElsewhere" DOUBLE PRECISION NOT NULL,
    "purpleBookExists" BOOLEAN NOT NULL,
    "purpleBookCorrect" BOOLEAN,
    "greenBookExists" BOOLEAN NOT NULL,
    "greenBookCorrect" BOOLEAN,
    "yellowBookExists" BOOLEAN NOT NULL,
    "yellowBookCorrect" BOOLEAN,
    "hasDefaultedHouseholds" BOOLEAN NOT NULL,
    "defaultedAmount" DOUBLE PRECISION,
    "note" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VillageStatusSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectProposal" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "volumeNo" TEXT,
    "proposalNo" TEXT,
    "applicantAge" INTEGER NOT NULL,
    "occupation" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "proposedDate" TIMESTAMP(3) NOT NULL,
    "workerOpinion" TEXT,
    "workerReason" TEXT,
    "workerName" TEXT,
    "workerDate" TIMESTAMP(3),
    "committeeDecision" TEXT,
    "committeeAmount" DOUBLE PRECISION,
    "committeeReason" TEXT,
    "committeeChairName" TEXT,
    "committeeDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectProposalItem" (
    "id" SERIAL NOT NULL,
    "proposalId" INTEGER NOT NULL,
    "itemNo" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProjectProposalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanRequest" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "volumeNo" TEXT,
    "requestNo" TEXT,
    "applicantAge" INTEGER NOT NULL,
    "occupation" TEXT NOT NULL,
    "requestedAmount" DOUBLE PRECISION NOT NULL,
    "agreesToRegulations" BOOLEAN NOT NULL DEFAULT false,
    "spouseConsentName" TEXT,
    "requestDate" TIMESTAMP(3) NOT NULL,
    "workerOpinion" TEXT,
    "workerReason" TEXT,
    "workerName" TEXT,
    "workerDate" TIMESTAMP(3),
    "committeeDecision" TEXT,
    "committeeAmount" DOUBLE PRECISION,
    "committeeReason" TEXT,
    "committeeChairName" TEXT,
    "committeeDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VillageMeetingRecord" (
    "id" SERIAL NOT NULL,
    "villageId" INTEGER NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "agendaTopic" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VillageMeetingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetOtp" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemAuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "username" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemAuditLog_pkey" PRIMARY KEY ("id")
);

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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdProfile_userId_key" ON "HouseholdProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommitteeProfile_userId_key" ON "CommitteeProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialProfile_userId_key" ON "OfficialProfile"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "Village_villageNo_subDistrictId_key" ON "Village"("villageNo", "subDistrictId");

-- CreateIndex
CREATE UNIQUE INDEX "TargetHousehold_villageId_sequenceNo_key" ON "TargetHousehold"("villageId", "sequenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdIncomeRecord_householdId_yearsAfterLoan_key" ON "HouseholdIncomeRecord"("householdId", "yearsAfterLoan");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_householdId_borrowRound_key" ON "Loan"("householdId", "borrowRound");

-- AddForeignKey
ALTER TABLE "Province" ADD CONSTRAINT "Province_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubDistrict" ADD CONSTRAINT "SubDistrict_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "TargetHousehold"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_scopeVillageId_fkey" FOREIGN KEY ("scopeVillageId") REFERENCES "Village"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_scopeSubDistrictId_fkey" FOREIGN KEY ("scopeSubDistrictId") REFERENCES "SubDistrict"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_scopeDistrictId_fkey" FOREIGN KEY ("scopeDistrictId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_scopeProvinceId_fkey" FOREIGN KEY ("scopeProvinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdProfile" ADD CONSTRAINT "HouseholdProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeProfile" ADD CONSTRAINT "CommitteeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficialProfile" ADD CONSTRAINT "OfficialProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Village" ADD CONSTRAINT "Village_subDistrictId_fkey" FOREIGN KEY ("subDistrictId") REFERENCES "SubDistrict"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetHousehold" ADD CONSTRAINT "TargetHousehold_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdIncomeRecord" ADD CONSTRAINT "HouseholdIncomeRecord_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "TargetHousehold"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeMember" ADD CONSTRAINT "CommitteeMember_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentWorkerAssignment" ADD CONSTRAINT "DevelopmentWorkerAssignment_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitLog" ADD CONSTRAINT "VisitLog_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VillageAssignment" ADD CONSTRAINT "VillageAssignment_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VillageAssignment" ADD CONSTRAINT "VillageAssignment_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverLog" ADD CONSTRAINT "HandoverLog_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Developer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverLog" ADD CONSTRAINT "HandoverLog_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Developer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "TargetHousehold"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRepayment" ADD CONSTRAINT "LoanRepayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_chairmanApprovedById_fkey" FOREIGN KEY ("chairmanApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_financeApprovedById_fkey" FOREIGN KEY ("financeApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VillageHandover" ADD CONSTRAINT "VillageHandover_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VillageStatusSnapshot" ADD CONSTRAINT "VillageStatusSnapshot_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VillageStatusSnapshot" ADD CONSTRAINT "VillageStatusSnapshot_handoverId_fkey" FOREIGN KEY ("handoverId") REFERENCES "VillageHandover"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProposal" ADD CONSTRAINT "ProjectProposal_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "TargetHousehold"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProposalItem" ADD CONSTRAINT "ProjectProposalItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ProjectProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRequest" ADD CONSTRAINT "LoanRequest_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "TargetHousehold"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VillageMeetingRecord" ADD CONSTRAINT "VillageMeetingRecord_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VillageMeetingRecord" ADD CONSTRAINT "VillageMeetingRecord_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetOtp" ADD CONSTRAINT "PasswordResetOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemAuditLog" ADD CONSTRAINT "SystemAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
