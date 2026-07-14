import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { THEMES } from "@/lib/theme";
import { formatThaiDate } from "@/lib/thai";
import type { CurrentUser } from "@/lib/auth";
import { ReportPaymentForm } from "@/components/household/ReportPaymentForm";
import { PaymentHistoryTable, type PaymentHistoryRow } from "@/components/household/PaymentHistoryTable";
import { findVillageOfficials } from "@/lib/officials";

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 5a2 2 0 0 1 2-2h2.28a1 1 0 0 1 .97.76l.7 2.8a1 1 0 0 1-.4 1.06l-1.6 1.2a12.05 12.05 0 0 0 5.19 5.19l1.2-1.6a1 1 0 0 1 1.06-.4l2.8.7a1 1 0 0 1 .76.97V19a2 2 0 0 1-2 2h-1C7.82 21 3 16.18 3 10.5V5z"
      />
    </svg>
  );
}

const DECISION_LABEL: Record<string, string> = {
  approved: "อนุมัติ",
  rejected: "ไม่อนุมัติ",
};

const RISK_RANK: Record<string, number> = { NORMAL: 0, WATCHLIST: 1, HIGH_RISK: 2 };

const RISK_BANNER: Record<string, { emoji: string; text: string; border: string; bg: string }> = {
  NORMAL: {
    emoji: "🟢",
    text: "สถานะปกติ: ยอดเยี่ยม! คุณชำระเงินตรงตามกำหนดเวลา",
    border: "border-emerald-300",
    bg: "bg-emerald-50 text-emerald-800",
  },
  WATCHLIST: {
    emoji: "🟡",
    text: "สถานะเฝ้าระวัง: บัญชีของท่านใกล้ถึงกำหนดชำระหรือเลยกำหนดมาเล็กน้อย โปรดติดต่อคณะกรรมการ กข.คจ. หมู่บ้าน",
    border: "border-yellow-300",
    bg: "bg-yellow-50 text-yellow-800",
  },
  HIGH_RISK: {
    emoji: "🔴",
    text: "สถานะผิดสัญญา (เสี่ยงสูง): ท่านค้างชำระเกินกำหนด โปรดรีบติดต่อคณะกรรมการเพื่อหาแนวทางแก้ไขหรือขอผ่อนผันโดยด่วน",
    border: "border-rose-300",
    bg: "bg-rose-50 text-rose-800",
  },
};

