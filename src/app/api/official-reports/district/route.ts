import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canViewDistrictSummaryReport } from "@/lib/authz";
import { getReport1Rows } from "@/lib/analytics";

// แบบ 3.2 (แบบฟอร์ม 26(1) สรุประดับอำเภอ) — เฉพาะ DISTRICT_ADMIN เท่านั้น (ไม่รวมจังหวัด/ส่วนกลาง/หมู่บ้าน)
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canViewDistrictSummaryReport(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const url = new URL(request.url);
  const budgetYear = url.searchParams.get("budgetYear") ? Number(url.searchParams.get("budgetYear")) : undefined;
  const q = url.searchParams.get("q")?.trim();
  const sortField = url.searchParams.get("sortField") ?? "villageName";
  const sortDir = url.searchParams.get("sortDir") === "desc" ? -1 : 1;

  const scope = await getAllowedVillageIds(user);
  let rows = await getReport1Rows(scope, budgetYear);

  if (q) rows = rows.filter((r) => r.villageName.includes(q));
  rows = [...rows].sort((a, b) => {
    const av = a[sortField as keyof typeof a];
    const bv = b[sortField as keyof typeof b];
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv, "th") * sortDir;
    return ((av as number) - (bv as number)) * sortDir;
  });

  return NextResponse.json({ rows });
}
