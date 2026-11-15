import { createHmac, timingSafeEqual } from 'node:crypto';
export function verifyWebhook(id: string, requestId: string, signature: string, secret: string) {
 const parts = Object.fromEntries(signature.split(',').map(p => p.trim().split('=')));
 if (!parts.ts || !parts.v1 || !requestId || !/^\d+$/.test(parts.ts)) return false;
 const ms = Number(parts.ts) * (parts.ts.length <= 10 ? 1000 : 1);
 if (Math.abs(Date.now() - ms) > 10 * 60 * 1000) return false;
 const expected = createHmac('sha256', secret).update(`id:${id.toLowerCase()};request-id:${requestId};ts:${parts.ts};`).digest('hex');
 return parts.v1.length === expected.length && timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));
}
export async function mp(path: string, method = 'GET', body?: unknown, key?: string) {
 if (!process.env.MERCADOPAGO_ACCESS_TOKEN) throw new Error('O Pix ainda não foi configurado pela atlética.');
 const response = await fetch(`https://api.mercadopago.com${path}`, { method, headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`, 'Content-Type': 'application/json', ...(key ? { 'X-Idempotency-Key': key } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000), cache: 'no-store' });
 if (!response.ok) { console.error('Payment provider HTTP', response.status); throw new Error('Não foi possível consultar o Pix. Tente novamente em instantes.'); }
 return response.json();
}
