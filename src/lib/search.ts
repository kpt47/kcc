// Smart Report & Map Center — ค้นหาหลายมิติข้ามพื้นที่/สถานะความเสี่ยง/เศรษฐกิจ/ข้อความอิสระ
// ทุกฟังก์ชันรับ scope (VillageScope จาก getAllowedVillageIds) และ "ตัดกัน" (intersect) กับตัวกรอง
// พื้นที่ที่ผู้ใช้ส่งมา ไม่เคย OR รวมกัน — เพื่อไม่ให้ผู้ใช้ขยายขอบเขตออกนอกพื้นที่ของตนเองผ่าน query param
import { prisma } from "./prisma";
import { type VillageScope } from "./scope";
import type { SmartSearchFilters } from "./schemas";
import { GOVERNMENT_FUND_PRINCIPAL } from "./analytics";

async function resolveFilteredVillageIds(
  scope: VillageScope,
  filters: Pick<SmartSearchFilters, "provinceId" | "districtId" | "subDistrictId" | "villageId">
): Promise<number[] | "all"> {
  const { provinceId, districtId, subDistrictId, villageId } = filters;
  const hasAreaFilter = provinceId || districtId || subDistrictId || villageId;

  if (!hasAreaFilter) return scope;

  const where = villageId
    ? { id: villageId }
    : subDistrictId
      ? { subDistrictId }
      : districtId
        ? { subDistrict: { districtId } }
        : { subDistrict: { district: { provinceId } } };

  const matched = await prisma.village.findMany({ where, select: { id: true } });
  const matchedIds = matched.map((v) => v.id);

  // ตัดกันกับ scope ของผู้ใช้เสมอ — ไม่ว่า client จะส่ง area filter อะไรมา ต้องอยู่ในขอบเขตของตนเองเท่านั้น
  if (scope === "all") return matchedIds;
  const scopeSet = new Set(scope);
  return matchedIds.filter((id) => scopeSet.has(id));
}

export type SmartSearchRow = {
  id: number;
  sequenceNo: number;
  headFirstName: string;
  headLastName: string;
  villageId: number;
  villageName: string;
  villageNo: string;
  subDistrictName: string;
  districtName: string;
  provinceName: string;
  incomeBeforeLoan: number | null;
  occupation: string | null;
  outstandingBalance: number;
  riskStatus: "NORMAL" | "WATCHLIST" | "HIGH_RISK";
};

export type SmartSearchResult = {
  rows: SmartSearchRow[];
  total: number;
  page: number;
  pageSize: number;
};

const RISK_RANK: Record<string, number> = { NORMAL: 0, WATCHLIST: 1, HIGH_RISK: 2 };

