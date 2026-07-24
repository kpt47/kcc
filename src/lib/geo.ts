import type { Prisma } from "@/generated/prisma/client";

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** ระยะทางเส้นตรงบนพื้นผิวโลก (Haversine) หน่วยกิโลเมตร — ใช้กรองแหล่งทุน/หมู่บ้านที่อยู่ในรัศมีที่กำหนด */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// include ที่ใช้ดึงชื่อที่อยู่เต็มของหมู่บ้าน (ตำบล/อำเภอ/จังหวัด/ภาค) ผ่านลำดับชั้นเขตการปกครอง
export const VILLAGE_ADDRESS_INCLUDE = {
  subDistrict: { include: { district: { include: { province: { include: { region: true } } } } } },
} satisfies Prisma.VillageInclude;

export type VillageWithAddress = Prisma.VillageGetPayload<{ include: typeof VILLAGE_ADDRESS_INCLUDE }>;

export function villageAddress(village: VillageWithAddress) {
  return {
    subDistrictName: village.subDistrict.name,
    districtName: village.subDistrict.district.name,
    provinceName: village.subDistrict.district.province.name,
    regionName: village.subDistrict.district.province.region.name,
  };
}

/** ค้นหา (หรือสร้างใหม่) ลำดับชั้น ภาค -> จังหวัด -> อำเภอ -> ตำบล จากชื่อที่กรอกเป็นข้อความอิสระ
 *  ใช้ตอนสร้างหมู่บ้านใหม่ เพื่อไม่ต้องบังคับผู้ใช้เลือกจาก dropdown ที่ต้องเตรียมข้อมูลไว้ล่วงหน้า
 *  หมายเหตุ: ถ้ายังไม่มีจังหวัดนี้ในระบบ จะสร้างไว้ใต้ภาค "ไม่ระบุภาค" ชั่วคราว
 *  ผู้ดูแลระบบควรย้ายไปอยู่ภาคที่ถูกต้องภายหลัง */
export async function upsertSubDistrictId(
  tx: Prisma.TransactionClient,
  parts: { subDistrict: string; district: string; province: string }
): Promise<number> {
  const defaultRegion = await tx.region.upsert({
    where: { name: "ไม่ระบุภาค" },
    create: { name: "ไม่ระบุภาค" },
    update: {},
  });
  const province = await tx.province.upsert({
    where: { name: parts.province },
    create: { name: parts.province, regionId: defaultRegion.id },
    update: {},
  });
  const district = await tx.district.upsert({
    where: { provinceId_name: { provinceId: province.id, name: parts.district } },
    create: { name: parts.district, provinceId: province.id },
    update: {},
  });
  const subDistrict = await tx.subDistrict.upsert({
    where: { districtId_name: { districtId: district.id, name: parts.subDistrict } },
    create: { name: parts.subDistrict, districtId: district.id },
    update: {},
  });
  return subDistrict.id;
}
