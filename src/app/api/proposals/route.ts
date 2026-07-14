import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { proposalSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, canAccessHouseholdRecord } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE } from "@/lib/authz";

// แบบฟอร์ม 1 (แบบเสนอโครงการ): เฉพาะครัวเรือน (HOUSEHOLD) เป็นผู้สร้างของตนเองเท่านั้น — เจ้าหน้าที่/กรรมการ
// ห้ามยื่นแทนครัวเรือน (ป้องกันการปลอมแปลงข้อมูลการยื่นคำร้อง)
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (user.role !== "HOUSEHOLD") {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = proposalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const household = await prisma.targetHousehold.findUnique({ where: { id: data.householdId } });
  if (!household) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบครัวเรือนเป้าหมายที่เลือก"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (!canAccessHouseholdRecord(user, scope, household)) {
    return NextResponse.json({ error: { formErrors: ["คุณไม่มีสิทธิ์เสนอโครงการให้ครัวเรือนนี้"] } }, { status: 403 });
  }

  // หมายเหตุ: ตั้งใจไม่รับ workerOpinion/committeeDecision ฯลฯ จาก payload นี้ แม้ proposalSchema
  // จะอนุญาตฟิลด์เหล่านี้ก็ตาม (ใช้ schema เดียวกันสำหรับหน้าทบทวนข้อมูลในอนาคต) — ผู้เสนอโครงการ
  // (ครัวเรือน) ต้องไม่สามารถตั้งค่าความเห็นพัฒนากร/ผลอนุมัติของตนเองได้ ต้องผ่าน endpoint
  // /worker-opinion และ /approve ที่ตรวจสิทธิ์แยกต่างหากเท่านั้น
  const proposal = await prisma.projectProposal.create({
    data: {
      householdId: data.householdId,
      volumeNo: data.volumeNo,
      proposalNo: data.proposalNo,
      applicantAge: data.applicantAge,
      occupation: data.occupation,
      projectName: data.projectName,
      totalAmount: data.totalAmount,
      proposedDate: new Date(data.proposedDate),
      items: {
        create: data.items.map((item, index) => ({
          itemNo: index + 1,
          description: item.description,
          amount: item.amount,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(proposal, { status: 201 });
}
