import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loanRequestSelfEditSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { canAccessHouseholdRecord, getAllowedVillageIds } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canManageProposalOrLoanRequestRecord } from "@/lib/authz";

// แบบฟอร์ม 2 (แบบขอยืมเงินทุน): ครัวเรือนแก้ไขคำร้องของตนเองได้ เฉพาะก่อนที่พัฒนากรจะให้ความเห็น (workerOpinion
// ยังเป็นค่าว่าง) — ส่วนพัฒนาการอำเภอ พัฒนากรตำบล และประธานคณะกรรมการหมู่บ้าน แก้ไขได้ทุกเมื่อไม่มีเงื่อนไขล็อก
// (ดู canManageProposalOrLoanRequestRecord) เผื่อกรณีต้องแก้ไขข้อมูลที่กรอกผิดพลาดหลังกระบวนการดำเนินไปแล้ว
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const isHousehold = user.role === "HOUSEHOLD";
  const isStaffManager = canManageProposalOrLoanRequestRecord(user);
  if (!isHousehold && !isStaffManager) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const loanRequest = await prisma.loanRequest.findUnique({
    where: { id: Number(id) },
    include: { household: true },
  });
  if (!loanRequest) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบแบบขอยืมเงินทุนที่ระบุ"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (!canAccessHouseholdRecord(user, scope, loanRequest.household)) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบแบบขอยืมเงินทุนที่ระบุ"] } }, { status: 404 });
  }

  if (isHousehold && loanRequest.workerOpinion) {
    return NextResponse.json(
      { error: { formErrors: ["พัฒนากรให้ความเห็นแล้ว ไม่สามารถแก้ไขคำร้องนี้ได้อีก"] } },
      { status: 409 }
    );
  }

  const body = await request.json();
  const parsed = loanRequestSelfEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const updated = await prisma.loanRequest.update({
    where: { id: loanRequest.id },
    data: {
      applicantAge: data.applicantAge,
      occupation: data.occupation,
      requestedAmount: data.requestedAmount,
      spouseConsentName: data.spouseConsentName,
      requestDate: data.requestDate ? new Date(data.requestDate) : undefined,
    },
  });

  return NextResponse.json(updated);
}

// ลบแบบขอยืมเงินทุน — เฉพาะพัฒนาการอำเภอ พัฒนากรตำบล และประธานคณะกรรมการหมู่บ้าน
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canManageProposalOrLoanRequestRecord(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const loanRequest = await prisma.loanRequest.findUnique({
    where: { id: Number(id) },
    include: { household: true },
  });
  if (!loanRequest) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบแบบขอยืมเงินทุนที่ระบุ"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (!canAccessHouseholdRecord(user, scope, loanRequest.household)) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบแบบขอยืมเงินทุนที่ระบุ"] } }, { status: 404 });
  }

  await prisma.loanRequest.delete({ where: { id: loanRequest.id } });
  return NextResponse.json({ ok: true });
}
