import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { VillageManager, type VillageScopeLock } from "@/components/master-data/VillageManager";
import { prisma } from "@/lib/prisma";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { canManageMasterData, canCreateVillage } from "@/lib/authz";

export const dynamic = "force-dynamic";

type ProvinceRow = { id: number; name: string };
type DistrictRow = { id: number; name: string; province: { id: number; name: string } };
type SubDistrictRow = { id: number; name: string; district: { id: number; name: string; province: { id: number; name: string } } };

/**
 * ระดับการล็อกฟิลด์จังหวัด/อำเภอ/ตำบล ในฟอร์มขึ้นทะเบียนหมู่บ้านใหม่ ตามสิทธิ์ของผู้ใช้ปัจจุบัน:
 * GLOBAL_ADMIN เลือกได้อิสระทั่วประเทศ (ทุกช่อง null = ไม่ล็อก), PROVINCIAL_ADMIN ล็อกจังหวัด,
 * DISTRICT_ADMIN ล็อกจังหวัด+อำเภอ, SUB_DISTRICT_ADMIN ล็อกทั้งสามระดับ (หน้าที่หลักคือพิมพ์ชื่อ/หมู่ที่
 * หมู่บ้านใหม่เข้าตำบลของตนเท่านั้น) — คำนวณที่นี่เพราะมีรายชื่อ province/district/subDistrict พร้อมกัน
 * อยู่แล้วจากการ query ด้านบน ไม่ต้อง query ซ้ำ
 */
function resolveScopeLock(
  user: CurrentUser,
  provinces: ProvinceRow[],
  districts: DistrictRow[],
  subDistricts: SubDistrictRow[]
): VillageScopeLock {
  if (user.role === "PROVINCIAL_ADMIN") {
    const p = provinces.find((p) => p.id === user.scopeProvinceId);
    return { province: p ?? null, district: null, subDistrict: null };
  }
  if (user.role === "DISTRICT_ADMIN") {
    const d = districts.find((d) => d.id === user.scopeDistrictId);
    return { province: d?.province ?? null, district: d ? { id: d.id, name: d.name } : null, subDistrict: null };
  }
  if (user.role === "SUB_DISTRICT_ADMIN") {
    const s = subDistricts.find((s) => s.id === user.scopeSubDistrictId);
    return {
      province: s?.district.province ?? null,
      district: s ? { id: s.district.id, name: s.district.name } : null,
      subDistrict: s ? { id: s.id, name: s.name } : null,
    };
  }
  return { province: null, district: null, subDistrict: null };
}

// จัดการ Master Data (ชื่อหมู่บ้าน/ตำบล/อำเภอ) — จังหวัด/อำเภอ/ตำบล (ข้อมูลเขตการปกครอง) แก้ไขได้เฉพาะ
// GLOBAL_ADMIN เท่านั้น ส่วนการขึ้นทะเบียน "หมู่บ้าน" ใหม่เข้าโครงการเปิดกว้างกว่า ตั้งแต่พัฒนากรตำบลขึ้นไป
// (ดู canCreateVillage) โดยล็อกฟิลด์ที่อยู่ตามเขตของแต่ละระดับ — ระดับอื่นที่เหลือเห็นข้อมูลได้อย่างเดียว
export default async function MasterDataPage() {
  const user = await requireUser();
  const canManage = canManageMasterData(user);
  const canManageVillage = canCreateVillage(user);

  const [provinces, districts, subDistricts, villages] = await Promise.all([
    prisma.province.findMany({ orderBy: { name: "asc" } }),
    prisma.district.findMany({
      orderBy: [{ province: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, province: { select: { id: true, name: true } } },
    }),
    prisma.subDistrict.findMany({
      orderBy: [{ district: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        district: { select: { id: true, name: true, province: { select: { id: true, name: true } } } },
      },
    }),
    prisma.village.findMany({
      orderBy: [{ subDistrict: { name: "asc" } }, { villageNo: "asc" }],
      include: {
        subDistrict: { select: { id: true, name: true, district: { select: { name: true, province: { select: { name: true } } } } } },
      },
    }),
  ]);

  const scopeLock = resolveScopeLock(user, provinces, districts, subDistricts);

  return (
    <PageContainer
      title="จัดการพื้นที่ (Master Data)"
      subtitle={canManageVillage ? "เพิ่ม/แก้ไข/ลบ ชื่อหมู่บ้านที่เข้าร่วมโครงการ กข.คจ." : "ข้อมูลอ้างอิงหมู่บ้านทั้งหมดในระบบ (ดูได้อย่างเดียว)"}
    >
      {!canManageVillage && (
        <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
          หน้านี้เพิ่มหมู่บ้านใหม่ได้ตั้งแต่พัฒนากรตำบลขึ้นไป — ระดับอื่นดูข้อมูลได้อย่างเดียว
        </p>
      )}

      <SectionCard title="หมู่บ้าน" description="รายชื่อหมู่บ้านทั้งหมดในระบบ">
        <VillageManager
          villages={villages}
          subDistricts={subDistricts.map((s) => ({ id: s.id, name: s.name }))}
          canManage={canManage}
          canManageVillage={canManageVillage}
          scopeLock={scopeLock}
          currentUser={user}
        />
      </SectionCard>
    </PageContainer>
  );
}
