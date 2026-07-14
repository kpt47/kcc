// จัดการลำดับชั้นการสร้าง/ดูแลบัญชีผู้ใช้แบบ Top-Down Provisioning
// ผู้ดูแลระดับสูงกว่าสร้าง/แก้ไข/ระงับได้เฉพาะ role ที่ต่ำกว่าตนเอง "1 ระดับ" เท่านั้น (ไม่ใช่ทุก role
// ที่ต่ำกว่า) เพื่อบังคับให้การมอบหมายสิทธิ์ไหลจากบนลงล่างตามสายบังคับบัญชาจริง — แยกจาก scope.ts
// (ซึ่งจำกัดการมองเห็น "ข้อมูลของโครงการ" เช่น ครัวเรือน/เงินกู้) เพราะไฟล์นี้จำกัดการมองเห็น/จัดการ
// "บัญชีผู้ใช้งาน" ซึ่งมีเงื่อนไขคนละแบบ (ดูได้ทั้งพื้นที่ แต่จัดการได้แค่ role ถัดลงมา 1 ชั้น)
import type { GlobalRole, Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import type { CurrentUser } from "./auth";

/** role ถัดลงไป 1 ระดับที่ผู้ดูแลแต่ละระดับมีสิทธิ์สร้าง/จัดการ */
const NEXT_ROLE_DOWN: Partial<Record<GlobalRole, GlobalRole>> = {
  GLOBAL_ADMIN: "PROVINCIAL_ADMIN",
  PROVINCIAL_ADMIN: "DISTRICT_ADMIN",
  DISTRICT_ADMIN: "SUB_DISTRICT_ADMIN",
  SUB_DISTRICT_ADMIN: "VILLAGE_COMMITTEE",
  VILLAGE_COMMITTEE: "HOUSEHOLD",
};

/** ผู้ใช้ระดับ VILLAGE_COMMITTEE ต้องเป็นประธานหรือเลขานุการเท่านั้น จึงจะจัดการบัญชี HOUSEHOLD ได้ */
function isVillageCommitteeManager(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.role === "VILLAGE_COMMITTEE" && (user.committeeRole === "CHAIRMAN" || user.committeeRole === "SECRETARY");
}

/** ผู้ใช้คนนี้มีสิทธิ์เป็น "ผู้ดูแล" ที่จัดการบัญชีผู้ใช้คนอื่นได้หรือไม่ */
export function isUserManager(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.role !== "HOUSEHOLD" && (user.role !== "VILLAGE_COMMITTEE" || isVillageCommitteeManager(user));
}

/** role เป้าหมายที่ผู้ใช้คนนี้มีสิทธิ์ "สร้าง/แก้ไข/ระงับ" ได้ (มีได้ค่าเดียวเท่านั้นตามสายบังคับบัญชา) */
export function creatableRoleFor(user: Pick<CurrentUser, "role" | "committeeRole">): GlobalRole | null {
  if (user.role === "VILLAGE_COMMITTEE") {
    return isVillageCommitteeManager(user) ? "HOUSEHOLD" : null;
  }
  return NEXT_ROLE_DOWN[user.role] ?? null;
}

/**
 * บัญชี IT_SUPPORT (ผู้ดูแลระบบด้านเทคนิค) ไม่ใช่ส่วนหนึ่งของสายบังคับบัญชาภูมิศาสตร์ปกติ (ไม่มีใน NEXT_ROLE_DOWN)
 * จึงแยกสิทธิ์การสร้างออกมาต่างหาก — เฉพาะ GLOBAL_ADMIN (ส่วนกลาง) เท่านั้นที่สร้างบัญชีนี้ได้ ไม่ผูกกับ
 * creatableRoleFor/canManageTargetRole เดิม เพราะ IT_SUPPORT ไม่มีพื้นที่ (area) ให้เลือกเหมือน role อื่น
 */
export function canCreateItSupportAccount(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "GLOBAL_ADMIN";
}

/** ตรวจสอบว่าผู้ใช้คนนี้มีสิทธิ์จัดการ (สร้าง/แก้ไข/ระงับ) บัญชีที่มี role เป้าหมายนี้หรือไม่ */
export function canManageTargetRole(user: Pick<CurrentUser, "role" | "committeeRole">, targetRole: GlobalRole): boolean {
  return creatableRoleFor(user) === targetRole;
}

/**
 * ขอบเขตการ "มองเห็น" บัญชีผู้ใช้ (กว้างกว่าขอบเขตการจัดการ) — ตาม provinceId/districtId/subDistrictId/
 * villageId ของผู้ดูแล ครอบคลุมทุก role ที่อยู่ในพื้นที่นั้น ไม่ใช่แค่ role ที่จัดการได้โดยตรง
 * (เช่น พัฒนาการจังหวัดเห็นได้ทั้งพัฒนาการอำเภอ พัฒนากรตำบล และกรรมการหมู่บ้านในจังหวัดของตน
 * แต่สร้าง/แก้ไข/ระงับได้เฉพาะพัฒนาการอำเภอเท่านั้น)
 */
export function getManagedUserWhere(user: CurrentUser): Prisma.UserWhereInput {
  switch (user.role) {
    case "GLOBAL_ADMIN":
      return {};

    // IT_SUPPORT: เห็นรายชื่อบัญชีผู้ใช้งานทั้งหมดเพื่อสนับสนุนงานด้านเทคนิค (เช่น ตรวจสอบบัญชีที่ถูกระงับ)
    // แต่ creatableRoleFor คืนค่า null เสมอสำหรับ role นี้ (ไม่มีใน NEXT_ROLE_DOWN) จึง "จัดการ" (แก้ไข/ระงับ/
    // รีเซ็ตรหัสผ่าน) บัญชีใดไม่ได้เลย — เป็น view-only ตามเจตนา "เห็นแค่หน้าจัดการ User" ของผู้ใช้ระบบ
    case "IT_SUPPORT":
      return {};

    case "PROVINCIAL_ADMIN": {
      if (!user.scopeProvinceId) return { id: -1 };
      const provinceId = user.scopeProvinceId;
      return {
        OR: [
          { scopeProvinceId: provinceId },
          { scopeDistrict: { provinceId } },
          { scopeSubDistrict: { district: { provinceId } } },
          { scopeVillage: { subDistrict: { district: { provinceId } } } },
        ],
      };
    }

    case "DISTRICT_ADMIN": {
      if (!user.scopeDistrictId) return { id: -1 };
      const districtId = user.scopeDistrictId;
      return {
        OR: [
          { scopeDistrictId: districtId },
          { scopeSubDistrict: { districtId } },
          { scopeVillage: { subDistrict: { districtId } } },
        ],
      };
    }

    case "SUB_DISTRICT_ADMIN": {
      if (!user.scopeSubDistrictId) return { id: -1 };
      const subDistrictId = user.scopeSubDistrictId;
      return { OR: [{ scopeSubDistrictId: subDistrictId }, { scopeVillage: { subDistrictId } }] };
    }

    case "VILLAGE_COMMITTEE": {
      if (!isVillageCommitteeManager(user) || !user.scopeVillageId) return { id: -1 };
      return { scopeVillageId: user.scopeVillageId };
    }

    default:
      return { id: -1 };
  }
}

export type AreaOption = { id: number; label: string };
export type AreaField = "scopeProvinceId" | "scopeDistrictId" | "scopeSubDistrictId" | "scopeVillageId";

/** ตัวเลือกพื้นที่ย่อยที่ผู้ดูแลคนนี้เลือกได้ตอนสร้างบัญชีใหม่ (dropdown แบบ dynamic ตามสายบังคับบัญชา) */
export async function getCreatableAreaOptions(
  user: CurrentUser
): Promise<{ areaField: AreaField | null; options: AreaOption[] }> {
  switch (user.role) {
    case "GLOBAL_ADMIN": {
      const provinces = await prisma.province.findMany({ orderBy: { name: "asc" } });
      return { areaField: "scopeProvinceId", options: provinces.map((p) => ({ id: p.id, label: p.name })) };
    }
    case "PROVINCIAL_ADMIN": {
      if (!user.scopeProvinceId) return { areaField: "scopeDistrictId", options: [] };
      const districts = await prisma.district.findMany({
        where: { provinceId: user.scopeProvinceId },
        orderBy: { name: "asc" },
      });
      return { areaField: "scopeDistrictId", options: districts.map((d) => ({ id: d.id, label: d.name })) };
    }
    case "DISTRICT_ADMIN": {
      if (!user.scopeDistrictId) return { areaField: "scopeSubDistrictId", options: [] };
      const subDistricts = await prisma.subDistrict.findMany({
        where: { districtId: user.scopeDistrictId },
        orderBy: { name: "asc" },
      });
      return { areaField: "scopeSubDistrictId", options: subDistricts.map((s) => ({ id: s.id, label: s.name })) };
    }
    case "SUB_DISTRICT_ADMIN": {
      if (!user.scopeSubDistrictId) return { areaField: "scopeVillageId", options: [] };
      const villages = await prisma.village.findMany({
        where: { subDistrictId: user.scopeSubDistrictId },
        orderBy: { villageNo: "asc" },
      });
      return {
        areaField: "scopeVillageId",
        options: villages.map((v) => ({ id: v.id, label: `หมู่ ${v.villageNo} บ้าน${v.villageName}` })),
      };
    }
    case "VILLAGE_COMMITTEE":
      // สร้าง HOUSEHOLD ในหมู่บ้านของตนเองโดยตรง ไม่ต้องเลือกพื้นที่เพิ่ม
      return { areaField: null, options: [] };
    default:
      return { areaField: null, options: [] };
  }
}

/** ตรวจสอบว่าพื้นที่ที่เลือก (areaId) อยู่ภายใต้เขตอำนาจของผู้สร้างจริงหรือไม่ (ป้องกันการปลอมแปลง areaId ผ่าน request) */
export async function isAreaWithinJurisdiction(user: CurrentUser, areaId: number): Promise<boolean> {
  const { options } = await getCreatableAreaOptions(user);
  return options.some((o) => o.id === areaId);
}
