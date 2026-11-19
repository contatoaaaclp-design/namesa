import { request, Agent } from 'node:https';
import { createHash } from 'node:crypto';
import { createSecureContext } from 'node:tls';
import type { EfiCharge, EfiEnvironment } from './efi-domain';
import { validTxid } from './efi-domain';
export type EfiConfig = { clientId: string; clientSecret: string; certificate: Buffer; passphrase: string; pixKey: string; environment: EfiEnvironment };
export type EfiHttpRequest = { origin: string; path: string; method: string; headers: Record<string,string>; body?: unknown };
export type EfiHttpResponse = { status: number; data: unknown };
export type EfiTransport = (req: EfiHttpRequest) => Promise<EfiHttpResponse>;
export function efiDiagnostic(data:unknown):string {
 if((data as {nome?:string})?.nome==='webhook_nao_encontrado')return 'Esta chave Pix ainda não possui webhook cadastrado. Use register após configurar o deploy.';
 const message=String((data as {mensagem?:unknown;message?:unknown})?.mensagem || (data as {message?:unknown})?.message || '').toLowerCase();
 const http=/código http (\d{3})|codigo http (\d{3})/.exec(message);
 if(http)return 'A URL do webhook respondeu HTTP '+(http[1] || http[2])+'. Confira o deploy, a proteção de acesso e o segredo no servidor.';
 if(message.includes('tls') || message.includes('mtls'))return 'A validação TLS do webhook foi recusada. Confira o suporte a webhook sem mTLS e o cabeçalho de cadastro.';
 if(message.includes('inacessível') || message.includes('inacessivel'))return 'A Efí não conseguiu acessar a URL do webhook. Confira APP_URL e o deploy público.';
 if(message.includes('tempo limite'))return 'A URL do webhook excedeu o tempo limite de resposta.';
 if(message.includes('https'))return 'O webhook precisa de uma URL HTTPS pública.';
 if(message.includes('chave'))return 'Confira se a chave Pix pertence à conta Efí e ao ambiente configurado.';
 return '';
}
export class EfiError extends Error {
 constructor(public status: number, public providerCode = '', public diagnostic = '') {
  super(status===401 ? 'A Efí recusou as credenciais. Confira o ambiente, Client ID, Client Secret e certificado.' : status===403 ? 'A aplicação Efí não tem permissão para esta operação. Confira os escopos.' : status>=500 || status===0 ? 'Não foi possível consultar a Efí. Tente novamente em instantes.' : 'A Efí recusou a operação Pix. Confira os dados e as permissões com a atlética.');
 }
}
export function readEfiConfig(env: NodeJS.ProcessEnv = process.env): EfiConfig {
 for (const name of ['EFI_CLIENT_ID','EFI_CLIENT_SECRET','EFI_CERTIFICATE_BASE64','EFI_PIX_KEY']) if (!env[name]?.trim()) throw new Error(`A atlética precisa configurar ${name} no servidor.`);
 if (!['true','false'].includes(env.EFI_SANDBOX || '')) throw new Error('Configure EFI_SANDBOX como true ou false.');
 const encoded = env.EFI_CERTIFICATE_BASE64!.replace(/\s/g,'');
 if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error('EFI_CERTIFICATE_BASE64 inválido. Converta o arquivo .p12 completo.');
 const certificate = Buffer.from(encoded,'base64');
 try { createSecureContext({ pfx: certificate, passphrase: env.EFI_CERTIFICATE_PASSWORD || '' }); } catch { throw new Error('Não foi possível carregar o certificado Efí. Confira o Base64 e a senha do .p12.'); }
 return {clientId:env.EFI_CLIENT_ID!.trim(), clientSecret:env.EFI_CLIENT_SECRET!.trim(), certificate, passphrase:env.EFI_CERTIFICATE_PASSWORD || '', pixKey:env.EFI_PIX_KEY!.trim(), environment:env.EFI_SANDBOX==='true'?'sandbox':'production'};
}
function transport(config: EfiConfig): EfiTransport {
 const agent = new Agent({ pfx:config.certificate, passphrase:config.passphrase, keepAlive:true, maxSockets:10, minVersion:'TLSv1.2', rejectUnauthorized:true });
 return input => new Promise((resolve,reject) => {
  const body = input.body===undefined ? undefined : JSON.stringify(input.body);
  const req = request(new URL(input.path,input.origin), {method:input.method, agent, headers:{...input.headers,...(body?{'Content-Length':String(Buffer.byteLength(body))}:{})}}, response => {
   let content=''; response.setEncoding('utf8');
   response.on('data',(chunk:string)=>{content+=chunk;if(content.length>2_000_000)req.destroy(new Error('response too large'));});
   response.on('error',()=>reject(new EfiError(0)));
   response.on('end',()=>{try{resolve({status:response.statusCode || 0,data:content?JSON.parse(content):{}});}catch{reject(new EfiError(0));}});
  });
  const timer = setTimeout(()=>req.destroy(new Error('timeout')),15000);
  req.on('close',()=>clearTimeout(timer)); req.on('error',()=>reject(new EfiError(0)));
  if(body)req.write(body);req.end();
 });
}
export class EfiClient {
 private token?: { value:string; expiresAt:number }; private pendingToken?:Promise<string>; private send:EfiTransport;
 readonly origin:string;
 constructor(readonly config:EfiConfig, mockTransport?:EfiTransport) {
  this.origin = config.environment==='sandbox'?'https://pix-h.api.efipay.com.br':'https://pix.api.efipay.com.br';
  this.send = mockTransport || transport(config);
 }
 private async accessToken() {
  if(this.token && this.token.expiresAt>Date.now())return this.token.value;
  if(this.pendingToken)return this.pendingToken;
  this.pendingToken=(async()=>{
   const res=await this.send({origin:this.origin,path:'/oauth/token',method:'POST',headers:{'Content-Type':'application/json',Authorization:'Basic '+Buffer.from(this.config.clientId+':'+this.config.clientSecret).toString('base64')},body:{grant_type:'client_credentials'}});
   const data=res.data as {access_token?:string;expires_in?:number};
   if(res.status!==200 || !data.access_token || !Number.isFinite(Number(data.expires_in)))throw new EfiError(res.status || 0);
   this.token={value:data.access_token,expiresAt:Date.now()+Math.max(0,Number(data.expires_in)-60)*1000};return data.access_token;
  })();
  try{return await this.pendingToken;}finally{this.pendingToken=undefined;}
 }
 async call<T>(path:string,method='GET',body?:unknown,headers:Record<string,string>={}):Promise<T> {
  if(!path.startsWith('/v2/'))throw new Error('Rota Efí inválida.');
  for(let attempt=0;attempt<2;attempt++) {
   const token=await this.accessToken();
   const response=await this.send({origin:this.origin,path,method,body,headers:{'Content-Type':'application/json',...headers,Authorization:'Bearer '+token}});
   if(response.status===401 && attempt===0){this.token=undefined;continue;}
   if(response.status<200 || response.status>=300){const data=response.data as {nome?:string;type?:string};const code=data.nome || data.type?.split('/').pop() || '';throw new EfiError(response.status,/^[a-zA-Z0-9_-]{1,80}$/.test(code)?code:'',efiDiagnostic(response.data));}
   return response.data as T;
  }
  throw new EfiError(401);
 }
 async checkCredentials() { await this.accessToken(); return {environment:this.config.environment}; }
 async getCharge(txid:string):Promise<EfiCharge|null> {
  if(!validTxid(txid))throw new Error('Identificador Pix inválido.');
  try{return await this.call<EfiCharge>('/v2/cob/'+txid);}catch(error){
   // Efí documents missing charges as HTTP 400 + cobranca_nao_encontrada.
   // Only this exact 400 means absence; validation and permission errors must propagate.
   if(error instanceof EfiError && (
    error.status===400 && error.providerCode==='cobranca_nao_encontrada' ||
    error.status===404 && ['cobranca_nao_encontrada','NaoEncontrado','CobNaoEncontrada'].includes(error.providerCode)
   ))return null;
   throw error;
  }
 }
 async createCharge(txid:string,body:unknown) {
  if(!validTxid(txid))throw new Error('Identificador Pix inválido.');
  try{return await this.call<EfiCharge>('/v2/cob/'+txid,'PUT',body);}catch(error){
   // Concurrent attempts reuse the same txid. Never fall back to POST or a new id.
   if(error instanceof EfiError && error.status===409){const old=await this.getCharge(txid);if(old)return old;}
   throw error;
  }
 }
 async cancelCharge(txid:string) {
  if(!validTxid(txid))throw new Error('Identificador Pix inválido.');
  await this.call('/v2/cob/'+txid,'PATCH',{status:'REMOVIDA_PELO_USUARIO_RECEBEDOR'});
 }
}
let cached: {fingerprint:string;client:EfiClient}|undefined;
export function efiClient() {
 const config=readEfiConfig();
 const fingerprint=createHash('sha256').update(JSON.stringify({...config,certificate:config.certificate.toString('base64')})).digest('hex');
 if(!cached || cached.fingerprint!==fingerprint)cached={fingerprint,client:new EfiClient(config)};
 return cached.client;
}
