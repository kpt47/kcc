// กล่องโต้ตอบยืนยันก่อนทำธุรกรรมที่มีความเสี่ยง (ลบ/ระงับบัญชี, พิจารณาคำร้อง, แก้ไข/ลบรายการบัญชี)
// import แบบ dynamic เฉพาะตอนเรียกใช้งานจริง (ไม่ import ที่ระดับบนของไฟล์) เพื่อไม่ให้ sweetalert2
// ถูกโหลด/ประเมินระหว่าง server-side rendering ของ Next.js — ปลอดภัยเพราะฟังก์ชันนี้ถูกเรียกจาก
// event handler ฝั่ง client เท่านั้น (หลัง user ปฏิสัมพันธ์กับหน้าเว็บแล้ว)

export type ConfirmDialogOptions = {
  title: string;
  text: string;
  /** "danger" = ปุ่มยืนยันสีแดง ใช้กับการลบ/ระงับ/แก้ไขที่กระทบยอดเงิน — "question" = สีเขียวปกติ */
  tone?: "danger" | "question";
  confirmButtonText?: string;
};

export async function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  const Swal = (await import("sweetalert2")).default;
  const danger = options.tone === "danger";
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    icon: danger ? "warning" : "question",
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText ?? "ยืนยัน",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: danger ? "#dc2626" : "#059669",
    cancelButtonColor: "#64748b",
    reverseButtons: true,
  });
  return result.isConfirmed;
}

/**
 * Toast แจ้งเตือนมุมขวาบน (ไม่บล็อกหน้าจอ ไม่ต้องกดยืนยัน หายไปเองใน 4 วิ) — ใช้แจ้ง Access Denied
 * เมื่อ Route Guard (src/proxy.ts) เด้งกลับมาที่ /dashboard?denied=1 เพราะเข้าหน้าที่ไม่มีสิทธิ์
 */
export async function errorToast(message: string): Promise<void> {
  const Swal = (await import("sweetalert2")).default;
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
  });
  await Toast.fire({ icon: "error", title: message });
}

/** Popup แจ้งเตือนแบบปุ่มเดียว (ไม่มีปุ่มยกเลิก) — ใช้เมื่อเป็นข้อผิดพลาดที่ต้องแก้ไขก่อนเท่านั้น ไม่ใช่การถามยืนยันว่าจะดำเนินการต่อหรือไม่ */
export async function alertDialog(options: { title: string; text: string; tone?: "danger" | "question" }): Promise<void> {
  const Swal = (await import("sweetalert2")).default;
  const danger = options.tone === "danger";
  await Swal.fire({
    title: options.title,
    text: options.text,
    icon: danger ? "warning" : "info",
    confirmButtonText: "ตกลง",
    confirmButtonColor: danger ? "#dc2626" : "#059669",
  });
}

/** Popup แจ้งผลสำเร็จตรงกลางหน้าจอ (ต้องกดตกลงเพื่อปิด) — ใช้หลังบันทึกข้อมูลสำเร็จในฟอร์มที่กรอกต่อเนื่องหลายรายการ */
export async function successAlert(message: string): Promise<void> {
  const Swal = (await import("sweetalert2")).default;
  await Swal.fire({
    icon: "success",
    title: message,
    confirmButtonText: "ตกลง",
    confirmButtonColor: "#059669",
  });
}
