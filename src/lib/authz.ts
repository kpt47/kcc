// ตรรกะสิทธิ์การเข้าถึง (Authorization) แยกจาก scope.ts (ซึ่งจำกัด "เห็นหมู่บ้านไหนบ้าง")
// ไฟล์นี้ตอบคำถามว่า "ทำอะไรได้บ้าง" เมื่อดูข้อมูลในขอบเขตที่ตนเห็นอยู่แล้ว
// อ้างอิงระเบียบกระทรวงมหาดไทยว่าด้วยการบริหารและการใช้จ่ายเงินโครงการ กข.คจ. พ.ศ. 2553
//
// หลักการ "แยกอำนาจหน้าที่โดยเด็ดขาด" (Strict Separation of Duties): เอกสาร/บัญชีแต่ละเล่มเป็นของ
// ตำแหน่งใดตำแหน่งหนึ่งเท่านั้นตามระเบียบ — ไม่มี "ผู้บริหารระดับสูงกว่า override ได้เสมอ" อีกต่อไป
// (เคยมีในเวอร์ชันก่อนหน้าเพื่อรองรับกรณีตำแหน่งว่าง แต่ถูกยกเลิกตามคำสั่ง Refactor RBAC ฉบับนี้
// เพื่อปิดช่องโหว่การข้ามสิทธิ์ — ผู้บริหารระดับสูงยังคง "เห็น" ข้อมูลได้ตาม scope.ts แต่ "แก้ไขไม่ได้")
import type { GlobalRole } from "@/generated/prisma/client";
import type { CurrentUser } from "./auth";

/** ข้อความปฏิเสธสิทธิ์มาตรฐาน — ใช้กับทุก 403 ที่เกิดจากการขาดสิทธิ์ตามบทบาท (ไม่ใช่ scope/พื้นที่) */
export const ACCESS_DENIED_MESSAGE = "Access Denied: คุณไม่มีสิทธิ์เข้าถึงหรือแก้ไขข้อมูลนี้ตามระเบียบ กข.คจ.";

/**
 * ลำดับขั้นบทบาท จากล่างสุดไปบนสุด — ต้องตรงกับลำดับ enum GlobalRole ใน schema.prisma
 * IT_SUPPORT ไม่ใช่ส่วนหนึ่งของสายบังคับบัญชาภูมิศาสตร์นี้ (ไม่เกี่ยวข้องกับข้อมูลโครงการ กข.คจ. เลย)
 * จึงตั้ง rank ต่ำกว่าทุก role เพื่อให้ hasMinRole(...) ไม่มีทาง "ผ่าน" เงื่อนไขที่ต้องการ SUB_DISTRICT_ADMIN
 * ขึ้นไปได้เลยไม่ว่ากรณีใด (ป้องกัน IT_SUPPORT หลุดเข้าถึงสิทธิ์ทางธุรกิจโดยไม่ตั้งใจ)
 */
const ROLE_RANK: Record<GlobalRole, number> = {
  IT_SUPPORT: -1,
  HOUSEHOLD: 0,
  VILLAGE_COMMITTEE: 1,
  SUB_DISTRICT_ADMIN: 2,
  DISTRICT_ADMIN: 3,
  PROVINCIAL_ADMIN: 4,
  GLOBAL_ADMIN: 5,
};

/** ผู้ใช้มี role ตั้งแต่ระดับ `min` ขึ้นไปหรือไม่ (ใช้สำหรับกฎ "ตั้งแต่ ... ขึ้นไป" ที่ยังเหลืออยู่จริง) */
export function hasMinRole(user: Pick<CurrentUser, "role">, min: GlobalRole): boolean {
  return ROLE_RANK[user.role] >= ROLE_RANK[min];
}

/**
 * การจัดการสิทธิ์หมู่บ้าน (ตั้งค่า committeeRole ของสมาชิกคณะกรรมการ)
 * เฉพาะ SUB_DISTRICT_ADMIN ขึ้นไปเท่านั้น — ป้องกันหมู่บ้านตั้งสิทธิ์กันเอง
 */
export function canManageCommitteeRoles(user: Pick<CurrentUser, "role">): boolean {
  return hasMinRole(user, "SUB_DISTRICT_ADMIN");
}

