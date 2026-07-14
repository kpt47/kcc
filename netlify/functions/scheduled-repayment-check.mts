// Netlify Scheduled Function — แทน node-cron (ใช้ setInterval อยู่รอดไม่ได้ใน serverless) และแทน
// Vercel Cron Jobs (vercel.json) บนแพลตฟอร์มนี้ — เรียก runDailyRepaymentCheck() ตรงๆ ไม่ผ่าน HTTP endpoint
// เพราะฟังก์ชันนี้ไม่ผูกกับ Next.js request context เลย (import แบบ relative path ไม่ใช้ @/ alias
// เพราะ Netlify function bundler แยกจาก Next.js อาจไม่รู้จัก path alias ของ tsconfig)
export default async () => {
  const { runDailyRepaymentCheck } = await import("../../src/lib/notifications/repayment-check");
  try {
    const summary = await runDailyRepaymentCheck();
    console.log("[netlify-scheduled] ตรวจสอบการชำระเงินยืมประจำวันสำเร็จ:", summary);
  } catch (error) {
    console.error("[netlify-scheduled] ตรวจสอบการชำระเงินยืมประจำวันล้มเหลว:", error);
  }
};

export const config = { schedule: "0 8 * * *" };
