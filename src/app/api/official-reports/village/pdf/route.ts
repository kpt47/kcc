import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canViewVillageDebtReport } from "@/lib/authz";
import { getVillageDebtReport } from "@/lib/analytics";
import { findChairmanName, findSubDistrictAdminName } from "@/lib/officials";
import { renderPdf } from "@/lib/pdf/render";
import { renderVillageDebtReportHtml } from "@/lib/pdf/templates/officialReports/villageDebtReportPdf";

export const maxDuration = 30; // ให้เวลา Chromium (@sparticuz/chromium บน Vercel) เพียงพอสำหรับ cold start

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (!canViewVillageDebtReport(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const url = new URL(request.url);
  const requestedVillageId = url.searchParams.get("villageId") ? Number(url.searchParams.get("villageId")) : undefined;
  const budgetYear = url.searchParams.get("budgetYear") ? Number(url.searchParams.get("budgetYear")) : undefined;

  const villageId = user.role === "VILLAGE_COMMITTEE" ? (user.scopeVillageId ?? undefined) : requestedVillageId;
  if (!villageId) return NextResponse.json({ error: { formErrors: ["กรุณาเลือกหมู่บ้าน"] } }, { status: 400 });

  const scope = await getAllowedVillageIds(user);
  if (scope !== "all" && !scope.includes(villageId)) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบหมู่บ้านที่ระบุ"] } }, { status: 404 });
  }

  const report = await getVillageDebtReport(villageId, budgetYear);
  if (!report) return NextResponse.json({ error: { formErrors: ["ไม่พบหมู่บ้านที่ระบุ"] } }, { status: 404 });

  const village = await prisma.village.findUnique({ where: { id: villageId }, select: { subDistrictId: true } });
  const [chairmanName, subDistrictAdminName] = await Promise.all([
    findChairmanName(villageId),
    findSubDistrictAdminName(village?.subDistrictId ?? null),
  ]);

  const pdf = await renderPdf(
    renderVillageDebtReportHtml(report.rows, report.summary, new Date(), { chairmanName, subDistrictAdminName }),
    { landscape: true }
  );
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="official-report-village-${villageId}.pdf"` },
  });
}
