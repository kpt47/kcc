// ข้อมูลอาชีพ/แนวทางสร้างรายได้ที่น่าสนใจ — คิวเรตด้วยมือจากแหล่งข้อมูลภาษาไทยที่น่าเชื่อถือ (หน่วยงานราชการ/
// ธนาคาร/สื่อเกษตรที่มีชื่อเสียง) ณ เดือนกรกฎาคม 2569 ไม่ได้ดึงข้อมูลแบบ real-time (ไม่ต้องพึ่ง API ค้นหาภายนอก
// ที่มีค่าใช้จ่ายต่อครั้ง) — หากต้องการอัปเดตเนื้อหาในอนาคต แก้ไข/เพิ่มรายการในไฟล์นี้ได้โดยตรง
export type CareerIdea = {
  id: string;
  title: string;
  summary: string;
  category: string;
  keywords: string[]; // ใช้จับคู่กับอาชีพปัจจุบัน/โครงการที่เสนอของครัวเรือน (เทียบแบบ substring ไม่สนตัวพิมพ์เล็ก-ใหญ่)
  sourceName: string;
  sourceUrl: string;
};

export const CAREER_IDEAS: CareerIdea[] = [
  {
    id: "future-crops-2569",
    title: "พืชเศรษฐกิจใหม่ ดาวรุ่งปี 2569",
    summary:
      "แนวโน้มพืชที่ตลาดต้องการสูงในปีนี้ เน้นพืชที่ทนโรค ให้ผลผลิตสูง และตอบโจทย์อุตสาหกรรมอาหารแปรรูป/พลังงานสะอาด เหมาะสำหรับเกษตรกรที่กำลังมองหาพืชปลูกใหม่เสริมจากพืชหลัก",
    category: "เกษตร",
    keywords: ["เกษตร", "ปลูก", "นา", "สวน", "ไร่", "ทำนา", "ทำไร่"],
    sourceName: "ไทยรัฐ",
    sourceUrl: "https://www.thairath.co.th/scoop/interview/2905173",
  },
  {
    id: "innovative-farming-hometown",
    title: "7 วิถีเกษตรนวัตกรรม สร้างอาชีพใหม่อย่างยั่งยืน ณ ถิ่นฐานบ้านเกิด",
    summary:
      "แนวทางทำเกษตรสมัยใหม่ที่ทำได้ในพื้นที่บ้านเกิด ไม่ต้องย้ายไปทำงานต่างถิ่น ครอบคลุมทั้งการวางแผนปลูก การบริหารต้นทุน และการหาตลาด",
    category: "เกษตร",
    keywords: ["เกษตร", "ปลูก", "นา", "สวน", "ไร่", "ทำนา", "ทำไร่"],
    sourceName: "กรมประชาสัมพันธ์ (PRD)",
    sourceUrl: "https://www.prd.go.th/th/content/category/detail/id/31/iid/329215",
  },
  {
    id: "processed-produce-value",
    title: "การแปรรูปผัก ผลไม้ เพื่อเพิ่มมูลค่า",
    summary:
      "คู่มือแปรรูปผลผลิตทางการเกษตรเป็นสินค้าใหม่ (เช่น กล้วยอบ ขนมจากข้าว) ช่วยยืดอายุเก็บรักษา ลดผลผลิตล้นตลาด และเพิ่มมูลค่าขายได้เฉลี่ยกว่า 67%",
    category: "แปรรูปผลผลิต",
    keywords: ["เกษตร", "ปลูกผัก", "ผลไม้", "แปรรูป", "ค้าขาย"],
    sourceName: "กรมส่งเสริมการเกษตร",
    sourceUrl: "https://esc.doae.go.th/wp-content/uploads/2021/03/ebook4-2563.pdf",
  },
  {
    id: "agro-processing-sustainable",
    title: "การเกษตรแปรรูป เพิ่มมูลค่าผลผลิต สู่ธุรกิจยั่งยืน",
    summary:
      "แนวทางต่อยอดผลผลิตทางการเกษตรให้เป็นธุรกิจแปรรูปที่ยั่งยืน ตั้งแต่การเลือกวัตถุดิบ กระบวนการผลิต จนถึงการสร้างแบรนด์สินค้าชุมชน",
    category: "แปรรูปผลผลิต",
    keywords: ["เกษตร", "ปลูกผัก", "ผลไม้", "แปรรูป", "ค้าขาย"],
    sourceName: "สำนักงานพัฒนาการวิจัยการเกษตร (สวก.)",
    sourceUrl: "https://www.arda.or.th/detail/6191",
  },
  {
    id: "egg-laying-chicken",
    title: "8 สัตว์เลี้ยง ทำเป็นอาชีพเสริม สร้างรายได้เป็นกอบเป็นกำ",
    summary:
      "การเลี้ยงไก่ไข่ในครัวเรือนใช้เวลาแค่วันละ 1-2 ชั่วโมง ไม่ต้องลงทุนสูง ขายไข่ได้ทุกวัน เหมาะกับผู้สูงอายุ/สมาชิกในครอบครัวช่วยดูแลได้",
    category: "ปศุสัตว์รายย่อย",
    keywords: ["เลี้ยงไก่", "ไก่ไข่", "ปศุสัตว์", "เลี้ยงสัตว์"],
    sourceName: "เทคโนโลยีชาวบ้าน (ข่าวสด)",
    sourceUrl: "https://www.khaosod.co.th/technologychaoban/featured/article_257625",
  },
  {
    id: "tilapia-farming",
    title: "เลี้ยงปลานิลขาย รายได้นับแสนต่อเดือน เลี้ยงง่าย โตไว",
    summary:
      "ตัวอย่างเกษตรกรที่เลี้ยงปลานิลในบ่อขนาดเล็กจนสร้างรายได้เสริมได้จริง ใช้เวลาเลี้ยงประมาณ 6 เดือนต่อรุ่น",
    category: "ปศุสัตว์รายย่อย",
    keywords: ["เลี้ยงปลา", "ประมง", "ปศุสัตว์", "เลี้ยงสัตว์"],
    sourceName: "รักบ้านเกิด.com",
    sourceUrl: "https://www.rakbankerd.com/agriculture/millionaire-view.php?id=86",
  },
  {
    id: "otop-community-products",
    title: "OTOP หนึ่งตำบล หนึ่งผลิตภัณฑ์ — พัฒนาสินค้าชุมชน สร้างรายได้",
    summary:
      "โครงการของกรมการพัฒนาชุมชน (หน่วยงานเดียวกับที่ดูแลกองทุน กข.คจ.) ช่วยพัฒนางานฝีมือ/ผลิตภัณฑ์ท้องถิ่นให้ขายได้ทั้งในและต่างประเทศ มีอบรมและช่องทางตลาดรองรับ",
    category: "งานฝีมือ/OTOP",
    keywords: ["หัตถกรรม", "งานฝีมือ", "otop", "ทอผ้า", "จักสาน", "ผลิตภัณฑ์"],
    sourceName: "กรมการพัฒนาชุมชน",
    sourceUrl: "https://cep.cdd.go.th/th/content/page/index/id/1336",
  },
  {
    id: "online-business-krungsri",
    title: "วิธีปั้นธุรกิจขายของออนไลน์ สำหรับมือใหม่ (ฉบับอัปเดต)",
    summary:
      "แนวทางวางแผนธุรกิจขายของออนไลน์อย่างเป็นระบบ ครอบคลุมการหาสินค้า ตั้งราคา และช่องทางเข้าถึงลูกค้า",
    category: "ค้าขาย/ออนไลน์",
    keywords: ["ค้าขาย", "ขายของ", "พ่อค้า", "แม่ค้า", "ออนไลน์"],
    sourceName: "ธนาคารกรุงศรีอยุธยา",
    sourceUrl: "https://www.krungsri.com/th/plearn-plearn/business/sme/online-selling-tips",
  },
  {
    id: "side-jobs-at-home",
    title: "รวมอาชีพเสริมทำเงิน ทำงานที่บ้านได้ รายได้ดี",
    summary:
      "รวมไอเดียอาชีพเสริมที่ทำได้จากที่บ้าน ลงทุนน้อย เหมาะกับผู้ที่มีเวลาว่างระหว่างช่วงเก็บเกี่ยว/รอฤดูกาลใหม่",
    category: "อาชีพเสริมทั่วไป",
    keywords: ["รับจ้าง", "อาชีพเสริม", "ทำที่บ้าน"],
    sourceName: "Chubb ประเทศไทย",
    sourceUrl: "https://www.chubb.com/th-th/articles/personal/15-jobs-that-make-money.html",
  },
];

/** จับคู่ไอเดียอาชีพกับ "สัญญาณ" อาชีพ/โครงการปัจจุบันของครัวเรือน (อาชีพที่ลงทะเบียนไว้, อาชีพในแบบฟอร์มคำร้อง, ชื่อโครงการที่เสนอ) */
export function matchCareerIdeas(signals: (string | null | undefined)[]): {
  matched: CareerIdea[];
  others: CareerIdea[];
} {
  const normalizedSignals = signals.filter((s): s is string => Boolean(s && s.trim())).map((s) => s.toLowerCase());
  const matched: CareerIdea[] = [];
  const others: CareerIdea[] = [];

  for (const idea of CAREER_IDEAS) {
    const isMatch = idea.keywords.some((keyword) => {
      const kw = keyword.toLowerCase();
      return normalizedSignals.some((sig) => sig.includes(kw) || kw.includes(sig));
    });
    (isMatch ? matched : others).push(idea);
  }

  return { matched, others };
}
