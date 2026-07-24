import { ExternalLink, Lightbulb, Sparkles } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { matchCareerIdeas, type CareerIdea } from "@/lib/careerIdeas";

// หน้า "สร้างงานสร้างอาชีพ" — เฉพาะครัวเรือนเป้าหมาย (เข้าถึงได้ผ่านเมนูใน src/lib/navLinks.ts เท่านั้น)
// รวมไอเดียอาชีพ/แหล่งความรู้ภาษาไทยที่คิวเรตไว้ล่วงหน้า (ดู src/lib/careerIdeas.ts) แล้วเทียบกับอาชีพปัจจุบัน/
// โครงการที่เคยเสนอของครัวเรือน เพื่อไฮไลต์รายการที่ "ตรงกับตัวเอง" ขึ้นก่อน ไม่ได้ค้นหาแบบ real-time
// (หลีกเลี่ยงค่าใช้จ่าย API ค้นหาภายนอกต่อครั้ง) — อัปเดตเนื้อหาโดยแก้ไฟล์ careerIdeas.ts ได้โดยตรง
export const dynamic = "force-dynamic";

function IdeaCard({ idea, highlighted }: { idea: CareerIdea; highlighted?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-4 ${
        highlighted
          ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <span
        className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
          highlighted
            ? "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-300"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        }`}
      >
        {idea.category}
      </span>
      <p className="text-base font-bold text-slate-900 dark:text-slate-100">{idea.title}</p>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{idea.summary}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400 dark:text-slate-500">แหล่งข้อมูล: {idea.sourceName}</p>
        <a
          href={idea.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 text-sm font-semibold text-white"
        >
          อ่านเพิ่มเติม
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
        </a>
      </div>
    </div>
  );
}

export default async function CareerIdeasPage() {
  const user = await requireUser();

  // รวบรวม "สัญญาณ" อาชีพ/ความสามารถพิเศษ/โครงการปัจจุบันของครัวเรือน (ถ้าบัญชีนี้ผูกกับครัวเรือนเป้าหมาย)
  // เพื่อไฮไลต์ไอเดียที่ตรงกับตัวเอง — ดึงทั้งจากทะเบียนครัวเรือนเป้าหมาย (อาชีพ+ความสามารถพิเศษที่ลงทะเบียนไว้)
  // และจากอาชีพที่เคยกรอกในคำร้องต่างๆ (อาจต่างจากที่ลงทะเบียนไว้ ถ้าเปลี่ยนอาชีพภายหลัง)
  const signals: (string | null | undefined)[] = [];
  if (user.householdId) {
    const [household, profile, loans, proposals, loanRequests] = await Promise.all([
      prisma.targetHousehold.findUnique({ where: { id: user.householdId }, select: { occupation: true, specialSkills: true } }),
      prisma.householdProfile.findFirst({ where: { userId: user.id }, select: { occupation: true } }),
      prisma.loan.findMany({ where: { householdId: user.householdId }, select: { occupation: true } }),
      prisma.projectProposal.findMany({
        where: { householdId: user.householdId },
        select: { occupation: true, projectName: true },
      }),
      prisma.loanRequest.findMany({ where: { householdId: user.householdId }, select: { occupation: true } }),
    ]);
    signals.push(
      household?.occupation,
      household?.specialSkills,
      profile?.occupation,
      ...loans.map((l) => l.occupation),
      ...proposals.flatMap((p) => [p.occupation, p.projectName]),
      ...loanRequests.map((r) => r.occupation)
    );
  }

  const { matched, others } = matchCareerIdeas(signals);

  return (
    <PageContainer
      title="แนะนำอาชีพ!"
      subtitle="รวมไอเดียอาชีพและแหล่งความรู้ที่น่าสนใจ เพื่อพัฒนาตนเองให้มีรายได้เพิ่มขึ้น"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/40">
        <Lightbulb className="h-6 w-6 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
        <p className="text-sm leading-relaxed text-sky-900 dark:text-sky-200">
          กดปุ่ม &quot;อ่านเพิ่มเติม&quot; เพื่อไปอ่านข้อมูลเต็มจากแหล่งข้อมูลจริงในเว็บไซต์ภายนอก แต่ละไอเดียมีต้นทุน/ความยากง่ายต่างกัน
          ลองศึกษาหลายๆ ทางแล้วเลือกที่เหมาะกับตัวเองที่สุด
        </p>
      </div>

      {matched.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            <Sparkles className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            แนะนำสำหรับคุณ (ตรงกับอาชีพ/โครงการของคุณ)
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {matched.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} highlighted />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          {matched.length > 0 ? "ไอเดียอาชีพอื่นๆ ที่น่าสนใจ" : "ไอเดียอาชีพที่น่าสนใจ"}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {others.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
