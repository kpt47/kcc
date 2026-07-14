import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, canAccessHouseholdRecord } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canViewRiskAssessment } from "@/lib/authz";
import { assessHouseholdRisk } from "@/lib/riskAssessment";

// แบบฟอร์ม 1 (แบบเสนอโครงการ): ผลประเมินความเสี่ยงก่อนตัดสินใจเห็นชอบ/อนุมัติ — เฉพาะพัฒนากรตำบลและ
// ประธานคณะกรรมการหมู่บ้านเท่านั้น ห้ามครัวเรือนเห็นผลของตนเองเด็ดขาด (ป้องกันความขัดแย้ง)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canViewRiskAssessment(user)) {
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

  const assessment = await assessHouseholdRisk(proposal.householdId, proposal.totalAmount);
  return NextResponse.json(assessment);
}
