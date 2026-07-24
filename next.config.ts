import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium ต้องไม่ถูก bundle/ย้ายตำแหน่งไฟล์ — มันหา binary Chromium ของตัวเอง (bin/*.br) จาก
  // path สัมพัทธ์กับตำแหน่งของแพ็กเกจใน node_modules ตอนรันจริง ถ้า Next bundle เข้าไปในไฟล์เดียว (Turbopack/
  // Webpack) ตำแหน่งจะเพี้ยน หา "bin" ไม่เจอ (ดู https://github.com/Sparticuz/chromium#bundler-configuration)
  // — พบ error นี้จริงบน Vercel production: "The input directory .../@sparticuz/chromium/bin does not exist"
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // serverExternalPackages อย่างเดียวไม่พอ — Output File Tracing ของ Vercel (ตรวจจับไฟล์ที่ route แต่ละอัน
  // ต้องใช้แบบ static analysis) ตรวจไม่พบว่า bin/*.br ถูกใช้จริง (เพราะ @sparticuz/chromium เปิดไฟล์ด้วย path
  // ที่คำนวณตอนรันจริง ไม่ใช่ string literal ที่ static analysis เห็นได้) จึงต้องบังคับรวมไฟล์เหล่านี้เข้าไปเอง
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
};

export default nextConfig;
