import { PageContainer } from "@/components/layout/PageContainer";
import { MeetingRecordsTable } from "@/components/meetings/MeetingRecordsTable";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getAllowedVillageIds, scopeWhereDirect } from "@/lib/scope";
import { canCreateMeetingRecord, canDeleteMeetingRecord } from "@/lib/authz";

export const dynamic = "force-dynamic";

// วาระการประชุมและมติคณะกรรมการ กข.คจ. หมู่บ้าน — ดูได้ทุก role ตามเขตพื้นที่ (Area-Based Isolation)
// อัปโหลดได้เฉพาะประธาน/เลขานุการ/ฝ่ายการเงิน ลบได้เฉพาะพัฒนากรประจำตำบล (ดู lib/authz.ts)
export default async function MeetingsPage() {
  const user = await requireUser();
  const scope = await getAllowedVillageIds(user);

  const records = await prisma.villageMeetingRecord.findMany({
    where: scopeWhereDirect(scope),
    orderBy: { meetingDate: "desc" },
    include: {
      village: { select: { villageName: true, villageNo: true } },
      uploadedBy: { select: { committeeProfile: { select: { firstName: true, lastName: true } } } },
    },
  });

  const rows = records.map((r) => ({
    id: r.id,
    villageName: r.village.villageName,
    villageNo: r.village.villageNo,
    meetingDate: r.meetingDate.toISOString(),
    agendaTopic: r.agendaTopic,
    fileUrl: r.fileUrl,
    uploadedByName: r.uploadedBy.committeeProfile
      ? `${r.uploadedBy.committeeProfile.firstName} ${r.uploadedBy.committeeProfile.lastName}`
      : "-",
  }));

  return (
    <PageContainer title="รายงาน/วาระการประชุม" subtitle="เอกสารวาระการประชุมและมติคณะกรรมการ กข.คจ. หมู่บ้าน">
      <MeetingRecordsTable
        rows={rows}
        canUpload={canCreateMeetingRecord(user)}
        canDelete={canDeleteMeetingRecord(user)}
        showVillageColumn={scope === "all" || scope.length > 1}
      />
    </PageContainer>
  );
}
