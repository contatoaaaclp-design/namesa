import assert from 'node:assert/strict';
import { db } from '../lib/firebase-admin';
import { defaultCapacity, pickupHours } from '../lib/menu-defaults';
import { garotaMenus } from '../lib/garota-nota-100';
import type { Menu } from '../lib/types';

async function main() {
 const knownIds = new Set(garotaMenus.map(menu => menu.id));
 const updated = await db().runTransaction(async tx => {
  const snapshot = await tx.get(db().collection('menus'));
  for (const doc of snapshot.docs) {
   const menu = doc.data() as Menu;
   if (!pickupHours[menu.meal]) throw new Error(`Refeição inválida: ${doc.id}`);
   if (menu.reserved > defaultCapacity) throw new Error(`Reservas acima de 50: ${doc.id}. Nenhum cardápio foi alterado.`);
  }
  for (const doc of snapshot.docs) {
   const menu = doc.data() as Menu;
   tx.update(doc.ref, {
    capacity: defaultCapacity, pickup: pickupHours[menu.meal],
    ...(knownIds.has(doc.id) && menu.capacity === 0 && menu.price >= 100 ? {active: true} : {}),
   });
  }
  return snapshot.size;
 });
 const saved = await db().collection('menus').get();
 for (const doc of saved.docs) {
  const menu = doc.data() as Menu;
  assert.equal(menu.capacity, defaultCapacity);
  assert.equal(menu.pickup, pickupHours[menu.meal]);
 }
 console.log(`${updated} cardápios atualizados e conferidos: capacidade 50; almoço 12h–13h30; jantar 18h–19h30.`);
 console.log(`${saved.docs.filter(doc => doc.data().active).length} opções publicadas. Reservas e pedidos existentes preservados.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
