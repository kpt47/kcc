import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { getVillageMapSummaries } from "@/lib/search";
import { canUseSmartSearch, SMART_SEARCH_DENIED_MESSAGE } from "@/lib/authz";

// สรุปข้อมูลรายหมู่บ้านสำหรับหมุดบนแผนที่ (Smart Report & Map Center) — จำกัดเฉพาะหมู่บ้านในขอบเขตของผู้ใช้
// และสงวนไว้สำหรับเจ้าหน้าที่/กรรมการหมู่บ้านเท่านั้น (ดู canUseSmartSearch)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canUseSmartSearch(user)) {
    return NextResponse.json({ error: { formErrors: [SMART_SEARCH_DENIED_MESSAGE] } }, { status: 403 });
  }

  const scope = await getAllowedVillageIds(user);
  const summaries = await getVillageMapSummaries(scope);
  return NextResponse.json(summaries);
}
