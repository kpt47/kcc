import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ACCESS_DENIED_MESSAGE, canManageVillageInProvince } from "@/lib/authz";

const updateVillageSchema = z.object({
  villageNo: z.string().trim().min(1, "กรุณากรอกหมู่ที่").optional(),
  villageName: z.string().trim().min(1, "กรุณากรอกชื่อหมู่บ้าน").optional(),
  budgetYear: z.number().int().min(2500).max(2700).optional(),
  budgetAmount: z.number().min(0).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (user.role !== "GLOBAL_ADMIN" && user.role !== "PROVINCIAL_ADMIN") {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const villageId = Number(id);
  const village = await prisma.village.findUnique({
    where: { id: villageId },
    include: { subDistrict: { select: { district: { select: { provinceId: true } } } } },
  });
  if (!village) return NextResponse.json({ error: { formErrors: ["ไม่พบหมู่บ้านที่ระบุ"] } }, { status: 404 });
  if (!canManageVillageInProvince(user, village.subDistrict.district.provinceId)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateVillageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.village.update({ where: { id: villageId }, data: parsed.data });
  return NextResponse.json(updated);
}

// ลบหมู่บ้าน — ป้องกันไม่ให้ลบถ้ายังมีครัวเรือนเป้าหมาย/ผู้ใช้งาน/บัญชีเงินฝากผูกอยู่ (ป้องกันข้อมูลกำพร้า)
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (user.role !== "GLOBAL_ADMIN" && user.role !== "PROVINCIAL_ADMIN") {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const villageId = Number(id);
  const village = await prisma.village.findUnique({
    where: { id: villageId },
    include: {
      subDistrict: { select: { district: { select: { provinceId: true } } } },
      _count: { select: { households: true, scopeUsers: true, bankAccounts: true } },
    },
  });
  if (!village) return NextResponse.json({ error: { formErrors: ["ไม่พบหมู่บ้านที่ระบุ"] } }, { status: 404 });
  if (!canManageVillageInProvince(user, village.subDistrict.district.provinceId)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { households, scopeUsers, bankAccounts } = village._count;
  if (households > 0 || scopeUsers > 0 || bankAccounts > 0) {
    return NextResponse.json(
      {
        error: {
          formErrors: [
            `ไม่สามารถลบได้ เนื่องจากยังมีข้อมูลผูกอยู่ (ครัวเรือน ${households} · ผู้ใช้งาน ${scopeUsers} · บัญชีเงินฝาก ${bankAccounts})`,
          ],
        },
      },
      { status: 409 }
    );
  }

  await prisma.village.delete({ where: { id: villageId } });
  return NextResponse.json({ ok: true });
}
