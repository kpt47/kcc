import { PageContainer, SectionCard } from "@/components/layout/PageContainer";
import { SmartReportClient } from "@/components/smart-report/SmartReportClient";
import { requireUser } from "@/lib/auth";
import { canUseSmartSearch, SMART_SEARCH_DENIED_MESSAGE } from "@/lib/authz";

export const dynamic = "force-dynamic";

// Smart Report & Map Center — ค้นหา/วิเคราะห์/แผนที่/ออกรายงาน หลายมิติ ครอบคลุมเล่มม่วง/เขียว/เหลือง
// ข้อมูลและแผนที่ถูกจำกัดเฉพาะพื้นที่รับผิดชอบของผู้ใช้เสมอ (บังคับที่ระดับ API ผ่าน getAllowedVillageIds)
// สงวนไว้สำหรับเจ้าหน้าที่/กรรมการหมู่บ้านเท่านั้น (ดู canUseSmartSearch) — ครัวเรือน/IT_SUPPORT เข้าไม่ได้
export default async function SmartReportPage() {
  const user = await requireUser();

  if (!canUseSmartSearch(user)) {
    return (
      <PageContainer title="ค้นหา วิเคราะห์ แผนที่ และออกรายงาน" subtitle="Smart Report & Map Center">
        <SectionCard title="ไม่มีสิทธิ์เข้าถึง">
          <p className="text-sm text-slate-600">{SMART_SEARCH_DENIED_MESSAGE}</p>
        </SectionCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="ค้นหา วิเคราะห์ แผนที่ และออกรายงาน"
      subtitle="Smart Report & Map Center — ค้นหาหลายมิติ ครอบคลุมเล่มม่วง/เขียว/เหลือง เฉพาะพื้นที่รับผิดชอบของคุณ"
    >
      <SmartReportClient />
    </PageContainer>
  );
}
