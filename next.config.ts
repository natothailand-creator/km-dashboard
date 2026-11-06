import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  // ให้ไฟล์ข้อมูลเข้ารหัสถูกรวมไปกับ Deploy (อ่านด้วย fs ตอนรัน)
  outputFileTracingIncludes: { '/**/*': ['./data/km.enc'] },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      { key: 'Cache-Control', value: 'private, no-store' },
      { key: 'X-Frame-Options', value: 'DENY' },
    ] }];
  },
};
export default config;
