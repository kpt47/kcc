import { documentShell, fill } from "../layout";
import { thaiBahtText } from "@/lib/thai";
import { formatThaiDate } from "@/lib/formatDate";
import { VILLAGE_ADDRESS_INCLUDE, villageAddress } from "@/lib/geo";
import type { Prisma } from "@/generated/prisma/client";

export type LoanForContractPdf = Prisma.LoanGetPayload<{
  include: {
    household: { include: { village: { include: typeof VILLAGE_ADDRESS_INCLUDE } } };
  };
}>;

export type LoanContractOfficials = {
  chairmanName: string | null; // ผู้ให้ยืม — ประธานคณะกรรมการ กข.คจ. หมู่บ้าน ค้นหาตามพื้นที่จริง
  consentPersonName: string | null; // ผู้ให้คำยินยอม — จาก HouseholdProfile.consentPersonName ของครัวเรือน
};

// ฟอร์ม 3: สัญญายืมเงินทุนตามโครงการแก้ไขปัญหาความยากจน (กข.คจ.) — เอกสารใหม่ที่ยังไม่เคยมี PDF template มาก่อน
// จัดทำโดยอิงข้อมูลจาก Loan (สัญญายืมเงินก้อนหนึ่งๆ ที่บันทึกไว้ในเล่มเหลือง)
export function renderLoanContractHtml(loan: LoanForContractPdf, officials: LoanContractOfficials): string {
  const h = loan.household;
  const v = h.village;
  const addr = villageAddress(v);

  const body = `
    <div class="page">
      <div class="top-row">
        <span>เล่มที่${fill(v.villageNo, { grow: true })}</span>
        <span>สัญญาเลขที่${fill(loan.contractNo, { grow: true })}</span>
      </div>
      <div class="center">
        <p class="doc-title">สัญญายืมเงินทุน</p>
        <p class="doc-title">ตามโครงการแก้ไขปัญหาความยากจน (กข.คจ.)</p>
      </div>

      <p class="form-item">
        ทำที่บ้าน${fill(v.villageName, { wide: true })} หมู่ที่${fill(v.villageNo)}
        ตำบล${fill(addr.subDistrictName, { wide: true })} อำเภอ${fill(addr.districtName, { wide: true })}
        จังหวัด${fill(addr.provinceName, { wide: true })}
      </p>
      <p class="form-item">วันที่${fill(formatThaiDate(loan.receivedDate), { wide: true })}</p>

      <p class="form-item">
        ข้าพเจ้า นาย/นาง/นางสาว${fill(`${h.headFirstName} ${h.headLastName}`, { wide: true })}
        ซึ่งต่อไปในสัญญานี้เรียกว่า "ผู้ยืม" ได้ยืมเงินทุนตามโครงการแก้ไขปัญหาความยากจน (กข.คจ.) ของหมู่บ้าน
        จากคณะกรรมการ กข.คจ. หมู่บ้าน ซึ่งต่อไปในสัญญานี้เรียกว่า "ผู้ให้ยืม" เป็นจำนวนเงิน
        ${fill(loan.amount.toLocaleString("th-TH"), { grow: true })} บาท (${fill(thaiBahtText(loan.amount), { wide: true })})
      </p>
      <p class="form-item">
        ผู้ยืมตกลงจะส่งคืนเงินยืมทั้งหมดให้แก่ผู้ให้ยืมภายในวันที่${fill(
          loan.dueDate ? formatThaiDate(loan.dueDate) : null,
          { wide: true }
        )} ตามระเบียบกระทรวงมหาดไทยว่าด้วยการบริหารและการใช้จ่ายเงินโครงการแก้ไขปัญหาความยากจน (กข.คจ.) พ.ศ. 2553 ทุกประการ
      </p>

      <div class="sig-row" style="margin-top: 48px;">
        <div class="sig-col">
          <span class="sig-dots">....................................................</span>
          ${officials.consentPersonName ? `<span class="sig-label sig-name">(${officials.consentPersonName})</span>` : ""}
          <span class="sig-label">ผู้ให้คำยินยอม</span>
        </div>
        <div class="sig-col">
          <span class="sig-dots">....................................................</span>
          <span class="sig-label sig-name">(${h.headFirstName} ${h.headLastName})</span>
          <span class="sig-label">ผู้ยืม</span>
        </div>
        <div class="sig-col">
          <span class="sig-dots">....................................................</span>
          ${officials.chairmanName ? `<span class="sig-label sig-name">(${officials.chairmanName})</span>` : ""}
          <span class="sig-label">ผู้ให้ยืม</span>
        </div>
      </div>

      <div class="sig-row" style="margin-top: 36px;">
        <div class="sig-col">
          <span class="sig-dots">....................................................</span>
          <span class="sig-label">พยาน</span>
        </div>
        <div class="sig-col">
          <span class="sig-dots">....................................................</span>
          <span class="sig-label">พยาน</span>
        </div>
      </div>

      <p class="footnote"><u>หมายเหตุ</u> จัดทำตามระเบียบกระทรวงมหาดไทยว่าด้วยการบริหารและการใช้จ่ายเงินโครงการแก้ไขปัญหาความยากจน (กข.คจ.) พ.ศ. 2553</p>
    </div>`;

  return documentShell(body);
}
