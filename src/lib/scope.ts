import { prisma } from "./prisma";
import type { CurrentUser } from "./auth";

/** "all" = มองเห็นทุกหมู่บ้าน (GLOBAL_ADMIN), array = จำกัดเฉพาะ villageId เหล่านี้ */
export type VillageScope = number[] | "all";

/** คำนวณรายชื่อ villageId ที่ผู้ใช้คนนี้มีสิทธิ์เข้าถึง ตามบทบาทและขอบเขตที่ผูกไว้ */
export async function getAllowedVillageIds(user: CurrentUser): Promise<VillageScope> {
  switch (user.role) {
    case "GLOBAL_ADMIN":
      return "all";

    case "PROVINCIAL_ADMIN": {
      if (!user.scopeProvinceId) return [];
      const villages = await prisma.village.findMany({
        where: { subDistrict: { district: { provinceId: user.scopeProvinceId } } },
        select: { id: true },
      });
      return villages.map((v) => v.id);
    }

    case "DISTRICT_ADMIN": {
      if (!user.scopeDistrictId) return [];
      const villages = await prisma.village.findMany({
        where: { subDistrict: { districtId: user.scopeDistrictId } },
        select: { id: true },
      });
      return villages.map((v) => v.id);
    }

    case "SUB_DISTRICT_ADMIN": {
      if (!user.scopeSubDistrictId) return [];
      const villages = await prisma.village.findMany({
        where: { subDistrictId: user.scopeSubDistrictId },
        select: { id: true },
      });
      return villages.map((v) => v.id);
    }

    case "VILLAGE_COMMITTEE":
    case "HOUSEHOLD":
      return user.scopeVillageId ? [user.scopeVillageId] : [];

    default:
      return [];
  }
}

/** เงื่อนไข where สำหรับ model ที่มี field villageId ตรงๆ (TargetHousehold, BankAccount) หรือ id ตรงๆ (Village) */
export function scopeWhereDirect(scope: VillageScope, field: "villageId" | "id" = "villageId") {
  if (scope === "all") return {};
  return { [field]: { in: scope } };
}

/** เงื่อนไข where สำหรับ model ที่เข้าถึงหมู่บ้านผ่าน household (ProjectProposal, LoanRequest, Loan) */
export function scopeWhereViaHousehold(scope: VillageScope) {
  if (scope === "all") return {};
  return { household: { villageId: { in: scope } } };
}

/**
 * เงื่อนไข where สำหรับ model ที่มีฟิลด์ householdId ตรงๆ (ProjectProposal, LoanRequest, Loan)
 * บังคับ data isolation ระดับครัวเรือน: หาก role === HOUSEHOLD ต้องเห็นเฉพาะข้อมูลของครัวเรือนตนเองเท่านั้น
 * (ไม่ใช่ทั้งหมู่บ้านแบบ scopeWhereViaHousehold) — ถ้ายังไม่ได้ผูกบัญชีกับครัวเรือนใด (householdId เป็น null)
 * ให้ใช้ -1 เป็นค่ากรอง เพื่อไม่ให้ query จับคู่กับข้อมูลใดเลย
 */
export function householdScopeWhere(user: CurrentUser, scope: VillageScope) {
  if (user.role === "HOUSEHOLD") {
    return { householdId: user.householdId ?? -1 };
  }
  return scopeWhereViaHousehold(scope);
}

/**
 * เงื่อนไข where สำหรับ model TargetHousehold เอง (field คือ id ไม่ใช่ householdId)
 * บังคับ data isolation ระดับครัวเรือนแบบเดียวกับ householdScopeWhere
 */
export function householdSelfScopeWhere(user: CurrentUser, scope: VillageScope) {
  if (user.role === "HOUSEHOLD") {
    return { id: user.householdId ?? -1 };
  }
  return scopeWhereDirect(scope, "villageId");
}

/**
 * ตรวจสอบสิทธิ์เข้าถึงระเบียนของครัวเรือนรายตัว (เช่นก่อนออก PDF หรือก่อนสร้างข้อมูลใหม่ให้ครัวเรือนหนึ่ง)
 * หาก role === HOUSEHOLD ต้องเป็นครัวเรือนของตนเองเท่านั้น (ห้ามอาศัย villageId ร่วมกันเด็ดขาด)
 * ส่วน role อื่นให้ตรวจสอบตามขอบเขตหมู่บ้าน (scope) ตามปกติ
 */
export function canAccessHouseholdRecord(
  user: CurrentUser,
  scope: VillageScope,
  household: { id: number; villageId: number }
): boolean {
  if (user.role === "HOUSEHOLD") {
    return user.householdId !== null && user.householdId === household.id;
  }
  return scope === "all" || scope.includes(household.villageId);
}
