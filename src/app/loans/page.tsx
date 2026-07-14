import Link from "next/link";
import { Suspense } from "react";
import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { LoansPageTabs } from "@/components/workflow/LoansPageTabs";
import { LoanRiskFilterList } from "@/components/workflow/LoanRiskFilterList";
import { prisma } from "@/lib/prisma";
import { THEMES } from "@/lib/theme";
import { requireUser } from "@/lib/auth";
import {
  canCreateOrUpdateLoan,
  canCreateRepayment,
  canEditOrDeleteRepayment,
  canResetCreditStatus,
  isItSupportBlockedFromProgramData,
  IT_SUPPORT_DENIED_MESSAGE,
} from "@/lib/authz";
import { getAllowedVillageIds, householdScopeWhere } from "@/lib/scope";
import { findVillageOfficials } from "@/lib/officials";

export const dynamic = "force-dynamic";

export default async function LoansPage() {
  const user = await requireUser();

  // เล่มเหลือง: IT_SUPPORT ไม่มีสิทธิ์เข้าถึงข้อมูลโครงการเลย (Defense-in-Depth เพิ่มเติมจาก scope ว่างเปล่าเดิม)
  if (isItSupportBlockedFromProgramData(user)) {
    return (
      <PageContainer title="บัญชีคุมลูกหนี้" subtitle="ยอดเงินยืมคงเหลือและประวัติการคืนเงินของครัวเรือนเป้าหมาย">
        <SectionCard title="ไม่มีสิทธิ์เข้าถึง">
          <p className="text-sm text-slate-600">{IT_SUPPORT_DENIED_MESSAGE}</p>
        </SectionCard>
      </PageContainer>
    );
  }

  const scope = await getAllowedVillageIds(user);
  const theme = THEMES.yellow;
  const loans = await prisma.loan.findMany({
    where: householdScopeWhere(user, scope),
    orderBy: [{ isClosed: "asc" }, { receivedDate: "desc" }],
    include: {
      household: {
        select: {
          headFirstName: true,
          headLastName: true,
          users: { where: { role: "HOUSEHOLD" }, select: { phoneNumber: true }, take: 1 },
          village: {
            select: {
              id: true,
              villageName: true,
              villageNo: true,
              subDistrict: { select: { name: true, district: { select: { name: true, province: { select: { name: true } } } } } },
            },
          },
        },
      },
      repayments: true,
    },
  });
  const showNewLoanLink = canCreateOrUpdateLoan(user);
  const showRepaymentAction = canCreateRepayment(user);
  const showEditDeleteRepayment = canEditOrDeleteRepayment(user);
  const showResetCredit = canResetCreditStatus(user);

  // ค้นหาชื่อประธาน/กรรมการการเงินของแต่ละหมู่บ้านล่วงหน้าครั้งเดียว (ไม่ query ซ้ำต่อแถว) สำหรับพิมพ์ในใบเสร็จ
  const distinctVillageIds = [...new Set(loans.map((loan) => loan.household.village.id))];
  const villageOfficialsByVillageId = new Map(
    await Promise.all(
      distinctVillageIds.map(async (villageId) => [villageId, await findVillageOfficials(villageId)] as const)
    )
  );

  const overview = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badgeBg} ${theme.badgeText}`}>
          {theme.bookLabel}
        </span>
        {showNewLoanLink && (
          <Link
            href="/loans/new"
            className="inline-flex min-h-11 items-center rounded-full bg-amber-600 px-3.5 text-sm font-semibold text-white"
          >
            + บันทึกรายการยืมเงินใหม่
          </Link>
        )}
      </div>

      {loans.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          ยังไม่มีข้อมูลบัญชีคุมลูกหนี้ในระบบ — รายการจะถูกบันทึกที่นี่เมื่อแบบขอยืมเงินทุนได้รับการอนุมัติและจ่ายเงินแล้ว
        </p>
      ) : (
        <LoanRiskFilterList
          showRepaymentAction={showRepaymentAction}
          showEditDeleteRepayment={showEditDeleteRepayment}
          showResetCredit={showResetCredit}
          loans={loans.map((loan) => {
            const approvedRepayments = loan.repayments.filter((r) => r.status === "APPROVED");
            const { chairmanName = null, financeOrSecretaryName = null } =
              villageOfficialsByVillageId.get(loan.household.village.id) ?? {};
            return {
              id: loan.id,
              householdId: loan.householdId,
              borrowRound: loan.borrowRound,
              isClosed: loan.isClosed,
              riskStatus: loan.riskStatus,
              receivedDate: loan.receivedDate.toISOString(),
              amount: loan.amount,
              outstandingBalance: loan.outstandingBalance,
              headFirstName: loan.household.headFirstName,
              headLastName: loan.household.headLastName,
              householdPhone: loan.household.users[0]?.phoneNumber ?? null,
              villageNo: loan.household.village.villageNo,
              villageName: loan.household.village.villageName,
              subDistrictName: loan.household.village.subDistrict.name,
              districtName: loan.household.village.subDistrict.district.name,
              provinceName: loan.household.village.subDistrict.district.province.name,
              contractNo: loan.contractNo,
              chairmanName,
              financeOrSecretaryName,
              approvedRepayments: approvedRepayments.map((r) => ({
                id: r.id,
                paymentDate: r.paymentDate.toISOString(),
                amount: r.amount,
                receiptNo: r.receiptNo,
                note: r.note,
                transferSlipUrl: r.transferSlipUrl,
              })),
            };
          })}
        />
      )}
    </>
  );

  if (!showRepaymentAction) {
    return (
      <PageContainer title="บัญชีคุมลูกหนี้" subtitle="ยอดเงินยืมคงเหลือและประวัติการคืนเงินของครัวเรือนเป้าหมาย">
        {overview}
      </PageContainer>
    );
  }

  const villageFilter = scope === "all" ? {} : { household: { villageId: { in: scope } } };
  const pendingPaymentRows = await prisma.loanRepayment.findMany({
    where: { status: "PENDING", loan: villageFilter },
    orderBy: { createdAt: "asc" },
    include: {
      loan: {
        select: { id: true, borrowRound: true, household: { select: { headFirstName: true, headLastName: true } } },
      },
    },
  });
  const pendingPayments = pendingPaymentRows.map((p) => ({
    id: p.id,
    loanId: p.loan.id,
    amount: p.amount,
    paymentDate: p.paymentDate.toISOString(),
    transferSlipUrl: p.transferSlipUrl,
    householdNote: p.householdNote,
    householdName: `${p.loan.household.headFirstName} ${p.loan.household.headLastName}`,
    borrowRound: p.loan.borrowRound,
  }));

  return (
    <PageContainer title="บัญชีคุมลูกหนี้" subtitle="ยอดเงินยืมคงเหลือและประวัติการคืนเงินของครัวเรือนเป้าหมาย">
      <Suspense>
        <LoansPageTabs overview={overview} pendingPayments={pendingPayments} />
      </Suspense>
    </PageContainer>
  );
}
