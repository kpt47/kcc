import { prisma } from "./prisma";

export const MEETING_RECORD_REQUIRED_MESSAGE =
  "ต้องแนบรายงาน/วาระการประชุมของหมู่บ้านไว้ในระบบก่อน จึงจะบันทึกความเห็น/พิจารณาอนุมัติได้";

/**
 * ตรวจว่าหมู่บ้านนี้เคยแนบ "รายงาน/วาระการประชุม" (VillageMeetingRecord) ไว้แล้วหรือยัง — ใช้เป็นเงื่อนไขก่อน
 * ให้พัฒนากรบันทึกความเห็น หรือประธานกรรมการอนุมัติแบบเสนอโครงการ/แบบขอยืมเงินทุน เพื่อยืนยันว่ามีการนำเรื่องเข้า
 * ที่ประชุมจริงก่อนพิจารณา — VillageMeetingRecord ผูกกับหมู่บ้าน+วันที่ประชุมเท่านั้น (ไม่ผูกกับรายการที่พิจารณา
 * เป็นรายตัว) จึงตรวจแบบ proxy ว่ามีการประชุมที่บันทึกไว้ก่อนหรือในวันนี้อย่างน้อย 1 ครั้ง
 */
export async function hasVillageMeetingRecord(villageId: number): Promise<boolean> {
  const count = await prisma.villageMeetingRecord.count({
    where: { villageId, meetingDate: { lte: new Date() } },
  });
  return count > 0;
}