/** จัดการ Master Data (ชื่อหมู่บ้าน/ตำบล/อำเภอ) — เฉพาะ GLOBAL_ADMIN เท่านั้น ระดับอื่น Read-only ทั้งหมด */
export function canManageMasterData(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "GLOBAL_ADMIN";
}

/**
 * ขึ้นทะเบียนหมู่บ้านใหม่เข้าโครงการ กข.คจ. — คนละสิทธิ์กับ canManageMasterData ซึ่งคุมเฉพาะข้อมูลเขตการปกครอง
 * จริงของประเทศ (จังหวัด/อำเภอ/ตำบล) เปิดกว้างกว่าตั้งแต่พัฒนากรตำบลขึ้นไป เพราะการขึ้นทะเบียนหมู่บ้านใหม่
 * เข้าโครงการในพื้นที่รับผิดชอบของตนเป็นหน้าที่หลักของพัฒนากรตำบล — ฟิลด์จังหวัด/อำเภอ/ตำบลจะถูกล็อกตามขอบเขต
 * ของผู้ใช้แต่ละระดับที่หน้าฟอร์ม (ดู getAddressScopeLock ใน lib/addressScope.ts) และตรวจซ้ำฝั่งเซิร์ฟเวอร์
 * ที่ /api/master-data/villages ว่าตำบลที่ส่งมาอยู่ในเขตของผู้ใช้จริง ไม่ให้ข้ามเขตได้
 */
export function canCreateVillage(user: Pick<CurrentUser, "role">): boolean {
  return hasMinRole(user, "SUB_DISTRICT_ADMIN");
}

/**
 * ข้อความปฏิเสธสิทธิ์เฉพาะการเพิ่ม/แก้ไข/ลบรายชื่อหมู่บ้าน (Master Data) — ใช้แทน ACCESS_DENIED_MESSAGE
 * ที่ /api/villages โดยเฉพาะ ตามที่ผู้ใช้กำหนดไว้ชัดเจน (เดิม endpoint นี้ไม่มีการตรวจสอบสิทธิ์เลย เป็นช่องโหว่
 * ให้ผู้ใช้ทุกระดับรวมถึงประธานคณะกรรมการหมู่บ้านสร้างหมู่บ้าน/ตำบล/อำเภอ/จังหวัดปลอมลงระบบได้)
 */
export const VILLAGE_MASTER_DATA_DENIED_MESSAGE =
  "Access Denied: สิทธิ์ในการเพิ่มหรือแก้ไขรายชื่อหมู่บ้านเป้าหมายเป็นของกรมการพัฒนาชุมชน (ส่วนกลาง) เท่านั้น";

/**
 * บัญชีทะเบียนครัวเรือนเป้าหมาย (เล่มม่วง): เพิ่มรายชื่อพื้นฐาน — ประธาน/เลขานุการคณะกรรมการหมู่บ้าน
 * หรือพัฒนากรตำบล ทำได้ (ข้อมูลพื้นฐานเท่านั้น ลำดับเป้าหมาย/รายได้ยังต้องรอพัฒนากรตรวจสอบ/แก้ไขทีหลัง)
 */
export function canCreateHousehold(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.committeeRole === "CHAIRMAN" || user.committeeRole === "SECRETARY" || user.role === "SUB_DISTRICT_ADMIN";
}

/**
 * บัญชีทะเบียนครัวเรือนเป้าหมาย (เล่มม่วง): แก้ไขข้อมูลทุกฟิลด์ (รวมรายได้ จปฐ./ลำดับที่ครัวเรือนเป้าหมาย) —
 * พัฒนากรตำบล (SUB_DISTRICT_ADMIN) หรือประธานคณะกรรมการหมู่บ้าน (CHAIRMAN) เท่านั้น แม้แต่อำเภอ/จังหวัด/
 * ส่วนกลาง หรือเลขานุการ/ฝ่ายการเงิน/กรรมการทั่วไปก็แก้ไม่ได้ (เลขาฯ ทำได้แค่เพิ่มรายชื่อพื้นฐานผ่าน canCreateHousehold)
 */
export function canEditHousehold(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.role === "SUB_DISTRICT_ADMIN" || user.committeeRole === "CHAIRMAN";
}

