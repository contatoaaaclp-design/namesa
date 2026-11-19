'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from './modal';
import QuantityControl from './quantity-control';
import { customize } from '@/lib/customization';
import { isSalesClosed } from '@/lib/sales';
import { dateLabel, money, type Menu, type Selection } from '@/lib/types';

export default function MenuDetails({menu, remaining, close, add}:{menu:Menu;remaining:number;close:()=>void;add:(selections:Selection[],note:string,quantity:number)=>void}) {
 const [selections,setSelections] = useState<Selection[]>([]);
 const [note,setNote] = useState('');
 const [quantity,setQuantity] = useState(1);
 const [error,setError] = useState('');
 const price = customize(menu,selections,false).price;
 const closed = isSalesClosed(menu.date,menu.meal,Date.now(),menu.restaurant);
 const setOption = (groupId:string, optionId:string, count:number, single:boolean) => {
  setError('');
  setSelections(old=>[...old.filter(s=>s.groupId!==groupId || !single && s.optionId!==optionId),...(count>0?[{groupId,optionId,quantity:count}]:[])]);
 };
 return <Modal title={menu.name} close={close}>
  <img className="detail-image" src={menu.image || '/food-placeholder.svg'} alt={menu.name} onError={e=>{e.currentTarget.src='/food-placeholder.svg';}}/>
  <span className="eyebrow orange">{menu.restaurant}</span><p className="modal-lead">{menu.description}</p>
  {(menu.optionGroups || []).map(group=>{
   const count = selections.filter(s=>s.groupId===group.id).reduce((sum,s)=>sum+s.quantity,0);
   return <fieldset className="option-group" key={group.id}><legend>{group.name} <small>{group.min ? 'Obrigatório' : 'Opcional'} · {count}/{group.max}</small></legend>
    <p className="fine-print">{group.min===group.max ? `Escolha ${group.min} opção(ões)` : `Escolha de ${group.min} a ${group.max} opções`}</p>
    {group.options.map(option=>{
     const selected = selections.find(s=>s.groupId===group.id && s.optionId===option.id)?.quantity || 0;
     const inputId = `choice-${group.id}-${option.id}`;
     return <div className="option-row" key={option.id}><label htmlFor={inputId}>{option.name}<small>{option.price ? `+ ${money(option.price)}` : 'Sem acréscimo'}</small></label>
      {group.max===1 ? <input id={inputId} type={group.min ? 'radio' : 'checkbox'} name={`option-${group.id}`} checked={selected>0} onChange={e=>setOption(group.id,option.id,e.target.checked?1:0,true)}/> : option.maxQuantity===1 ? <input id={inputId} type="checkbox" checked={selected>0} disabled={!selected && count>=group.max} onChange={e=>setOption(group.id,option.id,e.target.checked?1:0,false)}/> : <QuantityControl id={inputId} label={option.name} min={0} max={Math.min(option.maxQuantity,group.max-count+selected)} value={selected} onChange={value=>setOption(group.id,option.id,value,false)}/>}
     </div>;
    })}
   </fieldset>;
  })}
  <label className="form-label">Observação desta marmita<textarea maxLength={300} value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex.: sem cebola. Substituições dependem do restaurante."/></label>
  <div className="form-label"><label htmlFor="meal-quantity">Quantidade com estas escolhas</label><QuantityControl id="meal-quantity" label="marmitas com estas escolhas" min={1} max={Math.max(1,remaining)} value={quantity} disabled={remaining<1} onChange={setQuantity}/></div>
  <p className="fine-print">{dateLabel(menu.date)} · {menu.meal} · Retirada: {menu.pickup}. Pedidos até {new Date(menu.deadline).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}.</p>
  {error && <p role="alert" className="checkout-error">{error}</p>}
  <button className="primary full" disabled={closed || remaining<1} onClick={()=>{try {customize(menu,selections);add(selections,note.trim(),quantity);} catch(e){setError((e as Error).message);}}}>Adicionar · {money(price*quantity)} <Plus size={17}/></button>
 </Modal>;
}
