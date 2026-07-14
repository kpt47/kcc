import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rejectPaymentSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, canAccessHouseholdRecord } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canCreateRepayment } from "@/lib/authz";
import { recomputeLoanBalance } from "@/lib/ledger";

// ปฏิเสธรายการที่ครัวเรือนแจ้งชำระเงินเอง — ต้องระบุเหตุผล (เช่น สลิปไม่ชัด/ยอดไม่ตรง) ส่งกลับให้ครัวเรือนเห็น
export async function POST(request: Request, { params }: { params: Promise<{ id: string; repaymentId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  if (!canCreateRepayment(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const { id, repaymentId } = await params;
  const loanId = Number(id);
  const loan = await prisma.loan.findUnique({ where: { id: loanId }, include: { household: true } });
  if (!loan) return NextResponse.json({ error: { formErrors: ["ไม่พบรายการเงินยืมที่ระบุ"] } }, { status: 404 });

  const repayment = await prisma.loanRepayment.findUnique({ where: { id: Number(repaymentId) } });
  if (!repayment || repayment.loanId !== loanId) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบรายการแจ้งชำระเงินที่ระบุ"] } }, { status: 404 });
  }

  const scope = await getAllowedVillageIds(user);
  if (!canAccessHouseholdRecord(user, scope, loan.household)) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบรายการแจ้งชำระเงินที่ระบุ"] } }, { status: 404 });
  }

  if (repayment.status !== "PENDING") {
    return NextResponse.json({ error: { formErrors: ["รายการนี้ถูกตรวจสอบไปแล้ว"] } }, { status: 409 });
  }

  const body = await request.json();
  const parsed = rejectPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.loanRepayment.update({
    where: { id: repayment.id },
    data: { status: "REJECTED", committeeReply: parsed.data.committeeReply },
  });
  await recomputeLoanBalance(loanId);

  const updated = await prisma.loanRepayment.findUniqueOrThrow({ where: { id: repayment.id } });
  return NextResponse.json(updated);
}
