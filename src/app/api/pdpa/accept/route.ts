import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recordPdpaConsent } from "@/lib/pdpa";

// บันทึกความยินยอม PDPA เวอร์ชันปัจจุบันของผู้ใช้ที่ล็อกอินอยู่ — เรียกจาก PdpaConsentGate เท่านั้น
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  await recordPdpaConsent(user.id, request);
  return NextResponse.json({ ok: true }, { status: 201 });
}
