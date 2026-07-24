// Logic หลักของงานตรวจสอบการชำระเงินยืมประจำวัน (รันโดย cron ทุกวัน 08:00 น. — ดู src/instrumentation.ts)
// อ้างอิงตาราง Loan (บัญชีคุมลูกหนี้ เล่มเหลือง) เพื่อหาค่างวดที่ใกล้ครบกำหนดและเลยกำหนดชำระ
import { prisma } from "@/lib/prisma";
import { notifyHousehold } from "./channels";
import { notifyUsers } from "./notifyUsers";
import { recalculateLoanRiskStatuses } from "@/lib/risk";
import { DEFAULT_REMINDER_LEAD_DAYS, MAX_REMINDER_LEAD_DAYS } from "@/lib/reminderSettings";
import { formatThaiDate } from "@/lib/formatDate";
import { deleteExpiredAuditLogs } from "@/lib/auditLog";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export type RepaymentCheckSummary = {
  runAt: string;
  householdRemindersSent: number;
  committeeSummaryNotifications: number;
  officerOverdueNotifications: number;
  householdOverdueNotifications: number;
  isFirstOfMonth: boolean;
  loanRiskStatusesUpdated: number;
  expiredAuditLogsDeleted: number;
};

/**
 * งานตรวจสอบการชำระเงินยืมประจำวัน — ทำ 5 อย่าง:
 * 1. ครัวเรือน: แจ้งเตือนผ่านกระดิ่ง (Notification) + SMS/LINE (mock) ล่วงหน้าตามจำนวนวันที่แต่ละครัวเรือน
 *    ตั้งค่าเองไว้ที่หน้า "บัญชีของฉัน" (HouseholdProfile.reminderLeadDays, ค่าเริ่มต้น 7 วัน — ดู
 *    src/lib/reminderSettings.ts) แจ้งเฉพาะวันที่ตรงกับกำหนดพอดี ไม่แจ้งซ้ำทุกวัน
 * 2. กรรมการหมู่บ้าน (SECRETARY, FINANCE_MEMBER): ถ้าวันนี้เป็นวันที่ 1 ของเดือน สรุปยอดที่ต้องชำระเดือนนี้ต่อหมู่บ้าน
 * 3. พัฒนากร (SUB_DISTRICT_ADMIN): แจ้งรายชื่อครัวเรือนที่เลยกำหนดชำระ แยกตามตำบล
 * 4. ครัวเรือนที่ค้างชำระเอง: ส่ง LINE แจ้งเตือนให้มาชำระคืนเงินยืมโดยตรง (แยกจากข้อ 3 ที่แจ้งเฉพาะพัฒนากร)
 * 5. ประเมินความเสี่ยง/จัดลำดับเครดิต: คำนวณ riskStatus ของเงินยืมทุกก้อนที่ยังไม่ปิดสัญญาใหม่ (ดู src/lib/risk.ts)
 */
export async function runDailyRepaymentCheck(now: Date = new Date()): Promise<RepaymentCheckSummary> {
  const today = startOfDay(now);
  const isFirstOfMonth = now.getDate() === 1;

  const householdRemindersSent = await sendHouseholdReminders(today);
  const committeeSummaryNotifications = isFirstOfMonth ? await sendCommitteeMonthlySummary(now) : 0;
  const { officerNotifications: officerOverdueNotifications, householdNotifications: householdOverdueNotifications } =
    await sendOfficerOverdueAlerts(today);
  const loanRiskStatusesUpdated = await recalculateLoanRiskStatuses(now);
  const expiredAuditLogsDeleted = await deleteExpiredAuditLogs(now);

  return {
    runAt: now.toISOString(),
    householdRemindersSent,
    committeeSummaryNotifications,
    officerOverdueNotifications,
    householdOverdueNotifications,
    isFirstOfMonth,
    loanRiskStatusesUpdated,
    expiredAuditLogsDeleted,
  };
}

// 1. ครัวเรือน — เตือนล่วงหน้าเงินยืมที่ใกล้ครบกำหนดชำระ (ยังไม่ปิดสัญญา) ตามจำนวนวันที่ผู้ใช้แต่ละคนตั้งค่าไว้เอง
// (HouseholdProfile.reminderLeadDays, ค่าเริ่มต้น 7 วันถ้ายังไม่เคยตั้ง) เทียบเป็นวันพอดี ไม่ใช่ช่วงกว้าง
// กันแจ้งซ้ำทุกวัน — แจ้งผ่านกระดิ่ง (Notification, ใช้ notifyUsers เพื่อให้เห็นในระบบด้วย ไม่ใช่แค่ SMS/LINE)
// เฉพาะผู้ใช้ role HOUSEHOLD ที่ผูกกับครัวเรือนเจ้าของเงินยืมนั้นโดยตรง (ไม่ใช่ผู้ใช้ทุกคนในหมู่บ้านเดียวกัน)
async function sendHouseholdReminders(today: Date): Promise<number> {
  // ขอบเขตบนของ query ต้องเผื่อค่ามากสุดที่เลือกได้ (MAX_REMINDER_LEAD_DAYS) + 1 วัน (ไม่ใช่แค่เวลา 00:00 พอดี
  // เพราะ dueDate ของ loan จริงอาจมีเวลาในวันนั้นที่ไม่ใช่เที่ยงคืน) — ใช้ isSameDay ด้านล่างเป็นตัวตัดสินที่แม่นยำแทน
  const queryUpperBound = addDays(today, MAX_REMINDER_LEAD_DAYS + 1);
  const upcomingLoans = await prisma.loan.findMany({
    where: { isClosed: false, dueDate: { gte: today, lt: queryUpperBound } },
    include: {
      household: {
        include: {
          users: {
            where: { role: "HOUSEHOLD" },
            include: { householdProfile: { select: { reminderLeadDays: true } } },
          },
        },
      },
    },
  });

  let sentCount = 0;
  for (const loan of upcomingLoans) {
    if (!loan.dueDate) continue;
    for (const householdUser of loan.household.users) {
      const leadDays = householdUser.householdProfile?.reminderLeadDays ?? DEFAULT_REMINDER_LEAD_DAYS;
      if (!isSameDay(loan.dueDate, addDays(today, leadDays))) continue;

      const message =
        `แจ้งเตือน: เงินยืมของท่านใกล้ครบกำหนดชำระในอีก ${leadDays} วัน (วันที่ ${formatThaiDate(loan.dueDate)}) ` +
        `ยอดคงเหลือ ${loan.outstandingBalance.toLocaleString("th-TH")} บาท กรุณาเตรียมชำระให้ตรงเวลา`;

      await notifyUsers([householdUser.id], message, "REMINDER");
      sentCount += 1;
    }
  }
  return sentCount;
}

