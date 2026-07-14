import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ACCESS_DENIED_MESSAGE, canManageMasterData } from "@/lib/authz";

const updateDistrictSchema = z.object({ name: z.string().trim().min(1, "กรุณากรอกชื่ออำเภอ") });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const districtId = Number(id);
  const district = await prisma.district.findUnique({ where: { id: districtId } });
  if (!district) return NextResponse.json({ error: { formErrors: ["ไม่พบอำเภอที่ระบุ"] } }, { status: 404 });

  const body = await request.json();
  const parsed = updateDistrictSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.district.update({ where: { id: districtId }, data: parsed.data });
  return NextResponse.json(updated);
}

// ลบอำเภอ — ป้องกันไม่ให้ลบถ้ายังมีตำบลผูกอยู่ (ป้องกันข้อมูลกำพร้า)
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const districtId = Number(id);
  const district = await prisma.district.findUnique({
    where: { id: districtId },
    include: { _count: { select: { subDistricts: true } } },
  });
  if (!district) return NextResponse.json({ error: { formErrors: ["ไม่พบอำเภอที่ระบุ"] } }, { status: 404 });

  if (district._count.subDistricts > 0) {
    return NextResponse.json(
      { error: { formErrors: [`ไม่สามารถลบได้ เนื่องจากยังมีตำบลผูกอยู่ ${district._count.subDistricts} ตำบล`] } },
      { status: 409 }
    );
  }

  await prisma.district.delete({ where: { id: districtId } });
  return NextResponse.json({ ok: true });
}
