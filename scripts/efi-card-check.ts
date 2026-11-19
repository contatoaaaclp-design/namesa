import { cardClient, cardEnabled } from '../lib/cards';
async function main(){
 const result=await cardClient().checkCredentials();
 console.log(`Credenciais de cobranças autenticadas: ${result.environment}. Nenhuma cobrança criada.`);
 console.log(`Configuração local habilita crédito: ${cardEnabled()}.`);
 console.log('A autenticação não comprova aprovação de KYC nem limite de cartão; confira a liberação na conta Efí.');
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Falha ao verificar credenciais de cobranças.');process.exitCode=1;});
