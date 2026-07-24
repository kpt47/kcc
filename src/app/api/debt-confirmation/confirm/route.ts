import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { debtConfirmationSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";

// ครัวเรือนยืนยัน (หรือแจ้งข้อโต้แย้ง) ยอดหนี้รวมของตนเอง ต่อรอบยืนยันยอดที่เปิดอยู่ล่าสุดของหมู่บ้านตนเอง
// ยืนยันได้ครั้งเดียวต่อรอบ (unique roundId+householdId) — เก็บยอดคงเหลือ ณ ขณะยืนยันไว้เป็นหลักฐาน
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (user.role !== "HOUSEHOLD" || !user.householdId || !user.scopeVillageId) {
    return NextResponse.json({ error: { formErrors: ["เฉพาะครัวเรือนเป้าหมายเท่านั้นที่ยืนยันยอดหนี้ได้"] } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = debtConfirmationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { agreesWithBalance, note } = parsed.data;

  const activeRound = await prisma.debtConfirmationRound.findFirst({
    where: { villageId: user.scopeVillageId, confirmationDate: { lte: new Date() } },
    orderBy: { year: "desc" },
  });
  if (!activeRound) {
    return NextResponse.json({ error: { formErrors: ["ยังไม่ถึงวันที่คณะกรรมการกำหนดให้ยืนยันยอดหนี้"] } }, { status: 400 });
  }

  const existing = await prisma.debtConfirmation.findUnique({
    where: { roundId_householdId: { roundId: activeRound.id, householdId: user.householdId } },
  });
  if (existing) {
    return NextResponse.json({ error: { formErrors: ["คุณได้ยืนยันยอดหนี้ของรอบนี้ไปแล้ว"] } }, { status: 409 });
  }

  const openLoans = await prisma.loan.findMany({
    where: { householdId: user.householdId, isClosed: false },
    select: { outstandingBalance: true },
  });
  const outstandingTotal = openLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);

  const confirmation = await prisma.debtConfirmation.create({
    data: {
      roundId: activeRound.id,
      householdId: user.householdId,
      confirmedById: user.id,
      outstandingTotal,
      agreesWithBalance,
      note: agreesWithBalance ? undefined : note,
    },
  });

  return NextResponse.json(confirmation, { status: 201 });
}
