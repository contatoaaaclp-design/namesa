import { defaultCapacity } from './menu-defaults';
import { salesDeadline } from './sales';
import { torreRestaurant } from './torre';
import type { Menu, OptionGroup } from './types';

type Product = { id: string; name: string; description: string; price: number; tags: string[]; basePrice?: number; optionGroups?: OptionGroup[] };
const options = (values: [string, number][]) => values.map(([name, price], index) => ({ id: String(index), name, price: price * 100, maxQuantity: 1 }));
const sizeGroup = (special: boolean): OptionGroup => ({ id: 'size', name: 'Tamanho', min: 1, max: 1, options: options(special
 ? [['Pequena', 42], ['Média', 46], ['Grande', 50]]
 : [['Pequena', 24], ['Média', 27], ['Grande', 32], ['Prato feito', 27], ['Kit — serve 3 pessoas', 75]]) });
const extras: OptionGroup = { id: 'extras', name: 'Acréscimos', min: 0, max: 15, options: options([
 ['Catupiry', 6], ['Cheddar', 6], ['Hambúrguer', 6], ['Frango', 6], ['Calabresa', 6], ['Salsicha', 5], ['Queijo', 5], ['Presunto', 2], ['Batata palha', 2], ['Ovo', 3], ['Milho verde', 2], ['Alface', 2], ['Tomate', 2], ['Cebola', 2], ['Bacon', 6],
]) };
const marmitex: Product[] = ([
 ['frango-parmegiana', 'Frango à parmegiana', 'frango à parmegiana e batata frita'],
 ['bife-parmegiana', 'Bife à parmegiana', 'bife à parmegiana e batata frita'],
 ['tradicional', 'Tradicional', 'bife grelhado, frango grelhado e batata frita'],
 ['bife-cavalo', 'Bife a cavalo', 'bife grelhado, ovo e batata frita'],
 ['frango-cavalo', 'Frango a cavalo', 'frango grelhado, ovo e batata frita'],
 ['calabresa-cavalo', 'Calabresa a cavalo', 'calabresa, ovo e batata frita'],
 ['bistequinha-cavalo', 'Bistequinha de porco a cavalo', 'bisteca de porco grelhada, ovo e batata frita'],
 ['picanha', 'Picanha', 'batata frita, ovo frito e picanha grelhada'],
 ['file-parmegiana', 'Filé mignon à parmegiana', 'batata frita e filé mignon à parmegiana'],
] as const).map(([id, name, sides], index) => ({ id: `marmitex-${id}`, name: `Marmitex ${name}`, description: `Arroz, feijão, ${sides}.`, price: index >= 7 ? 4200 : 2400, basePrice: 0, optionGroups: [sizeGroup(index >= 7)], tags: [index >= 7 ? 'Marmitex especial' : 'Marmitex'] }));

