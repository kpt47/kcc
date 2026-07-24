import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { getOverviewReportRegionRows } from "@/lib/analytics";
import type { AreaLevel } from "@/lib/analytics";

type ChoroplethLevel = Extract<AreaLevel, "province" | "district" | "subDistrict">;
const VALID_LEVELS: ChoroplethLevel[] = ["province", "district", "subDistrict"];

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const levelParam = searchParams.get("level");
  if (!levelParam || !VALID_LEVELS.includes(levelParam as ChoroplethLevel)) {
    return NextResponse.json({ error: { formErrors: ["ระบุ level ไม่ถูกต้อง"] } }, { status: 400 });
  }
  const level = levelParam as ChoroplethLevel;
  const parentCode = searchParams.get("parentCode") ?? undefined;
  const budgetYearParam = searchParams.get("budgetYear");
  const budgetYear = budgetYearParam ? Number(budgetYearParam) : undefined;

  const scope = await getAllowedVillageIds(user);
  const rows = await getOverviewReportRegionRows(scope, level, parentCode, budgetYear);
  return NextResponse.json({ rows });
}
