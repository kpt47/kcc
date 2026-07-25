import { documentShell, fill, thaiDateBlank, OFFICIAL_FORM_STYLE } from "../layout";
import { thaiBahtText } from "@/lib/thai";
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

// เนื้อหาเอกสารนี้ยาวกว่าฟอร์มอื่น (มีตารางงวดชำระคืน 3.1-3.6 และผู้ลงนามถึง 4 กลุ่ม) OFFICIAL_FORM_STYLE
// เพียงอย่างเดียวไม่พอให้พอดี A4 หน้าเดียวเหมือนต้นฉบับ — บีบช่องไฟย่อหน้า/ระยะห่างช่องลงชื่อเพิ่มอีกชั้น
const CONTRACT_STYLE = `
  body { line-height: 1.42; }
  .page { padding: 1cm 1.6cm 0.8cm 2cm; }
  .doc-title { font-size: 17px; }
  .top-row { margin-bottom: 4px; }
  p.form-item { margin: 5px 0 2px; }
  p.form-line { margin: 1px 0 1px 1.6em; }
  .sig-row { margin-top: 6px; }
  .sig-col { font-size: 12.5px; }
`;

// จัดหน้าให้ตรงกับต้นฉบับ "แบบสัญญายืมเงินทุนของครัวเรือนเป้าหมาย" ทุกประการ ทั้งถ้อยคำ/ลำดับหัวข้อ/รูปแบบวันที่
// (วันที่...เดือน...พ.ศ....) — ตารางงวดชำระคืน (ข้อ 3.1-3.6) เป็นช่องว่างสำหรับกรอกด้วยลายมือขณะทำสัญญาจริง
// เช่นเดียวกับต้นฉบับ (ระบบยังไม่มีการบันทึกแผนผ่อนชำระรายงวดแยกต่างหาก มีเพียงวันครบกำหนด/วันที่ตัดยอดต่อเดือน)
// หมายเหตุ: ต้นฉบับข้อ 3.4 พิมพ์ผิดเป็น "งวดที่ 1" (ซ้ำกับ 3.1) และข้อ 5 มีถ้อยคำสับสน — แก้ไขให้ถูกต้องในเทมเพลตนี้
export function renderLoanContractHtml(loan: LoanForContractPdf, officials: LoanContractOfficials): string {
  const h = loan.household;
  const v = h.village;
  const addr = villageAddress(v);

  const body = `
    <div class="page">
      <div class="top-row">
        <span>เล่มที่${fill(null, { grow: true })}</span>
        <span>สัญญาเลขที่${fill(loan.contractNo, { grow: true })}</span>
      </div>
      <div class="center">
        <p class="doc-title">แบบสัญญายืมเงินทุนของครัวเรือนเป้าหมาย</p>
        <p class="doc-title">ตามโครงการแก้ไขปัญหาความยากจน(กข.คจ.)</p>
      </div>

      <p style="text-align: right; margin: 3px 0 0;">
        เขียนที่ ที่ทำการกองทุน กข.คจ.บ้าน${fill(v.villageName, { wide: true })}
      </p>
      <p style="text-align: right; margin: 1px 0 4px;">${thaiDateBlank(loan.receivedDate)}</p>

      <p class="form-item">
        ข้าพเจ้า นาย/นาง/นางสาว${fill(`${h.headFirstName} ${h.headLastName}`, { wide: true })}
        หมายเลขบัตรประจำตัวประชาชน${fill(null, { wide: true })}
      </p>
      <p class="form-line">
        อยู่บ้านเลขที่${fill(h.houseNo)} หมู่ที่${fill(v.villageNo)} บ้าน${fill(v.villageName, { wide: true })}
        ตำบล${fill(addr.subDistrictName, { wide: true })} อำเภอ${fill(addr.districtName, { wide: true })}
        จังหวัด${fill(addr.provinceName, { wide: true })} ซึ่งต่อไปในสัญญานี้เรียกว่า "ผู้ยืม" ฝ่ายหนึ่ง
      </p>
      <p class="form-line">
        กับคณะกรรมการกองทุน กข.คจ. หมู่บ้าน${fill(v.villageName, { wide: true })}
        ตำบล${fill(addr.subDistrictName, { wide: true })} อำเภอ${fill(addr.districtName, { wide: true })}
        จังหวัด${fill(addr.provinceName, { wide: true })} ซึ่งต่อไปในสัญญานี้เรียกว่า "ผู้ให้ยืม" อีกฝ่ายหนึ่ง
        ทั้งสองฝ่ายตกลงทำสัญญายืมเงินรายละเอียดดังข้อความต่อไปนี้
      </p>

      <p class="form-item">
        1. ผู้ให้ยืมตกลงให้ผู้ยืมเงินตามโครงการแก้ไขปัญหาความยากจน (กข.คจ.) บ้าน${fill(v.villageName, {
    wide: true,
  })} หมู่ที่${fill(v.villageNo)}
        ตำบล${fill(addr.subDistrictName, { wide: true })} อำเภอ${fill(addr.districtName, {
    wide: true,
  })} จังหวัด${fill(addr.provinceName, { wide: true })}
        เป็นเงินจำนวน${fill(loan.amount.toLocaleString("th-TH"), { grow: true })}บาท
        (${fill(thaiBahtText(loan.amount), { wide: true })})
      </p>
      <p class="form-line">
        เพื่อนำไปเป็นทุนใช้จ่ายตามโครงการ${fill(loan.occupation, {
    wide: true,
  })}ที่ได้รับอนุมัติจากคณะกรรมการ กข.คจ. หมู่บ้าน
      </p>

      <p class="form-item">
        2. ผู้ยืมสัญญาว่าจะปฏิบัติตามระเบียบกระทรวงมหาดไทย ว่าด้วยการบริหารและการใช้จ่ายเงินโครงการแก้ไขปัญหา
        ความยากจน (กข.คจ.)ทุกประการ
      </p>

      <p class="form-item">
        3. ผู้ยืมสัญญาว่าจะส่งใช้คืนเงินยืมครบตามจำนวนยืม ภายใน${fill(null, { grow: true })}งวด โดยแบ่งเป็น
      </p>
      ${[1, 2, 3, 4, 5, 6]
        .map(
          (n) => `
      <p class="form-line">
        3.${n} งวดที่ ${n} ในวันที่${fill(null)}เดือน${fill(null, { wide: true })}พ.ศ.${fill(null)}
        จำนวนเงิน${fill(null, { grow: true })}บาท
      </p>`
        )
        .join("")}

      <p class="form-item">4. หากผู้ยืมผิดสัญญา ยินยอมให้ผู้ให้ยืมดำเนินการตามกฎหมายกับผู้ยืมต่อไปได้</p>
      <p class="form-item">
        5. สัญญานี้ทำไว้สามชุด เก็บรักษาไว้ที่ผู้ให้ยืมและผู้ยืมฝ่ายละ 1 ชุด และส่งไว้ให้อำเภอเก็บไว้ 1 ชุด
      </p>
      <p class="form-item">
        6. ผู้ให้ยืมและผู้ยืมได้อ่านและเข้าใจข้อความในสัญญานี้โดยตลอดแล้ว จึงลงลายมือชื่อไว้เป็นหลักฐานต่อหน้าพยาน
      </p>

      <div class="sig-row" style="margin-top: 6px;">
        <div class="sig-col">
          <span class="sig-dots">....................................................</span>
          <span class="sig-label sig-name">(${h.headFirstName} ${h.headLastName})</span>
          <span class="sig-label">ผู้ยืม</span>
          <span class="sig-label">${thaiDateBlank(null)}</span>
        </div>
        <div class="sig-col">
          <span class="sig-dots">....................................................</span>
          ${officials.consentPersonName ? `<span class="sig-label sig-name">(${officials.consentPersonName})</span>` : ""}
          <span class="sig-label">สามี/ภรรยา/ทายาท ผู้ให้คำยินยอม</span>
          <span class="sig-label">${thaiDateBlank(null)}</span>
        </div>
      </div>

      <div class="sig-row" style="margin-top: 4px;">
        <div class="sig-col">
          <span class="sig-dots">....................................................</span>
          ${officials.chairmanName ? `<span class="sig-label sig-name">(${officials.chairmanName})</span>` : ""}
          <span class="sig-label">ผู้ให้ยืม</span>
          <span class="sig-label">ประธานคณะกรรมการ กข.คจ. หมู่บ้าน</span>
          <span class="sig-label">${thaiDateBlank(null)}</span>
        </div>
      </div>

      <div class="sig-row" style="margin-top: 4px;">
        <div class="sig-col">
          <span class="sig-dots">....................................................</span>
          <span class="sig-label">พยาน</span>
          <span class="sig-label">${thaiDateBlank(null)}</span>
        </div>
        <div class="sig-col">
          <span class="sig-dots">....................................................</span>
          <span class="sig-label">พยาน</span>
          <span class="sig-label">${thaiDateBlank(null)}</span>
        </div>
      </div>
    </div>`;

  return documentShell(body, { extraStyle: OFFICIAL_FORM_STYLE + CONTRACT_STYLE });
}
