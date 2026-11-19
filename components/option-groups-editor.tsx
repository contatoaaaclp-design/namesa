'use client';
import type { OptionGroup } from '@/lib/types';

export default function OptionGroupsEditor({groups,change}:{groups:OptionGroup[];change:(groups:OptionGroup[])=>void}) {
 const update = (index:number, patch:Partial<OptionGroup>) => change(groups.map((group,i)=>i===index?{...group,...patch}:group));
 return <div className="options-editor"><h3>Personalização do prato</h3>
  {groups.map((group,index)=><fieldset className="option-group" key={group.id}><legend>Grupo {index+1}</legend>
   <label className="form-label">Nome do grupo<input required maxLength={100} value={group.name} onChange={e=>update(index,{name:e.target.value})}/></label>
   <div className="form-grid"><label className="form-label">Mínimo<input type="number" min={0} max={group.max} value={group.min} onChange={e=>update(index,{min:Number(e.target.value)})}/></label><label className="form-label">Máximo<input type="number" min={Math.max(1,group.min)} max={50} value={group.max} onChange={e=>update(index,{max:Number(e.target.value)})}/></label></div>
   {group.options.map((option,optionIndex)=><div className="option-editor-row" key={option.id}>
    <label className="form-label">Opção<input required maxLength={150} value={option.name} onChange={e=>update(index,{options:group.options.map((o,i)=>i===optionIndex?{...o,name:e.target.value}:o)})}/></label>
    <label className="form-label">Adicional (R$)<input type="number" step="0.01" min={0} max={1000} value={option.price/100} onChange={e=>update(index,{options:group.options.map((o,i)=>i===optionIndex?{...o,price:Math.round(Number(e.target.value)*100)}:o)})}/></label>
    <label className="form-label">Limite<input type="number" min={1} max={50} value={option.maxQuantity} onChange={e=>update(index,{options:group.options.map((o,i)=>i===optionIndex?{...o,maxQuantity:Number(e.target.value)}:o)})}/></label>
    <button type="button" className="secondary" onClick={()=>update(index,{options:group.options.filter((_,i)=>i!==optionIndex)})}>Remover opção</button>
   </div>)}
   <button type="button" className="secondary" onClick={()=>update(index,{options:[...group.options,{id:crypto.randomUUID(),name:'Nova opção',price:0,maxQuantity:1}]})}>Adicionar opção</button>{' '}
   <button type="button" className="secondary" onClick={()=>change(groups.filter((_,i)=>i!==index))}>Remover grupo</button>
  </fieldset>)}
  <button type="button" className="secondary" onClick={()=>change([...groups,{id:crypto.randomUUID(),name:'Novo grupo',min:0,max:1,options:[{id:crypto.randomUUID(),name:'Nova opção',price:0,maxQuantity:1}]}])}>Adicionar grupo de escolhas</button>
 </div>;
}