/**
 * บัญชีทะเบียนครัวเรือนเป้าหมาย (เล่มม่วง): ลบทะเบียน — เฉพาะประธานคณะกรรมการหมู่บ้าน (CHAIRMAN) ของหมู่บ้านนั้น
 * เท่านั้น (ตรวจสอบขอบเขตหมู่บ้านแยกที่ scope.ts ตามปกติ) ลบไม่ได้หากครัวเรือนมีประวัติเงินยืม/แบบเสนอโครงการ/
 * แบบขอยืมเงินทุน/บัญชีผู้ใช้งานผูกอยู่แล้ว (ตรวจสอบที่ฝั่ง API ก่อนลบเสมอ เพื่อกันข้อมูลกำพร้า)
 */
export function canDeleteHousehold(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.committeeRole === "CHAIRMAN";
}

/**
 * เบอร์โทรศัพท์ครัวเรือน (ทะเบียนครัวเรือนเป้าหมาย เล่มม่วง) — ข้อมูลส่วนบุคคลที่จำกัดการมองเห็นแคบกว่า
 * ฟิลด์อื่นในระเบียนเดียวกัน เห็นได้เฉพาะ: ครัวเรือนเจ้าของข้อมูลเอง, ประธาน/เลขานุการ/ฝ่ายการเงินของหมู่บ้านนั้น,
 * พัฒนากรตำบล และผู้บริหารอำเภอ เท่านั้น — ไม่รวมกรรมการทั่วไป จังหวัด ส่วนกลาง หรือ IT_SUPPORT
 * (การกรอง scope ระดับ "เห็นครัวเรือนไหนได้บ้าง" ยังคงเป็นหน้าที่ของ scope.ts ตามปกติ ฟังก์ชันนี้ควบคุมเฉพาะ
 * ฟิลด์นี้ฟิลด์เดียวซ้อนอีกชั้นหนึ่งเท่านั้น)
 */
export function canViewHouseholdPhoneNumber(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  if (user.role === "HOUSEHOLD") return true;
  if (user.role === "VILLAGE_COMMITTEE") {
    return (
      user.committeeRole === "CHAIRMAN" || user.committeeRole === "SECRETARY" || user.committeeRole === "FINANCE_MEMBER"
    );
  }
  return user.role === "SUB_DISTRICT_ADMIN" || user.role === "DISTRICT_ADMIN";
}

/**
 * บัญชีคุมลูกหนี้ (เล่มเหลือง): บันทึกรายการยืมเงิน (การจ่ายเงินยืมก้อนใหม่) — เฉพาะเลขานุการ
 * (SECRETARY) เท่านั้น ไม่มีสิทธิ์ override จากตำแหน่งอื่นอีกต่อไป
 */
export function canCreateOrUpdateLoan(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.committeeRole === "SECRETARY";
}

/** บัญชีคุมลูกหนี้ (เล่มเหลือง): ประธานคณะกรรมการ (CHAIRMAN) เท่านั้นเป็นผู้อนุมัติ */
export function canApproveLoan(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.committeeRole === "CHAIRMAN";
}

/**
 * บัญชีคุมเงินฝาก (เล่มเขียว): เฉพาะฝ่ายการเงินหมู่บ้าน (FINANCE_MEMBER) เท่านั้นที่บันทึกรายการฝาก-ถอนได้
 * ตำแหน่งอื่นทั้งหมด รวมถึงผู้บริหารระดับสูง (พัฒนากร/อำเภอ/จังหวัด/ส่วนกลาง) ทำได้แค่ดู (Read-only)
 */
export function canCreateBankTransaction(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.committeeRole === "FINANCE_MEMBER";
}

/** ยื่นคำขอเปิดบัญชีธนาคารใหม่ให้หมู่บ้าน — เลขานุการหรือฝ่ายการเงินเป็นผู้ยื่น จากนั้นต้องรอลงนามอนุมัติ 2 ฝ่าย */
export function canRequestBankAccount(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.committeeRole === "SECRETARY" || user.committeeRole === "FINANCE_MEMBER";
}

