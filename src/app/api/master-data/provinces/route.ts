import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { provinceMasterDataSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { ACCESS_DENIED_MESSAGE, canManageMasterData } from "@/lib/authz";

// Master Data (ชื่อจังหวัด) — GET เปิดให้ทุกคนที่ login แล้ว (read-only), POST เฉพาะ GLOBAL_ADMIN เท่านั้น
// รองรับ ?id= สำหรับดึงรายการเดียว (ใช้โดย AddressCombobox ตอนต้องแสดงชื่อของค่าที่ถูกล็อกไว้)
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const provinces = await prisma.province.findMany({
    where: id ? { id: Number(id) } : undefined,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(provinces);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = provinceMasterDataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.province.findUnique({ where: { name: data.name } });
  if (existing) {
    return NextResponse.json({ error: { fieldErrors: { name: ["มีชื่อจังหวัดนี้ในระบบอยู่แล้ว"] } } }, { status: 409 });
  }

  // จังหวัดที่สร้างใหม่ผ่านช่องทางนี้ยังไม่ทราบภาค — จัดไว้ใต้ภาค "ไม่ระบุภาค" ชั่วคราวก่อน (เช่นเดียวกับ lib/geo.ts)
  const defaultRegion = await prisma.region.upsert({
    where: { name: "ไม่ระบุภาค" },
    create: { name: "ไม่ระบุภาค" },
    update: {},
  });

  const province = await prisma.province.create({ data: { name: data.name, regionId: defaultRegion.id } });
  return NextResponse.json(province, { status: 201 });
}
