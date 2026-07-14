-- AlterTable
ALTER TABLE "Province" ADD COLUMN "code" TEXT;

-- AlterTable
ALTER TABLE "District" ADD COLUMN "code" TEXT;

-- AlterTable
ALTER TABLE "SubDistrict" ADD COLUMN "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Province_code_key" ON "Province"("code");

-- CreateIndex
CREATE UNIQUE INDEX "District_code_key" ON "District"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SubDistrict_code_key" ON "SubDistrict"("code");
