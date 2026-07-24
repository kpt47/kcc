-- CreateTable
CREATE TABLE "DebtConfirmationRound" (
    "id" SERIAL NOT NULL,
    "villageId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "confirmationDate" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtConfirmationRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtConfirmation" (
    "id" SERIAL NOT NULL,
    "roundId" INTEGER NOT NULL,
    "householdId" INTEGER NOT NULL,
    "confirmedById" INTEGER NOT NULL,
    "outstandingTotal" DOUBLE PRECISION NOT NULL,
    "agreesWithBalance" BOOLEAN NOT NULL,
    "note" TEXT,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DebtConfirmationRound_villageId_year_key" ON "DebtConfirmationRound"("villageId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "DebtConfirmation_roundId_householdId_key" ON "DebtConfirmation"("roundId", "householdId");

-- AddForeignKey
ALTER TABLE "DebtConfirmationRound" ADD CONSTRAINT "DebtConfirmationRound_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtConfirmationRound" ADD CONSTRAINT "DebtConfirmationRound_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtConfirmation" ADD CONSTRAINT "DebtConfirmation_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "DebtConfirmationRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtConfirmation" ADD CONSTRAINT "DebtConfirmation_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "TargetHousehold"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtConfirmation" ADD CONSTRAINT "DebtConfirmation_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
