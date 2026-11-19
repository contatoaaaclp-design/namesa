'use client';
import { useState } from 'react';
import type { PaymentMethod } from '@/lib/card-domain';
import { paymentQuote } from '@/lib/card-domain';
import { money } from '@/lib/types';
type Card = {paymentToken:string;tdsIdentifier:string;name:string;phone:string};
export default function CheckoutForm({subtotal,demo,credit,sandbox,submit,onBusy}:{subtotal:number;demo:boolean;credit:boolean;sandbox:boolean;onBusy:(value:boolean)=>void;submit:(cpf:string,note:string,method:PaymentMethod,card?:Card)=>Promise<void>}) {
 const [method,setMethod]=useState<PaymentMethod>('pix');const [cpf,setCpf]=useState('');const [note,setNote]=useState('');
 const [name,setName]=useState('');const [phone,setPhone]=useState('');const [number,setNumber]=useState('');const [expiry,setExpiry]=useState('');const [cvv,setCvv]=useState('');
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const quote=paymentQuote(subtotal,method);
 async function pay(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);onBusy(true);setError('');
  try{
   let card:Card|undefined;
   if(method==='credit' && !demo){
    const EfiPay=(await import('payment-token-efi')).default;
    if(await EfiPay.CreditCard.isScriptBlocked())throw new Error('Permita o serviço de segurança da Efí neste navegador para pagar com cartão.');
    const brand=await EfiPay.CreditCard.setCardNumber(number).verifyCardBrand();
    if(!['visa','mastercard','amex','elo'].includes(brand))throw new Error('Bandeira não aceita pela Efí.');
    // The provider's 3.5 runtime supports 3DS, while its bundled declaration omits these fields.
    const data={brand,number,cvv,expirationMonth:expiry.slice(0,2),expirationYear:expiry.slice(3),holderName:name,holderDocument:cpf,reuse:false,enable3ds:true,totalValue:quote.total};
    const result=await EfiPay.CreditCard.setAccount(process.env.NEXT_PUBLIC_EFI_PAYEE_CODE || '').setEnvironment(sandbox?'sandbox':'production').setCreditCardData(data).getPaymentToken() as {payment_token?:string;tds_identifier?:string};
    if(!result.payment_token || !result.tds_identifier)throw new Error('Não foi possível validar o cartão. Confira os dados ou escolha Pix.');
    card={paymentToken:result.payment_token,tdsIdentifier:result.tds_identifier,name,phone};
    setNumber('');setCvv('');setExpiry('');
   }
   await submit(cpf,note,method,card);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível validar o cartão. Confira os dados ou escolha Pix.');}finally{setBusy(false);onBusy(false);}
 }
 return <form onSubmit={pay}>
  <fieldset disabled={busy} className="payment-methods"><legend>Como quer pagar?</legend>
   <label><input type="radio" name="paymentMethod" checked={method==='pix'} onChange={()=>setMethod('pix')}/> Pix <small>Sem acréscimo</small></label>
   <label><input type="radio" name="paymentMethod" checked={method==='credit'} disabled={!credit} onChange={()=>setMethod('credit')}/> Crédito à vista <small>{credit?'Taxa de 3,49%':'Em breve · aguardando configuração'}</small></label>
   <label className="unavailable"><input type="radio" disabled/> Débito <small>Indisponível na Efí</small></label>
  </fieldset>
  <fieldset disabled={busy} className="checkout-fields">
   <label className="form-label">CPF do pagador<small>{demo?'Dispensado na demonstração':'Enviado ao provedor de pagamento'}</small><input required={!demo} minLength={demo?undefined:11} maxLength={11} inputMode="numeric" autoComplete="off" value={cpf} onChange={e=>setCpf(e.target.value.replace(/\D/g,''))} placeholder="00000000000"/></label>
   {method==='credit' && !demo && <><label className="form-label">Nome completo do titular<input required autoComplete="cc-name" value={name} onChange={e=>setName(e.target.value)} minLength={3} maxLength={100}/></label><label className="form-label">Celular com DDD<input required inputMode="tel" autoComplete="tel-national" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,11))} minLength={10} maxLength={11}/></label><label className="form-label">Número do cartão<input required inputMode="numeric" autoComplete="cc-number" value={number} onChange={e=>setNumber(e.target.value.replace(/\D/g,'').slice(0,19))} minLength={13} maxLength={19}/></label><div className="card-fields"><label className="form-label">Validade (MM/AAAA)<input required inputMode="numeric" autoComplete="cc-exp" placeholder="11/2029" pattern="(0[1-9]|1[0-2])/[0-9]{4}" value={expiry} onChange={e=>{const digits=e.target.value.replace(/\D/g,'').slice(0,6);setExpiry(digits.length>2?digits.slice(0,2)+'/'+digits.slice(2):digits);}}/></label><label className="form-label">CVV<input required type="password" inputMode="numeric" autoComplete="cc-csc" minLength={3} maxLength={4} value={cvv} onChange={e=>setCvv(e.target.value.replace(/\D/g,''))}/></label></div><p className="fine-print">Dados do cartão enviados diretamente à Efí. Seu banco poderá solicitar uma autenticação adicional.</p></>}
   <label className="form-label">Observação para a equipe<small>Opcional · não garante alteração de ingredientes</small><textarea maxLength={300} value={note} onChange={e=>setNote(e.target.value)}/></label>
  </fieldset>
  <div className="checkout-lines"><div><span>Refeições</span><b>{money(quote.subtotal)}</b></div><div><span>{method==='credit'?'Taxa do crédito (3,49%)':'Taxa Pix'}</span><b>{money(quote.fee)}</b></div></div><div className="cart-total"><span>Total a pagar</span><strong>{money(quote.total)}</strong></div>
  <p className="fine-print">{method==='credit'?'Pagamento em 1 parcela. ':''}Ao continuar, você confirma as datas, quantidades e o total acima. A retirada de cada opção é feita de uma só vez.</p>
  {error && <p className="checkout-error" role="alert">{error}</p>}<button disabled={busy} className="primary full" type="submit">{busy?'Processando…':demo?'Criar pedido de demonstração':method==='credit'?`Pagar ${money(quote.total)} no crédito`:'Gerar Pix'}</button>
 </form>;
}
