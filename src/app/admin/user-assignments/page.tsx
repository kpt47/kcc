import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { DataListView, type DataListColumnDef, type DataListRow } from "@/components/shared/DataListView";
import { prisma } from "@/lib/prisma";
import { requireUser, ROLE_LABELS } from "@/lib/auth";
import { canViewUserAssignments } from "@/lib/authz";
import { formatOfficialName } from "@/lib/officials";
import { formatThaiDate } from "@/lib/thai";
import type { GlobalRole } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const ASSIGNMENT_ROLES: GlobalRole[] = ["PROVINCIAL_ADMIN", "DISTRICT_ADMIN", "SUB_DISTRICT_ADMIN"];

// หาว่า User แต่ละคน (พัฒนาการจังหวัด/พัฒนาการอำเภอ/พัฒนากรตำบล) สังกัดจังหวัดใด — ใช้กรองข้อมูลให้
// พัฒนาการจังหวัดเห็นเฉพาะบัญชีในจังหวัดของตนเอง (พัฒนาการจังหวัดเทียบ scopeProvinceId ตรงๆ, พัฒนาการอำเภอ/
// พัฒนากรตำบล ต้องไล่ผ่าน District/SubDistrict เพราะ scope ของแต่ละคนเก็บแค่ระดับของตนเอง ไม่มี scopeProvinceId ซ้ำ)
async function resolveProvinceIds(
  users: { role: GlobalRole; scopeProvinceId: number | null; scopeDistrictId: number | null; scopeSubDistrictId: number | null }[]
): Promise<Map<number | null, number | null>> {
  const districtIds = users.filter((u) => u.role === "DISTRICT_ADMIN" && u.scopeDistrictId).map((u) => u.scopeDistrictId!);
  const subDistrictIds = users
    .filter((u) => u.role === "SUB_DISTRICT_ADMIN" && u.scopeSubDistrictId)
    .map((u) => u.scopeSubDistrictId!);

  const [districts, subDistricts] = await Promise.all([
    prisma.district.findMany({ where: { id: { in: districtIds } }, select: { id: true, provinceId: true } }),
    prisma.subDistrict.findMany({
      where: { id: { in: subDistrictIds } },
      select: { id: true, district: { select: { provinceId: true } } },
    }),
  ]);
  const districtProvince = new Map(districts.map((d) => [d.id, d.provinceId]));
  const subDistrictProvince = new Map(subDistricts.map((s) => [s.id, s.district.provinceId]));

  const result = new Map<number | null, number | null>();
  for (const u of users) {
    let provinceId: number | null = null;
    if (u.role === "PROVINCIAL_ADMIN") provinceId = u.scopeProvinceId;
    else if (u.role === "DISTRICT_ADMIN" && u.scopeDistrictId) provinceId = districtProvince.get(u.scopeDistrictId) ?? null;
    else if (u.role === "SUB_DISTRICT_ADMIN" && u.scopeSubDistrictId) provinceId = subDistrictProvince.get(u.scopeSubDistrictId) ?? null;
    result.set(u.scopeDistrictId ?? u.scopeSubDistrictId ?? u.scopeProvinceId, provinceId);
  }
  return result;
}

export default async function UserAssignmentsPage() {
  const user = await requireUser();
  if (!canViewUserAssignments(user)) {
    return (
      <PageContainer title="การมอบหมายงาน">
        <SectionCard title="ไม่มีสิทธิ์เข้าถึง">
          <p className="text-sm text-slate-600">หน้านี้สำหรับกรมและพัฒนาการจังหวัดเท่านั้น</p>
        </SectionCard>
      </PageContainer>
    );
  }

  const usersRaw = await prisma.user.findMany({
    where: { role: { in: ASSIGNMENT_ROLES } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      createdAt: true,
      scopeProvinceId: true,
      scopeDistrictId: true,
      scopeSubDistrictId: true,
      officialProfile: { select: { titlePrefix: true, titlePrefixOther: true, firstName: true, lastName: true } },
    },
  });

  // พัฒนาการจังหวัดเห็นเฉพาะบัญชีในจังหวัดของตนเอง — กรมเห็นทั่วประเทศ
  let visibleUsers = usersRaw;
  if (user.role === "PROVINCIAL_ADMIN") {
    const provinceMap = await resolveProvinceIds(usersRaw);
    visibleUsers = usersRaw.filter((u) => {
      const key = u.scopeDistrictId ?? u.scopeSubDistrictId ?? u.scopeProvinceId;
      return provinceMap.get(key) === user.scopeProvinceId;
    });
  }

  const columns: DataListColumnDef[] = [
    { key: "no", label: "ลำดับ", align: "center" },
    { key: "assignedDate", label: "วันเดือนปีที่มอบหมายงาน" },
    { key: "position", label: "ตำแหน่ง" },
    { key: "name", label: "ชื่อ-สกุล" },
  ];

  const rows: DataListRow[] = visibleUsers.map((u, index) => {
    const positionLabel = ROLE_LABELS[u.role];
    const name = u.officialProfile ? formatOfficialName(u.officialProfile) : "-";
    const assignedDate = formatThaiDate(u.createdAt);
    return {
      key: u.id,
      searchText: [positionLabel, name, assignedDate].join(" ").toLowerCase(),
      sortValues: { no: index + 1, assignedDate: u.createdAt.getTime(), position: positionLabel, name },
      cells: { no: index + 1, assignedDate, position: positionLabel, name },
      card: (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-base font-bold text-slate-900">
            {index + 1}. {name}
          </p>
          <p className="text-sm text-slate-600">{positionLabel}</p>
          <p className="text-sm text-slate-500">วันเดือนปีที่มอบหมายงาน: {assignedDate}</p>
        </div>
      ),
    };
  });

  return (
    <PageContainer
      title="การมอบหมายงาน"
      subtitle="วันที่เพิ่มผู้ใช้งานระดับพัฒนาการจังหวัด/พัฒนาการอำเภอ/พัฒนากรตำบล ตามสิทธิ์ในพื้นที่ของคุณ"
    >
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          ยังไม่มีข้อมูลการมอบหมายงานในพื้นที่ของคุณ
        </p>
      ) : (
        <DataListView
          rows={rows}
          columns={columns}
          defaultSortField="no"
          searchPlaceholder="ค้นหาตำแหน่ง, ชื่อ-สกุล, วันที่..."
          emptyMessage="ไม่พบข้อมูลที่ตรงกับการค้นหานี้"
        />
      )}
    </PageContainer>
  );
}
