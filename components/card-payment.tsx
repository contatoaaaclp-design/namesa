'use client';
import type { Order } from '@/lib/types';
import { money } from '@/lib/types';
export default function CardPayment({order,demo,busy,confirm,refresh}:{order:Order;demo:boolean;busy:boolean;confirm:()=>void;refresh:()=>void}) {
 const challenge=order.cardChallenge;
 function authenticate(){
  if(!challenge || new URL(challenge.action_url).protocol!=='https:')return;
  const form=document.createElement('form');form.method='POST';form.action=challenge.action_url;
  for(const [name,value] of Object.entries({creq:challenge.creq,threeDSSessionData:challenge.threeDSSessionData})){const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;form.appendChild(input);}
  document.body.appendChild(form);form.submit();
 }
 return <div className="payment-view"><span className="payment-total">{money(order.total)}</span><p>Crédito à vista · 1 parcela</p><div className="checkout-lines"><div><span>Refeições</span><b>{money(order.subtotal || order.total)}</b></div><div><span>Taxa do crédito (3,49%)</span><b>{money(order.fee || 0)}</b></div></div>{demo?<><p>Pedido de demonstração. Nenhum cartão será cobrado.</p><button className="primary full" onClick={confirm}>Simular pagamento confirmado</button></>:<>{challenge && <><p>Seu banco precisa confirmar que é você. Conclua a autenticação para finalizar o pagamento.</p><button disabled={busy} className="primary full" onClick={authenticate}>Autenticar com meu banco</button></>}{!challenge && <p>{order.paymentReviewRequired?'A resposta do banco foi inconclusiva. Consulte a atlética com o número do pedido antes de comprar novamente.':'Aguardando o resultado da análise do pagamento.'}</p>}<button disabled={busy} className="secondary full" onClick={refresh}>Verificar pagamento</button><p className="fine-print">Retornar do banco não confirma o pagamento. O QR de retirada aparece após a aprovação pela Efí.</p></>}</div>;
}
