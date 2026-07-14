// ฟังก์ชัน Export ฝั่ง client สำหรับ Dashboard/รายงาน — ใช้ html2canvas จับภาพ DOM เป็นรูปภาพ
// ความละเอียดสูง (scale: 2) ก่อนแปลงเป็น PNG หรือฝังลง PDF ส่วน Excel ใช้ xlsx แปลงจาก array ของ object ตรงๆ
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

export async function exportElementAsPng(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff" });
  const link = document.createElement("a");
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export async function exportElementAsPdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/png");
  const orientation = canvas.width >= canvas.height ? "l" : "p";
  const pdf = new jsPDF({ orientation, unit: "px", format: [canvas.width, canvas.height] });
  pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(`${filename}.pdf`);
}

export function exportRowsAsExcel(rows: Record<string, unknown>[], filename: string, sheetName = "ข้อมูล"): void {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
