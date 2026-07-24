import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { proposalSelfEditSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { canAccessHouseholdRecord, getAllowedVillageIds } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE } from "@/lib/authz";

// แบบฟอร์ม 1 (แบบเสนอโครงการ): ครัวเรือนดึงข้อมูลโครงการที่ตนเองอนุมัติแล้วมาใช้อ้างอิงตอนยื่นแบบขอยืมเงินทุน
// (เล่มที่/โครงการที่/วงเงินที่อนุมัติ) — ดู /loan-requests/new?proposalId=... และ POST /api/loan-requests
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (user.role !== "HOUSEHOLD") {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const proposal = await prisma.projectProposal.findUnique({
    where: { id: Number(id) },
    include: {
      household: {
        include: {
          users: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { householdProfile: { select: { consentPersonName: true } } },
          },
        },
      },
      loanRequests: { select: { id: true } },
    },
  });
  if (!proposal) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบแบบเสนอโครงการที่ระบุ"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (!canAccessHouseholdRecord(user, scope, proposal.household)) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบแบบเสนอโครงการที่ระบุ"] } }, { status: 404 });
  }

  if (proposal.committeeDecision !== "approved") {
    return NextResponse.json({ error: { formErrors: ["แบบเสนอโครงการนี้ยังไม่ได้รับการอนุมัติ"] } }, { status: 409 });
  }
  if (proposal.loanRequests.length > 0) {
    return NextResponse.json(
      { error: { formErrors: ["แบบเสนอโครงการนี้ถูกใช้ยื่นแบบขอยืมเงินทุนไปแล้ว"] } },
      { status: 409 }
    );
  }

  return NextResponse.json({
    id: proposal.id,
    householdId: proposal.householdId,
    volumeNo: proposal.volumeNo,
    proposalNo: proposal.proposalNo,
    committeeAmount: proposal.committeeAmount,
    applicantAge: proposal.applicantAge,
    occupation: proposal.occupation,
    consentPersonName: proposal.household.users[0]?.householdProfile?.consentPersonName ?? null,
  });
}

// แบบฟอร์ม 1 (แบบเสนอโครงการ): ครัวเรือนแก้ไขคำร้องของตนเองได้ เฉพาะก่อนที่พัฒนากรจะให้ความเห็น
// (workerOpinion ยังเป็นค่าว่าง) — หลังจากนั้นกระบวนการเดินหน้าไปแล้ว แก้ไขไม่ได้อีก
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (user.role !== "HOUSEHOLD") {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const proposal = await prisma.projectProposal.findUnique({
    where: { id: Number(id) },
    include: { household: true, items: true },
  });
  if (!proposal) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบแบบเสนอโครงการที่ระบุ"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (!canAccessHouseholdRecord(user, scope, proposal.household)) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบแบบเสนอโครงการที่ระบุ"] } }, { status: 404 });
  }

  if (proposal.workerOpinion) {
    return NextResponse.json(
      { error: { formErrors: ["พัฒนากรให้ความเห็นแล้ว ไม่สามารถแก้ไขคำร้องนี้ได้อีก"] } },
      { status: 409 }
    );
  }

  const body = await request.json();
  const parsed = proposalSelfEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  if (data.items && data.totalAmount !== undefined) {
    const sum = data.items.reduce((acc, item) => acc + item.amount, 0);
    if (Math.abs(sum - data.totalAmount) >= 0.01) {
      return NextResponse.json(
        { error: { fieldErrors: { items: ["ผลรวมของรายการย่อยต้องเท่ากับจำนวนเงินทั้งสิ้นที่ระบุไว้ด้านบน"] } } },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.projectProposal.update({
    where: { id: proposal.id },
    data: {
      applicantAge: data.applicantAge,
      occupation: data.occupation,
      projectName: data.projectName,
      totalAmount: data.totalAmount,
      proposedDate: data.proposedDate ? new Date(data.proposedDate) : undefined,
      items: data.items
        ? {
            deleteMany: {},
            create: data.items.map((item, index) => ({ itemNo: index + 1, description: item.description, amount: item.amount })),
          }
        : undefined,
    },
    include: { items: true },
  });

  return NextResponse.json(updated);
}
