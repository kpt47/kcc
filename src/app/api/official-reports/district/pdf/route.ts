import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canViewDistrictSummaryReport } from "@/lib/authz";
import { getReport1Rows } from "@/lib/analytics";
import { findDistrictAdminName } from "@/lib/officials";
import { renderPdf } from "@/lib/pdf/render";
import { renderDistrictSummaryReportHtml } from "@/lib/pdf/templates/officialReports/districtSummaryReportPdf";

export const maxDuration = 30; // ให้เวลา Chromium (@sparticuz/chromium บน Vercel) เพียงพอสำหรับ cold start

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (!canViewDistrictSummaryReport(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const url = new URL(request.url);
  const budgetYear = url.searchParams.get("budgetYear") ? Number(url.searchParams.get("budgetYear")) : undefined;

  const scope = await getAllowedVillageIds(user);
  const rows = await getReport1Rows(scope, budgetYear);
  const district = user.scopeDistrictId
    ? await prisma.district.findUnique({ where: { id: user.scopeDistrictId }, select: { name: true } })
    : null;

  const districtAdminName = await findDistrictAdminName(user.scopeDistrictId ?? null);

  const pdf = await renderPdf(
    renderDistrictSummaryReportHtml(rows, district?.name ?? "-", new Date(), { districtAdminName }),
    { landscape: true }
  );
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="official-report-district.pdf"` },
  });
}
