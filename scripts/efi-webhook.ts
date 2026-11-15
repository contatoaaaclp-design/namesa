import { efiClient } from '../lib/payments';
import { efiWebhookUrl } from '../lib/efi-domain';
async function main() {
 const action=process.argv[2] || 'check';
 if(!['check','register'].includes(action))throw new Error('Uso: npm run efi:webhook -- check|register');
 const client=efiClient();const path='/v2/webhook/'+encodeURIComponent(client.config.pixKey);
 if(action==='register'){
  const webhookUrl=efiWebhookUrl(process.env.APP_URL || '',process.env.EFI_WEBHOOK_SECRET || '');
  await client.call(path,'PUT',{webhookUrl},{'x-skip-mtls-checking':'true'});
  console.log('Webhook Efí cadastrado para esta chave Pix. O segredo não foi exibido.');
 }else{
  const result=await client.call<{webhookUrl:string}>(path);
  const target=new URL(result.webhookUrl);
  console.log('Webhook cadastrado: '+target.origin+target.pathname+' (parametros privados ocultos).');
  console.log('Corresponde a configuracao local: '+String(result.webhookUrl===efiWebhookUrl(process.env.APP_URL || '',process.env.EFI_WEBHOOK_SECRET || '')));
 }
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Falha na configuração do webhook Efí.');process.exitCode=1;});
