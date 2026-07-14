import nodemailer, { type Transporter } from "nodemailer";

// สร้าง SMTP Transport สำหรับส่งอีเมลจริง (เช่น Gmail SMTP ฟรี) — อ่านค่าจากตัวแปรแวดล้อม
// หากยังไม่ได้ตั้งค่า SMTP_HOST (โหมดพัฒนา/ทดสอบ) จะใช้ mock transport ที่แค่ log เนื้อหาอีเมลแทน
// เพื่อให้ทดสอบ flow OTP ได้ทั้งหมดโดยไม่ต้องมีบัญชี SMTP จริง (ดูรูปแบบเดียวกับ lib/notifications/channels.ts)
export type MailInput = { to: string; subject: string; text: string };
export type MailResult = { success: boolean; detail: string };

function buildMockTransport(): { sendMail: (input: MailInput) => Promise<MailResult> } {
  return {
    async sendMail(input: MailInput) {
      console.log(`[MOCK EMAIL] -> ${input.to} | หัวข้อ: ${input.subject}\n${input.text}`);
      return { success: true, detail: `ส่งอีเมลไปยัง ${input.to} สำเร็จ (จำลอง)` };
    },
  };
}

function buildRealTransport(transporter: Transporter): { sendMail: (input: MailInput) => Promise<MailResult> } {
  return {
    async sendMail(input: MailInput) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to: input.to,
        subject: input.subject,
        text: input.text,
      });
      return { success: true, detail: `ส่งอีเมลไปยัง ${input.to} สำเร็จ` };
    },
  };
}

export function getMailTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST) {
    console.log("[email] SMTP_HOST ยังไม่ได้ตั้งค่า — ใช้ mock email transport (โหมดพัฒนา/ทดสอบ)");
    return buildMockTransport();
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT ? Number(SMTP_PORT) : 587,
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return buildRealTransport(transporter);
}
