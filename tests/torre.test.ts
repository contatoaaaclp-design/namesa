import { test } from 'node:test';
import assert from 'node:assert/strict';
import { torreMenus } from '../lib/torre-menus';
import { torreRestaurant } from '../lib/torre';
import { menuSchema, priceCart } from '../lib/domain';
import { customize } from '../lib/customization';
import { isSalesClosed, normalizeMenu, paymentDeadline } from '../lib/sales';

test('cardápio Torre valida preços, tamanhos, adicionais e datas', () => {
 assert.equal(torreMenus.length, 198);
 assert.equal(new Set(torreMenus.map(menu => menu.id)).size, torreMenus.length);
 for (const menu of torreMenus) {
  menuSchema.parse(menu);
  assert.equal(menu.meal, 'Jantar');
  assert.equal(menu.restaurant, torreRestaurant);
  assert.equal(menu.deadline, `${menu.date}T19:45:00-03:00`);
  assert.equal(menu.active, true);
 }
 const menu = (id: string) => torreMenus.find(menu => menu.id === `torre-${id}-2026-11-20`)!;
 assert.equal(customize(menu('marmitex-frango-parmegiana'), [{ groupId: 'size', optionId: '2', quantity: 1 }]).price, 3200);
 assert.equal(customize(menu('marmitex-picanha'), [{ groupId: 'size', optionId: '1', quantity: 1 }]).price, 4600);
 assert.equal(customize(menu('marmitex-bife-cavalo'), [{ groupId: 'size', optionId: '4', quantity: 1 }]).price, 7500);
 assert.equal(customize(menu('x-burguer'), [{ groupId: 'extras', optionId: '14', quantity: 1 }]).price, 2300);
 assert.equal(menu('carte-file-carioca').price, 16000);
 assert.equal(menu('massa-4-1').price, 2600);
 assert.equal(menu('combo').price, 7800);
});

test('Torre vende após 18h e encerra exatamente às 19h45, incluindo checkout e pagamento', () => {
 const menu = torreMenus.find(menu => menu.id === 'torre-combo-2026-11-20')!;
 const before = Date.parse('2026-11-20T19:44:59-03:00');
 const cutoff = Date.parse('2026-11-20T19:45:00-03:00');
 assert.equal(isSalesClosed(menu.date, menu.meal, before, torreRestaurant), false);
 assert.equal(isSalesClosed(menu.date, menu.meal, cutoff, torreRestaurant), true);
 assert.equal(isSalesClosed(menu.date, menu.meal, before, 'Outro restaurante'), true);
 assert.equal(normalizeMenu({ ...menu, deadline: 'antigo' }).deadline, '2026-11-20T19:45:00-03:00');
 assert.doesNotThrow(() => priceCart([menu], [{ menuId: menu.id, quantity: 1 }], before));
 assert.throws(() => priceCart([menu], [{ menuId: menu.id, quantity: 1 }], cutoff), /encerrados/);
 assert.equal(paymentDeadline([menu], Date.parse('2026-11-20T19:30:00-03:00')), '2026-11-20T22:45:00.000Z');
 assert.equal(paymentDeadline([menu], Date.parse('2026-11-20T18:30:00-03:00')), '2026-11-20T22:00:00.000Z');
 assert.equal(paymentDeadline([menu, { ...menu, restaurant: 'Outro restaurante' }], Date.parse('2026-11-20T17:50:00-03:00')), '2026-11-20T21:00:00.000Z');
});
