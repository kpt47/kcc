// ข้อมูลจำลองสำหรับพื้นที่จริง: บ้านสวนหงษ์ ต.สาริกา อ.เมืองนครนายก จ.นครนายก
// ครอบคลุมผู้ใช้งานครบ 8 ระดับ (รหัสผ่านเดียวกันทั้งหมด: password1234) และครัวเรือนเป้าหมาย 5 ครัวเรือน
// ที่มีความหลากหลายของสถานะ (ยังไม่กู้ / ปกติ / เฝ้าระวัง / เสี่ยงสูง-ผิดสัญญา / ปิดสัญญาแล้ว-กู้ซ้ำ)
// เพื่อทดสอบฟังก์ชันบัญชีคุมลูกหนี้, บัญชีเงินฝาก, รายงาน, Dashboard NPL ฯลฯ ให้ครบทุกเคส
// รันด้วย: npx tsx prisma/seedNakhonNayok.mjs (idempotent — รันซ้ำได้ ไม่สร้างข้อมูลซ้ำ)
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "password1234";
const passwordHash = await bcrypt.hash(PASSWORD, 10);

function daysFromNow(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  // ============ ใช้ลำดับชั้นเขตการปกครองจริงที่มีอยู่แล้ว (นำเข้าจาก MasterAddress Thailand.xlsx) ============
  const province = await prisma.province.findFirstOrThrow({ where: { name: "นครนายก" } });
  const district = await prisma.district.findFirstOrThrow({ where: { provinceId: province.id, name: "เมืองนครนายก" } });
  const subDistrict = await prisma.subDistrict.findFirstOrThrow({ where: { districtId: district.id, name: "สาริกา" } });
  const village = await prisma.village.findFirstOrThrow({ where: { subDistrictId: subDistrict.id, villageName: "บ้านสวนหงษ์" } });

  if (village.budgetAmount == null) {
    await prisma.village.update({ where: { id: village.id }, data: { budgetAmount: 280_000 } });
  }

  // ============ บัญชีเงินฝากธนาคาร (เล่มเขียว) ============
  let bankAccount = await prisma.bankAccount.findFirst({ where: { villageId: village.id } });
  if (!bankAccount) {
    bankAccount = await prisma.bankAccount.create({
      data: {
        villageId: village.id,
        bankName: "ธนาคารออมสิน",
        branch: "สาขานครนายก",
        accountNo: "0-2601-20260-6",
        accountName: "บัญชีกองทุน กข.คจ. บ้านสวนหงษ์",
      },
    });
  }

  // ============ ผู้ใช้งานระดับต่างๆ (สร้างก่อน เพื่อใช้ชื่อประธาน/ฝ่ายการเงินในรายการธุรกรรม) ============
  async function upsertUser({ username, firstName, lastName, phoneNumber, email, role, committeeRole, positionTitle, scope, householdId, householdProfile }) {
    return prisma.user.upsert({
      where: { username },
      create: {
        username,
        passwordHash,
        role,
        committeeRole: committeeRole ?? null,
        phoneNumber,
        email,
        householdId,
        ...scope,
        committeeProfile: role === "VILLAGE_COMMITTEE" ? { create: { firstName, lastName } } : undefined,
        officialProfile:
          role !== "VILLAGE_COMMITTEE" && role !== "HOUSEHOLD" ? { create: { firstName, lastName, positionTitle } } : undefined,
        householdProfile: role === "HOUSEHOLD" ? { create: householdProfile } : undefined,
      },
      update: {
        passwordHash,
        role,
        committeeRole: committeeRole ?? null,
        phoneNumber,
        email,
        householdId,
        ...scope,
      },
    });
  }

  const adminUser = await upsertUser({
    username: "admin_nayok",
    firstName: "ผู้บริหาร",
    lastName: "กรมการพัฒนาชุมชน (ส่วนกลาง)",
    phoneNumber: "0812340001",
    email: "admin_nayok@kokkhocho.test",
    role: "GLOBAL_ADMIN",
    positionTitle: "ผู้บริหารส่วนกลาง",
    scope: {},
  });

  await upsertUser({
    username: "prov_nayok",
    firstName: "พัฒนาการ",
    lastName: "จังหวัดนครนายก",
    phoneNumber: "0812340002",
    email: "prov_nayok@kokkhocho.test",
    role: "PROVINCIAL_ADMIN",
    positionTitle: "พัฒนาการจังหวัด",
    scope: { scopeProvinceId: province.id },
  });

  await upsertUser({
    username: "dist_nayok",
    firstName: "พัฒนาการ",
    lastName: "อำเภอเมืองนครนายก",
    phoneNumber: "0812340003",
    email: "dist_nayok@kokkhocho.test",
    role: "DISTRICT_ADMIN",
    positionTitle: "พัฒนาการอำเภอ",
    scope: { scopeDistrictId: district.id },
  });

  await upsertUser({
    username: "subdist_nayok",
    firstName: "พัฒนากร",
    lastName: "ตำบลสาริกา",
    phoneNumber: "0812340004",
    email: "subdist_nayok@kokkhocho.test",
    role: "SUB_DISTRICT_ADMIN",
    positionTitle: "นักวิชาการพัฒนาชุมชน",
    scope: { scopeSubDistrictId: subDistrict.id },
  });

  const chairUser = await upsertUser({
    username: "chair_nayok",
    firstName: "ประธานคณะกรรมการ",
    lastName: "บ้านสวนหงษ์",
    phoneNumber: "0812340005",
    email: "chair_nayok@kokkhocho.test",
    role: "VILLAGE_COMMITTEE",
    committeeRole: "CHAIRMAN",
    scope: { scopeVillageId: village.id },
  });

  const finUser = await upsertUser({
    username: "fin_nayok",
    firstName: "ฝ่ายการเงิน",
    lastName: "บ้านสวนหงษ์",
    phoneNumber: "0812340006",
    email: "fin_nayok@kokkhocho.test",
    role: "VILLAGE_COMMITTEE",
    committeeRole: "FINANCE_MEMBER",
    scope: { scopeVillageId: village.id },
  });

  await upsertUser({
    username: "it_nayok",
    firstName: "เจ้าหน้าที่ไอที",
    lastName: "ส่วนกลาง",
    phoneNumber: "0812340008",
    email: "it_nayok@kokkhocho.test",
    role: "IT_SUPPORT",
    positionTitle: "IT Support",
    scope: {},
  });

  // ============ ครัวเรือนเป้าหมาย 5 ครัวเรือน (เล่มม่วง) — หลากหลายสถานะเพื่อทดสอบทุกฟังก์ชัน ============
  async function upsertHousehold(seqNo, data) {
    return prisma.targetHousehold.upsert({
      where: { villageId_sequenceNo: { villageId: village.id, sequenceNo: seqNo } },
      create: { villageId: village.id, sequenceNo: seqNo, ...data },
      update: data,
    });
  }

  // ครัวเรือน 1: เพิ่งขึ้นทะเบียน ยังไม่เคยยืมเงิน — มีแบบเสนอโครงการ+แบบขอยืมเงินอยู่ระหว่างพิจารณา
  const h1 = await upsertHousehold(1, {
    headFirstName: "สมศักดิ์",
    headLastName: "ใจดี",
    houseNo: "12",
    memberCount: 4,
    incomeBeforeLoan: 8_000,
  });

  // ครัวเรือน 2: มีเงินยืมอยู่ระหว่างผ่อนชำระปกติ (NORMAL) รายได้ดีขึ้นหลังยืม — ผูกกับบัญชี house_nayok
  const h2 = await upsertHousehold(2, {
    headFirstName: "สมหญิง",
    headLastName: "มีสุข",
    houseNo: "15",
    memberCount: 5,
    incomeBeforeLoan: 12_000,
  });

  // ครัวเรือน 3: เงินยืมเลยกำหนดชำระ 20 วัน — อยู่ในสถานะเฝ้าระวัง (WATCHLIST)
  const h3 = await upsertHousehold(3, {
    headFirstName: "ประเสริฐ",
    headLastName: "พูนทรัพย์",
    houseNo: "20",
    memberCount: 3,
    incomeBeforeLoan: 15_000,
  });

  // ครัวเรือน 4: เงินยืมเลยกำหนดชำระ 45 วัน — เสี่ยงสูง/ผิดสัญญา (HIGH_RISK + isDefaulted)
  const h4 = await upsertHousehold(4, {
    headFirstName: "วิไล",
    headLastName: "ยากจน",
    houseNo: "8",
    memberCount: 6,
    incomeBeforeLoan: 6_000,
    isDefaulted: true,
    defaultedAmount: 18_000,
  });

  // ครัวเรือน 5: ปิดสัญญาเงินยืมครั้งที่ 1 ครบแล้ว กำลังยืมครั้งที่ 2 ต่อเนื่อง (กู้ซ้ำ) — เคสความสำเร็จ
  const h5 = await upsertHousehold(5, {
    headFirstName: "มานะ",
    headLastName: "ตั้งใจ",
    houseNo: "25",
    memberCount: 4,
    incomeBeforeLoan: 18_000,
  });

  // รายได้หลังยืมเงิน (เล่มม่วง หน้า 1) — เฉพาะครัวเรือนที่มีประวัติยืมเงินมาแล้ว
  async function upsertIncomeRecord(householdId, yearsAfterLoan, income) {
    await prisma.householdIncomeRecord.upsert({
      where: { householdId_yearsAfterLoan: { householdId, yearsAfterLoan } },
      create: { householdId, yearsAfterLoan, income },
      update: { income },
    });
  }
  await upsertIncomeRecord(h2.id, 1, 16_500);
  await upsertIncomeRecord(h5.id, 1, 22_000);
  await upsertIncomeRecord(h5.id, 2, 27_000);
  await upsertIncomeRecord(h5.id, 3, 33_000);

  // ============ บัญชีผู้ใช้ครัวเรือนเป้าหมาย (ผูกกับแต่ละครัวเรือน เพื่อทดสอบมุมมองครัวเรือนครบทุกสถานะ) ============
  await upsertUser({
    username: "house_nayok",
    firstName: "สมหญิง",
    lastName: "มีสุข",
    phoneNumber: "0812340007",
    email: "house_nayok@kokkhocho.test",
    role: "HOUSEHOLD",
    scope: { scopeVillageId: village.id },
    householdId: h2.id,
    householdProfile: { age: 42, occupation: "ค้าขาย", consentPersonName: "สมชาย มีสุข", consentRelation: "สามี" },
  });

  // ครัวเรือน 1: สมศักดิ์ ใจดี — ยังไม่เคยยืมเงิน
  await upsertUser({
    username: "house_nayok1",
    firstName: "สมศักดิ์",
    lastName: "ใจดี",
    phoneNumber: "0812340011",
    email: "house_nayok1@kokkhocho.test",
    role: "HOUSEHOLD",
    scope: { scopeVillageId: village.id },
    householdId: h1.id,
    householdProfile: { age: 38, occupation: "รับจ้างทั่วไป", consentPersonName: "สมศรี ใจดี", consentRelation: "ภรรยา" },
  });

  // ครัวเรือน 3: ประเสริฐ พูนทรัพย์ — สถานะเฝ้าระวัง (WATCHLIST)
  await upsertUser({
    username: "house_nayok3",
    firstName: "ประเสริฐ",
    lastName: "พูนทรัพย์",
    phoneNumber: "0812340013",
    email: "house_nayok3@kokkhocho.test",
    role: "HOUSEHOLD",
    scope: { scopeVillageId: village.id },
    householdId: h3.id,
    householdProfile: { age: 50, occupation: "ปลูกผักขาย", consentPersonName: "ประไพ พูนทรัพย์", consentRelation: "ภรรยา" },
  });

  // ครัวเรือน 4: วิไล ยากจน — เสี่ยงสูง/ผิดสัญญา (HIGH_RISK)
  await upsertUser({
    username: "house_nayok4",
    firstName: "วิไล",
    lastName: "ยากจน",
    phoneNumber: "0812340014",
    email: "house_nayok4@kokkhocho.test",
    role: "HOUSEHOLD",
    scope: { scopeVillageId: village.id },
    householdId: h4.id,
    householdProfile: { age: 55, occupation: "รับจ้างทั่วไป", consentPersonName: "วิชัย ยากจน", consentRelation: "สามี" },
  });

  // ครัวเรือน 5: มานะ ตั้งใจ — ปิดสัญญาแล้ว/กู้ซ้ำ (เคสความสำเร็จ)
  await upsertUser({
    username: "house_nayok5",
    firstName: "มานะ",
    lastName: "ตั้งใจ",
    phoneNumber: "0812340015",
    email: "house_nayok5@kokkhocho.test",
    role: "HOUSEHOLD",
    scope: { scopeVillageId: village.id },
    householdId: h5.id,
    householdProfile: { age: 46, occupation: "เลี้ยงไก่ไข่", consentPersonName: "มาลี ตั้งใจ", consentRelation: "ภรรยา" },
  });

  // ============ เงินยืม (เล่มเหลือง) — สร้าง/อัปเดตแบบ idempotent ผ่าน householdId+borrowRound ============
  async function upsertLoan(householdId, borrowRound, data) {
    return prisma.loan.upsert({
      where: { householdId_borrowRound: { householdId, borrowRound } },
      create: { householdId, borrowRound, ...data },
      update: data,
    });
  }

  // H2: ปกติ — รับเงินยืมมา 6 เดือนก่อน ครบกำหนดในอีก ~6 เดือน ผ่อนมาแล้ว 2 งวด
  const loanH2 = await upsertLoan(h2.id, 1, {
    contractNo: "นย.สร.01/2569",
    amount: 20_000,
    receivedDate: daysFromNow(-180),
    dueDate: daysFromNow(185),
    occupation: "ค้าขาย",
    outstandingBalance: 12_000,
    approvalStatus: "APPROVED",
    approvedById: chairUser.id,
    approvedAt: daysFromNow(-180),
    riskStatus: "NORMAL",
  });
  await prisma.loanRepayment.deleteMany({ where: { loanId: loanH2.id } });
  await prisma.loanRepayment.createMany({
    data: [
      { loanId: loanH2.id, receiptNo: "R-0001", paymentDate: daysFromNow(-90), amount: 4_000, status: "APPROVED" },
      { loanId: loanH2.id, receiptNo: "R-0002", paymentDate: daysFromNow(-30), amount: 4_000, status: "APPROVED" },
    ],
  });

  // H3: เฝ้าระวัง — เลยกำหนดชำระมาแล้ว 20 วัน ยังไม่มีการผ่อนชำระ
  await upsertLoan(h3.id, 1, {
    contractNo: "นย.สร.02/2569",
    amount: 25_000,
    receivedDate: daysFromNow(-345),
    dueDate: daysFromNow(-20),
    occupation: "ปลูกผักขาย",
    outstandingBalance: 25_000,
    approvalStatus: "APPROVED",
    approvedById: chairUser.id,
    approvedAt: daysFromNow(-345),
    riskStatus: "WATCHLIST",
  });

  // H4: เสี่ยงสูง/ผิดสัญญา — เลยกำหนดชำระมาแล้ว 45 วัน
  await upsertLoan(h4.id, 1, {
    contractNo: "นย.สร.03/2568",
    amount: 18_000,
    receivedDate: daysFromNow(-400),
    dueDate: daysFromNow(-45),
    occupation: "รับจ้างทั่วไป",
    outstandingBalance: 18_000,
    approvalStatus: "APPROVED",
    approvedById: chairUser.id,
    approvedAt: daysFromNow(-400),
    riskStatus: "HIGH_RISK",
  });

  // H5: ยืมครั้งที่ 1 ปิดสัญญาแล้ว (ผ่อนครบ 3 งวด)
  const loanH5r1 = await upsertLoan(h5.id, 1, {
    contractNo: "นย.สร.04/2567",
    amount: 15_000,
    receivedDate: daysFromNow(-700),
    dueDate: daysFromNow(-335),
    occupation: "เลี้ยงไก่ไข่",
    outstandingBalance: 0,
    isClosed: true,
    approvalStatus: "APPROVED",
    approvedById: chairUser.id,
    approvedAt: daysFromNow(-700),
    riskStatus: "NORMAL",
  });
  await prisma.loanRepayment.deleteMany({ where: { loanId: loanH5r1.id } });
  await prisma.loanRepayment.createMany({
    data: [
      { loanId: loanH5r1.id, receiptNo: "R-1001", paymentDate: daysFromNow(-500), amount: 5_000, status: "APPROVED" },
      { loanId: loanH5r1.id, receiptNo: "R-1002", paymentDate: daysFromNow(-400), amount: 5_000, status: "APPROVED" },
      { loanId: loanH5r1.id, receiptNo: "R-1003", paymentDate: daysFromNow(-340), amount: 5_000, status: "APPROVED" },
    ],
  });
  // H5: ยืมครั้งที่ 2 — กู้ซ้ำหลังปิดสัญญาครั้งแรก อยู่ระหว่างผ่อนชำระปกติ
  await upsertLoan(h5.id, 2, {
    contractNo: "นย.สร.05/2569",
    amount: 30_000,
    receivedDate: daysFromNow(-60),
    dueDate: daysFromNow(305),
    occupation: "เลี้ยงไก่ไข่ (ขยายกิจการ)",
    outstandingBalance: 30_000,
    approvalStatus: "APPROVED",
    approvedById: chairUser.id,
    approvedAt: daysFromNow(-60),
    riskStatus: "NORMAL",
  });

  // ============ แบบเสนอโครงการ / แบบขอยืมเงินทุน — ทดสอบ 2 ขั้นตอนของ workflow ============
  // H1: แบบขอยืมเงินทุน อยู่ระหว่างรอกรรมการพิจารณา (พัฒนากรให้ความเห็นแล้ว)
  const existingLoanReqH1 = await prisma.loanRequest.findFirst({ where: { householdId: h1.id } });
  if (!existingLoanReqH1) {
    await prisma.loanRequest.create({
      data: {
        householdId: h1.id,
        volumeNo: "1",
        requestNo: "1",
        applicantAge: 38,
        occupation: "รับจ้างทั่วไป",
        requestedAmount: 15_000,
        agreesToRegulations: true,
        spouseConsentName: "สมศรี ใจดี",
        requestDate: daysFromNow(-5),
        workerOpinion: "agree",
        workerReason: "ครัวเรือนมีศักยภาพในการประกอบอาชีพ เห็นควรอนุมัติ",
        workerName: "พัฒนากร ตำบลสาริกา",
        workerDate: daysFromNow(-3),
      },
    });
  }

  // H3: แบบเสนอโครงการ ได้รับอนุมัติครบทุกขั้นตอนแล้ว (ทดสอบพิมพ์ PDF ฉบับอนุมัติ)
  const existingProposalH3 = await prisma.projectProposal.findFirst({ where: { householdId: h3.id } });
  if (!existingProposalH3) {
    await prisma.projectProposal.create({
      data: {
        householdId: h3.id,
        volumeNo: "1",
        proposalNo: "1",
        applicantAge: 50,
        occupation: "ปลูกผักขาย",
        projectName: "โครงการปลูกผักปลอดสารพิษจำหน่าย",
        totalAmount: 25_000,
        proposedDate: daysFromNow(-350),
        workerOpinion: "possible",
        workerReason: "มีพื้นที่ทำกินและประสบการณ์ปลูกผักอยู่แล้ว",
        workerName: "พัฒนากร ตำบลสาริกา",
        workerDate: daysFromNow(-348),
        committeeDecision: "approved",
        committeeAmount: 25_000,
        committeeReason: "เห็นชอบตามที่เสนอ",
        committeeChairName: "ประธานคณะกรรมการ บ้านสวนหงษ์",
        committeeDate: daysFromNow(-346),
      },
    });
  }

  // ============ รายการเดินบัญชีธนาคาร (เล่มเขียว) ============
  // กฎสำคัญ: เงินงบประมาณจากรัฐบาล (280,000 บาท) ต้องเข้าบัญชีก่อนเสมอ ถึงจะปล่อยเงินยืมแต่ละครั้งได้
  // (ตรงกับการตรวจสอบจริงที่ /api/bank-transactions ซึ่ง reject ถ้า newBalance < 0) — เรียงลำดับตามวันที่จริง
  // ทุกรายการ ไม่ให้ยอดคงเหลือติดลบ ณ จุดใดจุดหนึ่งเลย และให้ครบทุกเงินยืมที่ปล่อยไปทั้ง 5 ครัวเรือน
  await prisma.bankTransaction.deleteMany({ where: { bankAccountId: bankAccount.id } });
  let balance = 0;
  const ledgerEntries = [
    {
      transactionDate: daysFromNow(-700),
      documentNo: "งป.01/2569",
      description: "รับโอนงบประมาณกองทุน กข.คจ. ประจำปีงบประมาณ 2569 (เงินรัฐบาลจัดสรร)",
      depositAmount: 280_000,
      withdrawAmount: 0,
    },
    {
      transactionDate: daysFromNow(-700),
      documentNo: "นย.สร.04/2567",
      description: "ถอนจ่ายเงินยืม - มานะ ตั้งใจ (ครั้งที่ 1)",
      depositAmount: 0,
      withdrawAmount: 15_000,
      approved: true,
    },
    {
      transactionDate: daysFromNow(-400),
      documentNo: "นย.สร.03/2568",
      description: "ถอนจ่ายเงินยืม - วิไล ยากจน",
      depositAmount: 0,
      withdrawAmount: 18_000,
      approved: true,
    },
    {
      transactionDate: daysFromNow(-345),
      documentNo: "นย.สร.02/2569",
      description: "ถอนจ่ายเงินยืม - ประเสริฐ พูนทรัพย์",
      depositAmount: 0,
      withdrawAmount: 25_000,
      approved: true,
    },
    {
      transactionDate: daysFromNow(-340),
      documentNo: "R-1003",
      description: "รับคืนเงินยืม - มานะ ตั้งใจ (ผ่อนงวดสุดท้าย ปิดสัญญาครั้งที่ 1)",
      depositAmount: 15_000,
      withdrawAmount: 0,
    },
    {
      transactionDate: daysFromNow(-180),
      documentNo: "นย.สร.01/2569",
      description: "ถอนจ่ายเงินยืม - สมหญิง มีสุข",
      depositAmount: 0,
      withdrawAmount: 20_000,
      approved: true,
    },
    {
      transactionDate: daysFromNow(-60),
      documentNo: "นย.สร.05/2569",
      description: "ถอนจ่ายเงินยืม - มานะ ตั้งใจ (ครั้งที่ 2)",
      depositAmount: 0,
      withdrawAmount: 30_000,
      approved: true,
    },
  ];
  for (const entry of ledgerEntries) {
    balance += entry.depositAmount - entry.withdrawAmount;
    if (balance < 0) throw new Error(`บัญชีติดลบที่รายการ ${entry.documentNo} — ตรวจสอบลำดับเงินฝาก/ถอนใหม่`);
    await prisma.bankTransaction.create({
      data: {
        bankAccountId: bankAccount.id,
        transactionDate: entry.transactionDate,
        documentNo: entry.documentNo,
        description: entry.description,
        depositAmount: entry.depositAmount,
        withdrawAmount: entry.withdrawAmount,
        balance,
        chairmanApprovedById: entry.approved ? chairUser.id : undefined,
        chairmanApprovedAt: entry.approved ? entry.transactionDate : undefined,
        financeApprovedById: entry.approved ? finUser.id : undefined,
        financeApprovedAt: entry.approved ? entry.transactionDate : undefined,
      },
    });
  }
  console.log(`ยอดคงเหลือบัญชีเงินฝากล่าสุด: ${balance.toLocaleString("th-TH")} บาท`);

  console.log("เสร็จสิ้น — พื้นที่: บ้านสวนหงษ์ ต.สาริกา อ.เมืองนครนายก จ.นครนายก");
  console.log("ผู้ใช้งาน 8 ระดับ (รหัสผ่านทุกบัญชี: password1234):");
  console.log("  1. admin_nayok    (GLOBAL_ADMIN)");
  console.log("  2. prov_nayok     (PROVINCIAL_ADMIN)");
  console.log("  3. dist_nayok     (DISTRICT_ADMIN)");
  console.log("  4. subdist_nayok  (SUB_DISTRICT_ADMIN)");
  console.log("  5. chair_nayok    (VILLAGE_COMMITTEE / CHAIRMAN)");
  console.log("  6. fin_nayok      (VILLAGE_COMMITTEE / FINANCE_MEMBER)");
  console.log("  7. house_nayok    (HOUSEHOLD — ผูกกับครัวเรือน สมหญิง มีสุข)");
  console.log("  8. it_nayok       (IT_SUPPORT)");
  console.log("ครัวเรือนเป้าหมาย 5 ครัวเรือน: สมศักดิ์(ยังไม่กู้), สมหญิง(ปกติ), ประเสริฐ(เฝ้าระวัง), วิไล(ผิดสัญญา), มานะ(ปิดสัญญา+กู้ซ้ำ)");
  console.log("บัญชีล็อกอินครัวเรือนครบทั้ง 5 ราย (รหัสผ่านเดียวกัน: password1234):");
  console.log("  house_nayok  (สมหญิง มีสุข — ปกติ)");
  console.log("  house_nayok1 (สมศักดิ์ ใจดี — ยังไม่กู้)");
  console.log("  house_nayok3 (ประเสริฐ พูนทรัพย์ — เฝ้าระวัง)");
  console.log("  house_nayok4 (วิไล ยากจน — เสี่ยงสูง/ผิดสัญญา)");
  console.log("  house_nayok5 (มานะ ตั้งใจ — ปิดสัญญา+กู้ซ้ำ)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
