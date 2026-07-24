import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canEditHousehold } from "@/lib/authz";

// อัปเดตเฉพาะฟิลด์ที่แก้ไขได้หลังลงทะเบียนแล้ว — villageId/sequenceNo กำหนดตัวตนของ record จึงไม่เปิดให้แก้ที่นี่
const updateHouseholdSchema = z.object({
  titlePrefix: z.enum(["MR", "MRS", "MISS", "OTHER"]).optional(),
  titlePrefixOther: z.string().trim().optional(),
  headFirstName: z.string().trim().min(1).optional(),
  headLastName: z.string().trim().min(1).optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  birthDate: z.string().optional(),
  occupation: z.string().trim().optional(),
  specialSkills: z.string().trim().optional(),
  houseNo: z.string().optional(),
  memberCount: z.number().int().min(1).max(30).optional(),
  incomeBeforeLoan: z.number().min(0).max(10_000_000).optional(),
  isDefaulted: z.boolean().optional(),
  defaultedAmount: z.number().min(0).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  // บัญชีทะเบียนครัวเรือนเป้าหมาย (เล่มม่วง): แก้ไขรายได้ จปฐ./ลำดับเป้าหมายได้เฉพาะพัฒนากรตำบล (SUB_DISTRICT_ADMIN)
  // เท่านั้น แม้แต่อำเภอ/จังหวัด/ส่วนกลางก็แก้ไม่ได้ (ประธาน/เลขาฯ เพิ่มรายชื่อพื้นฐานได้ผ่าน POST เท่านั้น)
  if (!canEditHousehold(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const householdId = Number(id);

  const household = await prisma.targetHousehold.findUnique({ where: { id: householdId } });
  if (!household) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบครัวเรือนเป้าหมายที่ระบุ"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (scope !== "all" && !scope.includes(household.villageId)) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบครัวเรือนเป้าหมายที่ระบุ"] } }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateHouseholdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { birthDate, ...rest } = parsed.data;
  const updated = await prisma.targetHousehold.update({
    where: { id: householdId },
    data: { ...rest, birthDate: birthDate ? new Date(birthDate) : undefined },
  });
  return NextResponse.json(updated);
}
