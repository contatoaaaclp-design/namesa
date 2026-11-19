import products from '../data/imports/external-products.json';
import { defaultCapacity, pickupHours } from './menu-defaults';
import { salesDeadline } from './sales';
import type { Menu, OptionGroup } from './types';

// Horários confirmados: ambos atendem somente almoço de sexta/sábado; domingo fechado.
export const externalMenus: Menu[] = products.flatMap(product=>['2026-11-20','2026-11-21'].map(date=>({
 ...product, optionGroups:product.optionGroups as OptionGroup[],
 id:`${product.id}-${date}`, date, meal:'Almoço' as const,
 deadline:salesDeadline(date,'Almoço'), pickup:pickupHours['Almoço'],
 capacity:defaultCapacity, reserved:0, active:false, ready:false,
 tags: [...new Set([...product.tags,...(/vegetariana/i.test(product.name)?['Vegetariano']:[])])],
})));
