"use client";

import { useEffect, useState } from "react";

// จำว่ากลุ่มเมนูไหน "เปิด" อยู่ (เปิดได้ทีละ 1 กลุ่มเท่านั้น — เปิดกลุ่มใหม่จะพับกลุ่มเดิมลงอัตโนมัติ เหมือน
// Accordion ทั่วไป) ไว้ใน localStorage ของเบราว์เซอร์ ให้คงอยู่ข้ามการเข้าชมหน้าเว็บ — ไม่ผูกกับ user โดยเฉพาะ
// (ใช้ key เดียวทั้งเครื่อง) เพราะเป็นแค่ความชอบด้าน UI ไม่ใช่ข้อมูลที่ต้องแยกความเป็นส่วนตัวระหว่างบัญชี
const STORAGE_KEY = "kkc_nav_open_group";

/**
 * @param activeGroup กลุ่มที่มีเมนูของหน้าปัจจุบันอยู่ (ถ้ามี) — ใช้เป็นค่าเริ่มต้นตอนเข้าใช้ครั้งแรก (ยังไม่มี
 * ค่าจำไว้ใน localStorage) เพื่อไม่ให้เมนูที่กำลังใช้งานอยู่หายไปจากสายตาโดยไม่ได้ตั้งใจ — หลังจากนั้นผู้ใช้
 * กดพับ/กางเองได้อิสระ ค่าที่กดจะถูกจำไว้แทนค่าเริ่มต้นนี้
 */
export function useNavAccordion(activeGroup: string | null) {
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setOpenGroup(stored === "" ? null : stored);
    } catch {
      // localStorage อาจถูกปิด (โหมดส่วนตัว/นโยบายองค์กร) — ปล่อยให้ใช้ค่าเริ่มต้น (activeGroup) ต่อไปตามปกติ
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(group: string) {
    setOpenGroup((prev) => {
      const next = prev === group ? null : group;
      try {
        localStorage.setItem(STORAGE_KEY, next ?? "");
      } catch {
        // เขียนไม่ได้ก็ไม่เป็นไร แค่ไม่จำสถานะข้ามครั้งถัดไป ยังใช้งาน Accordion รอบนี้ได้ปกติ
      }
      return next;
    });
  }

  return { openGroup, toggle };
}
