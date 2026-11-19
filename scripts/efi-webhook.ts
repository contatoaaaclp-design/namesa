import { efiClient, EfiError } from '../lib/payments';
import { assertWebhookOwnership, efiWebhookUrl } from '../lib/efi-domain';
export async function registerWebhook() {
 const client=efiClient();const path='/v2/webhook/'+encodeURIComponent(client.config.pixKey);
 const webhookUrl=efiWebhookUrl(process.env.APP_URL || '',process.env.EFI_WEBHOOK_SECRET || '');
 try{
  const existing=await client.call<{webhookUrl:string}>(path);
  assertWebhookOwnership(existing.webhookUrl,webhookUrl);
 }catch(error){
  if(!(error instanceof EfiError && (error.status===404 || error.status===400 && error.providerCode==='webhook_nao_encontrado')))throw error;
 }
 // Registration replaces the target only for this project's dedicated key/origin.
 await client.call(path,'PUT',{webhookUrl},{'x-skip-mtls-checking':'true'});
}
async function main() {
 const action=process.argv[2] || 'check';
 if(!['check','register'].includes(action))throw new Error('Uso: npm run efi:webhook -- check|register');
 if(action==='register'){
  await registerWebhook();console.log('Webhook Efí cadastrado para esta chave Pix. O segredo não foi exibido.');
 }else{
  const client=efiClient();const result=await client.call<{webhookUrl:string}>('/v2/webhook/'+encodeURIComponent(client.config.pixKey));
  const target=new URL(result.webhookUrl);
  console.log('Webhook cadastrado: '+target.origin+target.pathname+' (parametros privados ocultos).');
  console.log('Corresponde a configuracao local: '+String(result.webhookUrl===efiWebhookUrl(process.env.APP_URL || '',process.env.EFI_WEBHOOK_SECRET || '')));
 }
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Falha na configuração do webhook Efí.');if(e instanceof EfiError){console.error(`HTTP ${e.status}; código Efí: ${e.providerCode || 'não informado'}.`);if(e.diagnostic)console.error(e.diagnostic);if(e.status===403)console.error('Na aplicação da API Pix, habilite webhook.write e webhook.read. A liberação de cartão na API de cobranças é independente.');}process.exitCode=1;});
