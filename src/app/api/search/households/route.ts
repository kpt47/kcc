import { NextResponse } from "next/server";
import { smartSearchFiltersSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { searchHouseholds } from "@/lib/search";
import { canUseSmartSearch, SMART_SEARCH_DENIED_MESSAGE } from "@/lib/authz";

// Smart Report & Map Center: ค้นหาครัวเรือนเป้าหมายหลายมิติ (พื้นที่/ความเสี่ยง/รายได้/อาชีพ/ข้อความอิสระ)
// สงวนไว้สำหรับเจ้าหน้าที่/กรรมการหมู่บ้านเท่านั้น (ดู canUseSmartSearch) — เป็น read-only และยังคงถูกจำกัด
// พื้นที่ผ่าน getAllowedVillageIds เสมอ (ตัวกรองพื้นที่ที่ client ส่งมาถูก "ตัดกัน" กับ scope นี้ใน lib/search.ts
// ไม่เคยขยายออกนอกขอบเขต) — เดิมไม่มีการตรวจสอบ role เลย เป็นช่องโหว่ให้ครัวเรือนเห็นข้อมูลเพื่อนบ้านทั้งหมู่บ้านได้
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
    page: raw.page ? Number(raw.page) : undefined,
    pageSize: raw.pageSize ? Number(raw.pageSize) : undefined,
    sortField: raw.sortField,
    sortDir: raw.sortDir,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const scope = await getAllowedVillageIds(user);
  const result = await searchHouseholds(scope, parsed.data);
  return NextResponse.json(result);
}
