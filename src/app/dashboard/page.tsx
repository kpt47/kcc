import { Suspense } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { AccessDeniedToast } from "@/components/dashboard/AccessDeniedToast";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { PieChartCard } from "@/components/dashboard/PieChartCard";
import { BarChartCard } from "@/components/dashboard/BarChartCard";
import { LineChartCard } from "@/components/dashboard/LineChartCard";
import { DataTableCard } from "@/components/dashboard/DataTableCard";
import { AreaSummaryCard } from "@/components/dashboard/AreaSummaryCard";
import { RadialGaugeCard } from "@/components/dashboard/RadialGaugeCard";
import { RiskPieCard } from "@/components/dashboard/RiskPieCard";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { hasMinRole } from "@/lib/authz";
import { getAllowedVillageIds } from "@/lib/scope";
import { formatThaiDate } from "@/lib/formatDate";
import {
  getBigPictureDashboardData,
  getHouseholdKpis,
  getNplStatus,
  getNplWatchlist,
  getSubDistrictDashboardData,
  getVillageDashboardData,
  getVillageFundStatusRows,
  GOVERNMENT_FUND_PRINCIPAL,
  type NplWatchlistLevel,
} from "@/lib/analytics";

export const dynamic = "force-dynamic";

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      {message}
    </div>
  );
}

function money(n: number): string {
  return `${n.toLocaleString("th-TH")} บาท`;
}

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <PageContainer title="รายงานการเงิน" subtitle="ภาพรวมข้อมูลตามสิทธิ์การเข้าถึงของคุณ (RBAC)">
      <Suspense>
        <AccessDeniedToast />
      </Suspense>

      {user.role === "HOUSEHOLD" && <HouseholdView user={user} />}
      {user.role === "VILLAGE_COMMITTEE" && <VillageView user={user} />}
      {user.role === "SUB_DISTRICT_ADMIN" && <SubDistrictView user={user} />}
      {hasMinRole(user, "DISTRICT_ADMIN") && <BigPictureView user={user} />}
    </PageContainer>
  );
}

