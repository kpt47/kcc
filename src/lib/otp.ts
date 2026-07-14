import bcrypt from "bcryptjs";

// รหัส OTP 6 หลัก สำหรับตั้งรหัสผ่านใหม่ผ่านอีเมล — เก็บเป็น hash เท่านั้น (ไม่เก็บรหัสจริงลงฐานข้อมูล)
// ใช้ bcrypt เช่นเดียวกับรหัสผ่าน (ดู lib/auth.ts hashPassword/verifyPassword)
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}
