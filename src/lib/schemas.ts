import { z } from "zod";
import { LOAN_CEILING_DEFAULT } from "./config";
import { REMINDER_LEAD_DAY_OPTIONS } from "./reminderSettings";

/**
 * ช่องตัวเลขที่ไม่บังคับกรอก: input จาก <input type="number"> ที่ว่างเปล่าจะได้ค่า NaN
 * (จาก valueAsNumber ของ react-hook-form) ไม่ใช่ undefined โดยตรง จึงต้องแปลง NaN -> undefined
 * ก่อนตรวจสอบด้วยเงื่อนไขจริง (min/max/int ฯลฯ) ของ inner schema
 *
 * ใช้ z.custom แทน z.preprocess เพื่อให้ input/output type เป็น `number | undefined` ที่ชัดเจน
 * (z.preprocess จะทำให้ type ฝั่ง input กลายเป็น unknown ซึ่งชนกับ type ของ useForm)
 */
export function optionalNumber(inner: z.ZodNumber = z.number()) {
  return z
    .custom<number | undefined>((value) => value === undefined || typeof value === "number")
    .transform((value) => (value === undefined || Number.isNaN(value) ? undefined : value))
    .pipe(inner.optional())
    .optional();
}

export const requiredIsoDate = z
  .string({ error: "กรุณาเลือกวันที่ให้ครบถ้วน" })
  .min(1, "กรุณาเลือกวันที่ให้ครบถ้วน");
export const optionalIsoDate = z.string().optional();

const thaiNameField = (label: string) => z.string().trim().min(1, `กรุณากรอก${label}`);

// เบอร์โทรศัพท์: ตัวเลข 9-10 หลัก ขึ้นต้นด้วย 0 (ใช้ทั้งตอนสร้าง/แก้ไขผู้ใช้งาน และหน้าโปรไฟล์ของตนเอง)
// export ไว้ให้ lib/householdImport.ts ใช้ตรวจสอบข้อมูลแถว Excel ด้วย เพื่อไม่ให้กฎตรวจสอบเพี้ยนกันสองที่
export const PHONE_REGEX = /^0\d{8,9}$/;
const phoneNumberField = () =>
  z.string().trim().regex(PHONE_REGEX, "เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก และขึ้นต้นด้วย 0");

// อีเมล: บังคับกรอกทุก role — ใช้รับรหัส OTP สำหรับกู้คืนรหัสผ่าน (ดู lib/otp.ts, /api/auth/forgot-password)
const emailField = () => z.string().trim().min(1, "กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง");

// ชื่อผู้ใช้: ตัวอักษรภาษาอังกฤษ ตัวเลข . และ _ เท่านั้น อย่างน้อย 3 ตัวอักษร (ใช้ร่วมกับ createUserSchema ด้านล่าง
// และ lib/householdImport.ts สำหรับตรวจสอบชื่อผู้ใช้ในไฟล์ Excel ที่นำเข้าเป็นชุดใหญ่)
export const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/;

// ---------------------------------------------------------------------------
// เข้าสู่ระบบ
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  username: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// การจัดการผู้ใช้งาน (Top-Down Provisioning) — /users
// ---------------------------------------------------------------------------
// ข้อมูลโปรไฟล์ที่แนบไปกับการสร้าง/แก้ไขผู้ใช้งาน — ฟิลด์ไหนใช้จริงขึ้นกับ role ปลายทาง
// (HOUSEHOLD ใช้ age/occupation/consent*, VILLAGE_COMMITTEE ใช้ termStartDate/termEndDate,
// role อื่นๆ (เจ้าหน้าที่รัฐ) ใช้ positionTitle/handoverDate) — ดู POST/PATCH /api/users
// คำนำหน้านาม — ใช้ร่วมกันทั้ง CommitteeProfile/OfficialProfile (ผู้ใช้ทุก role ที่ไม่ใช่ HOUSEHOLD) เหมือนกับ
// titlePrefix/titlePrefixOther ของ TargetHousehold (ครัวเรือนมีคำนำหน้าของตัวเองอยู่แล้วที่ทะเบียนครัวเรือน)
const titlePrefixFields = {
  titlePrefix: z.enum(["MR", "MRS", "MISS", "OTHER"]).optional(),
  titlePrefixOther: z.string().trim().optional(),
};
function refineTitlePrefixOther<T extends { titlePrefix?: string; titlePrefixOther?: string }>(data: T) {
  return data.titlePrefix !== "OTHER" || !!data.titlePrefixOther;
}

export const createUserSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร")
      .regex(USERNAME_REGEX, "ชื่อผู้ใช้ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข . และ _"),
    firstName: z.string().trim().min(1, "กรุณากรอกชื่อ"),
    lastName: z.string().trim().min(1, "กรุณากรอกนามสกุล"),
    password: z.string().min(8, "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร"),
    phoneNumber: phoneNumberField(),
    email: emailField(),
    areaId: z.number().int().positive().optional(),
    committeeRole: z.enum(["CHAIRMAN", "SECRETARY", "FINANCE_MEMBER", "NORMAL_MEMBER"]).optional(),
    householdId: z.number().int().positive().optional(),
    // HOUSEHOLD profile
    age: z.number().int().min(0).max(150).optional(),
    occupation: z.string().trim().optional(),
    consentPersonName: z.string().trim().optional(),
    consentRelation: z.string().trim().optional(),
    // VILLAGE_COMMITTEE profile
    ...titlePrefixFields,
    termStartDate: z.string().optional(),
    termEndDate: z.string().optional(),
    // เจ้าหน้าที่รัฐ (OfficialProfile)
    positionTitle: z.string().trim().optional(),
    handoverDate: z.string().optional(),
  })
  .refine(refineTitlePrefixOther, { message: "กรุณากรอกคำนำหน้านาม", path: ["titlePrefixOther"] });