// ---------------------------------------------------------------------------
// ระดับครัวเรือน
// ---------------------------------------------------------------------------
async function HouseholdView({ user }: { user: CurrentUser }) {
  const kpis = await getHouseholdKpis(user);
  if (!kpis) return <EmptyState message="บัญชีของคุณยังไม่ได้ผูกกับครัวเรือนเป้าหมายใดในระบบ" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          label="ยอดหนี้คงเหลือ"
          value={money(kpis.outstandingBalance)}
          tone={kpis.outstandingBalance > 0 ? "warn" : "good"}
          icon="debt"
          trend={kpis.repaymentTrend.some((v) => v > 0) ? kpis.repaymentTrend : undefined}
        />
        <KpiCard
          label="วันครบกำหนดชำระงวดถัดไป"
          value={kpis.nextDueDate ? formatThaiDate(kpis.nextDueDate) : "ไม่มีกำหนด"}
        />
      </div>
      <PieChartCard
        title="สัดส่วนยอดชำระแล้ว vs ยอดค้างชำระ"
        subtitle="อ้างอิงบัญชีคุมลูกหนี้ (เล่มเหลือง)"
        filename="household-loan-summary"
        data={kpis.pieData}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ระดับหมู่บ้าน
// ---------------------------------------------------------------------------
async function VillageView({ user }: { user: CurrentUser }) {
  if (!user.scopeVillageId) return <EmptyState message="บัญชีของคุณยังไม่ได้ผูกกับหมู่บ้านใด" />;
  const data = await getVillageDashboardData(user.scopeVillageId);
  if (!data) return <EmptyState message="ไม่พบข้อมูลหมู่บ้าน" />;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{data.villageName}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="เงินทุนรวมในหมู่บ้าน"
          value={money(data.totalFund)}
          tone={data.fundShortfall > 0 ? "warn" : "good"}
          icon="fund"
          hint={
            data.fundShortfall > 0
              ? `ขาดเงินต้นทุน ${money(data.fundShortfall)} จากที่ต้องมี ${money(data.requiredFund)}`
              : `ครบตามเกณฑ์เงินต้นทุน ${money(data.requiredFund)}`
          }
        />
        <KpiCard label="เงินฝากธนาคาร (เล่มเขียว)" value={money(data.bankBalance)} icon="bank" />
        <KpiCard label="เงินในมือ" value={money(data.cashOnHand)} icon="cash" />
        <KpiCard label="จำนวนลูกหนี้ทั้งหมด" value={`${data.totalDebtors.toLocaleString("th-TH")} ราย`} icon="debtors" />
      </div>

      <RadialGaugeCard
        label="ความครบถ้วนเงินทุนต้นทุน"
        percent={data.requiredFund > 0 ? (data.totalFund / data.requiredFund) * 100 : 100}
        tone={data.fundShortfall > 0 ? "warn" : "good"}
        hint={data.fundShortfall > 0 ? `ขาดอยู่ ${money(data.fundShortfall)}` : "ครบตามเกณฑ์แล้ว"}
      />

      {data.fundShortfall > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          ⚠ เงินทุนต้นทุนของรัฐบาลในหมู่บ้านนี้ต่ำกว่าเกณฑ์ที่ต้องมี ({money(GOVERNMENT_FUND_PRINCIPAL)}) — มีความเสี่ยงที่เงินทุนจะสูญหายไปจากระบบ
          กรุณาตรวจสอบบัญชีคุมเงินฝาก (เล่มเขียว) และบัญชีคุมลูกหนี้ (เล่มเหลือง) โดยด่วน
        </div>
      )}

      <BarChartCard
        title="สรุปการรับชำระเงินรายเดือน"
        subtitle="12 เดือนล่าสุด"
        filename="village-monthly-repayments"
        data={data.monthlyRepayments}
        xKey="month"
        yKey="amount"
        yLabel="ยอดรับชำระ"
      />

      <DataTableCard
        title="การแจ้งเตือนหนี้ค้างชำระ"
        subtitle="ครัวเรือนที่เลยกำหนดชำระและยังไม่ปิดสัญญา"
        filename="village-overdue-loans"
        emptyMessage="ไม่มีครัวเรือนค้างชำระในขณะนี้"
        columnLabels={["ครัวเรือน", "ยอดค้างชำระ", "วันครบกำหนด", "ค้างชำระมาแล้ว"]}
        rows={data.overdueLoans.map((r) => ({
          cells: [r.householdName, money(r.outstandingBalance), formatThaiDate(r.dueDate), `${r.daysOverdue} วัน`],
          excel: {
            ครัวเรือน: r.householdName,
            ยอดค้างชำระ: r.outstandingBalance,
            วันครบกำหนด: formatThaiDate(r.dueDate),
            ค้างชำระมาแล้ว_วัน: r.daysOverdue,
          },
        }))}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ระดับตำบล (พัฒนากร)
// ---------------------------------------------------------------------------
async function SubDistrictView({ user }: { user: CurrentUser }) {
  const scope = await getAllowedVillageIds(user);
  const [data, fundRows] = await Promise.all([getSubDistrictDashboardData(scope), getVillageFundStatusRows(scope)]);
  const atRiskFundRows = fundRows.filter((r) => r.atRisk);

  return (
    <div className="flex flex-col gap-4">
      {atRiskFundRows.length > 0 && (
        <DataTableCard
          title={`หมู่บ้านที่เงินทุนต้นทุนต่ำกว่าเกณฑ์ (${money(GOVERNMENT_FUND_PRINCIPAL)})`}
          subtitle="เสี่ยงเงินทุนสูญหาย — เรียงจากขาดมากไปน้อย"
          filename="subdistrict-fund-at-risk"
          emptyMessage="ไม่มีหมู่บ้านที่เงินทุนต่ำกว่าเกณฑ์"
          columnLabels={["หมู่บ้าน", "เงินทุนต้นทุนที่ต้องมี", "เงินทุนรวมปัจจุบัน", "ขาดอยู่"]}
          rows={atRiskFundRows.map((r) => ({
            cells: [r.villageName, money(r.requiredFund), money(r.currentFund), money(r.fundShortfall)],
            excel: {
              หมู่บ้าน: r.villageName,
              เงินทุนต้นทุนที่ต้องมี: r.requiredFund,
              เงินทุนรวมปัจจุบัน: r.currentFund,
              ขาดอยู่: r.fundShortfall,
            },
          }))}
        />
      )}

      <DataTableCard
        title="ภาพรวมทุกหมู่บ้านที่ดูแล"
        filename="subdistrict-village-overview"
        emptyMessage="ไม่มีหมู่บ้านในความรับผิดชอบ"
        columnLabels={["หมู่บ้าน", "จำนวนลูกหนี้", "ยอดหนี้คงค้าง", "รายที่ค้างชำระ", "ยอดค้างชำระ"]}
        rows={data.villageOverview.map((r) => ({
          cells: [
            r.villageName,
            `${r.debtorCount} ราย`,
            money(r.outstandingBalance),
            `${r.overdueCount} ราย`,
            money(r.overdueAmount),
          ],
          excel: {
            หมู่บ้าน: r.villageName,
            จำนวนลูกหนี้: r.debtorCount,
            ยอดหนี้คงค้าง: r.outstandingBalance,
            รายที่ค้างชำระ: r.overdueCount,
            ยอดค้างชำระ: r.overdueAmount,
          },
        }))}
      />

      <LineChartCard
        title="แนวโน้มรายได้ จปฐ. ก่อน-หลังกู้ 1-3 ปี"
        subtitle="ค่าเฉลี่ยรายได้ต่อคนต่อปี (อ้างอิงบัญชีเล่มม่วง)"
        filename="subdistrict-income-trend"
        data={data.incomeTrend}
        xKey="stage"
        yKey="avgIncome"
        yLabel="รายได้เฉลี่ย"
      />

      <DataTableCard
        title="หมู่บ้านที่มีปัญหาหนี้ค้างชำระ"
        filename="subdistrict-problem-villages"
        emptyMessage="ไม่มีหมู่บ้านที่มีปัญหาหนี้ค้างชำระในขณะนี้"
        columnLabels={["หมู่บ้าน", "รายที่ค้างชำระ", "ยอดค้างชำระ"]}
        rows={data.problemVillages.map((r) => ({
          cells: [r.villageName, `${r.overdueCount} ราย`, money(r.overdueAmount)],
          excel: { หมู่บ้าน: r.villageName, รายที่ค้างชำระ: r.overdueCount, ยอดค้างชำระ: r.overdueAmount },
        }))}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ระดับอำเภอ / จังหวัด / ส่วนกลาง
// ---------------------------------------------------------------------------
function watchlistLevelForRole(role: CurrentUser["role"]): NplWatchlistLevel {
  if (role === "DISTRICT_ADMIN") return "subDistrict";
  if (role === "PROVINCIAL_ADMIN") return "district";
  return "province"; // GLOBAL_ADMIN
}

const WATCHLIST_LEVEL_LABEL: Record<NplWatchlistLevel, string> = {
  subDistrict: "ตำบล",
  district: "อำเภอ",
  province: "จังหวัด",
};

async function BigPictureView({ user }: { user: CurrentUser }) {
  const scope = await getAllowedVillageIds(user);
  const data = await getBigPictureDashboardData(scope);
  const watchlistLevel = watchlistLevelForRole(user.role);
  const [nplStatus, nplWatchlist, fundRows] = await Promise.all([
    getNplStatus(scope),
    getNplWatchlist(scope, watchlistLevel),
    getVillageFundStatusRows(scope),
  ]);
  const atRiskFundRows = fundRows.filter((r) => r.atRisk);
  const totalRequiredFund = fundRows.reduce((s, r) => s + r.requiredFund, 0);
  const totalCurrentFund = fundRows.reduce((s, r) => s + r.currentFund, 0);
  const fundCoveragePercent = totalRequiredFund > 0 ? (totalCurrentFund / totalRequiredFund) * 100 : 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="จำนวนหมู่บ้าน" value={`${data.totalVillages.toLocaleString("th-TH")} แห่ง`} icon="villages" />
        <KpiCard
          label="จำนวนครัวเรือนเป้าหมาย"
          value={`${data.totalHouseholds.toLocaleString("th-TH")} ครัวเรือน`}
          icon="households"
        />
        <KpiCard label="ยอดหนี้คงค้างรวม" value={money(data.totalOutstanding)} icon="debt" />
        <KpiCard label="เงินทุนรวมทั้งหมด" value={money(data.totalFund)} icon="fund" />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
          เงินทุนต้นทุนรัฐบาล (เกณฑ์ {money(GOVERNMENT_FUND_PRINCIPAL)} ต่อหมู่บ้าน)
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            label="หมู่บ้านเงินทุนต่ำกว่าเกณฑ์"
            value={`${atRiskFundRows.length.toLocaleString("th-TH")} แห่ง`}
            tone={atRiskFundRows.length > 0 ? "warn" : "good"}
            hint={atRiskFundRows.length > 0 ? "เสี่ยงเงินทุนสูญหาย — ตรวจสอบด่วน" : "ทุกหมู่บ้านมีเงินทุนครบตามเกณฑ์"}
          />
          <RadialGaugeCard
            label="ความครบถ้วนเงินทุนทั้งขอบเขต"
            percent={fundCoveragePercent}
            tone={atRiskFundRows.length > 0 ? "warn" : "good"}
          />
        </div>
      </div>

      {atRiskFundRows.length > 0 && (
        <DataTableCard
          title={`หมู่บ้านที่เงินทุนต้นทุนต่ำกว่าเกณฑ์ (${money(GOVERNMENT_FUND_PRINCIPAL)})`}
          subtitle="เสี่ยงเงินทุนสูญหาย — เรียงจากขาดมากไปน้อย"
          filename="fund-at-risk-villages"
          emptyMessage="ไม่มีหมู่บ้านที่เงินทุนต่ำกว่าเกณฑ์"
          columnLabels={["หมู่บ้าน", "เงินทุนต้นทุนที่ต้องมี", "เงินทุนรวมปัจจุบัน", "ขาดอยู่"]}
          rows={atRiskFundRows.map((r) => ({
            cells: [r.villageName, money(r.requiredFund), money(r.currentFund), money(r.fundShortfall)],
            excel: {
              หมู่บ้าน: r.villageName,
              เงินทุนต้นทุนที่ต้องมี: r.requiredFund,
              เงินทุนรวมปัจจุบัน: r.currentFund,
              ขาดอยู่: r.fundShortfall,
            },
          }))}
        />
      )}

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-400">สถานะ NPL</p>
        <RiskPieCard normalCount={nplStatus.normalCount} watchlistCount={nplStatus.watchlistCount} highRiskCount={nplStatus.highRiskCount} />
      </div>

      <DataTableCard
        title={`Watchlist 5 พื้นที่เสี่ยงสูงสุด (ราย${WATCHLIST_LEVEL_LABEL[watchlistLevel]})`}
        subtitle="เรียงตามอัตรา NPL สูงสุด"
        filename="npl-watchlist"
        emptyMessage="ไม่มีข้อมูลเพียงพอสำหรับจัดอันดับ"
        columnLabels={[WATCHLIST_LEVEL_LABEL[watchlistLevel], "อัตรา NPL", "หนี้คงค้าง", "ยอดค้างชำระ"]}
        rows={nplWatchlist.map((r) => ({
          cells: [r.areaName, `${(r.nplRatio * 100).toFixed(1)}%`, money(r.totalOutstanding), money(r.overdueAmount)],
          excel: {
            พื้นที่: r.areaName,
            NPL_เปอร์เซ็นต์: Number((r.nplRatio * 100).toFixed(1)),
            หนี้คงค้าง: r.totalOutstanding,
            ยอดค้างชำระ: r.overdueAmount,
          },
        }))}
      />

      <AreaSummaryCard />

      <DataTableCard
        title="หมู่บ้านที่มีผลประกอบการดีเด่น"
        subtitle="เรียงตามอัตราหนี้ค้างชำระ (NPL) ต่ำสุด — Top 5"
        filename="top-performing-villages"
        emptyMessage="ยังไม่มีข้อมูลเพียงพอสำหรับจัดอันดับ"
        columnLabels={["หมู่บ้าน", "อัตราหนี้ค้างชำระ (NPL)", "ยอดหนี้คงค้าง"]}
        rows={data.topPerforming.map((r) => ({
          cells: [r.villageName, `${(r.nplRatio * 100).toFixed(1)}%`, money(r.totalOutstanding)],
          excel: {
            หมู่บ้าน: r.villageName,
            NPL_เปอร์เซ็นต์: Number((r.nplRatio * 100).toFixed(1)),
            ยอดหนี้คงค้าง: r.totalOutstanding,
          },
        }))}
      />

      <DataTableCard
        title="หมู่บ้านที่มีปัญหาหนี้ค้างชำระสูงสุด (NPL)"
        subtitle="เรียงตามอัตราหนี้ค้างชำระ (NPL) สูงสุด — Top 5"
        filename="top-problem-villages"
        emptyMessage="ไม่มีหมู่บ้านที่มีปัญหาหนี้ค้างชำระ"
        columnLabels={["หมู่บ้าน", "อัตราหนี้ค้างชำระ (NPL)", "ยอดค้างชำระ"]}
        rows={data.topProblem.map((r) => ({
          cells: [r.villageName, `${(r.nplRatio * 100).toFixed(1)}%`, money(r.overdueAmount)],
          excel: {
            หมู่บ้าน: r.villageName,
            NPL_เปอร์เซ็นต์: Number((r.nplRatio * 100).toFixed(1)),
            ยอดค้างชำระ: r.overdueAmount,
          },
        }))}
      />
    </div>
  );
}
