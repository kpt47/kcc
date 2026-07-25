// คำนวณวันครบกำหนดชำระเงินทั้งหมดและยอดผ่อนชำระต่อเดือนของสัญญาเงินยืม — ใช้ตอนเลขานุการบันทึกสัญญาเงินยืมใหม่
// (Loan.dueDate/paymentDayOfMonth) เพื่อเสนอค่าเริ่มต้นและแสดงตัวอย่างยอดผ่อนชำระต่อเดือน
import { MAX_REPAYMENT_YEARS } from "./config";

/** วันครบกำหนดชำระเงินทั้งหมด = วันที่รับเงินยืม + ระยะเวลาผ่อนชำระสูงสุดตามระเบียบ (ปัจจุบัน 3 ปี) */
export function computeRepaymentDueDate(receivedDate: Date): Date {
  const due = new Date(receivedDate);
  due.setFullYear(due.getFullYear() + MAX_REPAYMENT_YEARS);
  return due;
}

/** จำนวนเดือนระหว่างสองวันที่ (อย่างน้อย 1 เดือน) — ใช้หารยอดผ่อนชำระต่อเดือน */
export function monthsBetween(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return Math.max(1, months);
}

/** ยอดผ่อนชำระต่อเดือน (โดยประมาณ) = ยอดเงินทั้งหมด / จำนวนเดือนผ่อนชำระ */
export function computeMonthlyInstallment(totalAmount: number, requestDate: Date, dueDate: Date): number {
  return totalAmount / monthsBetween(requestDate, dueDate);
}
