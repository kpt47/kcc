"use client";

import { useRef, useState } from "react";

export function EvidenceUploadButton({
  url,
  onUploaded,
  showPreview = false,
}: {
  url?: string | null;
  onUploaded: (url: string) => void | Promise<void>;
  /** แสดงรูปตัวอย่างขนาดย่อด้วย (ใช้ตอนแนบสลิปก่อนส่งฟอร์ม ที่อยากให้ผู้ใช้เห็นรูปที่เลือกทันที) */
  showPreview?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.formErrors?.[0] ?? "อัปโหลดไม่สำเร็จ");
      setUploading(false);
      return;
    }
    const { url: uploadedUrl } = await res.json();
    await onUploaded(uploadedUrl);
    setUploading(false);
  }

  return (
    <div className="flex flex-col gap-1">
      {showPreview && url && (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt="ตัวอย่างรูปภาพที่แนบ" className="h-28 w-28 rounded-lg border border-slate-200 object-cover" />
        </a>
      )}
      <div className="flex items-center gap-2">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-emerald-700 underline"
          >
            ดูรูปภาพ
          </a>
        ) : (
          <span className="text-xs text-slate-400">ไม่มีไฟล์แนบ</span>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex min-h-8 items-center rounded-full border border-slate-300 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          {uploading ? "กำลังอัปโหลด..." : url ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}
