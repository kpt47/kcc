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

type AssignmentUser = {
  id: number;
  role: GlobalRole;
  createdAt: Date;
  scopeProvinceId: number | null;
  scopeProvince: { name: string } | null;
  scopeDistrict: { name: string; province: { id: number; name: string } } | null;
  scopeSubDistrict: { name: string; district: { name: string; province: { id: number; name: string } } } | null;
  officialProfile: { titlePrefix: string | null; titlePrefixOther: string | null; firstName: string; lastName: string } | null;
};

// พื้นที่ตำบล/อำเภอ/จังหวัดของ User แต่ละคน — เก็บแค่ระดับของตนเองตาม role (พัฒนาการจังหวัดมีแค่จังหวัด,
// พัฒนาการอำเภอมีอำเภอ+จังหวัด, พัฒนากรตำบลมีครบทั้งสามระดับ) พร้อม provinceId ไว้กรองสิทธิ์ของพัฒนาการจังหวัด
function areaOf(u: AssignmentUser): { subDistrict: string; district: string; province: string; provinceId: number | null } {
  if (u.role === "PROVINCIAL_ADMIN") {
    return { subDistrict: "-", district: "-", province: u.scopeProvince?.name ?? "-", provinceId: u.scopeProvinceId };
  }
  if (u.role === "DISTRICT_ADMIN") {
    return {
      subDistrict: "-",
      district: u.scopeDistrict?.name ?? "-",
      province: u.scopeDistrict?.province.name ?? "-",
      provinceId: u.scopeDistrict?.province.id ?? null,
    };
  }
  return {
    subDistrict: u.scopeSubDistrict?.name ?? "-",
    district: u.scopeSubDistrict?.district.name ?? "-",
    province: u.scopeSubDistrict?.district.province.name ?? "-",
    provinceId: u.scopeSubDistrict?.district.province.id ?? null,
  };
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

  const usersRaw: AssignmentUser[] = await prisma.user.findMany({
    where: { role: { in: ASSIGNMENT_ROLES } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      createdAt: true,
      scopeProvinceId: true,
      scopeProvince: { select: { name: true } },
      scopeDistrict: { select: { name: true, province: { select: { id: true, name: true } } } },
      scopeSubDistrict: { select: { name: true, district: { select: { name: true, province: { select: { id: true, name: true } } } } } },
      officialProfile: { select: { titlePrefix: true, titlePrefixOther: true, firstName: true, lastName: true } },
    },
  });

  // พัฒนาการจังหวัดเห็นเฉพาะบัญชีในจังหวัดของตนเอง — กรมเห็นทั่วประเทศ
  const visibleUsers =
    user.role === "PROVINCIAL_ADMIN"
      ? usersRaw.filter((u) => areaOf(u).provinceId === user.scopeProvinceId)
      : usersRaw;

  const columns: DataListColumnDef[] = [
    { key: "no", label: "ลำดับ", align: "center" },
    { key: "assignedDate", label: "วันเดือนปีที่มอบหมายงาน" },
    { key: "position", label: "ตำแหน่ง" },
    { key: "name", label: "ชื่อ-สกุล" },
    { key: "subDistrict", label: "ตำบล" },
    { key: "district", label: "อำเภอ" },
    { key: "province", label: "จังหวัด" },
  ];

  const rows: DataListRow[] = visibleUsers.map((u, index) => {
    const positionLabel = ROLE_LABELS[u.role];
    const name = u.officialProfile ? formatOfficialName(u.officialProfile) : "-";
    const assignedDate = formatThaiDate(u.createdAt);
    const area = areaOf(u);
    return {
      key: u.id,
      searchText: [positionLabel, name, assignedDate, area.subDistrict, area.district, area.province].join(" ").toLowerCase(),
      sortValues: {
        no: index + 1,
        assignedDate: u.createdAt.getTime(),
        position: positionLabel,
        name,
        subDistrict: area.subDistrict,
        district: area.district,
        province: area.province,
      },
      cells: {
        no: index + 1,
        assignedDate,
        position: positionLabel,
        name,
        subDistrict: area.subDistrict,
        district: area.district,
        province: area.province,
      },
      card: (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-base font-bold text-slate-900">
            {index + 1}. {name}
          </p>
          <p className="text-sm text-slate-600">{positionLabel}</p>
          <p className="text-sm text-slate-500">
            ต.{area.subDistrict} อ.{area.district} จ.{area.province}
          </p>
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
          searchPlaceholder="ค้นหาตำแหน่ง, ชื่อ-สกุล, ตำบล, อำเภอ, จังหวัด..."
          emptyMessage="ไม่พบข้อมูลที่ตรงกับการค้นหานี้"
        />
      )}
    </PageContainer>
  );
}
