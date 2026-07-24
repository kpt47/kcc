// นำเข้าเส้นเขตการปกครองไทย (จังหวัด/อำเภอ/ตำบล) จาก piyayut-ch/mapthai (ข้อมูลมาตรฐาน HDX COD-AB รูปแบบ
// GeoJSON) แล้วแบ่งไฟล์ตามลำดับชั้นเพื่อไม่ให้ client ต้องโหลดข้อมูลทั้งประเทศทีเดียว — รันครั้งเดียวแบบ manual
// (ไม่ใช่ migration/ส่วนของแอป) ผลลัพธ์เขียนไปที่ public/geo/
//
// รหัส ADM{1,2,3}_PCODE ในข้อมูลต้นทางมี prefix "TH" (เช่น "TH26" จังหวัด, "TH2601" อำเภอ, "TH260110" ตำบล)
// ต้องตัด prefix ออกเพื่อให้ตรงกับ Province.code/District.code/SubDistrict.code ของระบบนี้ (ตรวจสอบแล้วว่า
// รูปแบบตัวเลขตรงกัน 100% — นครนายก=26, เมืองนครนายก=2601, สาริกา=260110 ตรงกับข้อมูลจริงในฐานข้อมูล)
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://raw.githubusercontent.com/piyayut-ch/mapthai/master/data-raw/geojson";
const OUT_DIR = path.join(process.cwd(), "public", "geo");

async function fetchGeoJson(name) {
  const res = await fetch(`${BASE_URL}/${name}`);
  if (!res.ok) throw new Error(`โหลด ${name} ไม่สำเร็จ: ${res.status}`);
  return res.json();
}

// เก็บเฉพาะ property ที่ใช้จริง (ตัด metadata ที่ไม่ใช้ทิ้งเพื่อลดขนาดไฟล์)
function slimFeature(feature, level) {
  const p = feature.properties;
  const codeKey = `ADM${level}_PCODE`;
  const nameThKey = `ADM${level}_TH`;
  const nameEnKey = `ADM${level}_EN`;
  const code = p[codeKey]?.replace(/^TH/, "");
  return {
    type: "Feature",
    properties: { code, nameTh: p[nameThKey], nameEn: p[nameEnKey] },
    geometry: feature.geometry,
  };
}

async function main() {
  console.log("กำลังดาวน์โหลดข้อมูลเขตการปกครอง...");
  const [adm1, adm2, adm3] = await Promise.all([
    fetchGeoJson("th_adm1.geojson"),
    fetchGeoJson("th_adm2.geojson"),
    fetchGeoJson("th_adm3.geojson"),
  ]);

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(path.join(OUT_DIR, "districts"), { recursive: true });
  await mkdir(path.join(OUT_DIR, "subdistricts"), { recursive: true });

  // ระดับจังหวัด — ไฟล์เดียวทั้งประเทศ (77 features, เล็ก โหลดทีเดียวได้)
  const provinceFeatures = adm1.features.map((f) => slimFeature(f, 1));
  await writeFile(
    path.join(OUT_DIR, "provinces.geojson"),
    JSON.stringify({ type: "FeatureCollection", features: provinceFeatures })
  );
  console.log(`เขียน provinces.geojson (${provinceFeatures.length} จังหวัด)`);

  // ระดับอำเภอ — แบ่งไฟล์ตามรหัสจังหวัด (2 หลักแรกของรหัสอำเภอ)
  const districtsByProvince = new Map();
  for (const f of adm2.features) {
    const slim = slimFeature(f, 2);
    const provinceCode = slim.properties.code.slice(0, 2);
    if (!districtsByProvince.has(provinceCode)) districtsByProvince.set(provinceCode, []);
    districtsByProvince.get(provinceCode).push(slim);
  }
  for (const [provinceCode, features] of districtsByProvince) {
    await writeFile(
      path.join(OUT_DIR, "districts", `${provinceCode}.geojson`),
      JSON.stringify({ type: "FeatureCollection", features })
    );
  }
  console.log(`เขียนไฟล์อำเภอ ${districtsByProvince.size} จังหวัด (${adm2.features.length} อำเภอรวม)`);

  // ระดับตำบล — แบ่งไฟล์ตามรหัสอำเภอ (4 หลักแรกของรหัสตำบล)
  const subDistrictsByDistrict = new Map();
  for (const f of adm3.features) {
    const slim = slimFeature(f, 3);
    const districtCode = slim.properties.code.slice(0, 4);
    if (!subDistrictsByDistrict.has(districtCode)) subDistrictsByDistrict.set(districtCode, []);
    subDistrictsByDistrict.get(districtCode).push(slim);
  }
  for (const [districtCode, features] of subDistrictsByDistrict) {
    await writeFile(
      path.join(OUT_DIR, "subdistricts", `${districtCode}.geojson`),
      JSON.stringify({ type: "FeatureCollection", features })
    );
  }
  console.log(`เขียนไฟล์ตำบล ${subDistrictsByDistrict.size} อำเภอ (${adm3.features.length} ตำบลรวม)`);

  console.log("เสร็จสิ้น — ตรวจสอบ public/geo/ ");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
