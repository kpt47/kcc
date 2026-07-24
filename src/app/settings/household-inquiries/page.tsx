import { PageContainer } from "@/components/layout/PageContainer";
import { DataListView, type DataListColumnDef, type DataListRow } from "@/components/shared/DataListView";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllowedVillageIds, scopeWhereDirect } from "@/lib/scope";
import { canViewHouseholdInquiries, HOUSEHOLD_INQUIRY_DENIED_MESSAGE } from "@/lib/authz";
import { formatThaiDateTime } from "@/lib/thai";

const TOPIC_LABEL: Record<string, string> = { CONSULT: "ปรึกษา", COMPLAINT: "ร้องทุกข์", OTHER: "อื่นๆ" };

// หน้า "ปรึกษา/ร้องทุกข์" ฝั่งผู้ดูแล — เฉพาะพัฒนาการอำเภอ/พัฒนาการจังหวัด ดูตามเขตพื้นที่ของตนเอง
// (เข้าถึงได้ผ่านเมนู "ตั้งค่า" ใน src/lib/navLinks.ts เท่านั้น) ครัวเรือนส่งคำร้องที่ /household-inquiries
export const dynamic = "force-dynamic";

export default async function AdminHouseholdInquiriesPage() {
  const user = await requireUser();

  if (!canViewHouseholdInquiries(user)) {
    return (
      <PageContainer title="ปรึกษา/ร้องทุกข์" subtitle="คำร้องจากครัวเรือนเป้าหมาย">
        <SectionDenied />
      </PageContainer>
    );
  }

  const scope = await getAllowedVillageIds(user);
  const inquiries = await prisma.householdInquiry.findMany({
    where: scopeWhereDirect(scope),
    orderBy: { createdAt: "desc" },
    include: {
      household: { select: { sequenceNo: true, headFirstName: true, headLastName: true } },
      village: {
        select: {
          villageName: true,
          villageNo: true,
          subDistrict: { select: { name: true, district: { select: { name: true } } } },
        },
      },
    },
  });

  const columns: DataListColumnDef[] = [
    { key: "createdAt", label: "วันที่ส่ง" },
    { key: "household", label: "ครัวเรือน" },
    { key: "area", label: "พื้นที่" },
    { key: "topic", label: "หัวข้อ" },
    { key: "details", label: "รายละเอียด" },
    { key: "attachment", label: "ไฟล์แนบ", align: "center" },
  ];

  const rows: DataListRow[] = inquiries.map((inq) => {
    const householdName = `${inq.household.headFirstName} ${inq.household.headLastName}`;
    const area = `หมู่ ${inq.village.villageNo} บ้าน${inq.village.villageName} ต.${inq.village.subDistrict.name} อ.${inq.village.subDistrict.district.name}`;
    const topicLabel = inq.topic === "OTHER" ? inq.topicOther || "อื่นๆ" : TOPIC_LABEL[inq.topic];
    const createdAtLabel = formatThaiDateTime(inq.createdAt);

    return {
      key: inq.id,
      searchText: [householdName, area, topicLabel, inq.details].join(" ").toLowerCase(),
      // ค่าลบของ timestamp — เพราะ DataListView เริ่มต้นเรียงจากน้อยไปมาก (asc) แต่หน้านี้ต้องการให้คำร้องล่าสุด
      // ขึ้นก่อนเป็นค่าเริ่มต้น (เหมาะกับหน้าตรวจสอบ/แจ้งเตือนของผู้บริหาร ไม่ใช่หน้ารายชื่อทั่วไป)
      sortValues: { createdAt: -inq.createdAt.getTime(), household: householdName, area, topic: topicLabel },
      cells: {
        createdAt: createdAtLabel,
        household: `ลำดับที่ ${inq.household.sequenceNo} - ${householdName}`,
        area,
        topic: (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {topicLabel}
          </span>
        ),
        details: <span className="line-clamp-2 max-w-md whitespace-normal">{inq.details}</span>,
        attachment: inq.attachmentUrl ? (
          <a href={inq.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-700 underline dark:text-emerald-400">
            ดูไฟล์
          </a>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        ),
      },
      card: (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {topicLabel}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{createdAtLabel}</span>
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            ลำดับที่ {inq.household.sequenceNo} - {householdName}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{area}</p>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{inq.details}</p>
          {inq.attachmentUrl && (
            <a
              href={inq.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs font-semibold text-emerald-700 underline dark:text-emerald-400"
            >
              ดูไฟล์ที่แนบ
            </a>
          )}
        </div>
      ),
    };
  });

  return (
    <PageContainer title="ปรึกษา/ร้องทุกข์" subtitle={`คำร้องจากครัวเรือนเป้าหมายในเขตพื้นที่ของคุณ (${inquiries.length.toLocaleString("th-TH")} รายการ)`}>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          ยังไม่มีคำร้องในเขตพื้นที่ของคุณ
        </p>
      ) : (
        <DataListView
          rows={rows}
          columns={columns}
          defaultSortField="createdAt"
          searchPlaceholder="ค้นหาชื่อครัวเรือน, พื้นที่, หัวข้อ, รายละเอียด..."
          emptyMessage="ไม่พบคำร้องที่ตรงกับการค้นหานี้"
        />
      )}
    </PageContainer>
  );
}

function SectionDenied() {
  return (
    <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      {HOUSEHOLD_INQUIRY_DENIED_MESSAGE}
    </p>
  );
}
