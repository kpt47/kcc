import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { committeeApprovalSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, canAccessHouseholdRecord } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canApproveProposalOrLoanRequest } from "@/lib/authz";
import { hasVillageMeetingRecord, MEETING_RECORD_REQUIRED_MESSAGE } from "@/lib/meetings";
import { notifyUsers } from "@/lib/notifications/notifyUsers";

// แบบฟอร์ม 2 (แบบขอยืมเงินทุน): ประธานคณะกรรมการหมู่บ้าน (CHAIRMAN) เท่านั้นเป็นผู้อนุมัติ — ทำได้ก็ต่อเมื่อพัฒนากรให้ความเห็นแล้ว
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canApproveProposalOrLoanRequest(user)) {
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

  if (!loanRequest.workerOpinion) {
    return NextResponse.json(
      { error: { formErrors: ["ต้องรอความเห็นของพัฒนากรก่อน จึงจะพิจารณาอนุมัติได้"] } },
      { status: 409 }
    );
  }

  if (!(await hasVillageMeetingRecord(loanRequest.household.villageId))) {
    return NextResponse.json({ error: { formErrors: [MEETING_RECORD_REQUIRED_MESSAGE] } }, { status: 409 });
  }

  const body = await request.json();
  const parsed = committeeApprovalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const updated = await prisma.loanRequest.update({
    where: { id: loanRequest.id },
    data: {
      committeeDecision: data.committeeDecision,
      committeeAmount: data.committeeAmount,
      committeeReason: data.committeeReason,
      committeeChairName: data.committeeChairName,
      committeeDate: data.committeeDate ? new Date(data.committeeDate) : undefined,
    },
  });

  // แจ้งเตือนครัวเรือนเป้าหมายเมื่อคณะกรรมการอนุมัติแบบขอยืมเงินทุน (ฟอร์ม 2) แล้ว
  if (data.committeeDecision === "approved") {
    const householdUser = await prisma.user.findFirst({ where: { householdId: loanRequest.householdId } });
    if (householdUser) {
      await notifyUsers([householdUser.id], "แบบขอยืมเงินทุน (ฟอร์ม 2) ของท่านได้รับการอนุมัติแล้ว", "REMINDER");
    }
  }

  return NextResponse.json(updated);
}
