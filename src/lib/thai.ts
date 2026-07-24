// Utilities สำหรับรูปแบบวันที่แบบไทย (พ.ศ.) และการแปลงจำนวนเงินเป็นตัวอักษรไทย
// ให้ตรงกับรูปแบบเอกสารราชการ เช่น "วันที่.........เดือน.............พ.ศ..........."

export const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

const BE_OFFSET = 543;

export function ceYearToBe(ceYear: number): number {
  return ceYear + BE_OFFSET;
}

export function beYearToCe(beYear: number): number {
  return beYear - BE_OFFSET;
}

export function currentBeYear(): number {
  return ceYearToBe(new Date().getFullYear());
}

/** แปลงวัน/เดือน/ปี พ.ศ. (เช่นจาก 3 select) ให้เป็น ISO date string (YYYY-MM-DD) สำหรับเก็บ/ส่ง API */
export function thaiPartsToIso(day: number, month1to12: number, beYear: number): string {
  const ceYear = beYearToCe(beYear);
  const mm = String(month1to12).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${ceYear}-${mm}-${dd}`;
}

/** แปลง ISO date string หรือ Date กลับเป็น { day, month, beYear } สำหรับแสดงใน 3 select */
export function isoToThaiParts(value: string | Date | null | undefined) {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return {
    day: d.getDate(),
    month: d.getMonth() + 1,
    beYear: ceYearToBe(d.getFullYear()),
  };
}

/** คำนวณอายุปัจจุบัน (ปีเต็ม) จากวันเกิด — ใช้เติมอายุอัตโนมัติในแบบเสนอโครงการ/แบบขอยืมเงินทุน */
export function calculateAge(birthDate: string | Date | null | undefined): number | undefined {
  if (!birthDate) return undefined;
  const d = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (Number.isNaN(d.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() >= d.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/** จัดรูปแบบวันที่เป็น พ.ศ. แบบ DD/MM/YYYY (เช่น 24/07/2569) — มาตรฐานการแสดงผลวันที่ทั้งระบบ */
export function formatThaiDate(value: string | Date | null | undefined): string {
  const parts = isoToThaiParts(value);
  if (!parts) return "-";
  const dd = String(parts.day).padStart(2, "0");
  const mm = String(parts.month).padStart(2, "0");
  return `${dd}/${mm}/${parts.beYear}`;
}

/** จัดรูปแบบวันที่+เวลาเป็น พ.ศ. แบบ DD/MM/YYYY HH:mm (เช่น 24/07/2569 14:30) */
export function formatThaiDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${formatThaiDate(d)} ${hours}:${minutes}`;
}

// ---------------------------------------------------------------------------
// แปลงจำนวนเงิน (ตัวเลข) เป็นคำอ่านภาษาไทย เช่น 20000 -> "สองหมื่นบาทถ้วน"
// ---------------------------------------------------------------------------

const DIGIT_TH = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const PLACE_TH = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

function readInteger(numStr: string): string {
  // ตัดเป็นกลุ่มละ 6 หลักจากขวา (หน่วยสูงสุดในแต่ละกลุ่มคือ "แสน" แล้วต่อด้วย "ล้าน" ซ้ำไปเรื่อยๆ)
  const digits = numStr.replace(/^0+(?=\d)/, "");
  if (digits === "0") return DIGIT_TH[0];

  const groups: string[] = [];
  let remaining = digits;
  while (remaining.length > 0) {
    groups.unshift(remaining.slice(-6));
    remaining = remaining.slice(0, -6);
  }

  // เลขหลักหน่วย (ตัวสุดท้ายของทั้งจำนวน) อ่านเป็น "เอ็ด" แทน "หนึ่ง" เมื่อจำนวนทั้งหมดไม่ได้มีค่าเท่ากับ 1 เพียงตัวเดียว
  const isSingleDigitOne = digits === "1";

  let result = "";
  groups.forEach((group, groupIndex) => {
    const isLastGroup = groupIndex === groups.length - 1;
    const len = group.length;
    for (let i = 0; i < len; i++) {
      const digit = Number(group[i]);
      const placeIndex = len - i - 1; // 0=หน่วย,1=สิบ,2=ร้อย,3=พัน,4=หมื่น,5=แสน
      if (digit === 0) continue;

      const isOverallUnitsDigit = isLastGroup && placeIndex === 0;

      if (placeIndex === 0) {
        if (digit === 1 && isOverallUnitsDigit && !isSingleDigitOne) {
          result += "เอ็ด";
        } else {
          result += DIGIT_TH[digit];
        }
      } else if (placeIndex === 1) {
        if (digit === 1) result += "สิบ";
        else if (digit === 2) result += "ยี่สิบ";
        else result += DIGIT_TH[digit] + "สิบ";
      } else {
        result += DIGIT_TH[digit] + PLACE_TH[placeIndex];
      }
    }
    if (!isLastGroup) result += "ล้าน";
  });

  return result;
}

/** แปลงจำนวนเงิน (บาท, รองรับทศนิยมสตางค์) เป็นคำอ่านภาษาไทยแบบเต็ม เช่น "สองหมื่นบาทถ้วน" */
export function thaiBahtText(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount) || amount < 0) {
    return "";
  }
  const rounded = Math.round(amount * 100) / 100;
  const bahtPart = Math.floor(rounded);
  const satangPart = Math.round((rounded - bahtPart) * 100);

  const bahtText = readInteger(String(bahtPart)) + "บาท";
  if (satangPart === 0) {
    return bahtText + "ถ้วน";
  }
  return bahtText + readInteger(String(satangPart)) + "สตางค์";
}
