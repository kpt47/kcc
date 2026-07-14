import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { villageSchema } from "@/lib/schemas";
import { VILLAGE_ADDRESS_INCLUDE, upsertSubDistrictId } from "@/lib/geo";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, scopeWhereDirect } from "@/lib/scope";
import { canManageMasterData, VILLAGE_MASTER_DATA_DENIED_MESSAGE } from "@/lib/authz";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  const scope = await getAllowedVillageIds(user);

  const villages = await prisma.village.findMany({
    where: scopeWhereDirect(scope, "id"),
    orderBy: [
      { subDistrict: { district: { province: { name: "asc" } } } },
      { subDistrict: { district: { name: "asc" } } },
      { villageName: "asc" },
    ],
    include: VILLAGE_ADDRESS_INCLUDE,
  });
  return NextResponse.json(villages);
}

// เพิ่มหมู่บ้านใหม่ (พร้อม upsert ลำดับชั้นตำบล/อำเภอ/จังหวัด/ภาค) — เฉพาะ GLOBAL_ADMIN (ส่วนกลาง) เท่านั้น
// ห้ามผู้ใช้ระดับอื่น (รวมถึงประธาน/เลขานุการคณะกรรมการหมู่บ้าน) สร้างหมู่บ้านผ่าน endpoint นี้เด็ดขาด —
// การจัดการ Master Data ของพื้นที่ต้องผ่านหน้า /master-data โดยส่วนกลางเท่านั้น (ดู lib/authz.ts canManageMasterData)
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: { formErrors: [VILLAGE_MASTER_DATA_DENIED_MESSAGE] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = villageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { subDistrict, district, province, ...rest } = parsed.data;

  const village = await prisma.$transaction(async (tx) => {
    const subDistrictId = await upsertSubDistrictId(tx, { subDistrict, district, province });
    return tx.village.create({ data: { ...rest, subDistrictId } });
  });

  return NextResponse.json(village, { status: 201 });
}
