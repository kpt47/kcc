import { getMailTransport } from "./transport";

// หัวข้ออีเมล OTP ต้องตรงตามที่กำหนดเป๊ะ — ใช้ในการกู้คืนรหัสผ่านของระบบ กข.คจ.
const OTP_EMAIL_SUBJECT = "รหัส OTP สำหรับตั้งรหัสผ่านใหม่ โครงการ กข.คจ.";

export async function sendOtpEmail(to: string, otp: string) {
  const transport = getMailTransport();
  const text = `รหัส OTP สำหรับตั้งรหัสผ่านใหม่ของท่านคือ: ${otp}\n\nรหัสนี้จะหมดอายุใน 5 นาที กรุณาอย่าเปิดเผยรหัสนี้แก่ผู้อื่น\nหากท่านไม่ได้เป็นผู้ขอตั้งรหัสผ่านใหม่ กรุณาละเว้นอีเมลฉบับนี้`;
  return transport.sendMail({ to, subject: OTP_EMAIL_SUBJECT, text });
}
