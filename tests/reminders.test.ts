import { test } from 'node:test';
import assert from 'node:assert/strict';
import { purchaseReminderWindows, hasReminderStock, needsPurchaseReminder } from '../lib/reminder-domain';
import { seedMenus } from '../lib/seed';
import type { Order } from '../lib/types';
const at=(value:string)=>Date.parse(value);
const window=purchaseReminderWindows(at('2026-11-20T17:30:00-03:00'))[0];
test('lembretes só nos três dias do Inter, nas janelas de Brasília e antes do fechamento',()=>{
 for(const date of ['2026-11-20','2026-11-21','2026-11-22']){
  assert.equal(purchaseReminderWindows(at(`${date}T09:59:59-03:00`)).length,0);
  assert.equal(purchaseReminderWindows(at(`${date}T10:00:00-03:00`))[0].meal,'Almoço');
  assert.equal(purchaseReminderWindows(at(`${date}T10:30:00-03:00`)).length,0);
  assert.equal(purchaseReminderWindows(at(`${date}T17:29:59-03:00`)).length,0);
  assert.equal(purchaseReminderWindows(at(`${date}T20:30:00Z`))[0].meal,'Jantar');
  assert.equal(purchaseReminderWindows(at(`${date}T18:00:00-03:00`)).length,0);
 }
 for(const date of ['2026-11-19','2026-11-23','2027-11-20'])assert.equal(purchaseReminderWindows(at(`${date}T17:30:00-03:00`)).length,0);
});
test('não lembra quem já pagou ou tem pedido válido da mesma refeição; ignora outros dias e ambientes',()=>{
 const now=at('2026-11-20T17:35:00-03:00');
 const order={status:'paid',expiresAt:'2026-11-20T18:00:00-03:00',items:[{date:window.date,meal:window.meal}],paymentProvider:'efi',paymentEnvironment:'production'} as Order;
 assert.equal(needsPurchaseReminder([order],window,'production',now),false);
 assert.equal(needsPurchaseReminder([{...order,status:'pending'}],window,'production',now),false);
 assert.equal(needsPurchaseReminder([{...order,status:'cancelled'}],window,'production',now),true);
 assert.equal(needsPurchaseReminder([{...order,status:'pending',expiresAt:'2026-11-20T17:34:00-03:00'}],window,'production',now),true);
 assert.equal(needsPurchaseReminder([order],window,'sandbox',now),true);
 assert.equal(needsPurchaseReminder([{...order,items:[{...order.items[0],date:'2026-11-21'}]}],window,'production',now),true);
 assert.equal(needsPurchaseReminder([{...order,items:[{...order.items[0],meal:'Almoço'}]}],window,'production',now),true);
});
test('não oferece refeição sem opção publicada com estoque',()=>{
 assert.equal(hasReminderStock(seedMenus,window),true);
 assert.equal(hasReminderStock(seedMenus.map(m=>({...m,active:false})),window),false);
 assert.equal(hasReminderStock(seedMenus.map(m=>({...m,reserved:m.capacity})),window),false);
});
