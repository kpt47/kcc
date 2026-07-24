import { documentShell, fill, signatureRow } from "../../layout";
import { formatThaiDate } from "@/lib/formatDate";
import type { VillageDebtorRow, VillageDebtReportSummary } from "@/lib/analytics";

const STYLE = `
  .page { padding: 1.2cm 1cm; }
  table.ledger th, table.ledger td { padding: 4px 6px; }
  table.ledger td.name-cell { text-align: left; min-width: 140px; }
  .summary-list { margin-top: 14px; font-size: 14px; }
  .summary-list li { margin: 2px 0; }
`;

/** แบบ 3.1 (แบบฟอร์ม 26(1) ระดับหมู่บ้าน) — ลงชื่อประธานคณะกรรมการ + พัฒนากรตำบล */
export function renderVillageDebtReportHtml(
  rows: VillageDebtorRow[],
  summary: VillageDebtReportSummary,
  generatedAt: Date,
  officials: { chairmanName: string | null; subDistrictAdminName: string | null }
): string {
  const tableRows = rows
    .map(
      (r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td class="name-cell">${r.headFirstName} ${r.headLastName}</td>
        <td>${fill(formatThaiDate(r.receivedDate))}</td>
        <td>${fill(r.amountLoaned.toLocaleString("th-TH"))}</td>
        <td>${fill(r.amountRepaid.toLocaleString("th-TH"))}</td>
        <td>${fill(r.outstandingBalance.toLocaleString("th-TH"))}</td>
        <td>${fill(r.borrowRound)}</td>
      </tr>`
    )
    .join("");

  const body = `
    <div class="page">
      <p class="center bold" style="font-size: 18px; margin-bottom: 2px;">
        แบบรายงานภาวะหนี้สินและฐานะทางการเงินโครงการ กข.คจ.
      </p>
      <p class="center" style="margin: 2px 0 2px;">แบบฟอร์ม 26(1) ระดับหมู่บ้าน — ${summary.villageName}</p>
      <p class="center" style="margin: 2px 0 10px;">
        ข้อมูล ณ วันที่ ${formatThaiDate(generatedAt)}
      </p>

      <table class="ledger">
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>ชื่อ-สกุลผู้ยืม</th>
            <th>วันที่ได้รับ<br/>เงินยืม</th>
            <th>จำนวนเงิน<br/>ที่ให้ยืม (บาท)</th>
            <th>จำนวนเงิน<br/>ส่งคืนแล้ว (บาท)</th>
            <th>เงินคงค้าง<br/>(บาท)</th>
            <th>ยืมรอบที่</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || `<tr><td colspan="7">ไม่พบรายชื่อผู้ยืมในหมู่บ้านนี้</td></tr>`}
        </tbody>
      </table>

      <ul class="summary-list">
        <li>1. จำนวนผู้ยืม: ${fill(summary.debtorCount)} ราย</li>
        <li>2. เงินที่ให้ยืมรวม (คงค้าง): ${fill(summary.totalLoaned.toLocaleString("th-TH"))} บาท</li>
        <li>3. เงินในบัญชีธนาคารรวม: ${fill(summary.bankBalance.toLocaleString("th-TH"))} บาท</li>
        <li>4. เงินในมือ: ${fill(summary.cashOnHand.toLocaleString("th-TH"))} บาท</li>
        <li>5. รวมเงินทุนทั้งหมด: ${fill(summary.totalFund.toLocaleString("th-TH"))} บาท</li>
        <li>6. เงินที่ได้รับคืนในรอบปี: ${fill(summary.repaidThisYear.toLocaleString("th-TH"))} บาท</li>
      </ul>

      ${signatureRow([
        { name: officials.chairmanName, title: "ประธานคณะกรรมการ กข.คจ." },
        { name: officials.subDistrictAdminName, title: "พัฒนากรผู้รับผิดชอบ" },
      ])}
    </div>`;

  return documentShell(body, { extraStyle: STYLE, pageSize: "A4 landscape" });
}
