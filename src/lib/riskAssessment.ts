// ประเมินความเสี่ยงของ "คำขอกู้ใหม่" ก่อนพัฒนากร/ประธานฯ ตัดสินใจให้ความเห็น/อนุมัติแบบฟอร์ม 1/2
// คนละส่วนกับ lib/risk.ts ซึ่งติดตามหนี้ที่ปล่อยกู้ไปแล้วจากวันครบกำหนดชำระ (เล่มเหลืองที่เปิดอยู่)
// ไฟล์นี้ผสานข้อมูลเล่มม่วง (รายได้ จปฐ./จำนวนสมาชิกครัวเรือน) กับประวัติเล่มเหลือง (การกู้ยืมในอดีต)
// เพื่อสนับสนุนการตัดสินใจ ณ จุดพิจารณาอนุมัติ ไม่ใช่การมอนิเตอร์หนี้ที่จ่ายไปแล้ว
import { prisma } from "./prisma";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface RiskAssessment {
  level: RiskLevel;
  headline: string;
  reasons: string[];
  dashboard: {
    requestedAmount: number;
    overdueAmount: number;
    annualHouseholdIncome: number | null;
    borrowRound: number;
  };
}

// สัดส่วนยอดขอกู้ต่อรายได้ครัวเรือนต่อปี ที่ถือว่า "ค่อนข้างสูง" (ปานกลาง) และ "เกินกำลัง" (สูง)
const MEDIUM_AMOUNT_TO_INCOME_RATIO = 0.6;
const HIGH_AMOUNT_TO_INCOME_RATIO = 1.2;

export async function assessHouseholdRisk(householdId: number, requestedAmount: number): Promise<RiskAssessment> {
  const household = await prisma.targetHousehold.findUnique({
    where: { id: householdId },
    select: { incomeBeforeLoan: true, memberCount: true, loans: true },
  });

  const loans = household?.loans ?? [];
  const now = new Date();

  const overdueLoans = loans.filter(
    (l) => !l.isClosed && l.outstandingBalance > 0 && (l.riskStatus === "HIGH_RISK" || (l.dueDate !== null && l.dueDate < now))
  );
  const hasOverdueDebt = overdueLoans.length > 0;
  const overdueAmount = overdueLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);

  const hasLatePaymentHistory = loans.some((l) => l.riskStatus !== "NORMAL");
  const isFirstTimeBorrower = loans.length === 0;

  const annualHouseholdIncome =
    household?.incomeBeforeLoan != null ? household.incomeBeforeLoan * (household.memberCount ?? 1) : null;
  const incomeRatio =
    annualHouseholdIncome !== null && annualHouseholdIncome > 0 ? requestedAmount / annualHouseholdIncome : null;

  const amountExceedsCapacity = incomeRatio !== null && incomeRatio > HIGH_AMOUNT_TO_INCOME_RATIO;
  const amountHighRelativeToIncome = incomeRatio !== null && incomeRatio > MEDIUM_AMOUNT_TO_INCOME_RATIO;

  const reasons: string[] = [];
  let level: RiskLevel;

  if (hasOverdueDebt) {
    reasons.push(`ครัวเรือนนี้ยังมียอดหนี้ค้างชำระ ${overdueAmount.toLocaleString("th-TH")} บาทจากโครงการ/เงินยืมก่อนหน้า`);
  }
  if (amountExceedsCapacity) {
    reasons.push("รายได้ จปฐ. ของครัวเรือนต่ำมากเมื่อเทียบกับยอดขอกู้ครั้งนี้ ซึ่งเกินกำลังในการชำระคืน");
  }

  if (hasOverdueDebt || amountExceedsCapacity) {
    level = "HIGH";
  } else {
    if (hasLatePaymentHistory) reasons.push("มีประวัติส่งคืนเงินล่าช้าในรอบก่อนหน้า");
    if (isFirstTimeBorrower && amountHighRelativeToIncome) {
      reasons.push("เป็นการกู้ยืมครั้งแรก และยอดขอกู้ค่อนข้างสูงเมื่อเทียบกับรายได้ จปฐ.");
    }
    if (hasLatePaymentHistory || (isFirstTimeBorrower && amountHighRelativeToIncome)) {
      level = "MEDIUM";
    } else {
      level = "LOW";
      reasons.push(
        isFirstTimeBorrower
          ? "เป็นการกู้ยืมครั้งแรก และยอดขอกู้สอดคล้องกับรายได้ จปฐ."
          : "ประวัติการส่งเงินคืนดีเยี่ยม ไม่เคยมีหนี้ค้างชำระ และรายได้ จปฐ. เพียงพอต่อการชำระหนี้"
      );
    }
  }

  const headline =
    level === "HIGH"
      ? `⚠️ ความเสี่ยงสูง: ${reasons[0]}`
      : level === "MEDIUM"
        ? `🟡 ความเสี่ยงปานกลาง: ${reasons[0]}`
        : `✅ ความเสี่ยงต่ำ: ${reasons[0]}`;

  return {
    level,
    headline,
    reasons,
    dashboard: {
      requestedAmount,
      overdueAmount,
      annualHouseholdIncome,
      borrowRound: loans.length + 1,
    },
  };
}
