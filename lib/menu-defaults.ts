import type { Meal } from './types';

export const defaultCapacity = 50;
export const pickupHours: Record<Meal, string> = {
 'Almoço': '12h às 13h30',
 'Jantar': '18h às 19h30',
};
