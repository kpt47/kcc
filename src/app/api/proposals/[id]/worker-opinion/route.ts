import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { proposalWorkerOpinionSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, canAccessHouseholdRecord } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canGiveWorkerOpinion } from "@/lib/authz";
import { hasVillageMeetingRecord, MEETING_RECORD_REQUIRED_MESSAGE } from "@/lib/meetings";

// แบบฟอร์ม 1 (แบบเสนอโครงการ): พัฒนากรบันทึก "ความเห็นของพัฒนากร" — เฉพาะ SUB_DISTRICT_ADMIN เท่านั้น
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canGiveWorkerOpinion(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const proposal = await prisma.projectProposal.findUnique({
    where: { id: Number(id) },
    include: { household: true },
  });
  if (!proposal) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบแบบเสนอโครงการที่ระบุ"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (!canAccessHouseholdRecord(user, scope, proposal.household)) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบแบบเสนอโครงการที่ระบุ"] } }, { status: 404 });
  }

  if (!(await hasVillageMeetingRecord(proposal.household.villageId))) {
    return NextResponse.json({ error: { formErrors: [MEETING_RECORD_REQUIRED_MESSAGE] } }, { status: 409 });
  }

  const body = await request.json();
  const parsed = proposalWorkerOpinionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const updated = await prisma.projectProposal.update({
    where: { id: proposal.id },
    data: {
      workerOpinion: data.workerOpinion,
      workerReason: data.workerReason,
      workerName: data.workerName,
      workerDate: data.workerDate ? new Date(data.workerDate) : undefined,
    },
  });

  return NextResponse.json(updated);
}
