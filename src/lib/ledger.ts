// คำนวณยอดคงเหลือของบัญชีเล่มเขียว (BankTransaction) และเล่มเหลือง (Loan/LoanRepayment) ใหม่ทั้งหมด
// ทุกครั้งที่มีการสร้าง/แก้ไข/ลบรายการ — เพื่อไม่ให้ยอดคงเหลือคลาดเคลื่อนเมื่อแก้ไข/ลบรายการที่ไม่ใช่
// รายการล่าสุด (การหักลบแบบ incremental ทำไม่ได้ถูกต้องเมื่อรองรับการแก้ไข/ลบย้อนหลัง)
import { prisma } from "./prisma";

/** คำนวณยอดคงเหลือ (running balance) ของทุกรายการในบัญชีเงินฝากนี้ใหม่ทั้งหมด ตามลำดับวันที่ */
export async function recomputeBankAccountBalances(bankAccountId: number): Promise<void> {
  const transactions = await prisma.bankTransaction.findMany({
    where: { bankAccountId },
    orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
  });

  let runningBalance = 0;
  await prisma.$transaction(
    transactions.map((t) => {
      runningBalance += t.depositAmount - t.withdrawAmount;
      return prisma.bankTransaction.update({ where: { id: t.id }, data: { balance: runningBalance } });
    })
  );
}

/**
 * คำนวณยอดค้างชำระของเงินยืมก้อนนี้ใหม่จากผลรวมรับชำระทั้งหมด (แทนการหักลบแบบ incremental)
 * นับรวมเฉพาะรายการที่ status = APPROVED เท่านั้น — รายการที่ครัวเรือนแจ้งชำระเองแล้วยังรอตรวจสอบ (PENDING)
 * หรือถูกปฏิเสธ (REJECTED) จะไม่ถูกนำมาหักยอดหนี้จนกว่ากรรมการจะอนุมัติ
 */
export async function recomputeLoanBalance(loanId: number): Promise<void> {
  const loan = await prisma.loan.findUniqueOrThrow({ where: { id: loanId }, include: { repayments: true } });
  const totalRepaid = loan.repayments
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + r.amount, 0);
  const outstandingBalance = Math.max(0, loan.amount - totalRepaid);
  const isClosed = outstandingBalance <= 0;

  await prisma.loan.update({
    where: { id: loanId },
    // closedAt: บันทึกวันที่ปิดสัญญาครั้งแรก (เก็บค่าเดิมไว้ถ้าปิดอยู่แล้ว) ล้างกลับเป็น null ถ้ากลับมามียอด
    // ค้างอีก (เช่น ยกเลิกการอนุมัติรายการรับชำระย้อนหลัง) — ใช้กับกฎรอ 2 เดือนหลังปิดสัญญาก่อนลบทะเบียนครัวเรือนได้
    data: { outstandingBalance, isClosed, closedAt: isClosed ? (loan.closedAt ?? new Date()) : null },
  });
}
