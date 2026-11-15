import { randomBytes } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { db, messaging } from './firebase-admin';
import { checkoutSchema, priceCart, assertCollectable } from './domain';
import { mp } from './payments';
import type { Menu, Order } from './types';
export async function checkout(user: DecodedIdToken, raw: unknown) {
 const data = checkoutSchema.parse(raw);
 if (!process.env.MERCADOPAGO_ACCESS_TOKEN || !process.env.APP_URL?.startsWith('https://')) throw new Error('A atlética precisa configurar o Pix e a URL HTTPS antes de receber pedidos.');
 if (!user.email || !user.email_verified) throw new Error('Entre com uma conta Google com e-mail verificado.');
 const ref = db().collection('orders').doc(`${user.uid}_${data.requestId}`);
 await db().runTransaction(async tx => {
  const existing = await tx.get(ref);
  if (existing.exists) return;
  const pending = await tx.get(db().collection('orders').where('uid', '==', user.uid).where('status', '==', 'pending'));
  if (pending.size >= 3) throw new Error('Você já tem três pagamentos pendentes. Conclua um deles antes de continuar.');
  const docs = await Promise.all(data.items.map(i => tx.get(db().collection('menus').doc(i.menuId))));
  const menus = docs.filter(d => d.exists).map(d => ({ ...d.data(), id: d.id } as Menu));
  const priced = priceCart(menus, data.items);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  if (Date.parse(expiresAt) - now.getTime() < 60000) throw new Error('O prazo está encerrando. Escolha outra refeição.');
  const order: Order = { id: ref.id, uid: user.uid, customer: user.name || user.email!, email: user.email!, createdAt: now.toISOString(), expiresAt, status: 'pending', ...priced, token: randomBytes(32).toString('hex'), note: data.note };
  tx.create(ref, order);
  docs.forEach((doc, i) => tx.update(doc.ref, { reserved: FieldValue.increment(data.items[i].quantity) }));
 });
 const order = (await ref.get()).data() as Order;
 if (order.status !== 'pending' || order.paymentId) return order;
 if (Date.parse(order.expiresAt) <= Date.now()) throw new Error('Este pedido expirou antes de gerar o Pix. Procure a atlética para liberar a reserva.');
 const payment = await mp('/v1/payments', 'POST', { transaction_amount: order.total / 100, description: 'Inter na Mesa • Refeições da delegação', payment_method_id: 'pix', external_reference: order.id, date_of_expiration: order.expiresAt, notification_url: `${process.env.APP_URL}/api/webhooks/mercadopago`, payer: { email: order.email, first_name: order.customer, identification: { type: 'CPF', number: data.cpf } } }, order.id);
 await ref.update({ paymentId: String(payment.id), pix: payment.point_of_interaction?.transaction_data?.qr_code || '', pixImage: payment.point_of_interaction?.transaction_data?.qr_code_base64 || '' });
 await syncPayment(String(payment.id));
 return (await ref.get()).data() as Order;
}
export async function syncPayment(id: string) {
 if (!/^\d+$/.test(id)) throw new Error('Pagamento inválido.');
 const payment = await mp(`/v1/payments/${id}`);
 if (!payment.external_reference || payment.payment_method_id !== 'pix') return;
 const ref = db().collection('orders').doc(payment.external_reference);
 await db().runTransaction(async tx => {
  const doc = await tx.get(ref);
  if (!doc.exists) return;
  const order = doc.data() as Order;
  if ((order.paymentId && order.paymentId !== id) || payment.currency_id !== 'BRL' || Math.round(payment.transaction_amount * 100) !== order.total) throw new Error('Pagamento não corresponde ao pedido.');
  if (payment.status === 'approved') {
   if (order.status === 'pending') tx.update(ref, { status: 'paid', paymentId: id, paidAt: new Date().toISOString() });
   return;
  }
  const failed = ['cancelled', 'rejected', 'refunded', 'charged_back'].includes(payment.status);
  if (failed && (order.status === 'pending' || order.status === 'paid')) {
   const menus = await Promise.all(order.items.map(i => tx.get(db().collection('menus').doc(i.menuId))));
   if (order.status === 'pending') menus.forEach((m, i) => { if (m.exists) tx.update(m.ref, { reserved: Math.max(0, (m.data()?.reserved || 0) - order.items[i].quantity) }); });
   tx.update(ref, { paymentId: id, status: order.status === 'paid' ? 'refunded' : 'expired' });
  }
 });
}
export async function inspectTicket(code: string, collect = false, staff = '') {
 const match = /^INTER:([a-zA-Z0-9_-]+):(\d+):([a-f0-9]{64})$/.exec(code.trim());
 if (!match) throw new Error('QR Code inválido. Use o código de retirada do Inter na Mesa.');
 const [, id, idx, token] = match; const index = Number(idx);
 return db().runTransaction(async tx => {
  const ref = db().collection('orders').doc(id); const doc = await tx.get(ref); const order = doc.data() as Order | undefined;
  if (!order || order.token !== token || !order.items[index]) throw new Error('Código não encontrado.');
  const menu = await tx.get(db().collection('menus').doc(order.items[index].menuId));
  assertCollectable(order, index, menu.data()?.ready === true);
  const item = order.items[index];
  if (collect) { const items = [...order.items]; items[index] = { ...item, collectedAt: new Date().toISOString(), collectedBy: staff }; tx.update(ref, { items }); }
  return { customer: order.customer, item, note: order.note, collected: collect };
 });
}
export async function announce(menuId: string) {
 const ref = db().collection('menus').doc(menuId); const doc = await ref.get();
 if (!doc.exists) throw new Error('Cardápio não encontrado.');
 await ref.update({ ready: true });
 const menu = doc.data() as Menu;
 const orders = await db().collection('orders').where('status', '==', 'paid').get();
 const uids = [...new Set(orders.docs.map(d => d.data() as Order).filter(o => o.items.some(i => i.menuId === menuId && !i.collectedAt)).map(o => o.uid))];
 let sent = 0; let failed = 0;
 for (const uid of uids) {
  const notice = { uid, title: 'Sua refeição chegou! 🍽️', body: `${menu.name} • ${menu.meal} de ${menu.date.split('-').reverse().slice(0, 2).join('/')}. Retire no alojamento com seu QR Code.`, createdAt: new Date().toISOString() };
  await db().collection('notices').add(notice);
  const tokens = await db().collection('users').doc(uid).collection('tokens').limit(20).get();
  if (tokens.empty) continue;
  try { const result = await messaging().sendEachForMulticast({ tokens: tokens.docs.map(t => t.id), notification: { title: notice.title, body: notice.body }, webpush: { fcmOptions: { link: `${process.env.APP_URL}/?tab=orders` } } }); sent += result.successCount; failed += result.failureCount; } catch { failed += tokens.size; }
 }
 return { recipients: uids.length, pushSent: sent, pushFailed: failed };
}
