// นำเข้าฐานข้อมูลจังหวัด/อำเภอ/ตำบล ทางการของประเทศไทย (77 จังหวัด/928 อำเภอ/7,436 ตำบล) จากไฟล์
// prisma/data/MasterAddressThailand.xlsx (ชีต "MasterAddress" — มีรหัสจังหวัด/อำเภอ/ตำบล + Location Code
// ตามมาตรฐานราชการ) เข้าสู่ตาราง Province/District/SubDistrict — รันครั้งเดียว (idempotent ผ่านการเช็ค
// รายการที่มีอยู่แล้วก่อน create จึงรันซ้ำได้อย่างปลอดภัย เผื่อไฟล์ต้นฉบับอัปเดตในอนาคต)
//
// โครงสร้างไฟล์เป็นแบบลำดับชั้น (ไม่ใช่ตารางแบนราบ): แต่ละแถวเป็นได้ 1 ใน 3 แบบ แยกตามว่าคอลัมน์รหัสไหนมีค่า
//   - แถวจังหวัด: รหัสจังหวัด มีค่า (รหัสอำเภอ/รหัสตำบล เป็น 0) เช่น [10, 0, 0, 100000, "กรุงเทพมหานคร", ...]
//   - แถวอำเภอ:   รหัสอำเภอ มีค่า, รหัสตำบล เป็น 0                เช่น [null, 1, 0, 100100, "กรุงเทพมหานคร", "พระนคร", ...]
//   - แถวตำบล:    รหัสตำบล มีค่า > 0 (แถวเดียวที่มีชื่อตำบลด้วย)   เช่น [null, null, 1, 100101, "กรุงเทพมหานคร", "พระนคร", "พระบรมมหาราชวัง"]
// ใช้แถว "ตำบล" เป็นหลักในการไล่สร้างจังหวัด/อำเภอ/ตำบลทั้งหมด เพราะมีชื่อครบทั้ง 3 ระดับในแถวเดียว
//
// หมายเหตุ: ข้อมูลนี้เป็นคนละแหล่งจาก prisma/importThaiAddress.mjs (แพ็กเกจ thai-address-database) ซึ่งมี
// จำนวนต่างกันเล็กน้อย (927/7,420) รันสคริปต์นี้ทับได้อย่างปลอดภัย ไม่ซ้ำซ้อนกัน เพราะ upsert ด้วยชื่อ+ลำดับชั้น
// เดียวกันเสมอ — จังหวัดที่นำเข้าใหม่ทั้งหมดจะถูกจัดไว้ใต้ภาค "ไม่ระบุภาค" ชั่วคราวเหมือน lib/geo.ts
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const XLSX_PATH = path.join(__dirname, "data", "MasterAddressThailand.xlsx");

function readSubDistrictRows() {
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets["MasterAddress"];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }).slice(1);

  const subDistrictRows = [];
  for (const r of rows) {
    const [provinceCode, districtCode, subDistrictCode, , province, district, subDistrict] = r;
    // เอาเฉพาะแถว "ตำบล" (รหัสตำบล > 0) — มีชื่อจังหวัด/อำเภอ/ตำบลครบทั้ง 3 ระดับในแถวเดียว
    if (provinceCode == null && districtCode == null && subDistrictCode) {
      subDistrictRows.push({ province, district, subDistrict });
    }
  }
  return subDistrictRows;
}

async function main() {
  const rows = readSubDistrictRows();
  console.log(`อ่านข้อมูลจาก ${path.basename(XLSX_PATH)} ได้ ${rows.length} ตำบล`);

  const defaultRegion = await prisma.region.upsert({
    where: { name: "ไม่ระบุภาค" },
    create: { name: "ไม่ระบุภาค" },
    update: {},
  });

  const provinceNames = [...new Set(rows.map((r) => r.province))];
  const existingProvinces = await prisma.province.findMany({ where: { name: { in: provinceNames } } });
  const existingProvinceNames = new Set(existingProvinces.map((p) => p.name));
  const newProvinceNames = provinceNames.filter((name) => !existingProvinceNames.has(name));
  if (newProvinceNames.length > 0) {
    await prisma.province.createMany({ data: newProvinceNames.map((name) => ({ name, regionId: defaultRegion.id })) });
  }
  const provinces = await prisma.province.findMany({ where: { name: { in: provinceNames } } });
  const provinceIdByName = new Map(provinces.map((p) => [p.name, p.id]));
  console.log(`จังหวัด: ${provinces.length} รายการ`);

  const districtKeySet = new Map();
  for (const r of rows) {
    const provinceId = provinceIdByName.get(r.province);
    districtKeySet.set(`${provinceId}|${r.district}`, { name: r.district, provinceId });
  }
  const districtEntries = [...districtKeySet.values()];
  const existingDistricts = await prisma.district.findMany({ where: { provinceId: { in: [...provinceIdByName.values()] } } });
  const existingDistrictKeys = new Set(existingDistricts.map((d) => `${d.provinceId}|${d.name}`));
  const newDistrictEntries = districtEntries.filter((e) => !existingDistrictKeys.has(`${e.provinceId}|${e.name}`));
  if (newDistrictEntries.length > 0) {
    await prisma.district.createMany({ data: newDistrictEntries });
  }
  const districts = await prisma.district.findMany({ where: { provinceId: { in: [...provinceIdByName.values()] } } });
  const districtIdByKey = new Map(districts.map((d) => [`${d.provinceId}|${d.name}`, d.id]));
  console.log(`อำเภอ: ${districts.length} รายการ`);

  const subDistrictKeySet = new Map();
  for (const r of rows) {
    const provinceId = provinceIdByName.get(r.province);
    const districtId = districtIdByKey.get(`${provinceId}|${r.district}`);
    subDistrictKeySet.set(`${districtId}|${r.subDistrict}`, { name: r.subDistrict, districtId });
  }
  const subDistrictEntries = [...subDistrictKeySet.values()];
  const existingSubDistricts = await prisma.subDistrict.findMany({ where: { districtId: { in: [...districtIdByKey.values()] } } });
  const existingSubDistrictKeys = new Set(existingSubDistricts.map((s) => `${s.districtId}|${s.name}`));
  const newSubDistrictEntries = subDistrictEntries.filter((e) => !existingSubDistrictKeys.has(`${e.districtId}|${e.name}`));
  if (newSubDistrictEntries.length > 0) {
    await prisma.subDistrict.createMany({ data: newSubDistrictEntries });
  }
  const subDistrictCount = await prisma.subDistrict.count({ where: { districtId: { in: [...districtIdByKey.values()] } } });
  console.log(`ตำบล: ${subDistrictCount} รายการ`);

  console.log("นำเข้าฐานข้อมูล MasterAddress Thailand สำเร็จ");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
