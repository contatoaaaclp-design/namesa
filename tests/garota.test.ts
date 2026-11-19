import { test } from 'node:test';
import assert from 'node:assert/strict';
import { garotaMenus } from '../lib/garota-nota-100';
import { menuSchema, priceCart } from '../lib/domain';
import { normalizeMenu, paymentDeadline } from '../lib/sales';
import { hasReminderStock, purchaseReminderWindows } from '../lib/reminder-domain';

test('cardápios reais preservam tamanhos e preços; seguem capacidade e retirada padrão', () => {
 assert.equal(garotaMenus.length, 15);
 assert.deepEqual(garotaMenus.filter(m => m.date === '2026-11-20').map(m => m.price), [2000,2200,2400,2000,2200,2400]);
 assert.deepEqual(garotaMenus.filter(m => m.date === '2026-11-21').map(m => m.price), [2200,2500,2800,2200,2500,2800]);
 assert.deepEqual(garotaMenus.filter(m => m.date === '2026-11-22').map(m => m.price), [2000,2200,2400]);
 for (const menu of garotaMenus) {
  assert.equal(menuSchema.safeParse(menu).success, true);
  assert.equal(menu.active, true);
  assert.equal(menu.capacity, 50);
  assert.equal(menu.pickup, '12h \u00e0s 13h30');
  assert.equal(menuSchema.safeParse({...menu, capacity: 0}).success, false);
 }
});

test('encomenda de domingo fecha sábado às 13h na tela, compra e pagamento', () => {
 const menu = {...garotaMenus[12], active: true, price: 2500, capacity: 10};
 assert.equal(normalizeMenu(menu).deadline, '2026-11-21T13:00:00-03:00');
 const before = Date.parse('2026-11-21T12:59:59-03:00');
 const {items} = priceCart([menu], [{menuId:menu.id,quantity:1}], before);
 assert.equal(paymentDeadline(items,before),'2026-11-21T16:00:00.000Z');
 assert.throws(() => priceCart([menu],[{menuId:menu.id,quantity:1}],Date.parse('2026-11-21T13:00:00-03:00')));
 const window = purchaseReminderWindows(Date.parse('2026-11-22T10:00:00-03:00'))[0];
 assert.equal(hasReminderStock([menu],window),false);
});
