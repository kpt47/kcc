import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { getScopedAreaOptions } from "@/lib/search";
import { canUseSmartSearch, SMART_SEARCH_DENIED_MESSAGE } from "@/lib/authz";

// ตัวเลือกพื้นที่ (จังหวัด/อำเภอ/ตำบล/หมู่บ้าน) เฉพาะในขอบเขตของผู้ใช้ — สำหรับ dropdown แบบลดหลั่นในหน้าค้นหา
// เป็นส่วนหนึ่งของ Smart Report & Map Center จึงสงวนไว้สำหรับเจ้าหน้าที่/กรรมการหมู่บ้านเท่านั้นเช่นกัน
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canUseSmartSearch(user)) {
    return NextResponse.json({ error: { formErrors: [SMART_SEARCH_DENIED_MESSAGE] } }, { status: 403 });
  }

  const scope = await getAllowedVillageIds(user);
  const options = await getScopedAreaOptions(scope);
  return NextResponse.json(options);
}
