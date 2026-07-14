import { Suspense } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { SmartOmnibar } from "@/components/dashboard/SmartOmnibar";
import { AccessDeniedToast } from "@/components/dashboard/AccessDeniedToast";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { PieChartCard } from "@/components/dashboard/PieChartCard";
import { BarChartCard } from "@/components/dashboard/BarChartCard";
import { LineChartCard } from "@/components/dashboard/LineChartCard";
import { DataTableCard } from "@/components/dashboard/DataTableCard";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { hasMinRole } from "@/lib/authz";
import { getAllowedVillageIds } from "@/lib/scope";
import { formatThaiDate } from "@/lib/thai";
import {
  getBigPictureDashboardData,
  getHouseholdKpis,
  getSubDistrictDashboardData,
  getVillageDashboardData,
} from "@/lib/analytics";

export const dynamic = "force-dynamic";

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
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
    <PageContainer title="Dashboard" subtitle="ภาพรวมข้อมูลตามสิทธิ์การเข้าถึงของคุณ (RBAC)">
      <Suspense>
        <AccessDeniedToast />
      </Suspense>
      <SmartOmnibar />

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
      <p className="text-sm font-semibold text-slate-600">{data.villageName}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="เงินทุนรวมในหมู่บ้าน" value={money(data.totalFund)} />
        <KpiCard label="เงินฝากธนาคาร (เล่มเขียว)" value={money(data.bankBalance)} />
        <KpiCard label="เงินในมือ" value={money(data.cashOnHand)} />
        <KpiCard label="จำนวนลูกหนี้ทั้งหมด" value={`${data.totalDebtors.toLocaleString("th-TH")} ราย`} />
      </div>

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
  const data = await getSubDistrictDashboardData(scope);

  return (
    <div className="flex flex-col gap-4">
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
async function BigPictureView({ user }: { user: CurrentUser }) {
  const scope = await getAllowedVillageIds(user);
  const data = await getBigPictureDashboardData(scope);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="จำนวนหมู่บ้าน" value={`${data.totalVillages.toLocaleString("th-TH")} แห่ง`} />
        <KpiCard label="จำนวนครัวเรือนเป้าหมาย" value={`${data.totalHouseholds.toLocaleString("th-TH")} ครัวเรือน`} />
        <KpiCard label="ยอดหนี้คงค้างรวม" value={money(data.totalOutstanding)} />
        <KpiCard label="เงินทุนรวมทั้งหมด" value={money(data.totalFund)} />
      </div>

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
