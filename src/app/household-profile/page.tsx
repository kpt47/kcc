import Link from "next/link";
import { User, Phone, CheckCircle2, XCircle, Clock3, FileText, Printer, FilePlus } from "lucide-react";
import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { prisma } from "@/lib/prisma";
import { requireUser, getHouseholdProfileView } from "@/lib/auth";
import { findVillageOfficials } from "@/lib/officials";
import { formatThaiDate } from "@/lib/thai";

const DECISION_LABEL: Record<string, string> = { approved: "อนุมัติ", rejected: "ไม่อนุมัติ" };
const DECISION_ICON: Record<string, typeof CheckCircle2> = { approved: CheckCircle2, rejected: XCircle };

// หน้า "ข้อมูลครัวเรือนของฉัน (เล่มม่วง)" — เฉพาะครัวเรือนเป้าหมาย แยกออกมาจาก HouseholdDashboard เดิม
// (ซึ่งก่อนหน้านี้ทั้งเมนู "ข้อมูลครัวเรือนของฉัน" และ "ประวัติหนี้สินของฉัน" ต่างก็ลิงก์ไปที่หน้าเดียวกัน (/)
// เพียงคนละ anchor ทำให้เนื้อหาซ้ำซ้อนกันทั้งหมด) หน้านี้แสดงเฉพาะข้อมูลตัวตน/ครัวเรือน + สถานะคำร้องที่ยื่นไว้
// ส่วนข้อมูลหนี้สิน/เงินยืมทั้งหมดย้ายไปอยู่ที่หน้า /debt-history แทน ไม่ซ้ำกันอีกต่อไป
export const dynamic = "force-dynamic";