export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const editUserSchema = z
  .object({
    firstName: z.string().trim().min(1, "กรุณากรอกชื่อ").optional(),
    lastName: z.string().trim().min(1, "กรุณากรอกนามสกุล").optional(),
    committeeRole: z.enum(["CHAIRMAN", "SECRETARY", "FINANCE_MEMBER", "NORMAL_MEMBER"]).optional(),
    phoneNumber: phoneNumberField().optional(),
    email: emailField().optional(),
    lineId: z.string().optional(),
    isActive: z.boolean().optional(),
    age: z.number().int().min(0).max(150).optional(),
    occupation: z.string().trim().optional(),
    consentPersonName: z.string().trim().optional(),
    consentRelation: z.string().trim().optional(),
    ...titlePrefixFields,
    termStartDate: z.string().optional(),
    termEndDate: z.string().optional(),
    positionTitle: z.string().trim().optional(),
    handoverDate: z.string().optional(),
  })
  .refine(refineTitlePrefixOther, { message: "กรุณากรอกคำนำหน้านาม", path: ["titlePrefixOther"] });
export type EditUserFormValues = z.infer<typeof editUserSchema>;

// หน้า "บัญชีของฉัน" — ผู้ใช้แก้ไขข้อมูลติดต่อของตนเองได้เท่านั้น (ชื่อ-สกุลแก้ได้เฉพาะที่ไม่ใช่ HOUSEHOLD
// เพราะชื่อครัวเรือนอ้างอิงจาก TargetHousehold ซึ่งแก้ผ่านหน้าทะเบียนครัวเรือนเท่านั้น ไม่ใช่หน้านี้)
export const selfProfileSchema = z
  .object({
    phoneNumber: phoneNumberField().optional(),
    email: emailField().optional(),
    lineId: z.string().optional(),
    firstName: z.string().trim().min(1, "กรุณากรอกชื่อ").optional(),
    lastName: z.string().trim().min(1, "กรุณากรอกนามสกุล").optional(),
    ...titlePrefixFields,
    // จำนวนวันล่วงหน้าก่อนครบกำหนดชำระที่ครัวเรือนต้องการรับแจ้งเตือน — เฉพาะ role HOUSEHOLD (ดู /api/profile)
    reminderLeadDays: z
      .number()
      .int()
      .refine((v) => (REMINDER_LEAD_DAY_OPTIONS as readonly number[]).includes(v), "กรุณาเลือกจำนวนวันที่ระบบรองรับ")
      .optional(),
  })
  .refine(refineTitlePrefixOther, { message: "กรุณากรอกคำนำหน้านาม", path: ["titlePrefixOther"] });
export type SelfProfileFormValues = z.infer<typeof selfProfileSchema>;

// ประธานกรรมการหมู่บ้านกำหนดวันเริ่มยืนยันยอดหนี้ประจำปี — /api/debt-confirmation/round
export const debtConfirmationRoundSchema = z.object({
  year: z.number().int().min(2500, "กรุณากรอกปี พ.ศ. ให้ถูกต้อง").max(2700, "กรุณากรอกปี พ.ศ. ให้ถูกต้อง"),
  confirmationDate: requiredIsoDate,
});
export type DebtConfirmationRoundFormValues = z.infer<typeof debtConfirmationRoundSchema>;

// ครัวเรือนยืนยัน/แจ้งข้อโต้แย้งยอดหนี้ของตนเองต่อรอบที่เปิดอยู่ — /api/debt-confirmation/confirm
export const debtConfirmationSchema = z.object({
  agreesWithBalance: z.boolean(),
  note: z.string().trim().max(500, "หมายเหตุยาวเกินไป").optional(),
});
export type DebtConfirmationFormValues = z.infer<typeof debtConfirmationSchema>;

// ครัวเรือนส่งคำร้อง "ปรึกษา/ร้องทุกข์" ถึงพัฒนาการอำเภอ/พัฒนาการจังหวัด — /api/household-inquiries
export const householdInquirySchema = z
  .object({
    topic: z.enum(["CONSULT", "COMPLAINT", "OTHER"], { error: "กรุณาเลือกหัวข้อ" }),
    topicOther: z.string().trim().optional(),
    details: z.string().trim().min(1, "กรุณากรอกรายละเอียด").max(2000, "รายละเอียดยาวเกินไป"),
    attachmentUrl: z.string().trim().optional(),
  })
  .refine((data) => data.topic !== "OTHER" || !!data.topicOther, {
    message: "กรุณากรอกหัวข้อ",
    path: ["topicOther"],
  });
export type HouseholdInquiryFormValues = z.infer<typeof householdInquirySchema>;

// พัฒนาการอำเภอ/พัฒนาการจังหวัดตอบกลับ+อัปเดตสถานะคำร้อง — /api/household-inquiries/[id]
export const householdInquiryReplySchema = z
  .object({
    status: z.enum(["IN_PROGRESS", "RESOLVED", "OTHER"], { error: "กรุณาเลือกสถานะ" }),
    statusOther: z.string().trim().optional(),
    reply: z.string().trim().max(2000, "ข้อความตอบกลับยาวเกินไป").optional(),
  })
  .refine((data) => data.status !== "OTHER" || !!data.statusOther, {
    message: "กรุณากรอกสถานะ",
    path: ["statusOther"],
  });
export type HouseholdInquiryReplyFormValues = z.infer<typeof householdInquiryReplySchema>;

// ค้นหา/กรองครัวเรือนเป้าหมาย — /api/households/search
export const householdSearchSchema = z.object({
  q: z.string().trim().optional(),
  targetRank: optionalNumber(z.number().int().positive()),
  maxIncome: optionalNumber(z.number().min(0)),
});
export type HouseholdSearchValues = z.infer<typeof householdSearchSchema>;

