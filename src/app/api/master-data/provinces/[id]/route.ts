import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ACCESS_DENIED_MESSAGE, canManageMasterData } from "@/lib/authz";

const updateProvinceSchema = z.object({ name: z.string().trim().min(1, "กรุณากรอกชื่อจังหวัด") });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const provinceId = Number(id);
  const province = await prisma.province.findUnique({ where: { id: provinceId } });
  if (!province) return NextResponse.json({ error: { formErrors: ["ไม่พบจังหวัดที่ระบุ"] } }, { status: 404 });

  const body = await request.json();
  const parsed = updateProvinceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.province.update({ where: { id: provinceId }, data: parsed.data });
  return NextResponse.json(updated);
}

// ลบจังหวัด — ป้องกันไม่ให้ลบถ้ายังมีอำเภอผูกอยู่ (ป้องกันข้อมูลกำพร้า)
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const provinceId = Number(id);
  const province = await prisma.province.findUnique({
    where: { id: provinceId },
    include: { _count: { select: { districts: true } } },
  });
  if (!province) return NextResponse.json({ error: { formErrors: ["ไม่พบจังหวัดที่ระบุ"] } }, { status: 404 });

  if (province._count.districts > 0) {
    return NextResponse.json(
      { error: { formErrors: [`ไม่สามารถลบได้ เนื่องจากยังมีอำเภอผูกอยู่ ${province._count.districts} อำเภอ`] } },
      { status: 409 }
    );
  }

  await prisma.province.delete({ where: { id: provinceId } });
  return NextResponse.json({ ok: true });
}