// 2. กรรมการหมู่บ้าน — สรุปยอดที่ต้องชำระในเดือนนี้ (ส่งเฉพาะวันที่ 1 ของเดือน)
async function sendCommitteeMonthlySummary(now: Date): Promise<number> {
  const monthStart = startOfMonth(now);
  const monthEnd = startOfNextMonth(now);

  const loansDueThisMonth = await prisma.loan.findMany({
    where: { isClosed: false, dueDate: { gte: monthStart, lt: monthEnd } },
    include: { household: { select: { villageId: true } } },
  });

  const byVillage = new Map<number, { count: number; total: number }>();
  for (const loan of loansDueThisMonth) {
    const villageId = loan.household.villageId;
    const entry = byVillage.get(villageId) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += loan.outstandingBalance;
    byVillage.set(villageId, entry);
  }

  let notificationCount = 0;
  for (const [villageId, { count, total }] of byVillage) {
    const message =
      `สรุปประจำเดือน: หมู่บ้านนี้มีครัวเรือนต้องชำระเงินยืมเดือนนี้ ${count} ราย ` +
      `รวมเป็นเงิน ${total.toLocaleString("th-TH")} บาท`;

    const recipients = await prisma.user.findMany({
      where: { role: "VILLAGE_COMMITTEE", committeeRole: { in: ["SECRETARY", "FINANCE_MEMBER"] }, scopeVillageId: villageId },
    });
    for (const recipient of recipients) {
      await prisma.notification.create({
        data: { userId: recipient.id, message, type: "REMINDER" },
      });
      notificationCount += 1;
    }
  }
  return notificationCount;
}

// 3-4. พัฒนากร — รายชื่อครัวเรือนที่เลยกำหนดชำระ (overdue) แยกตามตำบล + แจ้งเตือนครัวเรือนที่ค้างชำระเองโดยตรง
async function sendOfficerOverdueAlerts(today: Date): Promise<{ officerNotifications: number; householdNotifications: number }> {
  const overdueLoans = await prisma.loan.findMany({
    where: { isClosed: false, dueDate: { lt: today } },
    include: { household: { include: { village: true } } },
  });

  const grouped = new Map<number, string[]>();
  for (const loan of overdueLoans) {
    const subDistrictId = loan.household.village.subDistrictId;
    const label = `${loan.household.headFirstName} ${loan.household.headLastName} (หมู่ ${loan.household.village.villageNo} บ้าน${loan.household.village.villageName} ค้าง ${loan.outstandingBalance.toLocaleString("th-TH")} บาท)`;
    const list = grouped.get(subDistrictId) ?? [];
    list.push(label);
    grouped.set(subDistrictId, list);
  }

  let officerNotifications = 0;
  for (const [subDistrictId, households] of grouped) {
    const message = `รายชื่อครัวเรือนที่เลยกำหนดชำระหนี้ในตำบลนี้ (${households.length} ราย): ${households.join(", ")}`;

    const recipients = await prisma.user.findMany({
      where: { role: "SUB_DISTRICT_ADMIN", scopeSubDistrictId: subDistrictId },
    });
    for (const recipient of recipients) {
      await prisma.notification.create({
        data: { userId: recipient.id, message, type: "ALERT" },
      });
      officerNotifications += 1;
    }
  }

  // แจ้งเตือนครัวเรือนที่ค้างชำระเองโดยตรงผ่าน SMS/LINE ให้มาชำระคืนเงินยืม (นอกเหนือจากแจ้งพัฒนากรข้างต้น)
  let householdNotifications = 0;
  for (const loan of overdueLoans) {
    const householdUsers = await prisma.user.findMany({ where: { role: "HOUSEHOLD", householdId: loan.householdId } });
    const message =
      `แจ้งเตือน: ท่านมียอดเงินยืมค้างชำระเกินกำหนด ${loan.outstandingBalance.toLocaleString("th-TH")} บาท ` +
      `(ครบกำหนดวันที่ ${formatThaiDate(loan.dueDate)}) กรุณาติดต่อชำระคืนเงินยืมโดยเร็ว`;
    for (const user of householdUsers) {
      await notifyHousehold(user, message);
      householdNotifications += 1;
    }
  }

  return { officerNotifications, householdNotifications };
}
