import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loanRequestWorkerOpinionSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, canAccessHouseholdRecord } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canGiveWorkerOpinion } from "@/lib/authz";

// แบบฟอร์ม 2 (แบบขอยืมเงินทุน): พัฒนากรบันทึก "ความเห็นของพัฒนากร" — เฉพาะ SUB_DISTRICT_ADMIN เท่านั้น
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canGiveWorkerOpinion(user)) {
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

  const body = await request.json();
  const parsed = loanRequestWorkerOpinionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const updated = await prisma.loanRequest.update({
    where: { id: loanRequest.id },
    data: {
      workerOpinion: data.workerOpinion,
      workerReason: data.workerReason,
      workerName: data.workerName,
      workerDate: data.workerDate ? new Date(data.workerDate) : undefined,
    },
  });

  return NextResponse.json(updated);
}
