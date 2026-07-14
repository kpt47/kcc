import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ACCESS_DENIED_MESSAGE, canViewProvinceSummaryReport } from "@/lib/authz";
import { getProvinceSummaryRows } from "@/lib/analytics";
import { findProvinceAdminName } from "@/lib/officials";
import { renderPdf } from "@/lib/pdf/render";
import { renderProvinceSummaryReportHtml } from "@/lib/pdf/templates/officialReports/provinceSummaryReportPdf";

export const maxDuration = 30; // ให้เวลา Chromium (@sparticuz/chromium บน Vercel) เพียงพอสำหรับ cold start

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (!canViewProvinceSummaryReport(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const url = new URL(request.url);
  const requestedProvinceId = url.searchParams.get("provinceId") ? Number(url.searchParams.get("provinceId")) : undefined;
  const budgetYear = url.searchParams.get("budgetYear") ? Number(url.searchParams.get("budgetYear")) : undefined;

  const provinceId = user.role === "PROVINCIAL_ADMIN" ? (user.scopeProvinceId ?? undefined) : requestedProvinceId;
  if (!provinceId) return NextResponse.json({ error: { formErrors: ["กรุณาเลือกจังหวัด"] } }, { status: 400 });
  if (user.role === "PROVINCIAL_ADMIN" && provinceId !== user.scopeProvinceId) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบจังหวัดที่ระบุ"] } }, { status: 404 });
  }

  const province = await prisma.province.findUnique({ where: { id: provinceId }, select: { name: true } });
  if (!province) return NextResponse.json({ error: { formErrors: ["ไม่พบจังหวัดที่ระบุ"] } }, { status: 404 });

  const rows = await getProvinceSummaryRows(provinceId, budgetYear);
  const provinceAdminName = await findProvinceAdminName(provinceId);
  const pdf = await renderPdf(
    renderProvinceSummaryReportHtml(rows, province.name, new Date(), { provinceAdminName }),
    { landscape: true }
  );
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="official-report-province.pdf"` },
  });
}
