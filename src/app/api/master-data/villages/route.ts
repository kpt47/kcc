import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { villageMasterDataSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { ACCESS_DENIED_MESSAGE, canCreateVillage } from "@/lib/authz";

// Master Data (ชื่อหมู่บ้าน) — GET เปิดให้ทุกคนที่ login แล้ว (read-only), POST เฉพาะ GLOBAL_ADMIN เท่านั้น
// รองรับ ?id= (รายการเดียว) และ ?subDistrictId= (กรองเฉพาะหมู่บ้านในตำบลนั้น — ใช้โดย AddressCombobox แบบ cascading)
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const subDistrictId = searchParams.get("subDistrictId");

  const villages = await prisma.village.findMany({
    where: id ? { id: Number(id) } : subDistrictId ? { subDistrictId: Number(subDistrictId) } : undefined,
    orderBy: [{ subDistrict: { name: "asc" } }, { villageNo: "asc" }],
    include: {
      subDistrict: { select: { id: true, name: true, district: { select: { name: true, province: { select: { name: true } } } } } },
    },
  });
  return NextResponse.json(villages);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canCreateVillage(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = villageMasterDataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const subDistrict = await prisma.subDistrict.findUnique({
    where: { id: data.subDistrictId },
    include: { district: { select: { id: true, provinceId: true } } },
  });
  if (!subDistrict) {
    return NextResponse.json({ error: { fieldErrors: { subDistrictId: ["ไม่พบตำบลที่เลือก"] } } }, { status: 404 });
  }

  // ตรวจซ้ำฝั่งเซิร์ฟเวอร์ว่าตำบลที่ส่งมาอยู่ในเขตของผู้ใช้จริง (defense in depth) — ป้องกันคำขอปลอมที่ข้ามเขต
  // ของตนเอง แม้ฝั่งฟอร์มจะล็อกฟิลด์ไว้แล้วก็ตาม (GLOBAL_ADMIN ไม่ถูกจำกัดเขต เลือกได้อิสระทั่วประเทศ)
  const withinJurisdiction =
    user.role === "GLOBAL_ADMIN" ||
    (user.role === "PROVINCIAL_ADMIN" && subDistrict.district.provinceId === user.scopeProvinceId) ||
    (user.role === "DISTRICT_ADMIN" && subDistrict.district.id === user.scopeDistrictId) ||
    (user.role === "SUB_DISTRICT_ADMIN" && subDistrict.id === user.scopeSubDistrictId);
  if (!withinJurisdiction) {
    return NextResponse.json(
      { error: { fieldErrors: { subDistrictId: ["ตำบลที่เลือกอยู่นอกเขตพื้นที่รับผิดชอบของท่าน"] } } },
      { status: 403 }
    );
  }

  const existing = await prisma.village.findUnique({
    where: { villageNo_subDistrictId: { villageNo: data.villageNo, subDistrictId: data.subDistrictId } },
  });
  if (existing) {
    return NextResponse.json({ error: { fieldErrors: { villageNo: ["มีหมู่ที่นี้ในตำบลนี้อยู่แล้ว"] } } }, { status: 409 });
  }

  const village = await prisma.village.create({ data });
  return NextResponse.json(village, { status: 201 });
}
