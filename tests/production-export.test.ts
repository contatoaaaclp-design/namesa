import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productionText } from '../lib/production-export';
import type { Order, OrderItem } from '../lib/types';

const item = (changes: Partial<OrderItem> = {}): OrderItem => ({ menuId: 'frango', restaurant: 'Lar dos Sabores', name: 'Frango grelhado', date: '2026-11-20', meal: 'Almoço', quantity: 1, price: 2000, pickup: 'Alojamento', ...changes });
const order = (items: OrderItem[], status: Order['status'] = 'paid'): Order => ({ id: 'pedido', uid: 'atleta', customer: 'Nome privado', email: 'email privado', createdAt: '', expiresAt: '', status, total: 2000, items, token: 'privado', note: 'Observação privada' });

test('agrupa quantidades por restaurante, prato e tamanho no formato de texto', () => {
 const text = productionText([
  order([item({ quantity: 2, customization: 'Tamanho: médio · Salada: Alface' })]),
  order([item({ customization: 'Tamanho: médio · Salada: Tomate', note: 'Sem cebola', collectedAt: '2026-11-20' }), item({ customization: 'Tamanho: pequeno' })]),
  order([item({ restaurant: 'Sabor & Cia', name: 'Salada de pote' })]),
 ], '2026-11-20', 'Almoço');
 assert.equal(text, '🍽️ Lar dos Sabores\n\n• 3x Frango grelhado — médio\n• 1x Frango grelhado — pequeno\n\nTotal: 4 itens\n\n🍽️ Sabor & Cia\n\n• 1x Salada de pote\n\nTotal: 1 item\n\nTotal geral: 5 itens');
});

test('filtra pagamento, dia e refeição, preservando tamanhos no nome do prato', () => {
 const orders = [
  order([item({ name: 'Costela — Pequena', quantity: 2 })]),
  ...(['pending', 'cancelled', 'expired', 'refunded'] as const).map(status => order([item({ quantity: 10 })], status)),
  order([item({ date: '2026-11-21' }), item({ meal: 'Jantar' })]),
 ];
 assert.equal(productionText(orders, '2026-11-20', 'Almoço'), '🍽️ Lar dos Sabores\n\n• 2x Costela — Pequena\n\nTotal: 2 itens\n\nTotal geral: 2 itens');
 assert.equal(productionText([], '2026-11-20', 'Almoço'), 'Total geral: 0 itens');
});
