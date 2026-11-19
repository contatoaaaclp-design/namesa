import { menuQuantities } from './customization';
import { checkoutCard, expireCardOrder } from './card-server';
import { randomBytes } from 'node:crypto';
import QRCode from 'qrcode';
import { paymentDeadline } from './sales';
import { FieldValue } from 'firebase-admin/firestore';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { db, messaging } from './firebase-admin';
import { checkoutSchema, priceCart, assertCollectable } from './domain';
import { efiClient } from './payments';
import { assessCharge, txidForOrder, validTxid, efiWebhookUrl, pixChargeBody } from './efi-domain';
import type { Menu, Order } from './types';
function assertEfiOrder(order: Order) {
 const client = efiClient();
 if (order.paymentProvider !== 'efi' || !order.paymentId || !validTxid(order.paymentId)) throw new Error('Este pedido pertence à integração anterior. Procure a atlética para conciliar o pagamento.');
 if (order.paymentEnvironment !== client.config.environment) throw new Error('Este pedido pertence a outro ambiente Efí. Não misture homologação e produção.');
 return client;
}
export async function checkout(user: DecodedIdToken, raw: unknown) {
 const data = checkoutSchema.parse(raw);
 if(data.paymentMethod === 'credit') return checkoutCard(user,data);
 const client = efiClient();
 efiWebhookUrl(process.env.APP_URL || '', process.env.EFI_WEBHOOK_SECRET || '');
 if (!user.email || !user.email_verified) throw new Error('Entre com uma conta Google com e-mail verificado.');
 const ref = db().collection('orders').doc(`${user.uid}_${data.requestId}`);
 const txid = txidForOrder(ref.id,client.config.environment);
 await db().runTransaction(async tx => {
  const existing = await tx.get(ref);
  if (existing.exists) return;
  const pending = await tx.get(db().collection('orders').where('uid','==',user.uid).where('status','==','pending'));
  if (pending.docs.filter(d=>d.data().paymentProvider==='efi' && d.data().paymentEnvironment===client.config.environment).length >= 3) throw new Error('Você já tem três pagamentos pendentes. Conclua um deles antes de continuar.');
  const docs = await Promise.all([...menuQuantities(data.items).keys()].map(id=>tx.get(db().collection('menus').doc(id))));
  const menus = docs.filter(d=>d.exists).map(d=>({...d.data(),id:d.id} as Menu));
  const priced = priceCart(menus,data.items);
  if (data.expectedTotal !== undefined && data.expectedTotal !== priced.total) throw new Error('O preço mudou. Confira a sacola e confirme o novo total.');
  const now = new Date();
  const order: Order = {id:ref.id,uid:user.uid,customer:user.name || user.email!,email:user.email!,createdAt:now.toISOString(),expiresAt:paymentDeadline(priced.items,now.getTime()),status:'pending',...priced,token:randomBytes(32).toString('hex'),note:data.note,paymentId:txid,paymentProvider:'efi',paymentEnvironment:client.config.environment};
  tx.create(ref,order);
  tx.create(db().collection('pixTransactions').doc(txid),{orderId:ref.id,environment:client.config.environment});
  docs.forEach(doc=>tx.update(doc.ref,{reserved:FieldValue.increment(menuQuantities(data.items).get(doc.id)!)}));
 });
 let order = (await ref.get()).data() as Order;
 assertEfiOrder(order);
 if(order.paymentMethod === 'credit') throw new Error('Este pedido deve ser pago com crédito.');
 if (order.status !== 'pending') return order;
 if (order.pix) { await syncPayment(order.paymentId!); return (await ref.get()).data() as Order; }
 // A bounded creation lease prevents expiry from releasing stock while an API call is in flight.
 await db().runTransaction(async tx=>{
  const current = (await tx.get(ref)).data() as Order;
  if(current.status!=='pending' || Date.parse(current.expiresAt)<=Date.now())throw new Error('O prazo deste pedido encerrou. Verifique o pagamento ou procure a atlética.');
  if(current.paymentCreateLeaseUntil && Date.parse(current.paymentCreateLeaseUntil)>Date.now())throw new Error('A cobrança está sendo processada. Aguarde até três minutos antes de tentar novamente.');
  tx.update(ref,{paymentCreateLeaseUntil:new Date(Date.now()+180000).toISOString()});
 });
 order = (await ref.get()).data() as Order;
 let charge = await client.getCharge(order.paymentId!);
 if(!charge) charge = await client.createCharge(order.paymentId!,pixChargeBody(order,data.cpf,client.config.pixKey));
 assessCharge(charge,{txid:order.paymentId!,total:order.total,key:client.config.pixKey});
 let pix = charge.pixCopiaECola;
 if(!pix && charge.loc?.id && charge.status==='ATIVA') pix = (await client.call<{qrcode:string}>('/v2/loc/'+charge.loc.id+'/qrcode')).qrcode;
 if(charge.status==='ATIVA' && !pix)throw new Error('A Efí criou a cobrança, mas não retornou o Pix. Tente novamente com o mesmo pedido.');
 const pixImage = pix ? (await QRCode.toDataURL(pix,{width:320,margin:2})).split(',')[1] : '';
 await ref.update({pix:pix || '',pixImage,paymentCreateLeaseUntil:''});
 await syncPayment(order.paymentId!);
 return (await ref.get()).data() as Order;
}
export async function syncPayment(txid: string) {
 if(!validTxid(txid))throw new Error('Identificador Pix inválido.');
 const mapping = (await db().collection('pixTransactions').doc(txid).get()).data();
 if(!mapping)return null; // Unknown notifications never trigger provider queries or approve orders.
 const ref = db().collection('orders').doc(mapping.orderId);
 const before = (await ref.get()).data() as Order | undefined;
 if(!before)return null;
 const client = assertEfiOrder(before);
 if(before.paymentId!==txid || mapping.environment!==client.config.environment)throw new Error('Referência de pagamento inconsistente.');
 const charge = await client.getCharge(txid);
 if(!charge)return null;
 const status = assessCharge(charge,{txid,total:before.total,key:client.config.pixKey});
 await db().runTransaction(async tx=>{
  const order = (await tx.get(ref)).data() as Order;
  if(!order || order.paymentId!==txid || order.paymentEnvironment!==client.config.environment)throw new Error('Pedido de pagamento inconsistente.');
  if(status==='paid' && order.status==='pending')tx.update(ref,{status:'paid',paidAt:charge.pix?.[0]?.horario || new Date().toISOString()});
  else if(status==='paid' && ['expired','cancelled'].includes(order.status))tx.update(ref,{paymentReviewRequired:true});
  else if(status==='refunded' && ['paid','pending'].includes(order.status))tx.update(ref,{status:'refunded'});
  else if(status==='expired' && order.status==='pending'){
   const menus = await Promise.all([...menuQuantities(order.items).keys()].map(id=>tx.get(db().collection('menus').doc(id))));
   menus.forEach((m,i)=>{if(m.exists)tx.update(m.ref,{reserved:Math.max(0,(m.data()?.reserved || 0)-menuQuantities(order.items).get(m.id)!)});});
   tx.update(ref,{status:'expired'});
  }
 });
 return status;
}
export async function expireOrder(id:string) {
 const ref=db().collection('orders').doc(id);
 const order=(await ref.get()).data() as Order;
 if(order.paymentMethod==='credit')return expireCardOrder(id);
 const client=assertEfiOrder(order);
 if(order.status!=='pending')return true;
 if(Date.parse(order.expiresAt)>Date.now() || (order.paymentCreateLeaseUntil && Date.parse(order.paymentCreateLeaseUntil)>Date.now()))return false;
 const status=await syncPayment(order.paymentId!);
 if(status==='paid' || status==='refunded' || status==='expired')return true;
 if(status==='pending'){
  try{await client.cancelCharge(order.paymentId!);}catch(error){if(await syncPayment(order.paymentId!)==='paid')return true;throw error;}
  const after=await syncPayment(order.paymentId!);
  return after==='expired' || after==='paid' || after==='refunded';
 }
 if(await client.getCharge(order.paymentId!))throw new Error('A cobrança existe, mas a referência local exige conciliação.');
 // Confirmed missing charge after the creation lease elapsed: new attempts are expired.
 await db().runTransaction(async tx=>{
  const current=(await tx.get(ref)).data() as Order;
  if(current.status!=='pending' || Date.parse(current.expiresAt)>Date.now() || (current.paymentCreateLeaseUntil && Date.parse(current.paymentCreateLeaseUntil)>Date.now()))return;
  const menus=await Promise.all([...menuQuantities(current.items).keys()].map(id=>tx.get(db().collection('menus').doc(id))));
  menus.forEach((m,i)=>{if(m.exists)tx.update(m.ref,{reserved:Math.max(0,(m.data()?.reserved || 0)-menuQuantities(current.items).get(m.id)!)});});
  tx.update(ref,{status:'expired'});
 });
 return (await ref.get()).data()?.status!=='pending';
}

