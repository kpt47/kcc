import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// รับ callback จากกระบวนการเชื่อมต่อ LINE — รองรับทั้ง 2 เส้นทาง:
// (1) จริง: LINE ส่ง ?code=...&state=<userId> กลับมา -> แลก code เป็น access token + profile จริง
// (2) จำลอง (โหมดพัฒนา/ทดสอบ): หน้า /line/mock-link ส่ง ?mock=1 มาที่นี่โดยตรง -> ผูก lineId จำลองให้ผู้ใช้ที่ล็อกอินอยู่
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const isMock = url.searchParams.get("mock") === "1";

  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const redirectUri = process.env.LINE_LOGIN_REDIRECT_URI;

  if (code && state && channelId && channelSecret && redirectUri) {
    try {
      const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: channelId,
          client_secret: channelSecret,
        }),
      });
      const tokenData: { access_token?: string } = await tokenRes.json();
      if (!tokenData.access_token) throw new Error("ไม่ได้รับ access_token จาก LINE");

      const profileRes = await fetch("https://api.line.me/v2/profile", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile: { userId?: string } = await profileRes.json();
      if (!profile.userId) throw new Error("ไม่ได้รับ userId จาก LINE profile");

      await prisma.user.update({ where: { id: Number(state) }, data: { lineId: profile.userId } });
      return NextResponse.redirect(new URL("/profile", request.url));
    } catch (err) {
      console.error("[line/callback] เชื่อมต่อ LINE จริงล้มเหลว", err);
      return NextResponse.redirect(new URL("/profile?lineError=1", request.url));
    }
  }

  if (isMock) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    await prisma.user.update({ where: { id: user.id }, data: { lineId: `mock-line-${user.id}` } });
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  return NextResponse.redirect(new URL("/profile?lineError=1", request.url));
}
