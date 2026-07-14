// ธีมสีของแต่ละเมนู อ้างอิงจากสีปกสมุดบัญชี กข.คจ. ทั้ง 4 เล่ม เพื่อให้ผู้ใช้เดิมที่คุ้นเคยกับ
// สมุดบัญชีกระดาษจดจำได้ง่าย (เล่มม่วง/น้ำตาล/เขียว/เหลือง)
// หมายเหตุ: ต้องเขียน class เป็น string เต็มรูปแบบ (ห้ามต่อ string แบบ `bg-${x}-600`) เพราะ Tailwind
// จะสแกนหา class แบบตัวอักษรตรงตัวในซอร์สโค้ดเท่านั้น (ไม่รองรับ dynamic class name)
//
// ทุกฟิลด์แนบ dark: ไว้ในตัวเองแล้ว (ไม่แยกเป็น darkCardBg/darkBadgeText ต่างหาก) เพื่อให้ component ที่ใช้
// THEMES.xxx.cardBg ทั่วทั้งแอปรองรับ Dark Mode ทันทีโดยไม่ต้องแก้โค้ดผู้เรียกใช้แม้แต่จุดเดียว — ในโหมดมืด
// ใช้โทนพาสเทลอ่อนลง (ตัวเลขเฉดสูงขึ้น + สีพื้นหลังโปร่งแสงเข้ม) แทนสีสดเต็มโทนแบบโหมดสว่าง เพื่อไม่ให้แสบตา
// และยังคงแยกแยะสีของแต่ละเล่มออกจากกันได้ชัดเจนแม้บนพื้นหลังเข้ม
import type { LucideIcon } from "lucide-react";
import { Users, ClipboardList, Landmark, Banknote } from "lucide-react";

export type ThemeKey = "purple" | "brown" | "green" | "yellow";

export interface Theme {
  bookLabel: string; // เช่น "เล่ม 7 · สีม่วง"
  cardBg: string;
  cardBorder: string;
  cardHoverBorder: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
  icon: LucideIcon;
  headingText: string;
  chipBg: string;
  chipText: string;
}

export const THEMES: Record<ThemeKey, Theme> = {
  purple: {
    bookLabel: "เล่ม 7 · สีม่วง",
    cardBg: "bg-violet-50 dark:bg-violet-950/40",
    cardBorder: "border-violet-200 dark:border-violet-800",
    cardHoverBorder: "hover:border-violet-400 dark:hover:border-violet-600",
    badgeBg: "bg-violet-100 dark:bg-violet-900/60",
    badgeText: "text-violet-800 dark:text-violet-300",
    iconBg: "bg-violet-600 dark:bg-violet-700",
    icon: Users,
    headingText: "text-violet-900 dark:text-violet-200",
    chipBg: "bg-violet-600 dark:bg-violet-700",
    chipText: "text-white",
  },
  brown: {
    bookLabel: "เล่ม 6 · สีน้ำตาล",
    cardBg: "bg-[#FBF4EC] dark:bg-[#3A2C1E]/50",
    cardBorder: "border-[#E4CBA3] dark:border-[#6B4F30]",
    cardHoverBorder: "hover:border-[#B0783C] dark:hover:border-[#9C7748]",
    badgeBg: "bg-[#F1E0C4] dark:bg-[#5A4426]/70",
    badgeText: "text-[#6B4423] dark:text-[#D2AD7C]",
    iconBg: "bg-[#8B5E34] dark:bg-[#8B5E34]",
    icon: ClipboardList,
    headingText: "text-[#5A3A1E] dark:text-[#E4CBA3]",
    chipBg: "bg-[#8B5E34] dark:bg-[#8B5E34]",
    chipText: "text-white",
  },
  green: {
    bookLabel: "เล่ม 8 · สีเขียว",
    cardBg: "bg-emerald-50 dark:bg-emerald-950/40",
    cardBorder: "border-emerald-200 dark:border-emerald-800",
    cardHoverBorder: "hover:border-emerald-400 dark:hover:border-emerald-600",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/60",
    badgeText: "text-emerald-800 dark:text-emerald-300",
    iconBg: "bg-emerald-600 dark:bg-emerald-700",
    icon: Landmark,
    headingText: "text-emerald-900 dark:text-emerald-200",
    chipBg: "bg-emerald-600 dark:bg-emerald-700",
    chipText: "text-white",
  },
  yellow: {
    bookLabel: "เล่ม 9 · สีเหลือง",
    cardBg: "bg-amber-50 dark:bg-amber-950/40",
    cardBorder: "border-amber-200 dark:border-amber-800",
    cardHoverBorder: "hover:border-amber-400 dark:hover:border-amber-600",
    badgeBg: "bg-amber-100 dark:bg-amber-900/60",
    badgeText: "text-amber-900 dark:text-amber-300",
    iconBg: "bg-amber-500 dark:bg-amber-600",
    icon: Banknote,
    headingText: "text-amber-900 dark:text-amber-200",
    chipBg: "bg-amber-500 dark:bg-amber-600",
    chipText: "text-amber-950 dark:text-amber-50",
  },
};
