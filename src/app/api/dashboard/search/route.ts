import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchDashboard } from "@/lib/dashboardSearch";

// กล่องค้นหาอัจฉริยะ (Smart Omnibar Search) — ค้นหาข้ามตาราง (หมู่บ้าน/ครัวเรือน/ปีงบประมาณ/วาระการประชุม)
// พร้อมกันในคำค้นหาเดียว การจำกัดเขตพื้นที่และสิทธิ์ตาม role ทั้งหมดอยู่ใน lib/dashboardSearch.ts
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";

  const results = await searchDashboard(user, q);
  return NextResponse.json({ results });
}
