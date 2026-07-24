"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EvidenceUploadButton } from "@/components/workflow/EvidenceUploadButton";
import { successAlert } from "@/lib/confirmDialog";

const TOPIC_OPTIONS = [
  { value: "CONSULT", label: "ปรึกษา" },
  { value: "COMPLAINT", label: "ร้องทุกข์" },
  { value: "OTHER", label: "อื่นๆ" },
] as const;

export function NewInquiryForm() {
  const router = useRouter();
  const [topic, setTopic] = useState<(typeof TOPIC_OPTIONS)[number]["value"]>("CONSULT");
  const [topicOther, setTopicOther] = useState("");
  const [details, setDetails] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/household-inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        topicOther: topic === "OTHER" ? topicOther : undefined,
        details,
        attachmentUrl: attachmentUrl || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "ส่งคำร้องไม่สำเร็จ");
      return;
    }
    setTopic("CONSULT");
    setTopicOther("");
    setDetails("");
    setAttachmentUrl(null);
    await successAlert("ส่งคำร้องเรียบร้อยแล้ว ✓ พัฒนาการอำเภอ/จังหวัดจะได้รับข้อมูลนี้ทันที");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">
          หัวข้อ <span className="text-rose-600">*</span>
        </label>
        <div className="flex flex-wrap gap-3">
          {TOPIC_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
              <input type="radio" checked={topic === opt.value} onChange={() => setTopic(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
        {topic === "OTHER" && (
          <input
            type="text"
            placeholder="ระบุหัวข้อ"
            value={topicOther}
            onChange={(e) => setTopicOther(e.target.value)}
            required
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">
          รายละเอียด <span className="text-rose-600">*</span>
        </label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          required
          rows={4}
          placeholder="กรอกรายละเอียดที่ต้องการปรึกษาหรือร้องทุกข์"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">อัปโหลดข้อมูลประกอบ (ถ้ามี)</label>
        <EvidenceUploadButton url={attachmentUrl} onUploaded={(url) => setAttachmentUrl(url)} showPreview />
      </div>

      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex min-h-11 w-fit items-center rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {submitting ? "กำลังส่ง..." : "ส่งคำร้อง"}
      </button>
    </form>
  );
}
