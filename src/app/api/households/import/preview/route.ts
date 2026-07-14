import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ACCESS_DENIED_MESSAGE, canImportHouseholds } from "@/lib/authz";
import { parseWorkbookRows, resolveImportVillageId, validateImportRows, type ImportRowInput } from "@/lib/householdImport";

// ตรวจสอบข้อมูลนำเข้าแบบ Dry-run — ยังไม่บันทึกลงฐานข้อมูล รับได้ทั้งไฟล์ Excel ที่เพิ่งอัปโหลด (multipart/form-data)
// และรายการแถวที่แก้ไขแล้วจากตาราง Inline Editing ฝั่งหน้าเว็บ (JSON) เพื่อให้กด "ตรวจสอบอีกครั้ง" ได้โดยไม่ต้องอัปโหลดไฟล์ใหม่
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (!canImportHouseholds(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let requestedVillageId: number | undefined;
  let rows: ImportRowInput[];

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    const villageIdRaw = formData?.get("villageId");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: { formErrors: ["กรุณาแนบไฟล์ Excel (.xlsx)"] } }, { status: 400 });
    }
    requestedVillageId = villageIdRaw ? Number(villageIdRaw) : undefined;
    const buffer = await file.arrayBuffer();
    rows = await parseWorkbookRows(buffer);
  } else {
    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.rows)) {
      return NextResponse.json({ error: { formErrors: ["ข้อมูลที่ส่งมาไม่ถูกต้อง"] } }, { status: 400 });
    }
    requestedVillageId = body.villageId ? Number(body.villageId) : undefined;
    rows = body.rows;
  }

  const villageId = await resolveImportVillageId(user, requestedVillageId);
  if (!villageId) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบหมู่บ้านที่ระบุ หรือหมู่บ้านนี้ไม่อยู่ในเขตอำนาจของคุณ"] } }, { status: 403 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบข้อมูลในไฟล์ที่อัปโหลด"] } }, { status: 400 });
  }

  const result = await validateImportRows(rows, villageId);
  return NextResponse.json({ villageId, ...result });
}
