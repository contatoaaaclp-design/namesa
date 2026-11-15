import { efiClient } from '../lib/payments';
async function main() {
 const result=await efiClient().checkCredentials();
 console.log(`Autenticação Efí confirmada: ${result.environment}. Nenhuma cobrança criada ou alterada.`);
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Falha ao autenticar na Efí.');process.exitCode=1;});
