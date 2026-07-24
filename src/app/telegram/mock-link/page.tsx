import Link from "next/link";
import { requireUser } from "@/lib/auth";

// หน้าจำลองการยืนยันเชื่อมต่อ Telegram (ใช้เมื่อยังไม่ได้ตั้งค่า TELEGRAM_BOT_USERNAME จริง) — จำลองหน้ายืนยัน
// เริ่มแชทกับบอทเพื่อให้ทดสอบ flow เชื่อมต่อบัญชีได้ครบวงจรโดยไม่ต้องมี Telegram Bot จริง
// เมื่อมี credential จริงแล้ว ผู้ใช้จะไม่เห็นหน้านี้อีก (ดู GET /api/telegram/link ที่ตรวจสอบ env ก่อน redirect มาที่นี่)
export default async function MockTelegramLinkPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1 text-center">
        <p className="text-sm font-semibold text-[#26A5E4]">จำลองหน้ายืนยันการเชื่อมต่อ Telegram</p>
        <h1 className="text-xl font-bold text-slate-900">อนุญาตให้ระบบ กข.คจ. เชื่อมต่อบัญชี Telegram ของคุณ?</h1>
        <p className="text-sm text-slate-600">
          บัญชี: <span className="font-medium text-slate-800">{user.displayName}</span>
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs text-slate-500">
          นี่คือหน้าจำลอง (Mock) เนื่องจากระบบยังไม่ได้ตั้งค่า Telegram Bot จริง (TELEGRAM_BOT_USERNAME) —
          เมื่อกด &quot;อนุญาต&quot; ระบบจะผูกบัญชี Telegram จำลองให้ทันทีเพื่อทดสอบการแจ้งเตือน
        </p>
        <a
          href="/api/telegram/callback?mock=1"
          className="min-h-11 rounded-lg bg-[#26A5E4] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:brightness-95"
        >
          อนุญาต (Allow)
        </a>
        <Link
          href="/profile"
          className="min-h-11 rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-600"
        >
          ยกเลิก
        </Link>
      </div>
    </main>
  );
}
