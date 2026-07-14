import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getStore } from "@netlify/blobs";
import { getCurrentUser } from "@/lib/auth";

// อัปโหลดไฟล์หลักฐาน (สลิปโอนเงิน / สมุดบัญชีธนาคาร / เอกสารวาระการประชุม)
// ถ้าตั้งค่า BLOB_READ_WRITE_TOKEN ไว้ (เช่น บน Vercel ที่เปิดใช้ Blob Storage) จะอัปโหลดขึ้น Vercel Blob
// ถ้ารันบน Netlify จะอัปโหลดขึ้น Netlify Blobs แทน (ดู /api/uploads/file/[filename] สำหรับเสิร์ฟไฟล์กลับ)
// ถ้าไม่ได้ตั้งค่าอะไรเลย (dev/self-hosted VPS/Render ที่ยังไม่มี Cloud Storage) จะ fallback ไปเก็บไว้ในเครื่องที่ public/uploads แทน
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf", // ใช้กับเอกสารวาระการประชุม (Meeting Records) นอกเหนือจากรูปภาพหลักฐานเดิม
};
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB — ขยับขึ้นจาก 5MB เดิมเพื่อรองรับไฟล์ PDF รายงานการประชุมที่มักมีหลายหน้า

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: { formErrors: ["กรุณาแนบไฟล์รูปภาพ"] } }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: { formErrors: ["รองรับเฉพาะไฟล์รูปภาพ JPEG, PNG, WebP หรือไฟล์ PDF เท่านั้น"] } },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: { formErrors: ["ขนาดไฟล์ต้องไม่เกิน 10MB"] } }, { status: 400 });
  }

  const filename = `${randomUUID()}.${extension}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${filename}`, file, { access: "public" });
    return NextResponse.json({ url: blob.url }, { status: 201 });
  }

  if (process.env.NETLIFY) {
    // ใช้ getStore (site-scoped, อยู่ถาวรข้าม deploy) ไม่ใช่ getDeployStore (ผูกกับแต่ละ deploy ถูกล้างทิ้งได้)
    // ส่ง File ตรงๆ (เป็น Blob อยู่แล้ว) แทนการแปลงเป็น Buffer เพื่อให้ตรงกับ BlobInput ที่ store.set ต้องการ
    const store = getStore("evidence-uploads");
    await store.set(filename, file, { metadata: { contentType: file.type } });
    return NextResponse.json({ url: `/api/uploads/file/${filename}` }, { status: 201 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
}
