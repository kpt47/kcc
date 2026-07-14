import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import type { CurrentUser } from "@/lib/auth";
import type { ReactNode } from "react";

// ถ้ายังไม่ได้ล็อกอิน (เช่นหน้า /login) ไม่ต้องแสดงแถบเมนู ปล่อยให้หน้านั้นจัดหน้าเอง
//
// Responsive layout:
// - Desktop/Tablet ขนาดใหญ่ (md ขึ้นไป): Sidebar เมนูด้านข้างแสดงตลอดเวลา (ไม่มี TopNav/BottomNav)
// - มือถือ/แท็บเล็ตขนาดเล็ก (ต่ำกว่า md): TopNav (แถบบน + Hamburger) + BottomNav (แถบล่าง เมนูหลัก)
export function AppShell({ user, children }: { user: CurrentUser | null; children: ReactNode }) {
  if (!user) return <>{children}</>;
  return (
    <div className="flex min-h-full">
      <Sidebar user={user} />
      <div className="flex min-h-full flex-1 flex-col">
        <TopNav user={user} />
        <div className="flex flex-1 flex-col pb-16 md:pb-0">{children}</div>
        <BottomNav user={user} />
      </div>
    </div>
  );
}
