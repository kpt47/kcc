import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, hasMinRole } from "@/lib/authz";
import { getAreaSummaryRows, type AreaDrillFilters } from "@/lib/analytics";

function numberParam(url: URL, key: string): number | undefined {
  const raw = url.searchParams.get(key);
  return raw ? Number(raw) : undefined;
}

// สรุปภาวะหนี้สินตามพื้นที่ที่เลือกด้วย dropdown ต่อเนื่อง (จังหวัด→อำเภอ→ตำบล→หมู่บ้าน) — ใช้กับการ์ดสรุปพื้นที่
// บนหน้า Dashboard (BigPictureView) เท่านั้น จำกัดสิทธิ์เหมือนเงื่อนไขที่แสดงการ์ดนี้บนหน้าเว็บ (DISTRICT_ADMIN ขึ้นไป)
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!hasMinRole(user, "DISTRICT_ADMIN")) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const url = new URL(request.url);
  const budgetYear = numberParam(url, "budgetYear");
  const q = url.searchParams.get("q")?.trim();
  const sortField = url.searchParams.get("sortField") ?? "areaName";
  const sortDir = url.searchParams.get("sortDir") === "desc" ? -1 : 1;

  const filters: AreaDrillFilters = {
    provinceId: numberParam(url, "provinceId"),
    districtId: numberParam(url, "districtId"),
    subDistrictId: numberParam(url, "subDistrictId"),
    villageId: numberParam(url, "villageId"),
  };

  const scope = await getAllowedVillageIds(user);
  const { level, rows: allRows } = await getAreaSummaryRows(scope, budgetYear, filters);
  let rows = allRows;

  if (q) rows = rows.filter((r) => r.areaName.includes(q));
  rows = [...rows].sort((a, b) => {
    const av = a[sortField as keyof typeof a];
    const bv = b[sortField as keyof typeof b];
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv, "th") * sortDir;
    return ((av as number) - (bv as number)) * sortDir;
  });

  return NextResponse.json({ level, rows });
}
