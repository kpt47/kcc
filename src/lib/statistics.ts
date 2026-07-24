// ชั้นรวบรวมข้อมูลสำหรับหน้า "ข้อมูลสถิติ" — ทุกฟังก์ชันรับ scope (VillageScope) ที่คำนวณจาก
// getAllowedVillageIds(user) แล้วเท่านั้น เพื่อบังคับ RBAC data isolation ที่ชั้นนี้อย่างสม่ำเสมอ
// (ตามแบบเดียวกับ lib/analytics.ts)
import { prisma } from "./prisma";
import type { CurrentUser } from "./auth";
import { type VillageScope, scopeWhereDirect, scopeWhereViaHousehold } from "./scope";

// ---------------------------------------------------------------------------
// 1. จำนวนประชากร + สัดส่วนเพศ (ของหัวหน้าครัวเรือน — ระบบเก็บเพศเฉพาะหัวหน้าครัวเรือนเท่านั้น
//    ไม่มีข้อมูลเพศรายบุคคลของสมาชิกในครัวเรือน จึงใช้เพศหัวหน้าครัวเรือนเป็นตัวแทน)
// ---------------------------------------------------------------------------
export type PopulationStats = {
  totalPopulation: number;
  totalHouseholds: number;
  maleCount: number;
  femaleCount: number;
  unknownGenderCount: number;
};

export async function getPopulationStats(scope: VillageScope): Promise<PopulationStats> {
  const households = await prisma.targetHousehold.findMany({
    where: scopeWhereDirect(scope, "villageId"),
    select: { memberCount: true, gender: true },
  });
  let totalPopulation = 0;
  let maleCount = 0;
  let femaleCount = 0;
  let unknownGenderCount = 0;
  for (const h of households) {
    totalPopulation += h.memberCount ?? 0;
    if (h.gender === "MALE") maleCount++;
    else if (h.gender === "FEMALE") femaleCount++;
    else unknownGenderCount++;
  }
  return { totalPopulation, totalHouseholds: households.length, maleCount, femaleCount, unknownGenderCount };
}

// ---------------------------------------------------------------------------
// 2. ระดับความเสี่ยงหนี้ นับจากจำนวนสัญญา (ปกติ/เฝ้าระวัง/เสี่ยงสูง/ไม่มีข้อมูล)
//    หมายเหตุ: RiskStatus มีแค่ 3 ค่า (ไม่มีสถานะ "ไม่มีข้อมูล" ในระบบจริง) — ตีความ "ไม่มีข้อมูล" ว่าคือ
//    สัญญาที่ปิดแล้ว (isClosed = true) เพราะเมื่อปิดสัญญา ระบบไม่ประเมิน/อัปเดตความเสี่ยงต่ออีกแล้ว
//    (ดู recalculateLoanRiskStatuses ใน lib/notifications/repayment-check.ts — ประเมินเฉพาะสัญญาที่ยังไม่ปิด)
//    ค่า riskStatus ที่ค้างอยู่ในสัญญาปิดแล้วจึงเป็นค่าเก่าที่ไม่มีความหมายอีกต่อไป
// ---------------------------------------------------------------------------
export type RiskContractStats = { normal: number; watchlist: number; highRisk: number; noData: number };

export async function getRiskContractStats(scope: VillageScope): Promise<RiskContractStats> {
  const loans = await prisma.loan.findMany({
    where: scopeWhereViaHousehold(scope),
    select: { isClosed: true, riskStatus: true },
  });
  const stats: RiskContractStats = { normal: 0, watchlist: 0, highRisk: 0, noData: 0 };
  for (const l of loans) {
    if (l.isClosed) stats.noData++;
    else if (l.riskStatus === "NORMAL") stats.normal++;
    else if (l.riskStatus === "WATCHLIST") stats.watchlist++;
    else stats.highRisk++;
  }
  return stats;
}

// ---------------------------------------------------------------------------
// 3. ยอดเงินในบัญชีทั้งหมด + แยกตามชื่อธนาคาร — ยอดคงเหลือของแต่ละบัญชีคือ balance ของรายการล่าสุด
//    (ไม่ใช่ผลรวมฝาก-ถอน — ตามรูปแบบเดียวกับ getVillageDashboardData ใน lib/analytics.ts)
// ---------------------------------------------------------------------------
export type BankBalanceStats = { totalBalance: number; byBank: { bankName: string; balance: number }[] };

export async function getBankBalanceStats(scope: VillageScope): Promise<BankBalanceStats> {
  const accounts = await prisma.bankAccount.findMany({
    where: scopeWhereDirect(scope, "villageId"),
    include: { transactions: { orderBy: [{ transactionDate: "desc" }, { id: "desc" }], take: 1 } },
  });
  const byBankMap = new Map<string, number>();
  let totalBalance = 0;
  for (const acc of accounts) {
    const balance = acc.transactions[0]?.balance ?? 0;
    totalBalance += balance;
    const bank = acc.bankName ?? "ไม่ระบุธนาคาร";
    byBankMap.set(bank, (byBankMap.get(bank) ?? 0) + balance);
  }
  const byBank = [...byBankMap.entries()]
    .map(([bankName, balance]) => ({ bankName, balance }))
    .sort((a, b) => b.balance - a.balance);
  return { totalBalance, byBank };
}

// ---------------------------------------------------------------------------
// 4. ยอดเงินคงค้าง เทียบกับ ยอดเงินทั้งหมด (ยอดเงินยืมสะสมทุกสัญญา ทั้งที่ปิดแล้วและยังไม่ปิด)
// ---------------------------------------------------------------------------
export type LoanAmountStats = { totalAmount: number; outstanding: number; repaid: number };

