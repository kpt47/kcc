"use client";

import { useEffect, useState } from "react";
import { exportRowsAsExcel } from "@/lib/export";
import { formatThaiDate } from "@/lib/formatDate";
import { SortableHeader } from "./SortableHeader";

type VillageDebtorRow = {
  householdId: number;
  headFirstName: string;
  headLastName: string;
  receivedDate: string;
  amountLoaned: number;
  amountRepaid: number;
  outstandingBalance: number;
  borrowRound: number;
};
type Summary = {
  villageName: string;
  debtorCount: number;
  totalLoaned: number;
  bankBalance: number;
  cashOnHand: number;
  totalFund: number;
  repaidThisYear: number;
};

const money = (n: number) => `${n.toLocaleString("th-TH")} บาท`;

export function VillageDebtReportView({ isVillageCommittee }: { isVillageCommittee: boolean }) {
  const [villages, setVillages] = useState<{ id: number; villageNo: string; villageName: string }[]>([]);
  const [villageId, setVillageId] = useState("");
  const [budgetYear, setBudgetYear] = useState("");
  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState("receivedDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [rows, setRows] = useState<VillageDebtorRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVillageCommittee) return;
    fetch("/api/search/areas")
      .then((r) => r.json())
      .then((data) => setVillages(data.villages ?? []));
  }, [isVillageCommittee]);

  useEffect(() => {
    if (!isVillageCommittee && !villageId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (villageId) params.set("villageId", villageId);
    if (budgetYear) params.set("budgetYear", budgetYear);
    if (q) params.set("q", q);
    params.set("sortField", sortField);
    params.set("sortDir", sortDir);
    fetch(`/api/official-reports/village?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          throw new Error(body?.error?.formErrors?.[0] ?? "โหลดข้อมูลไม่สำเร็จ");
        }
        return r.json();
      })
      .then((data) => {
        setRows(data.rows ?? []);
        setSummary(data.summary ?? null);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [isVillageCommittee, villageId, budgetYear, q, sortField, sortDir]);

  function handleSort(field: string) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function handleExportExcel() {
    exportRowsAsExcel(
      rows.map((r, i) => ({
        ลำดับ: i + 1,
        "ชื่อ-สกุลผู้ยืม": `${r.headFirstName} ${r.headLastName}`,
        วันที่ได้รับเงินยืม: formatThaiDate(r.receivedDate),
        จำนวนเงินที่ให้ยืม: r.amountLoaned,
        จำนวนเงินส่งคืนแล้ว: r.amountRepaid,
        เงินคงค้าง: r.outstandingBalance,
        ยืมรอบที่: r.borrowRound,
      })),
      "official-report-village"
    );
  }

  const pdfParams = new URLSearchParams();
  if (villageId) pdfParams.set("villageId", villageId);
  if (budgetYear) pdfParams.set("budgetYear", budgetYear);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {!isVillageCommittee && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">หมู่บ้าน</label>
            <select value={villageId} onChange={(e) => setVillageId(e.target.value)} className="min-h-10 rounded-lg border border-slate-300 px-2 text-sm">
              <option value="">-- เลือกหมู่บ้าน --</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  หมู่ {v.villageNo} บ้าน{v.villageName}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">ปีงบประมาณ (พ.ศ.)</label>
          <input type="number" value={budgetYear} onChange={(e) => setBudgetYear(e.target.value)} placeholder="เช่น 2555" className="min-h-10 w-32 rounded-lg border border-slate-300 px-2 text-sm" />
        </div>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาชื่อลูกหนี้..."
          className="min-h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
        />
      </div>

      {error && <p className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {!isVillageCommittee && !villageId ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">กรุณาเลือกหมู่บ้านเพื่อดูรายงาน</p>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-800">{summary?.villageName ?? ""}</p>
            <div className="flex gap-2">
              <button type="button" onClick={handleExportExcel} disabled={rows.length === 0} className="inline-flex min-h-9 items-center rounded-lg border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                Export Excel (.xlsx)
              </button>
              <a href={`/api/official-reports/village/pdf?${pdfParams.toString()}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Export PDF
              </a>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="whitespace-nowrap px-3 py-2">ลำดับ</th>
                  <SortableHeader label="ชื่อ-สกุลผู้ยืม" field="headFirstName" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="วันที่ได้รับเงินยืม" field="receivedDate" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="จำนวนเงินที่ให้ยืม" field="amountLoaned" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="จำนวนเงินส่งคืนแล้ว" field="amountRepaid" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="เงินคงค้าง" field="outstandingBalance" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="ยืมรอบที่" field="borrowRound" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-400">กำลังโหลดข้อมูล...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-400">ไม่พบรายชื่อผู้ยืมตามเงื่อนไขที่กำหนด</td></tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={r.householdId + "-" + r.borrowRound} className="border-b border-slate-100 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 text-slate-700">{i + 1}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.headFirstName} {r.headLastName}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-700">{formatThaiDate(r.receivedDate)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.amountLoaned.toLocaleString("th-TH")}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.amountRepaid.toLocaleString("th-TH")}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-semibold text-amber-800">{r.outstandingBalance.toLocaleString("th-TH")}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.borrowRound}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {summary && (
            <ul className="mt-2 flex flex-col gap-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <li>1. จำนวนผู้ยืม: {summary.debtorCount.toLocaleString("th-TH")} ราย</li>
              <li>2. เงินที่ให้ยืมรวม (คงค้าง): {money(summary.totalLoaned)}</li>
              <li>3. เงินในบัญชีธนาคารรวม: {money(summary.bankBalance)}</li>
              <li>4. เงินในมือ: {money(summary.cashOnHand)}</li>
              <li>5. รวมเงินทุนทั้งหมด: {money(summary.totalFund)}</li>
              <li>6. เงินที่ได้รับคืนในรอบปี: {money(summary.repaidThisYear)}</li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
