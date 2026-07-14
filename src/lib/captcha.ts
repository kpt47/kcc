// ตรวจสอบ Cloudflare Turnstile Token ก่อนอนุญาตให้ตรวจสอบ Username/Password เสมอ (ป้องกัน Brute-force/Bot)
// การตัดสินใจ "ข้าม CAPTCHA" (bypass) ทำที่ฝั่งเซิร์ฟเวอร์เท่านั้น จากตัวแปรแวดล้อมของเซิร์ฟเวอร์เอง
// (TURNSTILE_SECRET_KEY) ไม่มีทางที่ client จะสั่งข้ามการตรวจสอบนี้ได้ — หากยังไม่ได้ตั้งค่าจริง (dev/sandbox)
// จะข้ามการตรวจสอบและ log ไว้ เพื่อให้ทดสอบระบบได้โดยไม่ต้องมี credential จริง
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(token: string | null): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.log("[captcha] TURNSTILE_SECRET_KEY ยังไม่ได้ตั้งค่า — ข้ามการตรวจสอบ CAPTCHA (โหมดพัฒนา/ทดสอบ)");
    return true;
  }

  if (!token) return false;

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: secretKey, response: token }),
    });
    const data: { success?: boolean } = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("[captcha] เรียก Turnstile siteverify ล้มเหลว", err);
    return false;
  }
}
