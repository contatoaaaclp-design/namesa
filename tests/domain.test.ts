import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceCart, assertCollectable, checkoutSchema } from '../lib/domain';
import { seedMenus } from '../lib/seed';
const now = Date.parse('2026-11-14T12:00:00-03:00');
test('preço vem do cardápio; compra combina datas e refeições', () => {
 const result = priceCart(seedMenus, [{ menuId: 'menu-0-0-0', quantity: 2 }, { menuId: 'menu-1-1-2', quantity: 1 }], now);
 assert.equal(result.total, 7200); assert.equal(result.items.length, 2); assert.equal(result.items[1].meal, 'Jantar');
});
test('recusa prazo encerrado, estoque esgotado, duplicação e quantidade inválida', () => {
 assert.throws(() => priceCart(seedMenus, [{ menuId: 'menu-0-0-0', quantity: 1 }], Date.parse('2026-11-20T10:30:00-03:00')));
 assert.throws(() => priceCart(seedMenus.map(m => ({ ...m, reserved: 100 })), [{ menuId: 'menu-0-0-0', quantity: 1 }], now));
 assert.throws(() => priceCart(seedMenus, [{ menuId: 'menu-0-0-0', quantity: 1 }, { menuId: 'menu-0-0-0', quantity: 1 }], now));
 assert.throws(() => priceCart(seedMenus, [{ menuId: 'menu-0-0-0', quantity: -1 }], now));
});
test('retirada exige pagamento, chegada, item válido e uso único', () => {
 const { items } = priceCart(seedMenus, [{ menuId: 'menu-0-0-0', quantity: 1 }], now);
 assert.throws(() => assertCollectable({ status: 'pending', items }, 0, true));
 assert.throws(() => assertCollectable({ status: 'paid', items }, 0, false));
 assert.throws(() => assertCollectable({ status: 'paid', items }, 2, true));
 assert.doesNotThrow(() => assertCollectable({ status: 'paid', items }, 0, true));
 assert.throws(() => assertCollectable({ status: 'paid', items: [{ ...items[0], collectedAt: new Date().toISOString() }] }, 0, true));
});
test('valida entrada do checkout', () => {
 assert.equal(checkoutSchema.safeParse({ requestId: 'x', cpf: '123', items: [] }).success, false);
});