/** ลงนามอนุมัติเปิดบัญชีธนาคารในฐานะประธาน (ลายเซ็นที่ 1 ของ Multi-signature) */
export function canSignBankAccountAsChairman(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.committeeRole === "CHAIRMAN" || hasMinRole(user, "SUB_DISTRICT_ADMIN");
}

/** ลงนามอนุมัติเปิดบัญชีธนาคารในฐานะฝ่ายการเงิน (ลายเซ็นที่ 2 ของ Multi-signature) */
export function canSignBankAccountAsFinance(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.committeeRole === "FINANCE_MEMBER" || hasMinRole(user, "SUB_DISTRICT_ADMIN");
}

/** การเปิดบัญชีถือว่าอนุมัติสมบูรณ์เมื่อมีทั้งลายเซ็นประธานและฝ่ายการเงินแล้ว — ก่อนหน้านั้นบันทึกฝาก-ถอนไม่ได้ */
export function isBankAccountFullyApproved(account: {
  chairmanApprovedById: number | null;
  financeApprovedById: number | null;
}): boolean {
  return account.chairmanApprovedById !== null && account.financeApprovedById !== null;
}

/** การยืนยันยอดหนี้ประจำปี: เฉพาะประธานคณะกรรมการ (CHAIRMAN) เท่านั้นเป็นผู้กำหนดวันที่ยืนยันยอดของหมู่บ้าน */
export function canSetDebtConfirmationDate(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.committeeRole === "CHAIRMAN";
}

/**
 * แก้ไข/ลบรายการบัญชีคุมเงินฝาก (เล่มเขียว) และจัดการรูปสมุดบัญชี — เฉพาะฝ่ายการเงินหมู่บ้าน
 * (FINANCE_MEMBER) เท่านั้น แม้แต่ประธานคณะกรรมการหรือผู้บริหารระดับสูงก็ไม่มีปุ่มแก้ไข/ลบ
 */
export function canEditOrDeleteBankTransaction(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.committeeRole === "FINANCE_MEMBER";
}

/** ลงนามอนุมัติรายการถอนเงินในฐานะประธาน (ลายเซ็นที่ 1 ของ Multi-signature) — คนละสิทธิ์กับการแก้ไข/ลบรายการ */
export function canSignBankTransactionAsChairman(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.committeeRole === "CHAIRMAN" || hasMinRole(user, "SUB_DISTRICT_ADMIN");
}

/** ลงนามอนุมัติรายการถอนเงินในฐานะกรรมการเงินทุน (ลายเซ็นที่ 2 ของ Multi-signature ต้องมีอย่างน้อย 1 เสียง) */
export function canSignBankTransactionAsFinance(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.committeeRole === "FINANCE_MEMBER" || hasMinRole(user, "SUB_DISTRICT_ADMIN");
}

/** รายการถอนเงินถือว่าอนุมัติสมบูรณ์เมื่อมีทั้งลายเซ็นประธานและกรรมการเงินทุนแล้ว */
export function isBankTransactionFullyApproved(txn: {
  chairmanApprovedById: number | null;
  financeApprovedById: number | null;
}): boolean {
  return txn.chairmanApprovedById !== null && txn.financeApprovedById !== null;
}

/** แบบฟอร์ม 1/2 (แบบเสนอโครงการ/แบบขอยืมเงินทุน): พัฒนากรบันทึก "ความเห็นของพัฒนากร" — เฉพาะ SUB_DISTRICT_ADMIN เท่านั้น */
export function canGiveWorkerOpinion(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "SUB_DISTRICT_ADMIN";
}

/**
 * แบบฟอร์ม 1/2: ประธานคณะกรรมการหมู่บ้าน (CHAIRMAN) เท่านั้นเป็นผู้อนุมัติ (เงื่อนไข "ต้องมีความเห็น
 * พัฒนากรก่อน" ตรวจสอบแยกในตัว route เอง เพราะเป็น business rule ไม่ใช่สิทธิ์การเข้าถึง)
 */
export function canApproveProposalOrLoanRequest(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.committeeRole === "CHAIRMAN";
}

