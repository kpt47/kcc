// ลงทะเบียาน cron job ตรวจสอบการชำระเงินยืมประจำวัน — รันทุกวันเวลา 08:00 น. (0 8 * * *)
// อ้างอิง: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md
// register() ถูกเรียกครั้งเดียวตอน server instance เริ่มทำงาน — ทำงานได้ทั้ง Node.js และ Edge runtime
// จึงต้องเช็ค NEXT_RUNTIME เพื่อลงทะเบียน cron เฉพาะฝั่ง Node.js เท่านั้น (node-cron ใช้ setInterval ของ Node)

declare global {
  // eslint-disable-next-line no-var
  var __repaymentCheckCronRegistered: boolean | undefined;
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // บน Vercel งานนี้ถูกเรียกผ่าน Vercel Cron Jobs (ดู vercel.json + /api/cron/repayment-check) แทน
  // เพราะ node-cron ใช้ setInterval ซึ่งอยู่รอดไม่ได้ในสภาพแวดล้อม serverless ที่ instance ถูกปิดระหว่าง request
  if (process.env.VERCEL) return;
  // บน Netlify งานนี้ถูกเรียกผ่าน Netlify Scheduled Function แทนด้วยเหตุผลเดียวกัน
  // (ดู netlify/functions/scheduled-repayment-check.mts) — Render ไม่ต้องข้าม เพราะเป็นเซิร์ฟเวอร์ต่อเนื่อง
  // เหมือน local dev/VPS ไม่ใช่ serverless จึงให้ node-cron ทำงานตามปกติ
  if (process.env.NETLIFY) return;
  if (globalThis.__repaymentCheckCronRegistered) return;
  globalThis.__repaymentCheckCronRegistered = true;

  const cron = await import("node-cron");
  const { runDailyRepaymentCheck } = await import("@/lib/notifications/repayment-check");

  cron.schedule("0 8 * * *", async () => {
    try {
      const summary = await runDailyRepaymentCheck();
      console.log("[cron] ตรวจสอบการชำระเงินยืมประจำวันสำเร็จ:", summary);
    } catch (error) {
      console.error("[cron] ตรวจสอบการชำระเงินยืมประจำวันล้มเหลว:", error);
    }
  });

  console.log("[cron] ลงทะเบียนงานตรวจสอบการชำระเงินยืมประจำวัน (0 8 * * *) สำเร็จ");
}
