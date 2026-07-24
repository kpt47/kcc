// ข้อมูลจำลองเพิ่มเติมสำหรับ 11 จังหวัด จังหวัดละ 1 หมู่บ้าน — สร้างให้มีสเปกตรัมความเสี่ยงหนี้/รายได้/งบประมาณ
// แตกต่างกันชัดเจน (สุขภาพดี -> ปานกลาง -> เสี่ยงสูง) เพื่อใช้เปรียบเทียบบนแผนที่ Overview Report / Dashboard
// รันด้วย: npx tsx prisma/seedCompareProvinces.mjs (idempotent — รันซ้ำได้ ไม่สร้างข้อมูลซ้ำ)
// ไม่สร้างบัญชีผู้ใช้ (User) — สร้างเฉพาะ Village/TargetHousehold/Loan/BankAccount+Transaction สำหรับทดสอบ
// รายงาน/แผนที่/Dashboard เท่านั้น ตามที่ตั้นขอ ("จำลองข้อมูลเพิ่มมาเปรียบเทียบ")
import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function daysFromNow(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

// แต่ละจังหวัด: villageName, budgetYear/Amount, พิกัดโดยประมาณของตัวเมือง (จริง, ใช้ทดสอบแผนที่),
// รายชื่อครัวเรือน (รายได้ก่อนยืม + จำนวนสมาชิก) และเงินยืม (จำนวนเงิน + วันเลยกำหนดชำระ เพื่อคุมสถานะความเสี่ยง)
// depositRatio < 1 หมายถึงจงใจฝากงบประมาณเข้าบัญชีไม่ครบ (จำลอง "เงินทุนที่ขาดหายไป" ตามรายงานสภาพปัญหาฯ)
const PROVINCES = [
  {
    province: "นนทบุรี",
    village: "บ้านสุขใจ",
    lat: 13.8622,
    lng: 100.5144,
    budgetYear: 2567,
    budgetAmount: 300_000,
    depositRatio: 1,
    households: [
      { first: "อำนวย", last: "สุขสมบูรณ์", income: 28_000, members: 3, loan: 20_000, overdueDays: -200 },
      { first: "พิมพ์ใจ", last: "ร่มเย็น", income: 22_000, members: 4, loan: 25_000, overdueDays: -150 },
      { first: "สุรชัย", last: "มั่งมี", income: 30_000, members: 2, loan: 15_000, overdueDays: -100 },
      { first: "วันเพ็ญ", last: "เจริญสุข", income: 18_000, members: 5, loan: null, overdueDays: null },
    ],
  },
  {
    province: "ปทุมธานี",
    village: "บ้านรุ่งเรือง",
    lat: 14.0208,
    lng: 100.5250,
    budgetYear: 2567,
    budgetAmount: 260_000,
    depositRatio: 1,
    households: [
      { first: "ประยูร", last: "รุ่งโรจน์", income: 20_000, members: 4, loan: 20_000, overdueDays: -220 },
      { first: "ละเอียด", last: "ทองคำ", income: 16_000, members: 5, loan: 18_000, overdueDays: -180 },
      { first: "ชูชาติ", last: "พูลสวัสดิ์", income: 22_000, members: 3, loan: 15_000, overdueDays: -60 },
      { first: "สมพิศ", last: "ใจบุญ", income: 15_000, members: 4, loan: null, overdueDays: null },
    ],
  },
  {
    province: "ภูเก็ต",
    village: "บ้านหาดใส",
    lat: 7.8804,
    lng: 98.3923,
    budgetYear: 2568,
    budgetAmount: 320_000,
    depositRatio: 1,
    households: [
      { first: "สมบูรณ์", last: "ทะเลทอง", income: 35_000, members: 3, loan: 25_000, overdueDays: -300 },
      { first: "อรุณี", last: "หาดสวย", income: 40_000, members: 2, loan: 20_000, overdueDays: -250 },
      { first: "วิรัตน์", last: "เกาะแก้ว", income: 26_000, members: 4, loan: 18_000, overdueDays: -90 },
    ],
  },
  {
    province: "ตราด",
    village: "บ้านชายทะเล",
    lat: 12.2428,
    lng: 102.5178,
    budgetYear: 2567,
    budgetAmount: 240_000,
    depositRatio: 1,
    households: [
      { first: "สายัณห์", last: "เกาะช้าง", income: 18_000, members: 4, loan: 18_000, overdueDays: -200 },
      { first: "บุญมี", last: "แสนสุข", income: 24_000, members: 3, loan: 15_000, overdueDays: -120 },
      { first: "ทองสุข", last: "ริมทะเล", income: 16_000, members: 5, loan: 20_000, overdueDays: -30 },
      { first: "จินตนา", last: "คลื่นทอง", income: 20_000, members: 3, loan: null, overdueDays: null },
    ],
  },
  {
    province: "พระนครศรีอยุธยา",
    village: "บ้านเกาะเมือง",
    lat: 14.3532,
    lng: 100.5684,
    budgetYear: 2566,
    budgetAmount: 250_000,
    depositRatio: 1,
    households: [
      { first: "สมชาย", last: "กรุงเก่า", income: 14_000, members: 4, loan: 20_000, overdueDays: -300 },
      { first: "มาลี", last: "วัดใหญ่", income: 10_000, members: 5, loan: 22_000, overdueDays: 5 },
      { first: "ประสิทธิ์", last: "หัวรอ", income: 16_000, members: 3, loan: 15_000, overdueDays: -100 },
      { first: "รัตนา", last: "บางปะอิน", income: 12_000, members: 4, loan: 18_000, overdueDays: 10 },
      { first: "วิเชียร", last: "อโยธยา", income: 20_000, members: 2, loan: null, overdueDays: null },
    ],
  },
  {
    province: "ปราจีนบุรี",
    village: "บ้านดงพระราม",
    lat: 14.0509,
    lng: 101.3720,
    budgetYear: 2566,
    budgetAmount: 220_000,
    depositRatio: 1,
    households: [
      { first: "สมหมาย", last: "ดงพระราม", income: 12_000, members: 4, loan: 18_000, overdueDays: -250 },
      { first: "ไพโรจน์", last: "ศรีมหาโพธิ", income: 9_000, members: 5, loan: 20_000, overdueDays: 8 },
      { first: "บุญเรือน", last: "กบินทร์", income: 14_000, members: 3, loan: 15_000, overdueDays: -80 },
      { first: "สายฝน", last: "ประจันตคาม", income: 18_000, members: 3, loan: null, overdueDays: null },
    ],
  },
  {
    province: "เชียงราย",
    village: "บ้านดอยงาม",
    lat: 19.9105,
    lng: 99.8406,
    budgetYear: 2565,
    budgetAmount: 230_000,
    depositRatio: 1,
    households: [
      { first: "จันทร์ดี", last: "ดอยงาม", income: 8_000, members: 5, loan: 18_000, overdueDays: 12 },
      { first: "อินทร", last: "แม่สาย", income: 10_000, members: 4, loan: 20_000, overdueDays: 20 },
      { first: "คำแสน", last: "เชียงของ", income: 12_000, members: 3, loan: 15_000, overdueDays: -200 },
      { first: "นวลจันทร์", last: "แม่จัน", income: 7_000, members: 6, loan: 22_000, overdueDays: 6 },
      { first: "ทองพูน", last: "พาน", income: 15_000, members: 3, loan: null, overdueDays: null },
    ],
  },
  {
    province: "อุบลราชธานี",
    village: "บ้านโนนหนองไฮ",
    lat: 15.2286,
    lng: 104.8564,
    budgetYear: 2565,
    budgetAmount: 210_000,
    depositRatio: 0.9,
    households: [
      { first: "สมศรี", last: "โนนหนองไฮ", income: 9_000, members: 5, loan: 18_000, overdueDays: 40 },
      { first: "บุญธรรม", last: "วารินชำราบ", income: 7_000, members: 6, loan: 20_000, overdueDays: 55, defaulted: true },
      { first: "ประไพร", last: "เขื่องใน", income: 11_000, members: 4, loan: 15_000, overdueDays: -150 },
      { first: "สังวาลย์", last: "พิบูลมังสาหาร", income: 12_000, members: 3, loan: 12_000, overdueDays: -60 },
      { first: "หนูเล็ก", last: "ตระการพืชผล", income: 10_000, members: 4, loan: null, overdueDays: null },
    ],
  },
  {
    province: "กำแพงเพชร",
    village: "บ้านคลองลาน",
    lat: 16.4827,
    lng: 99.5226,
    budgetYear: 2564,
    budgetAmount: 200_000,
    depositRatio: 0.75,
    households: [
      { first: "ประเสริฐ", last: "คลองลาน", income: 6_000, members: 6, loan: 20_000, overdueDays: 60, defaulted: true },
      { first: "ทองเปลว", last: "ลานกระบือ", income: 8_000, members: 5, loan: 18_000, overdueDays: 50, defaulted: true },
      { first: "สมัย", last: "ไทรงาม", income: 9_000, members: 4, loan: 15_000, overdueDays: 10 },
      { first: "แสงจันทร์", last: "พรานกระต่าย", income: 12_000, members: 3, loan: 10_000, overdueDays: -180 },
    ],
  },
  {
    province: "หนองคาย",
    village: "บ้านท่านาแล้ง",
    lat: 17.8783,
    lng: 102.7420,
    budgetYear: 2564,
    budgetAmount: 190_000,
    depositRatio: 0.8,
    households: [
      { first: "คำปัน", last: "ท่านาแล้ง", income: 7_000, members: 5, loan: 18_000, overdueDays: 45, defaulted: true },
      { first: "บัวลอง", last: "ศรีเชียงใหม่", income: 9_000, members: 4, loan: 15_000, overdueDays: 15 },
      { first: "สมาน", last: "โพนพิสัย", income: 11_000, members: 3, loan: 12_000, overdueDays: -100 },
      { first: "ทองม้วน", last: "สังคม", income: 8_000, members: 6, loan: 20_000, overdueDays: 35 },
    ],
  },
  {
    province: "ยะลา",
    village: "บ้านสะเตงนอก",
    lat: 6.5411,
    lng: 101.2800,
    budgetYear: 2563,
    budgetAmount: 180_000,
    depositRatio: 0.65,
    households: [
      { first: "อาแซ", last: "สะเตงนอก", income: 5_000, members: 6, loan: 20_000, overdueDays: 70, defaulted: true },
      { first: "รอฮานี", last: "ยะหา", income: 6_000, members: 5, loan: 18_000, overdueDays: 65, defaulted: true },
      { first: "มะรอนี", last: "รามัน", income: 7_000, members: 5, loan: 15_000, overdueDays: 50, defaulted: true },
      { first: "แวอาสีซะ", last: "บันนังสตา", income: 9_000, members: 4, loan: 12_000, overdueDays: 5 },
      { first: "ซาปีนะ", last: "เบตง", income: 11_000, members: 3, loan: null, overdueDays: null },
    ],
  },
];

async function main() {
  for (const p of PROVINCES) {
    const province = await prisma.province.findFirstOrThrow({ where: { name: p.province } });
    let district = await prisma.district.findFirst({ where: { provinceId: province.id, name: { startsWith: "เมือง" } } });
    if (!district) district = await prisma.district.findFirstOrThrow({ where: { provinceId: province.id }, orderBy: { id: "asc" } });
    const subDistrict = await prisma.subDistrict.findFirstOrThrow({ where: { districtId: district.id }, orderBy: { id: "asc" } });

    const village = await prisma.village.upsert({
      where: { villageNo_subDistrictId: { villageNo: "1", subDistrictId: subDistrict.id } },
      create: {
        villageNo: "1",
        villageName: p.village,
        subDistrictId: subDistrict.id,
        budgetYear: p.budgetYear,
        budgetAmount: p.budgetAmount,
        latitude: p.lat,
        longitude: p.lng,
      },
      update: {
        budgetYear: p.budgetYear,
        budgetAmount: p.budgetAmount,
        latitude: p.lat,
        longitude: p.lng,
      },
    });

    let bankAccount = await prisma.bankAccount.findFirst({ where: { villageId: village.id } });
    if (!bankAccount) {
      bankAccount = await prisma.bankAccount.create({
        data: {
          villageId: village.id,
          bankName: "ธนาคารออมสิน",
          branch: `สาขา${province.name}`,
          accountNo: `0-${village.id}-00000-0`,
          accountName: `บัญชีกองทุน กข.คจ. ${p.village}`,
        },
      });
    }

    let withdrawTotal = 0;
    let seqNo = 0;
    for (const h of p.households) {
      seqNo += 1;
      const household = await prisma.targetHousehold.upsert({
        where: { villageId_sequenceNo: { villageId: village.id, sequenceNo: seqNo } },
        create: {
          villageId: village.id,
          sequenceNo: seqNo,
          headFirstName: h.first,
          headLastName: h.last,
          houseNo: String(seqNo),
          memberCount: h.members,
          incomeBeforeLoan: h.income,
          isDefaulted: h.defaulted ?? false,
          defaultedAmount: h.defaulted ? h.loan : null,
        },
        update: {
          memberCount: h.members,
          incomeBeforeLoan: h.income,
          isDefaulted: h.defaulted ?? false,
          defaultedAmount: h.defaulted ? h.loan : null,
        },
      });

      if (h.loan == null) continue; // ครัวเรือนนี้ยังไม่เคยยืมเงิน (ทดสอบเคส "ยังไม่กู้")

      const receivedDate = daysFromNow((h.overdueDays ?? 0) - 365);
      const dueDate = daysFromNow(h.overdueDays);
      const riskStatus = h.overdueDays > 30 ? "HIGH_RISK" : h.overdueDays >= -15 ? "WATCHLIST" : "NORMAL";

      await prisma.loan.upsert({
        where: { householdId_borrowRound: { householdId: household.id, borrowRound: 1 } },
        create: {
          householdId: household.id,
          borrowRound: 1,
          contractNo: `${province.code ?? "00"}.${seqNo}/${p.budgetYear}`,
          amount: h.loan,
          receivedDate,
          dueDate,
          occupation: "เกษตรกรรม/ค้าขายในพื้นที่",
          outstandingBalance: h.loan,
          approvalStatus: "APPROVED",
          riskStatus,
        },
        update: { amount: h.loan, receivedDate, dueDate, outstandingBalance: h.loan, riskStatus },
      });

      withdrawTotal += h.loan;
    }

    // เดินบัญชี: ฝากงบประมาณ (ตาม depositRatio — <1 หมายถึงจงใจขาดหาย) แล้วถอนจ่ายเงินยืมทุกก้อนตามลำดับ
    await prisma.bankTransaction.deleteMany({ where: { bankAccountId: bankAccount.id } });
    const depositAmount = Math.round(p.budgetAmount * p.depositRatio);
    let balance = depositAmount;
    if (balance < withdrawTotal) throw new Error(`${p.province}: บัญชีจะติดลบ (ฝาก ${depositAmount} < ถอนรวม ${withdrawTotal})`);

    await prisma.bankTransaction.create({
      data: {
        bankAccountId: bankAccount.id,
        transactionDate: daysFromNow(-400),
        documentNo: `งป.${province.code ?? "00"}/${p.budgetYear}`,
        description: `รับโอนงบประมาณกองทุน กข.คจ. ประจำปีงบประมาณ ${p.budgetYear}`,
        depositAmount,
        withdrawAmount: 0,
        balance,
      },
    });

    seqNo = 0;
    for (const h of p.households) {
      seqNo += 1;
      if (h.loan == null) continue;
      balance -= h.loan;
      await prisma.bankTransaction.create({
        data: {
          bankAccountId: bankAccount.id,
          transactionDate: daysFromNow((h.overdueDays ?? 0) - 365),
          documentNo: `${province.code ?? "00"}.${seqNo}/${p.budgetYear}`,
          description: `ถอนจ่ายเงินยืม - ${h.first} ${h.last}`,
          depositAmount: 0,
          withdrawAmount: h.loan,
          balance,
        },
      });
    }

    console.log(
      `✓ ${p.province}: ${p.village} — ${p.households.length} ครัวเรือน, งบ ${p.budgetAmount.toLocaleString("th-TH")} บาท, ` +
        `ฝากจริง ${depositAmount.toLocaleString("th-TH")} บาท, คงเหลือ ${balance.toLocaleString("th-TH")} บาท`
    );
  }

  console.log("\nเสร็จสิ้น — เพิ่มข้อมูลจำลอง 11 จังหวัด (สเปกตรัม: สุขภาพดี → ปานกลาง → เสี่ยงสูง) สำหรับเปรียบเทียบแล้ว");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
