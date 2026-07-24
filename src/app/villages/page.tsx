import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { SmartOmnibar } from "@/components/dashboard/SmartOmnibar";
import { prisma } from "@/lib/prisma";
import { THEMES } from "@/lib/theme";
import { formatThaiDate } from "@/lib/formatDate";
import { VILLAGE_ADDRESS_INCLUDE, villageAddress } from "@/lib/geo";
import { requireUser } from "@/lib/auth";
import { getAllowedVillageIds, scopeWhereDirect } from "@/lib/scope";
import { canViewVillageStatusBook, VILLAGE_STATUS_BOOK_DENIED_MESSAGE } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function VillagesPage() {
  const user = await requireUser();

  // เล่มน้ำตาล: อนุญาตเฉพาะพัฒนากรตำบล ผู้บริหารอำเภอ และผู้บริหารจังหวัดเท่านั้น (ดู lib/authz.ts)
  if (!canViewVillageStatusBook(user)) {
    return (
      <PageContainer title="สถานะหมู่บ้าน" subtitle="ภาพรวมสถานะกองทุน กข.คจ. รายหมู่บ้าน">
        <SectionCard title="ไม่มีสิทธิ์เข้าถึง">
          <p className="text-sm text-slate-600">{VILLAGE_STATUS_BOOK_DENIED_MESSAGE}</p>
        </SectionCard>
      </PageContainer>
    );
  }

  const scope = await getAllowedVillageIds(user);
  const theme = THEMES.brown;
  const villages = await prisma.village.findMany({
    where: scopeWhereDirect(scope, "id"),
    orderBy: [
      { subDistrict: { district: { province: { name: "asc" } } } },
      { subDistrict: { district: { name: "asc" } } },
      { villageName: "asc" },
    ],
    include: {
      households: {
        select: {
          isDefaulted: true,
          loanRequests: { select: { committeeDecision: true, committeeAmount: true, requestedAmount: true } },
        },
      },
      statusSnapshots: { orderBy: { recordedAt: "desc" }, take: 1 },
      ...VILLAGE_ADDRESS_INCLUDE,
    },
  });

  return (
    <PageContainer title="สถานะหมู่บ้าน" subtitle="ภาพรวมสถานะกองทุน กข.คจ. รายหมู่บ้าน">
      <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badgeBg} ${theme.badgeText}`}>
        {theme.bookLabel}
      </span>

      <SmartOmnibar />

      {villages.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          ยังไม่มีหมู่บ้านในระบบ
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {villages.map((v) => {
            const defaultedCount = v.households.filter((h) => h.isDefaulted).length;
            const approvedLoans = v.households.flatMap((h) =>
              h.loanRequests.filter((lr) => lr.committeeDecision === "approved")
            );
            const householdsWithLoan = v.households.filter((h) =>
              h.loanRequests.some((lr) => lr.committeeDecision === "approved")
            ).length;
            const disbursedTotal = approvedLoans.reduce((sum, lr) => sum + (lr.committeeAmount ?? lr.requestedAmount), 0);
            const snapshot = v.statusSnapshots[0];
            const addr = villageAddress(v);

            return (
              <div key={v.id} className={`flex flex-col gap-3 rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-4`}>
                <div>
                  <p className={`text-base font-bold ${theme.headingText}`}>
                    หมู่ {v.villageNo} บ้าน{v.villageName}
                  </p>
                  <p className="text-sm text-slate-600">
                    ต.{addr.subDistrictName} อ.{addr.districtName} จ.{addr.provinceName} · งบประมาณปี {v.budgetYear}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="ครัวเรือนเป้าหมาย" value={`${v.households.length} ครัวเรือน`} />
                  <Stat label="ได้รับเงินยืมแล้ว" value={`${householdsWithLoan} ครัวเรือน`} />
                  <Stat label="เงินทุนที่อนุมัติจ่ายแล้ว" value={`${disbursedTotal.toLocaleString("th-TH")} บาท`} />
                  <Stat
                    label="ผิดสัญญา"
                    value={`${defaultedCount} ครัวเรือน`}
                    warn={defaultedCount > 0}
                  />
                </div>

                {snapshot ? (
                  <div className="rounded-xl border border-[#E4CBA3] bg-white/60 p-3 text-sm text-slate-600">
                    <p className="font-semibold text-slate-700">
                      บันทึกสถานะล่าสุด: {formatThaiDate(snapshot.recordedAt)}
                    </p>
                    <p>เงินทุนอยู่ที่ครัวเรือน: {snapshot.fundWithHouseholds.toLocaleString("th-TH")} บาท</p>
                    <p>เงินทุนในบัญชีเงินฝาก: {snapshot.fundInBankAccount.toLocaleString("th-TH")} บาท</p>
                  </div>
                ) : (
                  <p className="text-sm italic text-slate-400">ยังไม่มีการบันทึกสถานะส่งมอบ-รับมอบอย่างเป็นทางการ</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-white/70 p-2.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm font-bold ${warn ? "text-red-700" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}
