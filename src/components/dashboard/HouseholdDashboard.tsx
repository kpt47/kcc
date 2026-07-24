import Link from "next/link";
import { User, CheckCircle2, AlertTriangle, XCircle, Users, Banknote, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { THEMES } from "@/lib/theme";
import type { CurrentUser } from "@/lib/auth";

const RISK_RANK: Record<string, number> = { NORMAL: 0, WATCHLIST: 1, HIGH_RISK: 2 };

const RISK_BANNER: Record<string, { icon: typeof CheckCircle2; text: string; border: string; bg: string }> = {
  NORMAL: {
    icon: CheckCircle2,
    text: "สถานะปกติ: ยอดเยี่ยม! คุณชำระเงินตรงตามกำหนดเวลา",
    border: "border-emerald-300",
    bg: "bg-emerald-50 text-emerald-800",
  },
  WATCHLIST: {
    icon: AlertTriangle,
    text: "สถานะเฝ้าระวัง: บัญชีของท่านใกล้ถึงกำหนดชำระหรือเลยกำหนดมาเล็กน้อย โปรดติดต่อคณะกรรมการ กข.คจ. หมู่บ้าน",
    border: "border-yellow-300",
    bg: "bg-yellow-50 text-yellow-800",
  },
  HIGH_RISK: {
    icon: XCircle,
    text: "สถานะผิดสัญญา (เสี่ยงสูง): ท่านค้างชำระเกินกำหนด โปรดรีบติดต่อคณะกรรมการเพื่อหาแนวทางแก้ไขหรือขอผ่อนผันโดยด่วน",
    border: "border-rose-300",
    bg: "bg-rose-50 text-rose-800",
  },
};

// หน้าหลักของ role HOUSEHOLD — เป็นเพียงจุดเริ่มต้นสั้นๆ (ทักทาย + แจ้งเตือนความเสี่ยงถ้ามี + ลิงก์ไปหน้าเฉพาะ
// ทาง) ไม่แสดงรายละเอียดซ้ำกับหน้า /household-profile หรือ /debt-history อีกต่อไป (เดิมทั้งสองเมนูลิงก์มาที่
// หน้านี้ด้วย anchor คนละจุด ทำให้เนื้อหาซ้ำซ้อนกันทั้งหมด — ดูรายละเอียดที่ 2 หน้านั้นแทน)
export async function HouseholdDashboard({ user }: { user: CurrentUser }) {
  const householdId = user.householdId;
  const household = householdId
    ? await prisma.targetHousehold.findUnique({
        where: { id: householdId },
        include: { village: true },
      })
    : null;

  if (!household) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        บัญชีของคุณยังไม่ได้ผูกกับครัวเรือนเป้าหมายใดในระบบ กรุณาติดต่อพัฒนากรหรือคณะกรรมการหมู่บ้านเพื่อดำเนินการผูกบัญชี
      </div>
    );
  }

  const loans = await prisma.loan.findMany({ where: { householdId: household.id } });
  const outstandingTotal = loans.filter((l) => !l.isClosed).reduce((sum, l) => sum + l.outstandingBalance, 0);
  const activeLoanCount = loans.filter((l) => !l.isClosed).length;

  // สถานะเครดิตโดยรวมของครัวเรือน = สถานะที่เสี่ยงที่สุดในบรรดาเงินยืมที่ยังไม่ปิดสัญญา
  const overallRiskStatus = loans
    .filter((l) => !l.isClosed)
    .reduce((worst, l) => (RISK_RANK[l.riskStatus] > RISK_RANK[worst] ? l.riskStatus : worst), "NORMAL");
  const riskBanner = RISK_BANNER[overallRiskStatus];
  const RiskIcon = riskBanner.icon;
  const purple = THEMES.purple;
  const yellow = THEMES.yellow;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">ครัวเรือนเป้าหมาย</p>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {household.headFirstName} {household.headLastName}
          </p>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          หมู่ {household.village.villageNo} บ้าน{household.village.villageName}
          {household.houseNo ? ` เลขที่ ${household.houseNo}` : ""}
        </p>
      </div>

      {activeLoanCount > 0 && (
        <div className={`flex items-start gap-3 rounded-2xl border-2 ${riskBanner.border} ${riskBanner.bg} p-4`}>
          <RiskIcon className="h-8 w-8 shrink-0" aria-hidden />
          <p className="text-base font-semibold leading-snug">{riskBanner.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/household-profile"
          className={`flex items-center justify-between gap-3 rounded-2xl border ${purple.cardBorder} ${purple.cardBg} p-4 transition hover:brightness-95`}
        >
          <div className="flex items-center gap-3">
            <Users className={`h-8 w-8 shrink-0 ${purple.headingText}`} aria-hidden />
            <div>
              <p className={`text-sm font-bold ${purple.headingText}`}>ข้อมูลครัวเรือนของฉัน</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{purple.bookLabel} — ข้อมูลตัวตนและคำร้องที่ยื่นไว้</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
        </Link>

        <Link
          href="/debt-history"
          className={`flex items-center justify-between gap-3 rounded-2xl border ${yellow.cardBorder} ${yellow.cardBg} p-4 transition hover:brightness-95`}
        >
          <div className="flex items-center gap-3">
            <Banknote className={`h-8 w-8 shrink-0 ${yellow.headingText}`} aria-hidden />
            <div>
              <p className={`text-sm font-bold ${yellow.headingText}`}>ประวัติหนี้สินของฉัน</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {yellow.bookLabel} —{" "}
                {activeLoanCount > 0 ? `ค้างชำระ ${outstandingTotal.toLocaleString("th-TH")} บาท` : "ยังไม่มีเงินยืมที่ค้างชำระ"}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
