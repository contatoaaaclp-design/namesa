const assert = require('node:assert/strict');
(async () => {
 for (const path of ['/', '/manifest.webmanifest', '/sw.js', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/offline.html']) {
  const response = await fetch('http://localhost:3000' + path);
  assert.equal(response.status, 200, path);
  if (path === '/') assert.match(await response.text(), /A comida é com a gente/);
  if (path === '/manifest.webmanifest') { const manifest = await response.json(); assert.equal(manifest.display, 'standalone'); assert.equal(manifest.icons.length, 2); }
  console.log('OK', path);
 }
 for (const path of ['/api/orders', '/api/admin/orders', '/api/cron/expire']) { const response = await fetch('http://localhost:3000' + path); assert.equal(response.status, 401); console.log('PROTECTED', path); }
 const response = await fetch('http://localhost:3000/api/webhooks/mercadopago?data.id=123', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
 assert.equal(response.status, 401); console.log('PROTECTED webhook');
})().catch(e => { console.error(e); process.exitCode = 1; });
