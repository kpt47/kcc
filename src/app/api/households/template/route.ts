import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth";
import { ACCESS_DENIED_MESSAGE, canImportHouseholds } from "@/lib/authz";
import { IMPORT_COLUMNS, OCCUPATION_OPTIONS, resolveImportVillageId, TITLE_PREFIX_OPTIONS } from "@/lib/householdImport";

const TEMPLATE_ROWS = 500; // จำนวนแถวสูงสุดที่เตรียม Data Validation แบบ Dropdown ไว้ล่วงหน้าในไฟล์ต้นแบบ

// สร้างไฟล์ Excel ต้นแบบสำหรับนำเข้าบัญชีผู้ใช้งานระดับครัวเรือนเป็นชุดใหญ่ — ผูก villageId ไว้ในตัวไฟล์แล้ว
// (ไม่มีคอลัมน์จังหวัด/อำเภอ/ตำบล/หมู่บ้านให้กรอก เพื่อป้องกันพิมพ์ผิด) พร้อม Dropdown สำหรับคำนำหน้าชื่อ/อาชีพ
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (!canImportHouseholds(user)) {
    return NextResponse.json({ error: { formErrors: [ACCESS_DENIED_MESSAGE] } }, { status: 403 });
  }

  const url = new URL(request.url);
  const requestedVillageId = url.searchParams.get("villageId") ? Number(url.searchParams.get("villageId")) : undefined;
  const villageId = await resolveImportVillageId(user, requestedVillageId);
  if (!villageId) {
    return NextResponse.json({ error: { formErrors: ["ไม่พบหมู่บ้านที่ระบุ หรือหมู่บ้านนี้ไม่อยู่ในเขตอำนาจของคุณ"] } }, { status: 403 });
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("นำเข้าครัวเรือน");
  worksheet.columns = IMPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: 22 }));
  worksheet.getRow(1).font = { bold: true };

  const titlePrefixColIndex = IMPORT_COLUMNS.findIndex((c) => c.key === "titlePrefix") + 1;
  const occupationColIndex = IMPORT_COLUMNS.findIndex((c) => c.key === "occupation") + 1;

  for (let rowNo = 2; rowNo <= TEMPLATE_ROWS + 1; rowNo++) {
    worksheet.getCell(rowNo, titlePrefixColIndex).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${TITLE_PREFIX_OPTIONS.join(",")}"`],
    };
    worksheet.getCell(rowNo, occupationColIndex).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${OCCUPATION_OPTIONS.join(",")}"`],
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="household-import-template-village-${villageId}.xlsx"`,
    },
  });
}
