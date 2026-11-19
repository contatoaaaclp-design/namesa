import { z } from 'zod';
import { isSalesClosed } from './sales';
import type { CartItem, Menu, OrderItem } from './types';
import { cartKey, customize, menuQuantities, startingPrice } from './customization';
const selectionSchema = z.object({groupId:z.string().min(1).max(100), optionId:z.string().min(1).max(100), quantity:z.number().int().min(1).max(50)});
export const optionGroupSchema = z.object({id:z.string().min(1).max(100),name:z.string().trim().min(1).max(100),min:z.number().int().min(0).max(50),max:z.number().int().min(1).max(50),pricing:z.enum(['sum','max']).optional(),options:z.array(z.object({id:z.string().min(1).max(100),name:z.string().min(1).max(150),price:z.number().int().min(0).max(100000),maxQuantity:z.number().int().min(1).max(50)})).min(1).max(100)}).refine(g=>g.min<=g.max && new Set(g.options.map(o=>o.id)).size===g.options.length && g.min<=g.options.reduce((s,o)=>s+o.maxQuantity,0),'Grupo de escolhas inválido.');
export const checkoutSchema = z.object({ requestId: z.string().uuid(), items: z.array(z.object({ menuId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(10), selections: z.array(selectionSchema).max(100).optional(), note: z.string().trim().max(300).optional() })).min(1).max(50), note: z.string().trim().max(300).default(''), paymentMethod: z.enum(['pix','credit']).default('pix'), expectedTotal: z.number().int().positive().optional(), card: z.object({ paymentToken: z.string().min(20).max(500), tdsIdentifier: z.string().uuid(), name: z.string().trim().min(3).max(100), phone: z.string().regex(/^\d{10,11}$/) }).optional(), cpf: z.string().regex(/^\d{11}$/, 'Informe os 11 números do CPF.') });
export const menuSchema = z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).optional(), restaurant: z.string().trim().min(2).max(80), name: z.string().trim().min(2).max(100), description: z.string().trim().min(5).max(500), price: z.number().int().min(0).max(100000), date: z.enum(['2026-11-20', '2026-11-21', '2026-11-22']), meal: z.enum(['Almoço', 'Jantar']), deadline: z.string().datetime({ offset: true }), pickup: z.string().trim().min(3).max(100), capacity: z.number().int().min(0).max(10000), tags: z.array(z.string().trim().max(40)).max(8), image: z.union([z.literal(''), z.url().refine(v => v.startsWith('https://'), 'Use uma imagem HTTPS.')]), active: z.boolean(), basePrice: z.number().int().min(0).max(100000).optional(), optionGroups: z.array(optionGroupSchema).max(20).optional(), sourceUrl: z.url().optional() }).transform(menu=>({...menu,price:startingPrice(menu)})).refine(menu=>!menu.optionGroups?.length || menu.basePrice !== undefined, 'Informe o pre\u00e7o base das escolhas.').refine(menu=>new Set((menu.optionGroups || []).map(g=>g.id)).size === (menu.optionGroups || []).length, 'Grupos repetidos.').refine(menu => !menu.active || menu.price >= 100 && menu.capacity >= 1, { message: 'Para publicar, informe preço e capacidade de venda.' });
export function priceCart(menus: Menu[], items: CartItem[], now = Date.now()) {
 if (new Set(items.map(cartKey)).size !== items.length) throw new Error('Itens repetidos no pedido.');
 const totals = menuQuantities(items);
 const lines: OrderItem[] = items.map(item => {
  const m = menus.find(m => m.id === item.menuId);
  if (!m || !m.active) throw new Error('Uma opção não está mais disponível.');
  if (isSalesClosed(m.date,m.meal,now,m.restaurant)) throw new Error(`Pedidos encerrados: ${m.name}.`);
  if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) throw new Error('Quantidade inválida.');
  if ((totals.get(m.id) || 0) > 10) throw new Error('Limite de 10 unidades por prato no pedido.');
  if (m.reserved + (totals.get(m.id) || 0) > m.capacity) throw new Error(`Quantidade indisponível: ${m.name}.`);
  if (item.note && item.note.length > 300) throw new Error('Observação muito longa.');
  const customized = customize(m,item.selections);
  return { menuId: m.id, name: m.name, restaurant: m.restaurant, date: m.date, meal: m.meal, price: customized.price, quantity: item.quantity, pickup: m.pickup, ...(customized.customization ? {customization:customized.customization} : {}), ...(item.note?.trim() ? {note:item.note.trim()} : {}) };
 });
 return { items: lines, total: lines.reduce((s, l) => s + l.price * l.quantity, 0) };
}
export function assertCollectable(order: { status: string; items: OrderItem[] }, index: number, ready: boolean) {
 if (order.status !== 'paid') throw new Error('O pagamento deste pedido não está confirmado.');
 if (!Number.isInteger(index) || !order.items[index]) throw new Error('Refeição inválida.');
 if (order.items[index].collectedAt) throw new Error('Esta refeição já foi retirada.');
 if (!ready) throw new Error('A atlética ainda não liberou esta refeição para retirada.');
}