export async function inspectTicket(code: string, collect = false, staff = '') {
 const match = /^INTER:([a-zA-Z0-9_-]+):(\d+):([a-f0-9]{64})$/.exec(code.trim());
 if (!match) throw new Error('QR Code inválido. Use o código de retirada do Inter na Mesa.');
 const [, id, idx, token] = match; const index = Number(idx);
 return db().runTransaction(async tx => {
  const ref = db().collection('orders').doc(id); const doc = await tx.get(ref); const order = doc.data() as Order | undefined;
  if (!order || order.token !== token || !order.items[index]) throw new Error('Código não encontrado.');
  if(order.paymentMethod==='credit') { if(order.paymentProvider!=='efi' || order.paymentEnvironment!==(process.env.EFI_SANDBOX==='false'?'production':'sandbox') || !/^\d+$/.test(order.paymentId || ''))throw new Error('Referência do cartão inválida ou de outro ambiente.'); }
  else if (order.paymentProvider === 'efi') assertEfiOrder(order);
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
 const uids = [...new Set(orders.docs.map(d => d.data() as Order).filter(o => (o.paymentProvider!=='efi' || o.paymentEnvironment===(process.env.EFI_SANDBOX==='false'?'production':'sandbox')) && o.items.some(i => i.menuId === menuId && !i.collectedAt)).map(o => o.uid))];
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
