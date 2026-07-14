// กำหนดค่าให้ PM2 รันแอปนี้เป็น production process ที่ auto-restart เมื่อ crash หรือเมื่อเซิร์ฟเวอร์รีบูต
// ใช้งาน: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "kkc-webapp",
      script: "npm",
      args: "start",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
