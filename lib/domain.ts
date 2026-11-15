import { z } from 'zod';
import type { Menu, OrderItem } from './types';
export const checkoutSchema = z.object({ requestId: z.string().uuid(), items: z.array(z.object({ menuId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(10) })).min(1).max(18), note: z.string().trim().max(300).default(''), cpf: z.string().regex(/^\d{11}$/, 'Informe os 11 números do CPF.') });
export const menuSchema = z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).optional(), restaurant: z.string().trim().min(2).max(80), name: z.string().trim().min(2).max(100), description: z.string().trim().min(5).max(500), price: z.number().int().min(100).max(100000), date: z.enum(['2026-11-20', '2026-11-21', '2026-11-22']), meal: z.enum(['Almoço', 'Jantar']), deadline: z.string().datetime({ offset: true }), pickup: z.string().trim().min(3).max(100), capacity: z.number().int().min(1).max(10000), tags: z.array(z.string().trim().max(40)).max(8), image: z.union([z.literal(''), z.url().refine(v => v.startsWith('https://'), 'Use uma imagem HTTPS.')]), active: z.boolean() });
export function priceCart(menus: Menu[], items: { menuId: string; quantity: number }[], now = Date.now()) {
 if (new Set(items.map(i => i.menuId)).size !== items.length) throw new Error('Itens repetidos no pedido.');
 const lines: OrderItem[] = items.map(item => {
  const m = menus.find(m => m.id === item.menuId);
  if (!m || !m.active) throw new Error('Uma opção não está mais disponível.');
  if (now >= Date.parse(m.deadline)) throw new Error(`Pedidos encerrados: ${m.name}.`);
  if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) throw new Error('Quantidade inválida.');
  if (m.reserved + item.quantity > m.capacity) throw new Error(`Quantidade indisponível: ${m.name}.`);
  return { menuId: m.id, name: m.name, restaurant: m.restaurant, date: m.date, meal: m.meal, price: m.price, quantity: item.quantity, pickup: m.pickup };
 });
 return { items: lines, total: lines.reduce((s, l) => s + l.price * l.quantity, 0) };
}
export function assertCollectable(order: { status: string; items: OrderItem[] }, index: number, ready: boolean) {
 if (order.status !== 'paid') throw new Error('O pagamento deste pedido não está confirmado.');
 if (!Number.isInteger(index) || !order.items[index]) throw new Error('Refeição inválida.');
 if (order.items[index].collectedAt) throw new Error('Esta refeição já foi retirada.');
 if (!ready) throw new Error('A atlética ainda não liberou esta refeição para retirada.');
}
