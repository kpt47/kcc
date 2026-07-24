"use client";

// เชื่อมต่อบัญชี Telegram ของผู้ใช้กับระบบ (Telegram Bot API) — กดปุ่มแล้วพาไปเริ่มแชทกับบอทผ่าน GET /api/telegram/link
// ซึ่งจะพาไปที่ลิงก์แชทบอทจริง (ถ้าตั้งค่า TELEGRAM_BOT_USERNAME ไว้) หรือหน้าจำลอง (mock) ถ้ายังไม่ได้ตั้งค่า
export function TelegramConnectButton({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <p className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700">
        เชื่อมต่อ Telegram แล้ว ✅
      </p>
    );
  }

  return (
    <a
      href="/api/telegram/link"
      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#26A5E4] px-4 text-sm font-semibold text-white transition hover:brightness-95"
    >
      เชื่อมต่อ Telegram (Connect Telegram)
    </a>
  );
}
