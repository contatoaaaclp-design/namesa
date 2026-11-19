import { defaultCapacity, pickupHours } from './menu-defaults';
import type { Menu } from './types';

export const garotaRestaurant = 'Marmitex Garota Nota 100';
export const garotaService = 'Sexta: 8h às 17h. Sábado: 8h às 13h. Domingo: somente por encomenda até sábado às 13h. Delivery ou retirada. WhatsApp: (18) 99602-8925. Rua dos Girassóis, 193, Cecap.';
// Capacidade e retirada seguem os padrões definidos pela organização.
export const garotaMenus: Menu[] = [
 { date: '2026-11-20', key: 'costela', name: 'Costela cozida', description: 'Arroz, feijão, costela cozida, escabeche de giló e trio de legumes.', prices: [2000, 2200, 2400] },
 { date: '2026-11-20', key: 'bisteca', name: 'Bisteca suína', description: 'Arroz, feijão, bisteca suína, escabeche de giló e trio de legumes.', prices: [2000, 2200, 2400] },
 { date: '2026-11-21', key: 'churrasco', name: 'Churrasco', description: 'Arroz temperado, churrasco, mandioca cozida e farofa.', prices: [2200, 2500, 2800] },
 { date: '2026-11-21', key: 'feijoada', name: 'Feijoada', description: 'Arroz, feijoada, couve, torresmo e farofa.', prices: [2200, 2500, 2800] },
].flatMap(item => ['Pequena', 'Média', 'Grande'].map((size, index) => ({
 id: `garota-${item.date}-${item.key}-${index}`, restaurant: garotaRestaurant,
 name: `${item.name} — ${size}`, description: item.description,
 price: item.prices[index], date: item.date, meal: 'Almoço' as const,
 deadline: `${item.date}T10:30:00-03:00`, pickup: pickupHours['Almoço'],
 capacity: defaultCapacity, reserved: 0, tags: [size], image: '', active: true, ready: false,
}))).concat(['Pequena', 'Média', 'Grande'].map((size, index) => ({
 id: index === 0 ? 'garota-2026-11-22-frango-assado' : `garota-2026-11-22-frango-assado-${index}`,
 restaurant: garotaRestaurant, name: `Frango assado — ${size}`,
 description: `Arroz, feijão, macarronada, frango assado, farofa e salada de maionese.`,
 price: [2000, 2200, 2400][index], date: '2026-11-22', meal: 'Almoço' as const, deadline: '2026-11-21T13:00:00-03:00',
 pickup: pickupHours['Almoço'], capacity: defaultCapacity, reserved: 0, tags: [size, 'Sob encomenda'], image: '', active: true, ready: false,
})));
