import { PageContainer } from "@/components/layout/PageContainer";
import { OverviewReportMap } from "@/components/overview-report/OverviewReportMap";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// หน้า "รายงานภาพรวม" — แผนที่ระบายสีจริง (choropleth) ตามระดับความเสี่ยงหนี้ (NPL) คลิกดูข้อมูลลึกได้ถึงระดับ
// ตำบล ต่างจาก Smart Report & Map Center (src/components/smart-report) ซึ่งเป็นแผนที่แบบหมุดปักตามพิกัด
// หมู่บ้าน — การ์ด KPI ด้านบน (จำนวนหมู่บ้าน/ครัวเรือน/หนี้คงค้าง/รายได้เฉลี่ย) อยู่ใน OverviewReportMap.tsx
// (client component) เพราะต้องเปลี่ยนตามพื้นที่ที่กำลังเลือกดูบนแผนที่ ไม่ใช่ยอดรวมทั้งขอบเขตสิทธิ์แบบตายตัว —
// ไม่แสดงสถิติเพศ/อาชีพ%/พิการ/ความสุขแบบ จปฐ. เพราะไม่มีข้อมูลจริงรองรับในระบบนี้เลย
export const dynamic = "force-dynamic";

export default async function OverviewReportPage() {
  const user = await requireUser();

  if (user.role === "HOUSEHOLD" || user.role === "IT_SUPPORT") {
    return (
      <PageContainer title="Dashboard" subtitle="ภาพรวมข้อมูลตามสิทธิ์การเข้าถึงของคุณ (RBAC)">
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          บัญชีระดับนี้ไม่มีสิทธิ์เข้าถึง Dashboard
        </p>
      </PageContainer>
    );
  }

  // กำหนดจุดเริ่มต้นของแผนที่ตามขอบเขตสิทธิ์ของผู้ใช้ — GLOBAL_ADMIN เห็นทั้งประเทศ (breadcrumb ว่าง = ระดับ
  // จังหวัด), role ที่ผูกพื้นที่แคบกว่าเปิดมาเห็นแผนที่ที่ซูมเข้าไปในเขตของตนเองอยู่แล้ว (breadcrumb เริ่มต้นมี
  // รายการอยู่ก่อนแล้ว) และกดย้อนกลับออกนอกเขตตนเองไม่ได้ (ดู rootDepth ใน OverviewReportMap)
  const initialBreadcrumb: { code: string; name: string }[] = [];

  if (user.role === "PROVINCIAL_ADMIN" && user.scopeProvinceId) {
    const province = await prisma.province.findUnique({ where: { id: user.scopeProvinceId }, select: { code: true, name: true } });
    if (province?.code) initialBreadcrumb.push({ code: province.code, name: province.name });
  } else if (user.role === "DISTRICT_ADMIN" && user.scopeDistrictId) {
    const district = await prisma.district.findUnique({
      where: { id: user.scopeDistrictId },
      select: { code: true, name: true, province: { select: { code: true, name: true } } },
    });
    if (district?.code && district.province.code) {
      initialBreadcrumb.push({ code: district.province.code, name: district.province.name });
      initialBreadcrumb.push({ code: district.code, name: district.name });
    }
  } else if ((user.role === "SUB_DISTRICT_ADMIN" && user.scopeSubDistrictId) || (user.role === "VILLAGE_COMMITTEE" && user.scopeVillageId)) {
    const subDistrict =
      user.role === "SUB_DISTRICT_ADMIN"
        ? await prisma.subDistrict.findUnique({
            where: { id: user.scopeSubDistrictId! },
            select: { district: { select: { code: true, name: true, province: { select: { code: true, name: true } } } } },
          })
        : await prisma.village
            .findUnique({ where: { id: user.scopeVillageId! }, select: { subDistrictId: true } })
            .then((v) =>
              v
                ? prisma.subDistrict.findUnique({
                    where: { id: v.subDistrictId },
                    select: { district: { select: { code: true, name: true, province: { select: { code: true, name: true } } } } },
                  })
                : null
            );
    if (subDistrict?.district.code && subDistrict.district.province.code) {
      initialBreadcrumb.push({ code: subDistrict.district.province.code, name: subDistrict.district.province.name });
      initialBreadcrumb.push({ code: subDistrict.district.code, name: subDistrict.district.name });
    }
  }

  return (
    <PageContainer title="Dashboard" subtitle="แผนที่ระบายสีตามระดับความเสี่ยงหนี้ คลิกดูลึกได้ถึงระดับตำบล">
      <OverviewReportMap initialBreadcrumb={initialBreadcrumb} />
    </PageContainer>
  );
}
