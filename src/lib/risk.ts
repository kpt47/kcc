// ประเมินความเสี่ยงและจัดลำดับเครดิตของครัวเรือนเป้าหมายแบบอัตโนมัติ อ้างอิงวันครบกำหนดชำระ (Loan.dueDate)
// รันเป็นส่วนหนึ่งของ cron งานตรวจสอบการชำระเงินยืมประจำวัน (ดู src/lib/notifications/repayment-check.ts)
import { prisma } from "./prisma";
import type { RiskStatus } from "@/generated/prisma/client";

const WATCHLIST_BEFORE_DUE_DAYS = 15; // เข้าเฝ้าระวังเมื่อใกล้ถึงกำหนดชำระใน 15 วัน
const HIGH_RISK_AFTER_DUE_DAYS = 30; // เข้าเสี่ยงสูงเมื่อเลยกำหนดชำระเกิน 30 วัน

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * คำนวณสถานะเครดิตของเงินยืมก้อนหนึ่ง จากวันครบกำหนดชำระ (dueDate) เทียบกับวันนี้:
 * - ยังไม่มี dueDate กำหนดไว้ -> NORMAL (คำนวณไม่ได้ ถือว่าปกติไปก่อน)
 * - เกิน 15 วันก่อนถึงกำหนด -> NORMAL
 * - ตั้งแต่ 15 วันก่อนกำหนด จนถึงเลยกำหนดไม่เกิน 30 วัน -> WATCHLIST
 * - เลยกำหนดชำระเกิน 30 วัน -> HIGH_RISK
 */
export function calculateRiskStatus(dueDate: Date | null, now: Date = new Date()): RiskStatus {
  if (!dueDate) return "NORMAL";

  const today = startOfDay(now);
  const due = startOfDay(dueDate);
  const daysOverdue = Math.round((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

  if (daysOverdue > HIGH_RISK_AFTER_DUE_DAYS) return "HIGH_RISK";
  if (daysOverdue >= -WATCHLIST_BEFORE_DUE_DAYS) return "WATCHLIST";
  return "NORMAL";
}

/**
 * คำนวณและอัปเดตสถานะเครดิตของเงินยืมทุกก้อนที่ยังไม่ปิดสัญญาใหม่ทั้งหมด (รันทุกวันผ่าน cron)
 * เงินยืมที่ปิดสัญญาแล้วไม่ต้องคำนวณซ้ำ (คงสถานะล่าสุดไว้เป็นประวัติ)
 */
export async function recalculateLoanRiskStatuses(now: Date = new Date()): Promise<number> {
  const openLoans = await prisma.loan.findMany({
    where: { isClosed: false },
    select: { id: true, dueDate: true, riskStatus: true },
  });

  let updatedCount = 0;
  for (const loan of openLoans) {
    const nextStatus = calculateRiskStatus(loan.dueDate, now);
    if (nextStatus !== loan.riskStatus) {
      await prisma.loan.update({ where: { id: loan.id }, data: { riskStatus: nextStatus } });
      updatedCount += 1;
    }
  }
  return updatedCount;
}
