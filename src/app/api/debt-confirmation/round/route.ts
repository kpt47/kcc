import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { debtConfirmationRoundSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { canSetDebtConfirmationDate, ACCESS_DENIED_MESSAGE } from "@/lib/authz";

// ประธานกรรมการหมู่บ้าน (CHAIRMAN) กำหนด/แก้ไขวันเริ่มยืนยันยอดหนี้ประจำปีของหมู่บ้านตนเอง
// หนึ่งหมู่บ้านมีได้ปีละ 1 รอบ (unique villageId+year) — เรียกซ้ำในปีเดียวกันจะแก้ไขวันที่ของรอบเดิมแทนการสร้างใหม่
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canSetDebtConfirmationDate(user) || !user.scopeVillageId) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = debtConfirmationRoundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { year, confirmationDate } = parsed.data;

  const round = await prisma.debtConfirmationRound.upsert({
    where: { villageId_year: { villageId: user.scopeVillageId, year } },
    create: {
      villageId: user.scopeVillageId,
      year,
      confirmationDate: new Date(confirmationDate),
      createdById: user.id,
    },
    update: { confirmationDate: new Date(confirmationDate), createdById: user.id },
  });

  return NextResponse.json(round, { status: 201 });
}
