# คู่มือ Deploy ขึ้นเซิร์ฟเวอร์จริง (Oracle Cloud Always Free)

ระบบนี้ใช้ SQLite และเก็บไฟล์อัปโหลดไว้ในเครื่อง จึงต้องรันบนเซิร์ฟเวอร์ที่มีดิสก์ถาวรและโปรเซสรันตลอดเวลา
(ไม่ใช่ serverless) คู่มือนี้ใช้ Oracle Cloud "Always Free" เพราะฟรีตลอดไป ไม่มีวันหมดอายุ

## ขั้นตอนที่ 1: สมัคร Oracle Cloud และสร้างเครื่อง (ทำเอง)

1. สมัครที่ https://signup.oraclecloud.com (ต้องใช้บัตรเครดิตยืนยันตัวตน แต่จะไม่ถูกเรียกเก็บเงินถ้าอยู่ในโควตา Always Free)
2. หลังเข้า Console แล้ว ไปที่ **Compute → Instances → Create Instance**
3. เลือก:
   - **Image**: Ubuntu 22.04 (หรือ 24.04)
   - **Shape**: เลือกแบบ "Always Free eligible" — แนะนำ `VM.Standard.A1.Flex` (ARM Ampere, ปรับ OCPU/RAM ได้ถึง 4 OCPU / 24GB RAM ฟรี) หรือ `VM.Standard.E2.1.Micro` (AMD, เล็กกว่า)
   - **Add SSH key**: ให้สร้างหรืออัปโหลด public key ของคุณเอง (เก็บ private key ไว้ให้ดี ใช้ต่อในขั้นตอน SSH)
4. กด Create รอสักครู่จนสถานะเป็น Running แล้วจด **Public IP** ไว้
5. ไปที่ **Networking → Virtual Cloud Networks → (VCN ของเครื่องนี้) → Security Lists** เปิดพอร์ต 80 และ 443 (Ingress Rule, source 0.0.0.0/0, TCP)

## ขั้นตอนที่ 2: เตรียมเครื่องเซิร์ฟเวอร์ (SSH เข้าไปรัน)

```bash
ssh -i /path/to/private_key ubuntu@<PUBLIC_IP>

# ติดตั้ง Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx

# ติดตั้ง PM2 (ตัวจัดการโปรเซส ทำให้แอป auto-restart เมื่อ crash หรือรีบูตเครื่อง)
sudo npm install -g pm2

# ติดตั้ง certbot (ขอ HTTPS ฟรีจาก Let's Encrypt — ทำได้เมื่อมีโดเมนชี้มาที่ IP นี้แล้ว)
sudo apt-get install -y certbot python3-certbot-nginx
```

## ขั้นตอนที่ 3: นำโค้ดขึ้นเซิร์ฟเวอร์

แนะนำให้ push โค้ดขึ้น GitHub (private repo ก็ได้) ก่อน แล้ว clone ลงเซิร์ฟเวอร์ — ทำให้ deploy ครั้งต่อไปทำแค่ `git pull`

```bash
git clone https://github.com/<your-username>/<your-repo>.git kkc-webapp
cd kkc-webapp
```

## ขั้นตอนที่ 4: ตั้งค่าและติดตั้ง

```bash
cp .env.production.example .env
nano .env   # กรอกค่าที่ต้องการ (ไม่กรอกก็ยังใช้งานได้ แค่ฟีเจอร์นั้นจะ mock)

npm ci
npx prisma migrate deploy   # สร้างตารางฐานข้อมูลจาก migrations ที่มีอยู่
npx prisma generate

# (ไม่บังคับ) สร้างข้อมูลผู้ใช้ทดสอบ 8 ระดับ + ข้อมูลจำลอง
npm run seed
```

## ขั้นตอนที่ 5: Build และรันด้วย PM2

```bash
npm run build
pm2 start ecosystem.config.js
pm2 save            # จำสถานะไว้
pm2 startup         # ทำตามคำสั่งที่ pm2 แสดงผล เพื่อให้ auto-start ตอนเครื่องรีบูต
```

## ขั้นตอนที่ 6: ตั้งค่า nginx + HTTPS

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/kkc-webapp
sudo nano /etc/nginx/sites-available/kkc-webapp   # แก้ server_name เป็นโดเมนหรือ IP จริง
sudo ln -s /etc/nginx/sites-available/kkc-webapp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# ถ้ามีโดเมนชี้มาที่ IP นี้แล้ว ขอ HTTPS ฟรี:
sudo certbot --nginx -d your-domain.example.com
```

ถ้ายังไม่มีโดเมน จะเข้าผ่าน `http://<PUBLIC_IP>` ไปก่อนได้ (ยังไม่มี HTTPS)

## ขั้นตอนที่ 7: ตรวจสอบ

- เข้า `http://<PUBLIC_IP>` หรือโดเมนที่ตั้งไว้ ควรเห็นหน้าล็อกอิน
- `pm2 logs kkc-webapp` ดู log แบบ real-time
- `pm2 status` ดูว่าโปรเซสยังรันอยู่

## Deploy ครั้งต่อไป (มีโค้ดใหม่)

```bash
cd kkc-webapp
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 restart kkc-webapp
```