// ---------------------------------------------------------------------------
// Smart Report & Map Center — ค้นหาหลายมิติ (พื้นที่/ความเสี่ยง/เศรษฐกิจ/ข้อความอิสระ)
// ---------------------------------------------------------------------------
export const RISK_STATUS_VALUES = ["NORMAL", "WATCHLIST", "HIGH_RISK"] as const;
export const SMART_SEARCH_SORT_FIELDS = ["sequenceNo", "headFirstName", "incomeBeforeLoan", "outstandingBalance", "riskStatus"] as const;

export const smartSearchFiltersSchema = z.object({
  q: z.string().trim().optional(),
  provinceId: optionalNumber(z.number().int().positive()),
  districtId: optionalNumber(z.number().int().positive()),
  subDistrictId: optionalNumber(z.number().int().positive()),
  villageId: optionalNumber(z.number().int().positive()),
  riskStatuses: z.array(z.enum(RISK_STATUS_VALUES)).optional(),
  minIncome: optionalNumber(z.number().min(0)),
  maxIncome: optionalNumber(z.number().min(0)),
  occupation: z.string().trim().optional(),
  page: optionalNumber(z.number().int().positive()),
  pageSize: optionalNumber(z.number().int().positive().max(100)),
  sortField: z.enum(SMART_SEARCH_SORT_FIELDS).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});
export type SmartSearchFilters = z.infer<typeof smartSearchFiltersSchema>;

// ---------------------------------------------------------------------------
// Master Data (ชื่อหมู่บ้าน/ตำบล/อำเภอ) — เฉพาะ GLOBAL_ADMIN จัดการได้ (ดู lib/authz.ts canManageMasterData)
// ---------------------------------------------------------------------------
export const provinceMasterDataSchema = z.object({
  name: thaiNameField("ชื่อจังหวัด"),
});
export type ProvinceMasterDataValues = z.infer<typeof provinceMasterDataSchema>;

export const districtMasterDataSchema = z.object({
  name: thaiNameField("ชื่ออำเภอ"),
  provinceId: z.number().int().positive("กรุณาเลือกจังหวัด"),
});
export type DistrictMasterDataValues = z.infer<typeof districtMasterDataSchema>;

export const subDistrictMasterDataSchema = z.object({
  name: thaiNameField("ชื่อตำบล"),
  districtId: z.number().int().positive("กรุณาเลือกอำเภอ"),
});
export type SubDistrictMasterDataValues = z.infer<typeof subDistrictMasterDataSchema>;

export const villageMasterDataSchema = z.object({
  villageNo: thaiNameField("หมู่ที่"),
  villageName: thaiNameField("ชื่อหมู่บ้าน"),
  subDistrictId: z.number().int().positive("กรุณาเลือกตำบล"),
  budgetYear: z
    .number({ error: "กรุณากรอกปีงบประมาณ (พ.ศ.)" })
    .int("ปีงบประมาณต้องเป็นจำนวนเต็ม")
    .min(2500, "ปีงบประมาณไม่ถูกต้อง")
    .max(2700, "ปีงบประมาณไม่ถูกต้อง"),
  budgetAmount: optionalNumber(z.number().min(0)),
  latitude: optionalNumber(z.number().min(-90).max(90)),
  longitude: optionalNumber(z.number().min(-180).max(180)),
});
export type VillageMasterDataValues = z.infer<typeof villageMasterDataSchema>;

export const resetPasswordAdminSchema = z.object({
  newPassword: z.string().min(8, "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร"),
});
export type ResetPasswordAdminValues = z.infer<typeof resetPasswordAdminSchema>;

// ---------------------------------------------------------------------------
// เปลี่ยนรหัสผ่าน
// ---------------------------------------------------------------------------
export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "กรุณากรอกรหัสผ่านเดิม"),
    newPassword: z.string().min(8, "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร"),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่านใหม่"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "รหัสผ่านใหม่และยืนยันรหัสผ่านใหม่ไม่ตรงกัน",
    path: ["confirmPassword"],
  });
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// ---------------------------------------------------------------------------
// กู้คืนรหัสผ่านด้วย OTP ทางอีเมล (Self-Service) — /forgot-password
// ---------------------------------------------------------------------------
export const forgotPasswordRequestSchema = z.object({
  username: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้"),
  email: emailField(),
});
export type ForgotPasswordRequestValues = z.infer<typeof forgotPasswordRequestSchema>;

export const resetPasswordWithOtpSchema = z
  .object({
    username: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้"),
    otp: z.string().trim().regex(/^\d{6}$/, "รหัส OTP ต้องเป็นตัวเลข 6 หลัก"),
    newPassword: z.string().min(8, "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร"),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่านใหม่"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "รหัสผ่านใหม่และยืนยันรหัสผ่านใหม่ไม่ตรงกัน",
    path: ["confirmPassword"],
  });
export type ResetPasswordWithOtpValues = z.infer<typeof resetPasswordWithOtpSchema>;

// ---------------------------------------------------------------------------
// หมู่บ้าน
// ---------------------------------------------------------------------------
export const villageSchema = z.object({
  villageNo: thaiNameField("หมู่ที่"),
  villageName: thaiNameField("ชื่อหมู่บ้าน"),
  subDistrict: thaiNameField("ตำบล"),
  district: thaiNameField("อำเภอ"),
  province: thaiNameField("จังหวัด"),
  budgetYear: z
    .number({ error: "กรุณากรอกปีงบประมาณ (พ.ศ.)" })
    .int("ปีงบประมาณต้องเป็นจำนวนเต็ม")
    .min(2500, "ปีงบประมาณไม่ถูกต้อง")
    .max(2700, "ปีงบประมาณไม่ถูกต้อง"),
});
export type VillageFormValues = z.infer<typeof villageSchema>;

