import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ACCESS_DENIED_MESSAGE, canManageMasterData } from "@/lib/authz";

const updateSubDistrictSchema = z.object({ name: z.string().trim().min(1, "กรุณากรอกชื่อตำบล") });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const subDistrictId = Number(id);
  const subDistrict = await prisma.subDistrict.findUnique({ where: { id: subDistrictId } });
  if (!subDistrict) return NextResponse.json({ error: { formErrors: ["ไม่พบตำบลที่ระบุ"] } }, { status: 404 });

  const body = await request.json();
  const parsed = updateSubDistrictSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.subDistrict.update({ where: { id: subDistrictId }, data: parsed.data });
  return NextResponse.json(updated);
}

// ลบตำบล — ป้องกันไม่ให้ลบถ้ายังมีหมู่บ้านผูกอยู่ (ป้องกันข้อมูลกำพร้า)
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const subDistrictId = Number(id);
  const subDistrict = await prisma.subDistrict.findUnique({
    where: { id: subDistrictId },
    include: { _count: { select: { villages: true } } },
  });
  if (!subDistrict) return NextResponse.json({ error: { formErrors: ["ไม่พบตำบลที่ระบุ"] } }, { status: 404 });

  if (subDistrict._count.villages > 0) {
    return NextResponse.json(
      { error: { formErrors: [`ไม่สามารถลบได้ เนื่องจากยังมีหมู่บ้านผูกอยู่ ${subDistrict._count.villages} หมู่บ้าน`] } },
      { status: 409 }
    );
  }

  await prisma.subDistrict.delete({ where: { id: subDistrictId } });
  return NextResponse.json({ ok: true });
}
