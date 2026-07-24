// กล่องค้นหาอัจฉริยะ (Smart Omnibar Search) บนหน้า Dashboard — ค้นหาข้ามตาราง (หมู่บ้าน/ครัวเรือน/
// ปีงบประมาณ/วาระการประชุม) พร้อมกันในคำค้นหาเดียว แล้วแสดงผลลัพธ์คนละรูปแบบตามประเภทข้อมูลที่พบ
// กฎเหล็กด้านความปลอดภัย (ดู lib/scope.ts, lib/authz.ts):
// - ทุก query แนบเงื่อนไขเขตพื้นที่ของ currentUser เสมอผ่าน getAllowedVillageIds (ไม่มีทางค้นข้ามเขตได้)
// - HOUSEHOLD: ค้นเจอเฉพาะข้อมูลของ "ตนเอง" ในเล่มม่วง/เล่มเหลืองเท่านั้น (ไม่ค้นเล่มเขียว/วาระการประชุม/
//   ครัวเรือนอื่นเลย แม้จะอยู่หมู่บ้านเดียวกัน) — ใช้เส้นทางแยกต่างหาก (searchHouseholdSelf)
// - IT_SUPPORT: คืนค่าผลลัพธ์ว่างเสมอ (ไม่ใช่ 403) ตามที่ผู้ใช้กำหนดไว้ชัดเจน — ผู้ดูแลระบบไม่มีสิทธิ์
//   เข้าถึงข้อมูลบัญชีโครงการเลย แต่การค้นหาไม่พบไม่ควรแตกต่างจาก "ไม่พบข้อมูล" ธรรมดา (ไม่รั่วไหลว่ามีข้อมูลอยู่)
import { prisma } from "./prisma";
import type { CurrentUser } from "./auth";
import { getAllowedVillageIds, type VillageScope, scopeWhereDirect } from "./scope";
import { canViewBankLedger, canViewVillageStatusBook } from "./authz";

const MAX_RESULTS_PER_TYPE = 5;
const MIN_QUERY_LENGTH = 2;

export type VillageSearchResult = {
  type: "village";
  id: number;
  label: string;
  greenBookTotal: number | null; // null = ผู้ค้นหาไม่มีสิทธิ์ดูเล่มเขียว (ไม่แสดงยอด ไม่ใช่ซ่อนทั้งการ์ด)
  yellowBookOutstanding: number;
  canSeeVillageStatus: boolean; // ใช้ตัดสินใจแสดง QuickLink "ดูเล่มน้ำตาล" หรือไม่ (canViewVillageStatusBook)
};

export type BankAccountSearchResult = {
  type: "bankAccount";
  id: number;
  label: string; // ชื่อธนาคาร + เลขที่บัญชี
  villageLabel: string;
  latestBalance: number;
};

export type HouseholdLoanRow = {
  id: number;
  borrowRound: number;
  amount: number;
  outstandingBalance: number;
  isClosed: boolean;
  receivedDate: string;
};

export type HouseholdSearchResult = {
  type: "household";
  id: number;
  label: string;
  villageLabel: string;
  loans: HouseholdLoanRow[];
};

export type BudgetYearSearchResult = {
  type: "budgetYear";
  year: number;
  villageCount: number;
  disbursed: number;
  repaid: number;
};

export type MeetingSearchResult = {
  type: "meeting";
  id: number;
  agendaTopic: string;
  villageLabel: string;
  meetingDate: string;
};

export type DashboardSearchResult =
  | VillageSearchResult
  | HouseholdSearchResult
  | BudgetYearSearchResult
  | MeetingSearchResult
  | BankAccountSearchResult;

export async function searchDashboard(user: CurrentUser, rawQuery: string): Promise<DashboardSearchResult[]> {
  const q = rawQuery.trim();
  if (q.length < MIN_QUERY_LENGTH) return [];

  if (user.role === "IT_SUPPORT") return [];

  if (user.role === "HOUSEHOLD") return searchHouseholdSelf(user, q);

  const scope = await getAllowedVillageIds(user);
  const canSeeBank = canViewBankLedger(user);
  const canSeeVillageStatus = canViewVillageStatusBook(user);

  const [villages, households, budgetYear, meetings, bankAccounts] = await Promise.all([
    searchVillages(scope, q, canSeeBank, canSeeVillageStatus),
    searchHouseholds(scope, q),
    searchBudgetYear(scope, q),
    searchMeetings(scope, q),
    canSeeBank ? searchBankAccounts(scope, q) : Promise.resolve([]),
  ]);

  return [...villages, ...households, ...(budgetYear ? [budgetYear] : []), ...meetings, ...bankAccounts];
}

