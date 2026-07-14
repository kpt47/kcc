import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllowedVillageIds, canAccessHouseholdRecord } from "@/lib/scope";
import { ACCESS_DENIED_MESSAGE, canCreateRepayment } from "@/lib/authz";
import { recomputeLoanBalance } from "@/lib/ledger";
import { notifyUsers } from "@/lib/notifications/notifyUsers";

// อนุมัติรายการที่ครัวเรือนแจ้งชำระเงินเอง — เลขานุการ/ฝ่ายการเงินเท่านั้น (ไม่มี override)
// เมื่ออนุมัติแล้วยอดหนี้จะถูกหักโดยอัตโนมัติ (ผ่าน recomputeLoanBalance ซึ่งนับเฉพาะ APPROVED)
export async function POST(_request: Request, { params }: { params: Promise<{ id: string; repaymentId: string }> }) {
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

  await prisma.loanRepayment.update({
    where: { id: repayment.id },
    data: { status: "APPROVED", committeeReply: null },
  });
  await recomputeLoanBalance(loanId);
  // กด "อนุมัติรับชำระเงิน" แล้ว — รีเซ็ตสถานะเครดิตกลับเป็นปกติเสมอ
  await prisma.loan.update({ where: { id: loanId }, data: { riskStatus: "NORMAL" } });

  // แจ้งเตือนกลับไปยังบัญชีของครัวเรือนเจ้าของเงินยืมนี้ว่าการชำระเงินผ่านการตรวจสอบแล้ว
  const householdUser = await prisma.user.findFirst({ where: { householdId: loan.householdId } });
  if (householdUser) {
    await notifyUsers(
      [householdUser.id],
      "การชำระเงินของท่านได้รับการตรวจสอบแล้ว สามารถดาวน์โหลดใบเสร็จ (ฟอร์ม 5) ได้ทันที",
      "REMINDER"
    );
  }

  const updated = await prisma.loanRepayment.findUniqueOrThrow({ where: { id: repayment.id } });
  const updatedLoan = await prisma.loan.findUniqueOrThrow({ where: { id: loanId } });
  return NextResponse.json({ repayment: updated, loan: updatedLoan });
}