export async function getLoanAmountStats(scope: VillageScope): Promise<LoanAmountStats> {
  const loans = await prisma.loan.findMany({
    where: scopeWhereViaHousehold(scope),
    select: { amount: true, outstandingBalance: true, isClosed: true },
  });
  const totalAmount = loans.reduce((s, l) => s + l.amount, 0);
  const outstanding = loans.filter((l) => !l.isClosed).reduce((s, l) => s + l.outstandingBalance, 0);
  return { totalAmount, outstanding, repaid: Math.max(0, totalAmount - outstanding) };
}

// ---------------------------------------------------------------------------
// 5. สัดส่วนอาชีพของครัวเรือนเป้าหมาย — occupation เป็นข้อความอิสระ (ไม่ใช่ enum) จึงจัดกลุ่มตามข้อความ
//    ที่กรอกตรงกันเป๊ะเท่านั้น และรวมรายการที่พบน้อยลงในหมวด "อื่นๆ" เพื่อไม่ให้กราฟวงกลมมีชิ้นย่อยเกินไป
// ---------------------------------------------------------------------------
const OCCUPATION_TOP_N = 7;

export async function getOccupationStats(scope: VillageScope): Promise<{ occupation: string; count: number }[]> {
  const households = await prisma.targetHousehold.findMany({
    where: { ...scopeWhereDirect(scope, "villageId"), occupation: { not: null } },
    select: { occupation: true },
  });
  const counts = new Map<string, number>();
  for (const h of households) {
    const occ = h.occupation?.trim();
    if (!occ) continue;
    counts.set(occ, (counts.get(occ) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].map(([occupation, count]) => ({ occupation, count })).sort((a, b) => b.count - a.count);
  if (sorted.length <= OCCUPATION_TOP_N) return sorted;
  const top = sorted.slice(0, OCCUPATION_TOP_N);
  const otherCount = sorted.slice(OCCUPATION_TOP_N).reduce((s, r) => s + r.count, 0);
  return [...top, { occupation: "อื่นๆ", count: otherCount }];
}

// ---------------------------------------------------------------------------
// 6. สถิติ "ปรึกษา/ร้องทุกข์" ตามสถานะ — status เป็น null หมายถึงยังไม่ได้ดำเนินการ (ดู HouseholdInquiry)
// ---------------------------------------------------------------------------
export type InquiryStats = { pending: number; inProgress: number; resolved: number; other: number };

export async function getInquiryStats(scope: VillageScope): Promise<InquiryStats> {
  const inquiries = await prisma.householdInquiry.findMany({
    where: scopeWhereDirect(scope, "villageId"),
    select: { status: true },
  });
  const stats: InquiryStats = { pending: 0, inProgress: 0, resolved: 0, other: 0 };
  for (const i of inquiries) {
    if (i.status === null) stats.pending++;
    else if (i.status === "IN_PROGRESS") stats.inProgress++;
    else if (i.status === "RESOLVED") stats.resolved++;
    else stats.other++;
  }
  return stats;
}

// ---------------------------------------------------------------------------
// 7. สถิติการเข้าใช้งานระบบ (เข้าสู่ระบบสำเร็จ) — กรองตามเขตพื้นที่ของ "ผู้ใช้ที่ก่อเหตุการณ์" โดยตรง
//    (join ผ่าน user.scopeVillageId/scopeSubDistrictId/scopeDistrictId/scopeProvinceId) แทนที่จะกรองด้วย
//    SystemAuditLog.villageId ตรงๆ เพราะคอลัมน์นั้นมีค่าเฉพาะ role ที่ผูกกับหมู่บ้านเดียว (VILLAGE_COMMITTEE/
//    HOUSEHOLD) เท่านั้น — เจ้าหน้าที่ระดับตำบลขึ้นไปจะมี villageId เป็น null เสมอ (ดู lib/auditLog.ts)
//    ถ้ากรองด้วย villageId อย่างเดียวจะนับการเข้าใช้งานของเจ้าหน้าที่ในพื้นที่ตกหล่นไปทั้งหมด
// ---------------------------------------------------------------------------
export type LoginStats = { totalLogins: number; last30Days: number; uniqueUsers: number };

export async function getLoginStats(user: Pick<CurrentUser, "role">, scope: VillageScope): Promise<LoginStats> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  let userFilter: { OR: Record<string, unknown>[] } | undefined;
  if (scope !== "all") {
    const villages = await prisma.village.findMany({
      where: { id: { in: scope } },
      select: {
        id: true,
        subDistrictId: true,
        subDistrict: { select: { districtId: true, district: { select: { provinceId: true } } } },
      },
    });
    const subDistrictIds = [...new Set(villages.map((v) => v.subDistrictId))];
    const districtIds = [...new Set(villages.map((v) => v.subDistrict.districtId))];
    const provinceIds = [...new Set(villages.map((v) => v.subDistrict.district.provinceId))];
    userFilter = {
      OR: [
        { scopeVillageId: { in: scope } },
        { scopeSubDistrictId: { in: subDistrictIds } },
        { scopeDistrictId: { in: districtIds } },
        { scopeProvinceId: { in: provinceIds } },
      ],
    };
  }

  const baseWhere = { action: "LOGIN_SUCCESS", ...(userFilter ? { user: userFilter } : {}) };

  const [totalLogins, last30Days, distinctUsers] = await Promise.all([
    prisma.systemAuditLog.count({ where: baseWhere }),
    prisma.systemAuditLog.count({ where: { ...baseWhere, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.systemAuditLog.findMany({ where: baseWhere, select: { userId: true }, distinct: ["userId"] }),
  ]);

  return { totalLogins, last30Days, uniqueUsers: distinctUsers.filter((u) => u.userId != null).length };
}