// ครัวเรือน (HOUSEHOLD): ค้นหาได้เฉพาะข้อมูลของตนเอง (เล่มม่วง+เล่มเหลือง) เท่านั้น — ไม่ค้นครัวเรือนอื่น
// ไม่ค้นเล่มเขียว ไม่ค้นวาระการประชุม แม้จะอยู่ในหมู่บ้าน/เขตพื้นที่เดียวกันก็ตาม
async function searchHouseholdSelf(user: CurrentUser, q: string): Promise<DashboardSearchResult[]> {
  if (!user.householdId) return [];
  const household = await prisma.targetHousehold.findUnique({
    where: { id: user.householdId },
    include: { village: { select: { villageNo: true, villageName: true } }, loans: true },
  });
  if (!household) return [];

  const haystack = [
    household.headFirstName,
    household.headLastName,
    `${household.headFirstName} ${household.headLastName}`,
    household.village.villageNo,
    household.village.villageName,
    String(household.sequenceNo),
  ];
  if (!haystack.some((s) => s.includes(q))) return [];

  return [
    {
      type: "household",
      id: household.id,
      label: `${household.headFirstName} ${household.headLastName}`,
      villageLabel: `หมู่ ${household.village.villageNo} บ้าน${household.village.villageName}`,
      loans: household.loans.map(toLoanRow),
    },
  ];
}

function toLoanRow(l: {
  id: number;
  borrowRound: number;
  amount: number;
  outstandingBalance: number;
  isClosed: boolean;
  receivedDate: Date;
}): HouseholdLoanRow {
  return {
    id: l.id,
    borrowRound: l.borrowRound,
    amount: l.amount,
    outstandingBalance: l.outstandingBalance,
    isClosed: l.isClosed,
    receivedDate: l.receivedDate.toISOString(),
  };
}

// รูปแบบ A: ชื่อ/เลขหมู่หมู่บ้านตรงกัน -> การ์ดสรุปยอดเงิน (เล่มเขียว + เล่มเหลือง) ของหมู่บ้านนั้น
async function searchVillages(
  scope: VillageScope,
  q: string,
  canSeeBank: boolean,
  canSeeVillageStatus: boolean
): Promise<VillageSearchResult[]> {
  const villages = await prisma.village.findMany({
    where: {
      ...scopeWhereDirect(scope, "id"),
      OR: [{ villageName: { contains: q } }, { villageNo: { contains: q } }],
    },
    take: MAX_RESULTS_PER_TYPE,
  });
  if (villages.length === 0) return [];

  return Promise.all(
    villages.map(async (v) => {
      const [bankAccounts, loanAgg] = await Promise.all([
        canSeeBank
          ? prisma.bankAccount.findMany({
              where: { villageId: v.id },
              include: { transactions: { orderBy: [{ transactionDate: "desc" }, { id: "desc" }], take: 1 } },
            })
          : Promise.resolve(null),
        prisma.loan.aggregate({
          where: { isClosed: false, household: { villageId: v.id } },
          _sum: { outstandingBalance: true },
        }),
      ]);

      return {
        type: "village" as const,
        id: v.id,
        label: `หมู่ ${v.villageNo} บ้าน${v.villageName}`,
        greenBookTotal: bankAccounts ? bankAccounts.reduce((sum, acc) => sum + (acc.transactions[0]?.balance ?? 0), 0) : null,
        yellowBookOutstanding: loanAgg._sum.outstandingBalance ?? 0,
        canSeeVillageStatus,
      };
    })
  );
}

