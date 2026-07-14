import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { districtMasterDataSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { ACCESS_DENIED_MESSAGE, canManageMasterData } from "@/lib/authz";

// Master Data (ชื่ออำเภอ) — GET เปิดให้ทุกคนที่ login แล้ว (read-only), POST เฉพาะ GLOBAL_ADMIN เท่านั้น
// รองรับ ?id= (รายการเดียว) และ ?provinceId= (กรองเฉพาะอำเภอในจังหวัดนั้น — ใช้โดย AddressCombobox แบบ cascading)
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const provinceId = searchParams.get("provinceId");

  const districts = await prisma.district.findMany({
    where: id ? { id: Number(id) } : provinceId ? { provinceId: Number(provinceId) } : undefined,
    orderBy: [{ province: { name: "asc" } }, { name: "asc" }],
    include: { province: { select: { id: true, name: true } }, _count: { select: { subDistricts: true } } },
  });
  return NextResponse.json(districts);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = districtMasterDataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const province = await prisma.province.findUnique({ where: { id: data.provinceId } });
  if (!province) {
    return NextResponse.json({ error: { fieldErrors: { provinceId: ["ไม่พบจังหวัดที่เลือก"] } } }, { status: 404 });
  }

  const existing = await prisma.district.findUnique({
    where: { provinceId_name: { provinceId: data.provinceId, name: data.name } },
  });
  if (existing) {
    return NextResponse.json({ error: { fieldErrors: { name: ["มีชื่ออำเภอนี้ในจังหวัดนี้อยู่แล้ว"] } } }, { status: 409 });
  }

  const district = await prisma.district.create({ data });
  return NextResponse.json(district, { status: 201 });
}
