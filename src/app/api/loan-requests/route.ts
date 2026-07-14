import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loanRequestSchema } from "@/lib/schemas";
import { LOAN_CEILING_DEFAULT } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, canAccessHouseholdRecord } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE } from "@/lib/authz";

// แบบฟอร์ม 2 (แบบขอยืมเงินทุน): เฉพาะครัวเรือน (HOUSEHOLD) เป็นผู้สร้างของตนเองเท่านั้น — เจ้าหน้าที่/กรรมการ
// ห้ามยื่นแทนครัวเรือน (ป้องกันการปลอมแปลงข้อมูลการยื่นคำร้อง)
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (user.role !== "HOUSEHOLD") {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = loanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // ตรวจสอบซ้ำฝั่งเซิร์ฟเวอร์ (defense in depth) — เพดานนี้เป็นค่าเริ่มต้น ปรับได้ตามมติคณะกรรมการ
  if (data.requestedAmount > LOAN_CEILING_DEFAULT) {
    return NextResponse.json(
      { error: { formErrors: [`วงเงินขอยืมต้องไม่เกินเพดาน ${LOAN_CEILING_DEFAULT.toLocaleString("th-TH")} บาทต่อครั้ง`] } },
      { status: 400 }
    );
  }

  const household = await prisma.targetHousehold.findUnique({ where: { id: data.householdId } });
  if (!household) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบครัวเรือนเป้าหมายที่เลือก"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (!canAccessHouseholdRecord(user, scope, household)) {
    return NextResponse.json({ error: { formErrors: ["คุณไม่มีสิทธิ์ยื่นขอยืมเงินให้ครัวเรือนนี้"] } }, { status: 403 });
  }

  // หมายเหตุ: ตั้งใจไม่รับ workerOpinion/committeeDecision ฯลฯ จาก payload นี้ — ผู้ยื่นขอยืมเงิน
  // (ครัวเรือน) ต้องไม่สามารถตั้งค่าความเห็นพัฒนากร/ผลอนุมัติของตนเองได้ ต้องผ่าน endpoint
  // /worker-opinion และ /approve ที่ตรวจสิทธิ์แยกต่างหากเท่านั้น
  const loanRequest = await prisma.loanRequest.create({
    data: {
      householdId: data.householdId,
      volumeNo: data.volumeNo,
      requestNo: data.requestNo,
      applicantAge: data.applicantAge,
      occupation: data.occupation,
      requestedAmount: data.requestedAmount,
      agreesToRegulations: data.agreesToRegulations,
      spouseConsentName: data.spouseConsentName,
      requestDate: new Date(data.requestDate),
    },
  });

  return NextResponse.json(loanRequest, { status: 201 });
}
