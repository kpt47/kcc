// Logic หลักของงานตรวจสอบการชำระเงินยืมประจำวัน (รันโดย cron ทุกวัน 08:00 น. — ดู src/instrumentation.ts)
// อ้างอิงตาราง Loan (บัญชีคุมลูกหนี้ เล่มเหลือง) เพื่อหาค่างวดที่ใกล้ครบกำหนดและเลยกำหนดชำระ
import { prisma } from "@/lib/prisma";
import { notifyHousehold } from "./channels";
import { recalculateLoanRiskStatuses } from "@/lib/risk";

const REMINDER_WINDOW_DAYS = 7;

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
};

/**
 * งานตรวจสอบการชำระเงินยืมประจำวัน — ทำ 5 อย่าง:
 * 1. ครัวเรือน: ส่ง SMS/LINE (mock) แจ้งยอดและวันครบกำหนด สำหรับเงินยืมที่ครบกำหนดในอีก 7 วัน
 * 2. กรรมการหมู่บ้าน (SECRETARY, FINANCE_MEMBER): ถ้าวันนี้เป็นวันที่ 1 ของเดือน สรุปยอดที่ต้องชำระเดือนนี้ต่อหมู่บ้าน
 * 3. พัฒนากร (SUB_DISTRICT_ADMIN): แจ้งรายชื่อครัวเรือนที่เลยกำหนดชำระ แยกตามตำบล
 * 4. ครัวเรือนที่ค้างชำระเอง: ส่ง LINE แจ้งเตือนให้มาชำระคืนเงินยืมโดยตรง (แยกจากข้อ 3 ที่แจ้งเฉพาะพัฒนากร)
 * 5. ประเมินความเสี่ยง/จัดลำดับเครดิต: คำนวณ riskStatus ของเงินยืมทุกก้อนที่ยังไม่ปิดสัญญาใหม่ (ดู src/lib/risk.ts)
 */
export async function runDailyRepaymentCheck(now: Date = new Date()): Promise<RepaymentCheckSummary> {
  const today = startOfDay(now);
  const reminderDeadline = addDays(today, REMINDER_WINDOW_DAYS);
  const isFirstOfMonth = now.getDate() === 1;

  const householdRemindersSent = await sendHouseholdReminders(today, reminderDeadline);
  const committeeSummaryNotifications = isFirstOfMonth ? await sendCommitteeMonthlySummary(now) : 0;
  const { officerNotifications: officerOverdueNotifications, householdNotifications: householdOverdueNotifications } =
    await sendOfficerOverdueAlerts(today);
  const loanRiskStatusesUpdated = await recalculateLoanRiskStatuses(now);

  return {
    runAt: now.toISOString(),
    householdRemindersSent,
    committeeSummaryNotifications,
    officerOverdueNotifications,
    householdOverdueNotifications,
    isFirstOfMonth,
    loanRiskStatusesUpdated,
  };
}

// 1. ครัวเรือน — เงินยืมที่ใกล้ครบกำหนดชำระในอีก 7 วัน (ยังไม่ปิดสัญญา)
async function sendHouseholdReminders(today: Date, reminderDeadline: Date): Promise<number> {
  const dueSoonLoans = await prisma.loan.findMany({
    where: { isClosed: false, dueDate: { gte: today, lte: reminderDeadline } },
    include: { household: { include: { village: true } } },
  });

  let sentCount = 0;
  for (const loan of dueSoonLoans) {
    const villageId = loan.household.villageId;
    const householdUsers = await prisma.user.findMany({
      where: { role: "HOUSEHOLD", scopeVillageId: villageId },
    });

    const message =
      `แจ้งเตือน: ครัวเรือน ${loan.household.headFirstName} ${loan.household.headLastName} ` +
      `มียอดเงินยืมค้างชำระ ${loan.outstandingBalance.toLocaleString("th-TH")} บาท ` +
      `ครบกำหนดชำระวันที่ ${loan.dueDate?.toLocaleDateString("th-TH") ?? "-"} กรุณาเตรียมชำระให้ตรงเวลา`;

    for (const user of householdUsers) {
      await notifyHousehold(user, message);
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
      `(ครบกำหนดวันที่ ${loan.dueDate?.toLocaleDateString("th-TH") ?? "-"}) กรุณาติดต่อชำระคืนเงินยืมโดยเร็ว`;
    for (const user of householdUsers) {
      await notifyHousehold(user, message);
      householdNotifications += 1;
    }
  }

  return { officerNotifications, householdNotifications };
}
