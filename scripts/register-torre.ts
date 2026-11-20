import assert from 'node:assert/strict';
import { db } from '../lib/firebase-admin';
import { menuSchema } from '../lib/domain';
import { torreMenus } from '../lib/torre-menus';

async function main() {
 for (const menu of torreMenus) menuSchema.parse(menu);
 const refs = torreMenus.map(menu => db().collection('menus').doc(menu.id));
 const created = await db().runTransaction(async tx => {
  const existing = await tx.getAll(...refs);
  let count = 0;
  torreMenus.forEach((menu, index) => {
   if (!existing[index].exists) { tx.create(refs[index], menu); count++; }
   else tx.update(refs[index], { deadline: menu.deadline });
  });
  return count;
 });
 const saved = await db().getAll(...refs);
 for (const doc of saved) {
  assert.ok(doc.exists);
  assert.match(doc.data()!.deadline, /T19:45:00-03:00$/);
 }
 console.log(JSON.stringify({ created, verified: saved.length, deadline: '19h45', dates: ['20/11', '21/11', '22/11'] }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
