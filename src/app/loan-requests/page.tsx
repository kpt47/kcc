import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { WorkerOpinionAction } from "@/components/workflow/WorkerOpinionAction";
import { ApproveAction } from "@/components/workflow/ApproveAction";
import { LoanRequestSelfEditAction } from "@/components/workflow/LoanRequestSelfEditAction";
import { prisma } from "@/lib/prisma";
import { formatThaiDate } from "@/lib/formatDate";
import { requireUser } from "@/lib/auth";
import { canApproveProposalOrLoanRequest, canGiveWorkerOpinion, canViewRiskAssessment } from "@/lib/authz";
import { getAllowedVillageIds, householdScopeWhere } from "@/lib/scope";
import { formatOfficialName } from "@/lib/officials";

export const dynamic = "force-dynamic";

const DECISION_LABEL: Record<string, string> = {
  approved: "อนุมัติ",
  rejected: "ไม่อนุมัติ",
};

const WORKER_OPINION_LABEL: Record<string, string> = {
  agree: "เห็นชอบ",
  disagree: "ไม่เห็นชอบ",
};

export default async function LoanRequestsPage() {
  const user = await requireUser();
  const scope = await getAllowedVillageIds(user);
  const requests = await prisma.loanRequest.findMany({
    where: householdScopeWhere(user, scope),
    orderBy: { createdAt: "desc" },
    include: { household: { include: { village: true } }, proposal: { select: { committeeAmount: true } } },
  });
  const showWorkerOpinionAction = canGiveWorkerOpinion(user);
  const showApproveAction = canApproveProposalOrLoanRequest(user);
  const showRiskAssessment = canViewRiskAssessment(user);

  // เติมชื่อผู้ใช้ปัจจุบันอัตโนมัติในช่อง "ชื่อพัฒนากรผู้รับผิดชอบ"/"ชื่อประธานคณะกรรมการ" (คำนำหน้า+ชื่อ+เว้น
  // 2 ตัวอักษร+นามสกุล) — ไม่ต้องพิมพ์ชื่อตัวเองซ้ำทุกครั้งที่ให้ความเห็น/พิจารณาอนุมัติ (ยังแก้ไขทับได้ตามปกติ)
  const [ownCommitteeProfile, ownOfficialProfile] = await Promise.all([
    showApproveAction ? prisma.committeeProfile.findUnique({ where: { userId: user.id } }) : null,
    showWorkerOpinionAction ? prisma.officialProfile.findUnique({ where: { userId: user.id } }) : null,
  ]);
  const defaultChairName = ownCommitteeProfile ? formatOfficialName(ownCommitteeProfile) : undefined;
  const defaultWorkerName = ownOfficialProfile ? formatOfficialName(ownOfficialProfile) : undefined;

  return (
    <PageContainer title="แบบขอยืมเงินทุน" subtitle="รายการแบบขอยืมเงินทุนของครัวเรือนเป้าหมายทั้งหมด">
      <div className="flex items-center justify-between gap-3">
        <span />
        <Link
          href="/loan-requests/new"
          className="inline-flex min-h-11 items-center rounded-full bg-amber-600 px-3.5 text-sm font-semibold text-white"
        >
          + แบบขอยืมเงินทุนใหม่
        </Link>
      </div>

      {requests.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          ยังไม่มีแบบขอยืมเงินทุนในระบบ
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-bold text-slate-900">
                    {r.household.headFirstName} {r.household.headLastName}
                  </p>
                  <p className="text-sm text-slate-600">
                    หมู่ {r.household.village.villageNo} บ้าน{r.household.village.villageName}
                  </p>
                </div>
                <a
                  href={`/api/loan-requests/${r.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-slate-300 px-3.5 text-xs font-semibold text-slate-600 transition hover:border-amber-400 hover:text-amber-700"
                >
                  พิมพ์ PDF
                </a>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                <span>วันที่ยื่น: {formatThaiDate(r.requestDate)}</span>
                <span>จำนวนเงิน: {r.requestedAmount.toLocaleString("th-TH")} บาท</span>
                <span>
                  ความเห็นพัฒนากร:{" "}
                  {r.workerOpinion ? WORKER_OPINION_LABEL[r.workerOpinion] ?? r.workerOpinion : "ยังไม่ให้ความเห็น"}
                </span>
                <span>
                  ผลพิจารณา:{" "}
                  {r.committeeDecision ? DECISION_LABEL[r.committeeDecision] ?? r.committeeDecision : "ยังไม่พิจารณา"}
                </span>
              </div>
              {(user.role === "HOUSEHOLD" && !r.workerOpinion) ||
              (showWorkerOpinionAction && !r.workerOpinion) ||
              (showApproveAction && r.workerOpinion && !r.committeeDecision) ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {user.role === "HOUSEHOLD" && !r.workerOpinion && (
                    <LoanRequestSelfEditAction id={r.id} requestedAmount={r.requestedAmount} requestDate={r.requestDate.toISOString()} />
                  )}
                  {showWorkerOpinionAction && !r.workerOpinion && (
                    <WorkerOpinionAction id={r.id} kind="loan-request" showRiskAssessment={showRiskAssessment} defaultWorkerName={defaultWorkerName} />
                  )}
                  {showApproveAction && r.workerOpinion && !r.committeeDecision && (
                    <ApproveAction
                      id={r.id}
                      kind="loan-request"
                      showRiskAssessment={showRiskAssessment}
                      defaultChairName={defaultChairName}
                      approvalCeiling={r.proposal?.committeeAmount ?? undefined}
                    />
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
