// นำเข้าฐานข้อมูลจังหวัด/อำเภอ/ตำบล ทางการของประเทศไทย (77 จังหวัด/928 อำเภอ/7,436 ตำบล) จากไฟล์
// prisma/data/MasterAddressThailand.xlsx (ชีต "MasterAddress" — มีรหัสจังหวัด/อำเภอ/ตำบล + Location Code
// ตามมาตรฐานราชการ) เข้าสู่ตาราง Province/District/SubDistrict
//
// ใช้ Location Code (ไม่ใช่ชื่อ) เป็นกุญแจเชื่อมโยงหลักในการ upsert — ต่างจากรอบก่อนที่จับคู่ด้วยชื่อ
// (เสี่ยงสร้างข้อมูลซ้ำถ้าไฟล์ต้นฉบับอัปเดตแล้วชื่อทางการเปลี่ยน/สะกดใหม่ในอนาคต) โดยเก็บ code แบบสะสม
// (prefix) ที่แต่ละระดับ ให้ unique ได้อิสระโดยไม่ต้อง compound key:
//   Province.code = 2 หลัก (เช่น "10"), District.code = 4 หลัก (จังหวัด+อำเภอ เช่น "1001"),
//   SubDistrict.code = 6 หลักเต็ม (= Location Code เช่น "100101")
//
// ลำดับการจับคู่แถวเดิมในแต่ละระดับ (ทำแบบ bulk ไม่ query ทีละแถว เพื่อความเร็ว — ตำบลมีถึง 7,436 แถว):
//   (1) ดึงแถวที่มีอยู่แล้วทั้งหมดมาครั้งเดียว สร้าง map ด้วย code และด้วย (parentId, name)
//   (2) ถ้าเจอด้วย code แล้ว = ไม่ต้องทำอะไร (import ซ้ำแล้ว)
//   (3) ถ้าเจอด้วยชื่อ+parent แต่ยังไม่มี code (แถวจาก import รอบก่อนที่จับคู่ด้วยชื่อ) = backfill code เข้าไป
//   (4) ถ้าไม่เจอทั้งคู่ = สร้างแถวใหม่ด้วย createMany
// ทำให้ import ซ้ำได้ปลอดภัยเสมอ แม้ไฟล์ต้นฉบับจะอัปเดตชื่อในอนาคต เพราะครั้งต่อไปจะจับคู่ด้วย code ได้ทันที
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
const UPDATE_CONCURRENCY = 25; // จำกัดจำนวน update พร้อมกัน กันยิง connection ไป Neon มากเกินไปทีเดียว

function pad2(n) {
  return String(n).padStart(2, "0");
}

function readSubDistrictRows() {
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets["MasterAddress"];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }).slice(1);

  const subDistrictRows = [];
  for (const r of rows) {
    const [provinceCode, districtCode, subDistrictCode, locationCode, province, district, subDistrict] = r;
    // เอาเฉพาะแถว "ตำบล" (รหัสตำบล > 0) — มีชื่อจังหวัด/อำเภอ/ตำบลครบทั้ง 3 ระดับในแถวเดียว
    if (provinceCode == null && districtCode == null && subDistrictCode) {
      const pCode = pad2(Math.floor(locationCode / 10000));
      const dCode = pCode + pad2(Math.floor(locationCode / 100) % 100);
      const sCode = dCode + pad2(locationCode % 100);
      subDistrictRows.push({ province, district, subDistrict, provinceCode: pCode, districtCode: dCode, subDistrictCode: sCode });
    }
  }
  return subDistrictRows;
}

