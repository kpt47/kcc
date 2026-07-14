import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, scopeWhereDirect } from "@/lib/scope";
import { canViewVillageStatusBook, VILLAGE_STATUS_BOOK_DENIED_MESSAGE } from "@/lib/authz";

// เล่มน้ำตาล (สมุดบันทึกสถานะหมู่บ้าน + บันทึกการส่งมอบ-รับมอบงาน) — อ่านได้เฉพาะพัฒนากรตำบล ผู้บริหารอำเภอ
// และผู้บริหารจังหวัดเท่านั้น (ดู canViewVillageStatusBook) ผู้ใช้ระดับอื่นทุกระดับ (รวมถึงส่วนกลาง/กรรมการ
// หมู่บ้าน/ครัวเรือน/IT_SUPPORT) ได้รับ 403 Forbidden เสมอ ไม่มีข้อยกเว้น
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canViewVillageStatusBook(user)) {
    return NextResponse.json({ error: { formErrors: [VILLAGE_STATUS_BOOK_DENIED_MESSAGE] } }, { status: 403 });
  }

  const scope = await getAllowedVillageIds(user);
  const villages = await prisma.village.findMany({
    where: scopeWhereDirect(scope, "id"),
    orderBy: [{ villageNo: "asc" }],
    select: {
      id: true,
      villageNo: true,
      villageName: true,
      statusSnapshots: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
      handovers: {
        orderBy: { handoverDate: "desc" },
        select: {
          id: true,
          handoverNo: true,
          fromName: true,
          fromPosition: true,
          toName: true,
          toPosition: true,
          handoverDate: true,
        },
      },
    },
  });

  return NextResponse.json(villages);
}
