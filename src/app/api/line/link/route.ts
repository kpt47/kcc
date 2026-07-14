import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// เริ่มกระบวนการเชื่อมต่อบัญชี LINE — ถ้าตั้งค่า LINE_CHANNEL_ID/LINE_LOGIN_REDIRECT_URI จริงไว้แล้ว
// จะ redirect ไปหน้ายืนยันตัวตนจริงของ LINE Login มิฉะนั้น (โหมดพัฒนา/ทดสอบ) จะ redirect ไปหน้าจำลอง
// state ใช้ userId ของผู้ใช้ที่ล็อกอินอยู่ เพื่อให้ callback รู้ว่าจะผูก lineId เข้ากับบัญชีใด
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const channelId = process.env.LINE_CHANNEL_ID;
  const redirectUri = process.env.LINE_LOGIN_REDIRECT_URI;

  if (channelId && redirectUri) {
    const authorizeUrl = new URL("https://access.line.me/oauth2/v2.1/authorize");
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", channelId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("state", String(user.id));
    authorizeUrl.searchParams.set("scope", "profile openid");
    return NextResponse.redirect(authorizeUrl);
  }

  console.log("[line/link] LINE_CHANNEL_ID ยังไม่ได้ตั้งค่า — ใช้หน้ายืนยันจำลอง (โหมดพัฒนา/ทดสอบ)");
  return NextResponse.redirect(new URL("/line/mock-link", request.url));
}
