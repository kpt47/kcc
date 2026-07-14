"use client";

import { useState } from "react";

type SearchRow = {
  id: number;
  sequenceNo: number;
  headFirstName: string;
  headLastName: string;
  houseNo: string | null;
  incomeBeforeLoan: number | null;
  village: { villageName: string; villageNo: string };
};

export function HouseholdSearchBar() {
  const [q, setQ] = useState("");
  const [targetRank, setTargetRank] = useState("");
  const [maxIncome, setMaxIncome] = useState("");
  const [results, setResults] = useState<SearchRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (targetRank) params.set("targetRank", targetRank);
    if (maxIncome) params.set("maxIncome", maxIncome);
    const res = await fetch(`/api/households/search?${params.toString()}`);
    setLoading(false);
    if (res.ok) setResults(await res.json());
  }

  function handleClear() {
    setQ("");
    setTargetRank("");
    setMaxIncome("");
    setResults(null);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">ค้นหาชื่อ-สกุล</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ชื่อหรือนามสกุล"
            className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">ลำดับที่ครัวเรือนเป้าหมาย</label>
          <input
            type="number"
            value={targetRank}
            onChange={(e) => setTargetRank(e.target.value)}
            className="min-h-10 w-32 rounded-lg border border-slate-300 px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">รายได้ไม่เกิน (บาท)</label>
          <input
            type="number"
            value={maxIncome}
            onChange={(e) => setMaxIncome(e.target.value)}
            className="min-h-10 w-36 rounded-lg border border-slate-300 px-3 text-sm"
          />
        </div>
        <button type="submit" disabled={loading} className="min-h-10 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-60">
          {loading ? "กำลังค้นหา..." : "ค้นหา"}
        </button>
        {results && (
          <button type="button" onClick={handleClear} className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm text-slate-600">
            ล้างตัวกรอง
          </button>
        )}
      </form>

      {results && (
        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500">พบ {results.length} รายการ</p>
          {results.length === 0 ? (
            <p className="text-sm text-slate-400">ไม่พบครัวเรือนที่ตรงกับเงื่อนไข</p>
          ) : (
            results.map((h) => (
              <div key={h.id} className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-sm">
                <p className="font-bold text-slate-900">
                  ลำดับที่ {h.sequenceNo} - {h.headFirstName} {h.headLastName}
                </p>
                <p className="text-slate-600">
                  หมู่ {h.village.villageNo} บ้าน{h.village.villageName}
                  {h.houseNo ? ` เลขที่ ${h.houseNo}` : ""} · รายได้ก่อนยืม:{" "}
                  {h.incomeBeforeLoan != null ? `${h.incomeBeforeLoan.toLocaleString("th-TH")} บาท` : "-"}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
