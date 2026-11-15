import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuth, db } from '@/lib/firebase-admin';
import { checkout, syncPayment, expireOrder, inspectTicket, announce } from '@/lib/server';
import { menuSchema } from '@/lib/domain';
import { EfiError } from '@/lib/payments';
import { verifyEfiWebhookToken, validTxid } from '@/lib/efi-domain';
import type { Order } from '@/lib/types';
export const runtime = 'nodejs';
export const maxDuration = 60;
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
 try {
  const path = (await ctx.params).path.join('/');
  if ((path === 'webhooks/efi' || path === 'webhooks/efi/pix') && req.method === 'POST') {
   const secret = process.env.EFI_WEBHOOK_SECRET || '';
   const supplied = req.nextUrl.searchParams.get('hmac') || '';
   if (!verifyEfiWebhookToken(supplied,secret)) return json({error:'Não autorizado.'},401);
   if (process.env.VERCEL === '1') {
    const allowed = (process.env.EFI_WEBHOOK_ALLOWED_IPS || '34.193.116.226').split(',').map(ip=>ip.trim());
    const ip = req.headers.get('x-forwarded-for')?.trim();
    if (!ip || !allowed.includes(ip)) return json({error:'Origem não autorizada.'},403);
   }
   const raw = await req.text();
   if (raw.length > 65536) return json({error:'Notificação muito grande.'},413);
   if (!raw.trim()) return json({received:true}); // Registration probe has no Pix payload.
   const body = z.object({pix:z.array(z.object({txid:z.string().optional()})).max(20).optional()}).parse(JSON.parse(raw));
   for(const id of new Set((body.pix || []).map(p=>p.txid).filter((id):id is string=>Boolean(id && validTxid(id))))) await syncPayment(id);
   return json({received:true});
  }
  if (path === 'cron/expire' && req.method === 'GET') {
   if (!process.env.CRON_SECRET || req.headers.get('authorization') !== 'Bearer '+process.env.CRON_SECRET) return json({error:'Não autorizado.'},401);
   const pending=await db().collection('orders').where('status','==','pending').where('expiresAt','<',new Date().toISOString()).limit(50).get();
   let checked=0;let unresolved=0;const started=Date.now();
   for(const doc of pending.docs){
    if(Date.now()-started>35000)break;
    checked++;
    try{if(!await expireOrder(doc.id))unresolved++;}catch{unresolved++;}
   }
   return json({checked,unresolved,remaining:pending.size-checked});
  }
  if (path === 'menus' && req.method === 'GET') {
   const docs = await db().collection('menus').get(); return json(docs.docs.map(d => ({ ...d.data(), id: d.id })));
  }
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return json({ error: 'Entre na sua conta para continuar.' }, 401);
  const user = await adminAuth().verifyIdToken(token, true);
  const isAdmin = user.admin === true;
  if (path.startsWith('admin/') && !isAdmin) return json({ error: 'Acesso exclusivo da atlética.' }, 403);
  const body = req.method === 'POST' ? await req.json() : {};
  if (path === 'me') return json({ uid: user.uid, name: user.name || 'Atleta', email: user.email, admin: isAdmin, paymentSandbox: process.env.EFI_SANDBOX !== 'false' });
  if (path === 'orders' && req.method === 'GET') {
   const docs = await db().collection('orders').where('uid', '==', user.uid).get();
   return json(docs.docs.filter(d=>d.data().paymentProvider!=='efi' || d.data().paymentEnvironment===(process.env.EFI_SANDBOX==='false'?'production':'sandbox')).map(d => { const o = d.data() as Order; return { ...o, token: o.status === 'paid' ? o.token : '' }; }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
  }
  if (path === 'orders' && req.method === 'POST') { const order = await checkout(user, body); return json({ ...order, token: order.status === 'paid' ? order.token : '' }); }
  if (path === 'orders/retry' && req.method === 'POST') {
   const data = z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/), cpf: z.string().regex(/^\d{11}$/) }).parse(body);
   const old = (await db().collection('orders').doc(data.id).get()).data() as Order;
   if (!old || old.uid !== user.uid) return json({ error: 'Pedido não encontrado.' }, 404);
   const order = await checkout(user, { requestId: old.id.slice(user.uid.length + 1), items: old.items.map(i => ({ menuId: i.menuId, quantity: i.quantity })), cpf: data.cpf, note: old.note });
   return json({ ...order, token: order.status === 'paid' ? order.token : '' });
  }
  if (path === 'orders/refresh' && req.method === 'POST') {
   const { id } = z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/) }).parse(body);
   const order = (await db().collection('orders').doc(id).get()).data() as Order;
   if (!order || order.uid !== user.uid) return json({ error: 'Pedido não encontrado.' }, 404);
   if (order.paymentProvider !== 'efi' || !order.paymentId) throw new Error('Pedido da integração anterior: procure a atlética.');
   await syncPayment(order.paymentId);
   return json({ ok: true });
  }
  if (path === 'notices' && req.method === 'GET') { const docs = await db().collection('notices').where('uid', '==', user.uid).get(); return json(docs.docs.map(d => ({ ...d.data(), id: d.id }))); }
  if (path === 'push' && req.method === 'POST') { const { token: pushToken } = z.object({ token: z.string().min(20).max(1000).regex(/^[A-Za-z0-9:_-]+$/) }).parse(body); await db().collection('users').doc(user.uid).collection('tokens').doc(pushToken).set({ createdAt: new Date().toISOString() }); return json({ ok: true }); }
  if (path === 'admin/orders' && req.method === 'GET') { const docs = await db().collection('orders').get(); return json(docs.docs.filter(d=>d.data().paymentProvider!=='efi' || d.data().paymentEnvironment===(process.env.EFI_SANDBOX==='false'?'production':'sandbox')).map(d => { const { token: _token, pix: _pix, pixImage: _img, ...o } = d.data(); return o; })); }
  if (path === 'admin/menus' && req.method === 'POST') {
   const data = menuSchema.parse(body); const { id, ...menu } = data;
   if (Date.parse(menu.deadline) > Date.parse(`${menu.date}T23:59:59-03:00`)) throw new Error('O prazo precisa estar até o dia da refeição.');
   const ref = id ? db().collection('menus').doc(id) : db().collection('menus').doc();
   await db().runTransaction(async tx => { const old = await tx.get(ref); if (old.exists && menu.capacity < old.data()!.reserved) throw new Error('A capacidade não pode ser menor que as reservas.'); if (old.exists && old.data()!.reserved > 0 && (old.data()!.date !== menu.date || old.data()!.meal !== menu.meal)) throw new Error('Não altere a data ou refeição após receber pedidos.'); tx.set(ref, { ...menu, reserved: old.data()?.reserved || 0, ready: old.data()?.ready || false }); });
   return json({ id: ref.id });
  }
  if (path === 'admin/announce' && req.method === 'POST') { const { menuId } = z.object({ menuId: z.string().regex(/^[a-zA-Z0-9_-]+$/) }).parse(body); return json(await announce(menuId)); }
  if (path === 'admin/ticket' && req.method === 'POST') { const data = z.object({ code: z.string().max(400), collect: z.boolean().default(false) }).parse(body); return json(await inspectTicket(data.code, data.collect, user.uid)); }
  return json({ error: 'Rota não encontrada.' }, 404);
 } catch (error) {
  if (error instanceof EfiError) return json({error:error.message},502);
  if (req.nextUrl.pathname.startsWith('/api/webhooks/efi') && !(error instanceof z.ZodError) && !(error instanceof SyntaxError)) return json({error:'Falha temporária ao conciliar o Pix.'},503);
  if (error instanceof SyntaxError) return json({error:'JSON inválido.'},400);
  if (error instanceof z.ZodError) return json({ error: error.issues[0]?.message || 'Dados inválidos.' }, 400);
  const code = (error as { code?: string }).code;
  if (code?.startsWith('auth/')) return json({ error: 'Sua sessão expirou. Entre novamente.' }, 401);
  console.error('API failure:', error instanceof Error ? error.message : 'unknown');
  return json({ error: error instanceof Error ? error.message : 'Não foi possível concluir a operação.' }, 400);
 }
}
export const GET = handle;
export const POST = handle;

