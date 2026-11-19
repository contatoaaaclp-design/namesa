import assert from 'node:assert/strict';
import { db } from '../lib/firebase-admin';
import { garotaMenus } from '../lib/garota-nota-100';
import { menuSchema } from '../lib/domain';

async function main() {
 const menus = garotaMenus.filter(menu => menu.date === '2026-11-22');
 for (const menu of menus) menuSchema.parse(menu);
 await db().runTransaction(async tx => {
  const refs = menus.map(menu => db().collection('menus').doc(menu.id));
  const existing = await tx.getAll(...refs);
  menus.forEach((menu, index) => {
   if (existing[index].exists) {
    tx.update(refs[index], {name: menu.name, description: menu.description, price: menu.price, tags: menu.tags});
   } else tx.create(refs[index], menu);
  });
 });
 const saved = await db().getAll(...menus.map(menu => db().collection('menus').doc(menu.id)));
 saved.forEach((doc, index) => {
  assert.equal(doc.data()?.price, menus[index].price);
  assert.equal(doc.data()?.name, menus[index].name);
 });
 console.log('Domingo atualizado e conferido: pequena R$ 20, média R$ 22, grande R$ 24.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
