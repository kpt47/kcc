import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { DistrictManager } from "@/components/master-data/DistrictManager";
import { SubDistrictManager } from "@/components/master-data/SubDistrictManager";
import { VillageManager } from "@/components/master-data/VillageManager";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { canManageMasterData } from "@/lib/authz";

export const dynamic = "force-dynamic";

// จัดการ Master Data (ชื่อหมู่บ้าน/ตำบล/อำเภอ) — เฉพาะ GLOBAL_ADMIN แก้ไขได้ ระดับอื่นเห็นได้อย่างเดียว (Read-only)
export default async function MasterDataPage() {
  const user = await requireUser();
  const canManage = canManageMasterData(user);

  const [provinces, districts, subDistricts, villages] = await Promise.all([
    prisma.province.findMany({ orderBy: { name: "asc" } }),
    prisma.district.findMany({
      orderBy: [{ province: { name: "asc" } }, { name: "asc" }],
      include: { province: { select: { id: true, name: true } }, _count: { select: { subDistricts: true } } },
    }),
    prisma.subDistrict.findMany({
      orderBy: [{ district: { name: "asc" } }, { name: "asc" }],
      include: {
        district: { select: { id: true, name: true, province: { select: { name: true } } } },
        _count: { select: { villages: true } },
      },
    }),
    prisma.village.findMany({
      orderBy: [{ subDistrict: { name: "asc" } }, { villageNo: "asc" }],
      include: {
        subDistrict: { select: { id: true, name: true, district: { select: { name: true, province: { select: { name: true } } } } } },
      },
    }),
  ]);

  return (
    <PageContainer
      title="จัดการพื้นที่ (Master Data)"
      subtitle={canManage ? "เพิ่ม/แก้ไข/ลบ ชื่อหมู่บ้าน ตำบล และอำเภอ" : "ข้อมูลอ้างอิงหมู่บ้าน/ตำบล/อำเภอ (ดูได้อย่างเดียว)"}
    >
      {!canManage && (
        <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
          หน้านี้แก้ไขได้เฉพาะผู้ดูแลระบบส่วนกลาง (GLOBAL_ADMIN) เท่านั้น — ระดับอื่นดูข้อมูลได้อย่างเดียว
        </p>
      )}

      <SectionCard title="อำเภอ" description="รายชื่ออำเภอทั้งหมดในระบบ">
        <DistrictManager
          districts={districts}
          provinces={provinces.map((p) => ({ id: p.id, name: p.name }))}
          canManage={canManage}
          currentUser={user}
        />
      </SectionCard>

      <SectionCard title="ตำบล" description="รายชื่อตำบลทั้งหมดในระบบ">
        <SubDistrictManager
          subDistricts={subDistricts}
          districts={districts.map((d) => ({ id: d.id, name: d.name }))}
          canManage={canManage}
          currentUser={user}
        />
      </SectionCard>

      <SectionCard title="หมู่บ้าน" description="รายชื่อหมู่บ้านทั้งหมดในระบบ">
        <VillageManager
          villages={villages}
          subDistricts={subDistricts.map((s) => ({ id: s.id, name: s.name }))}
          canManage={canManage}
          currentUser={user}
        />
      </SectionCard>
    </PageContainer>
  );
}
