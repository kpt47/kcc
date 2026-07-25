import { documentShell, fill, thaiDateBlank, OFFICIAL_FORM_STYLE } from "../layout";
import { thaiBahtText } from "@/lib/thai";
import { villageAddress } from "@/lib/geo";
import type { LoanForContractPdf } from "./loanContractPdf";

export type PaymentVoucherOfficials = {
  chairmanName: string | null; // ผู้จ่ายเงิน — ประธานคณะกรรมการ กข.คจ. หมู่บ้าน ค้นหาตามพื้นที่จริง
};

// จัดหน้าให้ตรงกับต้นฉบับ "แบบรับเงินยืมของครัวเรือนเป้าหมาย" ทุกประการ ทั้งถ้อยคำ/ลำดับหัวข้อ/รูปแบบวันที่
// (วันที่...เดือน...พ.ศ....) — บันทึกการจ่ายเงินยืมก้อนหนึ่งให้ครัวเรือนเป้าหมาย (คู่กับแบบสัญญายืมเงินทุน)
export function renderPaymentVoucherHtml(loan: LoanForContractPdf, officials: PaymentVoucherOfficials): string {
  const h = loan.household;
  const v = h.village;
  const addr = villageAddress(v);

  const body = `
    <div class="page">
      <div class="top-row">
        <span>เล่มที่${fill(null, { grow: true })}</span>
        <span>เลขที่${fill(loan.contractNo, { grow: true })}</span>
      </div>
      <div class="center">
        <p class="doc-title">แบบรับเงินยืม</p>
        <p class="doc-title">ของครัวเรือนเป้าหมาย</p>
        <p class="doc-title">ตามโครงการแก้ไขปัญหาความยากจน(กข.คจ.)</p>
      </div>

      <p style="text-align: right; margin: 8px 0;">${thaiDateBlank(loan.receivedDate)}</p>

      <p class="form-item">
        1. ข้าพเจ้า${fill(`${h.headFirstName} ${h.headLastName}`, { wide: true })}
        อายุ${fill(null)}ปี หมายเลขบัตรประจำตัวประชาชน${fill(null, { wide: true })}
      </p>
      <p class="form-line">
        อยู่บ้านเลขที่${fill(h.houseNo)} หมู่ที่${fill(v.villageNo)} บ้าน${fill(v.villageName, { wide: true })}
        ตำบล${fill(addr.subDistrictName, { wide: true })} อำเภอ${fill(addr.districtName, {
    wide: true,
  })} จังหวัด${fill(addr.provinceName, { wide: true })}
      </p>
      <p class="form-item">
        2. ได้รับเงินยืมตามโครงการ (กข.คจ.) จากคณะกรรมการกองทุน กข.คจ. บ้าน${fill(v.villageName, {
    wide: true,
  })} หมู่ที่${fill(v.villageNo)}
      </p>
      <p class="form-line">
        ตำบล${fill(addr.subDistrictName, { wide: true })} อำเภอ${fill(addr.districtName, {
    wide: true,
  })} จังหวัด${fill(addr.provinceName, { wide: true })}
      </p>
      <p class="form-line">
        เป็นจำนวนเงิน${fill(loan.amount.toLocaleString("th-TH"), { grow: true })}บาท
        (${fill(thaiBahtText(loan.amount), { wide: true })})
      </p>
      <p class="form-line">ไว้เป็นการถูกต้องครบถ้วนแล้ว ตั้งแต่${thaiDateBlank(loan.receivedDate)}</p>

      <div class="sig-block">
        <p class="sig-line">(ลงชื่อ)${fill("", { wide: true })}ผู้รับเงิน</p>
        <p class="sig-name">(${fill(`${h.headFirstName} ${h.headLastName}`, { wide: true })})</p>
        <p class="sig-line">${thaiDateBlank(null)}</p>
      </div>

      <div class="sig-block">
        <p class="sig-line">(ลงชื่อ)${fill("", { wide: true })}ผู้จ่ายเงิน</p>
        <p class="sig-name">${
          officials.chairmanName ? `(${fill(officials.chairmanName, { wide: true })})` : "&nbsp;"
        } ประธานคณะกรรมการ กข.คจ. หมู่บ้าน</p>
        <p class="sig-line">${thaiDateBlank(null)}</p>
      </div>

      <div class="sig-block">
        <p class="sig-line">(ลงชื่อ)${fill("", { wide: true })}พยาน</p>
        <p class="sig-name">(${fill(null, { wide: true })})</p>
        <p class="sig-line">${thaiDateBlank(null)}</p>
      </div>

      <div class="sig-block">
        <p class="sig-line">(ลงชื่อ)${fill("", { wide: true })}พยาน</p>
        <p class="sig-name">(${fill(null, { wide: true })})</p>
        <p class="sig-line">${thaiDateBlank(null)}</p>
      </div>
    </div>`;

  return documentShell(body, { extraStyle: OFFICIAL_FORM_STYLE });
}
