// โมดูลกลางสำหรับระบบนำเข้าบัญชีผู้ใช้งานระดับครัวเรือนจากไฟล์ Excel เป็นชุดใหญ่ (Bulk Import)
// ใช้ร่วมกันทั้ง 3 API route (template/preview/confirm) เพื่อไม่ให้ลำดับคอลัมน์/กฎตรวจสอบเพี้ยนกันระหว่างที่ต่างๆ
//
// หลักการสำคัญ: แต่ละแถวใน Excel คือการ "เปิดบัญชีผู้ใช้งาน (User + HouseholdProfile)" ให้ครัวเรือนที่
// ลงทะเบียนไว้แล้วในทะเบียนครัวเรือนเป้าหมาย (TargetHousehold, เล่มม่วง) เท่านั้น — ไม่ใช่การลงทะเบียนครัวเรือนใหม่
// จึงต้องระบุ "ลำดับที่ครัวเรือน" (sequenceNo) เพื่อจับคู่กับ TargetHousehold ที่มีอยู่แล้วในหมู่บ้านที่เลือกไว้
// ส่วนคำนำหน้าชื่อ/ชื่อ/นามสกุลใน Excel เป็นข้อมูลอ้างอิงเพื่อให้ผู้กรอกเทียบกับทะเบียนกระดาษได้ถูกแถว
// เท่านั้น ไม่ถูกบันทึกเป็นข้อมูลใหม่ที่ใดในระบบ (ชื่อจริงของครัวเรือนอ้างอิงจาก TargetHousehold เสมอ)
import ExcelJS from "exceljs";
import { prisma } from "./prisma";
import { PHONE_REGEX, USERNAME_REGEX } from "./schemas";
import type { CurrentUser } from "./auth";

export const TITLE_PREFIX_OPTIONS = ["นาย", "นาง", "นางสาว"] as const;
export const OCCUPATION_OPTIONS = ["เกษตรกร", "รับจ้างทั่วไป", "ค้าขาย", "รับราชการ/รัฐวิสาหกิจ", "พนักงานเอกชน", "อื่นๆ"] as const;

export const IMPORT_COLUMNS = [
  { key: "sequenceNo", header: "ลำดับที่ครัวเรือน" },
  { key: "titlePrefix", header: "คำนำหน้าชื่อ" },
  { key: "firstName", header: "ชื่อ" },
  { key: "lastName", header: "นามสกุล" },
  { key: "phoneNumber", header: "เบอร์โทรศัพท์" },
  { key: "username", header: "ชื่อผู้ใช้" },
  { key: "password", header: "รหัสผ่านเริ่มต้น" },
  { key: "age", header: "อายุ" },
  { key: "occupation", header: "อาชีพ" },
  { key: "consentPersonName", header: "ชื่อผู้ให้ความยินยอม" },
  { key: "consentRelation", header: "ความสัมพันธ์กับผู้ให้ความยินยอม" },
  // ไม่บังคับกรอก — ถ้าใส่มา จะบันทึกลง TargetHousehold.phoneNumber (ทะเบียนครัวเรือนเป้าหมาย เล่มม่วง) ด้วย
  // คนละฟิลด์กับ "เบอร์โทรศัพท์" ด้านบนซึ่งเป็นเบอร์ของบัญชีผู้ใช้งาน (ใช้ส่ง SMS แจ้งเตือน)
  { key: "householdPhoneNumber", header: "เบอร์โทรศัพท์ครัวเรือน" },
] as const;

export type ImportRowInput = {
  sequenceNo?: number | string | null;
  titlePrefix?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  username?: string | null;
  password?: string | null;
  age?: number | string | null;
  occupation?: string | null;
  consentPersonName?: string | null;
  consentRelation?: string | null;
  householdPhoneNumber?: string | null;
};

export type ValidatedImportRow = ImportRowInput & {
  rowNumber: number;
  valid: boolean;
  errors: string[];
  matchedHouseholdId: number | null;
  matchedHouseholdName: string | null;
};

/**
 * หา villageId ที่ผู้ใช้คนนี้มีสิทธิ์นำเข้าข้อมูลให้ — CHAIRMAN ถูกล็อกไว้ที่หมู่บ้านตนเองเสมอ (ไม่สนใจค่าที่ส่งมา)
 * ส่วน SUB_DISTRICT_ADMIN เลือกได้ทุกหมู่บ้านในตำบลตนเอง แต่ต้องตรวจสอบว่าอยู่ในตำบลจริง (กัน villageId ปลอม)
 * คืนค่า null หากไม่มีสิทธิ์หรือหมู่บ้านที่ระบุไม่อยู่ในเขตอำนาจ
 */
export async function resolveImportVillageId(
  user: Pick<CurrentUser, "role" | "committeeRole" | "scopeVillageId" | "scopeSubDistrictId">,
  requestedVillageId: number | undefined
): Promise<number | null> {
  if (user.role === "VILLAGE_COMMITTEE" && user.committeeRole === "CHAIRMAN") {
    return user.scopeVillageId ?? null;
  }
  if (user.role === "SUB_DISTRICT_ADMIN") {
    if (!user.scopeSubDistrictId || !requestedVillageId) return null;
    const village = await prisma.village.findFirst({
      where: { id: requestedVillageId, subDistrictId: user.scopeSubDistrictId },
      select: { id: true },
    });
    return village?.id ?? null;
  }
  return null;
}

