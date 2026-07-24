"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { alertDialog, confirmDialog } from "@/lib/confirmDialog";
import { RiskScoreCard } from "./RiskScoreCard";

type Kind = "proposal" | "loan-request";

const API_PATH: Record<Kind, string> = {
  proposal: "/api/proposals",
  "loan-request": "/api/loan-requests",
};

export function ApproveAction({
  id,
  kind,
  showRiskAssessment,
  defaultChairName,
  approvalCeiling,
}: {
  id: number;
  kind: Kind;
  showRiskAssessment?: boolean;
  /** ชื่อประธานคณะกรรมการ (คำนำหน้า+ชื่อ+เว้น 2 ตัวอักษร+นามสกุล) ของผู้ใช้ที่ล็อกอินอยู่ — เติมอัตโนมัติในช่องนี้
   *  (แก้ไขทับได้ตามปกติ) ให้ประธานไม่ต้องพิมพ์ชื่อตัวเองซ้ำทุกครั้งที่พิจารณาอนุมัติ */
  defaultChairName?: string;
  /** เฉพาะ kind="loan-request" ที่อ้างอิงแบบเสนอโครงการที่อนุมัติแล้ว — วงเงินที่ประธานกรรมการอนุมัติไว้ในแบบ
   *  เสนอโครงการนั้น ใช้ตรวจสอบยอดเงินอนุมัติตรงนี้ด้วยกฎเดียวกับตอนครัวเรือนกรอกยอดขอยืม (ดู loan-requests/new) */
  approvalCeiling?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [chairName, setChairName] = useState(defaultChairName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // ตรวจสอบยอดเงินอนุมัติเทียบกับวงเงินที่อนุมัติไว้ในแบบเสนอโครงการ (กฎเดียวกับตอนครัวเรือนกรอกยอดขอยืม):
    // เกินวงเงิน บล็อกให้แก้ไขก่อน, น้อยกว่าวงเงิน แค่ถามยืนยันเผื่อพิมพ์ผิด ยังอนุมัติน้อยกว่าที่เสนอไว้ได้ตามจริง
    if (decision === "approved" && amount && approvalCeiling != null) {
      const enteredAmount = Number(amount);
      if (enteredAmount > approvalCeiling) {
        await alertDialog({
          title: "วงเงินเกินกว่าที่อนุมัติในแบบเสนอโครงการ",
          text: `ยอดเงินที่กรอก (${enteredAmount.toLocaleString("th-TH")} บาท) เกินกว่าวงเงินที่อนุมัติไว้ในแบบเสนอโครงการนี้ (${approvalCeiling.toLocaleString("th-TH")} บาท) กรุณาแก้ไขจำนวนเงินก่อนดำเนินการต่อ`,
          tone: "danger",
        });
        return;
      }
      if (enteredAmount < approvalCeiling) {
        const proceed = await confirmDialog({
          title: "ยอดเงินน้อยกว่าที่อนุมัติในแบบเสนอโครงการ",
          text: `ยอดเงินที่กรอก (${enteredAmount.toLocaleString("th-TH")} บาท) น้อยกว่าวงเงินที่อนุมัติไว้ในแบบเสนอโครงการนี้ (${approvalCeiling.toLocaleString("th-TH")} บาท) ต้องการดำเนินการต่อด้วยยอดนี้หรือไม่?`,
          confirmButtonText: "ดำเนินการต่อ",
        });
        if (!proceed) return;
      }
    }

    const confirmed =
      decision === "approved"
        ? await confirmDialog({
            title: "ยืนยันการอนุมัติ",
            text: `คุณแน่ใจหรือไม่ที่จะอนุมัติรายการนี้${amount ? ` เป็นจำนวนเงิน ${Number(amount).toLocaleString("th-TH")} บาท` : ""}? เมื่อยืนยันแล้วจะไม่สามารถแก้ไขผลการพิจารณาได้`,
            confirmButtonText: "ยืนยันอนุมัติ",
          })
        : await confirmDialog({
            title: "ยืนยันการไม่อนุมัติ",
            text: "คุณแน่ใจหรือไม่ที่จะไม่อนุมัติรายการนี้? เมื่อยืนยันแล้วจะไม่สามารถแก้ไขผลการพิจารณาได้",
            tone: "danger",
            confirmButtonText: "ยืนยันไม่อนุมัติ",
          });
    if (!confirmed) return;

    setError(null);
    setSubmitting(true);
    const res = await fetch(`${API_PATH[kind]}/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        committeeDecision: decision,
        committeeAmount: decision === "approved" && amount ? Number(amount) : undefined,
        committeeReason: reason || undefined,
        committeeChairName: chairName || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? body?.error?.fieldErrors?.committeeReason?.[0] ?? "บันทึกไม่สำเร็จ");
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
        className="inline-flex min-h-9 items-center rounded-full border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
      >
        พิจารณาอนุมัติ
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
      {showRiskAssessment && <RiskScoreCard id={id} kind={kind} />}
      <div className="flex gap-2">
        <label className="flex items-center gap-1.5 text-sm text-slate-700">
          <input type="radio" name={`decision-${kind}-${id}`} value="approved" checked={decision === "approved"} onChange={() => setDecision("approved")} required />
          อนุมัติ
        </label>
        <label className="flex items-center gap-1.5 text-sm text-slate-700">
          <input type="radio" name={`decision-${kind}-${id}`} value="rejected" checked={decision === "rejected"} onChange={() => setDecision("rejected")} />
          ไม่อนุมัติ
        </label>
      </div>
      {decision === "approved" && (
        <input
          type="number"
          placeholder="จำนวนเงินที่อนุมัติ (บาท)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
        />
      )}
      {decision === "rejected" && (
        <input
          type="text"
          placeholder="เหตุผลที่ไม่อนุมัติ"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
        />
      )}
      <input
        type="text"
        placeholder="ชื่อประธานคณะกรรมการ"
        value={chairName}
        onChange={(e) => setChairName(e.target.value)}
        className="min-h-9 rounded-lg border border-slate-300 px-2 text-sm"
      />
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !decision}
          className="min-h-9 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "กำลังบันทึก..." : "ยืนยันผลการพิจารณา"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-9 rounded-lg px-3 text-xs text-slate-500">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