// Dashboard เฉพาะสำหรับ role HOUSEHOLD — แสดงเฉพาะข้อมูลของครัวเรือนตนเองเท่านั้น
// (ไม่แสดงตารางรายชื่อสมาชิกในหมู่บ้านทั้งหมด ตามข้อกำหนดเรื่อง data isolation)
export async function HouseholdDashboard({ user }: { user: CurrentUser }) {
  const householdId = user.householdId;
  const household = householdId
    ? await prisma.targetHousehold.findUnique({
        where: { id: householdId },
        include: {
          village: { include: { subDistrict: { include: { district: { include: { province: true } } } } } },
        },
      })
    : null;

  if (!household) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        บัญชีของคุณยังไม่ได้ผูกกับครัวเรือนเป้าหมายใดในระบบ กรุณาติดต่อพัฒนากรหรือคณะกรรมการหมู่บ้านเพื่อดำเนินการผูกบัญชี
      </div>
    );
  }

  const [loans, proposals, loanRequests] = await Promise.all([
    prisma.loan.findMany({
      where: { householdId: household.id },
      orderBy: [{ isClosed: "asc" }, { receivedDate: "desc" }],
      include: { repayments: true },
    }),
    prisma.projectProposal.findMany({ where: { householdId: household.id }, orderBy: { createdAt: "desc" } }),
    prisma.loanRequest.findMany({ where: { householdId: household.id }, orderBy: { createdAt: "desc" } }),
  ]);

  // คำนวณ "งวดที่" และยอดคงเหลือ ณ ขณะนั้น ของแต่ละรายการที่อนุมัติแล้ว โดยไล่ยอดสะสมตามลำดับวันที่ชำระ
  // แยกคำนวณต่อเงินยืมแต่ละก้อน (เพื่อให้ใบเสร็จที่พิมพ์ย้อนหลังแสดงยอดคงเหลือ ณ วันนั้นจริง ไม่ใช่ยอดปัจจุบัน)
  const paymentHistory: PaymentHistoryRow[] = loans
    .flatMap((loan) => {
      const approvedInOrder = [...loan.repayments]
        .filter((r) => r.status === "APPROVED")
        .sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime());
      const balanceAfterById = new Map<number, number>();
      let runningBalance = loan.amount;
      for (const r of approvedInOrder) {
        runningBalance = Math.max(0, runningBalance - r.amount);
        balanceAfterById.set(r.id, runningBalance);
      }
      return loan.repayments.map((r) => ({
        id: r.id,
        amount: r.amount,
        paymentDate: r.paymentDate.toISOString(),
        transferSlipUrl: r.transferSlipUrl,
        householdNote: r.householdNote,
        committeeReply: r.committeeReply,
        status: r.status,
        installmentNo: r.status === "APPROVED" ? approvedInOrder.findIndex((x) => x.id === r.id) + 1 : null,
        outstandingBalanceAfter: balanceAfterById.get(r.id) ?? null,
      }));
    })
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

  const { chairmanName, chairmanPhone, financeOrSecretaryName, financeOrSecretaryPhone } = await findVillageOfficials(
    household.villageId
  );

  const receiptBase = {
    villageName: household.village.villageName,
    villageNo: household.village.villageNo,
    subDistrictName: household.village.subDistrict.name,
    districtName: household.village.subDistrict.district.name,
    provinceName: household.village.subDistrict.district.province.name,
    payerName: `${household.headFirstName} ${household.headLastName}`,
    contractNo: loans[0]?.contractNo ?? null,
    chairmanName,
    financeOrSecretaryName,
  };

  const yellow = THEMES.yellow;
  const outstandingTotal = loans.filter((l) => !l.isClosed).reduce((sum, l) => sum + l.outstandingBalance, 0);

  // สถานะเครดิตโดยรวมของครัวเรือน = สถานะที่เสี่ยงที่สุดในบรรดาเงินยืมที่ยังไม่ปิดสัญญา
  const overallRiskStatus = loans
    .filter((l) => !l.isClosed)
    .reduce((worst, l) => (RISK_RANK[l.riskStatus] > RISK_RANK[worst] ? l.riskStatus : worst), "NORMAL");
  const riskBanner = RISK_BANNER[overallRiskStatus];

  return (
    <div className="flex flex-col gap-6">
      <div id="household-profile" className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">ครัวเรือนเป้าหมาย</p>
        <p className="text-lg font-bold text-slate-900">
          {household.headFirstName} {household.headLastName}
        </p>
        <p className="text-sm text-slate-600">
          หมู่ {household.village.villageNo} บ้าน{household.village.villageName}
          {household.houseNo ? ` เลขที่ ${household.houseNo}` : ""}
        </p>
      </div>

      {(chairmanName || financeOrSecretaryName) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-bold text-slate-900">ติดต่อคณะกรรมการ กข.คจ. หมู่บ้าน</p>
          <div className="flex flex-col gap-2">
            {chairmanName && (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{chairmanName}</p>
                  <p className="text-xs text-slate-500">ประธานคณะกรรมการ</p>
                </div>
                {chairmanPhone && (
                  <a
                    href={`tel:${chairmanPhone}`}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white"
                  >
                    <PhoneIcon />
                    {chairmanPhone}
                  </a>
                )}
              </div>
            )}
            {financeOrSecretaryName && (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{financeOrSecretaryName}</p>
                  <p className="text-xs text-slate-500">ฝ่ายการเงิน/เลขานุการ</p>
                </div>
                {financeOrSecretaryPhone && (
                  <a
                    href={`tel:${financeOrSecretaryPhone}`}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white"
                  >
                    <PhoneIcon />
                    {financeOrSecretaryPhone}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {loans.some((l) => !l.isClosed) && (
        <div className={`rounded-2xl border-2 ${riskBanner.border} ${riskBanner.bg} p-4`}>
          <p className="text-sm font-semibold">
            {riskBanner.emoji} {riskBanner.text}
          </p>
        </div>
      )}

      <section id="debt-history" className="scroll-mt-20 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">สรุปยอดหนี้สินคงค้างของฉัน</h2>
          <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${yellow.badgeBg} ${yellow.badgeText}`}>
            {yellow.bookLabel}
          </span>
        </div>

        {loans.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
            ยังไม่มีข้อมูลเงินยืมของครัวเรือนคุณในระบบ
          </p>
        ) : (
          <>
            <div className={`rounded-2xl border ${yellow.cardBorder} ${yellow.cardBg} p-4`}>
              <p className="text-xs text-slate-500">ยอดค้างชำระรวม (เงินยืมที่ยังไม่ปิดสัญญา)</p>
              <p className={`text-2xl font-bold ${yellow.headingText}`}>
                {outstandingTotal.toLocaleString("th-TH")} บาท
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {loans.map((loan) => {
                const totalRepaid = loan.repayments.reduce((sum, r) => sum + r.amount, 0);
                return (
                  <div key={loan.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">ยืมครั้งที่ {loan.borrowRound}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          loan.isClosed ? "bg-slate-200 text-slate-700" : `${yellow.badgeBg} ${yellow.badgeText}`
                        }`}
                      >
                        {loan.isClosed ? "ปิดสัญญาแล้ว" : "อยู่ระหว่างผ่อนชำระ"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span>วันที่รับเงินยืม: {formatThaiDate(loan.receivedDate)}</span>
                      <span>จำนวนเงินยืม: {loan.amount.toLocaleString("th-TH")} บาท</span>
                      <span>คืนแล้วสะสม: {totalRepaid.toLocaleString("th-TH")} บาท</span>
                      <span className="font-semibold text-amber-800">
                        ยอดค้างชำระ: {loan.outstandingBalance.toLocaleString("th-TH")} บาท
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-slate-900">สถานะแบบฟอร์มคำร้องที่ฉันเป็นคนยื่น</h2>

        {proposals.length === 0 && loanRequests.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
            คุณยังไม่ได้ยื่นแบบเสนอโครงการหรือแบบขอยืมเงินทุน
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {proposals.map((p) => (
              <div key={`proposal-${p.id}`} className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-sky-700">แบบเสนอโครงการ</p>
                    <p className="text-sm font-semibold text-slate-800">{p.projectName}</p>
                  </div>
                  <a
                    href={`/api/proposals/${p.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-sky-300 px-3 text-xs font-semibold text-sky-700"
                  >
                    พิมพ์ PDF
                  </a>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  วันที่ยื่น: {formatThaiDate(p.proposedDate)} · ผลพิจารณา:{" "}
                  {p.committeeDecision ? DECISION_LABEL[p.committeeDecision] ?? p.committeeDecision : "ยังไม่พิจารณา"}
                </p>
              </div>
            ))}
            {loanRequests.map((r) => (
              <div key={`loan-request-${r.id}`} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-amber-700">แบบขอยืมเงินทุน</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {r.requestedAmount.toLocaleString("th-TH")} บาท
                    </p>
                  </div>
                  <a
                    href={`/api/loan-requests/${r.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-amber-300 px-3 text-xs font-semibold text-amber-700"
                  >
                    พิมพ์ PDF
                  </a>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  วันที่ยื่น: {formatThaiDate(r.requestDate)} · ผลพิจารณา:{" "}
                  {r.committeeDecision ? DECISION_LABEL[r.committeeDecision] ?? r.committeeDecision : "ยังไม่พิจารณา"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {loans.some((l) => !l.isClosed) && (
        <section className="flex flex-col gap-3">
          <ReportPaymentForm />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-slate-900">ประวัติการชำระเงินย้อนหลัง</h2>
        <PaymentHistoryTable rows={paymentHistory} receiptBase={receiptBase} />
      </section>

      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-5">
        <Link
          href="/proposals/new"
          className="inline-flex min-h-11 items-center rounded-full bg-sky-600 px-3.5 text-sm font-semibold text-white"
        >
          + แบบเสนอโครงการใหม่
        </Link>
        <Link
          href="/loan-requests/new"
          className="inline-flex min-h-11 items-center rounded-full bg-amber-600 px-3.5 text-sm font-semibold text-white"
        >
          + แบบขอยืมเงินทุนใหม่
        </Link>
      </div>
    </div>
  );
}
