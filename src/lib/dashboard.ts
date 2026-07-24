import type { ThemeKey } from "./theme";
import type { GlobalRole, CommitteeRole } from "@/generated/prisma/client";

export type Role = GlobalRole;

export const ROLES: { id: Role; label: string; description: string }[] = [
  { id: "HOUSEHOLD", label: "ครัวเรือน", description: "สมาชิกครัวเรือนเป้าหมาย" },
  { id: "VILLAGE_COMMITTEE", label: "กรรมการหมู่บ้าน", description: "คณะกรรมการ กข.คจ. หมู่บ้าน" },
  { id: "SUB_DISTRICT_ADMIN", label: "พัฒนากร", description: "เจ้าหน้าที่พัฒนาชุมชนประจำตำบล" },
  { id: "DISTRICT_ADMIN", label: "ผู้บริหารอำเภอ", description: "มองเห็นทุกหมู่บ้านในอำเภอที่รับผิดชอบ" },
  { id: "PROVINCIAL_ADMIN", label: "ผู้บริหารจังหวัด", description: "มองเห็นทุกหมู่บ้านในจังหวัดที่รับผิดชอบ" },
  {
    id: "GLOBAL_ADMIN",
    label: "ผู้บริหารส่วนกลาง",
    description: "กรมการพัฒนาชุมชน — มองเห็นทุกหมู่บ้านทั่วประเทศ",
  },
  {
    id: "IT_SUPPORT",
    label: "ผู้ดูแลระบบ (IT Support)",
    description: "จัดการบัญชีผู้ใช้งานและตรวจสอบ Audit Log เท่านั้น — ไม่มีสิทธิ์เข้าถึงข้อมูลสมุดทะเบียนโครงการ",
  },
];

export interface DashboardMenuItem {
  key: string;
  title: string;
  description: string;
  href: string;
  theme: ThemeKey;
  roles: Role[];
  // ถ้าระบุ: จำกัดเพิ่มเติมเฉพาะกรณี role === VILLAGE_COMMITTEE ให้เห็นเมนูนี้ได้เฉพาะตำแหน่งที่ระบุเท่านั้น
  // (role อื่นใน `roles` ที่ไม่ใช่ VILLAGE_COMMITTEE ไม่ถูกกระทบ) — ใช้กับเล่มเขียวที่สงวนไว้เฉพาะฝ่ายการเงิน
  villageCommitteeRoles?: CommitteeRole[];
}

const OVERSIGHT_ROLES: Role[] = [
  "VILLAGE_COMMITTEE",
  "SUB_DISTRICT_ADMIN",
  "DISTRICT_ADMIN",
  "PROVINCIAL_ADMIN",
  "GLOBAL_ADMIN",
];

// เล่มน้ำตาล (สถานะหมู่บ้าน): จำกัดเฉพาะพัฒนากรตำบล ผู้บริหารอำเภอ และผู้บริหารจังหวัดเท่านั้น
// ต่างจากเล่มอื่น — ไม่รวมกรรมการหมู่บ้านและส่วนกลาง (ต้องตรงกับ canViewVillageStatusBook ใน lib/authz.ts เป๊ะ)
const VILLAGE_STATUS_BOOK_ROLES: Role[] = ["SUB_DISTRICT_ADMIN", "DISTRICT_ADMIN", "PROVINCIAL_ADMIN"];

export const DASHBOARD_MENUS: DashboardMenuItem[] = [
  {
    key: "households",
    title: "ทะเบียนครัวเรือน",
    description: "บัญชีทะเบียนครัวเรือนเป้าหมาย รายได้ จปฐ. และการยื่นเสนอโครงการ/ขอยืมเงิน",
    href: "/households",
    theme: "purple",
    roles: OVERSIGHT_ROLES,
  },
  {
    key: "villages",
    title: "สถานะหมู่บ้าน",
    description: "ภาพรวมสถานะกองทุนแต่ละหมู่บ้าน จำนวนครัวเรือน และการส่งมอบ-รับมอบ",
    href: "/villages",
    theme: "brown",
    roles: VILLAGE_STATUS_BOOK_ROLES,
  },
  {
    key: "bank-accounts",
    title: "บัญชีคุมเงินฝาก",
    description: "บัญชีเงินฝากธนาคารของกองทุนหมู่บ้าน รายการฝาก-ถอน และยอดคงเหลือ",
    href: "/bank-accounts",
    theme: "green",
    roles: OVERSIGHT_ROLES,
    // ในระดับกรรมการหมู่บ้าน เห็นเมนูเล่มเขียวได้เฉพาะฝ่ายการเงิน (FINANCE_MEMBER) และประธาน (CHAIRMAN) เท่านั้น —
    // ประธานต้องเห็นเมนูนี้ด้วยเพื่อลงนามอนุมัติเปิดบัญชีใหม่ (Multi-signature) — เลขาฯ/กรรมการทั่วไปไม่เห็นเมนูนี้
    // (ระดับพัฒนากรขึ้นไปยังเห็นตามปกติ ไม่ถูกจำกัดด้วยเงื่อนไขนี้)
    villageCommitteeRoles: ["FINANCE_MEMBER", "CHAIRMAN"],
  },
  {
    key: "loans",
    title: "บัญชีคุมลูกหนี้",
    description: "ยอดเงินยืมคงเหลือของครัวเรือน และประวัติการคืนเงินแต่ละงวด",
    href: "/loans",
    theme: "yellow",
    roles: OVERSIGHT_ROLES,
  },
];

export function menusForRole(user: { role: Role; committeeRole?: CommitteeRole | null }): DashboardMenuItem[] {
  return DASHBOARD_MENUS.filter((menu) => {
    if (!menu.roles.includes(user.role)) return false;
    if (user.role === "VILLAGE_COMMITTEE" && menu.villageCommitteeRoles) {
      return user.committeeRole != null && menu.villageCommitteeRoles.includes(user.committeeRole);
    }
    return true;
  });
}
