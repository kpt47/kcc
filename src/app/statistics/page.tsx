import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { PieChartCard } from "@/components/dashboard/PieChartCard";
import { requireUser } from "@/lib/auth";
import { canViewStatisticsDashboard, STATISTICS_DENIED_MESSAGE } from "@/lib/authz";
import { getAllowedVillageIds } from "@/lib/scope";
import {
  getBankBalanceStats,
  getInquiryStats,
  getLoanAmountStats,
  getLoginStats,
  getOccupationStats,
  getPopulationStats,
  getRiskContractStats,
} from "@/lib/statistics";

export const dynamic = "force-dynamic";

function money(n: number): string {
  return `${n.toLocaleString("th-TH")} บาท`;
}

// หน้า "ข้อมูลสถิติ" — เฉพาะส่วนกลาง/พัฒนาการจังหวัด/พัฒนาการอำเภอ/พัฒนากรตำบล (ดู canViewStatisticsDashboard)
// ทุกส่วนข้อมูลกรองตามเขตพื้นที่ที่ผู้ใช้มีสิทธิ์ (getAllowedVillageIds) เท่านั้น — ดูฟังก์ชันดึงข้อมูลทั้งหมดที่ lib/statistics.ts
export default async function StatisticsPage() {
  const user = await requireUser();

  if (!canViewStatisticsDashboard(user)) {
    return (
      <PageContainer title="ข้อมูลสถิติ" subtitle="ภาพรวมข้อมูลเชิงสถิติของโครงการ กข.คจ.">
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {STATISTICS_DENIED_MESSAGE}
        </p>
      </PageContainer>
    );
  }

  const scope = await getAllowedVillageIds(user);
  const [population, risk, bank, loanAmount, occupation, inquiry, login] = await Promise.all([
    getPopulationStats(scope),
    getRiskContractStats(scope),
    getBankBalanceStats(scope),
    getLoanAmountStats(scope),
    getOccupationStats(scope),
    getInquiryStats(scope),
    getLoginStats(user, scope),
  ]);

  return (
    <PageContainer title="ข้อมูลสถิติ" subtitle="ภาพรวมข้อมูลเชิงสถิติของโครงการ กข.คจ. ตามสิทธิ์การเข้าถึงพื้นที่ของคุณ">
      <SectionCard title="1. จำนวนประชากรและสัดส่วนเพศ" description="นับจากจำนวนสมาชิกและเพศของหัวหน้าครัวเรือนเป้าหมายที่ลงทะเบียนไว้ (ระบบไม่ได้เก็บเพศรายบุคคลของสมาชิกทุกคนในครัวเรือน)">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <KpiCard label="จำนวนประชากร (รวมทุกครัวเรือน)" value={`${population.totalPopulation.toLocaleString("th-TH")} คน`} icon="households" />
          <KpiCard label="จำนวนครัวเรือนเป้าหมาย" value={`${population.totalHouseholds.toLocaleString("th-TH")} ครัวเรือน`} icon="villages" />
        </div>
        <PieChartCard
          title="สัดส่วนเพศของหัวหน้าครัวเรือน"
          filename="stats-gender-ratio"
          unit="ครัวเรือน"
          excelValueLabel="จำนวนครัวเรือน"
          data={[
            { name: "ชาย", value: population.maleCount },
            { name: "หญิง", value: population.femaleCount },
            ...(population.unknownGenderCount > 0 ? [{ name: "ไม่ระบุ", value: population.unknownGenderCount }] : []),
          ]}
        />
      </SectionCard>

      <SectionCard title="2. ระดับความเสี่ยงหนี้" description="นับจากจำนวนสัญญาเงินยืมทั้งหมดในเขตพื้นที่ของคุณ — สัญญาที่ปิดแล้วจัดอยู่ในหมวด &quot;ไม่มีข้อมูล&quot; เนื่องจากไม่มีการประเมินความเสี่ยงต่อหลังปิดสัญญา">
        <PieChartCard
          title="ระดับความเสี่ยงหนี้ (นับจากจำนวนสัญญา)"
          filename="stats-risk-status"
          unit="สัญญา"
          excelValueLabel="จำนวนสัญญา"
          data={[
            { name: "ปกติ", value: risk.normal },
            { name: "เฝ้าระวัง", value: risk.watchlist },
            { name: "เสี่ยงสูง", value: risk.highRisk },
            { name: "ไม่มีข้อมูล", value: risk.noData },
          ]}
        />
      </SectionCard>

      <SectionCard title="3. ยอดเงินในบัญชีคุมเงินฝาก" description="ยอดคงเหลือล่าสุดของบัญชีธนาคารหมู่บ้าน กข.คจ. ทุกบัญชีในเขตพื้นที่ของคุณ (เล่มเขียว)">
        <KpiCard label="ยอดเงินในบัญชีทั้งหมด" value={money(bank.totalBalance)} icon="bank" />
        {bank.byBank.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">แยกตามธนาคาร</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {bank.byBank.map((b) => (
                <div
                  key={b.bankName}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60"
                >
                  <span className="text-slate-600 dark:text-slate-300">{b.bankName}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{money(b.balance)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="4. ยอดเงินคงค้างเทียบกับยอดเงินทั้งหมด" description="ยอดเงินยืมสะสมทุกสัญญา (ทั้งที่ปิดแล้วและยังไม่ปิด) เทียบกับยอดคงค้างของสัญญาที่ยังไม่ปิด">
        <PieChartCard
          title="ยอดเงินคงค้าง เทียบกับ ยอดเงินทั้งหมด"
          filename="stats-outstanding-vs-total"
          data={[
            { name: "คงค้าง", value: loanAmount.outstanding },
            { name: "ชำระแล้ว", value: loanAmount.repaid },
          ]}
        />
      </SectionCard>

      <SectionCard title="5. สัดส่วนอาชีพ" description="อาชีพของหัวหน้าครัวเรือนเป้าหมายตามที่ลงทะเบียนไว้ — อาชีพที่พบน้อยรวมอยู่ในหมวด &quot;อื่นๆ&quot;">
        <PieChartCard
          title="สัดส่วนอาชีพของครัวเรือนเป้าหมาย"
          filename="stats-occupation"
          unit="ครัวเรือน"
          excelValueLabel="จำนวนครัวเรือน"
          data={occupation.map((o) => ({ name: o.occupation, value: o.count }))}
        />
      </SectionCard>

      <SectionCard title="6. สถิติการปรึกษา/ร้องทุกข์" description="จำนวนคำร้อง &quot;ปรึกษา/ร้องทุกข์&quot; จากครัวเรือนเป้าหมายในเขตพื้นที่ของคุณ แยกตามสถานะการดำเนินการ">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="ยังไม่ดำเนินการ" value={`${inquiry.pending.toLocaleString("th-TH")} รายการ`} tone={inquiry.pending > 0 ? "warn" : "default"} />
          <KpiCard label="กำลังแก้ไข" value={`${inquiry.inProgress.toLocaleString("th-TH")} รายการ`} />
          <KpiCard label="เรียบร้อยแล้ว" value={`${inquiry.resolved.toLocaleString("th-TH")} รายการ`} tone="good" />
          <KpiCard label="อื่นๆ" value={`${inquiry.other.toLocaleString("th-TH")} รายการ`} />
        </div>
        <PieChartCard
          title="สัดส่วนสถานะคำร้องปรึกษา/ร้องทุกข์"
          filename="stats-inquiry-status"
          unit="รายการ"
          excelValueLabel="จำนวนรายการ"
          data={[
            { name: "ยังไม่ดำเนินการ", value: inquiry.pending },
            { name: "กำลังแก้ไข", value: inquiry.inProgress },
            { name: "เรียบร้อยแล้ว", value: inquiry.resolved },
            { name: "อื่นๆ", value: inquiry.other },
          ]}
        />
      </SectionCard>

      <SectionCard title="7. สถิติการเข้าใช้งานระบบ" description="จำนวนครั้งที่เข้าสู่ระบบสำเร็จของผู้ใช้งานในเขตพื้นที่ของคุณ (นับรวมทั้งครัวเรือน คณะกรรมการหมู่บ้าน และเจ้าหน้าที่ในพื้นที่)">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard label="เข้าสู่ระบบสำเร็จทั้งหมด" value={`${login.totalLogins.toLocaleString("th-TH")} ครั้ง`} />
          <KpiCard label="เข้าสู่ระบบใน 30 วันล่าสุด" value={`${login.last30Days.toLocaleString("th-TH")} ครั้ง`} />
          <KpiCard label="จำนวนผู้ใช้งานที่ไม่ซ้ำกัน" value={`${login.uniqueUsers.toLocaleString("th-TH")} คน`} />
        </div>
      </SectionCard>
    </PageContainer>
  );
}
