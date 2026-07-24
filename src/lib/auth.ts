import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { DEFAULT_REMINDER_LEAD_DAYS } from "./reminderSettings";
import type { GlobalRole, CommitteeRole } from "@/generated/prisma/client";

export const SESSION_COOKIE = "kkc_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 วัน

export const ROLE_LABELS: Record<GlobalRole, string> = {
  HOUSEHOLD: "ครัวเรือน",
  VILLAGE_COMMITTEE: "กรรมการหมู่บ้าน",
  SUB_DISTRICT_ADMIN: "พัฒนากร",
  DISTRICT_ADMIN: "ผู้บริหารอำเภอ",
  PROVINCIAL_ADMIN: "ผู้บริหารจังหวัด",
  GLOBAL_ADMIN: "ผู้บริหารส่วนกลาง (กรมการพัฒนาชุมชน)",
  IT_SUPPORT: "ผู้ดูแลระบบ (IT Support)",
};

export const COMMITTEE_ROLE_LABELS: Record<CommitteeRole, string> = {
  CHAIRMAN: "ประธานคณะกรรมการ",
  SECRETARY: "เลขานุการ",
  FINANCE_MEMBER: "กรรมการเงินทุน",
  NORMAL_MEMBER: "กรรมการทั่วไป",
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: number) {
  const session = await prisma.session.create({
    data: { userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: session.expiresAt,
    path: "/",
  });
  return session;
}

export async function destroyCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { id: token } });
  }
  store.delete(SESSION_COOKIE);
}

export type CurrentUser = {
  id: number;
  username: string;
  displayName: string;
  role: GlobalRole;
  committeeRole: CommitteeRole | null;
  scopeVillageId: number | null;
  scopeSubDistrictId: number | null;
  scopeDistrictId: number | null;
  scopeProvinceId: number | null;
  householdId: number | null;
};

/**
 * ชื่อที่แสดง (displayName) ไม่ได้เก็บบน User โดยตรงอีกต่อไป (Profile Separation) — คำนวณจาก
 * ตาราง *Profile ที่ตรงกับ role ของผู้ใช้แต่ละคน โดยมี fallback เผื่อกรณียังไม่มี profile
 * (เช่น บัญชีเก่าก่อน migrate หรือครัวเรือนที่ยังไม่ได้กรอกข้อมูลเพิ่มเติม)
 */
export function computeDisplayName(user: {
  username: string;
  role: GlobalRole;
  committeeProfile: { firstName: string; lastName: string } | null;
  officialProfile: { firstName: string; lastName: string } | null;
  household: { headFirstName: string; headLastName: string } | null;
}): string {
  if (user.role === "HOUSEHOLD") {
    return user.household ? `${user.household.headFirstName} ${user.household.headLastName}` : user.username;
  }
  if (user.role === "VILLAGE_COMMITTEE") {
    return user.committeeProfile ? `${user.committeeProfile.firstName} ${user.committeeProfile.lastName}` : user.username;
  }
  return user.officialProfile ? `${user.officialProfile.firstName} ${user.officialProfile.lastName}` : user.username;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: token },
    include: {
      user: {
        include: {
          householdProfile: true,
          committeeProfile: true,
          officialProfile: true,
          household: { select: { headFirstName: true, headLastName: true } },
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;

  const { user } = session;
  // บัญชีที่ถูกระงับ (isActive = false) ระหว่างมี session ค้างอยู่ ต้องถูกตัดสิทธิ์ทันทีในคำขอถัดไป
  if (!user.isActive) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  return {
    id: user.id,
    username: user.username,
    displayName: computeDisplayName(user),
    role: user.role,
    committeeRole: user.committeeRole,
    scopeVillageId: user.scopeVillageId,
    scopeSubDistrictId: user.scopeSubDistrictId,
    scopeDistrictId: user.scopeDistrictId,
    scopeProvinceId: user.scopeProvinceId,
    householdId: user.householdId,
  };
}

/**
 * รวมข้อมูล "โปรไฟล์ครัวเรือน" แบบเดียวจากสองแหล่ง: ชื่อ/บ้านเลขที่/จำนวนสมาชิก/รายได้/ลำดับที่
 * มาจาก TargetHousehold + HouseholdIncomeRecord (ข้อมูลทะเบียนที่ลงไว้ก่อนมีบัญชีผู้ใช้งานเสมอ)
 * ส่วนอายุ/อาชีพ/ผู้ให้ความยินยอม มาจาก HouseholdProfile (สร้างเมื่อเปิดบัญชีให้ครัวเรือน)
 * ใช้ที่หน้า /profile, API ค้นหาครัวเรือน และเอกสาร PDF เพื่อไม่ให้ต้อง join เองซ้ำๆ ในหลายที่
 */
export async function getHouseholdProfileView(user: Pick<CurrentUser, "householdId">) {
  if (!user.householdId) return null;

  const household = await prisma.targetHousehold.findUnique({
    where: { id: user.householdId },
    include: { incomeRecords: true, village: { select: { villageNo: true } } },
  });
  if (!household) return null;

  const profile = await prisma.householdProfile.findFirst({ where: { user: { householdId: user.householdId } } });

  const incomeAfter = (years: number) => household.incomeRecords.find((r) => r.yearsAfterLoan === years)?.income ?? null;

  return {
    firstName: household.headFirstName,
    lastName: household.headLastName,
    houseNumber: household.houseNo,
    moo: household.village.villageNo,
    targetRank: household.sequenceNo,
    familyMemberCount: household.memberCount,
    incomeBefore: household.incomeBeforeLoan,
    incomeAfter1Yr: incomeAfter(1),
    incomeAfter2Yr: incomeAfter(2),
    incomeAfter3Yr: incomeAfter(3),
    age: profile?.age ?? null,
    occupation: profile?.occupation ?? null,
    reminderLeadDays: profile?.reminderLeadDays ?? DEFAULT_REMINDER_LEAD_DAYS,
    consentPersonName: profile?.consentPersonName ?? null,
    consentRelation: profile?.consentRelation ?? null,
  };
}

/** ใช้ในหน้าที่ต้องล็อกอินก่อนเข้าถึง — เด้งไป /login ถ้ายังไม่ได้เข้าสู่ระบบ */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
