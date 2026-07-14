import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";

// เสิร์ฟไฟล์ที่อัปโหลดขึ้น Netlify Blobs กลับมา (ใช้เฉพาะตอนรันบน Netlify — ดู /api/uploads/route.ts)
// ตัว store เองไม่มี public URL ให้ตรงๆ เหมือน Vercel Blob จึงต้องมี route นี้คอยดึงมาเสิร์ฟเอง
export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const store = getStore("evidence-uploads");
  const result = await store.getWithMetadata(filename, { type: "arrayBuffer" });
  if (!result) return new NextResponse(null, { status: 404 });

  const contentType = (result.metadata?.contentType as string | undefined) ?? "application/octet-stream";
  return new NextResponse(result.data as ArrayBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
