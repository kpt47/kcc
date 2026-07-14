import { NextResponse } from "next/server";
import { smartSearchFiltersSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { searchHouseholds } from "@/lib/search";
import { getVillageConditionRows } from "@/lib/analytics";
import { renderPdf } from "@/lib/pdf/render";
import { renderDebtConditionReportHtml } from "@/lib/pdf/templates/debtConditionReportPdf";
import { canUseSmartSearch, SMART_SEARCH_DENIED_MESSAGE } from "@/lib/authz";

// แบบรายงานภาวะหนี้สินและฐานะทางการเงิน (PDF ทางการ) — ครอบคลุมเฉพาะหมู่บ้านที่มีครัวเรือนตรงกับ
// เงื่อนไขค้นหา/ตัวกรองปัจจุบันของผู้ใช้ (ไม่แบ่งหน้า) และยังคงถูกจำกัดพื้นที่ผ่าน getAllowedVillageIds เสมอ
// สงวนไว้สำหรับเจ้าหน้าที่/กรรมการหมู่บ้านเท่านั้น (ดู canUseSmartSearch)
export const maxDuration = 30; // ให้เวลา Chromium (@sparticuz/chromium บน Vercel) เพียงพอสำหรับ cold start

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canUseSmartSearch(user)) {
    return NextResponse.json({ error: { formErrors: [SMART_SEARCH_DENIED_MESSAGE] } }, { status: 403 });
  }

  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = smartSearchFiltersSchema.safeParse({
    q: raw.q,
    provinceId: raw.provinceId ? Number(raw.provinceId) : undefined,
    districtId: raw.districtId ? Number(raw.districtId) : undefined,
    subDistrictId: raw.subDistrictId ? Number(raw.subDistrictId) : undefined,
    villageId: raw.villageId ? Number(raw.villageId) : undefined,
    riskStatuses: raw.riskStatuses ? raw.riskStatuses.split(",") : undefined,
    minIncome: raw.minIncome ? Number(raw.minIncome) : undefined,
    maxIncome: raw.maxIncome ? Number(raw.maxIncome) : undefined,
    occupation: raw.occupation,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const scope = await getAllowedVillageIds(user);
  const { rows } = await searchHouseholds(scope, { ...parsed.data, page: 1, pageSize: 100_000 });
  const villageIds = [...new Set(rows.map((r) => r.villageId))];

  const conditionRows = await getVillageConditionRows(villageIds);
  const pdf = await renderPdf(renderDebtConditionReportHtml(conditionRows, new Date()), { landscape: true });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="debt-condition-report.pdf"`,
    },
  });
}
