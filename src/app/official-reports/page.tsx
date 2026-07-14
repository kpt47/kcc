import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { VillageDebtReportView } from "@/components/official-reports/VillageDebtReportView";
import { DistrictSummaryReportView } from "@/components/official-reports/DistrictSummaryReportView";
import { ProvinceLevelTabs } from "@/components/official-reports/ProvinceLevelTabs";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// รายงานภาวะหนี้สินและฐานะทางการเงินโครงการ กข.คจ. — อ้างอิงแบบฟอร์ม 26(1)/26(2) ท้ายระเบียบ พ.ศ. 2553
// แต่ละ role เห็นได้เฉพาะแบบฟอร์มระดับของตนเองเท่านั้น (บังคับที่ระดับ API ด้วย — ไม่ใช่แค่ซ่อน UI)
export default async function OfficialReportsPage() {
  const user = await requireUser();

  let title = "รายงานภาวะหนี้สินและฐานะทางการเงินโครงการ กข.คจ.";
  let subtitle = "";
  let content: React.ReactNode;

  if (user.role === "VILLAGE_COMMITTEE" || user.role === "SUB_DISTRICT_ADMIN") {
    subtitle = "แบบฟอร์ม 26(1) ระดับหมู่บ้าน";
    content = <VillageDebtReportView isVillageCommittee={user.role === "VILLAGE_COMMITTEE"} />;
  } else if (user.role === "DISTRICT_ADMIN") {
    subtitle = "แบบฟอร์ม 26(1) สรุประดับอำเภอ";
    content = <DistrictSummaryReportView />;
  } else if (user.role === "PROVINCIAL_ADMIN" || user.role === "GLOBAL_ADMIN") {
    subtitle = "แบบฟอร์ม 26(2) สรุประดับจังหวัด และรายงานสภาพปัญหาการบริหารเงินทุน";
    content = <ProvinceLevelTabs isProvincialAdmin={user.role === "PROVINCIAL_ADMIN"} />;
  } else {
    return (
      <PageContainer title={title} subtitle="ไม่มีสิทธิ์เข้าถึง">
        <SectionCard title="ไม่มีสิทธิ์เข้าถึง">
          <p className="text-sm text-slate-600">หน้านี้สำหรับกรรมการหมู่บ้านขึ้นไปเท่านั้น</p>
        </SectionCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={title} subtitle={subtitle}>
      {content}
    </PageContainer>
  );
}