/**
 * ดูผลประเมินความเสี่ยงก่อนอนุมัติ (Risk Assessment) ของแบบฟอร์ม 1/2 — เฉพาะผู้มีหน้าที่พิจารณาโดยตรงเท่านั้น
 * คือพัฒนากรตำบล (ผู้ให้ความเห็น) และประธานคณะกรรมการหมู่บ้าน (ผู้อนุมัติ) ห้ามครัวเรือนเห็นผลของตนเองเด็ดขาด
 * เพื่อป้องกันความขัดแย้งกับคณะกรรมการหมู่บ้าน ตามที่ผู้ใช้กำหนดไว้ชัดเจน
 */
export function canViewRiskAssessment(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return canGiveWorkerOpinion(user) || canApproveProposalOrLoanRequest(user);
}

/**
 * บัญชีคุมลูกหนี้ (เล่มเหลือง): บันทึกรับชำระเงินค่างวด/ออกใบเสร็จ — เลขานุการ (SECRETARY) หรือฝ่ายการเงิน
 * (FINANCE_MEMBER) ทำได้ทั้งคู่ เนื่องจากทั้งสองตำแหน่งเกี่ยวข้องกับการรับเงินจากครัวเรือนโดยตรง
 * (ฝ่ายการเงินมีสิทธิ์เฉพาะ "สร้าง/ออกใบเสร็จ" เท่านั้น — แก้ไข/ลบประวัติย้อนหลังต้องผ่านเลขานุการ
 * ดู canEditOrDeleteRepayment)
 */
export function canCreateRepayment(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.committeeRole === "SECRETARY" || user.committeeRole === "FINANCE_MEMBER";
}

/**
 * บัญชีคุมลูกหนี้ (เล่มเหลือง): แก้ไข/ลบรายการรับชำระเงินที่บันทึกไว้แล้ว — เฉพาะเลขานุการ (SECRETARY)
 * เท่านั้น ฝ่ายการเงินทำได้แค่สร้างรายการใหม่ตอนออกใบเสร็จ (canCreateRepayment) ไม่มีสิทธิ์แก้ไข/ลบ
 */
export function canEditOrDeleteRepayment(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.committeeRole === "SECRETARY";
}

/**
 * รีเซ็ตสถานะเครดิต (riskStatus) ของครัวเรือนกลับเป็นปกติด้วยตนเอง (กรณีประนอมหนี้) — ประธานคณะกรรมการ
 * (CHAIRMAN) เท่านั้นในระดับหมู่บ้าน ห้ามเลขานุการ/ฝ่ายการเงินเด็ดขาด (ไม่ใช่ผู้มีอำนาจตัดสินใจประนอมหนี้)
 * ตั้งแต่ระดับพัฒนากรขึ้นไปทำได้เสมอ (นี่เป็นการดำเนินการทางปกครอง ไม่ใช่การแก้ไขบัญชีเล่มใดเล่มหนึ่งโดยตรง
 * จึงยังคงหลักการ "ผู้บังคับบัญชาช่วยได้" ไว้ตามเดิม)
 */
export function canResetCreditStatus(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  if (user.role === "VILLAGE_COMMITTEE") return user.committeeRole === "CHAIRMAN";
  return hasMinRole(user, "SUB_DISTRICT_ADMIN");
}

/**
 * รายงานภาวะหนี้สินและฐานะทางการเงิน (/official-reports) — แต่ละแบบฟอร์มเห็นได้เฉพาะระดับที่ตรงกับ
 * ระเบียบเท่านั้น ไม่ใช่ "ตั้งแต่ระดับนี้ขึ้นไป" — ผู้ใช้ระดับสูงกว่าที่ไม่ได้อยู่ในรายชื่อต้อง 403 เช่นกัน
 * (เช่น DISTRICT_ADMIN ต้องดูแบบ 26(1) สรุประดับอำเภอเท่านั้น จะไปดูแบบหมู่บ้านหรือแบบจังหวัดไม่ได้)
 */

/** แบบ 3.1: แบบฟอร์ม 26(1) ระดับหมู่บ้าน — ประธาน/กรรมการหมู่บ้าน และพัฒนากรตำบลเท่านั้น */
export function canViewVillageDebtReport(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "VILLAGE_COMMITTEE" || user.role === "SUB_DISTRICT_ADMIN";
}

/** แบบ 3.2: แบบฟอร์ม 26(1) สรุประดับอำเภอ — เฉพาะ DISTRICT_ADMIN เท่านั้น (ไม่รวมจังหวัด/ส่วนกลาง) */
export function canViewDistrictSummaryReport(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "DISTRICT_ADMIN";
}

