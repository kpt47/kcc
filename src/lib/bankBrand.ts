// ป้ายโลโก้ธนาคารขนาดเล็ก (วงกลมสี + ตัวย่อ) สำหรับแสดงหน้าบัญชีคุมเงินฝาก — ไม่ใช้ไฟล์รูปโลโก้จริงของธนาคาร
// (ไม่มีสิทธิ์ใช้งานไฟล์ตราสัญลักษณ์ที่มีลิขสิทธิ์/เครื่องหมายการค้าของแต่ละธนาคารในระบบนี้) จึงใช้สีประจำธนาคาร
// จริงที่เป็นที่รู้จักทั่วไปแทน เพื่อให้แยกแยะธนาคารได้เร็วด้วยสายตาโดยไม่ต้องอ่านชื่อเต็ม
export type BankBrand = { abbr: string; bg: string; text: string };

const BANK_BRANDS: { match: string[]; brand: BankBrand }[] = [
  { match: ["ออมสิน"], brand: { abbr: "ออมสิน", bg: "#933A93", text: "#ffffff" } },
  { match: ["ธ.ก.ส.", "ธกส", "เพื่อการเกษตร"], brand: { abbr: "ธ.ก.ส.", bg: "#4C9A2A", text: "#ffffff" } },
  { match: ["กรุงไทย"], brand: { abbr: "กรุงไทย", bg: "#1BA5E1", text: "#ffffff" } },
  { match: ["กรุงเทพ"], brand: { abbr: "กรุงเทพ", bg: "#1E4598", text: "#ffffff" } },
  { match: ["กสิกรไทย", "กสิกร"], brand: { abbr: "กสิกรไทย", bg: "#138F2D", text: "#ffffff" } },
  { match: ["ไทยพาณิชย์", "scb"], brand: { abbr: "SCB", bg: "#4E2E7F", text: "#ffffff" } },
  { match: ["กรุงศรี"], brand: { abbr: "กรุงศรีฯ", bg: "#FEC43B", text: "#5b3a00" } },
  { match: ["ทหารไทยธนชาต", "ทีทีบี", "ttb"], brand: { abbr: "ttb", bg: "#1279BE", text: "#ffffff" } },
  { match: ["อาคารสงเคราะห์", "ธอส"], brand: { abbr: "ธอส.", bg: "#F7941D", text: "#ffffff" } },
  { match: ["อิสลาม"], brand: { abbr: "ธอท.", bg: "#00A650", text: "#ffffff" } },
  { match: ["ยูโอบี", "uob"], brand: { abbr: "UOB", bg: "#0b3979", text: "#ffffff" } },
  { match: ["ซีไอเอ็มบี", "cimb"], brand: { abbr: "CIMB", bg: "#7e2320", text: "#ffffff" } },
  { match: ["ทิสโก้"], brand: { abbr: "ทิสโก้", bg: "#00539B", text: "#ffffff" } },
  { match: ["เกียรตินาคิน", "kkp"], brand: { abbr: "KKP", bg: "#00a19a", text: "#ffffff" } },
];

const DEFAULT_BRAND: BankBrand = { abbr: "ธนาคาร", bg: "#64748b", text: "#ffffff" };

/** จับคู่ชื่อธนาคาร (free-text ที่กรอกไว้ใน BankAccount.bankName) กับป้ายสี/ตัวย่อที่รู้จัก — ไม่พบให้ใช้ป้ายสีเทากลาง */
export function getBankBrand(bankName: string | null | undefined): BankBrand {
  if (!bankName) return DEFAULT_BRAND;
  const found = BANK_BRANDS.find((b) => b.match.some((m) => bankName.includes(m)));
  return found?.brand ?? DEFAULT_BRAND;
}
