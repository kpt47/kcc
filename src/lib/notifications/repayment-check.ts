// Logic หลักของงานตรวจสอบการชำระเงินยืมประจำวัน (รันโดย cron ทุกวัน 08:00 น. — ดู src/instrumentation.ts)
// อ้างอิงตาราง Loan (บัญชีคุมลูกหนี้ เล่มเหลือง) เพื่อหาค่างวดที่ใกล้ครบกำหนดและเลยกำหนดชำระ
import { prisma } from "@/lib/prisma";
import { notifyHousehold } from "./channels";
import { notifyUsers } from "./notifyUsers";
import { recalculateLoanRiskStatuses } from "@/lib/risk";

const ONE_MONTH_REMINDER_DAYS = 30;
const ONE_WEEK_REMINDER_DAYS = 7;

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
};

/**
 * งานตรวจสอบการชำระเงินยืมประจำวัน — ทำ 5 อย่าง:
 * 1. ครัวเรือน: แจ้งเตือนผ่านกระดิ่ง (Notification) + SMS/LINE (mock) ล่วงหน้า 2 ช่วงก่อนครบกำหนดชำระ
 *    คือ ก่อน 1 เดือน และก่อน 1 สัปดาห์ (แจ้งเฉพาะวันที่ตรงกับกำหนดพอดี ไม่แจ้งซ้ำทุกวัน)
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

// 1. ครัวเรือน — เตือนล่วงหน้าเงินยืมที่ใกล้ครบกำหนดชำระ 2 ช่วง (ยังไม่ปิดสัญญา): ก่อนครบกำหนด 1 เดือน
// และก่อนครบกำหนด 1 สัปดาห์ พอดี (เทียบเป็นวัน ไม่ใช่ช่วงกว้าง กันแจ้งซ้ำทุกวันตลอดเดือน) — แจ้งทั้งผ่าน
// กระดิ่ง (Notification, ใช้ notifyUsers แทน notifyHousehold ตรงๆ เพื่อให้เห็นในระบบด้วย ไม่ใช่แค่ SMS/LINE)
// และผูกกับครัวเรือนเจ้าของเงินยืมโดยตรง (householdId) ไม่ใช่ผู้ใช้ทุกคนในหมู่บ้านเดียวกัน
async function sendHouseholdReminders(today: Date): Promise<number> {
  const oneMonthMark = addDays(today, ONE_MONTH_REMINDER_DAYS);
  const oneWeekMark = addDays(today, ONE_WEEK_REMINDER_DAYS);

  // ขอบเขตบนของ query ต้องเผื่อทั้งวันของ oneMonthMark (ไม่ใช่แค่เวลา 00:00 พอดี) เพราะ dueDate ของ loan
  // จริงอาจมีเวลาในวันนั้นที่ไม่ใช่เที่ยงคืน — ใช้ isSameDay ด้านล่างเป็นตัวตัดสินที่แม่นยำแทน
  const queryUpperBound = addDays(oneMonthMark, 1);
  const upcomingLoans = await prisma.loan.findMany({
    where: { isClosed: false, dueDate: { gte: today, lt: queryUpperBound } },
    include: { household: true },
  });

  let sentCount = 0;
  for (const loan of upcomingLoans) {
    if (!loan.dueDate) continue;
    const isOneWeekMark = isSameDay(loan.dueDate, oneWeekMark);
    const isOneMonthMark = isSameDay(loan.dueDate, oneMonthMark);
    if (!isOneWeekMark && !isOneMonthMark) continue;

    const periodLabel = isOneWeekMark ? "อีก 1 สัปดาห์" : "อีก 1 เดือน";
    const message =
      `แจ้งเตือน: เงินยืมของท่านใกล้ครบกำหนดชำระใน${periodLabel} (วันที่ ${loan.dueDate.toLocaleDateString("th-TH")}) ` +
      `ยอดคงเหลือ ${loan.outstandingBalance.toLocaleString("th-TH")} บาท กรุณาเตรียมชำระให้ตรงเวลา`;

    const householdUsers = await prisma.user.findMany({
      where: { role: "HOUSEHOLD", householdId: loan.householdId },
    });
    await notifyUsers(
      householdUsers.map((u) => u.id),
      message,
      "REMINDER"
    );
    sentCount += householdUsers.length;
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