// ---------------------------------------------------------------------------
// ครัวเรือนเป้าหมาย (บัญชีทะเบียนครัวเรือนเป้าหมาย - เล่มม่วง)
// ---------------------------------------------------------------------------
export const TITLE_PREFIX_OPTIONS = [
  { value: "MR", label: "นาย" },
  { value: "MRS", label: "นาง" },
  { value: "MISS", label: "นางสาว" },
  { value: "OTHER", label: "อื่นๆ" },
] as const;
export const GENDER_OPTIONS = [
  { value: "MALE", label: "ชาย" },
  { value: "FEMALE", label: "หญิง" },
] as const;

export const householdSchema = z
  .object({
    villageId: z
      .number({ error: "กรุณาเลือกหมู่บ้าน" })
      .int()
      .positive("กรุณาเลือกหมู่บ้าน"),
    sequenceNo: z
      .number({ error: "กรุณากรอกลำดับที่ครัวเรือนเป้าหมาย" })
      .int("ลำดับที่ต้องเป็นจำนวนเต็ม")
      .positive("ลำดับที่ต้องมากกว่า 0"),
    titlePrefix: z.enum(["MR", "MRS", "MISS", "OTHER"]).optional(),
    titlePrefixOther: z.string().trim().optional(),
    headFirstName: thaiNameField("ชื่อ"),
    headLastName: thaiNameField("นามสกุล"),
    gender: z.enum(["MALE", "FEMALE"]).optional(),
    birthDate: optionalIsoDate,
    occupation: z.string().trim().optional(),
    specialSkills: z.string().trim().optional(),
    phoneNumber: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || PHONE_REGEX.test(v), "เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก และขึ้นต้นด้วย 0"),
    houseNo: z.string().optional(),
    memberCount: optionalNumber(
      z.number().int("จำนวนสมาชิกต้องเป็นจำนวนเต็ม").min(1, "ต้องมีอย่างน้อย 1 คน").max(30, "จำนวนสมาชิกไม่ถูกต้อง")
    ),
    incomeBeforeLoan: optionalNumber(z.number().min(0, "รายได้ต้องไม่ติดลบ").max(10_000_000, "จำนวนเงินไม่ถูกต้อง")),
    incomeAfter1: optionalNumber(z.number().min(0, "รายได้ต้องไม่ติดลบ").max(10_000_000, "จำนวนเงินไม่ถูกต้อง")),
    incomeAfter2: optionalNumber(z.number().min(0, "รายได้ต้องไม่ติดลบ").max(10_000_000, "จำนวนเงินไม่ถูกต้อง")),
    incomeAfter3: optionalNumber(z.number().min(0, "รายได้ต้องไม่ติดลบ").max(10_000_000, "จำนวนเงินไม่ถูกต้อง")),
  })
  .refine((data) => data.titlePrefix !== "OTHER" || !!data.titlePrefixOther, {
    message: "กรุณากรอกคำนำหน้าชื่อ",
    path: ["titlePrefixOther"],
  });

// หมายเหตุ: ประกาศ type เองแบบ plain interface แทนการใช้ z.infer<> ตรงๆ เนื่องจาก schema นี้มีฟิลด์ที่
// ใช้ optionalNumber() (ซึ่งภายในเป็น ZodEffects/ZodPipe) — z.infer ของ TypeScript กับ generic ที่
// zodResolver() อนุมานเองจากจุดเรียกใช้งานอาจได้ type ที่เท่ากันในทางโครงสร้างแต่ TypeScript มองว่า
// "เป็นคนละ type กัน" (นับ optional key ไม่ตรงกัน) ทำให้ useForm<T>() ฟ้อง type error ที่ผิดพลาด
// การเขียน interface เองทำให้ type เสถียรและไม่ผูกกับรายละเอียดภายในของ zod
// หมายเหตุ: ฟิลด์ที่ผ่าน optionalNumber() ประกาศเป็น `field?: number` (optional key) ทั้งฝั่ง input และ
// output เนื่องจาก optionalNumber() ลงท้ายด้วย .optional() ทำให้ zod มองว่าคีย์นี้ไม่บังคับต้องมีอยู่จริง
// (จำเป็นสำหรับตอนส่งข้อมูลผ่าน JSON.stringify ที่ตัดคีย์ค่า undefined ออกไปทั้งคีย์)
export interface HouseholdFormValues {
  villageId: number;
  sequenceNo: number;
  titlePrefix?: "MR" | "MRS" | "MISS" | "OTHER";
  titlePrefixOther?: string;
  headFirstName: string;
  headLastName: string;
  gender?: "MALE" | "FEMALE";
  birthDate?: string;
  occupation?: string;
  specialSkills?: string;
  phoneNumber?: string;
  houseNo?: string;
  memberCount?: number;
  incomeBeforeLoan?: number;
  incomeAfter1?: number;
  incomeAfter2?: number;
  incomeAfter3?: number;
}

/** รูปแบบข้อมูลหลังผ่านการตรวจสอบแล้ว (ส่งให้ onSubmit) — ฟิลด์ตัวเลขไม่บังคับกลายเป็น optional key จริงๆ */
export interface HouseholdSubmitValues {
  villageId: number;
  sequenceNo: number;
  titlePrefix?: "MR" | "MRS" | "MISS" | "OTHER";
  titlePrefixOther?: string;
  headFirstName: string;
  headLastName: string;
  gender?: "MALE" | "FEMALE";
  birthDate?: string;
  occupation?: string;
  specialSkills?: string;
  phoneNumber?: string;
  houseNo?: string;
  memberCount?: number;
  incomeBeforeLoan?: number;
  incomeAfter1?: number;
  incomeAfter2?: number;
  incomeAfter3?: number;
}

