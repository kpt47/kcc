// ชั้นรวบรวมข้อมูลสำหรับ Dashboard และรายงาน — ทุกฟังก์ชันรับ scope (VillageScope) ที่คำนวณจาก
// getAllowedVillageIds(user) แล้วเท่านั้น เพื่อบังคับ RBAC data isolation ที่ชั้นนี้อย่างสม่ำเสมอ
// (ไม่ query ตรงจาก page component โดยไม่ผ่าน scope)
import { prisma } from "./prisma";
import type { CurrentUser } from "./auth";
import { type VillageScope, scopeWhereDirect } from "./scope";

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

// ---------------------------------------------------------------------------
// ระดับครัวเรือน (HOUSEHOLD) — บัญชีคุมลูกหนี้ (เล่มเหลือง) ของตนเองเท่านั้น
// ---------------------------------------------------------------------------
export type HouseholdKpis = {
  outstandingBalance: number;
  totalRepaid: number;
  nextDueDate: string | null;
  pieData: { name: string; value: number }[];
};

export async function getHouseholdKpis(user: CurrentUser): Promise<HouseholdKpis | null> {
  if (!user.householdId) return null;

  const loans = await prisma.loan.findMany({
    where: { householdId: user.householdId },
    include: { repayments: true },
  });
  const activeLoans = loans.filter((l) => !l.isClosed);
  const outstandingBalance = activeLoans.reduce((s, l) => s + l.outstandingBalance, 0);
  const totalRepaid = loans.reduce((s, l) => s + l.repayments.reduce((rs, r) => rs + r.amount, 0), 0);
  const nextDue = activeLoans
    .filter((l) => l.dueDate)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())[0]?.dueDate;

  return {
    outstandingBalance,
    totalRepaid,
    nextDueDate: nextDue ? nextDue.toISOString() : null,
    pieData: [
      { name: "ชำระแล้ว", value: totalRepaid },
      { name: "ค้างชำระ", value: outstandingBalance },
    ],
  };
}

// ---------------------------------------------------------------------------
// ระดับหมู่บ้าน (VILLAGE_COMMITTEE)
// ---------------------------------------------------------------------------
export type VillageDashboardData = {
  villageName: string;
  totalFund: number;
  bankBalance: number;
  cashOnHand: number;
  outstandingWithHouseholds: number;
  totalDebtors: number;
  monthlyRepayments: { month: string; amount: number }[];
  overdueLoans: { householdName: string; outstandingBalance: number; dueDate: string; daysOverdue: number }[];
};

