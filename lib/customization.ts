import type { CartItem, Menu, Selection } from './types';

export function cartKey(item: Pick<CartItem, 'menuId' | 'selections' | 'note'>) {
 return JSON.stringify([item.menuId, (item.selections || []).map(s => [s.groupId,s.optionId,s.quantity]).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b))), (item.note || '').trim()]);
}

export function customize(menu: Menu, selections: Selection[] = [], validate = true) {
 const groups = menu.optionGroups || [];
 const seen = new Set<string>();
 for (const selection of selections) {
  const key = JSON.stringify([selection.groupId, selection.optionId]);
  const option = groups.find(group => group.id === selection.groupId)?.options.find(option => option.id === selection.optionId);
  if (seen.has(key) || !option || !Number.isInteger(selection.quantity) || selection.quantity < 1 || selection.quantity > option.maxQuantity) throw new Error('Escolha inválida para este prato.');
  seen.add(key);
 }
 let price = menu.basePrice ?? menu.price;
 const labels: string[] = [];
 for (const group of groups) {
  const selected = selections.filter(s => s.groupId === group.id);
  const quantity = selected.reduce((sum,s) => sum+s.quantity,0);
  if (validate && (quantity < group.min || quantity > group.max)) throw new Error(`${group.name}: escolha entre ${group.min} e ${group.max} opção(ões).`);
  const amounts = selected.map(s => group.options.find(o => o.id === s.optionId)!.price*s.quantity);
  price += group.pricing === 'max' ? Math.max(0,...amounts) : amounts.reduce((sum,value) => sum+value,0);
  if (selected.length) labels.push(`${group.name}: ${selected.map(s => `${s.quantity > 1 ? `${s.quantity}× ` : ''}${group.options.find(o => o.id === s.optionId)!.name}`).join(', ')}`);
 }
 return { price, customization: labels.join(' · ') };
}

export function menuQuantities(items: {menuId:string;quantity:number}[]) {
 const totals = new Map<string,number>();
 for (const item of items) totals.set(item.menuId,(totals.get(item.menuId)||0)+item.quantity);
 return totals;
}

export function startingPrice(menu: Pick<Menu,'price'|'basePrice'|'optionGroups'>) {
 let price = menu.basePrice ?? menu.price;
 for (const group of menu.optionGroups || []) {
  const amounts = group.options.flatMap(option=>Array.from({length:option.maxQuantity},()=>option.price)).sort((a,b)=>a-b).slice(0,group.min);
  price += group.pricing === 'max' ? Math.max(0,...amounts) : amounts.reduce((sum,value)=>sum+value,0);
 }
 return price;
}

export function previewCustomization(menu: Menu, selections?: Selection[]) {
 try {return customize(menu,selections,false);} catch {return {price:menu.price,customization:'As opções mudaram. Remova este item e escolha novamente.'};}
}