// ---------------------------------------------------------------------------
// แบบเสนอโครงการ ของครัวเรือนเป้าหมาย
// ---------------------------------------------------------------------------
export const proposalItemSchema = z.object({
  description: z.string().trim().min(1, "กรุณาระบุรายการ"),
  amount: z
    .number({ error: "กรุณากรอกจำนวนเงิน" })
    .positive("จำนวนเงินต้องมากกว่า 0")
    .max(LOAN_CEILING_DEFAULT, `จำนวนเงินต้องไม่เกิน ${LOAN_CEILING_DEFAULT.toLocaleString("th-TH")} บาท`),
});

export const proposalSchema = z
  .object({
    // ขั้นตอนที่ 1: ผู้เสนอโครงการ
    householdId: z
      .number({ error: "กรุณาเลือกครัวเรือนเป้าหมาย" })
      .int()
      .positive("กรุณาเลือกครัวเรือนเป้าหมาย"),
    applicantAge: z
      .number({ error: "กรุณากรอกอายุ" })
      .int("อายุต้องเป็นจำนวนเต็ม")
      .min(1, "อายุไม่ถูกต้อง")
      .max(120, "อายุไม่ถูกต้อง"),
    occupation: thaiNameField("อาชีพ"),

    // ขั้นตอนที่ 2: รายละเอียดโครงการ
    projectName: thaiNameField("ชื่อโครงการ"),
    totalAmount: z
      .number({ error: "กรุณากรอกจำนวนเงินทั้งสิ้น" })
      .positive("จำนวนเงินต้องมากกว่า 0")
      .max(LOAN_CEILING_DEFAULT, `จำนวนเงินต้องไม่เกินเพดาน ${LOAN_CEILING_DEFAULT.toLocaleString("th-TH")} บาท`),
    items: z.array(proposalItemSchema).min(1, "กรุณาระบุรายการอย่างน้อย 1 รายการ"),
    proposedDate: requiredIsoDate,

    // ขั้นตอนที่ 3: ความเห็นเจ้าหน้าที่ (ไม่บังคับ - กรอกภายหลังได้)
    workerOpinion: z.enum(["possible", "not_possible"]).optional(),
    workerReason: z.string().optional(),
    workerName: z.string().optional(),
    workerDate: optionalIsoDate,
    committeeDecision: z.enum(["approved", "rejected"]).optional(),
    committeeAmount: optionalNumber(z.number().positive("จำนวนเงินต้องมากกว่า 0")),
    committeeReason: z.string().optional(),
    committeeChairName: z.string().optional(),
    committeeDate: optionalIsoDate,
  })
  .refine(
    (data) => {
      const sum = data.items.reduce((acc, item) => acc + (item.amount || 0), 0);
      return Math.abs(sum - data.totalAmount) < 0.01;
    },
    { message: "ผลรวมของรายการย่อยต้องเท่ากับจำนวนเงินทั้งสิ้นที่ระบุไว้ด้านบน", path: ["items"] }
  )
  .refine((data) => data.workerOpinion !== "not_possible" || !!data.workerReason?.trim(), {
    message: "กรุณาระบุเหตุผลที่เห็นว่าเป็นไปไม่ได้",
    path: ["workerReason"],
  })
  .refine((data) => data.committeeDecision !== "rejected" || !!data.committeeReason?.trim(), {
    message: "กรุณาระบุเหตุผลที่ไม่อนุมัติ",
    path: ["committeeReason"],
  });

export interface ProposalFormValues {
  householdId: number;
  applicantAge: number;
  occupation: string;
  projectName: string;
  totalAmount: number;
  items: { description: string; amount: number }[];
  proposedDate: string;
  workerOpinion?: "possible" | "not_possible";
  workerReason?: string;
  workerName?: string;
  workerDate?: string;
  committeeDecision?: "approved" | "rejected";
  committeeAmount?: number;
  committeeReason?: string;
  committeeChairName?: string;
  committeeDate?: string;
}

/** รูปแบบข้อมูลหลังผ่านการตรวจสอบแล้ว (ส่งให้ onSubmit) */
export interface ProposalSubmitValues {
  householdId: number;
  applicantAge: number;
  occupation: string;
  projectName: string;
  totalAmount: number;
  items: { description: string; amount: number }[];
  proposedDate: string;
  workerOpinion?: "possible" | "not_possible";
  workerReason?: string;
  workerName?: string;
  workerDate?: string;
  committeeDecision?: "approved" | "rejected";
  committeeAmount?: number;
  committeeReason?: string;
  committeeChairName?: string;
  committeeDate?: string;
}

/** ครัวเรือนแก้ไขแบบเสนอโครงการของตนเอง — เฉพาะตอนยังไม่มีความเห็นพัฒนากร (ดู PATCH /api/proposals/[id]) */
export const proposalSelfEditSchema = z.object({
  applicantAge: z.number().int("อายุต้องเป็นจำนวนเต็ม").min(1, "อายุไม่ถูกต้อง").max(120, "อายุไม่ถูกต้อง").optional(),
  occupation: z.string().trim().min(1, "กรุณากรอกอาชีพ").optional(),
  projectName: z.string().trim().min(1, "กรุณากรอกชื่อโครงการ").optional(),
  totalAmount: optionalNumber(z.number().positive("จำนวนเงินต้องมากกว่า 0")),
  items: z.array(proposalItemSchema).min(1, "กรุณาระบุรายการอย่างน้อย 1 รายการ").optional(),
  proposedDate: z.string().optional(),
});
export type ProposalSelfEditValues = z.infer<typeof proposalSelfEditSchema>;

export const PROPOSAL_STEP_FIELDS = [
  ["householdId", "applicantAge", "occupation"],
  ["projectName", "totalAmount", "items", "proposedDate"],
] as const;

