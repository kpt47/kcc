// เว็บไซต์หางาน/สมัครงานที่น่าเชื่อถือของไทย ใช้สร้างลิงก์ค้นหาแบบระบุคำค้น (deep link) ไม่ต้องใช้ API key —
// ตรวจสอบรูปแบบ URL ค้นหาจริงของแต่ละเว็บไซต์แล้ว (ก.ค. 2569) ก่อนนำมาใช้งานจริง เพื่อไม่ให้ลิงก์เสีย
export type JobSearchSite = {
  key: string;
  name: string;
  org: string;
  description: string;
  url: string; // ลิงก์ทั่วไป (หน้าแรก) — ใช้เมื่อไม่มีคำค้นเฉพาะเจาะจง
  searchUrl?: (query: string) => string; // ลิงก์ค้นหาแบบระบุคำค้น (ถ้าเว็บไซต์รองรับรูปแบบ URL ที่ตรวจสอบแล้ว)
};

export const JOB_SEARCH_SITES: JobSearchSite[] = [
  {
    key: "doe",
    name: "ไทยมีงานทำ (กรมการจัดหางาน)",
    org: "กรมการจัดหางาน กระทรวงแรงงาน",
    description:
      "แหล่งงานจากภาครัฐและเอกชนทั่วประเทศ ปลอดภัย ไม่มีค่าใช้จ่ายหรือค่าหัวคิวใดๆ เหมาะกับทุกกลุ่มอาชีพ รวมถึงงานฝีมือ/แรงงานทั่วไป",
    url: "https://www.doe.go.th/",
  },
  {
    key: "jobthai",
    name: "JobThai",
    org: "บริษัท จัดหางาน จ๊อบไทย ดอท คอม จำกัด",
    description: "เว็บไซต์หางานรายใหญ่ของไทย มีตำแหน่งงานหลากหลายทั่วประเทศ ค้นหาตามทักษะ/ความสามารถได้โดยตรง",
    url: "https://www.jobthai.com/",
    searchUrl: (q) => `https://www.jobthai.com/th/jobs?keyword=${encodeURIComponent(q)}`,
  },
  {
    key: "jobsdb",
    name: "JobsDB Thailand",
    org: "Seek Asia",
    description: "เว็บไซต์หางานชั้นนำในเอเชีย มีตำแหน่งงานหลากหลายระดับ ตั้งแต่งานทั่วไปจนถึงงานเฉพาะทาง",
    url: "https://th.jobsdb.com/",
    searchUrl: (q) => `https://th.jobsdb.com/th/${encodeURIComponent(q)}-jobs`,
  },
  {
    key: "indeed",
    name: "Indeed ประเทศไทย",
    org: "Indeed",
    description: "เว็บไซต์รวมประกาศงานจากหลายแหล่งทั่วโลกรวมถึงในไทย ค้นหาตามทักษะและพื้นที่ได้สะดวก",
    url: "https://th.indeed.com/",
    searchUrl: (q) => `https://th.indeed.com/jobs?q=${encodeURIComponent(q)}`,
  },
];

/** ลิงก์ไปเว็บไซต์หางาน — ใช้ลิงก์ค้นหาแบบระบุคำค้นถ้ามี query และเว็บไซต์รองรับ ไม่งั้น fallback ไปหน้าแรกของเว็บไซต์ */
export function jobSearchLink(site: JobSearchSite, query?: string): string {
  const q = query?.trim();
  return q && site.searchUrl ? site.searchUrl(q) : site.url;
}

/** แยกข้อความ "ความสามารถพิเศษ" (กรอกอิสระ คั่นด้วย , ; / หรือขึ้นบรรทัดใหม่) ออกเป็นรายการทักษะย่อย */
export function splitSpecialSkills(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;、\/\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
