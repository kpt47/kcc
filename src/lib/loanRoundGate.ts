// ครัวเรือนเป้าหมายยื่นแบบเสนอโครงการ/แบบขอยืมเงินทุนใหม่ได้ 1 รอบเท่านั้น จนกว่ารอบเดิมจะจบลง — ไม่ว่าจะเป็น
// เพราะถูกปฏิเสธในขั้นตอนใดขั้นตอนหนึ่ง หรือได้รับเงินยืมแล้วปิดสัญญา/ชำระคืนครบแล้ว (ดู POST /api/proposals)
//
// ไฟล์นี้ยังเป็นที่รวมกฎ "ลบทะเบียนครัวเรือนเป้าหมายได้เมื่อใด" ด้วย (ดู getHouseholdDeleteBlockReason(s) ด้านล่าง)
// เพราะใช้เงื่อนไข "มีรอบที่ยังไม่จบอยู่หรือไม่" ชุดเดียวกันเป็นฐาน แล้วเพิ่มกฎรอ 2 เดือนหลังปิดสัญญาทับอีกชั้น
import { prisma } from "./prisma";

type ProposalRoundState = {
  committeeDecision: string | null;
  loanRequests: { committeeDecision: string | null; loan: { isClosed: boolean } | null }[];
};

/** แบบเสนอโครงการฉบับนี้ยังถือเป็น "รอบที่ยังไม่จบ" อยู่หรือไม่ (ดูตารางเงื่อนไขใน hasActiveLoanRound) */
function proposalIsActive(p: ProposalRoundState): boolean {
  if (p.committeeDecision === "rejected") return false; // จบแล้ว (ไม่ผ่านการอนุมัติแบบเสนอโครงการ)
  const loanRequest = p.loanRequests[0]; // มีได้สูงสุด 1 รายการ (@@unique([proposalId]))
  if (!loanRequest) return true; // รออนุมัติแบบเสนอโครงการ หรืออนุมัติแล้วแต่ยังไม่ได้ยื่นแบบขอยืมเงินทุน
  if (loanRequest.committeeDecision === "rejected") return false; // จบแล้ว (แบบขอยืมเงินทุนไม่ผ่าน)
  if (!loanRequest.loan) return true; // อนุมัติแบบขอยืมเงินทุนแล้ว แต่ยังไม่ได้ทำสัญญาเงินยืม
  return !loanRequest.loan.isClosed; // มีสัญญาแล้ว จบก็ต่อเมื่อปิดสัญญาแล้วเท่านั้น
}

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

  return proposals.some(proposalIsActive);
}

/** ข้อความปฏิเสธมาตรฐานเมื่อครัวเรือนมีรอบที่ยังไม่จบอยู่ ใช้ร่วมกันทั้งแบบเสนอโครงการและแบบขอยืมเงินทุน */
export const ACTIVE_LOAN_ROUND_MESSAGE =
  "ครัวเรือนนี้มีแบบเสนอโครงการ/แบบขอยืมเงินทุนที่ยังไม่จบกระบวนการอยู่ (รออนุมัติ หรือได้รับเงินยืมแล้วยังไม่ปิดสัญญา/ชำระคืนไม่ครบ) ต้องรอให้รอบเดิมจบก่อน จึงจะยื่นแบบเสนอโครงการใหม่ได้";

// ---------------------------------------------------------------------------
// กฎ "ลบทะเบียนครัวเรือนเป้าหมายได้เมื่อใด" — สำหรับพัฒนาการอำเภอ/พัฒนากร/ประธานกรรมการ (ดู
// canDeleteHousehold ใน lib/authz.ts และ DELETE /api/households/[id])
//
// 1) มีรอบที่ยังไม่จบอยู่ (ดู hasActiveLoanRound ด้านบน) -> ลบไม่ได้ ("active_round")
// 2) ไม่เคยมีแบบเสนอโครงการ/แบบขอยืมเงินทุน/สัญญาเงินยืมเลย -> ลบได้ทันที (ไม่มี block reason)
// 3) เคยมีสัญญาเงินยืมและปิดสัญญาแล้วทุกฉบับ -> ต้องรออย่างน้อย 2 เดือนนับจากวันที่ปิดสัญญาฉบับล่าสุด จึงลบได้
// ---------------------------------------------------------------------------

const DELETE_COOLDOWN_MONTHS = 2;

export type HouseholdDeleteBlockReason = "active_round" | "cooldown";

export const HOUSEHOLD_DELETE_BLOCK_MESSAGE: Record<HouseholdDeleteBlockReason, string> = {
  active_round: ACTIVE_LOAN_ROUND_MESSAGE,
  cooldown: `ครัวเรือนนี้เพิ่งปิดสัญญาเงินยืม ต้องรออย่างน้อย ${DELETE_COOLDOWN_MONTHS} เดือนนับจากวันที่ปิดสัญญา จึงจะลบทะเบียนได้`,
};

/** ตรวจสอบแบบชุด (batch, กันปัญหา N+1 query) ว่าครัวเรือนใดในรายการนี้ "ลบทะเบียนไม่ได้ตอนนี้" พร้อมเหตุผล */
export async function getHouseholdDeleteBlockReasons(
  householdIds: number[]
): Promise<Map<number, HouseholdDeleteBlockReason>> {
  const result = new Map<number, HouseholdDeleteBlockReason>();
  if (householdIds.length === 0) return result;

  const [loans, proposals] = await Promise.all([
    prisma.loan.findMany({
      where: { householdId: { in: householdIds } },
      select: { householdId: true, isClosed: true, closedAt: true },
    }),
    prisma.projectProposal.findMany({
      where: { householdId: { in: householdIds } },
      select: {
        householdId: true,
        committeeDecision: true,
        loanRequests: { select: { committeeDecision: true, loan: { select: { isClosed: true } } } },
      },
    }),
  ]);

  const loansByHousehold = new Map<number, typeof loans>();
  for (const l of loans) {
    const arr = loansByHousehold.get(l.householdId);
    if (arr) arr.push(l);
    else loansByHousehold.set(l.householdId, [l]);
  }
  const proposalsByHousehold = new Map<number, typeof proposals>();
  for (const p of proposals) {
    const arr = proposalsByHousehold.get(p.householdId);
    if (arr) arr.push(p);
    else proposalsByHousehold.set(p.householdId, [p]);
  }

  const cooldownCutoff = new Date();
  cooldownCutoff.setMonth(cooldownCutoff.getMonth() - DELETE_COOLDOWN_MONTHS);

  for (const householdId of householdIds) {
    const hLoans = loansByHousehold.get(householdId) ?? [];
    const hProposals = proposalsByHousehold.get(householdId) ?? [];

    if (hLoans.some((l) => !l.isClosed) || hProposals.some(proposalIsActive)) {
      result.set(householdId, "active_round");
      continue;
    }

    const closedDates = hLoans.map((l) => l.closedAt).filter((d): d is Date => d != null);
    if (closedDates.length > 0) {
      const latestClose = new Date(Math.max(...closedDates.map((d) => d.getTime())));
      if (latestClose > cooldownCutoff) result.set(householdId, "cooldown");
    }
  }

  return result;
}

/** เวอร์ชันเดี่ยว (single) ของ getHouseholdDeleteBlockReasons — สำหรับ endpoint ที่ตรวจครัวเรือนเดียว */
export async function getHouseholdDeleteBlockReason(householdId: number): Promise<HouseholdDeleteBlockReason | null> {
  const reasons = await getHouseholdDeleteBlockReasons([householdId]);
  return reasons.get(householdId) ?? null;
}