async function runWithConcurrency(items, limit, task) {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor++];
      await task(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/**
 * ประมวลผลระดับเดียว (province/district/subDistrict) แบบ bulk: รับ entries ที่ต้องการ (code/name/parent key)
 * + แถวที่มีอยู่แล้วทั้งหมดในขอบเขตที่เกี่ยวข้อง แยกเป็น "มีอยู่แล้ว (ข้าม)" / "backfill code" / "สร้างใหม่"
 */
async function syncLevel({ model, entries, existingRows, parentField, buildCreateData }) {
  const byCode = new Map(existingRows.filter((r) => r.code).map((r) => [r.code, r]));
  const byNameParent = new Map(existingRows.map((r) => [`${r[parentField] ?? ""}|${r.name}`, r]));

  const toUpdate = [];
  const toCreate = [];
  const idByCode = new Map();

  for (const e of entries) {
    const existingByCode = byCode.get(e.code);
    if (existingByCode) {
      idByCode.set(e.code, existingByCode.id);
      continue;
    }
    const key = `${e[parentField] ?? ""}|${e.name}`;
    const existingByName = byNameParent.get(key);
    if (existingByName) {
      toUpdate.push({ id: existingByName.id, code: e.code });
      idByCode.set(e.code, existingByName.id);
      continue;
    }
    toCreate.push(e);
  }

  await runWithConcurrency(toUpdate, UPDATE_CONCURRENCY, (u) => model.update({ where: { id: u.id }, data: { code: u.code } }));

  if (toCreate.length > 0) {
    await model.createMany({ data: toCreate.map(buildCreateData) });
    const created = await model.findMany({ where: { code: { in: toCreate.map((e) => e.code) } } });
    for (const row of created) idByCode.set(row.code, row.id);
  }

  console.log(`  ข้าม (มีอยู่แล้ว): ${entries.length - toUpdate.length - toCreate.length}, backfill code: ${toUpdate.length}, สร้างใหม่: ${toCreate.length}`);
  return idByCode;
}

async function main() {
  const rows = readSubDistrictRows();
  console.log(`อ่านข้อมูลจาก ${path.basename(XLSX_PATH)} ได้ ${rows.length} ตำบล`);

  const defaultRegion = await prisma.region.upsert({
    where: { name: "ไม่ระบุภาค" },
    create: { name: "ไม่ระบุภาค" },
    update: {},
  });

  const provinceEntries = [...new Map(rows.map((r) => [r.provinceCode, { name: r.province, code: r.provinceCode }])).values()];
  const districtEntries = [
    ...new Map(rows.map((r) => [r.districtCode, { name: r.district, code: r.districtCode, provinceCode: r.provinceCode }])).values(),
  ];
  const subDistrictEntries = [
    ...new Map(rows.map((r) => [r.subDistrictCode, { name: r.subDistrict, code: r.subDistrictCode, districtCode: r.districtCode }])).values(),
  ];

  console.log("จังหวัด:");
  const existingProvinces = await prisma.province.findMany({ select: { id: true, name: true, code: true } });
  const provinceIdByCode = await syncLevel({
    model: prisma.province,
    entries: provinceEntries,
    existingRows: existingProvinces.map((p) => ({ ...p, parent: null })),
    parentField: "parent",
    buildCreateData: (e) => ({ name: e.name, code: e.code, regionId: defaultRegion.id }),
  });

  console.log("อำเภอ:");
  const existingDistricts = await prisma.district.findMany({ select: { id: true, name: true, code: true, provinceId: true } });
  const districtEntriesWithParentId = districtEntries.map((e) => ({ ...e, parent: provinceIdByCode.get(e.provinceCode) }));
  const districtIdByCode = await syncLevel({
    model: prisma.district,
    entries: districtEntriesWithParentId,
    existingRows: existingDistricts.map((d) => ({ ...d, parent: d.provinceId })),
    parentField: "parent",
    buildCreateData: (e) => ({ name: e.name, code: e.code, provinceId: e.parent }),
  });

  console.log("ตำบล:");
  const existingSubDistricts = await prisma.subDistrict.findMany({ select: { id: true, name: true, code: true, districtId: true } });
  const subDistrictEntriesWithParentId = subDistrictEntries.map((e) => ({ ...e, parent: districtIdByCode.get(e.districtCode) }));
  await syncLevel({
    model: prisma.subDistrict,
    entries: subDistrictEntriesWithParentId,
    existingRows: existingSubDistricts.map((s) => ({ ...s, parent: s.districtId })),
    parentField: "parent",
    buildCreateData: (e) => ({ name: e.name, code: e.code, districtId: e.parent }),
  });

  const [provinceCount, districtCount, subDistrictCount] = await Promise.all([
    prisma.province.count({ where: { code: { not: null } } }),
    prisma.district.count({ where: { code: { not: null } } }),
    prisma.subDistrict.count({ where: { code: { not: null } } }),
  ]);
  console.log(`สรุป: จังหวัดมี code ${provinceCount} รายการ, อำเภอมี code ${districtCount} รายการ, ตำบลมี code ${subDistrictCount} รายการ`);
  console.log("นำเข้าฐานข้อมูล MasterAddress Thailand สำเร็จ (เชื่อมโยงด้วย Location Code)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