// รูปแบบ E: เลขที่บัญชี/ชื่อธนาคาร/สาขาตรงกัน -> การ์ดยอดคงเหลือล่าสุดของบัญชีนั้น (เฉพาะผู้มีสิทธิ์ดูเล่มเขียว
// เท่านั้น — searchDashboard() ข้ามการเรียกฟังก์ชันนี้ไปเลยถ้า !canViewBankLedger ไม่ใช่แค่ซ่อนตัวเลข)
async function searchBankAccounts(scope: VillageScope, q: string): Promise<BankAccountSearchResult[]> {
  const accounts = await prisma.bankAccount.findMany({
    where: {
      ...scopeWhereDirect(scope, "villageId"),
      OR: [
        { bankName: { contains: q } },
        { branch: { contains: q } },
        { accountNo: { contains: q } },
        { accountName: { contains: q } },
      ],
    },
    include: {
      village: { select: { villageNo: true, villageName: true } },
      transactions: { orderBy: [{ transactionDate: "desc" }, { id: "desc" }], take: 1 },
    },
    take: MAX_RESULTS_PER_TYPE,
  });

  return accounts.map((a) => ({
    type: "bankAccount" as const,
    id: a.id,
    label: `${a.bankName ?? "ไม่ระบุธนาคาร"}${a.accountNo ? ` เลขที่บัญชี ${a.accountNo}` : ""}`,
    villageLabel: `หมู่ ${a.village.villageNo} บ้าน${a.village.villageName}`,
    latestBalance: a.transactions[0]?.balance ?? 0,
  }));
}

// รูปแบบ B: ชื่อครัวเรือนเป้าหมายตรงกัน -> ตารางขนาดเล็กแจกแจงประวัติการกู้ยืม
async function searchHouseholds(scope: VillageScope, q: string): Promise<HouseholdSearchResult[]> {
  const households = await prisma.targetHousehold.findMany({
    where: {
      ...scopeWhereDirect(scope, "villageId"),
      OR: [{ headFirstName: { contains: q } }, { headLastName: { contains: q } }],
    },
    include: { village: { select: { villageNo: true, villageName: true } }, loans: true },
    take: MAX_RESULTS_PER_TYPE,
  });

  return households.map((h) => ({
    type: "household" as const,
    id: h.id,
    label: `${h.headFirstName} ${h.headLastName}`,
    villageLabel: `หมู่ ${h.village.villageNo} บ้าน${h.village.villageName}`,
    loans: h.loans.map(toLoanRow),
  }));
}

// รูปแบบ C: พิมพ์ปีงบประมาณ (พ.ศ. 4 หลัก) -> กราฟสรุปสัดส่วนเงินให้ยืม/เงินรับคืนของปีนั้น
async function searchBudgetYear(scope: VillageScope, q: string): Promise<BudgetYearSearchResult | null> {
  if (!/^\d{4}$/.test(q)) return null;
  const year = Number(q);
  if (year < 2500 || year > 2700) return null; // ช่วงปี พ.ศ. ที่สมเหตุสมผลของโครงการ กข.คจ.

  const villages = await prisma.village.findMany({
    where: { ...scopeWhereDirect(scope, "id"), budgetYear: year },
    select: { id: true },
  });
  if (villages.length === 0) return null;
  const villageIds = villages.map((v) => v.id);

  const [loanAgg, repaymentAgg] = await Promise.all([
    prisma.loan.aggregate({ where: { household: { villageId: { in: villageIds } } }, _sum: { amount: true } }),
    prisma.loanRepayment.aggregate({
      where: { status: "APPROVED", loan: { household: { villageId: { in: villageIds } } } },
      _sum: { amount: true },
    }),
  ]);

  return {
    type: "budgetYear",
    year,
    villageCount: villages.length,
    disbursed: loanAgg._sum.amount ?? 0,
    repaid: repaymentAgg._sum.amount ?? 0,
  };
}

// วาระการประชุม (VillageMeetingRecord) ที่หัวข้อตรงกับคำค้นหา -> แสดงเป็นลิงก์ด่วนไปหน้า /meetings
async function searchMeetings(scope: VillageScope, q: string): Promise<MeetingSearchResult[]> {
  const meetings = await prisma.villageMeetingRecord.findMany({
    where: {
      village: scope === "all" ? undefined : { id: { in: scope } },
      agendaTopic: { contains: q },
    },
    include: { village: { select: { villageNo: true, villageName: true } } },
    orderBy: { meetingDate: "desc" },
    take: MAX_RESULTS_PER_TYPE,
  });

  return meetings.map((m) => ({
    type: "meeting" as const,
    id: m.id,
    agendaTopic: m.agendaTopic,
    villageLabel: `หมู่ ${m.village.villageNo} บ้าน${m.village.villageName}`,
    meetingDate: m.meetingDate.toISOString(),
  }));
}
