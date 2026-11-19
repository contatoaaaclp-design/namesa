import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MenuDetails from '../components/menu-details';
import { externalMenus } from '../lib/external-menus';

for (const restaurant of ['Sabor & Cia','Lar dos Sabores']) {
 const menu = externalMenus.find(menu=>menu.restaurant===restaurant && menu.optionGroups!.length>0)!;
 const html = renderToStaticMarkup(createElement(MenuDetails,{menu:{...menu,active:true},remaining:10,close:()=>{},add:()=>{}}));
 assert.ok(html.includes('role="dialog"'));
 assert.ok(html.includes('type="radio"'));
 assert.ok(html.includes('type="number"'));
 assert.ok(html.includes('textarea'));
 assert.equal((html.match(/class="option-group"/g)||[]).length,menu.optionGroups!.length);
 console.log(`${restaurant}: formulário renderizado; ${menu.optionGroups!.length} grupos, opções, quantidade e observação.`);
}
