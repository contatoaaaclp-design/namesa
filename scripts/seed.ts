import { db } from '../lib/firebase-admin';
import { seedMenus } from '../lib/seed';
async function main() {
 let added = 0;
 for (const menu of seedMenus) {
  const ref = db().collection('menus').doc(menu.id);
  await db().runTransaction(async tx => { if (!(await tx.get(ref)).exists) { tx.create(ref, menu); added++; } });
 }
 console.log(`${added} opções de EXEMPLO adicionadas. Substitua pelos restaurantes reais antes da divulgação.`);
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
