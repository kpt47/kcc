import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDistrictMasterDataSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { ACCESS_DENIED_MESSAGE, canManageMasterData } from "@/lib/authz";

// Master Data (ชื่อตำบล) — GET เปิดให้ทุกคนที่ login แล้ว (read-only), POST เฉพาะ GLOBAL_ADMIN เท่านั้น
// รองรับ ?id= (รายการเดียว) และ ?districtId= (กรองเฉพาะตำบลในอำเภอนั้น — ใช้โดย AddressCombobox แบบ cascading)
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const districtId = searchParams.get("districtId");

  const subDistricts = await prisma.subDistrict.findMany({
    where: id ? { id: Number(id) } : districtId ? { districtId: Number(districtId) } : undefined,
    orderBy: [{ district: { name: "asc" } }, { name: "asc" }],
    include: {
      district: { select: { id: true, name: true, province: { select: { name: true } } } },
      _count: { select: { villages: true } },
    },
  });
  return NextResponse.json(subDistricts);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = subDistrictMasterDataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const district = await prisma.district.findUnique({ where: { id: data.districtId } });
  if (!district) {
    return NextResponse.json({ error: { fieldErrors: { districtId: ["ไม่พบอำเภอที่เลือก"] } } }, { status: 404 });
  }

  const existing = await prisma.subDistrict.findUnique({
    where: { districtId_name: { districtId: data.districtId, name: data.name } },
  });
  if (existing) {
    return NextResponse.json({ error: { fieldErrors: { name: ["มีชื่อตำบลนี้ในอำเภอนี้อยู่แล้ว"] } } }, { status: 409 });
  }

  const subDistrict = await prisma.subDistrict.create({ data });
  return NextResponse.json(subDistrict, { status: 201 });
}
