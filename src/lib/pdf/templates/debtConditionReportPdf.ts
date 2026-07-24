import { documentShell, fill } from "../layout";
import { formatThaiDate } from "@/lib/formatDate";
import type { VillageConditionRow } from "@/lib/analytics";

const LANDSCAPE_STYLE = `
  .page { padding: 1.2cm 1cm; }
  table.ledger th, table.ledger td { padding: 4px 6px; }
  table.ledger td.name-cell { min-width: 160px; text-align: left; }
`;

function money(n: number): string {
  return n.toLocaleString("th-TH");
}

/** แบบรายงานภาวะหนี้สินและฐานะทางการเงิน — Smart Report & Map Center (ตามตัวกรอง/พื้นที่ปัจจุบันของผู้ใช้) */
export function renderDebtConditionReportHtml(rows: VillageConditionRow[], generatedAt: Date): string {
  const totals = rows.reduce(
    (acc, r) => ({
      totalHouseholds: acc.totalHouseholds + r.totalHouseholds,
      totalDisbursed: acc.totalDisbursed + r.totalDisbursed,
      totalRepaid: acc.totalRepaid + r.totalRepaid,
      outstandingBalance: acc.outstandingBalance + r.outstandingBalance,
      bankBalance: acc.bankBalance + r.bankBalance,
      fundShortfall: acc.fundShortfall + r.fundShortfall,
    }),
    { totalHouseholds: 0, totalDisbursed: 0, totalRepaid: 0, outstandingBalance: 0, bankBalance: 0, fundShortfall: 0 }
  );

  const tableRows = rows
    .map(
      (r) => `
      <tr>
        <td class="name-cell">${r.villageName}</td>
        <td>${fill(r.totalHouseholds)}</td>
        <td>${fill(money(r.totalDisbursed))}</td>
        <td>${fill(money(r.totalRepaid))}</td>
        <td>${fill(money(r.outstandingBalance))}</td>
        <td>${fill(money(r.bankBalance))}</td>
        <td>${fill(money(r.fundShortfall))}</td>
      </tr>`
    )
    .join("");

  const body = `
    <div class="page">
      <p class="center bold" style="font-size: 18px; margin-bottom: 2px;">
        แบบรายงานภาวะหนี้สินและฐานะทางการเงิน โครงการแก้ไขปัญหาความยากจน (กข.คจ.)
      </p>
      <p class="center" style="margin: 2px 0 10px;">
        Smart Report &amp; Map Center — ข้อมูล ณ วันที่ ${formatThaiDate(generatedAt)}
      </p>

      <table class="ledger">
        <thead>
          <tr>
            <th>หมู่บ้าน</th>
            <th>จำนวน<br/>ครัวเรือน</th>
            <th>เงินให้ยืม<br/>(บาท)</th>
            <th>เงินรับคืน<br/>(บาท)</th>
            <th>หนี้คงค้าง<br/>(บาท)</th>
            <th>เงินในบัญชี<br/>ฝากธนาคาร (บาท)</th>
            <th>เงินทุนที่<br/>ขาดหายไป (บาท)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || `<tr><td colspan="7">ไม่พบข้อมูลตามเงื่อนไขที่กำหนด</td></tr>`}
        </tbody>
        ${
          rows.length > 0
            ? `<tfoot>
          <tr class="bold">
            <td class="name-cell">รวมทั้งสิ้น</td>
            <td>${fill(totals.totalHouseholds)}</td>
            <td>${fill(money(totals.totalDisbursed))}</td>
            <td>${fill(money(totals.totalRepaid))}</td>
            <td>${fill(money(totals.outstandingBalance))}</td>
            <td>${fill(money(totals.bankBalance))}</td>
            <td>${fill(money(totals.fundShortfall))}</td>
          </tr>
        </tfoot>`
            : ""
        }
      </table>
    </div>`;

  return documentShell(body, { extraStyle: LANDSCAPE_STYLE, pageSize: "A4 landscape" });
}
