import { NextResponse } from "next/server";
import { runDailyRepaymentCheck } from "@/lib/notifications/repayment-check";

// ปลายทางสำหรับ Vercel Cron Jobs (ดู vercel.json) — รันงานตรวจสอบการชำระเงินยืมประจำวันแทน node-cron
// ในสภาพแวดล้อม serverless ซึ่งไม่มีโปรเซสที่รันตลอดเวลาให้ node-cron ทำงานได้
// ยืนยันตัวตนด้วย CRON_SECRET (Vercel ใส่ให้อัตโนมัติเป็น Authorization: Bearer <CRON_SECRET> ทุกครั้งที่ยิง cron)
// ถ้ายังไม่ได้ตั้งค่า CRON_SECRET (เช่น ทดสอบในเครื่อง) จะไม่บังคับตรวจสอบ เพื่อให้ทดสอบผ่าน curl ได้สะดวก
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const summary = await runDailyRepaymentCheck();
  return NextResponse.json(summary);
}
