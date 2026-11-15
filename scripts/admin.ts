import { adminAuth } from '../lib/firebase-admin';
async function main() {
 const [email, action] = process.argv.slice(2);
 if (!email || !['grant', 'revoke'].includes(action)) throw new Error('Uso: npm run admin -- email@faculdade.br grant|revoke');
 const user = await adminAuth().getUserByEmail(email);
 await adminAuth().setCustomUserClaims(user.uid, { ...user.customClaims, admin: action === 'grant' });
 await adminAuth().revokeRefreshTokens(user.uid);
 console.log(`Permissão da atlética ${action === 'grant' ? 'concedida' : 'removida'}. A pessoa deve sair e entrar novamente.`);
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
