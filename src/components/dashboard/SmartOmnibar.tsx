"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Search, X, Loader2, Landmark, Banknote, CalendarCheck, SearchX, BookOpen } from "lucide-react";
import type {
  DashboardSearchResult,
  VillageSearchResult,
  HouseholdSearchResult,
  BudgetYearSearchResult,
  MeetingSearchResult,
  BankAccountSearchResult,
} from "@/lib/dashboardSearch";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

function money(n: number): string {
  return `${n.toLocaleString("th-TH")} บาท`;
}

// กล่องค้นหาอัจฉริยะ (Smart Omnibar Search) — ค้นหาข้ามตาราง (หมู่บ้าน/ครัวเรือน/ปีงบประมาณ/วาระการประชุม)
// พร้อมกัน แล้วแสดงผลลัพธ์คนละรูปแบบตามประเภทข้อมูลที่พบ (การ์ดสรุปยอด/ตารางย่อย/กราฟ/ลิงก์ด่วน)
export function SmartOmnibar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DashboardSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/dashboard/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => (res.ok ? res.json() : { results: [] }))
        .then((data: { results: DashboardSearchResult[] }) => {
          setResults(data.results);
          setLoading(false);
        })
        .catch(() => {
          setResults([]);
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const showDropdown = open && query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-2xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="ค้นหาชื่อหมู่บ้าน, ชื่อครัวเรือนเป้าหมาย, เลขบัญชี/ชื่อธนาคาร, หรือปีงบประมาณ..."
          className="min-h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-11 text-base shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults(null);
            }}
            aria-label="ล้างคำค้นหา"
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />}
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-30 mt-2 max-h-[70vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          {results === null || loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังค้นหา...
            </div>
          ) : results.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-3">
              {results.map((r, i) => (
                <ResultItem key={`${r.type}-${i}`} result={r} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <SearchX className="h-10 w-10 text-slate-300" aria-hidden />
      <p className="text-sm font-semibold text-slate-600">ไม่พบข้อมูลที่ค้นหา</p>
      <p className="max-w-xs text-xs text-slate-400">
        ไม่พบข้อมูลในเขตพื้นที่ความรับผิดชอบของคุณ หรือลองค้นหาด้วยชื่อหมู่บ้าน ชื่อครัวเรือนเป้าหมาย
        หรือปีงบประมาณ (เช่น 2555)
      </p>
    </div>
  );
}

function ResultItem({ result }: { result: DashboardSearchResult }) {
  switch (result.type) {
    case "village":
      return <VillageResult result={result} />;
    case "household":
      return <HouseholdResult result={result} />;
    case "budgetYear":
      return <BudgetYearResult result={result} />;
    case "meeting":
      return <MeetingResult result={result} />;
    case "bankAccount":
      return <BankAccountResult result={result} />;
    default:
      return null;
  }
}

// รูปแบบ A: การ์ดสรุปยอดเงิน (เล่มเขียว 🟢 / เล่มเหลือง 🔴) ของหมู่บ้าน
function VillageResult({ result }: { result: VillageSearchResult }) {
  return (
    <div className="rounded-xl border border-[#E4CBA3] bg-[#FBF4EC] p-3">
      <p className="text-sm font-bold text-[#5A3A1E]">{result.label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/70 p-2">
          <p className="text-xs text-slate-500">🟢 ยอดเงินฝากรวม (เล่มเขียว)</p>
          <p className="text-sm font-bold text-emerald-700">
            {result.greenBookTotal === null ? "ไม่มีสิทธิ์ดู" : money(result.greenBookTotal)}
          </p>
        </div>
        <div className="rounded-lg bg-white/70 p-2">
          <p className="text-xs text-slate-500">🔴 ยอดหนี้ค้างชำระ (เล่มเหลือง)</p>
          <p className="text-sm font-bold text-rose-700">{money(result.yellowBookOutstanding)}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <QuickLink href="/bank-accounts" label="ดูเล่มเขียว" icon={Landmark} />
        <QuickLink href="/loans" label="ดูเล่มเหลือง" icon={Banknote} />
        {result.canSeeVillageStatus && <QuickLink href="/villages" label="ดูเล่มน้ำตาล" icon={BookOpen} />}
      </div>
    </div>
  );
}

// รูปแบบ E: การ์ดยอดคงเหลือล่าสุดของบัญชีธนาคารที่เลขบัญชี/ชื่อธนาคาร/สาขาตรงกับคำค้นหา
function BankAccountResult({ result }: { result: BankAccountSearchResult }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
      <p className="text-sm font-bold text-emerald-900">{result.label}</p>
      <p className="text-xs text-slate-500">{result.villageLabel}</p>
      <p className="mt-1 text-sm font-bold text-emerald-700">ยอดคงเหลือล่าสุด: {money(result.latestBalance)}</p>
      <div className="mt-2 flex justify-end">
        <QuickLink href="/bank-accounts" label="ดูเล่มเขียว" icon={Landmark} />
      </div>
    </div>
  );
}

// รูปแบบ B: ตารางขนาดเล็กแจกแจงประวัติการกู้ยืมของครัวเรือนเป้าหมาย
function HouseholdResult({ result }: { result: HouseholdSearchResult }) {
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
      <p className="text-sm font-bold text-violet-900">{result.label}</p>
      <p className="text-xs text-slate-500">{result.villageLabel}</p>

      {result.loans.length === 0 ? (
        <p className="mt-2 text-xs italic text-slate-400">ยังไม่มีประวัติการกู้ยืม</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-violet-200 text-slate-500">
                <th className="py-1 pr-2 font-semibold">ยืมครั้งที่</th>
                <th className="py-1 pr-2 font-semibold">จำนวนเงิน</th>
                <th className="py-1 pr-2 font-semibold">ค้างชำระ</th>
                <th className="py-1 font-semibold">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {result.loans.map((l) => (
                <tr key={l.id} className="border-b border-violet-100 last:border-0">
                  <td className="py-1 pr-2 text-slate-700">{l.borrowRound}</td>
                  <td className="py-1 pr-2 text-slate-700">{l.amount.toLocaleString("th-TH")}</td>
                  <td className="py-1 pr-2 font-semibold text-rose-700">{l.outstandingBalance.toLocaleString("th-TH")}</td>
                  <td className="py-1">
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        l.isClosed ? "bg-slate-200 text-slate-600" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {l.isClosed ? "ปิดสัญญาแล้ว" : "อยู่ระหว่างผ่อน"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-2 flex justify-end">
        <QuickLink href="/loans" label="ดูบัญชีคุมลูกหนี้" icon={Banknote} />
      </div>
    </div>
  );
}

// รูปแบบ C: กราฟแท่งสรุปสัดส่วนเงินให้ยืม vs เงินรับคืน ของปีงบประมาณที่ค้นหา
function BudgetYearResult({ result }: { result: BudgetYearSearchResult }) {
  const chartData = [
    { name: "เงินให้ยืม", จำนวนเงิน: result.disbursed },
    { name: "เงินรับคืน", จำนวนเงิน: result.repaid },
  ];

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
      <p className="text-sm font-bold text-sky-900">ปีงบประมาณ พ.ศ. {result.year}</p>
      <p className="text-xs text-slate-500">{result.villageCount} หมู่บ้านในเขตพื้นที่ของคุณ</p>
      <div className="mt-2 h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={40} />
            <Tooltip formatter={(value) => money(Number(value))} />
            <Bar dataKey="จำนวนเงิน" fill="#0284c7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex justify-end">
        <QuickLink href="/official-reports" label="ดูแบบรายงานภาวะหนี้สินฯ" icon={Landmark} />
      </div>
    </div>
  );
}

// รูปแบบ D (ประกอบ): วาระการประชุมที่หัวข้อตรงกับคำค้นหา -> ลิงก์ด่วนไปหน้าเอกสารการประชุม
function MeetingResult({ result }: { result: MeetingSearchResult }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-800">{result.agendaTopic}</p>
        <p className="text-xs text-slate-500">{result.villageLabel}</p>
      </div>
      <QuickLink href="/meetings" label="ดูวาระการประชุม" icon={CalendarCheck} />
    </div>
  );
}

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Landmark }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