const sandwiches: [string, string, number, string][] = [
 ['x-burguer', 'X-Burguer', 17, 'hambúrguer e queijo'],
 ['x-burguer-duplo', 'X-Burguer duplo', 22, '2 hambúrgueres e queijo em dobro'],
 ['x-burguer-duplo-catu', 'X-Burguer duplo catu', 28, '2 hambúrgueres, catupiry e queijo em dobro'],
 ['x-burguer-duplo-cheddar', 'X-Burguer duplo cheddar', 28, '2 hambúrgueres, cheddar e queijo em dobro'],
 ['x-salada', 'X-Salada', 22, 'hambúrguer, queijo, alface e tomate'],
 ['x-salada-catu', 'X-Salada catu', 26, 'hambúrguer, catupiry, queijo, batata palha, alface e tomate'],
 ['x-bacon', 'X-Bacon', 28, 'hambúrguer, bacon, queijo, batata palha, alface e tomate'],
 ['x-calabresa', 'X-Calabresa', 28, 'calabresa, hambúrguer, queijo e batata palha'],
 ['x-egg', 'X-Egg', 27, 'hambúrguer, ovo, queijo, batata palha, alface e tomate'],
 ['americano', 'Americano', 28, 'hambúrguer, presunto, ovo, queijo, catupiry e batata palha'],
 ['americano-salada', 'Americano salada', 30, 'hambúrguer, presunto, ovo, queijo, catupiry, batata palha, alface e tomate'],
 ['x-torre', 'X-Torre', 37, 'hambúrguer crocante, presunto, bacon, queijo, catupiry, batata palha, alface e tomate'],
 ['x-tudo', 'X-Tudo', 39, 'hambúrguer, presunto, ovo, queijo, bacon, calabresa, milho verde, catupiry, batata palha, alface e tomate'],
 ['dog-simples', 'Dog simples', 16, '2 salsichas, alface, tomate, milho verde e batata palha'],
 ['dog-especial', 'Dog especial', 23, '2 salsichas, queijo, catupiry, alface, tomate, milho verde e batata palha'],
 ['dog-calabresa', 'Dog calabresa', 28, '2 salsichas, calabresa, queijo, alface, tomate, milho verde e batata palha'],
 ['casa-blanca', 'Casa Blanca', 30, 'frango, presunto, queijo, catupiry, milho verde e batata palha'],
 ['x-frango', 'X-Frango', 17, 'frango e queijo'],
 ['x-frango-duplo', 'X-Frango duplo', 24, 'frango e queijo em dobro'],
 ['x-frango-duplo-cheddar', 'X-Frango duplo cheddar', 28, 'frango, cheddar e queijo em dobro'],
 ['x-frango-duplo-catu', 'X-Frango duplo catu', 28, 'frango, catupiry e queijo em dobro'],
 ['x-frango-salada', 'X-Frango salada', 20, 'frango, queijo, alface e tomate'],
 ['x-frango-salada-catu', 'X-Frango salada catu', 26, 'frango, queijo, catupiry, alface e tomate'],
 ['x-frango-calabresa', 'X-Frango calabresa', 28, 'frango, calabresa, queijo, batata palha, alface e tomate'],
 ['x-frango-bacon', 'X-Frango bacon', 28, 'frango, bacon, queijo, batata palha, alface e tomate'],
 ['x-torre-frango', 'X-Torre frango', 35, 'frango crocante, bacon, presunto, queijo, catupiry, batata palha, alface e tomate'],
 ['casa-pleta', 'Casa Pleta', 45, 'filé mignon, presunto, queijo, catupiry, milho verde e batata palha'],
 ['x-file', 'X-Filé', 42, 'filé mignon, queijo, catupiry, batata palha, alface e tomate'],
 ['x-file-bacon', 'X-Filé bacon', 45, 'filé mignon, bacon, queijo, catupiry, batata palha, alface e tomate'],
 ['x-file-americano-salada', 'X-Filé americano salada', 45, 'filé mignon, ovo, presunto, queijo, catupiry, batata palha, alface e tomate'],
 ['x-file-americano', 'X-Filé americano', 45, 'filé mignon, ovo, presunto, queijo, catupiry e batata palha'],
];
const products: Product[] = [
 ...marmitex,
 ...sandwiches.map(([id, name, price, filling]) => ({ id, name, description: `Pão de hambúrguer, molho especial, ${filling}.`, price: price * 100, tags: ['Lanches'], basePrice: price * 100, optionGroups: [extras] })),
 ...([
  ['misto', 'Misto quente', 12, 'Pão de hambúrguer, presunto e queijo.'],
  ['bauru', 'Bauru', 14, 'Pão de hambúrguer, presunto, queijo e tomate.'],
  ['churrasquinho', 'Churrasquinho', 18, 'Pão de hambúrguer, carne grelhada e queijo.'],
 ] as [string, string, number, string][]).map(([id, name, price, description]) => ({ id, name, description, price: price * 100, basePrice: price * 100, tags: ['Lanches'], optionGroups: [extras] })),
 ...([
  ['batata', 'Batata frita — 450 g', 24, 'Porção de batata frita de 450 g.'],
  ['calabresa', 'Calabresa acebolada — 300 g', 30, 'Porção de calabresa acebolada de 300 g.'],
  ['mista', 'Porção mista', 30, '200 g de batata frita e 200 g de calabresa acebolada.'],
  ['combo', 'Combo Torre', 78, '3 X-Salada, uma porção de batata frita e uma Coca-Cola de 2 litros.'],
 ] as [string, string, number, string][]).map(([id, name, price, description]) => ({ id, name, price: price * 100, description, tags: ['Porções e combo'] })),
 ...(['Lasanha de presunto e queijo', 'Nhoque recheado de queijo', 'Canelone de 4 queijos', 'Rondelli de ricota com espinafre', 'Nhoque de mandioca']).flatMap((name, index) => ['ao sugo', 'ao molho bolonhesa'].map((sauce, sauceIndex) => ({ id: `massa-${index}-${sauceIndex}`, name: `${name} ${sauce}`, description: `${name} ${sauce}.`, price: sauceIndex ? 2600 : 2400, tags: ['Massas'] }))),
 ...([
  ['file-parmegiana', 'Filé mignon à parmegiana', 130, 'Arroz, batata frita ou purê, banana à milanesa, filé mignon com mussarela ao molho de tomate.'],
  ['file-carioca', 'Filé mignon à parmegiana carioca', 160, 'Arroz, batata frita ou purê, banana à milanesa, filé mignon com mussarela ao molho de tomate, presunto, ervilhas, palmito e azeitonas pretas.'],
  ['file-torre', 'Filé mignon Torre', 160, 'Arroz, batata frita ou purê, banana à milanesa, filé mignon com mussarela e requeijão ao molho de tomate.'],
  ['frango-parmegiana', 'Frango à parmegiana', 85, 'Arroz, batata frita ou purê, banana à milanesa, filé de frango com mussarela ao molho de tomate.'],
  ['frango-carioca', 'Frango à parmegiana carioca', 95, 'Arroz, batata frita ou purê, banana à milanesa, filé de frango com mussarela ao molho de tomate, presunto, ervilhas, palmito e azeitonas pretas.'],
  ['bife-parmegiana', 'Bife à parmegiana', 100, 'Arroz, batata frita ou purê, banana à milanesa, bife com mussarela ao molho de tomate.'],
  ['bife-carioca', 'Bife à parmegiana carioca', 115, 'Arroz, batata frita ou purê, banana à milanesa, bife com mussarela ao molho de tomate, presunto, ervilhas, palmito e azeitonas pretas.'],
  ['picanha-torre', 'Picanha Torre', 140, 'Arroz, batata frita, ovos fritos, farofa e picanha.'],
  ['picanha-mineira', 'Picanha mineira', 160, 'Arroz, tutu de feijão, banana à milanesa, batata frita, ovos fritos, farofa e picanha.'],
 ] as [string, string, number, string][]).map(([id, name, price, description]) => ({ id: `carte-${id}`, name: `${name} — serve 3 pessoas`, description, price: price * 100, tags: ['À la carte'], ...(/purê/.test(description) ? { basePrice: price * 100, optionGroups: [{ id: 'side', name: 'Acompanhamento', min: 1, max: 1, options: options([['Batata frita', 0], ['Purê', 0]]) }] } : {}) })),
];

// Cardápio noturno das fotos; a retirada depende do aviso da equipe.
export const torreMenus: Menu[] = ['2026-11-20', '2026-11-21', '2026-11-22'].flatMap(date => products.map(product => ({
 ...product, id: `torre-${product.id}-${date}`, restaurant: torreRestaurant, date, meal: 'Jantar',
 deadline: salesDeadline(date, 'Jantar', torreRestaurant), pickup: 'Aguardar aviso de chegada no alojamento',
 capacity: defaultCapacity, reserved: 0, active: true, ready: false, image: '',
})));
