export class CardError extends Error { constructor(message:string,public status:number){super(message);} }
import type { CardCharge } from './card-domain';
export function cardConfig() {
 if(Boolean(process.env.EFI_CARD_CLIENT_ID)!==Boolean(process.env.EFI_CARD_CLIENT_SECRET))throw new Error('Preencha EFI_CARD_CLIENT_ID e EFI_CARD_CLIENT_SECRET juntos.');
 const environment = process.env.EFI_SANDBOX === 'false' ? 'production' as const : 'sandbox' as const;
 return { environment, origin: environment === 'production' ? 'https://cobrancas.api.efipay.com.br' : 'https://cobrancas-h.api.efipay.com.br', clientId: process.env.EFI_CARD_CLIENT_ID || process.env.EFI_CLIENT_ID || '', clientSecret: process.env.EFI_CARD_CLIENT_SECRET || process.env.EFI_CLIENT_SECRET || '' };
}
export function cardEnabled() { try { const c=cardConfig(); return process.env.EFI_CREDIT_ENABLED === 'true' && Boolean(process.env.NEXT_PUBLIC_EFI_PAYEE_CODE && c.clientId && c.clientSecret); } catch { return false; } }
export function cardUrls() {
 const url = new URL(process.env.APP_URL || '');
 if (url.protocol !== 'https:' || !/^[a-zA-Z0-9_-]{32,128}$/.test(process.env.EFI_WEBHOOK_SECRET || '')) throw new Error('Configure APP_URL HTTPS e EFI_WEBHOOK_SECRET para receber cartão.');
 return { notification: `${url.origin}/api/webhooks/efi-card?hmac=${process.env.EFI_WEBHOOK_SECRET}`, callback: `${url.origin}/api/card/return` };
}
export class CardClient {
 private token = ''; private expires = 0;
 constructor(private config = cardConfig(), private transport: typeof fetch = fetch) {}
 private async request(path: string, method: string, body?: unknown, authorization?: string) {
  try {
   const response = await this.transport(this.config.origin+path,{method,headers:{Authorization:authorization || `Bearer ${this.token}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000),cache:'no-store'});
   if (!response.ok) throw new CardError(response.status===401 || response.status===403 ? 'A Efí recusou as credenciais/permissões de cobranças. Confira a API de Emissão de cobranças.' : 'A Efí não concluiu a operação com cartão. Consulte o pedido antes de tentar outra compra.',response.status);
   return await response.json();
  } catch(error) { if(error instanceof CardError)throw error;throw new CardError('Resposta incerta da Efí. Consulte o pedido ou procure a atlética antes de comprar novamente.',502); }
 }
 async checkCredentials() {
  if(!this.config.clientId || !this.config.clientSecret)throw new Error('Configure as credenciais Efí de cobranças.');
  if(this.expires<=Date.now()) {
   const data=await this.request('/v1/authorize','POST',{grant_type:'client_credentials'},`Basic ${Buffer.from(this.config.clientId+':'+this.config.clientSecret).toString('base64')}`);
   if(!data.access_token)throw new Error('Autenticação de cartão indisponível.');
   this.token=data.access_token;this.expires=Date.now()+Math.max(0,Number(data.expires_in)-60)*1000;
  }
  return {environment:this.config.environment};
 }
 async call<T>(path:string,method='GET',body?:unknown):Promise<T>{
  await this.checkCredentials();
  // Never retry a payment POST: the bank may have accepted it before a timeout.
  return this.request(path,method,body);
 }
 async getCharge(id:string) { const result=await this.call<{data:CardCharge}>('/v1/charge/'+encodeURIComponent(id));return result.data; }
 async create(body:unknown) { const result=await this.call<CardCharge & {data?:CardCharge}>('/v1/charge/card','POST',body);return result.data || result; }
 async cancel(id:string) { return this.call('/v1/charge/'+encodeURIComponent(id)+'/cancel','PUT'); }
}
let cached:CardClient|undefined;export function cardClient(){return cached ||= new CardClient();}
