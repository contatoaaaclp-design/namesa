import { randomBytes } from 'node:crypto';
import { efiClient, EfiError } from '../lib/payments';
async function main() {
 const client=efiClient();
 const result=await client.checkCredentials();
 console.log(`Autenticação Efí confirmada: ${result.environment}. Nenhuma cobrança criada ou alterada.`);
 await client.getCharge(randomBytes(16).toString('hex'));
 console.log('Consulta de cobrança confirmada (cob.read). Nenhuma cobrança criada ou alterada.');
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Falha ao autenticar na Efí.');if(e instanceof EfiError){console.error(`HTTP ${e.status}; código Efí: ${e.providerCode || 'não informado'}.`);if(e.diagnostic)console.error(e.diagnostic);}process.exitCode=1;});
