"use client";

import { useEffect, useState } from "react";

// จำสถานะพับ/กางของแต่ละกลุ่มเมนู (สมุดบัญชี 4 เล่ม/แบบฟอร์มและเอกสาร/รายงานและค้นหา/ผู้ดูแลระบบ) ไว้ใน
// localStorage ของเบราว์เซอร์ ให้คงอยู่ข้ามการเข้าชมหน้าเว็บ — ไม่ผูกกับ user โดยเฉพาะ (ใช้ key เดียวทั้งเครื่อง)
// เพราะเป็นแค่ความชอบด้าน UI ไม่ใช่ข้อมูลที่ต้องแยกความเป็นส่วนตัวระหว่างบัญชี ค่าเริ่มต้น (ไม่มีใน storage)
// คือ "กางไว้" ทุกกลุ่มเหมือนพฤติกรรมเดิมก่อนมี Accordion เพื่อไม่ให้ผู้ใช้เดิมรู้สึกว่าเมนูหายไปกะทันหัน
const STORAGE_KEY = "kkc_nav_collapsed_groups";

export function useNavAccordion() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCollapsed(JSON.parse(raw));
    } catch {
      // localStorage อาจถูกปิด (โหมดส่วนตัว/นโยบายองค์กร) — ปล่อยให้ทุกกลุ่มกางไว้เป็นค่าเริ่มต้นตามปกติ
    }
  }, []);

  function toggle(group: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [group]: !prev[group] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // เขียนไม่ได้ก็ไม่เป็นไร แค่ไม่จำสถานะข้ามครั้งถัดไป ยังใช้งาน Accordion รอบนี้ได้ปกติ
      }
      return next;
    });
  }

  return { collapsed, toggle };
}
