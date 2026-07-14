import type { Browser } from "puppeteer-core";

// ใช้ Browser instance เดียวตลอดอายุของ process แทนการเปิด/ปิดใหม่ทุกครั้ง เพื่อลดเวลาเริ่มต้น Chromium
// บน Vercel/Render/Netlify (ล้วนเป็น container ที่ควบคุม system library เองไม่ได้ — Render ไม่มี apt-get
// ให้ติดตั้ง lib ที่ Chromium เต็มรูปแบบต้องใช้ และแคชที่ดาวน์โหลดไว้ตอน build ก็ไม่ถูกพกไปตอนรันจริง,
// Netlify Functions เป็น AWS Lambda เหมือน Vercel) ใช้ puppeteer-core + @sparticuz/chromium
// (Chromium ฉบับย่อขนาด ฝังไว้ใน node_modules ไม่พึ่ง system lib ภายนอก) แทนแพ็กเกจ puppeteer เต็มรูปแบบ
// นอกเหนือจากนั้น (dev ในเครื่อง / self-hosted VPS ตาม DEPLOY.md) ยังคงใช้ puppeteer เต็มรูปแบบตามเดิม
// เพราะติดตั้งง่ายกว่า ไม่ต้องหา executablePath เอง — ต้องตั้งค่า PUPPETEER_SKIP_DOWNLOAD=1 บน Vercel/
// Render/Netlify เพื่อไม่ให้ puppeteer โหลด Chromium เต็มมาโดยไม่จำเป็น (ดู DEPLOY_VERCEL.md)
const globalForPuppeteer = globalThis as unknown as {
  puppeteerBrowser: Promise<Browser> | undefined;
};

async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL || process.env.RENDER || process.env.NETLIFY) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = (await import("puppeteer-core")).default;
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const puppeteer = (await import("puppeteer")).default;
  return puppeteer.launch({ headless: true }) as unknown as Promise<Browser>;
}

export function getBrowser(): Promise<Browser> {
  if (!globalForPuppeteer.puppeteerBrowser) {
    globalForPuppeteer.puppeteerBrowser = launchBrowser();
  }
  return globalForPuppeteer.puppeteerBrowser;
}
