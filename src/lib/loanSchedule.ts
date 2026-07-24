// คำนวณวันครบกำหนดชำระเงินทั้งหมดและยอดผ่อนชำระต่อเดือนของแบบขอยืมเงินทุน — ใช้ทั้งตอนสร้าง/แก้ไขคำร้อง
// (เก็บผลลง LoanRequest.repaymentDueDate) และตอนแสดงตัวอย่างให้ครัวเรือนดูก่อนยื่นคำร้อง/ในหน้าหลัก
import { MAX_REPAYMENT_YEARS } from "./config";

/** วันครบกำหนดชำระเงินทั้งหมด = วันที่ยื่นคำขอ + ระยะเวลาผ่อนชำระสูงสุดตามระเบียบ (ปัจจุบัน 3 ปี) */
export function computeRepaymentDueDate(requestDate: Date): Date {
  const due = new Date(requestDate);
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