// ---------------------------------------------------------------------------
// แบบขอยืมเงินทุน ของครัวเรือนเป้าหมาย
// ---------------------------------------------------------------------------
export const loanRequestSchema = z
  .object({
    // ขั้นตอนที่ 1: ข้อมูลผู้ขอยืม
    householdId: z
      .number({ error: "กรุณาเลือกครัวเรือนเป้าหมาย" })
      .int()
      .positive("กรุณาเลือกครัวเรือนเป้าหมาย"),
    // อ้างอิงแบบเสนอโครงการ (ฟอร์ม 1) ที่ได้รับการอนุมัติแล้ว — ถ้ามี จะคัดลอกเล่มที่/โครงการที่มาใช้แทนการออก
    // เลขชุดใหม่ และจำกัดวงเงินขอยืมไม่ให้เกินวงเงินที่ประธานกรรมการอนุมัติ (ดู POST /api/loan-requests)
    proposalId: z.number().int().positive().optional(),
    applicantAge: z
      .number({ error: "กรุณากรอกอายุ" })
      .int("อายุต้องเป็นจำนวนเต็ม")
      .min(1, "อายุไม่ถูกต้อง")
      .max(120, "อายุไม่ถูกต้อง"),
    occupation: thaiNameField("อาชีพ"),

    // ขั้นตอนที่ 2: จำนวนเงินที่ขอยืม และการยินยอม
    requestedAmount: z
      .number({ error: "กรุณากรอกจำนวนเงินที่ขอยืม" })
      .positive("จำนวนเงินต้องมากกว่า 0")
      .max(LOAN_CEILING_DEFAULT, `วงเงินขอยืมต้องไม่เกินเพดาน ${LOAN_CEILING_DEFAULT.toLocaleString("th-TH")} บาทต่อครั้ง`),
    agreesToRegulations: z.boolean().refine((v) => v === true, {
      message: "กรุณายืนยันว่าจะปฏิบัติตามระเบียบกระทรวงมหาดไทยฯ ทุกประการ",
    }),
    spouseConsentName: z.string().optional(),
    requestDate: requiredIsoDate,
    // ตกลงชำระทุกๆวันที่ .... ของเดือน จนครบสัญญา — ใช้คำนวณวันครบกำหนดชำระเงินทั้งหมด/ยอดผ่อนชำระต่อเดือน
    // (ดู lib/loanSchedule.ts) ไปพร้อมกัน แสดงให้ครัวเรือนเห็นก่อนยื่นคำร้อง และในหน้าหลักหลังยื่นแล้ว
    paymentDayOfMonth: z
      .number({ error: "กรุณาระบุวันที่ชำระในแต่ละเดือน" })
      .int("ระบุวันที่เป็นจำนวนเต็ม")
      .min(1, "ระบุวันที่ 1-31")
      .max(31, "ระบุวันที่ 1-31"),

    // ขั้นตอนที่ 3: ความเห็นเจ้าหน้าที่ (ไม่บังคับ - กรอกภายหลังได้)
    workerOpinion: z.enum(["agree", "disagree"]).optional(),
    workerReason: z.string().optional(),
    workerName: z.string().optional(),
    workerDate: optionalIsoDate,
    committeeDecision: z.enum(["approved", "rejected"]).optional(),
    committeeAmount: optionalNumber(z.number().positive("จำนวนเงินต้องมากกว่า 0")),
    committeeReason: z.string().optional(),
    committeeChairName: z.string().optional(),
    committeeDate: optionalIsoDate,
  })
  .refine((data) => data.workerOpinion !== "disagree" || !!data.workerReason?.trim(), {
    message: "กรุณาระบุเหตุผลที่ไม่เห็นชอบ",
    path: ["workerReason"],
  })
  .refine((data) => data.committeeDecision !== "rejected" || !!data.committeeReason?.trim(), {
    message: "กรุณาระบุเหตุผลที่ไม่อนุมัติ",
    path: ["committeeReason"],
  });

/** ครัวเรือนแก้ไขแบบขอยืมเงินทุนของตนเอง — เฉพาะตอนยังไม่มีความเห็นพัฒนากร (ดู PATCH /api/loan-requests/[id]) */
export const loanRequestSelfEditSchema = z.object({
  applicantAge: z.number().int("อายุต้องเป็นจำนวนเต็ม").min(1, "อายุไม่ถูกต้อง").max(120, "อายุไม่ถูกต้อง").optional(),
  occupation: z.string().trim().min(1, "กรุณากรอกอาชีพ").optional(),
  requestedAmount: optionalNumber(
    z.number().positive("จำนวนเงินต้องมากกว่า 0").max(LOAN_CEILING_DEFAULT, `วงเงินขอยืมต้องไม่เกินเพดาน ${LOAN_CEILING_DEFAULT.toLocaleString("th-TH")} บาทต่อครั้ง`)
  ),
  spouseConsentName: z.string().optional(),
  requestDate: z.string().optional(),
  paymentDayOfMonth: z.number().int("ระบุวันที่เป็นจำนวนเต็ม").min(1, "ระบุวันที่ 1-31").max(31, "ระบุวันที่ 1-31").optional(),
});
export type LoanRequestSelfEditValues = z.infer<typeof loanRequestSelfEditSchema>;

export interface LoanRequestFormValues {
  householdId: number;
  proposalId?: number;
  applicantAge: number;
  occupation: string;
  requestedAmount: number;
  agreesToRegulations: boolean;
  spouseConsentName?: string;
  requestDate: string;
  paymentDayOfMonth: number;
  workerOpinion?: "agree" | "disagree";
  workerReason?: string;
  workerName?: string;
  workerDate?: string;
  committeeDecision?: "approved" | "rejected";
  committeeAmount?: number;
  committeeReason?: string;
  committeeChairName?: string;
  committeeDate?: string;
}

