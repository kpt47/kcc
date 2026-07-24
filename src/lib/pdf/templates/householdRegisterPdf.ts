import { documentShell, fill } from "../layout";
import { formatThaiDate } from "@/lib/formatDate";
import { VILLAGE_ADDRESS_INCLUDE, villageAddress } from "@/lib/geo";
import type { Prisma } from "@/generated/prisma/client";

export type VillageForRegisterPdf = Prisma.VillageGetPayload<{
  include: {
    households: {
      include: {
        incomeRecords: true;
        loans: true;
      };
    };
  } & typeof VILLAGE_ADDRESS_INCLUDE;
}>;

const LANDSCAPE_STYLE = `
  .page { padding: 1.2cm 1cm; }
  table.ledger th, table.ledger td { padding: 3px 3px; }
  table.ledger td.name-cell { min-width: 110px; }
`;

// จัดหน้าให้ตรงกับ "7 สมุดบัญชีทะเบียนครัวเรือนเป้าหมายโครงการ กข.คจ. (เล่มม่วง).pdf" หน้า 1 (ข้อมูลการยืมเงินทุนครั้งที่ 1)
export function renderHouseholdRegisterHtml(village: VillageForRegisterPdf): string {
  const households = [...village.households].sort((a, b) => a.sequenceNo - b.sequenceNo);
  const addr = villageAddress(village);

  const rows = households
    .map((h) => {
      const loan1 = h.loans.find((l) => l.borrowRound === 1);
      const after1 = h.incomeRecords.find((r) => r.yearsAfterLoan === 1)?.income;
      const after2 = h.incomeRecords.find((r) => r.yearsAfterLoan === 2)?.income;
      const after3 = h.incomeRecords.find((r) => r.yearsAfterLoan === 3)?.income;

      return `
      <tr>
        <td>${h.sequenceNo}</td>
        <td class="name-cell">${h.headFirstName} ${h.headLastName}</td>
        <td>${fill(h.houseNo)}</td>
        <td>${fill(h.memberCount)}</td>
        <td>${fill(h.incomeBeforeLoan?.toLocaleString("th-TH"))}</td>
        <td>${fill(loan1?.amount.toLocaleString("th-TH"))}</td>
        <td>${fill(loan1 ? formatThaiDate(loan1.receivedDate) : undefined)}</td>
        <td>${fill(loan1?.dueDate ? formatThaiDate(loan1.dueDate) : undefined)}</td>
        <td>${fill(loan1?.occupation)}</td>
        <td>${fill(after1?.toLocaleString("th-TH"))}</td>
        <td>${fill(after2?.toLocaleString("th-TH"))}</td>
        <td>${fill(after3?.toLocaleString("th-TH"))}</td>
      </tr>`;
    })
    .join("");

  const body = `
    <div class="page">
      <p class="center bold" style="font-size: 17px; margin-bottom: 2px;">
        บัญชีทะเบียนครัวเรือนเป้าหมาย โครงการแก้ไขปัญหาความยากจน (กข.คจ.)
      </p>
      <p class="center" style="margin: 2px 0;">
        หมู่ที่${fill(village.villageNo)} บ้าน${fill(village.villageName, { wide: true })}
        ตำบล${fill(addr.subDistrictName, { wide: true })}
        อำเภอ${fill(addr.districtName, { wide: true })}
        จังหวัด${fill(addr.provinceName, { wide: true })}
      </p>
      <p style="margin: 2px 0 8px;">
        จำนวนครัวเรือนเป้าหมาย ทั้งสิ้น${fill(households.length, { grow: true })}ครัวเรือน
      </p>

      <table class="ledger">
        <thead>
          <tr>
            <th rowspan="2">ลำดับที่<br/>ครัวเรือน<br/>เป้าหมาย</th>
            <th rowspan="2">ชื่อ – สกุล</th>
            <th rowspan="2">บ้าน<br/>เลขที่</th>
            <th rowspan="2">จำนวน<br/>สมาชิกใน<br/>ครัวเรือน</th>
            <th rowspan="2">รายได้เฉลี่ย<br/>ต่อคนต่อปี<br/>ตามเกณฑ์ จปฐ.<br/>ก่อนยืมเงิน</th>
            <th colspan="4">ข้อมูลการยืมเงินทุน ครั้งที่ 1</th>
            <th colspan="3">รายได้เฉลี่ยภายหลังรับเงินยืม (บาท)</th>
          </tr>
          <tr>
            <th>จำนวนเงินยืม<br/>(บาท)</th>
            <th>ว/ด/ป<br/>ที่รับเงินยืม</th>
            <th>ว/ด/ป คืนเงิน<br/>ครั้งสุดท้าย</th>
            <th>อาชีพที่ยืม<br/>เงินไปลงทุน</th>
            <th>ภายหลัง 1 ปี</th>
            <th>ภายหลัง 2 ปี</th>
            <th>ภายหลัง 3 ปี</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="12">ยังไม่มีครัวเรือนเป้าหมายในหมู่บ้านนี้</td></tr>`}
        </tbody>
      </table>
    </div>`;

  return documentShell(body, { extraStyle: LANDSCAPE_STYLE, pageSize: "A4 landscape" });
}
