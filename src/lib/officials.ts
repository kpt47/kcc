import { prisma } from "./prisma";
import { TITLE_PREFIX_OPTIONS } from "./schemas";

// ค้นหาชื่อ-นามสกุลของผู้ดำรงตำแหน่งปัจจุบันในพื้นที่หนึ่งๆ สำหรับใช้พิมพ์อัตโนมัติใต้ช่องลายเซ็นในเอกสาร PDF
// หลักการสำคัญ: กรองด้วย ID ของพื้นที่ที่ระบุมาเท่านั้น (villageId/subDistrictId/districtId/provinceId ของ
// เอกสารฉบับนั้นโดยตรง) ไม่ใช่ scope ของผู้ใช้ที่ขอเอกสาร — เพื่อไม่ให้ดึงชื่อข้ามเขตพื้นที่มาแสดงเด็ดขาด
// คืนค่า null เมื่อไม่พบผู้ดำรงตำแหน่ง (ตำแหน่งว่าง) ให้ผู้เรียกใช้ fallback เป็นเส้นประว่างหรือข้อมูลเดิมเอง

export type NameParts = { titlePrefix: string | null; titlePrefixOther: string | null; firstName: string; lastName: string };

// รูปแบบชื่อสำหรับพิมพ์ในเอกสารราชการ: คำนำหน้า + ชื่อ + เว้น 2 ตัวอักษร + นามสกุล (ไม่ใช่เว้นวรรคเดียวแบบทั่วไป)
// export ไว้ให้หน้าฟอร์มบนเว็บ (เช่น proposals/page.tsx) เรียกใช้ตอนเติมชื่อผู้ใช้ปัจจุบันอัตโนมัติได้ด้วย
export function formatOfficialName(p: NameParts): string {
  const prefixLabel = p.titlePrefix === "OTHER" ? p.titlePrefixOther ?? "" : TITLE_PREFIX_OPTIONS.find((o) => o.value === p.titlePrefix)?.label ?? "";
  return `${prefixLabel}${p.firstName}  ${p.lastName}`;
}

/** ประธานคณะกรรมการ กข.คจ. หมู่บ้าน (CHAIRMAN) ประจำหมู่บ้านที่ระบุ */
export async function findChairmanName(villageId: number | null): Promise<string | null> {
  if (!villageId) return null;
  const user = await prisma.user.findFirst({
    where: { isActive: true, role: "VILLAGE_COMMITTEE", committeeRole: "CHAIRMAN", scopeVillageId: villageId },
    include: { committeeProfile: true },
  });
  return user?.committeeProfile ? formatOfficialName(user.committeeProfile) : null;
}

/**
 * ประธาน + กรรมการผู้รับผิดชอบการเงิน (FINANCE_MEMBER ก่อน ถ้าไม่มีให้ใช้ SECRETARY แทน) ของหมู่บ้านที่ระบุ
 * รวมเบอร์โทรศัพท์ของแต่ละตำแหน่งด้วย — ใช้กับปุ่ม Click-to-Call ในหน้า Dashboard ของครัวเรือน (ดู HouseholdDashboard.tsx)
 */
export async function findVillageOfficials(villageId: number | null): Promise<{
  chairmanName: string | null;
  chairmanPhone: string | null;
  financeOrSecretaryName: string | null;
  financeOrSecretaryPhone: string | null;
}> {
  if (!villageId) return { chairmanName: null, chairmanPhone: null, financeOrSecretaryName: null, financeOrSecretaryPhone: null };
  const [chairmanUser, financeUser, secretaryUser] = await Promise.all([
    prisma.user.findFirst({
      where: { isActive: true, role: "VILLAGE_COMMITTEE", committeeRole: "CHAIRMAN", scopeVillageId: villageId },
      include: { committeeProfile: true },
    }),
    prisma.user.findFirst({
      where: { isActive: true, role: "VILLAGE_COMMITTEE", committeeRole: "FINANCE_MEMBER", scopeVillageId: villageId },
      include: { committeeProfile: true },
    }),
    prisma.user.findFirst({
      where: { isActive: true, role: "VILLAGE_COMMITTEE", committeeRole: "SECRETARY", scopeVillageId: villageId },
      include: { committeeProfile: true },
    }),
  ]);
  const financeOrSecretary = financeUser ?? secretaryUser;
  return {
    chairmanName: chairmanUser?.committeeProfile ? formatOfficialName(chairmanUser.committeeProfile) : null,
    chairmanPhone: chairmanUser?.phoneNumber ?? null,
    financeOrSecretaryName: financeOrSecretary?.committeeProfile ? formatOfficialName(financeOrSecretary.committeeProfile) : null,
    financeOrSecretaryPhone: financeOrSecretary?.phoneNumber ?? null,
  };
}

/** พัฒนากรผู้รับผิดชอบประจำตำบล (SUB_DISTRICT_ADMIN) ประจำตำบลที่ระบุ */
export async function findSubDistrictAdminName(subDistrictId: number | null): Promise<string | null> {
  if (!subDistrictId) return null;
  const user = await prisma.user.findFirst({
    where: { isActive: true, role: "SUB_DISTRICT_ADMIN", scopeSubDistrictId: subDistrictId },
    include: { officialProfile: true },
  });
  return user?.officialProfile ? formatOfficialName(user.officialProfile) : null;
}

/** พัฒนาการอำเภอ (DISTRICT_ADMIN) ประจำอำเภอที่ระบุ */
export async function findDistrictAdminName(districtId: number | null): Promise<string | null> {
  if (!districtId) return null;
  const user = await prisma.user.findFirst({
    where: { isActive: true, role: "DISTRICT_ADMIN", scopeDistrictId: districtId },
    include: { officialProfile: true },
  });
  return user?.officialProfile ? formatOfficialName(user.officialProfile) : null;
}

/** พัฒนาการจังหวัด (PROVINCIAL_ADMIN) ประจำจังหวัดที่ระบุ */
export async function findProvinceAdminName(provinceId: number | null): Promise<string | null> {
  if (!provinceId) return null;
  const user = await prisma.user.findFirst({
    where: { isActive: true, role: "PROVINCIAL_ADMIN", scopeProvinceId: provinceId },
    include: { officialProfile: true },
  });
  return user?.officialProfile ? formatOfficialName(user.officialProfile) : null;
}
