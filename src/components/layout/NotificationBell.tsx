"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatThaiDate } from "@/lib/formatDate";

type NotificationItem = {
  id: number;
  message: string;
  type: "ALERT" | "REMINDER";
  isRead: boolean;
  link: string | null;
  createdAt: string;
};

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}

export function NotificationBell({ openUpward }: { openUpward?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  async function loadNotifications() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  }

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markAsRead(id: number) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
  }

  async function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await fetch("/api/notifications/read-all", { method: "PATCH" });
  }

  async function handleNotificationClick(n: NotificationItem) {
    await markAsRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  const unreadNotifications = notifications.filter((n) => !n.isRead);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
        aria-label="การแจ้งเตือน"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        // เปิดขึ้นด้านบนแทนด้านล่างเมื่อใช้ในแถบท้าย Sidebar (openUpward) เพราะปุ่มอยู่ติดขอบล่างสุดของจอเสมอ
        // เปิดลงแบบเดิม (mt-2) ตอนอยู่ใน TopNav ซึ่งอยู่ด้านบนของจอ มีที่ว่างด้านล่างเพียงพอ — และยึดขอบซ้าย
        // (left-0) แทนขอบขวา (right-0) ตอนอยู่ใน Sidebar เพราะปุ่มอยู่ในคอลัมน์แคบชิดขอบขวาสุด ถ้ายึดขอบขวา
        // กางออกทางซ้ายจะล้นขอบจอซ้ายไปเลย (มองไม่เห็น/กดไม่ได้เหมือนปัญหาเดิม)
        <div
          className={`absolute z-30 max-h-96 w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg ${
            openUpward ? "bottom-full left-0 mb-2" : "right-0 mt-2"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-slate-700">การแจ้งเตือน</span>
            {unreadNotifications.length > 0 && (
              <button
                type="button"
                className="text-xs font-medium text-emerald-700 hover:underline"
                onClick={markAllAsRead}
              >
                ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
              </button>
            )}
          </div>

          {unreadNotifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">ไม่มีการแจ้งเตือนที่ยังไม่ได้อ่าน</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {unreadNotifications.map((n) => (
                <li key={n.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        n.type === "ALERT" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {n.type === "ALERT" ? "แจ้งเตือน" : "เตือนความจำ"}
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {formatThaiDate(n.createdAt)}
                    </span>
                  </div>
                  {n.link ? (
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className="mt-1 text-left text-sm leading-relaxed text-slate-700 hover:text-emerald-700 hover:underline"
                    >
                      {n.message}
                    </button>
                  ) : (
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">{n.message}</p>
                  )}
                  <button
                    type="button"
                    className="mt-1.5 block text-xs font-medium text-emerald-700 hover:underline"
                    onClick={() => markAsRead(n.id)}
                  >
                    ทำเครื่องหมายว่าอ่านแล้ว
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
