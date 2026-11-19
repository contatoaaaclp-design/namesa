import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paymentQuote, assessCardCharge, type CardCharge } from '../lib/card-domain';
import { CardClient, CardError } from '../lib/cards';
const order={id:'athlete_order',total:2277,paymentId:'123'};
const charge:CardCharge={charge_id:123,total:2277,custom_id:order.id,status:'approved',payment:{method:'credit_card',credit_card:{installments:1}}};
test('crédito acrescenta 3,49% em centavos e Pix não tem acréscimo',()=>{
 assert.deepEqual(paymentQuote(2200,'credit'),{subtotal:2200,fee:77,feeRateBps:349,total:2277});
 assert.deepEqual(paymentQuote(2200,'pix'),{subtotal:2200,fee:0,feeRateBps:0,total:2200});
 assert.equal(paymentQuote(12345,'credit').fee,431);
 assert.throws(()=>paymentQuote(12.3,'credit'));
});
test('liberação exige consulta da cobrança correta, valor exato e crédito em uma parcela',()=>{
 assert.equal(assessCardCharge(charge,order),'paid');
 for(const changed of [{total:2200},{charge_id:124},{custom_id:'other'},{payment:{method:'banking_billet'}},{payment:{method:'credit_card',credit_card:{installments:2}}}])assert.throws(()=>assessCardCharge({...charge,...changed},order));
 assert.equal(assessCardCharge({...charge,status:'paid'},order),'paid');
 assert.equal(assessCardCharge({...charge,status:'settled'},order),'pending');
 assert.equal(assessCardCharge({...charge,status:'waiting'},order),'pending');
 assert.equal(assessCardCharge({...charge,status:'unpaid'},order),'cancelled');
 assert.equal(assessCardCharge({...charge,status:'refunded'},order),'refunded');
});
const config={environment:'sandbox' as const,origin:'https://cobrancas-h.api.efipay.com.br',clientId:'mock-id',clientSecret:'mock-secret'};
test('cartão reutiliza OAuth e consulta os dados autenticados no ambiente correto',async()=>{
 const calls:{url:string;init?:RequestInit}[]=[];
 const transport:typeof fetch=async(url,init)=>{calls.push({url:String(url),init});return Response.json(calls.length===1?{access_token:'mock-token',expires_in:3600}:{data:charge});};
 const client=new CardClient(config,transport);
 assert.deepEqual(await client.getCharge('123'),charge);await client.getCharge('123');
 assert.equal(calls.length,3);assert.equal(calls[0].url,config.origin+'/v1/authorize');
 assert.equal(calls[1].init?.headers && (calls[1].init.headers as Record<string,string>).Authorization,'Bearer mock-token');
});
test('timeout de cobrança não repete POST nem expõe os dados do provedor',async()=>{
 let attempts=0;
 const transport:typeof fetch=async(url)=>{if(String(url).endsWith('/authorize'))return Response.json({access_token:'mock-token',expires_in:3600});attempts++;throw new Error('sensitive-provider-details');};
 const client=new CardClient(config,transport);
 await assert.rejects(()=>client.create({payment_token:'mock-token'}),e=>e instanceof CardError && !e.message.includes('sensitive'));
 assert.equal(attempts,1);
});
