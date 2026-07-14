// นำเข้าฐานข้อมูลจังหวัด/อำเภอ/ตำบล จริงของประเทศไทย (77 จังหวัด/927 อำเภอ/7,420 ตำบล) จากแพ็กเกจ
// thai-address-database (Sellsuki) เข้าสู่ตาราง Province/District/SubDistrict — รันครั้งเดียว (idempotent
// ผ่าน createMany skipDuplicates จึงรันซ้ำได้อย่างปลอดภัย) แยกต่างหากจาก prisma/seed.ts เพราะเป็นข้อมูลอ้างอิง
// ระดับประเทศ ไม่ใช่ข้อมูลจำลองสำหรับทดสอบ — จังหวัดที่นำเข้าใหม่ทั้งหมดจะถูกจัดไว้ใต้ภาค "ไม่ระบุภาค" ชั่วคราว
// (ผู้ดูแลระบบ (GLOBAL_ADMIN) ย้ายไปภาคที่ถูกต้องภายหลังได้ผ่านหน้า Master Data) เช่นเดียวกับ lib/geo.ts
import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { searchAddressByProvince } from "thai-address-database";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const records = searchAddressByProvince(".", 999999);
  console.log(`อ่านข้อมูลจาก thai-address-database ได้ ${records.length} รายการ`);

  const defaultRegion = await prisma.region.upsert({
    where: { name: "ไม่ระบุภาค" },
    create: { name: "ไม่ระบุภาค" },
    update: {},
  });

  // SQLite ไม่รองรับ skipDuplicates ใน createMany จึงต้องกรองรายการที่มีอยู่แล้วออกก่อนด้วยตนเอง
  // (ทำให้สคริปต์นี้ยังคง idempotent เช่นเดิม — รันซ้ำได้โดยไม่สร้างข้อมูลซ้ำ)
  const provinceNames = [...new Set(records.map((r) => r.province))];
  const existingProvinces = await prisma.province.findMany({ where: { name: { in: provinceNames } } });
  const existingProvinceNames = new Set(existingProvinces.map((p) => p.name));
  const newProvinceNames = provinceNames.filter((name) => !existingProvinceNames.has(name));
  if (newProvinceNames.length > 0) {
    await prisma.province.createMany({
      data: newProvinceNames.map((name) => ({ name, regionId: defaultRegion.id })),
    });
  }
  const provinces = await prisma.province.findMany({ where: { name: { in: provinceNames } } });
  const provinceIdByName = new Map(provinces.map((p) => [p.name, p.id]));
  console.log(`จังหวัด: ${provinces.length} รายการ`);

  const districtKeySet = new Map();
  for (const r of records) {
    districtKeySet.set(`${r.province}|${r.amphoe}`, { name: r.amphoe, provinceId: provinceIdByName.get(r.province) });
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
  for (const r of records) {
    const provinceId = provinceIdByName.get(r.province);
    const districtId = districtIdByKey.get(`${provinceId}|${r.amphoe}`);
    subDistrictKeySet.set(`${districtId}|${r.district}`, { name: r.district, districtId });
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

  console.log("นำเข้าข้อมูลที่อยู่ประเทศไทยสำเร็จ");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
