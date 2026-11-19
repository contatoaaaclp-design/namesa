'use client';
import { Minus, Plus } from 'lucide-react';

export default function QuantityControl({id,label,value,min,max,disabled=false,onChange}:{id:string;label:string;value:number;min:number;max:number;disabled?:boolean;onChange:(value:number)=>void}) {
 const change = (next:number) => onChange(Math.max(min,Math.min(max,Math.floor(next))));
 return <div className="quantity-control" role="group" aria-label={`Quantidade de ${label}`}>
  <button type="button" aria-label={`Diminuir quantidade de ${label}`} disabled={disabled || value<=min} onClick={()=>change(value-1)}><Minus size={17}/></button>
  <input id={id} aria-label={`Quantidade de ${label}`} type="number" inputMode="numeric" step={1} min={min} max={max} value={value} disabled={disabled} onChange={e=>change(Number(e.target.value)||min)}/>
  <button type="button" aria-label={`Aumentar quantidade de ${label}`} disabled={disabled || value>=max} onClick={()=>change(value+1)}><Plus size={17}/></button>
 </div>;
}