/** ค้นหาครัวเรือนเป้าหมายแบบหลายมิติ พร้อมจัดเรียงและแบ่งหน้า — ใช้โดย GET /api/search/households */
export async function searchHouseholds(scope: VillageScope, filters: SmartSearchFilters): Promise<SmartSearchResult> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  const villageIds = await resolveFilteredVillageIds(scope, filters);
  // พื้นที่ที่ขอมาไม่อยู่ในขอบเขตของผู้ใช้เลย (หรือผู้ใช้ไม่มีขอบเขตใดๆ) -> ไม่มีผลลัพธ์
  if (villageIds !== "all" && villageIds.length === 0) {
    return { rows: [], total: 0, page, pageSize };
  }

  const q = filters.q?.trim();
  // เล่มที่/โครงการที่/เลขที่ เป็นตัวเลข (Int) แล้ว — ค้นหาแบบ contains ไม่ได้ ต้องเทียบเท่ากันตรงๆ และ
  // ทำเฉพาะตอน q เป็นตัวเลขล้วนเท่านั้น (ไม่งั้น requestNo: undefined จะถูก Prisma ตัดทิ้งจนกลายเป็น
  // จับคู่ครัวเรือนที่มีคำร้องใดๆ ก็ได้แบบไม่ตั้งใจ)
  const qNumber = q && /^\d+$/.test(q) ? Number(q) : undefined;
  const where = {
    ...(villageIds !== "all" ? { villageId: { in: villageIds } } : {}),
    ...(filters.minIncome !== undefined || filters.maxIncome !== undefined
      ? { incomeBeforeLoan: { gte: filters.minIncome, lte: filters.maxIncome } }
      : {}),
    ...(filters.occupation
      ? { users: { some: { householdProfile: { occupation: { contains: filters.occupation } } } } }
      : {}),
    ...(filters.riskStatuses && filters.riskStatuses.length > 0
      ? { loans: { some: { isClosed: false, riskStatus: { in: filters.riskStatuses } } } }
      : {}),
    ...(q
      ? {
          OR: [
            { headFirstName: { contains: q } },
            { headLastName: { contains: q } },
            { village: { villageName: { contains: q } } },
            { loans: { some: { contractNo: { contains: q } } } },
            ...(qNumber !== undefined
              ? [
                  { loanRequests: { some: { requestNo: qNumber } } },
                  { proposals: { some: { proposalNo: qNumber } } },
                ]
              : []),
          ],
        }
      : {}),
  };

  const households = await prisma.targetHousehold.findMany({
    where,
    include: {
      village: {
        select: {
          villageNo: true,
          villageName: true,
          subDistrict: { select: { name: true, district: { select: { name: true, province: { select: { name: true } } } } } },
        },
      },
      loans: { where: { isClosed: false }, select: { outstandingBalance: true, riskStatus: true } },
      users: { select: { householdProfile: { select: { occupation: true } } } },
    },
  });

  const allRows: SmartSearchRow[] = households.map((h) => {
    const outstandingBalance = h.loans.reduce((sum, l) => sum + l.outstandingBalance, 0);
    const riskStatus = h.loans.reduce<"NORMAL" | "WATCHLIST" | "HIGH_RISK">(
      (worst, l) => (RISK_RANK[l.riskStatus] > RISK_RANK[worst] ? l.riskStatus : worst),
      "NORMAL"
    );
    const occupation = h.users.find((u) => u.householdProfile?.occupation)?.householdProfile?.occupation ?? null;

    return {
      id: h.id,
      sequenceNo: h.sequenceNo,
      headFirstName: h.headFirstName,
      headLastName: h.headLastName,
      villageId: h.villageId,
      villageName: h.village.villageName,
      villageNo: h.village.villageNo,
      subDistrictName: h.village.subDistrict.name,
      districtName: h.village.subDistrict.district.name,
      provinceName: h.village.subDistrict.district.province.name,
      incomeBeforeLoan: h.incomeBeforeLoan,
      occupation,
      outstandingBalance,
      riskStatus,
    };
  });

  const sortField = filters.sortField ?? "sequenceNo";
  const sortDir = filters.sortDir ?? "asc";
  const dir = sortDir === "desc" ? -1 : 1;
  allRows.sort((a, b) => {
    if (sortField === "riskStatus") return (RISK_RANK[a.riskStatus] - RISK_RANK[b.riskStatus]) * dir;
    if (sortField === "headFirstName") return a.headFirstName.localeCompare(b.headFirstName, "th") * dir;
    const av = (a[sortField] ?? 0) as number;
    const bv = (b[sortField] ?? 0) as number;
    return (av - bv) * dir;
  });

  const total = allRows.length;
  const start = (page - 1) * pageSize;
  const rows = allRows.slice(start, start + pageSize);

  return { rows, total, page, pageSize };
}

export type VillageMapSummary = {
  id: number;
  villageName: string;
  latitude: number;
  longitude: number;
  riskStatus: "NORMAL" | "WATCHLIST" | "HIGH_RISK";
  totalLoaned: number;
  bankBalance: number;
  overduePercent: number;
  requiredFund: number;
  currentFund: number;
  fundShortfall: number;
  fundAtRisk: boolean;
};

/**
 * สรุปข้อมูลรายหมู่บ้านสำหรับหมุดบนแผนที่ (แท็บ "มุมมองแผนที่") — เฉพาะหมู่บ้านที่ตั้งพิกัด (lat/lng) แล้ว
 * และอยู่ในขอบเขตของผู้ใช้เท่านั้น สีหมุด/สถานะคำนวณจาก riskStatus ที่แย่ที่สุดของเงินยืมที่ยังไม่ปิดสัญญา
 */