/** แบบ 3.3: แบบฟอร์ม 26(2) สรุประดับจังหวัด — เฉพาะจังหวัดและส่วนกลางเท่านั้น */
export function canViewProvinceSummaryReport(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "PROVINCIAL_ADMIN" || user.role === "GLOBAL_ADMIN";
}

/** แบบ 3.4: รายงานสภาพปัญหาการบริหารเงินทุน — เฉพาะจังหวัดและส่วนกลางเท่านั้น */
export function canViewFundProblemReport(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "PROVINCIAL_ADMIN" || user.role === "GLOBAL_ADMIN";
}

/**
 * วาระการประชุม/มติคณะกรรมการ กข.คจ. หมู่บ้าน (Meeting Records): สร้าง/อัปโหลดไฟล์ได้เฉพาะประธาน เลขานุการ
 * และฝ่ายการเงิน — ไม่รวมกรรมการทั่วไป (NORMAL_MEMBER) เพราะสามตำแหน่งนี้เป็นผู้รับผิดชอบบันทึก/รับรองมติโดยตรง
 */
export function canCreateMeetingRecord(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.committeeRole === "CHAIRMAN" || user.committeeRole === "SECRETARY" || user.committeeRole === "FINANCE_MEMBER";
}

/** ข้อความปฏิเสธสิทธิ์เฉพาะการลบเอกสารการประชุม — ระบุไว้ต่างหากจาก ACCESS_DENIED_MESSAGE ตามที่ผู้ใช้กำหนด */
export const MEETING_DELETE_DENIED_MESSAGE = "Access Denied: สิทธิ์การลบเอกสารการประชุมสงวนไว้สำหรับพัฒนากรประจำตำบลเท่านั้น";

/** ลบเอกสารการประชุม — เฉพาะพัฒนากรประจำตำบล (SUB_DISTRICT_ADMIN) เท่านั้น แม้แต่ประธาน/ผู้บริหารระดับสูงกว่าก็ลบไม่ได้ */
export function canDeleteMeetingRecord(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "SUB_DISTRICT_ADMIN";
}

/**
 * บันทึกการติดตาม/ให้ข้อแนะนำของพัฒนากรตำบล (เล่มม่วง ท้ายเล่ม) — สร้าง/ลบได้เฉพาะพัฒนากรตำบล
 * (SUB_DISTRICT_ADMIN) เจ้าของบัญชีเท่านั้น ใช้เป็นหลักฐานการลงพื้นที่ปฏิบัติงานของตนเอง
 * (การลบข้อมูลของตนเองต้องตรวจสอบ recordedById ตรงกับผู้ใช้ปัจจุบันเพิ่มเติมที่ API route)
 */
export function canCreateVisitLog(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "SUB_DISTRICT_ADMIN";
}

export const VISIT_LOG_DENIED_MESSAGE = "Access Denied: สิทธิ์การบันทึกการติดตามสงวนไว้สำหรับพัฒนากรประจำตำบลเท่านั้น";

/**
 * นำเข้าบัญชีผู้ใช้งานระดับครัวเรือนจากไฟล์ Excel เป็นชุดใหญ่ (Bulk Import) — เฉพาะประธานคณะกรรมการหมู่บ้าน
 * (จำกัดเฉพาะหมู่บ้านตนเอง) หรือพัฒนากรประจำตำบล (เลือกได้ทุกหมู่บ้านในตำบลตนเอง) เท่านั้น
 * ตั้งใจแยกจาก canManageTargetRole/creatableRoleFor ในไฟล์ userManagement.ts เพราะกฎลำดับชั้นปกติ
 * (Top-Down 1 ระดับ) จะไม่อนุญาตให้ SUB_DISTRICT_ADMIN จัดการบัญชี HOUSEHOLD ได้เลย — ฟีเจอร์นี้ขยายสิทธิ์
 * ให้เฉพาะงาน "นำเข้าจำนวนมาก" นี้เท่านั้นตามที่ผู้ใช้ระบุไว้อย่างชัดเจน
 */
