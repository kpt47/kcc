import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { visitLogSchema, visitLogAdviceSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { canAdviseVisitLog, canCreateVisitLog, VISIT_LOG_DENIED_MESSAGE } from "@/lib/authz";

// แก้ไขบันทึกการติดตาม รองรับ 2 กรณีแยกจากกันตามรูปแบบ body ที่ส่งมา:
// (1) พัฒนากรตำบลเจ้าของบันทึกแก้ไขข้อมูลของตนเอง — ส่ง villageId/visitDate/visitType/notes/attachmentUrls
// (2) พัฒนาการอำเภอ/พัฒนาการจังหวัดพิมพ์คำแนะนำ — ส่ง advice อย่างเดียว (ต้องอยู่ในเขตพื้นที่ของตนด้วย)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const { id } = await params;
  const record = await prisma.visitLog.findUnique({ where: { id: Number(id) } });
  if (!record) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบบันทึกที่ระบุ"] } }, { status: 404 });
  }

  const body = await request.json();

  if ("advice" in body) {
    if (!canAdviseVisitLog(user)) {
      return NextResponse.json({ error: { formErrors: [VISIT_LOG_DENIED_MESSAGE] } }, { status: 403 });
    }
    const scope = await getAllowedVillageIds(user);
    if (scope !== "all" && !scope.includes(record.villageId)) {
      return NextResponse.json({ error: { formErrors: ["บันทึกนี้อยู่นอกเขตพื้นที่ของคุณ"] } }, { status: 403 });
    }
    const parsed = visitLogAdviceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    await prisma.visitLog.update({
      where: { id: record.id },
      data: { advice: parsed.data.advice, advisedById: user.id, advisedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (!canCreateVisitLog(user)) {
    return NextResponse.json({ error: { formErrors: [VISIT_LOG_DENIED_MESSAGE] } }, { status: 403 });
  }
  if (record.recordedById !== user.id) {
    return NextResponse.json({ error: { formErrors: ["แก้ไขได้เฉพาะบันทึกที่คุณบันทึกไว้เองเท่านั้น"] } }, { status: 403 });
  }
  const parsed = visitLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const scope = await getAllowedVillageIds(user);
  if (scope !== "all" && !scope.includes(data.villageId)) {
    return NextResponse.json({ error: { formErrors: ["หมู่บ้านที่เลือกไม่อยู่ในเขตตำบลของคุณ"] } }, { status: 403 });
  }

  await prisma.visitLog.update({
    where: { id: record.id },
    data: {
      villageId: data.villageId,
      visitDate: new Date(data.visitDate),
      visitType: data.visitType,
      notes: data.notes,
      attachments: {
        deleteMany: {},
        create: data.attachmentUrls?.map((fileUrl) => ({ fileUrl })) ?? [],
      },
    },
  });
  return NextResponse.json({ ok: true });
}

// ลบบันทึกการติดตาม — เฉพาะพัฒนากรตำบล (SUB_DISTRICT_ADMIN) ที่เป็นผู้บันทึกรายการนั้นด้วยตนเองเท่านั้น
// (แม้แต่พัฒนากรตำบลคนอื่น หรือผู้บริหารระดับสูงกว่า ก็ลบบันทึกของพัฒนากรคนอื่นไม่ได้ — เป็นหลักฐานส่วนบุคคล)
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canCreateVisitLog(user)) {
    return NextResponse.json({ error: { formErrors: [VISIT_LOG_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const record = await prisma.visitLog.findUnique({ where: { id: Number(id) } });
  if (!record) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบบันทึกที่ระบุ"] } }, { status: 404 });
  }
  if (record.recordedById !== user.id) {
    return NextResponse.json({ error: { formErrors: ["ลบได้เฉพาะบันทึกที่คุณบันทึกไว้เองเท่านั้น"] } }, { status: 403 });
  }

  await prisma.visitLog.delete({ where: { id: record.id } });
  return NextResponse.json({ success: true });
}
