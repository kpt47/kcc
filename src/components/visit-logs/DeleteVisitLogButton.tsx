"use client";

import { useRouter } from "next/navigation";
import { confirmDialog } from "@/lib/confirmDialog";

export function DeleteVisitLogButton({ id }: { id: number }) {
  const router = useRouter();

  async function handleDelete() {
    const confirmed = await confirmDialog({
      title: "ลบบันทึกการติดตาม?",
      text: "คุณแน่ใจหรือไม่ที่จะลบบันทึกนี้? การลบไม่สามารถกู้คืนได้",
      tone: "danger",
      confirmButtonText: "ลบบันทึก",
    });
    if (!confirmed) return;
    const res = await fetch(`/api/visit-logs/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
      return;
    }
    const body = await res.json().catch(() => null);
    await confirmDialog({
      title: "ลบไม่สำเร็จ",
      text: body?.error?.formErrors?.[0] ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      tone: "danger",
      confirmButtonText: "ตกลง",
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="inline-flex min-h-9 items-center rounded-full border border-rose-300 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400"
    >
      ลบ
    </button>
  );
}
