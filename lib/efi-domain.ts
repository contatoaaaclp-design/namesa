import { createHash, timingSafeEqual } from 'node:crypto';
export type EfiEnvironment = 'production' | 'sandbox';
export type EfiPix = { txid?: string; endToEndId: string; valor: string; horario?: string; devolucoes?: { valor: string; status: string }[] };
export type EfiCharge = { txid: string; status: string; chave: string; valor: { original: string }; pixCopiaECola?: string; loc?: { id: number }; pix?: EfiPix[] };
export const validTxid = (id: string) => /^[a-zA-Z0-9]{26,35}$/.test(id);
export const txidForOrder = (id: string, environment: EfiEnvironment) => createHash('sha256').update(`inter-na-mesa:${environment}:${id}`).digest('hex').slice(0, 32);
export function cents(value: string) {
 if (!/^\d{1,10}\.\d{2}$/.test(value)) throw new Error('Valor de pagamento inválido retornado pela Efí.');
 const [whole, fraction] = value.split('.'); return Number(whole) * 100 + Number(fraction);
}
export function assessCharge(charge: EfiCharge, expected: { txid: string; total: number; key: string }): 'paid' | 'pending' | 'expired' | 'refunded' {
 if (charge.txid !== expected.txid || charge.chave !== expected.key || cents(charge.valor.original) !== expected.total) throw new Error('Cobrança Efí não corresponde ao pedido.');
 const payments = charge.pix || [];
 if (charge.status === 'CONCLUIDA') {
  if (!payments.length || new Set(payments.map(p=>p.endToEndId)).size !== payments.length || payments.some(p=>!p.endToEndId || (p.txid && p.txid !== expected.txid)) || payments.reduce((sum,p)=>sum+cents(p.valor),0) !== expected.total) throw new Error('Recebimento Pix não corresponde ao valor do pedido.');
  if (payments.some(p=>p.devolucoes?.some(d=>d.status === 'DEVOLVIDO' && cents(d.valor)>0))) return 'refunded';
  return 'paid';
 }
 if (['REMOVIDA_PELO_USUARIO_RECEBEDOR', 'REMOVIDA_PELO_PSP'].includes(charge.status)) {
  if (payments.length) throw new Error('Cobrança removida com recebimento: exige conciliação pela atlética.');
  return 'expired';
 }
 if (charge.status !== 'ATIVA') throw new Error('Situação de cobrança Efí desconhecida.');
 return 'pending';
}
export function verifyEfiWebhookToken(actual: string, secret: string) {
 if (!/^[A-Za-z0-9_-]{32,128}$/.test(secret) || actual.length !== secret.length || !/^[A-Za-z0-9_-]+$/.test(actual)) return false;
 return timingSafeEqual(Buffer.from(actual), Buffer.from(secret));
}

export function efiWebhookUrl(appUrl: string, secret: string) {
 if(!verifyEfiWebhookToken(secret,secret))throw new Error('Configure EFI_WEBHOOK_SECRET com 32 a 128 caracteres alfanuméricos, _ ou -.');
 const url=new URL(appUrl);
 if(url.protocol!=='https:' || url.username || url.password || url.hostname==='localhost' || url.pathname!=='/' || url.search || url.hash)throw new Error('APP_URL deve ser a origem HTTPS pública do aplicativo, sem caminhos.');
 url.pathname='/api/webhooks/efi';url.searchParams.set('hmac',secret);url.searchParams.set('ignorar','');return url.toString();
}

export function assertWebhookOwnership(existingUrl:string,targetUrl:string) {
 if(new URL(existingUrl).origin!==new URL(targetUrl).origin)throw new Error('Esta chave Pix já atende outro domínio. Cadastro bloqueado para preservar o outro projeto. Crie uma chave Pix dedicada e atualize EFI_PIX_KEY.');
}
