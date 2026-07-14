import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canViewFundProblemReport } from "@/lib/authz";
import { getReport2Rows } from "@/lib/analytics";
import { renderPdf } from "@/lib/pdf/render";
import { renderFundProblemReportHtml } from "@/lib/pdf/templates/officialReports/fundProblemReportPdf";

export const maxDuration = 30; // ให้เวลา Chromium (@sparticuz/chromium บน Vercel) เพียงพอสำหรับ cold start

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (!canViewFundProblemReport(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const url = new URL(request.url);
  const budgetYear = url.searchParams.get("budgetYear") ? Number(url.searchParams.get("budgetYear")) : undefined;

  const scope = await getAllowedVillageIds(user);
  const rows = await getReport2Rows(scope, budgetYear);
  const pdf = await renderPdf(renderFundProblemReportHtml(rows, new Date()), { landscape: true });
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="official-report-fund-problems.pdf"` },
  });
}