export default async function HouseholdProfilePage() {
  const user = await requireUser();

  if (!user.householdId) {
    return (
      <PageContainer title="ข้อมูลครัวเรือนของฉัน" subtitle="เล่มม่วง — ทะเบียนครัวเรือนเป้าหมาย">
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          บัญชีของคุณยังไม่ได้ผูกกับครัวเรือนเป้าหมายใดในระบบ กรุณาติดต่อพัฒนากรหรือคณะกรรมการหมู่บ้านเพื่อดำเนินการผูกบัญชี
        </p>
      </PageContainer>
    );
  }

  const [household, profileView, proposals, loanRequests] = await Promise.all([
    prisma.targetHousehold.findUnique({
      where: { id: user.householdId },
      include: { village: { include: { subDistrict: { include: { district: { include: { province: true } } } } } } },
    }),
    getHouseholdProfileView(user),
    prisma.projectProposal.findMany({ where: { householdId: user.householdId }, orderBy: { createdAt: "desc" } }),
    prisma.loanRequest.findMany({ where: { householdId: user.householdId }, orderBy: { createdAt: "desc" } }),
  ]);

  if (!household) {
    return (
      <PageContainer title="ข้อมูลครัวเรือนของฉัน" subtitle="เล่มม่วง — ทะเบียนครัวเรือนเป้าหมาย">
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          บัญชีของคุณยังไม่ได้ผูกกับครัวเรือนเป้าหมายใดในระบบ
        </p>
      </PageContainer>
    );
  }

  const { chairmanName, chairmanPhone, financeOrSecretaryName, financeOrSecretaryPhone } = await findVillageOfficials(
    household.villageId
  );

  return (
    <PageContainer title="ข้อมูลครัวเรือนของฉัน" subtitle="เล่มม่วง — ทะเบียนครัวเรือนเป้าหมาย">
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

      {(chairmanName || financeOrSecretaryName) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-100">ติดต่อคณะกรรมการ กข.คจ. หมู่บ้าน</p>
          <div className="flex flex-col gap-2">
            {chairmanName && (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{chairmanName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">ประธานคณะกรรมการ</p>
                </div>
                {chairmanPhone && (
                  <a
                    href={`tel:${chairmanPhone}`}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 text-sm font-semibold text-white"
                  >
                    <Phone className="h-4 w-4" aria-hidden />
                    {chairmanPhone}
                  </a>
                )}
              </div>
            )}
            {financeOrSecretaryName && (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{financeOrSecretaryName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">ฝ่ายการเงิน/เลขานุการ</p>
                </div>
                {financeOrSecretaryPhone && (
                  <a
                    href={`tel:${financeOrSecretaryPhone}`}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 text-sm font-semibold text-white"
                  >
                    <Phone className="h-4 w-4" aria-hidden />
                    {financeOrSecretaryPhone}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {profileView && (
        <SectionCard title="ข้อมูลครัวเรือนเป้าหมาย" description="ข้อมูลตามทะเบียนครัวเรือน — แก้ไขได้ที่หน้า &quot;บัญชีของฉัน&quot; เท่านั้น">
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">ลำดับที่ครัวเรือนเป้าหมาย</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{profileView.targetRank}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">บ้านเลขที่</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{profileView.houseNumber ?? "-"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">หมู่ที่</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{profileView.moo}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">จำนวนสมาชิกในครัวเรือน</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{profileView.familyMemberCount ?? "-"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">อายุ</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{profileView.age ?? "-"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">อาชีพ</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{profileView.occupation ?? "-"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">ผู้ให้ความยินยอม</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">
                {profileView.consentPersonName ? `${profileView.consentPersonName} (${profileView.consentRelation ?? "-"})` : "-"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">รายได้ก่อนยืม (จปฐ.)</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">
                {profileView.incomeBefore != null ? `${profileView.incomeBefore.toLocaleString("th-TH")} บาท` : "-"}
              </dd>
            </div>
          </dl>
        </SectionCard>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">สถานะแบบฟอร์มคำร้องที่ฉันเป็นคนยื่น</h2>

        {proposals.length === 0 && loanRequests.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            คุณยังไม่ได้ยื่นแบบเสนอโครงการหรือแบบขอยืมเงินทุน
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {proposals.map((p) => {
              const DecisionIcon = p.committeeDecision ? DECISION_ICON[p.committeeDecision] ?? Clock3 : Clock3;
              return (
                <div key={`proposal-${p.id}`} className="rounded-xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-900 dark:bg-sky-950/40">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
                        <FileText className="h-4 w-4 shrink-0" aria-hidden />
                        แบบเสนอโครงการ
                      </p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{p.projectName}</p>
                    </div>
                    <a
                      href={`/api/proposals/${p.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-sky-300 px-3 text-xs font-semibold text-sky-700 dark:border-sky-700 dark:text-sky-300"
                    >
                      <Printer className="h-4 w-4 shrink-0" aria-hidden />
                      พิมพ์ PDF
                    </a>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                    วันที่ยื่น: {formatThaiDate(p.proposedDate)} · ผลพิจารณา:
                    <DecisionIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {p.committeeDecision ? DECISION_LABEL[p.committeeDecision] ?? p.committeeDecision : "ยังไม่พิจารณา"}
                  </p>
                </div>
              );
            })}
            {loanRequests.map((r) => {
              const DecisionIcon = r.committeeDecision ? DECISION_ICON[r.committeeDecision] ?? Clock3 : Clock3;
              return (
                <div key={`loan-request-${r.id}`} className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        <FileText className="h-4 w-4 shrink-0" aria-hidden />
                        แบบขอยืมเงินทุน
                      </p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {r.requestedAmount.toLocaleString("th-TH")} บาท
                      </p>
                    </div>
                    <a
                      href={`/api/loan-requests/${r.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-amber-300 px-3 text-xs font-semibold text-amber-700 dark:border-amber-700 dark:text-amber-300"
                    >
                      <Printer className="h-4 w-4 shrink-0" aria-hidden />
                      พิมพ์ PDF
                    </a>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                    วันที่ยื่น: {formatThaiDate(r.requestDate)} · ผลพิจารณา:
                    <DecisionIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {r.committeeDecision ? DECISION_LABEL[r.committeeDecision] ?? r.committeeDecision : "ยังไม่พิจารณา"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex flex-col gap-2 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:flex-wrap">
        <Link
          href="/proposals/new"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-sky-600 px-3.5 text-sm font-semibold text-white sm:w-auto"
        >
          <FilePlus className="h-5 w-5 shrink-0" aria-hidden />
          แบบเสนอโครงการใหม่
        </Link>
        <Link
          href="/loan-requests/new"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-amber-600 px-3.5 text-sm font-semibold text-white sm:w-auto"
        >
          <FilePlus className="h-5 w-5 shrink-0" aria-hidden />
          แบบขอยืมเงินทุนใหม่
        </Link>
      </div>
    </PageContainer>
  );
}