/** รูปแบบข้อมูลหลังผ่านการตรวจสอบแล้ว (ส่งให้ onSubmit) */
export interface LoanRequestSubmitValues {
  householdId: number;
  proposalId?: number;
  applicantAge: number;
  occupation: string;
  requestedAmount: number;
  agreesToRegulations: boolean;
  spouseConsentName?: string;
  requestDate: string;
  paymentDayOfMonth: number;
  workerOpinion?: "agree" | "disagree";
  workerReason?: string;
  workerName?: string;
  workerDate?: string;
  committeeDecision?: "approved" | "rejected";
  committeeAmount?: number;
  committeeReason?: string;
  committeeChairName?: string;
  committeeDate?: string;
}

export const LOAN_REQUEST_STEP_FIELDS = [
  ["householdId", "applicantAge", "occupation"],
  ["requestedAmount", "agreesToRegulations", "spouseConsentName", "requestDate", "paymentDayOfMonth"],
] as const;

// ---------------------------------------------------------------------------
// บันทึกรายการยืมเงินใหม่ (เล่มเหลือง) — เลขานุการ
// ---------------------------------------------------------------------------
export const newLoanSchema = z.object({
  householdId: z.number({ error: "กรุณาเลือกครัวเรือนเป้าหมาย" }).int().positive("กรุณาเลือกครัวเรือนเป้าหมาย"),
  borrowRound: z
    .number({ error: "กรุณากรอกลำดับที่ยืม" })
    .int("ลำดับที่ยืมต้องเป็นจำนวนเต็ม")
    .positive("ลำดับที่ยืมต้องมากกว่า 0"),
  contractNo: z.string().optional(),
  amount: z
    .number({ error: "กรุณากรอกจำนวนเงินยืม" })
    .positive("จำนวนเงินต้องมากกว่า 0")
    .max(LOAN_CEILING_DEFAULT, `จำนวนเงินต้องไม่เกินเพดาน ${LOAN_CEILING_DEFAULT.toLocaleString("th-TH")} บาท`),
  receivedDate: requiredIsoDate,
  dueDate: optionalIsoDate,
  occupation: z.string().optional(),
});
export type NewLoanFormValues = z.infer<typeof newLoanSchema>;

// ---------------------------------------------------------------------------
// เวิร์กโฟลว์ความเห็นพัฒนากร/อนุมัติ (แบบฟอร์ม 1 และ 2) — แยก schema ต่างหากจาก
// proposalSchema/loanRequestSchema เพราะเป็นคนละ endpoint ที่มีสิทธิ์ผู้ใช้งานคนละกลุ่ม
// ---------------------------------------------------------------------------
export const proposalWorkerOpinionSchema = z
  .object({
    workerOpinion: z.enum(["possible", "not_possible"], { error: "กรุณาระบุความเห็น" }),
    workerReason: z.string().optional(),
    workerName: z.string().optional(),
    workerDate: optionalIsoDate,
  })
  .refine((data) => data.workerOpinion !== "not_possible" || !!data.workerReason?.trim(), {
    message: "กรุณาระบุเหตุผลที่เห็นว่าเป็นไปไม่ได้",
    path: ["workerReason"],
  });
export type ProposalWorkerOpinionValues = z.infer<typeof proposalWorkerOpinionSchema>;

export const loanRequestWorkerOpinionSchema = z
  .object({
    workerOpinion: z.enum(["agree", "disagree"], { error: "กรุณาระบุความเห็น" }),
    workerReason: z.string().optional(),
    workerName: z.string().optional(),
    workerDate: optionalIsoDate,
  })
  .refine((data) => data.workerOpinion !== "disagree" || !!data.workerReason?.trim(), {
    message: "กรุณาระบุเหตุผลที่ไม่เห็นชอบ",
    path: ["workerReason"],
  });
export type LoanRequestWorkerOpinionValues = z.infer<typeof loanRequestWorkerOpinionSchema>;

export const committeeApprovalSchema = z
  .object({
    committeeDecision: z.enum(["approved", "rejected"], { error: "กรุณาระบุผลการพิจารณา" }),
    committeeAmount: optionalNumber(z.number().positive("จำนวนเงินต้องมากกว่า 0")),
    committeeReason: z.string().optional(),
    committeeChairName: z.string().optional(),
    committeeDate: optionalIsoDate,
  })
  .refine((data) => data.committeeDecision !== "rejected" || !!data.committeeReason?.trim(), {
    message: "กรุณาระบุเหตุผลที่ไม่อนุมัติ",
    path: ["committeeReason"],
  });
export type CommitteeApprovalValues = z.infer<typeof committeeApprovalSchema>;

// ---------------------------------------------------------------------------
// บันทึกรับชำระเงินค่างวด (เล่มเหลือง) — เลขานุการ/ฝ่ายการเงิน
// ---------------------------------------------------------------------------
export const loanRepaymentSchema = z.object({
  amount: z.number({ error: "กรุณากรอกจำนวนเงิน" }).positive("จำนวนเงินต้องมากกว่า 0"),
  paymentDate: requiredIsoDate,
  receiptNo: z.string().optional(),
  note: z.string().optional(),
  transferSlipUrl: z.string().optional(),
});
export type LoanRepaymentValues = z.infer<typeof loanRepaymentSchema>;

/** ครัวเรือนแจ้งชำระเงินเอง (รอกรรมการตรวจสอบ) — บังคับต้องแนบสลิปโอนเงินเสมอ */
export const householdPaymentReportSchema = z.object({
  amount: z.number({ error: "กรุณากรอกจำนวนเงิน" }).positive("จำนวนเงินต้องมากกว่า 0"),
  paymentDate: requiredIsoDate,
  transferSlipUrl: z.string().min(1, "กรุณาแนบรูปภาพสลิปโอนเงิน"),
  householdNote: z.string().optional(),
});
export type HouseholdPaymentReportValues = z.infer<typeof householdPaymentReportSchema>;

