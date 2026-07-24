// ลิงก์เปิด Google Maps แบบมาตรฐาน (Google Maps URLs) — ไม่ต้องใช้ API key/บัตรเครดิตใดๆ ทั้งสิ้น
// ใช้เพื่อ (1) ค้นหาสถานที่จริงตามคำค้น เช่น "ธนาคาร ใกล้ ตำบล..." (2) นำทางไปยังพิกัดที่ทราบแน่นอนแล้ว
// อ้างอิง: https://developers.google.com/maps/documentation/urls/get-started

/** เปิดผลค้นหาจริงจาก Google Maps ตามคำค้น (ใช้เมื่อเรามีแค่ชื่อ/พื้นที่ ไม่มีพิกัดแม่นยำ) */
export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** เปิดเส้นทางนำทางไปยังพิกัดที่ทราบแน่นอน (ใช้เมื่อมีละติจูด/ลองจิจูดจริงแล้ว เช่น หมุดบนแผนที่) */
export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
