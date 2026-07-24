import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canCreateVisitLog, VISIT_LOG_DENIED_MESSAGE } from "@/lib/authz";

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
