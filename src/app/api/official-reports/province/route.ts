import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ACCESS_DENIED_MESSAGE, canViewProvinceSummaryReport } from "@/lib/authz";
import { getProvinceSummaryRows } from "@/lib/analytics";

// แบบ 3.3 (แบบฟอร์ม 26(2) สรุประดับจังหวัด) — เฉพาะจังหวัดและส่วนกลางเท่านั้น
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canViewProvinceSummaryReport(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const url = new URL(request.url);
  const requestedProvinceId = url.searchParams.get("provinceId") ? Number(url.searchParams.get("provinceId")) : undefined;
  const budgetYear = url.searchParams.get("budgetYear") ? Number(url.searchParams.get("budgetYear")) : undefined;
  const q = url.searchParams.get("q")?.trim();
  const sortField = url.searchParams.get("sortField") ?? "districtName";
  const sortDir = url.searchParams.get("sortDir") === "desc" ? -1 : 1;

  // พัฒนาการจังหวัด: บังคับใช้จังหวัดของตนเองเสมอ (ไม่รับ provinceId จาก client)
  // ส่วนกลาง (GLOBAL_ADMIN): เลือกจังหวัดใดก็ได้ (แบบฟอร์มนี้เป็นรายงานต่อจังหวัดเดียวตามระเบียบ)
  const provinceId = user.role === "PROVINCIAL_ADMIN" ? (user.scopeProvinceId ?? undefined) : requestedProvinceId;
  if (!provinceId) {
    return NextResponse.json({ error: { formErrors: ["กรุณาเลือกจังหวัด"] } }, { status: 400 });
  }
  if (user.role === "PROVINCIAL_ADMIN" && provinceId !== user.scopeProvinceId) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบจังหวัดที่ระบุ"] } }, { status: 404 });
  }

  const province = await prisma.province.findUnique({ where: { id: provinceId }, select: { id: true, name: true } });
  if (!province) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบจังหวัดที่ระบุ"] } }, { status: 404 });
  }

  let rows = await getProvinceSummaryRows(provinceId, budgetYear);
  if (q) rows = rows.filter((r) => r.districtName.includes(q));
  rows = [...rows].sort((a, b) => {
    const av = a[sortField as keyof typeof a];
    const bv = b[sortField as keyof typeof b];
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv, "th") * sortDir;
    return ((av as number) - (bv as number)) * sortDir;
  });

  return NextResponse.json({ province, rows });
}
