import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cartKey, customize, menuQuantities, startingPrice } from '../lib/customization';
import { priceCart, checkoutSchema, menuSchema } from '../lib/domain';
import { externalMenus } from '../lib/external-menus';
import { garotaMenus } from '../lib/garota-nota-100';
import type { Menu, Selection } from '../lib/types';

const now = Date.parse('2026-11-19T12:00:00-03:00');
const menu:Menu = {...garotaMenus[0],id:'custom',price:2000,basePrice:0,capacity:5,optionGroups:[
 {id:'size',name:'Tamanho',min:1,max:1,options:[{id:'p',name:'Pequena',price:2000,maxQuantity:1},{id:'g',name:'Grande',price:2400,maxQuantity:1}]},
 {id:'salad',name:'Salada',min:1,max:1,options:[{id:'none',name:'Sem salada',price:0,maxQuantity:1}]},
 {id:'extras',name:'Adicionais',min:0,max:3,options:[{id:'egg',name:'Ovo',price:300,maxQuantity:3}]},
]};
const choices:Selection[] = [{groupId:'size',optionId:'p',quantity:1},{groupId:'salad',optionId:'none',quantity:1}];

test('preço e descrições das escolhas vêm exclusivamente do cardápio',()=>{
 const selections=[...choices,{groupId:'extras',optionId:'egg',quantity:2}];
 const result=priceCart([menu],[{menuId:menu.id,quantity:2,selections,note:'Sem cebola'}],now);
 assert.equal(result.total,5200);
 assert.match(result.items[0].customization!,/Tamanho: Pequena/);
 assert.match(result.items[0].customization!,/2× Ovo/);
 assert.equal(result.items[0].note,'Sem cebola');
 menu.optionGroups![2].options[0].price=400;
 assert.equal(customize(menu,selections).price,2800);
 menu.optionGroups![2].options[0].price=300;
});

test('exige escolhas obrigatórias e rejeita desconhecidas, repetidas e limites inválidos',()=>{
 for(const selections of [[],[...choices,choices[0]],[...choices,{groupId:'unknown',optionId:'x',quantity:1}],[...choices,{groupId:'extras',optionId:'egg',quantity:4}],[...choices,{groupId:'extras',optionId:'egg',quantity:-1}],[...choices,{groupId:'size',optionId:'g',quantity:1}]]) {
  assert.throws(()=>priceCart([menu],[{menuId:menu.id,quantity:1,selections}],now));
 }
});

test('combinações diferentes somam estoque; duplicatas continuam bloqueadas',()=>{
 const second=choices.map(s=>s.groupId==='size'?{...s,optionId:'g'}:s);
 const items=[{menuId:menu.id,quantity:2,selections:choices},{menuId:menu.id,quantity:3,selections:second}];
 assert.equal(priceCart([menu],items,now).total,11200);
 assert.equal(menuQuantities(items).get(menu.id),5);
 assert.throws(()=>priceCart([{...menu,reserved:1}],items,now),/indisponível/);
 assert.throws(()=>priceCart([menu],[items[0],items[0]],now),/repetidos/);
 assert.equal(cartKey(items[0]),cartKey({...items[0],selections:[...choices].reverse()}));
 assert.notEqual(cartKey(items[0]),cartKey({...items[0],note:'Sem cebola'}));
});

test('checkout aceita escolhas, remove preços enviados pelo cliente e limita observações',()=>{
 const raw={requestId:'5d4dfbb3-d824-4629-bb20-a614614075ef',cpf:'12345678901',items:[{menuId:menu.id,quantity:1,selections:choices,price:1}]};
 const data=checkoutSchema.parse(raw);
 assert.equal('price' in data.items[0],false);
 assert.equal(data.items[0].selections?.length,2);
 assert.equal(checkoutSchema.safeParse({...raw,items:[{...raw.items[0],note:'x'.repeat(301)}]}).success,false);
});

test('todos os produtos importados validam, usam preço mínimo correto e respeitam os dias confirmados',()=>{
 assert.equal(externalMenus.length,124);
 assert.equal(new Set(externalMenus.map(m=>m.restaurant)).size,2);
 for(const menu of externalMenus) {
  assert.equal(menuSchema.safeParse(menu).success,true,menu.name);
  assert.equal(menu.price,startingPrice(menu),menu.name);
  assert.equal(menu.meal,'Almoço');
  assert.notEqual(menu.date,'2026-11-22');
  assert.equal(menu.capacity,50);
  const selections:Selection[]=[];
  for(const group of menu.optionGroups || []) {
   let remaining=group.min;
   for(const option of [...group.options].sort((a,b)=>a.price-b.price)) {
    const quantity=Math.min(remaining,option.maxQuantity);
    if(quantity) selections.push({groupId:group.id,optionId:option.id,quantity});
    remaining-=quantity;
   }
  }
  assert.equal(customize(menu,selections).price,menu.price,menu.name);
  assert.doesNotThrow(()=>priceCart([{...menu,active:true}],[{menuId:menu.id,quantity:1,selections}],now));
 }
 for(const menu of garotaMenus) assert.doesNotMatch(menu.description,/WhatsApp|Sexta:|Rua dos/);
});
