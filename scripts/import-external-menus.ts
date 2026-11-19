import assert from 'node:assert/strict';
import { db } from '../lib/firebase-admin';
import { externalMenus } from '../lib/external-menus';
import { garotaMenus } from '../lib/garota-nota-100';
import { menuSchema } from '../lib/domain';

async function main() {
 const menus = externalMenus.map(menu=>({...menuSchema.parse(menu),id:menu.id,reserved:menu.reserved,ready:menu.ready}));
 // Publica automaticamente quando o servidor do site já suporta o novo formato.
 let supported = false;
 if (process.env.APP_URL) {
  try {
   const response = await fetch(new URL('/api/payments/config',process.env.APP_URL),{signal:AbortSignal.timeout(15000)});
   supported = response.ok && (await response.json()).menuCustomization === true;
  } catch { /* Dados são importados ocultos até o deploy do servidor compatível. */ }
 }
 const result = await db().runTransaction(async tx=>{
  const refs = menus.map(menu=>db().collection('menus').doc(menu.id));
  const existing = await tx.getAll(...refs);
  const garotaRefs = garotaMenus.map(menu=>db().collection('menus').doc(menu.id));
  const garotaExisting = await tx.getAll(...garotaRefs);
  let created = 0;
  menus.forEach((menu,index)=>{
   const previous = existing[index];
   if (!previous.exists) {tx.create(refs[index],{...menu,active:supported});created++;}
   else if (supported && !previous.data()!.active) tx.update(refs[index],{active:true});
  });
  garotaMenus.forEach((menu,index)=>{
   if (garotaExisting[index].exists) tx.update(garotaRefs[index],{description:menu.description});
  });
  return {created,cleaned:garotaExisting.filter(doc=>doc.exists).length};
 });
 const saved = await db().getAll(...menus.map(menu=>db().collection('menus').doc(menu.id)));
 for (const doc of saved) {
  assert.equal(doc.exists,true);
  assert.equal(doc.data()!.meal,'Almoço');
  assert.ok(['2026-11-20','2026-11-21'].includes(doc.data()!.date));
  if (supported) assert.equal(doc.data()!.active,true);
 }
 const cleaned = await db().getAll(...garotaMenus.map(menu=>db().collection('menus').doc(menu.id)));
 cleaned.forEach((doc,index)=>{if (doc.exists) assert.equal(doc.data()!.description,garotaMenus[index].description);});
 console.log(JSON.stringify({products:menus.length/2,menus:menus.length,...result,published:supported,verified:saved.length}));
 if (!supported) console.log('Cardápios salvos ocultos: publique o código e execute este comando novamente para liberar a personalização no site.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
