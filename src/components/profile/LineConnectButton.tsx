"use client";

// เชื่อมต่อบัญชี LINE ของผู้ใช้กับระบบ (LINE Messaging API) — กดปุ่มแล้วพาไปหน้า OAuth ผ่าน GET /api/line/link
// ซึ่งจะ redirect ไปหน้ายืนยันจริงของ LINE (ถ้าตั้งค่า LINE_CHANNEL_ID ไว้) หรือหน้าจำลอง (mock) ถ้ายังไม่ได้ตั้งค่า
export function LineConnectButton({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <p className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700">
        เชื่อมต่อ LINE แล้ว ✅
      </p>
    );
  }

  return (
    <a
      href="/api/line/link"
      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#06C755] px-4 text-sm font-semibold text-white transition hover:brightness-95"
    >
      เชื่อมต่อ LINE (Link with LINE)
    </a>
  );
}
