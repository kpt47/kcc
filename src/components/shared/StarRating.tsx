import { Star } from "lucide-react";

/** แสดงดาว 1-5 ดวง (แสดงผลอย่างเดียว ไม่ใช่ให้กดให้คะแนน) — ใช้กับเรตติ้งสถานะสัญญาของครัวเรือนเป้าหมาย */
export function StarRating({ rating, size = 24, label }: { rating: number; size?: number; label?: string }) {
  return (
    <div className="flex items-center gap-1" title={label} aria-label={label}>
      {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
        <Star
          key={n}
          width={size}
          height={size}
          className={n <= rating ? "shrink-0 fill-amber-400 text-amber-400" : "shrink-0 fill-none text-slate-300 dark:text-slate-600"}
          aria-hidden
        />
      ))}
      {label && <span className="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>}
    </div>
  );
}
