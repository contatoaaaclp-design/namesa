import type { Meal, Menu } from './types';
import { garotaRestaurant } from './garota-nota-100';
export const mealHours = { 'Almoço': { notice: '10h', close: '10h30', cutoff: '10:30' }, 'Jantar': { notice: '17h30', close: '18h', cutoff: '18:00' } } as const;
export function salesDeadline(date: string, meal: Meal, restaurant?: string) { if (restaurant === garotaRestaurant && date === '2026-11-22') return '2026-11-21T13:00:00-03:00'; return `${date}T${mealHours[meal].cutoff}:00-03:00`; }
export function normalizeMenu(menu: Menu): Menu { return {...menu, deadline:salesDeadline(menu.date,menu.meal,menu.restaurant)}; }
export function isSalesClosed(date: string, meal: Meal, now=Date.now(), restaurant?: string) { return now>=Date.parse(salesDeadline(date,meal,restaurant)); }
export function paymentDeadline(items:{date:string;meal:Meal;restaurant?:string}[], now=Date.now()) { return new Date(Math.min(now+1800000,...items.map(i=>Date.parse(salesDeadline(i.date,i.meal,i.restaurant))))).toISOString(); }
