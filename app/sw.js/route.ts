import { firebaseConfig } from '@/lib/firebase-client';
export const dynamic = 'force-dynamic';
export function GET() {
 const config = JSON.stringify(firebaseConfig);
 const source = `
const CACHE='inter-offline-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.add('/offline.html')));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')))}});
${process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? `importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js','https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js');firebase.initializeApp(${config});firebase.messaging();` : ''}
`;
 return new Response(source, { headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' } });
}
