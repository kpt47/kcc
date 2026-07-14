import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { WorkerOpinionAction } from "@/components/workflow/WorkerOpinionAction";
import { ApproveAction } from "@/components/workflow/ApproveAction";
import { ProposalSelfEditAction } from "@/components/workflow/ProposalSelfEditAction";
import { prisma } from "@/lib/prisma";
import { formatThaiDate } from "@/lib/thai";
import { requireUser } from "@/lib/auth";
import { canApproveProposalOrLoanRequest, canGiveWorkerOpinion, canViewRiskAssessment } from "@/lib/authz";
import { getAllowedVillageIds, householdScopeWhere } from "@/lib/scope";

const WORKER_OPINION_LABEL: Record<string, string> = {
  possible: "เป็นไปได้",
  not_possible: "เป็นไปไม่ได้",
};

export const dynamic = "force-dynamic";

const DECISION_LABEL: Record<string, string> = {
  approved: "อนุมัติ",
  rejected: "ไม่อนุมัติ",
};

export default async function ProposalsPage() {
  const user = await requireUser();
  const scope = await getAllowedVillageIds(user);
  const proposals = await prisma.projectProposal.findMany({
    where: householdScopeWhere(user, scope),
    orderBy: { createdAt: "desc" },
    include: { household: { include: { village: true } } },
  });
  const showWorkerOpinionAction = canGiveWorkerOpinion(user);
  const showApproveAction = canApproveProposalOrLoanRequest(user);
  const showRiskAssessment = canViewRiskAssessment(user);

  return (
    <PageContainer title="แบบเสนอโครงการ" subtitle="รายการแบบเสนอโครงการของครัวเรือนเป้าหมายทั้งหมด">
      <div className="flex items-center justify-between gap-3">
        <span />
        <Link
          href="/proposals/new"
          className="inline-flex min-h-11 items-center rounded-full bg-sky-600 px-3.5 text-sm font-semibold text-white"
        >
          + แบบเสนอโครงการใหม่
        </Link>
      </div>

      {proposals.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          ยังไม่มีแบบเสนอโครงการในระบบ
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {proposals.map((p) => (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-bold text-slate-900">{p.projectName}</p>
                  <p className="text-sm text-slate-600">
                    {p.household.headFirstName} {p.household.headLastName} · หมู่ {p.household.village.villageNo} บ้าน
                    {p.household.village.villageName}
                  </p>
                </div>
                <a
                  href={`/api/proposals/${p.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-slate-300 px-3.5 text-xs font-semibold text-slate-600 transition hover:border-sky-400 hover:text-sky-700"
                >
                  พิมพ์ PDF
                </a>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                <span>วันที่เสนอ: {formatThaiDate(p.proposedDate)}</span>
                <span>จำนวนเงิน: {p.totalAmount.toLocaleString("th-TH")} บาท</span>
                <span>
                  ความเห็นพัฒนากร:{" "}
                  {p.workerOpinion ? WORKER_OPINION_LABEL[p.workerOpinion] ?? p.workerOpinion : "ยังไม่ให้ความเห็น"}
                </span>
                <span>
                  ผลพิจารณา:{" "}
                  {p.committeeDecision ? DECISION_LABEL[p.committeeDecision] ?? p.committeeDecision : "ยังไม่พิจารณา"}
                </span>
              </div>
              {(user.role === "HOUSEHOLD" && !p.workerOpinion) ||
              (showWorkerOpinionAction && !p.workerOpinion) ||
              (showApproveAction && p.workerOpinion && !p.committeeDecision) ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {user.role === "HOUSEHOLD" && !p.workerOpinion && (
                    <ProposalSelfEditAction id={p.id} projectName={p.projectName} totalAmount={p.totalAmount} proposedDate={p.proposedDate.toISOString()} />
                  )}
                  {showWorkerOpinionAction && !p.workerOpinion && (
                    <WorkerOpinionAction id={p.id} kind="proposal" showRiskAssessment={showRiskAssessment} />
                  )}
                  {showApproveAction && p.workerOpinion && !p.committeeDecision && (
                    <ApproveAction id={p.id} kind="proposal" showRiskAssessment={showRiskAssessment} />
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
