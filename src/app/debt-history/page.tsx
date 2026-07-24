import { CheckCircle2, AlertTriangle, XCircle, History } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { prisma } from "@/lib/prisma";
import { THEMES } from "@/lib/theme";
import { formatThaiDate } from "@/lib/thai";
import { requireUser } from "@/lib/auth";
import { ReportPaymentForm } from "@/components/household/ReportPaymentForm";
import { PaymentHistoryTable, type PaymentHistoryRow } from "@/components/household/PaymentHistoryTable";
import { DebtConfirmationCard } from "@/components/household/DebtConfirmationCard";
import { BankLogo } from "@/components/workflow/BankLogo";
import { findVillageOfficials } from "@/lib/officials";

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

// หน้า "ประวัติหนี้สินของฉัน (เล่มเหลือง)" — เฉพาะครัวเรือนเป้าหมาย แยกออกมาจาก HouseholdDashboard เดิม
// (ก่อนหน้านี้ทั้งเมนู "ข้อมูลครัวเรือนของฉัน" และ "ประวัติหนี้สินของฉัน" ต่างก็ลิงก์ไปที่หน้าเดียวกัน (/) เพียง
// คนละ anchor ทำให้เนื้อหาซ้ำซ้อนกันทั้งหมด) หน้านี้แสดงเฉพาะข้อมูลหนี้สิน/เงินยืม/การชำระเงินเท่านั้น
// ส่วนข้อมูลตัวตน/ครัวเรือนย้ายไปอยู่ที่หน้า /household-profile แทน ไม่ซ้ำกันอีกต่อไป
export const dynamic = "force-dynamic";

