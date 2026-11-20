import type { Order } from './types';

const singleLine = (value: string) => value.replace(/\s+/g, ' ').trim();

export function productionText(orders: Order[], date: string, meal: string) {
 const restaurants = new Map<string, Map<string, number>>();
 for (const order of orders) {
  if (order.status !== 'paid') continue;
  for (const item of order.items) {
   if (item.date !== date || item.meal !== meal) continue;
   const restaurant = singleLine(item.restaurant);
   const size = item.customization?.split(' · ').map(part => part.match(/^[^:]*tamanho[^:]*:\s*(.+)$/i)?.[1]).find(Boolean);
   const name = singleLine(item.name) + (size ? ` — ${singleLine(size)}` : '');
   let dishes = restaurants.get(restaurant);
   if (!dishes) { dishes = new Map(); restaurants.set(restaurant, dishes); }
   dishes.set(name, (dishes.get(name) || 0) + item.quantity);
  }
 }
 const count = (quantity: number) => `${quantity} ${quantity === 1 ? 'item' : 'itens'}`;
 let total = 0;
 const sections = Array.from(restaurants, ([restaurant, dishes]) => {
  const subtotal = Array.from(dishes.values()).reduce((sum, quantity) => sum + quantity, 0);
  total += subtotal;
  return `🍽️ ${restaurant}\n\n${Array.from(dishes, ([name, quantity]) => `• ${quantity}x ${name}`).join('\n')}\n\nTotal: ${count(subtotal)}`;
 });
 return [...sections, `Total geral: ${count(total)}`].join('\n\n');
}
