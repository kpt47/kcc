// แยกออกมาจาก analytics.ts โดยตั้งใจ — ไฟล์นี้ต้อง "ปลอดภัยสำหรับ client" (ไม่ import prisma หรือโค้ดฝั่ง
// เซิร์ฟเวอร์ใดๆ) เพราะ OverviewReportMapInner.tsx (client component) ต้องใช้ regionRiskTier() โดยตรงเพื่อ
// ระบายสีแผนที่ — ถ้า import ฟังก์ชันนี้จาก analytics.ts (ซึ่ง import prisma) จะดึงทั้งโมดูลรวมถึง
// @prisma/client เข้าไปใน client bundle ด้วย ทำให้ build พังเพราะ Prisma runtime ใช้ node:module ซึ่งรันบน
// เบราว์เซอร์ไม่ได้
export type DebtRiskTier = "normal" | "watchlist" | "highRisk";

/**
 * ระดับความเสี่ยงหนี้ของพื้นที่ — นับจาก "จำนวนสัญญา" ตามสถานะเครดิตจริงของแต่ละสัญญา (Loan.riskStatus ซึ่ง
 * คำนวณจากวันครบกำหนดชำระผ่าน calculateRiskStatus() ใน src/lib/risk.ts และอัปเดตทุกวันผ่าน cron) — ไม่ใช่
 * อัตราส่วนมูลค่าเงิน (overdue/outstanding) แบบเดิม เพราะการนับจำนวนสัญญาเข้าใจง่ายกว่าสำหรับชาวบ้านทั่วไป
 * (เช่น "มี 2 ใน 10 สัญญาเสี่ยงสูง" เข้าใจง่ายกว่า "อัตรา NPL 23.4%") และตรงกับตัวเลข ปกติ/เฝ้าระวัง/เสี่ยงสูง
 * ที่แสดงอยู่แล้วในหน้า Dashboard (getNplStatus) ทำให้ทั้งแอปใช้นิยามความเสี่ยงเดียวกันสอดคล้องกันหมด
 */
export function regionRiskTier(normalCount: number, watchlistCount: number, highRiskCount: number): DebtRiskTier {
  const total = normalCount + watchlistCount + highRiskCount;
  if (total === 0) return "normal";
  const highShare = highRiskCount / total;
  const watchShare = (watchlistCount + highRiskCount) / total;
  if (highShare > 0.25) return "highRisk";
  if (watchShare > 0.1) return "watchlist";
  return "normal";
}
