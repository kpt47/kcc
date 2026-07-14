export function KpiCard({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: string;
  tone?: "default" | "warn" | "good";
  hint?: string;
}) {
  const toneClass =
    tone === "warn" ? "text-amber-700" : tone === "good" ? "text-emerald-700" : "text-slate-900";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold sm:text-2xl ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
