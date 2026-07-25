import { documentShell, fill, signatureRow } from "../../layout";
import { formatThaiDate } from "@/lib/formatDate";
import { thaiDateLongParts } from "@/lib/thai";
import type { VillageDebtorRow, VillageDebtReportSummary } from "@/lib/analytics";

/** วันที่แบบสะกดชื่อเดือนเต็ม สำหรับข้อมูลจริงที่มีค่าเสมอ (ไม่ใช่ช่องว่างในฟอร์มเปล่า) เช่น "25 กรกฎาคม 2569" */
function thaiDateLongText(value: string | Date): string {
  const parts = thaiDateLongParts(value);
  return parts ? `${parts.day} ${parts.month} ${parts.year}` : "-";
}

const STYLE = `
  .page { padding: 1.2cm 1cm; }
  table.ledger th, table.ledger td { padding: 4px 6px; }
  table.ledger td.name-cell { text-align: left; min-width: 140px; }
  .summary-list { margin-top: 14px; font-size: 14px; }
  .summary-list li { margin: 2px 0; }
`;

// จัดหน้าให้ตรงกับต้นฉบับ "แบบรายงานภาวะหนี้สินฐานะการเงินโครงการแก้ไขปัญหาความยากจน (กข.คจ.)" ทุกประการ ทั้ง
// หัวกระดาษ (ที่อยู่หมู่บ้าน/ปีที่เริ่มดำเนินการ/จำนวนครัวเรือน) ถ้อยคำสรุปท้ายรายงาน 6 ข้อ และผู้ลงนาม (ประธาน
// คณะกรรมการ กข.คจ. หมู่บ้าน + พัฒนากร) — ต้นฉบับวางกล่องสรุปไว้ในคอลัมน์ขวาสุดของตาราง แต่เทมเพลตนี้วางไว้
// ใต้ตารางแทน (เนื้อหา/ลำดับข้อความตรงกันทุกประการ ต่างเพียงตำแหน่งวางเพื่อให้พิมพ์ได้ชัดเจนในหน้ากระดาษแนวนอน)
// หมายเหตุ: ต้นฉบับสะกดหัวเรื่องผิดเป็น "แบบรางานภาวะหนี้สินฯ" — แก้ไขเป็น "แบบรายงาน" ให้ถูกต้องในเทมเพลตนี้
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
        <td></td>
      </tr>`
    )
    .join("");

  const body = `
    <div class="page">
      <p class="center bold" style="font-size: 18px; margin-bottom: 2px;">
        แบบรายงานภาวะหนี้สินฐานะการเงินโครงการแก้ไขปัญหาความยากจน (กข.คจ.)
      </p>
      <p class="center" style="margin: 2px 0;">
        บ้าน${fill(summary.villageNameOnly, { wide: true })} หมู่ที่${fill(summary.villageNo)}
        ตำบล${fill(summary.subDistrictName, { wide: true })} อำเภอ${fill(summary.districtName, {
    wide: true,
  })} จังหวัด${fill(summary.provinceName, { wide: true })}
      </p>
      <p class="center" style="margin: 2px 0;">
        ปีที่เริ่มดำเนินการ พ.ศ.${fill(summary.budgetYear)} มีครัวเรือนทั้งหมด${fill(
    null
  )} ครัวเรือน มีครัวเรือนเป้าหมาย${fill(summary.targetHouseholdCount)} ครัวเรือน
      </p>
      <p class="center" style="margin: 2px 0 10px;">ณ วันที่ ${thaiDateLongText(generatedAt)}</p>

      <table class="ledger">
        <thead>
          <tr>
            <th>ที่</th>
            <th>ชื่อ – สกุล ผู้ยืมเงิน<br/>(รวมผู้ที่ส่งคืนหมดแล้ว)</th>
            <th>วัน เดือน ปี<br/>ที่ได้รับเงินยืม</th>
            <th>จำนวนเงิน<br/>ที่ให้ยืม (บาท)</th>
            <th>จำนวนเงิน<br/>ส่งคืนแล้ว (บาท)</th>
            <th>จำนวนเงิน<br/>ที่ค้างอยู่ (บาท)</th>
            <th>เป็นการยืม<br/>รอบที่</th>
            <th>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || `<tr><td colspan="8">ไม่พบรายชื่อผู้ยืมในหมู่บ้านนี้</td></tr>`}
        </tbody>
      </table>

      <p class="bold" style="margin-top: 14px;">สรุป</p>
      <ul class="summary-list">
        <li>1. จำนวนผู้ยืมเงิน${fill(summary.debtorCount)}ครัวเรือน</li>
        <li>2. จำนวนเงินที่ให้ยืม${fill(summary.totalLoaned.toLocaleString("th-TH"), { grow: true })}บาท</li>
        <li>3. จำนวนเงินในบัญชีธนาคาร${fill(summary.bankBalance.toLocaleString("th-TH"), { grow: true })}บาท</li>
        <li>4. จำนวนเงินที่อยู่ในมือหรืออื่นๆ${fill(summary.cashOnHand.toLocaleString("th-TH"), {
          grow: true,
        })}บาท</li>
        <li>5. รวมเงินทุน กข.คจ. ทั้งหมด${fill(summary.totalFund.toLocaleString("th-TH"), { grow: true })}บาท</li>
        <li>
          6. จำนวนเงินที่ได้รับคืน รอบปีนี้ (แม้จะให้ยืมต่อไปแล้ว) จำนวน${fill(
            summary.repaidThisYear.toLocaleString("th-TH"),
            { grow: true }
          )}บาท
        </li>
      </ul>

      ${signatureRow([
        { name: officials.chairmanName, title: "ประธานคณะกรรมการ กข.คจ. หมู่บ้าน" },
        { name: officials.subDistrictAdminName, title: "พัฒนากร" },
      ])}
    </div>`;

  return documentShell(body, { extraStyle: STYLE, pageSize: "A4 landscape" });
}
