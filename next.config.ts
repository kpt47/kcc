import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium ต้องไม่ถูก bundle/ย้ายตำแหน่งไฟล์ — มันหา binary Chromium ของตัวเอง (bin/*.br) จาก
  // path สัมพัทธ์กับตำแหน่งของแพ็กเกจใน node_modules ตอนรันจริง ถ้า Next bundle เข้าไปในไฟล์เดียว (Turbopack/
  // Webpack) ตำแหน่งจะเพี้ยน หา "bin" ไม่เจอ (ดู https://github.com/Sparticuz/chromium#bundler-configuration)
  // — พบ error นี้จริงบน Vercel production: "The input directory .../@sparticuz/chromium/bin does not exist"
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default nextConfig;
