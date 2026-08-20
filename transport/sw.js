/* service worker ของเกม "ด่านศุลกากรเซลล์"
   - แคชไฟล์ของเกมไว้ให้เล่นซ้ำได้แม้ออฟไลน์
   - คำขอไปยัง Supabase (ระบบชั้นเรียน) จะไม่ถูกแคช ให้วิ่งผ่านเครือข่ายตามปกติ
   หมายเหตุ: เวลาแก้ index.html แล้ว ให้เปลี่ยนเลข CACHE ด้านล่างหนึ่งครั้ง
             เพื่อให้เครื่องนักเรียนดึงเวอร์ชันใหม่ */
const CACHE = 'transport-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './favicon-32.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './logo.png',
  './cert-bg.png',
  
  './imag/bg.webp',
  './imag/stage-memb.webp',
  './imag/stage-pass.webp',
  './imag/stage-osmo.webp',
  './imag/stage-ways.webp',
  './imag/stage-pump.webp',
  './imag/stage-boss.webp'
];
self.addEventListener('install', e=>{
  e.waitUntil((async ()=>{
    const c = await caches.open(CACHE);
    // แคชทีละไฟล์ ไฟล์ไหนยังไม่มีก็ข้ามไป ไม่ทำให้การติดตั้งล้มเหลว
    await Promise.all(ASSETS.map(u=>c.add(u).catch(()=>{})));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e=>{
  e.waitUntil((async ()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;                       // POST ของระบบชั้นเรียน → ผ่านไปเลย
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;             // ไฟล์ข้ามโดเมน → ไม่แคช
  // หน้าเว็บ (index.html): เอาจากเน็ตก่อนเสมอ เพื่อให้ได้เวอร์ชันล่าสุดทันทีที่ครูอัปเดตเกม
  // ถ้าออฟไลน์ค่อยใช้ของที่แคชไว้ — ส่วนไฟล์อื่น (รูป ไอคอน) ยังใช้แคชก่อนเพื่อความเร็ว
  if(req.mode === 'navigate' || req.destination === 'document'){
    e.respondWith((async ()=>{
      try{
        const fresh = await fetch(req);
        if(fresh && fresh.ok) (await caches.open(CACHE)).put(req, fresh.clone());
        return fresh;
      }catch(err){
        return (await caches.match(req)) || (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }
  e.respondWith((async ()=>{
    const cached = await caches.match(req);
    if(cached){
      // มีในแคชแล้ว: ใช้ทันที แล้วอัปเดตเบื้องหลัง
      fetch(req).then(res=>{
        if(res && res.ok) caches.open(CACHE).then(c=>c.put(req, res.clone()));
      }).catch(()=>{});
      return cached;
    }
    try{
      const res = await fetch(req);
      if(res && res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    }catch(err){
      // ออฟไลน์และไม่มีในแคช: ถ้าเป็นการเปิดหน้าเว็บ ให้ส่งหน้าเกมกลับไป
      if(req.mode === 'navigate'){
        const fallback = await caches.match('./index.html');
        if(fallback) return fallback;
      }
      throw err;
    }
  })());
});
