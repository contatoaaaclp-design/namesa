import { db } from '../lib/firebase-admin';
import { garotaMenus } from '../lib/garota-nota-100';
import { menuSchema } from '../lib/domain';

async function main() {
 for (const menu of garotaMenus) menuSchema.parse(menu);
 let added = 0;
 for (const menu of garotaMenus) {
  const ref = db().collection('menus').doc(menu.id);
  const created = await db().runTransaction(async tx => {
   if ((await tx.get(ref)).exists) return false;
   tx.create(ref, menu);
   return true;
  });
  if (created) added++;
 }
 console.log(`${added} op\u00e7\u00f5es cadastradas com capacidade 50 e retirada padr\u00e3o. Cadastros existentes preservados.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
