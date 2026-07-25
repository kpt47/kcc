// รวม "หนี้" ที่นับสำหรับ Dashboard/ข้อมูลสถิติ จาก 2 แหล่ง:
// 1) สัญญาเงินยืมจริง (Loan)
// 2) แบบขอยืมเงินทุน (ฟอร์ม 2) ที่คณะกรรมการ กข.คจ. หมู่บ้านอนุมัติแล้ว แต่เลขานุการยังไม่ได้ทำสัญญาเงินยืม (Loan)
//    จริงให้ — ตามผลการอนุมัติถือว่าครัวเรือนนี้เป็นหนี้แล้วตั้งแต่วันที่อนุมัติ ไม่ต้องรอเลขานุการคีย์สัญญา
//    Dashboard/สถิติจึงจะไม่แสดงข้อมูลว่างเปล่าผิดพลาดระหว่างที่ยังไม่มีสัญญาอย่างเป็นทางการ (ดู lib/loanRoundGate.ts
//    สำหรับกฎที่เกี่ยวข้อง — อนุมัติแบบขอยืมเงินทุนแล้วถือเป็น "รอบที่ยังไม่จบ" เช่นกัน) ใช้ยอดที่คณะกรรมการอนุมัติ
//    (committeeAmount) เป็นหลัก (ถ้ายังไม่ระบุ fallback เป็นยอดที่ขอยืม) — วันที่ยื่นคำขอ (requestDate) คือวัน
//    เริ่มต้นการยืม และวันครบกำหนดชำระเงินทั้งหมด (repaymentDueDate) คือวันสิ้นสุดสัญญา ใช้คำนวณ NPL/ความเสี่ยง
//    ล่วงหน้าได้ทันทีตามคำนิยามเดียวกับที่ใช้ในแบบขอยืมเงินทุนเอง
//
// หมายเหตุ: ไม่ใช้กับรายงานราชการที่เป็นแบบฟอร์มทะเบียนลูกหนี้อย่างเป็นทางการ (26(1)/26(2) ฯลฯ ใน getReport1Rows
// เป็นต้นไปด้านล่างของ lib/analytics.ts) ซึ่งต้องอ้างอิงสัญญาเงินยืมจริงที่มีเลขที่สัญญาเท่านั้น
import { prisma } from "./prisma";
import { calculateRiskStatus } from "./risk";
import type { RiskStatus } from "@/generated/prisma/client";

export type EffectiveLoan = {
  householdId: number;
  villageId: number;
  headFirstName: string;
  headLastName: string;
  amount: number;
  outstandingBalance: number;
  receivedDate: Date;
  dueDate: Date | null;
  isClosed: boolean;
  riskStatus: RiskStatus;
  repayments: { amount: number; paymentDate: Date; status: string }[];
};

/** householdWhere: ใช้รูปแบบเดียวกับ scopeWhereDirect(scope, "villageId") หรือ { id: householdId } */
export async function getEffectiveLoans(householdWhere: {
  villageId?: { in: number[] };
  id?: number;
}): Promise<EffectiveLoan[]> {
  const [loans, pendingLoanRequests] = await Promise.all([
    prisma.loan.findMany({
      where: { household: householdWhere },
      include: {
        household: { select: { villageId: true, headFirstName: true, headLastName: true } },
        loanRequest: { select: { repaymentDueDate: true } },
        repayments: true,
      },
    }),
    prisma.loanRequest.findMany({
      where: { committeeDecision: "approved", loan: null, household: householdWhere },
      select: {
        householdId: true,
        requestedAmount: true,
        committeeAmount: true,
        requestDate: true,
        repaymentDueDate: true,
        household: { select: { villageId: true, headFirstName: true, headLastName: true } },
      },
    }),
  ]);

  // สัญญาเงินยืมจริงบางฉบับอาจไม่ได้กรอกวันครบกำหนดชำระ (dueDate) ไว้ตรงๆ (เช่น บันทึกด้วยมือ ไม่ผ่านหน้าที่
  // เติมอัตโนมัติจากแบบขอยืมเงินทุน) — ถ้าผูกกับแบบขอยืมเงินทุนอยู่ (loanRequestId) ให้ใช้วันครบกำหนดชำระเงิน
  // ทั้งหมดที่ระบุไว้ในแบบขอยืมเงินทุนนั้นแทน (วันสิ้นสุดสัญญาตัวจริงตามที่ครัวเรือนตกลงไว้) แล้วคำนวณความเสี่ยง
  // สดใหม่ทุกครั้งจากวันครบกำหนดนี้ (แม่นยำกว่าค่า riskStatus ที่เก็บไว้ซึ่งอัปเดตแค่วันละครั้งผ่าน cron) — ยกเว้น
  // สัญญาที่ปิดแล้ว ซึ่งคงสถานะความเสี่ยงล่าสุดไว้เป็นประวัติตามเดิม ไม่คำนวณซ้ำ
  const fromLoans: EffectiveLoan[] = loans.map((l) => {
    const dueDate = l.dueDate ?? l.loanRequest?.repaymentDueDate ?? null;
    return {
      householdId: l.householdId,
      villageId: l.household.villageId,
      headFirstName: l.household.headFirstName,
      headLastName: l.household.headLastName,
      amount: l.amount,
      outstandingBalance: l.outstandingBalance,
      receivedDate: l.receivedDate,
      dueDate,
      isClosed: l.isClosed,
      riskStatus: l.isClosed ? l.riskStatus : calculateRiskStatus(dueDate),
      repayments: l.repayments,
    };
  });

  const fromLoanRequests: EffectiveLoan[] = pendingLoanRequests.map((lr) => {
    const amount = lr.committeeAmount ?? lr.requestedAmount;
    return {
      householdId: lr.householdId,
      villageId: lr.household.villageId,
      headFirstName: lr.household.headFirstName,
      headLastName: lr.household.headLastName,
      amount,
      outstandingBalance: amount,
      receivedDate: lr.requestDate,
      dueDate: lr.repaymentDueDate,
      isClosed: false,
      riskStatus: calculateRiskStatus(lr.repaymentDueDate),
      repayments: [],
    };
  });

  return [...fromLoans, ...fromLoanRequests];
}