/** กรรมการปฏิเสธรายการแจ้งชำระเงิน — บังคับต้องระบุเหตุผล */
export const rejectPaymentSchema = z.object({
  committeeReply: z.string().trim().min(1, "กรุณาระบุเหตุผลที่ปฏิเสธ"),
});
export type RejectPaymentValues = z.infer<typeof rejectPaymentSchema>;

/** แก้ไขรายการรับชำระเงินที่มีอยู่แล้ว — ทุกฟิลด์ optional (แก้ไขบางส่วนได้) */
export const editLoanRepaymentSchema = z.object({
  amount: z.number().positive("จำนวนเงินต้องมากกว่า 0").optional(),
  paymentDate: z.string().min(1).optional(),
  receiptNo: z.string().optional(),
  note: z.string().optional(),
  transferSlipUrl: z.string().optional(),
});
export type EditLoanRepaymentValues = z.infer<typeof editLoanRepaymentSchema>;

// ---------------------------------------------------------------------------
// คำขอเปิดบัญชีธนาคารใหม่ (เล่มเขียว) — ต้องผ่านการลงนามอนุมัติ 2 ฝ่ายก่อนใช้บันทึกฝาก-ถอนได้ (ดู /approve)
// ---------------------------------------------------------------------------
export const bankAccountRequestSchema = z.object({
  villageId: z.number().int().positive(),
  bankName: z.string().trim().min(1, "กรุณาระบุชื่อธนาคาร"),
  branch: z.string().trim().optional(),
  accountNo: z.string().trim().min(1, "กรุณาระบุเลขที่บัญชี"),
  accountName: z.string().trim().min(1, "กรุณาระบุชื่อบัญชี"),
});
export type BankAccountRequestValues = z.infer<typeof bankAccountRequestSchema>;

// ---------------------------------------------------------------------------
// บันทึกรายการฝาก-ถอนเงิน (เล่มเขียว) — ยอดคงเหลือคำนวณโดยเซิร์ฟเวอร์ ไม่รับจาก client
// ---------------------------------------------------------------------------
export const bankTransactionEntrySchema = z
  .object({
    bankAccountId: z.number().int().positive(),
    transactionDate: requiredIsoDate,
    documentNo: z.string().optional(),
    description: z.string().trim().min(1, "กรุณาระบุรายการ"),
    depositAmount: z.number().min(0).default(0),
    withdrawAmount: z.number().min(0).default(0),
    note: z.string().optional(),
    passbookImageUrl: z.string().optional(),
  })
  .refine((data) => data.depositAmount > 0 || data.withdrawAmount > 0, {
    message: "กรุณากรอกจำนวนเงินฝากหรือถอนอย่างน้อยหนึ่งช่อง",
    path: ["depositAmount"],
  });
export type BankTransactionEntryValues = z.infer<typeof bankTransactionEntrySchema>;

/** แก้ไขรายการฝาก-ถอนที่มีอยู่แล้ว — ทุกฟิลด์ optional (แก้ไขบางส่วนได้) ยอดคงเหลือคำนวณใหม่หลังบันทึกเสมอ */
// ---------------------------------------------------------------------------
// วาระการประชุม/มติคณะกรรมการ กข.คจ. หมู่บ้าน (Meeting Records) — /api/meetings
// ---------------------------------------------------------------------------
export const meetingRecordSchema = z.object({
  meetingDate: requiredIsoDate,
  agendaTopic: z.string().trim().min(1, "กรุณากรอกหัวข้อวาระการประชุม"),
  fileUrl: z.string().trim().min(1, "กรุณาแนบไฟล์วาระการประชุม (.pdf, .jpg, .png)"),
});
export type MeetingRecordValues = z.infer<typeof meetingRecordSchema>;

// ---------------------------------------------------------------------------
// บันทึกการติดตาม/ให้ข้อแนะนำของพัฒนากรตำบล (Visit Log) — /api/visit-logs
// ---------------------------------------------------------------------------
export const visitLogSchema = z.object({
  villageId: z.number({ error: "กรุณาเลือกหมู่บ้าน" }).int().positive(),
  visitDate: requiredIsoDate,
  visitType: z.string().trim().min(1, "กรุณาเลือกประเภทการลงพื้นที่"),
  notes: z.string().trim().max(2000, "หมายเหตุยาวเกินไป").optional(),
  attachmentUrls: z.array(z.string().trim().min(1)).max(10, "แนบไฟล์ได้สูงสุด 10 ไฟล์ต่อรายการ").optional(),
});
export type VisitLogValues = z.infer<typeof visitLogSchema>;

// พัฒนาการอำเภอ/พัฒนาการจังหวัดพิมพ์คำแนะนำต่อท้ายบันทึกการติดตามของพัฒนากรตำบล — /api/visit-logs/[id]
export const visitLogAdviceSchema = z.object({
  advice: z.string().trim().min(1, "กรุณากรอกคำแนะนำ").max(2000, "คำแนะนำยาวเกินไป"),
});
export type VisitLogAdviceValues = z.infer<typeof visitLogAdviceSchema>;

export const editBankTransactionSchema = z.object({
  transactionDate: z.string().min(1).optional(),
  documentNo: z.string().optional(),
  description: z.string().trim().min(1, "กรุณาระบุรายการ").optional(),
  depositAmount: z.number().min(0).optional(),
  withdrawAmount: z.number().min(0).optional(),
  note: z.string().optional(),
  passbookImageUrl: z.string().optional(),
});
export type EditBankTransactionValues = z.infer<typeof editBankTransactionSchema>;
