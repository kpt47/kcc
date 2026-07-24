import { ExternalLink, Briefcase, Sparkles } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { JOB_SEARCH_SITES, jobSearchLink, splitSpecialSkills, type JobSearchSite } from "@/lib/jobSearchSites";

// หน้า "งานเสริมเพิ่มรายได้" — เฉพาะครัวเรือนเป้าหมาย (เข้าถึงได้ผ่านเมนูใน src/lib/navLinks.ts เท่านั้น)
// นำข้อความ "ความสามารถพิเศษ" ของครัวเรือน (ทะเบียนครัวเรือนเป้าหมาย) มาสร้างลิงก์ค้นหางานแบบระบุคำค้นไปยัง
// เว็บไซต์หางานที่น่าเชื่อถือ (ดู lib/jobSearchSites.ts) ไม่ได้ดึงประกาศงานจริงแบบ real-time (หลีกเลี่ยงการ
// scrape ซึ่งเสี่ยงผิดเงื่อนไขการใช้งานของเว็บไซต์ต้นทางและเปราะบางต่อการเปลี่ยนแปลงหน้าเว็บ) — ทุกลิงก์เปิดหน้าใหม่
export const dynamic = "force-dynamic";

function SiteLinkButton({ site, query }: { site: JobSearchSite; query?: string }) {
  return (
    <a
      href={jobSearchLink(site, query)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 text-sm font-semibold text-white"
    >
      ค้นหาใน {site.name}
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
    </a>
  );
}

function SkillCard({ skill }: { skill: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
      <span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-900/60 dark:text-amber-300">
        ความสามารถพิเศษของคุณ
      </span>
      <p className="text-base font-bold text-slate-900 dark:text-slate-100">{skill}</p>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        กดปุ่มด้านล่างเพื่อค้นหาตำแหน่งงานที่เกี่ยวข้องกับ &quot;{skill}&quot; จากเว็บไซต์หางานจริง
      </p>
      <div className="mt-1 flex flex-wrap gap-2">
        {JOB_SEARCH_SITES.filter((s) => s.searchUrl).map((site) => (
          <SiteLinkButton key={site.key} site={site} query={skill} />
        ))}
      </div>
    </div>
  );
}

function SiteInfoCard({ site }: { site: JobSearchSite }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-base font-bold text-slate-900 dark:text-slate-100">{site.name}</p>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{site.org}</p>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{site.description}</p>
      <div className="mt-1 flex flex-wrap gap-2">
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-300 px-3.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
        >
          ไปที่เว็บไซต์
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
        </a>
      </div>
    </div>
  );
}

export default async function SideJobsPage() {
  const user = await requireUser();

  const household = user.householdId
    ? await prisma.targetHousehold.findUnique({ where: { id: user.householdId }, select: { specialSkills: true } })
    : null;
  const skills = splitSpecialSkills(household?.specialSkills);

  return (
    <PageContainer title="งานเสริมเพิ่มรายได้" subtitle="ค้นหางาน/อาชีพเสริมที่ตรงกับความสามารถพิเศษของคุณจากเว็บไซต์หางานที่น่าเชื่อถือ">
      <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/40">
        <Briefcase className="h-6 w-6 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
        <p className="text-sm leading-relaxed text-sky-900 dark:text-sky-200">
          กดปุ่ม &quot;ค้นหาใน...&quot; เพื่อไปดูตำแหน่งงานจริงที่ตรงกับความสามารถพิเศษของคุณในเว็บไซต์หางานภายนอก (เปิดหน้าใหม่แยกออกไป)
        </p>
      </div>

      {skills.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            <Sparkles className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            แนะนำสำหรับคุณ (ตามความสามารถพิเศษที่ลงทะเบียนไว้)
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {skills.map((skill) => (
              <SkillCard key={skill} skill={skill} />
            ))}
          </div>
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          ทะเบียนครัวเรือนเป้าหมายของคุณยังไม่ได้ระบุ &quot;ความสามารถพิเศษ&quot; ไว้ — แจ้งประธาน/เลขานุการคณะกรรมการหมู่บ้านให้ช่วยเพิ่มข้อมูลนี้
          เพื่อรับคำแนะนำงานที่ตรงกับตัวคุณมากขึ้น ระหว่างนี้สามารถค้นหางานทั่วไปได้จากเว็บไซต์ด้านล่าง
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">เว็บไซต์หางานที่น่าเชื่อถือ</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {JOB_SEARCH_SITES.map((site) => (
            <SiteInfoCard key={site.key} site={site} />
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
