import { test } from 'node:test';
import assert from 'node:assert/strict';
import { efiDiagnostic, EfiClient, EfiError, type EfiConfig, type EfiHttpRequest } from '../lib/payments';
import { assertWebhookOwnership, assessCharge, cents, efiWebhookUrl, txidForOrder, validTxid, verifyEfiWebhookToken, type EfiCharge } from '../lib/efi-domain';
const config:EfiConfig={clientId:'test',clientSecret:'test-only',certificate:Buffer.from('mocked'),passphrase:'',pixKey:'test-pix-key',environment:'sandbox'};
const txid=txidForOrder('athlete-order','sandbox');
const expected={txid,total:2200,key:config.pixKey};
const charge:EfiCharge={txid,status:'CONCLUIDA',chave:config.pixKey,valor:{original:'22.00'},pix:[{txid,endToEndId:'receipt-1',valor:'22.00'}]};
test('txid estável, alfanumérico e separado por pedido e ambiente',()=>{
 assert.equal(txid,txidForOrder('athlete-order','sandbox'));assert.equal(validTxid(txid),true);
 assert.notEqual(txid,txidForOrder('other-order','sandbox'));assert.notEqual(txid,txidForOrder('athlete-order','production'));
 assert.equal(validTxid('../order'),false);
});
test('aprovação exige identidade, chave, valor cobrado e recebimento exatos',()=>{
 assert.equal(assessCharge(charge,expected),'paid');
 for(const changed of [{...charge,txid:'wrong'},{...charge,chave:'another-key'},{...charge,valor:{original:'21.99'}},{...charge,pix:[]},{...charge,pix:[{...charge.pix![0],valor:'21.99'}]},{...charge,pix:[charge.pix![0],charge.pix![0]]}])assert.throws(()=>assessCharge(changed,expected));
 assert.equal(cents('22.01'),2201);assert.throws(()=>cents('22,01'));assert.throws(()=>cents('22.001'));
});
test('Pix ativo e devolução pendente não são confundidos com estorno concluído',()=>{
 assert.equal(assessCharge({...charge,status:'ATIVA',pix:[]},expected),'pending');
 assert.equal(assessCharge({...charge,pix:[{...charge.pix![0],devolucoes:[{valor:'1.00',status:'EM_PROCESSAMENTO'}]}]},expected),'paid');
 assert.equal(assessCharge({...charge,pix:[{...charge.pix![0],devolucoes:[{valor:'1.00',status:'DEVOLVIDO'}]}]},expected),'refunded');
 assert.equal(assessCharge({...charge,status:'REMOVIDA_PELO_USUARIO_RECEBEDOR',pix:[]},expected),'expired');
 assert.throws(()=>assessCharge({...charge,status:'REMOVIDA_PELO_PSP'},expected));
 assert.throws(()=>assessCharge({...charge,status:'UNKNOWN'},expected));
});
test('webhook exige segredo forte; cadastro mantém ignorar e não aceita localhost HTTP',()=>{
 const secret='a'.repeat(64);assert.equal(verifyEfiWebhookToken(secret,secret),true);
 assert.equal(verifyEfiWebhookToken('b'.repeat(64),secret),false);assert.equal(verifyEfiWebhookToken('short','short'),false);
 assert.equal(verifyEfiWebhookToken('é'.repeat(64),secret),false);
 const url=new URL(efiWebhookUrl('https://example.com',secret));assert.equal(url.pathname,'/api/webhooks/efi');assert.equal(url.searchParams.get('hmac'),secret);assert.ok(url.searchParams.has('ignorar'));
 assert.throws(()=>efiWebhookUrl('http://localhost:3000',secret));
});
test('OAuth é reaproveitado; requisições usam host do ambiente e Bearer',async()=>{
 const calls:EfiHttpRequest[]=[];
 const client=new EfiClient(config,async req=>{calls.push(req);return req.path==='/oauth/token'?{status:200,data:{access_token:'mock-token',expires_in:3600}}:{status:200,data:charge};});
 await client.getCharge(txid);await client.getCharge(txid);
 assert.equal(calls.filter(r=>r.path==='/oauth/token').length,1);assert.ok(calls.every(r=>r.origin==='https://pix-h.api.efipay.com.br'));
 assert.equal(calls[1].headers.Authorization,'Bearer mock-token');
 const prod=new EfiClient({...config,environment:'production'},async req=>({status:200,data:{access_token:'mock',expires_in:3600}}));assert.equal(prod.origin,'https://pix.api.efipay.com.br');
});
test('401 renova token uma vez sem mascarar erro de permissão',async()=>{
 let auth=0,requests=0;
 const client=new EfiClient(config,async req=>req.path==='/oauth/token'?{status:200,data:{access_token:'t'+(++auth),expires_in:3600}}:{status:++requests===1?401:200,data:charge});
 assert.deepEqual(await client.getCharge(txid),charge);assert.equal(auth,2);
 const denied=new EfiClient(config,async req=>req.path==='/oauth/token'?{status:200,data:{access_token:'t',expires_in:3600}}:{status:403,data:{nome:'acesso_negado',secret:'must-not-leak'}});
 await assert.rejects(()=>denied.getCharge(txid),e=>e instanceof EfiError && e.status===403 && !e.message.includes('must-not-leak'));
});
test('somente 404 conhecido é ausência de cobrança; erro transitório não libera reserva',async()=>{
 for(const status of [403,500]){
  const client=new EfiClient(config,async req=>req.path==='/oauth/token'?{status:200,data:{access_token:'t',expires_in:3600}}:{status,data:{nome:'cobranca_nao_encontrada'}});
  await assert.rejects(()=>client.getCharge(txid));
 }
 const missing=new EfiClient(config,async req=>req.path==='/oauth/token'?{status:200,data:{access_token:'t',expires_in:3600}}:{status:404,data:{nome:'cobranca_nao_encontrada'}});
 assert.equal(await missing.getCharge(txid),null);
});
test('conflito de criação recupera o mesmo txid e cancelamento usa PATCH correto',async()=>{
 const calls:EfiHttpRequest[]=[];
 const client=new EfiClient(config,async req=>{calls.push(req);return req.path==='/oauth/token'?{status:200,data:{access_token:'t',expires_in:3600}}:req.method==='PUT'?{status:409,data:{}}:{status:200,data:charge};});
 assert.deepEqual(await client.createCharge(txid,{}),charge);await client.cancelCharge(txid);
 assert.ok(calls.filter(r=>r.path!=='/oauth/token').every(r=>r.path==='/v2/cob/'+txid));
 assert.deepEqual(calls.at(-1)?.body,{status:'REMOVIDA_PELO_USUARIO_RECEBEDOR'});assert.equal(calls.at(-1)?.method,'PATCH');
 assert.equal(calls.filter(r=>r.method==='POST'&&r.path!=='/oauth/token').length,0);
});

