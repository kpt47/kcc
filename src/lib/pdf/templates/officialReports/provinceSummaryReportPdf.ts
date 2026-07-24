import { documentShell, fill, signatureRow } from "../../layout";
import { formatThaiDate } from "@/lib/formatDate";
import type { ProvinceSummaryRow } from "@/lib/analytics";

const STYLE = `
  .page { padding: 1.2cm 1cm; }
  table.ledger th, table.ledger td { padding: 4px 6px; }
  table.ledger td.name-cell { text-align: left; min-width: 140px; }
`;

/** แบบ 3.3 (แบบฟอร์ม 26(2) สรุประดับจังหวัด) — ลงชื่อพัฒนาการอำเภอ + พัฒนาการจังหวัด */
export function renderProvinceSummaryReportHtml(
  rows: ProvinceSummaryRow[],
  provinceName: string,
  generatedAt: Date,
  officials: { provinceAdminName: string | null }
): string {
  const totals = rows.reduce(
    (acc, r) => ({
      subDistrictCount: acc.subDistrictCount + r.subDistrictCount,
      villageCount: acc.villageCount + r.villageCount,
      totalHouseholds: acc.totalHouseholds + r.totalHouseholds,
      targetHouseholds: acc.targetHouseholds + r.targetHouseholds,
      householdsWithLoan: acc.householdsWithLoan + r.householdsWithLoan,
      outstandingBalance: acc.outstandingBalance + r.outstandingBalance,
      bankBalance: acc.bankBalance + r.bankBalance,
      cashOnHand: acc.cashOnHand + r.cashOnHand,
      totalFund: acc.totalFund + r.totalFund,
      repaidThisYear: acc.repaidThisYear + r.repaidThisYear,
    }),
    {
      subDistrictCount: 0,
      villageCount: 0,
      totalHouseholds: 0,
      targetHouseholds: 0,
      householdsWithLoan: 0,
      outstandingBalance: 0,
      bankBalance: 0,
      cashOnHand: 0,
      totalFund: 0,
      repaidThisYear: 0,
    }
  );

  const tableRows = rows
    .map(
      (r) => `
      <tr>
        <td class="name-cell">อำเภอ${r.districtName}</td>
        <td>${fill(r.subDistrictCount)}</td>
        <td>${fill(r.villageCount)}</td>
        <td>${fill(r.totalHouseholds)}</td>
        <td>${fill(r.targetHouseholds)}</td>
        <td>${fill(r.householdsWithLoan)}</td>
        <td>${fill(r.outstandingBalance.toLocaleString("th-TH"))}</td>
        <td>${fill(r.bankBalance.toLocaleString("th-TH"))}</td>
        <td>${fill(r.cashOnHand.toLocaleString("th-TH"))}</td>
        <td>${fill(r.totalFund.toLocaleString("th-TH"))}</td>
        <td>${fill(r.repaidThisYear.toLocaleString("th-TH"))}</td>
      </tr>`
    )
    .join("");

  const body = `
    <div class="page">
      <p class="center bold" style="font-size: 18px; margin-bottom: 2px;">
        แบบรายงานภาวะหนี้สินและฐานะทางการเงินโครงการ กข.คจ.
      </p>
      <p class="center" style="margin: 2px 0 2px;">แบบฟอร์ม 26(2) สรุประดับจังหวัด — จังหวัด${provinceName}</p>
      <p class="center" style="margin: 2px 0 10px;">
        ข้อมูล ณ วันที่ ${formatThaiDate(generatedAt)}
      </p>

      <table class="ledger">
        <thead>
          <tr>
            <th>ชื่ออำเภอ</th>
            <th>จำนวน<br/>ตำบล</th>
            <th>จำนวน<br/>หมู่บ้าน</th>
            <th>ครัวเรือน<br/>ทั้งหมด</th>
            <th>ครัวเรือน<br/>เป้าหมาย</th>
            <th>ได้รับ<br/>เงินยืม</th>
            <th>ยอดเงินคงค้าง<br/>(บาท)</th>
            <th>เงินในบัญชี<br/>(บาท)</th>
            <th>เงินในมือ<br/>(บาท)</th>
            <th>รวมเงินที่มี<br/>(บาท)</th>
            <th>ได้รับคืน<br/>รอบปี (บาท)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || `<tr><td colspan="11">ไม่พบอำเภอตามเงื่อนไขที่กำหนด</td></tr>`}
        </tbody>
        ${
          rows.length > 0
            ? `<tfoot><tr class="bold">
          <td class="name-cell">รวมทั้งสิ้น</td>
          <td>${fill(totals.subDistrictCount)}</td>
          <td>${fill(totals.villageCount)}</td>
          <td>${fill(totals.totalHouseholds)}</td>
          <td>${fill(totals.targetHouseholds)}</td>
          <td>${fill(totals.householdsWithLoan)}</td>
          <td>${fill(totals.outstandingBalance.toLocaleString("th-TH"))}</td>
          <td>${fill(totals.bankBalance.toLocaleString("th-TH"))}</td>
          <td>${fill(totals.cashOnHand.toLocaleString("th-TH"))}</td>
          <td>${fill(totals.totalFund.toLocaleString("th-TH"))}</td>
          <td>${fill(totals.repaidThisYear.toLocaleString("th-TH"))}</td>
        </tr></tfoot>`
            : ""
        }
      </table>

      ${signatureRow([
        { name: null, title: "พัฒนาการอำเภอ" },
        { name: officials.provinceAdminName, title: "พัฒนาการจังหวัด" },
      ])}
    </div>`;

  return documentShell(body, { extraStyle: STYLE, pageSize: "A4 landscape" });
}
