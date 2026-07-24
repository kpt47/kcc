// ตัวเลือกจำนวนวันล่วงหน้าที่ครัวเรือนสามารถตั้งค่าเองได้ สำหรับการแจ้งเตือนก่อนครบกำหนดชำระเงินยืม
// ใช้ร่วมกันทั้งฝั่ง validation (src/lib/schemas.ts), UI (ReminderSettingsForm.tsx), และ cron
// (src/lib/notifications/repayment-check.ts) เพื่อไม่ให้ค่าที่อนุญาตเพี้ยนกันระหว่างจุดต่างๆ
export const REMINDER_LEAD_DAY_OPTIONS = [1, 3, 7, 14, 30] as const;
export const DEFAULT_REMINDER_LEAD_DAYS = 7;
export const MAX_REMINDER_LEAD_DAYS = Math.max(...REMINDER_LEAD_DAY_OPTIONS);

export const REMINDER_LEAD_DAY_LABELS: Record<number, string> = {
  1: "1 วันก่อนครบกำหนด",
  3: "3 วันก่อนครบกำหนด",
  7: "1 สัปดาห์ก่อนครบกำหนด",
  14: "2 สัปดาห์ก่อนครบกำหนด",
  30: "1 เดือนก่อนครบกำหนด",
};
