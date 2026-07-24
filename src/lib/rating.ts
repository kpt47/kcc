import type { RiskStatus } from "@/generated/prisma/client";

const RISK_STARS: Record<RiskStatus, number> = { HIGH_RISK: 1, WATCHLIST: 3, NORMAL: 4 };
const RISK_RANK: Record<RiskStatus, number> = { NORMAL: 0, WATCHLIST: 1, HIGH_RISK: 2 };

export type HouseholdStarRating = { stars: number; label: string };

/**
 * แปลงสถานะสัญญายืมเงินของครัวเรือนหนึ่งๆ เป็นดาว 1-5 ดวง — ครัวเรือนอาจมีหลายสัญญา (borrowRound หลายรอบ)
 * จึงใช้สถานะที่แย่ที่สุดในบรรดาสัญญาที่ยังไม่ปิด (isClosed === false) เป็นตัวกำหนด (ตรงกับหลักการเดียวกับ
 * overallRiskStatus ใน HouseholdDashboard.tsx เดิม) คืนค่า null เมื่อไม่เคยมีสัญญาเลย เพราะยังไม่มีข้อมูลให้วัด
 */
export function getHouseholdStarRating(household: {
  isDefaulted: boolean;
  loans: { isClosed: boolean; riskStatus: RiskStatus }[];
}): HouseholdStarRating | null {
  if (household.isDefaulted) return { stars: 1, label: "ผิดสัญญา" };

  const openLoans = household.loans.filter((l) => !l.isClosed);
  if (openLoans.length > 0) {
    const worst = openLoans.reduce((acc, l) => (RISK_RANK[l.riskStatus] > RISK_RANK[acc] ? l.riskStatus : acc), "NORMAL" as RiskStatus);
    const labels: Record<RiskStatus, string> = { NORMAL: "ปกติ", WATCHLIST: "เฝ้าระวัง", HIGH_RISK: "เสี่ยงสูง" };
    return { stars: RISK_STARS[worst], label: labels[worst] };
  }

  if (household.loans.length > 0) return { stars: 5, label: "ปิดสัญญาครบถ้วน" };

  return null;
}
