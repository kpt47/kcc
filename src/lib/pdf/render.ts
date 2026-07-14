import { getBrowser } from "./browser";
import type { PaperFormat } from "puppeteer-core";

export async function renderPdf(
  html: string,
  options?: { format?: PaperFormat; landscape?: boolean }
): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluateHandle("document.fonts.ready");
    const pdf = await page.pdf({
      format: options?.format ?? "A4",
      landscape: options?.landscape ?? false,
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