export function canImportHouseholds(user: Pick<CurrentUser, "role" | "committeeRole">): boolean {
  return user.committeeRole === "CHAIRMAN" || user.role === "SUB_DISTRICT_ADMIN";
}

// ---------------------------------------------------------------------------
// Data Privacy: สิทธิ์การเข้าถึงข้อมูลสมุดทะเบียนทั้ง 4 เล่ม (เล่มน้ำตาล/ม่วง/เขียว/เหลือง)
// ---------------------------------------------------------------------------

/**
 * เล่มน้ำตาล (สมุดบันทึกสถานะหมู่บ้าน/บันทึกการส่งมอบ-รับมอบงาน): อนุญาตเฉพาะพัฒนากรตำบล ผู้บริหารอำเภอ
 * และผู้บริหารจังหวัดเท่านั้น — ไม่รวมส่วนกลาง (GLOBAL_ADMIN), กรรมการหมู่บ้าน, ครัวเรือน หรือ IT_SUPPORT
 * ตามที่ผู้ใช้กำหนดไว้ชัดเจน (ต่างจากเล่มอื่นที่ผู้บริหารระดับสูงกว่ายัง "เห็น" ได้เสมอ)
 */
export function canViewVillageStatusBook(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "SUB_DISTRICT_ADMIN" || user.role === "DISTRICT_ADMIN" || user.role === "PROVINCIAL_ADMIN";
}

export const VILLAGE_STATUS_BOOK_DENIED_MESSAGE =
  "Access Denied: สมุดบันทึกสถานะหมู่บ้าน (เล่มน้ำตาล) จำกัดสิทธิ์เฉพาะพัฒนากรตำบล ผู้บริหารอำเภอ และผู้บริหารจังหวัดเท่านั้น";

/** เมนู "ปรึกษา/ร้องทุกข์": เฉพาะครัวเรือนเป้าหมาย (HOUSEHOLD) เท่านั้นที่ส่งคำร้องได้ */
export function canSubmitHouseholdInquiry(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "HOUSEHOLD";
}

/** เมนู "ปรึกษา/ร้องทุกข์": ผู้บริหารอำเภอและผู้บริหารจังหวัดดูได้เฉพาะเขตพื้นที่ของตนเอง (ดู scope.ts) */
export function canViewHouseholdInquiries(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "DISTRICT_ADMIN" || user.role === "PROVINCIAL_ADMIN";
}

export const HOUSEHOLD_INQUIRY_DENIED_MESSAGE =
  "Access Denied: หัวข้อปรึกษา/ร้องทุกข์ของครัวเรือน จำกัดสิทธิ์เฉพาะผู้บริหารอำเภอและผู้บริหารจังหวัดเท่านั้น";

/**
 * เล่มเขียว (บัญชีคุมเงินฝากธนาคาร): ครัวเรือน (HOUSEHOLD) ไม่มีสิทธิ์ดู GET เด็ดขาด (ชาวบ้านไม่มีสิทธิ์ดู
 * สมุดบัญชีธนาคารหมู่บ้าน) — IT_SUPPORT ก็ไม่มีสิทธิ์เช่นกัน เพราะไม่ใช่ข้อมูลที่เกี่ยวข้องกับหน้าที่ดูแลระบบ
 */
export function canViewBankLedger(user: Pick<CurrentUser, "role">): boolean {
  return user.role !== "HOUSEHOLD" && user.role !== "IT_SUPPORT";
}

export const BANK_LEDGER_DENIED_MESSAGE =
  "Access Denied: บัญชีคุมเงินฝากธนาคาร (เล่มเขียว) ไม่ใช่ข้อมูลที่ครัวเรือนเป้าหมายมีสิทธิ์เข้าถึง";

/**
 * บัญชีผู้ใช้งานระดับ IT_SUPPORT ไม่มีสิทธิ์เข้าถึงข้อมูลสมุดทะเบียนโครงการ กข.คจ. เล่มใดเลย (ม่วง/เหลือง
 * รวมอยู่ด้วย แม้จะมีการแยก isolation ระดับ userId ให้ HOUSEHOLD อยู่แล้วก็ตาม) — ใช้ตรวจสอบเพิ่มเติมแบบ
 * Defense-in-Depth ที่หน้า /households และ /loans เพื่อไม่ให้พึ่งพาแค่ scope ว่างเปล่าจาก lib/scope.ts เท่านั้น
 */