test('cadastro não substitui webhook de outro projeto, mesmo com prefixo de domínio parecido',()=>{
 assert.doesNotThrow(()=>assertWebhookOwnership('https://internamesa.vercel.app/api/old','https://internamesa.vercel.app/api/webhooks/efi'));
 assert.throws(()=>assertWebhookOwnership('https://sambap.vercel.app/api/webhooks/efi/pix','https://internamesa.vercel.app/api/webhooks/efi'));
 assert.throws(()=>assertWebhookOwnership('https://internamesa.vercel.app.attacker.example','https://internamesa.vercel.app/api/webhooks/efi'));
});
test('diagnóstico informa a categoria do erro sem vazar dados retornados pela Efí',()=>{
 const privateUrl='https://private.example/webhook?hmac=private-secret';
 const hint=efiDiagnostic({mensagem:'A URL informada respondeu com o código HTTP 500: '+privateUrl});
 assert.match(hint,/HTTP 500/);assert.equal(hint.includes('private'),false);
 assert.match(efiDiagnostic({mensagem:'A autenticação de TLS mútuo não está configurada na URL informada'}),/TLS/);
 assert.equal(efiDiagnostic({mensagem:'error '+privateUrl}), 'O webhook precisa de uma URL HTTPS pública.');
 assert.equal(efiDiagnostic(null),'');
});
