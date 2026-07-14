"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmDialog } from "@/lib/confirmDialog";
import { RiskScoreCard } from "./RiskScoreCard";

type Kind = "proposal" | "loan-request";

const OPINION_OPTIONS: Record<Kind, { value: string; label: string }[]> = {
  proposal: [
    { value: "possible", label: "เป็นไปได้" },
    { value: "not_possible", label: "เป็นไปไม่ได้" },
  ],
  "loan-request": [
    { value: "agree", label: "เห็นชอบ" },
    { value: "disagree", label: "ไม่เห็นชอบ" },
  ],
};

const API_PATH: Record<Kind, string> = {
  proposal: "/api/proposals",
  "loan-request": "/api/loan-requests",
};

const NEGATIVE_VALUE: Record<Kind, string> = {
  proposal: "not_possible",
  "loan-request": "disagree",
};

export function WorkerOpinionAction({
  id,
  kind,
  showRiskAssessment,
}: {
  id: number;
  kind: Kind;
  showRiskAssessment?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [opinion, setOpinion] = useState("");
  const [reason, setReason] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const opinionLabel = OPINION_OPTIONS[kind].find((o) => o.value === opinion)?.label ?? opinion;
    const confirmed = await confirmDialog({
      title: "ยืนยันการบันทึกความเห็น",
      text: `คุณต้องการบันทึกความเห็นของพัฒนากรเป็น "${opinionLabel}" ใช่หรือไม่? เมื่อบันทึกแล้วจะส่งต่อไปยังขั้นตอนการพิจารณาของประธานคณะกรรมการ`,
      confirmButtonText: "ยืนยันบันทึก",
    });
    if (!confirmed) return;

    setError(null);
    setSubmitting(true);
    const res = await fetch(`${API_PATH[kind]}/${id}/worker-opinion`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerOpinion: opinion, workerReason: reason || undefined, workerName: workerName || undefined }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? body?.error?.fieldErrors?.workerReason?.[0] ?? "บันทึกไม่สำเร็จ");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center rounded-full border border-sky-300 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-50"
      >
        ให้ความเห็นพัฒนากร
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3">
      {showRiskAssessment && <RiskScoreCard id={id} kind={kind} />}
      <div className="flex gap-2">
        {OPINION_OPTIONS[kind].map((o) => (
          <label key={o.value} className="flex items-center gap-1.5 text-sm text-slate-700">
            <input
              type="radio"
              name={`opinion-${kind}-${id}`}
              value={o.value}
              checked={opinion === o.value}
              onChange={() => setOpinion(o.value)}
              required
            />
            {o.label}
          </label>
        ))}
      </div>
      {opinion === NEGATIVE_VALUE[kind] && (
        <input
          type="text"
          placeholder="เหตุผล"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
        />
      )}
      <input
        type="text"
        placeholder="ชื่อพัฒนากรผู้รับผิดชอบ"
        value={workerName}
        onChange={(e) => setWorkerName(e.target.value)}
        className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
      />
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !opinion}
          className="min-h-9 rounded-lg bg-sky-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "กำลังบันทึก..." : "บันทึกความเห็น"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-9 rounded-lg px-3 text-xs text-slate-500">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