export function isItSupportBlockedFromProgramData(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "IT_SUPPORT";
}

export const IT_SUPPORT_DENIED_MESSAGE =
  "Access Denied: บัญชีผู้ดูแลระบบ (IT_SUPPORT) มีสิทธิ์เฉพาะการดูรายชื่อบัญชีผู้ใช้งานและตรวจสอบ Audit Log เท่านั้น ไม่มีสิทธิ์เข้าถึงข้อมูลสมุดทะเบียนโครงการ กข.คจ.";

/**
 * ดู Audit Log ของระบบ (SystemAuditLog) — ส่วนกลาง (GLOBAL_ADMIN) และผู้ดูแลระบบ (IT_SUPPORT) เห็นได้ทั้งหมด
 * ทุกพื้นที่ ส่วนพัฒนาการจังหวัด/อำเภอ/พัฒนากรตำบล เห็นได้เฉพาะเหตุการณ์ในพื้นที่ที่ตนรับผิดชอบ (ดู
 * getAllowedVillageIds ใน lib/scope.ts — หน้า Audit Log กรองด้วย villageId ตามขอบเขตนั้น)
 */
export function canViewAuditLog(user: Pick<CurrentUser, "role">): boolean {
  return (
    user.role === "GLOBAL_ADMIN" ||
    user.role === "IT_SUPPORT" ||
    user.role === "PROVINCIAL_ADMIN" ||
    user.role === "DISTRICT_ADMIN" ||
    user.role === "SUB_DISTRICT_ADMIN"
  );
}

/** ส่วนกลาง/IT_SUPPORT เห็นได้ทั้งระบบไม่จำกัดพื้นที่ (villageId ไม่ถูกกรอง) — role อื่นเห็นเฉพาะพื้นที่ตนเอง */
export function auditLogSeesAllAreas(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "GLOBAL_ADMIN" || user.role === "IT_SUPPORT";
}

/** จำนวนรายการ Audit Log สูงสุดที่มองเห็น/เปิดหน้าย้อนหลังได้ตาม role (ป้องกัน query หนักเกินไปเมื่อข้อมูลมาก) */
export function auditLogRowCap(user: Pick<CurrentUser, "role">): number {
  return auditLogSeesAllAreas(user) ? 250_000 : 25_000;
}

/**
 * Smart Report & Map Center (/reports/smart, /api/search/*): เป็นเครื่องมือสำหรับเจ้าหน้าที่/กรรมการเท่านั้น
 * (ค้นหาครัวเรือนข้ามหมู่บ้านในขอบเขตของตน) — ครัวเรือน (HOUSEHOLD) ต้องไม่มีสิทธิ์เรียกใช้เด็ดขาด เพราะแม้จะ
 * ถูกจำกัดด้วย getAllowedVillageIds ตามพื้นที่ แต่ scope ของ HOUSEHOLD คือ "ทั้งหมู่บ้าน" ไม่ใช่แค่ตนเอง
 * (ต่างจากหน้าทะเบียนครัวเรือน/บัญชีคุมลูกหนี้ปกติที่ตัดกันด้วย householdId เพิ่มอีกชั้น) — เดิม endpoint นี้
 * ตรวจสอบแค่การล็อกอิน ไม่มีการตรวจสอบ role เลย ถือเป็นช่องโหว่ข้อมูลส่วนบุคคลของเพื่อนบ้านในหมู่บ้านเดียวกัน
 * (พบระหว่างตรวจสอบ API Guard ตามคำขอ Data Privacy ฉบับนี้) — IT_SUPPORT ก็ไม่มีสิทธิ์เช่นกัน
 */
export function canUseSmartSearch(user: Pick<CurrentUser, "role">): boolean {
  return user.role !== "HOUSEHOLD" && user.role !== "IT_SUPPORT";
}

export const SMART_SEARCH_DENIED_MESSAGE =
  "Access Denied: เครื่องมือค้นหา/แผนที่ (Smart Report & Map Center) สงวนไว้สำหรับเจ้าหน้าที่และคณะกรรมการหมู่บ้านเท่านั้น";
