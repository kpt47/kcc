import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/auth";
import {
  canViewBankLedger,
  canViewVillageStatusBook,
  canViewAuditLog,
  canCreateVillage,
  canUseSmartSearch,
  isItSupportBlockedFromProgramData,
  hasMinRole,
} from "@/lib/authz";
import type { GlobalRole, CommitteeRole } from "@/generated/prisma/client";

// Route Guard ระดับ Proxy (เดิมเรียก Middleware — เปลี่ยนชื่อไฟล์/สัญญาณเป็น proxy.ts ใน Next.js 16)
// ทำงานที่ Node.js runtime เสมอ (ไม่มีทางเลือก Edge ใน Next.js เวอร์ชันนี้) จึงเรียก Prisma ตรวจสอบ session
// ได้จริง — ใช้ predicate ชุดเดียวกับ lib/authz.ts ที่หน้าเพจแต่ละหน้าใช้ตรวจสอบอยู่แล้ว (ไม่สร้างตรรกะสิทธิ์
// ซ้ำซ้อนขึ้นมาใหม่) เพื่อให้การตรวจสอบสิทธิ์ "ตรงกันเป๊ะ" ทั้งที่ proxy และที่หน้าเพจเสมอ
//
// หมายเหตุด้านประสิทธิภาพ: เอกสาร Next.js แนะนำให้ proxy ตรวจสอบแบบ "optimistic" (เช็คแค่มี cookie หรือไม่)
// และเก็บการตรวจสอบฐานข้อมูลจริงไว้ที่ Server Component/Route Handler เพื่อความเร็ว — แต่ระบบนี้เป็นแอปภายใน
// หน่วยงานขนาดเล็ก (ไม่ใช่ระบบสาธารณะขนาดใหญ่) และทุกหน้าเพจเรียก getCurrentUser() ซึ่ง query ฐานข้อมูล
// อยู่แล้วเป็นปกติ การเพิ่ม query เดียวกันที่ proxy จึงไม่กระทบประสิทธิภาพอย่างมีนัยสำคัญ เทียบกับประโยชน์ที่ได้
// (Redirect + Toast ทันทีก่อนหน้าเพจ render แทนที่จะเห็นข้อความ "ไม่มีสิทธิ์เข้าถึง" ผุดขึ้นมาแทน)
type GuardUser = { role: GlobalRole; committeeRole: CommitteeRole | null };

// จัดเรียงจากเฉพาะเจาะจง -> กว้าง (ต้องเช็ค "/reports/smart" ก่อน "/reports" เสมอ เพราะ .find() ใช้ตัวแรกที่ตรง)
const PROTECTED_PATHS: { prefix: string; allowed: (user: GuardUser) => boolean }[] = [
  { prefix: "/bank-accounts", allowed: canViewBankLedger },
  { prefix: "/villages", allowed: canViewVillageStatusBook },
  // เข้าหน้าได้ตั้งแต่พัฒนากรตำบลขึ้นไป (ขึ้นทะเบียนหมู่บ้านใหม่ได้ในเขตตน) — การจัดการจังหวัด/อำเภอ/ตำบล
  // (ข้อมูลเขตการปกครอง) ยังคงจำกัดเฉพาะ GLOBAL_ADMIN ที่ตัวหน้าเพจเองผ่าน canManageMasterData
  { prefix: "/master-data", allowed: canCreateVillage },
  { prefix: "/admin/audit-logs", allowed: canViewAuditLog },
  { prefix: "/reports/smart", allowed: canUseSmartSearch },
  { prefix: "/reports", allowed: (user) => hasMinRole(user, "DISTRICT_ADMIN") },
  { prefix: "/official-reports", allowed: (user) => user.role !== "HOUSEHOLD" && user.role !== "IT_SUPPORT" },
  { prefix: "/households", allowed: (user) => !isItSupportBlockedFromProgramData(user) },
  { prefix: "/loans", allowed: (user) => !isItSupportBlockedFromProgramData(user) },
  {
    prefix: "/users",
    allowed: (user) =>
      user.role !== "HOUSEHOLD" &&
      (user.role !== "VILLAGE_COMMITTEE" || user.committeeRole === "CHAIRMAN" || user.committeeRole === "SECRETARY"),
  },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = PROTECTED_PATHS.find((p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`));
  if (!match) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await prisma.session.findUnique({ where: { id: token }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const user: GuardUser = { role: session.user.role, committeeRole: session.user.committeeRole };
  if (!match.allowed(user)) {
    const deniedUrl = new URL("/dashboard", request.url);
    deniedUrl.searchParams.set("denied", "1");
    return NextResponse.redirect(deniedUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/bank-accounts/:path*",
    "/villages/:path*",
    "/master-data/:path*",
    "/admin/audit-logs/:path*",
    "/reports/:path*",
    "/official-reports/:path*",
    "/households/:path*",
    "/loans/:path*",
    "/users/:path*",
  ],
};