function toIntOrUndefined(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : NaN; // NaN ส่งกลับไปให้ตรวจจับว่าค่าที่กรอกมาไม่ใช่ตัวเลขจริง
}

/**
 * ตรวจสอบความถูกต้องของข้อมูลนำเข้าทั้งหมด (Dry-run) — ใช้ร่วมกันทั้งตอนพรีวิว (ยังไม่บันทึก) และตอนยืนยันบันทึกจริง
 * เพื่อไม่ให้กฎตรวจสอบสองจุดเพี้ยนกัน (ฝั่ง confirm ต้องตรวจซ้ำเสมอ ห้ามเชื่อผลตรวจสอบจากฝั่ง client เท่านั้น)
 */
export async function validateImportRows(
  rows: ImportRowInput[],
  villageId: number
): Promise<{ rows: ValidatedImportRow[]; allValid: boolean }> {
  const usernamesSeenInBatch = new Set<string>();
  const results: ValidatedImportRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: string[] = [];

    const sequenceNo = toIntOrUndefined(row.sequenceNo);
    let matchedHouseholdId: number | null = null;
    let matchedHouseholdName: string | null = null;

    if (sequenceNo === undefined || Number.isNaN(sequenceNo) || !Number.isInteger(sequenceNo) || sequenceNo <= 0) {
      errors.push("ลำดับที่ครัวเรือนต้องเป็นตัวเลขจำนวนเต็มบวก");
    } else {
      const household = await prisma.targetHousehold.findUnique({
        where: { villageId_sequenceNo: { villageId, sequenceNo } },
        include: { users: { where: { role: "HOUSEHOLD" }, select: { id: true } } },
      });
      if (!household) {
        errors.push(`ไม่พบครัวเรือนเป้าหมายลำดับที่ ${sequenceNo} ในหมู่บ้านนี้ กรุณาลงทะเบียนครัวเรือนก่อน`);
      } else if (household.users.length > 0) {
        errors.push("ครัวเรือนนี้มีบัญชีผู้ใช้งานแล้ว");
      } else {
        matchedHouseholdId = household.id;
        matchedHouseholdName = `${household.headFirstName} ${household.headLastName}`;
      }
    }

    const phoneNumber = row.phoneNumber?.trim() ?? "";
    if (!PHONE_REGEX.test(phoneNumber)) {
      errors.push("เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก และขึ้นต้นด้วย 0");
    }

    const username = row.username?.trim() ?? "";
    if (username.length < 3 || !USERNAME_REGEX.test(username)) {
      errors.push("ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข . และ _");
    } else if (usernamesSeenInBatch.has(username.toLowerCase())) {
      errors.push("ชื่อผู้ใช้นี้ซ้ำกับแถวอื่นในไฟล์เดียวกัน");
    } else {
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) errors.push("ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว");
    }
    if (username) usernamesSeenInBatch.add(username.toLowerCase());

    const password = row.password ?? "";
    if (password.length < 8) {
      errors.push("รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
    }

    const age = toIntOrUndefined(row.age);
    if (age !== undefined && (Number.isNaN(age) || !Number.isInteger(age) || age < 0 || age > 150)) {
      errors.push("อายุต้องเป็นจำนวนเต็มระหว่าง 0-150");
    }

    // ไม่บังคับกรอก — ถ้ามีค่าต้องเป็นรูปแบบเบอร์โทรศัพท์ที่ถูกต้องเท่านั้น
    const householdPhoneNumber = row.householdPhoneNumber?.trim() || null;
    if (householdPhoneNumber && !PHONE_REGEX.test(householdPhoneNumber)) {
      errors.push("เบอร์โทรศัพท์ครัวเรือนต้องเป็นตัวเลข 9-10 หลัก และขึ้นต้นด้วย 0");
    }

    results.push({
      ...row,
      sequenceNo,
      phoneNumber,
      username,
      householdPhoneNumber,
      rowNumber: i + 1,
      valid: errors.length === 0,
      errors,
      matchedHouseholdId,
      matchedHouseholdName,
    });
  }

  return { rows: results, allValid: results.every((r) => r.valid) };
}

/** อ่านไฟล์ .xlsx ที่อัปโหลดมา แปลงแต่ละแถว (ตั้งแต่แถวที่ 2 เป็นต้นไป ข้ามหัวตาราง) เป็น ImportRowInput ตามลำดับคอลัมน์ IMPORT_COLUMNS */
export async function parseWorkbookRows(buffer: ArrayBuffer | Buffer): Promise<ImportRowInput[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as ArrayBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const rows: ImportRowInput[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // แถวหัวตาราง
    const values = row.values as (ExcelJS.CellValue | undefined)[]; // index 0 ว่างเสมอใน exceljs, คอลัมน์จริงเริ่มที่ 1
    const cellText = (idx: number): string | null => {
      const v = values[idx];
      if (v === null || v === undefined) return null;
      if (typeof v === "object" && "text" in v) return String((v as { text: unknown }).text ?? "");
      if (typeof v === "object" && "result" in v) return String((v as { result: unknown }).result ?? "");
      return String(v);
    };
    const isRowBlank = IMPORT_COLUMNS.every((_, i) => !cellText(i + 1));
    if (isRowBlank) return;

    const entry: Record<string, string | null> = {};
    IMPORT_COLUMNS.forEach((col, i) => {
      entry[col.key] = cellText(i + 1);
    });
    rows.push(entry as ImportRowInput);
  });
  return rows;
}
