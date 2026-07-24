import Link from "next/link";
import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { HouseholdSearchBar } from "@/components/households/HouseholdSearchBar";
import { SmartOmnibar } from "@/components/dashboard/SmartOmnibar";
import { ImportHouseholdsModal } from "@/components/households/ImportHouseholdsModal";
import { EntityListView, type EntityColumnDef, type EntityRow } from "@/components/shared/EntityListView";
import { StarRating } from "@/components/shared/StarRating";
import { getHouseholdStarRating } from "@/lib/rating";
import { prisma } from "@/lib/prisma";
import { THEMES } from "@/lib/theme";
import { requireUser } from "@/lib/auth";
import {
  canCreateHousehold,
  canImportHouseholds,
  canViewHouseholdPhoneNumber,
  isItSupportBlockedFromProgramData,
  IT_SUPPORT_DENIED_MESSAGE,
} from "@/lib/authz";
import { getAllowedVillageIds, householdSelfScopeWhere } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function HouseholdsPage() {
  const user = await requireUser();

  // เล่มม่วง: IT_SUPPORT ไม่มีสิทธิ์เข้าถึงข้อมูลโครงการเลย (Defense-in-Depth เพิ่มเติมจาก scope ว่างเปล่าเดิม)
  if (isItSupportBlockedFromProgramData(user)) {
    return (
      <PageContainer title="ทะเบียนครัวเรือนเป้าหมาย" subtitle="บัญชีทะเบียนครัวเรือนเป้าหมายทุกหมู่บ้าน">
        <SectionCard title="ไม่มีสิทธิ์เข้าถึง">
          <p className="text-sm text-slate-600">{IT_SUPPORT_DENIED_MESSAGE}</p>
        </SectionCard>
      </PageContainer>
    );
  }

  const scope = await getAllowedVillageIds(user);
  const theme = THEMES.purple;
  const showCreateLink = canCreateHousehold(user);
  const showImport = canImportHouseholds(user);
  const showPhoneNumber = canViewHouseholdPhoneNumber(user);
  const households = await prisma.targetHousehold.findMany({
    where: householdSelfScopeWhere(user, scope),
    orderBy: [{ villageId: "asc" }, { sequenceNo: "asc" }],
    include: {
      village: { select: { id: true, villageName: true, villageNo: true } },
      _count: { select: { proposals: true, loanRequests: true } },
      loans: { select: { isClosed: true, riskStatus: true } },
    },
  });

  const villageGroups = new Map<number, { village: (typeof households)[number]["village"]; households: typeof households }>();
  for (const h of households) {
    const group = villageGroups.get(h.village.id);
    if (group) {
      group.households.push(h);
    } else {
      villageGroups.set(h.village.id, { village: h.village, households: [h] });
    }
  }

  return (
    <PageContainer title="ทะเบียนครัวเรือนเป้าหมาย" subtitle="บัญชีทะเบียนครัวเรือนเป้าหมายทุกหมู่บ้าน">
      <div className="flex items-center justify-between gap-3">
        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badgeBg} ${theme.badgeText}`}>
          {theme.bookLabel}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {showImport && <ImportHouseholdsModal role={user.role} committeeRole={user.committeeRole} />}
          {showCreateLink && (
            <Link
              href="/households/new"
              className={`inline-flex min-h-11 items-center rounded-full px-3.5 text-sm font-semibold ${theme.chipBg} ${theme.chipText}`}
            >
              + ลงทะเบียนใหม่
            </Link>
          )}
        </div>
      </div>

      <SmartOmnibar />

      <HouseholdSearchBar />

      {households.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          ยังไม่มีครัวเรือนเป้าหมายในระบบ
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {[...villageGroups.values()].map(({ village, households: groupHouseholds }) => {
            const columns: EntityColumnDef[] = [
              { key: "sequenceNo", label: "ลำดับที่", align: "center" },
              { key: "name", label: "ชื่อ-สกุล" },
              { key: "houseNo", label: "บ้านเลขที่" },
              ...(showPhoneNumber ? [{ key: "phoneNumber", label: "โทรศัพท์" } as EntityColumnDef] : []),
              { key: "isDefaulted", label: "สถานะ", align: "center" },
              { key: "contractStars", label: "สถานะสัญญา", align: "center" },
              { key: "incomeBeforeLoan", label: "รายได้ก่อนยืม", align: "right" },
              { key: "proposals", label: "แบบเสนอโครงการ", align: "center" },
              { key: "loanRequests", label: "แบบขอยืมเงินทุน", align: "center" },
            ];

            const listRows: EntityRow[] = groupHouseholds.map((h) => {
              const rating = getHouseholdStarRating(h);
              return {
              key: h.id,
              sortValues: {
                sequenceNo: h.sequenceNo,
                name: `${h.headFirstName} ${h.headLastName}`,
                houseNo: h.houseNo ?? "",
                ...(showPhoneNumber ? { phoneNumber: h.phoneNumber ?? "" } : {}),
                isDefaulted: h.isDefaulted ? 1 : 0,
                contractStars: rating?.stars ?? -1,
                incomeBeforeLoan: h.incomeBeforeLoan ?? -1,
                proposals: h._count.proposals,
                loanRequests: h._count.loanRequests,
              },
              cells: {
                sequenceNo: h.sequenceNo,
                name: `${h.headFirstName} ${h.headLastName}`,
                houseNo: h.houseNo ?? "-",
                ...(showPhoneNumber ? { phoneNumber: h.phoneNumber ?? "-" } : {}),
                isDefaulted: h.isDefaulted ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">ผิดสัญญา</span>
                ) : (
                  <span className="text-xs text-slate-400">ปกติ</span>
                ),
                contractStars: rating ? (
                  <StarRating rating={rating.stars} size={16} label={rating.label} />
                ) : (
                  <span className="text-xs text-slate-400">ยังไม่มีสัญญา</span>
                ),
                incomeBeforeLoan: h.incomeBeforeLoan != null ? `${h.incomeBeforeLoan.toLocaleString("th-TH")} บาท` : "-",
                proposals: h._count.proposals,
                loanRequests: h._count.loanRequests,
              },
              card: (
                <div className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-4`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-base font-bold ${theme.headingText}`}>
                        ลำดับที่ {h.sequenceNo} - {h.headFirstName} {h.headLastName}
                      </p>
                      <div className="mt-1">
                        {rating ? (
                          <StarRating rating={rating.stars} label={rating.label} />
                        ) : (
                          <span className="text-xs text-slate-400">ยังไม่มีสัญญา</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        หมู่ {h.village.villageNo} บ้าน{h.village.villageName}
                        {h.houseNo ? ` เลขที่ ${h.houseNo}` : ""}
                      </p>
                    </div>
                    {h.isDefaulted && (
                      <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                        ผิดสัญญา
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    {showPhoneNumber && <span>โทรศัพท์: {h.phoneNumber ?? "-"}</span>}
                    <span>
                      รายได้ก่อนยืม: {h.incomeBeforeLoan != null ? `${h.incomeBeforeLoan.toLocaleString("th-TH")} บาท` : "-"}
                    </span>
                    <span>แบบเสนอโครงการ: {h._count.proposals} รายการ</span>
                    <span>แบบขอยืมเงินทุน: {h._count.loanRequests} รายการ</span>
                  </div>
                </div>
              ),
              };
            });

            return (
              <div key={village.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-700">
                    หมู่ {village.villageNo} บ้าน{village.villageName}
                  </p>
                  <a
                    href={`/api/villages/${village.id}/register-pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-3.5 text-xs font-semibold text-slate-600 transition hover:border-violet-400 hover:text-violet-700"
                  >
                    พิมพ์ทะเบียน (PDF)
                  </a>
                </div>

                <EntityListView rows={listRows} columns={columns} defaultSortField="sequenceNo" />
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
