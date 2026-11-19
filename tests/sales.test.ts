import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSalesClosed, normalizeMenu, paymentDeadline } from '../lib/sales';
import { priceCart } from '../lib/domain';
import { seedMenus } from '../lib/seed';
test('almoço vende após o aviso e fecha exatamente 10h30 em Brasília',()=>{
 const menu={...seedMenus[0],deadline:'2026-11-20T09:00:00-03:00'};
 assert.doesNotThrow(()=>priceCart([menu],[{menuId:menu.id,quantity:1}],Date.parse('2026-11-20T10:29:59-03:00')));
 assert.throws(()=>priceCart([menu],[{menuId:menu.id,quantity:1}],Date.parse('2026-11-20T10:30:00-03:00')));
 assert.equal(normalizeMenu(menu).deadline,'2026-11-20T10:30:00-03:00');
});
test('jantar fecha às 18h e os dias permanecem independentes',()=>{
 assert.equal(isSalesClosed('2026-11-20','Jantar',Date.parse('2026-11-20T17:59:59-03:00')),false);
 assert.equal(isSalesClosed('2026-11-20','Jantar',Date.parse('2026-11-20T21:00:00Z')),true);
 assert.equal(isSalesClosed('2026-11-21','Almoço',Date.parse('2026-11-20T18:00:00-03:00')),false);
});
test('prazo do pagamento respeita o menor fechamento da sacola e o teto de 30 minutos',()=>{
 const items=[{date:'2026-11-20',meal:'Almoço' as const},{date:'2026-11-21',meal:'Jantar' as const}];
 assert.equal(paymentDeadline(items,Date.parse('2026-11-20T10:20:00-03:00')),'2026-11-20T13:30:00.000Z');
 assert.equal(paymentDeadline(items,Date.parse('2026-11-20T08:00:00-03:00')),'2026-11-20T11:30:00.000Z');
});
