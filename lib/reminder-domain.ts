import { days, type Meal, type Menu, type Order } from './types';
import { salesDeadline } from './sales';
export type ReminderWindow={id:string;date:string;meal:Meal;startsAt:number;endsAt:number;title:string;body:string};
export function purchaseReminderWindows(now=Date.now()):ReminderWindow[] {
 return days.flatMap(({date})=>(['Almoço','Jantar'] as const).map(meal=>{
  const startsAt=Date.parse(`${date}T${meal==='Almoço'?'10:00':'17:30'}:00-03:00`);
  const endsAt=Date.parse(salesDeadline(date,meal));
  return {id:`${date}_${meal==='Almoço'?'lunch':'dinner'}`,date,meal,startsAt,endsAt,title:meal==='Almoço'?'Já garantiu seu almoço?':'Já garantiu sua janta?',body:`Peça ${meal==='Almoço'?'o almoço':'a janta'} de hoje no Inter na Mesa. As vendas encerram às ${meal==='Almoço'?'10h30':'18h'} (Brasília).`};
 })).filter(window=>now>=window.startsAt && now<window.endsAt);
}
export function hasReminderStock(menus:Menu[],window:ReminderWindow){return menus.some(menu=>menu.date===window.date && menu.meal===window.meal && menu.active && Date.parse(salesDeadline(menu.date,menu.meal,menu.restaurant))>window.startsAt && menu.reserved<menu.capacity);}
export function needsPurchaseReminder(orders:Pick<Order,'status'|'expiresAt'|'items'|'paymentEnvironment'|'paymentProvider'>[], window:ReminderWindow,environment:'production'|'sandbox',now=Date.now()) {
 return !orders.some(order=>(order.paymentProvider!=='efi' || order.paymentEnvironment===environment) && (order.status==='paid' || order.status==='pending' && Date.parse(order.expiresAt)>now) && order.items.some(item=>item.date===window.date && item.meal===window.meal));
}
