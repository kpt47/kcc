# คู่มือ Deploy ขึ้น Vercel (ฟรี, host ถาวร, ไม่ต้อง SSH/nginx)

เส้นทางนี้ย้ายฐานข้อมูลจาก SQLite ไป Postgres (Neon) และย้ายไฟล์อัปโหลดไป Vercel Blob เพื่อให้ใช้งานได้ตรงกับ
ธรรมชาติของ Vercel (serverless, ไม่มีดิสก์ถาวรของตัวเอง) — โค้ดฝั่งแอปเตรียมไว้พร้อมรองรับทั้งสองแบบแล้ว
(ทำงานได้ทั้งบน Vercel และบนเครื่อง dev/VPS เดิม)

## ขั้นตอนที่ 1: สมัคร Neon (Postgres ฟรี)

1. สมัครที่ https://neon.tech (ฟรี ไม่ต้องใช้บัตร)
2. สร้าง Project ใหม่ 1 อัน แล้วคัดลอก **Connection string** (จะขึ้นต้นด้วย `postgresql://...`)
3. ส่ง connection string นี้กลับมาให้ผม (หรือใส่ในไฟล์ `.env` ของคุณเองที่ `DATABASE_URL=`) ผมจะใช้สลับ
   `prisma/schema.prisma` จาก `sqlite` เป็น `postgresql` และสร้าง migration ชุดใหม่ให้ตรงกับฐานข้อมูลจริง

## ขั้นตอนที่ 2: Push โค้ดขึ้น GitHub

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

## ขั้นตอนที่ 3: สมัคร Vercel และ import โปรเจกต์

1. สมัคร/ล็อกอินที่ https://vercel.com (ใช้บัญชี GitHub สมัครได้เลย ฟรี)
2. **Add New → Project** แล้วเลือก repo ที่ push ไปขั้นตอนที่ 2
3. Framework Preset จะตรวจเจอ Next.js อัตโนมัติ ไม่ต้องแก้อะไร

## ขั้นตอนที่ 4: เพิ่ม Neon Postgres integration

ใน Vercel Dashboard ของโปรเจกต์ → **Storage → Connect Store → Neon (Postgres)** → เลือก Project ที่สร้างไว้
ขั้นตอนที่ 1 — Vercel จะใส่ตัวแปร `DATABASE_URL` ให้อัตโนมัติ (ไม่ต้องกรอกเอง)

## ขั้นตอนที่ 5: เพิ่ม Vercel Blob (เก็บไฟล์อัปโหลด)

**Storage → Connect Store → Blob** → สร้าง Store ใหม่ — Vercel จะใส่ตัวแปร `BLOB_READ_WRITE_TOKEN` ให้อัตโนมัติ

## ขั้นตอนที่ 6: ตั้งค่าตัวแปรแวดล้อมเพิ่มเติม

ไปที่ **Settings → Environment Variables** เพิ่ม:

| ตัวแปร | ค่า | จำเป็นไหม |
|---|---|---|
| `CRON_SECRET` | สุ่มสตริงยาวๆ เอง (เช่น `openssl rand -hex 32`) | แนะนำให้ตั้ง — ป้องกันคนนอกยิง endpoint cron เอง |
| `PUPPETEER_SKIP_DOWNLOAD` | `1` | **จำเป็น** — ไม่งั้น build จะพยายามโหลด Chromium เต็มขนาด (~170MB) โดยไม่จำเป็น |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` | ค่าจริงจากผู้ให้บริการอีเมล | ไม่จำเป็น (ไม่ตั้ง = mock) |
| `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | จาก Cloudflare Turnstile | ไม่จำเป็น (ไม่ตั้ง = ข้าม CAPTCHA) |
| `LINE_CHANNEL_ID`/`LINE_CHANNEL_SECRET`/`LINE_CHANNEL_ACCESS_TOKEN`/`LINE_LOGIN_REDIRECT_URI` | จาก LINE Developers Console | ไม่จำเป็น (ไม่ตั้ง = mock) |

## ขั้นตอนที่ 7: Deploy

กด **Deploy** ใน Vercel — ระบบจะ build และ deploy อัตโนมัติ (และ deploy อัตโนมัติทุกครั้งที่ `git push` ขึ้น `main` ต่อจากนี้)

## ขั้นตอนที่ 8: รัน migration บนฐานข้อมูลจริง (ครั้งแรกเท่านั้น)

หลัง deploy ครั้งแรกสำเร็จ รันคำสั่งนี้จากเครื่องคุณเอง (ชี้ไปที่ DATABASE_URL ของ Neon จริง ผ่านไฟล์ `.env`):

```bash
npx prisma migrate deploy
npm run seed   # ไม่บังคับ — สร้างผู้ใช้ทดสอบ 8 ระดับ
```

## หมายเหตุสำหรับ dev ในเครื่องหลังจากนี้

เมื่อ `prisma/schema.prisma` เปลี่ยนเป็น `postgresql` แล้ว การรัน `npm run dev` ในเครื่องคุณเองก็ต้องชี้ไปที่
ฐานข้อมูล Postgres จริงด้วย (ไม่ใช่ไฟล์ SQLite ในเครื่องอีกต่อไป) — ใส่ `DATABASE_URL` เดียวกัน (หรือสร้าง
Neon branch แยกสำหรับ dev ภายหลังถ้าต้องการแยกข้อมูลทดสอบออกจากข้อมูลจริง) ในไฟล์ `.env`