export async function getVillageDashboardData(villageId: number): Promise<VillageDashboardData | null> {
  const village = await prisma.village.findUnique({ where: { id: villageId } });
  if (!village) return null;

  const bankAccounts = await prisma.bankAccount.findMany({
    where: { villageId },
    include: { transactions: { orderBy: [{ transactionDate: "desc" }, { id: "desc" }], take: 1 } },
  });
  const bankBalance = bankAccounts.reduce((s, a) => s + (a.transactions[0]?.balance ?? 0), 0);

  // "เงินในมือ" ไม่มีบัญชีแยกเก็บแบบ real-time ในระบบ — อ้างอิงจาก snapshot ล่าสุดตอนส่งมอบ-รับมอบงาน (เล่มน้ำตาล)
  const latestSnapshot = await prisma.villageStatusSnapshot.findFirst({
    where: { villageId },
    orderBy: { id: "desc" },
  });
  const cashOnHand = latestSnapshot?.fundElsewhere ?? 0;

  const loans = await prisma.loan.findMany({
    where: { household: { villageId } },
    include: { household: true, repayments: true },
  });
  const activeLoans = loans.filter((l) => !l.isClosed);
  const outstandingWithHouseholds = activeLoans.reduce((s, l) => s + l.outstandingBalance, 0);
  const totalDebtors = new Set(activeLoans.map((l) => l.householdId)).size;

  const monthlyMap = new Map<string, number>();
  for (const loan of loans) {
    for (const r of loan.repayments) {
      const key = `${r.paymentDate.getFullYear()}-${r.paymentDate.getMonth()}`;
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + r.amount);
    }
  }
  const now = new Date();
  const monthlyRepayments = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    return { month: `${THAI_MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear() + 543).slice(2)}`, amount: monthlyMap.get(key) ?? 0 };
  });

  const today = startOfDay(now);
  const overdueLoans = activeLoans
    .filter((l) => l.dueDate && l.dueDate < today)
    .map((l) => ({
      householdName: `${l.household.headFirstName} ${l.household.headLastName}`,
      outstandingBalance: l.outstandingBalance,
      dueDate: l.dueDate!.toISOString(),
      daysOverdue: Math.floor((today.getTime() - l.dueDate!.getTime()) / 86_400_000),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  return {
    villageName: `หมู่ ${village.villageNo} บ้าน${village.villageName}`,
    totalFund: bankBalance + cashOnHand + outstandingWithHouseholds,
    bankBalance,
    cashOnHand,
    outstandingWithHouseholds,
    totalDebtors,
    monthlyRepayments,
    overdueLoans,
  };
}

// ---------------------------------------------------------------------------
// ระดับตำบล (SUB_DISTRICT_ADMIN)
// ---------------------------------------------------------------------------
export type SubDistrictDashboardData = {
  villageOverview: {
    villageId: number;
    villageName: string;
    debtorCount: number;
    outstandingBalance: number;
    overdueCount: number;
    overdueAmount: number;
  }[];
  incomeTrend: { stage: string; avgIncome: number }[];
  problemVillages: { villageName: string; overdueCount: number; overdueAmount: number }[];
};

export async function getSubDistrictDashboardData(scope: VillageScope): Promise<SubDistrictDashboardData> {
  const villages = await prisma.village.findMany({ where: scopeWhereDirect(scope, "id"), orderBy: { id: "asc" } });
  const villageIds = villages.map((v) => v.id);

  const loans = await prisma.loan.findMany({
    where: { household: { villageId: { in: villageIds } } },
    include: { household: { select: { villageId: true } } },
  });
  const today = startOfDay(new Date());

  const villageOverview = villages.map((v) => {
    const vLoans = loans.filter((l) => l.household.villageId === v.id && !l.isClosed);
    const overdue = vLoans.filter((l) => l.dueDate && l.dueDate < today);
    return {
      villageId: v.id,
      villageName: `หมู่ ${v.villageNo} บ้าน${v.villageName}`,
      debtorCount: new Set(vLoans.map((l) => l.householdId)).size,
      outstandingBalance: vLoans.reduce((s, l) => s + l.outstandingBalance, 0),
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((s, l) => s + l.outstandingBalance, 0),
    };
  });

  const households = await prisma.targetHousehold.findMany({
    where: { villageId: { in: villageIds } },
    select: { id: true, incomeBeforeLoan: true },
  });
  const incomeRecords = await prisma.householdIncomeRecord.findMany({
    where: { householdId: { in: households.map((h) => h.id) } },
  });
  const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
  const beforeValues = households.map((h) => h.incomeBeforeLoan).filter((v): v is number => v != null);
  const incomeTrend = [
    { stage: "ก่อนยืม", avgIncome: avg(beforeValues) },
    { stage: "หลังยืม 1 ปี", avgIncome: avg(incomeRecords.filter((r) => r.yearsAfterLoan === 1).map((r) => r.income)) },
    { stage: "หลังยืม 2 ปี", avgIncome: avg(incomeRecords.filter((r) => r.yearsAfterLoan === 2).map((r) => r.income)) },
    { stage: "หลังยืม 3 ปี", avgIncome: avg(incomeRecords.filter((r) => r.yearsAfterLoan === 3).map((r) => r.income)) },
  ];

  const problemVillages = villageOverview
    .filter((v) => v.overdueCount > 0)
    .sort((a, b) => b.overdueAmount - a.overdueAmount)
    .map(({ villageName, overdueCount, overdueAmount }) => ({ villageName, overdueCount, overdueAmount }));

  return { villageOverview, incomeTrend, problemVillages };
}

// ---------------------------------------------------------------------------
// ระดับอำเภอ / จังหวัด / ส่วนกลาง (DISTRICT_ADMIN, PROVINCIAL_ADMIN, GLOBAL_ADMIN)
// ---------------------------------------------------------------------------
export type BigPictureDashboardData = {
  totalVillages: number;
  totalHouseholds: number;
  totalOutstanding: number;
  totalFund: number;
  topPerforming: { villageName: string; nplRatio: number; totalOutstanding: number }[];
  topProblem: { villageName: string; nplRatio: number; overdueAmount: number }[];
};

export async function getBigPictureDashboardData(scope: VillageScope): Promise<BigPictureDashboardData> {
  const villages = await prisma.village.findMany({
    where: scopeWhereDirect(scope, "id"),
    include: { bankAccounts: { include: { transactions: { orderBy: [{ transactionDate: "desc" }, { id: "desc" }], take: 1 } } } },
  });
  const villageIds = villages.map((v) => v.id);

  const totalHouseholds = await prisma.targetHousehold.count({ where: { villageId: { in: villageIds } } });
  const loans = await prisma.loan.findMany({
    where: { household: { villageId: { in: villageIds } }, isClosed: false },
    include: { household: { select: { villageId: true } } },
  });
  const today = startOfDay(new Date());

  const ranked = villages.map((v) => {
    const vLoans = loans.filter((l) => l.household.villageId === v.id);
    const totalOutstanding = vLoans.reduce((s, l) => s + l.outstandingBalance, 0);
    const overdueAmount = vLoans.filter((l) => l.dueDate && l.dueDate < today).reduce((s, l) => s + l.outstandingBalance, 0);
    const bankBalance = v.bankAccounts.reduce((s, a) => s + (a.transactions[0]?.balance ?? 0), 0);
    return {
      villageName: `หมู่ ${v.villageNo} บ้าน${v.villageName}`,
      nplRatio: totalOutstanding > 0 ? overdueAmount / totalOutstanding : 0,
      totalOutstanding,
      overdueAmount,
      bankBalance,
    };
  });

  const totalOutstanding = ranked.reduce((s, v) => s + v.totalOutstanding, 0);
  const totalBank = ranked.reduce((s, v) => s + v.bankBalance, 0);

  const topPerforming = [...ranked]
    .filter((v) => v.totalOutstanding > 0)
    .sort((a, b) => a.nplRatio - b.nplRatio)
    .slice(0, 5)
    .map(({ villageName, nplRatio, totalOutstanding }) => ({ villageName, nplRatio, totalOutstanding }));

  const topProblem = [...ranked]
    .filter((v) => v.overdueAmount > 0)
    .sort((a, b) => b.nplRatio - a.nplRatio)
    .slice(0, 5)
    .map(({ villageName, nplRatio, overdueAmount }) => ({ villageName, nplRatio, overdueAmount }));

  return {
    totalVillages: villages.length,
    totalHouseholds,
    totalOutstanding,
    totalFund: totalOutstanding + totalBank,
    topPerforming,
    topProblem,
  };
}

// ---------------------------------------------------------------------------
// รายงานราชการ (Official Reports) — สำหรับ /reports
// ---------------------------------------------------------------------------
export type Report1Row = {
  villageName: string;
  totalHouseholds: number;
  targetHouseholds: number;
  householdsWithLoan: number;
  outstandingBalance: number;
  bankBalance: number;
  cashOnHand: number;
  totalFund: number;
  repaidThisYear: number;
};

/** รายงาน 1: แบบรายงานภาวะหนี้สินและฐานะทางการเงิน — ทุกหมู่บ้านในขอบเขต (กรองตามปีงบประมาณได้ถ้าระบุ) */
export async function getReport1Rows(scope: VillageScope, budgetYear?: number): Promise<Report1Row[]> {
  const villages = await prisma.village.findMany({
    where: { ...scopeWhereDirect(scope, "id"), ...(budgetYear ? { budgetYear } : {}) },
    include: {
      households: { select: { id: true } },
      bankAccounts: { include: { transactions: { orderBy: [{ transactionDate: "desc" }, { id: "desc" }], take: 1 } } },
    },
    orderBy: { id: "asc" },
  });
  const villageIds = villages.map((v) => v.id);

  const loans = await prisma.loan.findMany({
    where: { household: { villageId: { in: villageIds } } },
    include: { household: { select: { villageId: true } }, repayments: true },
  });
  const snapshots = await prisma.villageStatusSnapshot.findMany({
    where: { villageId: { in: villageIds } },
    orderBy: { id: "desc" },
  });
  const latestSnapshotByVillage = new Map<number, (typeof snapshots)[number]>();
  for (const s of snapshots) {
    if (!latestSnapshotByVillage.has(s.villageId)) latestSnapshotByVillage.set(s.villageId, s);
  }
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  return villages.map((v) => {
    const vLoans = loans.filter((l) => l.household.villageId === v.id);
    const active = vLoans.filter((l) => !l.isClosed);
    const outstandingBalance = active.reduce((s, l) => s + l.outstandingBalance, 0);
    const bankBalance = v.bankAccounts.reduce((s, a) => s + (a.transactions[0]?.balance ?? 0), 0);
    const cashOnHand = latestSnapshotByVillage.get(v.id)?.fundElsewhere ?? 0;
    const repaidThisYear = vLoans.reduce(
      (s, l) => s + l.repayments.filter((r) => r.paymentDate >= yearStart).reduce((rs, r) => rs + r.amount, 0),
      0
    );

    return {
      villageName: `หมู่ ${v.villageNo} บ้าน${v.villageName}`,
      totalHouseholds: latestSnapshotByVillage.get(v.id)?.totalHouseholds ?? v.households.length,
      targetHouseholds: v.households.length,
      householdsWithLoan: new Set(vLoans.map((l) => l.householdId)).size,
      outstandingBalance,
      bankBalance,
      cashOnHand,
      totalFund: outstandingBalance + bankBalance + cashOnHand,
      repaidThisYear,
    };
  });
}

export type VillageConditionRow = {
  villageId: number;
  villageName: string;
  totalHouseholds: number;
  totalDisbursed: number;
  totalRepaid: number;
  outstandingBalance: number;
  bankBalance: number;
  fundShortfall: number;
};

/**
 * แบบรายงานภาวะหนี้สินฯ สำหรับ Smart Report & Map Center — ต่างจาก getReport1Rows ตรงที่รับ villageIds
 * ตรงๆ (ผลลัพธ์จากตัวกรองปัจจุบันของผู้ใช้ ไม่ใช่ทุกหมู่บ้านในขอบเขต) และมี totalDisbursed/fundShortfall เพิ่ม
 */
export async function getVillageConditionRows(villageIds: number[]): Promise<VillageConditionRow[]> {
  if (villageIds.length === 0) return [];

  const villages = await prisma.village.findMany({
    where: { id: { in: villageIds } },
    include: {
      households: { select: { id: true } },
      bankAccounts: { include: { transactions: { orderBy: [{ transactionDate: "desc" }, { id: "desc" }], take: 1 } } },
    },
    orderBy: { id: "asc" },
  });

  const loans = await prisma.loan.findMany({
    where: { household: { villageId: { in: villageIds } } },
    include: { household: { select: { villageId: true } }, repayments: true },
  });

  return villages.map((v) => {
    const vLoans = loans.filter((l) => l.household.villageId === v.id);
    const active = vLoans.filter((l) => !l.isClosed);
    const totalDisbursed = vLoans.reduce((s, l) => s + l.amount, 0);
    const totalRepaid = vLoans.reduce(
      (s, l) => s + l.repayments.filter((r) => r.status === "APPROVED").reduce((rs, r) => rs + r.amount, 0),
      0
    );
    const outstandingBalance = active.reduce((s, l) => s + l.outstandingBalance, 0);
    const bankBalance = v.bankAccounts.reduce((s, a) => s + (a.transactions[0]?.balance ?? 0), 0);
    const currentFund = outstandingBalance + bankBalance;
    const fundShortfall = v.budgetAmount != null ? Math.max(0, v.budgetAmount - currentFund) : 0;

    return {
      villageId: v.id,
      villageName: `หมู่ ${v.villageNo} บ้าน${v.villageName}`,
      totalHouseholds: v.households.length,
      totalDisbursed,
      totalRepaid,
      outstandingBalance,
      bankBalance,
      fundShortfall,
    };
  });
}

export type Report2Row = {
  areaName: string;
  budgetYear: number;
  currentFund: number;
  fundShortfall: number;
  cause: string;
  remedy: string;
};

/**
 * รายงาน 2: แบบรายงานสภาพปัญหาการบริหารเงินทุน — เฉพาะหมู่บ้านที่ "มีปัญหา" เท่านั้น
 * (เงินทุนคงเหลือต่ำกว่างบประมาณที่ได้รับ และ/หรือมีครัวเรือนผิดสัญญา ตาม snapshot ล่าสุด)
 * "สาเหตุ"/"การแก้ไข" ไม่มีฟิลด์โครงสร้างแยกในระบบ — อ้างอิงจากหมายเหตุ (note) ของ snapshot ล่าสุดถ้ามี
 */
export async function getReport2Rows(scope: VillageScope, budgetYear?: number): Promise<Report2Row[]> {
  const villages = await prisma.village.findMany({
    where: { ...scopeWhereDirect(scope, "id"), ...(budgetYear ? { budgetYear } : {}) },
    include: {
      subDistrict: { include: { district: { include: { province: true } } } },
      bankAccounts: { include: { transactions: { orderBy: [{ transactionDate: "desc" }, { id: "desc" }], take: 1 } } },
    },
    orderBy: { id: "asc" },
  });
  const villageIds = villages.map((v) => v.id);

  const loans = await prisma.loan.findMany({
    where: { household: { villageId: { in: villageIds } }, isClosed: false },
    include: { household: { select: { villageId: true } } },
  });
  const snapshots = await prisma.villageStatusSnapshot.findMany({
    where: { villageId: { in: villageIds } },
    orderBy: { id: "desc" },
  });
  const latestSnapshotByVillage = new Map<number, (typeof snapshots)[number]>();
  for (const s of snapshots) {
    if (!latestSnapshotByVillage.has(s.villageId)) latestSnapshotByVillage.set(s.villageId, s);
  }

  const rows: Report2Row[] = [];
  for (const v of villages) {
    const outstandingBalance = loans
      .filter((l) => l.household.villageId === v.id)
      .reduce((s, l) => s + l.outstandingBalance, 0);
    const bankBalance = v.bankAccounts.reduce((s, a) => s + (a.transactions[0]?.balance ?? 0), 0);
    const snapshot = latestSnapshotByVillage.get(v.id);
    const currentFund = outstandingBalance + bankBalance + (snapshot?.fundElsewhere ?? 0);
    const fundShortfall = v.budgetAmount != null ? Math.max(0, v.budgetAmount - currentFund) : 0;
    const hasDefaulted = snapshot?.hasDefaultedHouseholds ?? false;

    if (fundShortfall <= 0 && !hasDefaulted) continue;

    rows.push({
      areaName: `หมู่ ${v.villageNo} บ้าน${v.villageName} ต.${v.subDistrict.name} อ.${v.subDistrict.district.name} จ.${v.subDistrict.district.province.name}`,
      budgetYear: v.budgetYear,
      currentFund,
      fundShortfall,
      cause: snapshot?.note?.trim()
        ? snapshot.note
        : hasDefaulted
          ? "มีครัวเรือนผิดสัญญาคืนเงินยืม"
          : "เงินทุนคงเหลือต่ำกว่างบประมาณที่ได้รับ",
      remedy: snapshot?.note?.trim()
        ? "ดูรายละเอียดในหมายเหตุ / ติดตามโดยพัฒนากรประจำตำบล"
        : "อยู่ระหว่างติดตามตรวจสอบโดยพัฒนากรประจำตำบล",
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// /official-reports — แบบฟอร์ม 26(1)/26(2) ท้ายระเบียบ กข.คจ. พ.ศ. 2553 (4 ระดับ, RBAC เข้มงวด)
// ---------------------------------------------------------------------------

export type VillageDebtorRow = {
  householdId: number;
  headFirstName: string;
  headLastName: string;
  receivedDate: string;
  amountLoaned: number;
  amountRepaid: number;
  outstandingBalance: number;
  borrowRound: number;
};

export type VillageDebtReportSummary = {
  villageName: string;
  debtorCount: number;
  totalLoaned: number;
  bankBalance: number;
  cashOnHand: number;
  totalFund: number;
  repaidThisYear: number;
};

/**
 * แบบ 3.1 (แบบฟอร์ม 26(1) ระดับหมู่บ้าน): รายชื่อผู้ยืมรายตัวในหมู่บ้านเดียว พร้อมสรุปท้ายรายงาน
 * คืนค่า null ถ้าไม่พบหมู่บ้าน หรือ budgetYear ที่ระบุไม่ตรงกับปีที่หมู่บ้านนี้ได้รับงบประมาณ
 */
export async function getVillageDebtReport(
  villageId: number,
  budgetYear?: number
): Promise<{ rows: VillageDebtorRow[]; summary: VillageDebtReportSummary } | null> {
  const village = await prisma.village.findUnique({
    where: { id: villageId },
    include: { bankAccounts: { include: { transactions: { orderBy: [{ transactionDate: "desc" }, { id: "desc" }], take: 1 } } } },
  });
  if (!village) return null;
  if (budgetYear && village.budgetYear !== budgetYear) return { rows: [], summary: emptyVillageDebtSummary(village) };

  const loans = await prisma.loan.findMany({
    where: { household: { villageId }, isClosed: false },
    include: { household: { select: { id: true, headFirstName: true, headLastName: true } }, repayments: true },
    orderBy: { receivedDate: "asc" },
  });

  const latestSnapshot = await prisma.villageStatusSnapshot.findFirst({ where: { villageId }, orderBy: { id: "desc" } });
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const rows: VillageDebtorRow[] = loans.map((l) => {
    const amountRepaid = l.repayments.filter((r) => r.status === "APPROVED").reduce((s, r) => s + r.amount, 0);
    return {
      householdId: l.household.id,
      headFirstName: l.household.headFirstName,
      headLastName: l.household.headLastName,
      receivedDate: l.receivedDate.toISOString(),
      amountLoaned: l.amount,
      amountRepaid,
      outstandingBalance: l.outstandingBalance,
      borrowRound: l.borrowRound,
    };
  });

  const bankBalance = village.bankAccounts.reduce((s, a) => s + (a.transactions[0]?.balance ?? 0), 0);
  const cashOnHand = latestSnapshot?.fundElsewhere ?? 0;
  const outstandingBalance = loans.reduce((s, l) => s + l.outstandingBalance, 0);
  const repaidThisYear = loans.reduce(
    (s, l) => s + l.repayments.filter((r) => r.status === "APPROVED" && r.paymentDate >= yearStart).reduce((rs, r) => rs + r.amount, 0),
    0
  );

  return {
    rows,
    summary: {
      villageName: `หมู่ ${village.villageNo} บ้าน${village.villageName}`,
      debtorCount: new Set(loans.map((l) => l.household.id)).size,
      totalLoaned: outstandingBalance, // ยอดเงินให้ยืมคงเหลือ (เงินยืมที่ยังไม่ปิดสัญญา)
      bankBalance,
      cashOnHand,
      totalFund: outstandingBalance + bankBalance + cashOnHand,
      repaidThisYear,
    },
  };
}

function emptyVillageDebtSummary(village: { villageNo: string; villageName: string }): VillageDebtReportSummary {
  return {
    villageName: `หมู่ ${village.villageNo} บ้าน${village.villageName}`,
    debtorCount: 0,
    totalLoaned: 0,
    bankBalance: 0,
    cashOnHand: 0,
    totalFund: 0,
    repaidThisYear: 0,
  };
}

export type ProvinceSummaryRow = {
  districtId: number;
  districtName: string;
  subDistrictCount: number;
  villageCount: number;
  totalHouseholds: number;
  targetHouseholds: number;
  householdsWithLoan: number;
  outstandingBalance: number;
  bankBalance: number;
  cashOnHand: number;
  totalFund: number;
  repaidThisYear: number;
};

/** แบบ 3.3 (แบบฟอร์ม 26(2) สรุประดับจังหวัด): สรุปเป็นรายอำเภอ ภายในจังหวัดเดียว (กรองตามปีงบประมาณได้) */
export async function getProvinceSummaryRows(provinceId: number, budgetYear?: number): Promise<ProvinceSummaryRow[]> {
  const districts = await prisma.district.findMany({
    where: { provinceId },
    include: {
      subDistricts: {
        include: {
          villages: {
            where: budgetYear ? { budgetYear } : {},
            include: {
              households: { select: { id: true } },
              bankAccounts: { include: { transactions: { orderBy: [{ transactionDate: "desc" }, { id: "desc" }], take: 1 } } },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const allVillageIds = districts.flatMap((d) => d.subDistricts.flatMap((s) => s.villages.map((v) => v.id)));
  const loans = await prisma.loan.findMany({
    where: { household: { villageId: { in: allVillageIds } } },
    include: { household: { select: { villageId: true } }, repayments: true },
  });
  const snapshots = await prisma.villageStatusSnapshot.findMany({ where: { villageId: { in: allVillageIds } }, orderBy: { id: "desc" } });
  const latestSnapshotByVillage = new Map<number, (typeof snapshots)[number]>();
  for (const s of snapshots) {
    if (!latestSnapshotByVillage.has(s.villageId)) latestSnapshotByVillage.set(s.villageId, s);
  }
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  return districts.map((d) => {
    const villages = d.subDistricts.flatMap((s) => s.villages);
    const villageIds = villages.map((v) => v.id);
    const dLoans = loans.filter((l) => villageIds.includes(l.household.villageId));
    const active = dLoans.filter((l) => !l.isClosed);

    const outstandingBalance = active.reduce((s, l) => s + l.outstandingBalance, 0);
    const bankBalance = villages.reduce((s, v) => s + v.bankAccounts.reduce((bs, a) => bs + (a.transactions[0]?.balance ?? 0), 0), 0);
    const cashOnHand = villages.reduce((s, v) => s + (latestSnapshotByVillage.get(v.id)?.fundElsewhere ?? 0), 0);
    const repaidThisYear = dLoans.reduce(
      (s, l) => s + l.repayments.filter((r) => r.status === "APPROVED" && r.paymentDate >= yearStart).reduce((rs, r) => rs + r.amount, 0),
      0
    );
    const totalHouseholds = villages.reduce((s, v) => s + (latestSnapshotByVillage.get(v.id)?.totalHouseholds ?? v.households.length), 0);

    return {
      districtId: d.id,
      districtName: d.name,
      subDistrictCount: d.subDistricts.length,
      villageCount: villages.length,
      totalHouseholds,
      targetHouseholds: villages.reduce((s, v) => s + v.households.length, 0),
      householdsWithLoan: new Set(dLoans.map((l) => l.householdId)).size,
      outstandingBalance,
      bankBalance,
      cashOnHand,
      totalFund: outstandingBalance + bankBalance + cashOnHand,
      repaidThisYear,
    };
  });
}
