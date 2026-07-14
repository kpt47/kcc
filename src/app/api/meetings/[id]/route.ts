import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds } from "@/lib/scope";
import { canDeleteMeetingRecord, MEETING_DELETE_DENIED_MESSAGE } from "@/lib/authz";

// ลบเอกสารวาระการประชุม — เฉพาะพัฒนากรประจำตำบล (SUB_DISTRICT_ADMIN) เท่านั้น ตามที่ผู้ใช้กำหนดไว้อย่างเคร่งครัด
// (ประธาน/เลขานุการ/ฝ่ายการเงินที่อัปโหลดเอง ก็ไม่มีสิทธิ์ลบไฟล์ของตนเองผ่าน endpoint นี้)
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canDeleteMeetingRecord(user)) {
    return NextResponse.json({ error: { formErrors: [MEETING_DELETE_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id } = await params;
  const record = await prisma.villageMeetingRecord.findUnique({ where: { id: Number(id) } });
  if (!record) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบเอกสารการประชุมที่ระบุ"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (scope !== "all" && !scope.includes(record.villageId)) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบเอกสารการประชุมที่ระบุ"] } }, { status: 404 });
  }

  await prisma.villageMeetingRecord.delete({ where: { id: record.id } });
  return NextResponse.json({ success: true });
}
