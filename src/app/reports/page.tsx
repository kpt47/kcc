import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { DataTableCard } from "@/components/dashboard/DataTableCard";
import { requireUser } from "@/lib/auth";
import { hasMinRole } from "@/lib/authz";
import { getAllowedVillageIds } from "@/lib/scope";
import { getReport1Rows, getReport2Rows } from "@/lib/analytics";

export const dynamic = "force-dynamic";

function money(n: number): string {
  return `${n.toLocaleString("th-TH")} บาท`;
}

export default async function ReportsPage() {
  const user = await requireUser();

  if (!hasMinRole(user, "DISTRICT_ADMIN")) {
    return (
      <PageContainer title="รายงานราชการ" subtitle="แบบรายงานตามระเบียบ กข.คจ.">
        <SectionCard title="ไม่มีสิทธิ์เข้าถึง">
          <p className="text-sm text-slate-600">
            หน้านี้สำหรับเจ้าหน้าที่ระดับอำเภอ จังหวัด และส่วนกลางเท่านั้น
          </p>
        </SectionCard>
      </PageContainer>
    );
  }

  const scope = await getAllowedVillageIds(user);
  const [report1Rows, report2Rows] = await Promise.all([getReport1Rows(scope), getReport2Rows(scope)]);

  return (
    <PageContainer title="รายงานราชการ" subtitle="แบบรายงานตามระเบียบกระทรวงมหาดไทยว่าด้วยการบริหารเงินทุน กข.คจ. พ.ศ. 2553">
      <DataTableCard
        title="รายงาน 1: แบบรายงานภาวะหนี้สินและฐานะทางการเงิน"
        subtitle="ทุกหมู่บ้านในขอบเขตที่คุณดูแล"
        filename="report1-financial-status"
        emptyMessage="ไม่มีหมู่บ้านในขอบเขตที่คุณดูแล"
        columnLabels={[
          "ชื่อหมู่บ้าน",
          "จำนวนครัวเรือนทั้งหมด",
          "ครัวเรือนเป้าหมาย",
          "ครัวเรือนที่ได้ยืมเงิน",
          "เงินคงค้างอยู่",
          "เงินในบัญชีธนาคาร",
          "เงินในมือ",
          "รวมเงินทุน",
          "เงินที่ได้รับคืนรอบปี",
        ]}
        rows={report1Rows.map((r) => ({
          cells: [
            r.villageName,
            r.totalHouseholds.toLocaleString("th-TH"),
            r.targetHouseholds.toLocaleString("th-TH"),
            r.householdsWithLoan.toLocaleString("th-TH"),
            money(r.outstandingBalance),
            money(r.bankBalance),
            money(r.cashOnHand),
            money(r.totalFund),
            money(r.repaidThisYear),
          ],
          excel: {
            ชื่อหมู่บ้าน: r.villageName,
            จำนวนครัวเรือนทั้งหมด: r.totalHouseholds,
            ครัวเรือนเป้าหมาย: r.targetHouseholds,
            ครัวเรือนที่ได้ยืมเงิน: r.householdsWithLoan,
            เงินคงค้างอยู่: r.outstandingBalance,
            เงินในบัญชีธนาคาร: r.bankBalance,
            เงินในมือ: r.cashOnHand,
            รวมเงินทุน: r.totalFund,
            เงินที่ได้รับคืนรอบปี: r.repaidThisYear,
          },
        }))}
      />

      <DataTableCard
        title="รายงาน 2: แบบรายงานสภาพปัญหาการบริหารเงินทุน"
        subtitle="เฉพาะหมู่บ้านที่มีปัญหาเงินทุนขาดหายหรือมีครัวเรือนผิดสัญญา"
        filename="report2-fund-problems"
        emptyMessage="ไม่มีหมู่บ้านที่พบปัญหาการบริหารเงินทุนในขอบเขตที่คุณดูแล"
        columnLabels={["พื้นที่ดำเนินการ", "ปีที่ได้รับงบประมาณ", "จำนวนเงินทุนปัจจุบัน", "เงินทุนที่ขาดหายไป", "สาเหตุ", "การแก้ไข"]}
        rows={report2Rows.map((r) => ({
          cells: [r.areaName, String(r.budgetYear), money(r.currentFund), money(r.fundShortfall), r.cause, r.remedy],
          excel: {
            พื้นที่ดำเนินการ: r.areaName,
            ปีที่ได้รับงบประมาณ: r.budgetYear,
            จำนวนเงินทุนปัจจุบัน: r.currentFund,
            เงินทุนที่ขาดหายไป: r.fundShortfall,
            สาเหตุ: r.cause,
            การแก้ไข: r.remedy,
          },
        }))}
      />
    </PageContainer>
  );
}
