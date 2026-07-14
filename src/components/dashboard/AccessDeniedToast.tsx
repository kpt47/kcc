"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { errorToast } from "@/lib/confirmDialog";

const ACCESS_DENIED_MESSAGE = "Access Denied: คุณไม่มีสิทธิ์เข้าถึงหน้านี้";

// แสดง Toast แจ้งเตือนเมื่อ Route Guard (src/proxy.ts) เด้งผู้ใช้กลับมาที่หน้านี้ด้วย ?denied=1
// เพราะพยายามเข้าหน้าเว็บที่ตนไม่มีสิทธิ์ — ลบ query param ออกจาก URL ทันทีหลังแสดง Toast
// เพื่อไม่ให้ toast เด้งซ้ำถ้าผู้ใช้กด refresh หน้า
export function AccessDeniedToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const denied = searchParams.get("denied");

  useEffect(() => {
    if (denied !== "1") return;
    errorToast(ACCESS_DENIED_MESSAGE);
    router.replace(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [denied]);

  return null;
}
