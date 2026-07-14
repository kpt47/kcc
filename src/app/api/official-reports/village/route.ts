import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canViewVillageDebtReport } from "@/lib/authz";
import { getVillageDebtReport } from "@/lib/analytics";

// แบบ 3.1 (แบบฟอร์ม 26(1) ระดับหมู่บ้าน) — เฉพาะประธาน/กรรมการหมู่บ้าน และพัฒนากรตำบลเท่านั้น
// (DISTRICT_ADMIN/PROVINCIAL_ADMIN/GLOBAL_ADMIN/HOUSEHOLD ต้อง 403 เสมอ ไม่มี override)
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canViewVillageDebtReport(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const url = new URL(request.url);
  const requestedVillageId = url.searchParams.get("villageId") ? Number(url.searchParams.get("villageId")) : undefined;
  const budgetYear = url.searchParams.get("budgetYear") ? Number(url.searchParams.get("budgetYear")) : undefined;
  const q = url.searchParams.get("q")?.trim();
  const sortField = url.searchParams.get("sortField") ?? "receivedDate";
  const sortDir = url.searchParams.get("sortDir") === "desc" ? -1 : 1;

  // ประธาน/กรรมการหมู่บ้าน: บังคับใช้หมู่บ้านของตนเองเสมอ (ไม่รับ villageId จาก client)
  // พัฒนากรตำบล: เลือกหมู่บ้านใดก็ได้ แต่ต้องอยู่ในตำบลของตนเองเท่านั้น
  let villageId: number | undefined;
  if (user.role === "VILLAGE_COMMITTEE") {
    villageId = user.scopeVillageId ?? undefined;
  } else {
    villageId = requestedVillageId;
  }
  if (!villageId) {
    return NextResponse.json({ error: { formErrors: ["กรุณาเลือกหมู่บ้าน"] } }, { status: 400 });
  }

  const scope = await getAllowedVillageIds(user);
  if (scope !== "all" && !scope.includes(villageId)) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบหมู่บ้านที่ระบุ"] } }, { status: 404 });
  }

  const report = await getVillageDebtReport(villageId, budgetYear);
  if (!report) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบหมู่บ้านที่ระบุ"] } }, { status: 404 });
  }

  let rows = report.rows;
  if (q) {
    rows = rows.filter((r) => `${r.headFirstName} ${r.headLastName}`.includes(q));
  }
  rows = [...rows].sort((a, b) => {
    const av = a[sortField as keyof typeof a];
    const bv = b[sortField as keyof typeof b];
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv, "th") * sortDir;
    return ((av as number) - (bv as number)) * sortDir;
  });

  const village = await prisma.village.findUnique({ where: { id: villageId }, select: { id: true, villageNo: true, villageName: true } });

  return NextResponse.json({ village, rows, summary: report.summary });
}
