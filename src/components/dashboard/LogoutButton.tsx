"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-3.5 text-xs font-semibold text-slate-500 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-60"
    >
      {loading ? "กำลังออก..." : "ออกจากระบบ"}
    </button>
  );
}
