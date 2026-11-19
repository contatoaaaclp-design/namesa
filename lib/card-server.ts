import { menuQuantities } from './customization';
import { randomBytes, randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { z } from 'zod';
import { db } from './firebase-admin';
import { checkoutSchema, priceCart } from './domain';
import { paymentDeadline } from './sales';
import { assessCardCharge, paymentQuote } from './card-domain';
import { cardClient, cardConfig, cardEnabled, cardUrls, CardError } from './cards';
import type { Menu, Order } from './types';
function assertCard(order:Order) {
 if(order.paymentMethod!=='credit' || order.paymentProvider!=='efi' || order.paymentEnvironment!==cardConfig().environment)throw new Error('Pagamento de cartão de outro ambiente ou integração.');
}
export async function checkoutCard(user:DecodedIdToken,data:z.infer<typeof checkoutSchema>) {
 if(!user.email || !user.email_verified)throw new Error('Entre com uma conta Google com e-mail verificado.');
 if(!cardEnabled())throw new Error('O crédito ainda não foi habilitado pela atlética. Escolha Pix.');
 const urls=cardUrls();
 if(!data.card || data.expectedTotal===undefined)throw new Error('Informe os dados de pagamento e confirme o total do crédito.');
 const ref=db().collection('orders').doc(`${user.uid}_${data.requestId}`);
 await db().runTransaction(async tx=>{
  const existing=await tx.get(ref);
  if(existing.exists) { assertCard(existing.data() as Order);return; }
  const pending=await tx.get(db().collection('orders').where('uid','==',user.uid).where('status','==','pending'));
  if(pending.docs.filter(d=>d.data().paymentEnvironment===cardConfig().environment).length>=3)throw new Error('Você já tem três pagamentos pendentes.');
  const docs=await Promise.all([...menuQuantities(data.items).keys()].map(id=>tx.get(db().collection('menus').doc(id))));
  const priced=priceCart(docs.filter(d=>d.exists).map(d=>({...d.data(),id:d.id} as Menu)),data.items);
  const quote=paymentQuote(priced.total,'credit');
  if(quote.total!==data.expectedTotal)throw new Error('O preço mudou. Confira a sacola e confirme o novo total.');
  const order:Order={id:ref.id,uid:user.uid,customer:user.name || user.email!,email:user.email!,createdAt:new Date().toISOString(),expiresAt:paymentDeadline(priced.items),status:'pending',items:priced.items,...quote,token:randomBytes(32).toString('hex'),note:data.note,paymentProvider:'efi',paymentMethod:'credit',paymentEnvironment:cardConfig().environment};
  tx.create(ref,order);
  docs.forEach(doc=>tx.update(doc.ref,{reserved:FieldValue.increment(menuQuantities(data.items).get(doc.id)!)}));
 });
 let order=(await ref.get()).data() as Order;
 assertCard(order);
 if(order.status!=='pending' || order.cardAttempted) { if(order.paymentId)await syncCardPayment(ref.id);return (await ref.get()).data() as Order; }
 // A durable single attempt prevents a second charge, including after a server crash.
 await db().runTransaction(async tx=>{
  const current=(await tx.get(ref)).data() as Order;
  if(current.cardAttempted)throw new Error('Este pagamento já foi enviado. Consulte Meus pedidos.');
  if(current.status!=='pending' || Date.parse(current.expiresAt)<=Date.now())throw new Error('As vendas desta refeição encerraram.');
  tx.update(ref,{cardAttempted:true,paymentCreateLeaseUntil:new Date(Date.now()+180000).toISOString()});
 });
 let created=false;
 try {
  const charge=await cardClient().create({items:[...order.items.map(i=>({name:`${i.name} (${i.date})`.slice(0,100),value:i.price,amount:i.quantity})),...(order.fee ? [{name:'Taxa de crédito à vista (3,49%)',value:order.fee,amount:1}] : [])],metadata:{custom_id:order.id,notification_url:urls.notification},customer:{name:data.card.name,cpf:data.cpf,email:order.email,phone_number:data.card.phone},installments:1,payment_token:data.card.paymentToken,tds_info:{tds_identifier:data.card.tdsIdentifier,challenge_callback_url:urls.callback}});
  created=true;
  if(!Number.isSafeInteger(charge.charge_id) || charge.charge_id<1 || charge.total!==order.total)throw new Error('Resposta de cobrança inconsistente. Procure a atlética.');
  const challenge=charge.tds_challenge?.form_data;
  if(challenge && (challenge.method.toUpperCase()!=='POST' || new URL(challenge.action_url).protocol!=='https:'))throw new Error('Desafio de autenticação inválido.');
  await db().runTransaction(async tx=>{
   const current=(await tx.get(ref)).data() as Order;
   if(current.paymentId && current.paymentId!==String(charge.charge_id))throw new Error('Cobrança duplicada identificada. Procure a atlética.');
   tx.update(ref,{paymentId:String(charge.charge_id),paymentCreateLeaseUntil:'',...(challenge?{cardChallenge:challenge}:{})});
  });
  await syncCardPayment(order.id);
 } catch(error) {
  // A definitive validation/permission failure did not create a bank charge.
  if(!created && error instanceof CardError && [400,401,403,404,422].includes(error.status))await closeCardOrder(order.id,'cancelled');
  else await ref.update({paymentReviewRequired:true});
  throw error;
 }
 return (await ref.get()).data() as Order;
}
async function closeCardOrder(id:string,status:'cancelled'|'expired') {
 const ref=db().collection('orders').doc(id);
 await db().runTransaction(async tx=>{
  const order=(await tx.get(ref)).data() as Order;
  assertCard(order);
  if(order.status!=='pending')return;
  const menus=await Promise.all([...menuQuantities(order.items).keys()].map(id=>tx.get(db().collection('menus').doc(id))));
  menus.forEach((m,i)=>{if(m.exists)tx.update(m.ref,{reserved:Math.max(0,(m.data()?.reserved || 0)-menuQuantities(order.items).get(m.id)!)});});
  tx.update(ref,{status,cardChallenge:FieldValue.delete(),paymentReviewRequired:false});
 });
}
export async function syncCardPayment(id:string) {
 const ref=db().collection('orders').doc(id);const order=(await ref.get()).data() as Order;
 if(!order)return null;assertCard(order);
 if(!order.paymentId)return null;
 const charge=await cardClient().getCharge(order.paymentId);
 const status=assessCardCharge(charge,order);
 if(status==='cancelled')await closeCardOrder(id,'cancelled');
 else if(status!=='pending')await db().runTransaction(async tx=>{
  const current=(await tx.get(ref)).data() as Order;
  assertCard(current);
  if(current.paymentId!==order.paymentId)throw new Error('Referência do cartão mudou.');
  if(status==='paid' && current.status==='pending')tx.update(ref,{status:'paid',paidAt:new Date().toISOString(),paymentReviewRequired:false,cardChallenge:FieldValue.delete()});
  else if(status==='paid' && ['expired','cancelled'].includes(current.status))tx.update(ref,{paymentReviewRequired:true});
  else if(status==='refunded')tx.update(ref,{status:'refunded',cardChallenge:FieldValue.delete()});
 });
 return status;
}
export async function expireCardOrder(id:string) {
 const ref=db().collection('orders').doc(id);const order=(await ref.get()).data() as Order;assertCard(order);
 if(order.status!=='pending')return true;
 if(Date.parse(order.expiresAt)>Date.now() || Date.parse(order.paymentCreateLeaseUntil || '')>Date.now())return false;
 if(!order.cardAttempted){await closeCardOrder(id,'expired');return true;}
 if(!order.paymentId){await ref.update({paymentReviewRequired:true});return false;}
 const status=await syncCardPayment(id);
 if(status!=='pending')return true;
 // Release stock only after the bank confirms cancellation; never on a timeout.
 await cardClient().cancel(order.paymentId);
 return (await syncCardPayment(id))!=='pending';
}
const notificationSchema=z.object({data:z.array(z.object({custom_id:z.string().nullable().optional(),identifiers:z.object({charge_id:z.number().int().positive()})})).max(1000)});
export async function processCardNotification(token:string) {
 const ref=db().collection('cardNotifications').doc(token);const version=randomUUID();
 await ref.set({version,pending:true,environment:cardConfig().environment,updatedAt:new Date().toISOString()});
 const events=notificationSchema.parse(await cardClient().call('/v1/notification/'+encodeURIComponent(token))).data;
 const unique=new Map(events.map(event=>[`${event.custom_id}:${event.identifiers.charge_id}`,event]));
 for(const event of unique.values()) {
  if(!event.custom_id || !/^[a-zA-Z0-9_-]{1,200}$/.test(event.custom_id))continue;
  const orderRef=db().collection('orders').doc(event.custom_id);
  const order=(await orderRef.get()).data() as Order|undefined;
  if(!order || order.paymentMethod!=='credit' || !order.cardAttempted || order.paymentEnvironment!==cardConfig().environment)continue;
  const charge=await cardClient().getCharge(String(event.identifiers.charge_id));
  assessCardCharge(charge,{...order,paymentId:String(event.identifiers.charge_id)});
  await db().runTransaction(async tx=>{
   const current=(await tx.get(orderRef)).data() as Order;
   if(current.paymentId && current.paymentId!==String(charge.charge_id))throw new Error('Notificação de outra cobrança.');
   tx.update(orderRef,{paymentId:String(charge.charge_id)});
  });
  await syncCardPayment(order.id);
 }
 await db().runTransaction(async tx=>{if((await tx.get(ref)).data()?.version===version)tx.update(ref,{pending:false});});
}
export async function retryCardNotifications() {
 const pending=await db().collection('cardNotifications').where('pending','==',true).limit(1).get();
 for(const doc of pending.docs)if(doc.data().environment===cardConfig().environment)await processCardNotification(doc.id);
}