export async function getVillageMapSummaries(scope: VillageScope): Promise<VillageMapSummary[]> {
  const villages = await prisma.village.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      ...(scope === "all" ? {} : { id: { in: scope } }),
    },
    include: { bankAccounts: { include: { transactions: { orderBy: [{ transactionDate: "desc" }, { id: "desc" }], take: 1 } } } },
  });
  if (villages.length === 0) return [];

  const villageIds = villages.map((v) => v.id);
  const loans = await prisma.loan.findMany({
    where: { household: { villageId: { in: villageIds } } },
    include: { household: { select: { villageId: true } } },
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return villages.map((v) => {
    const vLoans = loans.filter((l) => l.household.villageId === v.id);
    const active = vLoans.filter((l) => !l.isClosed);
    const totalLoaned = vLoans.reduce((s, l) => s + l.amount, 0);
    const outstanding = active.reduce((s, l) => s + l.outstandingBalance, 0);
    const overdueAmount = active.filter((l) => l.dueDate && l.dueDate < today).reduce((s, l) => s + l.outstandingBalance, 0);
    const bankBalance = v.bankAccounts.reduce((s, a) => s + (a.transactions[0]?.balance ?? 0), 0);
    const riskStatus = active.reduce<"NORMAL" | "WATCHLIST" | "HIGH_RISK">(
      (worst, l) => (RISK_RANK[l.riskStatus] > RISK_RANK[worst] ? l.riskStatus : worst),
      "NORMAL"
    );
    // เงินทุนต้นทุนรัฐบาล (280,000 บาท เป็นค่าเริ่มต้น) ต้องมีครบเสมอ — ถ้าเงินฝากธนาคาร + ยอดเงินยืมคงเหลือ
    // กับครัวเรือน ต่ำกว่านี้ แปลว่ามีเงินทุนสูญหายไปจากระบบจริง (นอกเหนือจากที่อยู่ระหว่างให้ยืม) — ปักหมุดเตือนไว้
    const requiredFund = v.budgetAmount ?? GOVERNMENT_FUND_PRINCIPAL;
    const currentFund = outstanding + bankBalance;
    const fundShortfall = Math.max(0, requiredFund - currentFund);

    return {
      id: v.id,
      villageName: `หมู่ ${v.villageNo} บ้าน${v.villageName}`,
      latitude: v.latitude!,
      longitude: v.longitude!,
      riskStatus,
      totalLoaned,
      bankBalance,
      overduePercent: outstanding > 0 ? (overdueAmount / outstanding) * 100 : 0,
      requiredFund,
      currentFund,
      fundShortfall,
      fundAtRisk: fundShortfall > 0,
    };
  });
}

export type ScopedAreaOptions = {
  provinces: { id: number; name: string }[];
  districts: { id: number; name: string; provinceId: number }[];
  subDistricts: { id: number; name: string; districtId: number }[];
  villages: { id: number; villageNo: string; villageName: string; subDistrictId: number }[];
};

/** ตัวเลือกพื้นที่ (จังหวัด/อำเภอ/ตำบล/หมู่บ้าน) เฉพาะในขอบเขตของผู้ใช้ — สำหรับ dropdown แบบลดหลั่นในหน้าค้นหา */
export async function getScopedAreaOptions(scope: VillageScope): Promise<ScopedAreaOptions> {
  const villages = await prisma.village.findMany({
    where: scope === "all" ? {} : { id: { in: scope } },
    select: {
      id: true,
      villageNo: true,
      villageName: true,
      subDistrictId: true,
      subDistrict: {
        select: {
          id: true,
          name: true,
          districtId: true,
          district: { select: { id: true, name: true, provinceId: true, province: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  const provinceMap = new Map<number, { id: number; name: string }>();
  const districtMap = new Map<number, { id: number; name: string; provinceId: number }>();
  const subDistrictMap = new Map<number, { id: number; name: string; districtId: number }>();
  const villageList: ScopedAreaOptions["villages"] = [];

  for (const v of villages) {
    provinceMap.set(v.subDistrict.district.province.id, v.subDistrict.district.province);
    districtMap.set(v.subDistrict.district.id, {
      id: v.subDistrict.district.id,
      name: v.subDistrict.district.name,
      provinceId: v.subDistrict.district.provinceId,
    });
    subDistrictMap.set(v.subDistrict.id, { id: v.subDistrict.id, name: v.subDistrict.name, districtId: v.subDistrict.districtId });
    villageList.push({ id: v.id, villageNo: v.villageNo, villageName: v.villageName, subDistrictId: v.subDistrictId });
  }

  return {
    provinces: [...provinceMap.values()].sort((a, b) => a.name.localeCompare(b.name, "th")),
    districts: [...districtMap.values()].sort((a, b) => a.name.localeCompare(b.name, "th")),
    subDistricts: [...subDistrictMap.values()].sort((a, b) => a.name.localeCompare(b.name, "th")),
    villages: villageList.sort((a, b) => a.villageName.localeCompare(b.villageName, "th")),
  };
}