export default async function DebtHistoryPage() {
  const user = await requireUser();

  if (!user.householdId) {
    return (
      <PageContainer title="ประวัติหนี้สินของฉัน" subtitle="เล่มเหลือง — บัญชีคุมลูกหนี้">
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          บัญชีของคุณยังไม่ได้ผูกกับครัวเรือนเป้าหมายใดในระบบ กรุณาติดต่อพัฒนากรหรือคณะกรรมการหมู่บ้านเพื่อดำเนินการผูกบัญชี
        </p>
      </PageContainer>
    );
  }

  const household = await prisma.targetHousehold.findUnique({
    where: { id: user.householdId },
    include: { village: { include: { subDistrict: { include: { district: { include: { province: true } } } } } } },
  });

  if (!household) {
    return (
      <PageContainer title="ประวัติหนี้สินของฉัน" subtitle="เล่มเหลือง — บัญชีคุมลูกหนี้">
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          บัญชีของคุณยังไม่ได้ผูกกับครัวเรือนเป้าหมายใดในระบบ
        </p>
      </PageContainer>
    );
  }

  const [loans, activeRound, villageBankAccounts] = await Promise.all([
    prisma.loan.findMany({
      where: { householdId: household.id },
      orderBy: [{ isClosed: "asc" }, { receivedDate: "desc" }],
      include: { repayments: true },
    }),
    prisma.debtConfirmationRound.findFirst({
      where: { villageId: household.villageId, confirmationDate: { lte: new Date() } },
      orderBy: { year: "desc" },
      include: { confirmations: { where: { householdId: household.id } } },
    }),
    prisma.bankAccount.findMany({ where: { villageId: household.villageId } }),
  ]);
  const showDebtConfirmation = activeRound != null && activeRound.confirmations.length === 0;

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

  const { chairmanName, financeOrSecretaryName } = await findVillageOfficials(household.villageId);

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
  const green = THEMES.green;
  const outstandingTotal = loans.filter((l) => !l.isClosed).reduce((sum, l) => sum + l.outstandingBalance, 0);

  // สถานะเครดิตโดยรวมของครัวเรือน = สถานะที่เสี่ยงที่สุดในบรรดาเงินยืมที่ยังไม่ปิดสัญญา
  const overallRiskStatus = loans
    .filter((l) => !l.isClosed)
    .reduce((worst, l) => (RISK_RANK[l.riskStatus] > RISK_RANK[worst] ? l.riskStatus : worst), "NORMAL");
  const riskBanner = RISK_BANNER[overallRiskStatus];
  const RiskIcon = riskBanner.icon;

  return (
    <PageContainer title="ประวัติหนี้สินของฉัน" subtitle="เล่มเหลือง — บัญชีคุมลูกหนี้">
      {loans.some((l) => !l.isClosed) && (
        <div className={`flex items-start gap-3 rounded-2xl border-2 ${riskBanner.border} ${riskBanner.bg} p-4`}>
          <RiskIcon className="h-8 w-8 shrink-0" aria-hidden />
          <p className="text-base font-semibold leading-snug">{riskBanner.text}</p>
        </div>
      )}

      {showDebtConfirmation && activeRound && (
        <DebtConfirmationCard year={activeRound.year} outstandingTotal={outstandingTotal} />
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            <yellow.icon className={`h-5 w-5 shrink-0 ${yellow.headingText}`} aria-hidden />
            สรุปยอดหนี้สินคงค้างของฉัน
          </h2>
          <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${yellow.badgeBg} ${yellow.badgeText}`}>
            {yellow.bookLabel}
          </span>
        </div>

        {loans.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            ยังไม่มีข้อมูลเงินยืมของครัวเรือนคุณในระบบ
          </p>
        ) : (
          <>
            <div className={`rounded-2xl border ${yellow.cardBorder} ${yellow.cardBg} p-4`}>
              <p className="text-xs text-slate-500">ยอดค้างชำระรวม (เงินยืมที่ยังไม่ปิดสัญญา)</p>
              <p className={`flex items-center gap-2 text-2xl font-bold ${yellow.headingText}`}>
                <yellow.icon className="h-6 w-6 shrink-0" aria-hidden />
                {outstandingTotal.toLocaleString("th-TH")} บาท
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {loans.map((loan) => {
                const totalRepaid = loan.repayments.reduce((sum, r) => sum + r.amount, 0);
                return (
                  <div key={loan.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">ยืมครั้งที่ {loan.borrowRound}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          loan.isClosed ? "bg-slate-200 text-slate-700" : `${yellow.badgeBg} ${yellow.badgeText}`
                        }`}
                      >
                        {loan.isClosed ? "ปิดสัญญาแล้ว" : "อยู่ระหว่างผ่อนชำระ"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <span>วันที่รับเงินยืม: {formatThaiDate(loan.receivedDate)}</span>
                      <span>จำนวนเงินยืม: {loan.amount.toLocaleString("th-TH")} บาท</span>
                      <span>คืนแล้วสะสม: {totalRepaid.toLocaleString("th-TH")} บาท</span>
                      <span className="font-semibold text-amber-800 dark:text-amber-400">
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

      {loans.some((l) => !l.isClosed) && villageBankAccounts.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            <green.icon className={`h-5 w-5 shrink-0 ${green.headingText}`} aria-hidden />
            บัญชีธนาคารของหมู่บ้านสำหรับโอนชำระเงิน
          </h2>
          <div className="flex flex-col gap-2">
            {villageBankAccounts.map((acc) => (
              <div
                key={acc.id}
                className={`flex items-center gap-3 rounded-2xl border ${green.cardBorder} ${green.cardBg} p-4`}
              >
                <BankLogo bankName={acc.bankName} size={40} />
                <div>
                  <p className={`text-sm font-bold ${green.headingText}`}>{acc.bankName ?? "ไม่ระบุธนาคาร"}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {acc.branch ? `สาขา${acc.branch} ` : ""}
                    {acc.accountNo ? `เลขที่บัญชี ${acc.accountNo}` : ""}
                  </p>
                  {acc.accountName && <p className="text-xs text-slate-500 dark:text-slate-500">ชื่อบัญชี: {acc.accountName}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {loans.some((l) => !l.isClosed) && (
        <section className="flex flex-col gap-3">
          <ReportPaymentForm />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
          <History className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
          ประวัติการชำระเงินย้อนหลัง
        </h2>
        <PaymentHistoryTable rows={paymentHistory} receiptBase={receiptBase} />
      </section>
    </PageContainer>
  );
}
