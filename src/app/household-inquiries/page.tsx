import { MessageCircle } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { NewInquiryForm } from "@/components/household-inquiries/NewInquiryForm";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatThaiDateTime } from "@/lib/thai";

const TOPIC_LABEL: Record<string, string> = { CONSULT: "ปรึกษา", COMPLAINT: "ร้องทุกข์", OTHER: "อื่นๆ" };
const STATUS_LABEL: Record<string, string> = { IN_PROGRESS: "กำลังแก้ไข", RESOLVED: "เรียบร้อยแล้ว", OTHER: "อื่นๆ" };
const STATUS_STYLE: Record<string, string> = {
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300",
  RESOLVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300",
  OTHER: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

// หน้า "ปรึกษา/ร้องทุกข์" — เฉพาะครัวเรือนเป้าหมาย (เข้าถึงได้ผ่านเมนูใน src/lib/navLinks.ts เท่านั้น)
// ส่งถึงพัฒนาการอำเภอ/พัฒนาการจังหวัดในเขตพื้นที่ของหมู่บ้านตนเองโดยตรง (ดู notifyDistrictAndProvinceAdmins
// ใน lib/notifications/notifyUsers.ts) ฝั่งผู้ดูแลดูและตอบกลับได้ที่ /admin/household-inquiries
export const dynamic = "force-dynamic";

export default async function HouseholdInquiriesPage() {
  const user = await requireUser();

  if (!user.householdId) {
    return (
      <PageContainer title="ปรึกษา/ร้องทุกข์" subtitle="ส่งข้อความถึงพัฒนาการอำเภอ/พัฒนาการจังหวัด">
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          บัญชีของคุณยังไม่ได้ผูกกับครัวเรือนเป้าหมายใดในระบบ
        </p>
      </PageContainer>
    );
  }

  const inquiries = await prisma.householdInquiry.findMany({
    where: { householdId: user.householdId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageContainer title="ปรึกษา/ร้องทุกข์" subtitle="ส่งข้อความถึงพัฒนาการอำเภอ/พัฒนาการจังหวัดในเขตพื้นที่ของคุณ">
      <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/40">
        <MessageCircle className="h-6 w-6 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
        <p className="text-sm leading-relaxed text-sky-900 dark:text-sky-200">
          ข้อมูลนี้จะถูกส่งไปที่พัฒนาการอำเภอและพัฒนาการจังหวัด เพื่อการพัฒนาบริการต่างๆ ให้ดีขึ้น
        </p>
      </div>

      <NewInquiryForm />

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">ประวัติคำร้องของฉัน</h2>
        {inquiries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            ยังไม่มีคำร้องที่ส่งไว้
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {inquiries.map((inq) => (
              <div
                key={inq.id}
                className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {inq.topic === "OTHER" ? inq.topicOther || "อื่นๆ" : TOPIC_LABEL[inq.topic]}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{formatThaiDateTime(inq.createdAt)}</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{inq.details}</p>
                {inq.attachmentUrl && (
                  <a
                    href={inq.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-fit text-xs font-semibold text-emerald-700 underline dark:text-emerald-400"
                  >
                    ดูไฟล์ที่แนบ
                  </a>
                )}
                {inq.status ? (
                  <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[inq.status]}`}>
                    สถานะ: {inq.status === "OTHER" ? inq.statusOther || "อื่นๆ" : STATUS_LABEL[inq.status]}
                  </span>
                ) : (
                  <span className="w-fit rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
                    ยังไม่ดำเนินการ
                  </span>
                )}
                {inq.reply && (
                  <div className="mt-1 rounded-xl bg-sky-50 p-3 dark:bg-sky-950/40">
                    <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">คำตอบจากพัฒนาการอำเภอ/จังหวัด</p>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{inq.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}
