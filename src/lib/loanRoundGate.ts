// ครัวเรือนเป้าหมายยื่นแบบเสนอโครงการ/แบบขอยืมเงินทุนใหม่ได้ 1 รอบเท่านั้น จนกว่ารอบเดิมจะจบลง — ไม่ว่าจะเป็น
// เพราะถูกปฏิเสธในขั้นตอนใดขั้นตอนหนึ่ง หรือได้รับเงินยืมแล้วปิดสัญญา/ชำระคืนครบแล้ว (ดู POST /api/proposals)
import { prisma } from "./prisma";

/**
 * ครัวเรือนนี้มี "รอบ" แบบเสนอโครงการ→แบบขอยืมเงินทุน→สัญญาเงินยืม ที่ยังไม่จบกระบวนการอยู่หรือไม่
 *
 * ตรวจสอบสองชั้น:
 * 1) มีสัญญาเงินยืม (Loan) ที่ยังไม่ปิดอยู่เลยหรือไม่ — ไม่ว่าจะผูกกับแบบขอยืมเงินทุนใดหรือไม่ (ครอบคลุมสัญญา
 *    เงินยืมเก่าที่บันทึกก่อนมีการเชื่อมโยง loanRequestId หรือครัวเรือนที่ไม่ได้ผ่านขั้นตอนดิจิทัลเต็มรูปแบบ)
 * 2) ไล่ตรวจแบบเสนอโครงการทุกฉบับของครัวเรือนนี้ ว่ามีฉบับใดที่ยังไม่ถูกปฏิเสธ และยังไม่มีสัญญาเงินยืมที่ปิดแล้ว
 *    ผูกอยู่หรือไม่ (ครอบคลุมช่วงระหว่างอนุมัติแบบเสนอโครงการ/แบบขอยืมเงินทุน จนถึงก่อนเลขานุการทำสัญญาจริง)
 */
export async function hasActiveLoanRound(householdId: number): Promise<boolean> {
  const openLoan = await prisma.loan.findFirst({ where: { householdId, isClosed: false }, select: { id: true } });
  if (openLoan) return true;

  const proposals = await prisma.projectProposal.findMany({
    where: { householdId },
    select: {
      committeeDecision: true,
      loanRequests: { select: { committeeDecision: true, loan: { select: { isClosed: true } } } },
    },
  });

  return proposals.some((p) => {
    if (p.committeeDecision === "rejected") return false; // จบแล้ว (ไม่ผ่านการอนุมัติแบบเสนอโครงการ)
    const loanRequest = p.loanRequests[0]; // มีได้สูงสุด 1 รายการ (@@unique([proposalId]))
    if (!loanRequest) return true; // รออนุมัติแบบเสนอโครงการ หรืออนุมัติแล้วแต่ยังไม่ได้ยื่นแบบขอยืมเงินทุน
    if (loanRequest.committeeDecision === "rejected") return false; // จบแล้ว (แบบขอยืมเงินทุนไม่ผ่าน)
    if (!loanRequest.loan) return true; // อนุมัติแบบขอยืมเงินทุนแล้ว แต่ยังไม่ได้ทำสัญญาเงินยืม
    return !loanRequest.loan.isClosed; // มีสัญญาแล้ว จบก็ต่อเมื่อปิดสัญญาแล้วเท่านั้น (ซ้ำกับข้อ 1 แต่ปลอดภัยไว้ก่อน)
  });
}

/** ข้อความปฏิเสธมาตรฐานเมื่อครัวเรือนมีรอบที่ยังไม่จบอยู่ ใช้ร่วมกันทั้งแบบเสนอโครงการและแบบขอยืมเงินทุน */
export const ACTIVE_LOAN_ROUND_MESSAGE =
  "ครัวเรือนนี้มีแบบเสนอโครงการ/แบบขอยืมเงินทุนที่ยังไม่จบกระบวนการอยู่ (รออนุมัติ หรือได้รับเงินยืมแล้วยังไม่ปิดสัญญา/ชำระคืนไม่ครบ) ต้องรอให้รอบเดิมจบก่อน จึงจะยื่นแบบเสนอโครงการใหม่ได้";
