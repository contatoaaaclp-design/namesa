# Inter na Mesa

Aplicativo PWA para organizar as refeições da delegação no Inter, de **20 a 22 de novembro de 2026**, em horário de Brasília. Usa Next.js, Firebase e pagamentos Pix/crédito via Efí Bank, com hospedagem preparada para a Vercel.

## Por onde começar

Você pode configurar em três etapas. Não precisa conseguir todas as credenciais de uma vez.

| Etapa | O que configurar | O que você consegue testar |
| --- | --- | --- |
| 1. Demonstração | Nenhuma variável | Cardápio fictício, pedidos simulados, QR e painel de teste |
| 2. Firebase | As cinco variáveis públicas do app Web e as três variáveis do Admin SDK | Login Google, banco real, pedidos da conta e painel administrativo |
| 3. Publicação e integrações | URL HTTPS, Efí, VAPID e cron | Pix real, notificações no celular e expiração automática |

**Importante:** preencher apenas a chave pública do Firebase não configura o banco no servidor. Termine as duas partes do Firebase antes de tentar usar o app fora da demonstração. Sem Firebase configurado, o app simula pagamentos; com Firebase configurado, não há botão para simular pagamento real.

## 1. Preparar o arquivo de variáveis

### O que é uma variável de ambiente?

É uma configuração escrita como `NOME=valor`. O código usa esse nome para encontrar, por exemplo, o projeto Firebase ou a credencial do provedor Pix. Você preenche os valores no arquivo local e, depois, cadastra os mesmos nomes no painel da Vercel.

### Qual arquivo devo editar: `.env` ou `.env.local`?

**Neste projeto, use `.env.local` na raiz `E:\marmita`, ao lado de `package.json`.** O arquivo `.env.example` é apenas o modelo e pode ficar no repositório.

O Next.js aceita `.env` e `.env.local`, mas os comandos `admin` e `seed` deste projeto usam explicitamente `.env.local`. Se você começou a preencher `.env`, aproveite o conteúdo renomeando-o para `.env.local`. Não mantenha valores diferentes nos dois arquivos: no Next.js, `.env.local` tem prioridade sobre `.env`, e variáveis já definidas no processo podem ter prioridade sobre ambos. Veja a [documentação de variáveis do Next.js](https://nextjs.org/docs/app/guides/environment-variables).

No terminal PowerShell, dentro da pasta do projeto, este comando prepara o arquivo sem substituir um `.env.local` existente:

```powershell
if (Test-Path -LiteralPath .env.local) {
    Write-Host '.env.local já existe. Abra esse arquivo e confira os valores.'
} elseif (Test-Path -LiteralPath .env) {
    Rename-Item -LiteralPath .env -NewName .env.local
    Write-Host '.env renomeado para .env.local; conteúdo preservado.'
} else {
    Copy-Item -LiteralPath .env.example -Destination .env.local
    Write-Host 'Modelo copiado. Agora preencha .env.local.'
}
```

Se os dois arquivos já existirem, confira no editor quais valores quer manter em `.env.local`. O comando acima não combina os arquivos nem modifica seu `.env` nesse caso.

### Como escrever os valores

```dotenv
# Exemplo ilustrativo de formato; use os valores do SEU projeto.
NEXT_PUBLIC_FIREBASE_PROJECT_ID=inter-da-sua-atletica
FIREBASE_PROJECT_ID=inter-da-sua-atletica
APP_URL=http://localhost:3000
```

- Escreva uma variável por linha, sem vírgula ou ponto e vírgula no final.
- Não cole um objeto JavaScript ou JSON inteiro no arquivo.
- Para strings simples, aspas são opcionais; para a chave privada, siga o formato da seção 4.
- Enquanto não tiver uma credencial, deixe o campo vazio após o `=`. Não escreva `undefined`, `null` ou `COLE_AQUI`: esses textos seriam lidos como valores reais.
- As variáveis com prefixo `NEXT_PUBLIC_` ficam acessíveis ao navegador. As demais desta aplicação são usadas no servidor. Nunca acrescente esse prefixo a uma credencial privada.
- Depois de alterar o arquivo, encerre `npm run dev` com `Ctrl+C` e inicie novamente. Na Vercel, faça um novo deploy; mudar o arquivo no computador não altera o site publicado.

O `.gitignore` já exclui `.env` e `.env.local`. Não envie esses arquivos, o JSON administrativo ou capturas com segredos para grupos ou repositórios.

## 2. Mapa de todas as variáveis

| Nome exato | De onde vem | Para que serve | Quando preencher |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` da configuração do app Web Firebase | Identifica o app nas chamadas do SDK | Firebase |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` do mesmo objeto | Login Google | Firebase |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` do mesmo objeto | Identifica o projeto no navegador | Firebase |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` do mesmo objeto | Identifica o app Web registrado | Firebase |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` do mesmo objeto | Identifica o remetente das notificações | Firebase; necessário ao push |
| `FIREBASE_PROJECT_ID` | `project_id` do JSON da conta de serviço | Identifica o projeto no servidor | Firebase |
| `FIREBASE_CLIENT_EMAIL` | `client_email` do mesmo JSON | Identifica a conta de serviço | Firebase |
| `FIREBASE_PRIVATE_KEY` | `private_key` do mesmo JSON | Autentica o servidor com acesso administrativo | Firebase; **secreta** |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Chave pública de Web Push no Firebase | Permite registrar o celular para push | Notificações |
| `APP_URL` | Endereço pelo qual o aplicativo é acessado | Monta o webhook e os links das notificações | Local: `http://localhost:3000`; Pix: URL pública HTTPS |
| `EFI_SANDBOX` | Escolha do ambiente | `true` para homologação; `false` para produção | Pix |
| `EFI_CLIENT_ID` | Conta Efí > API > Aplicações > credenciais | Identifica a aplicação no ambiente escolhido | Pix; privado |
| `EFI_CLIENT_SECRET` | Mesmo local do Client ID | Autentica a aplicação | Pix; **secreta** |
| `EFI_CERTIFICATE_BASE64` | Arquivo .p12 completo convertido para Base64 | Autenticação mTLS nas chamadas à API | Pix; **secreta** |
| `EFI_CERTIFICATE_PASSWORD` | Senha do .p12, se existir | Abre o certificado; vazio quando não houver senha | Pix; **secreta** |
| `EFI_PIX_KEY` | Chave cadastrada na conta Efí recebedora | Identifica o recebedor das cobranças | Pix |
| `EFI_WEBHOOK_SECRET` | Você gera uma sequência aleatória | Protege a URL do webhook | Webhook; **secreta** |
| `EFI_WEBHOOK_ALLOWED_IPS` | IPs de envio publicados pela Efí | Confere a origem na Vercel; padrão `34.193.116.226` | Webhook |
| `CRON_SECRET` | Você gera uma sequência aleatória | Protege a rotina que trata pedidos vencidos | Agendamento; **secreta** |

**Os dois `PROJECT_ID` precisam apontar para o mesmo projeto.** Nenhum deles é o nome de exibição do projeto, o número do projeto ou o `appId`.

## 3. Configurar o Firebase no navegador

### Criar o projeto e registrar o app Web

1. Abra o [Firebase Console](https://console.firebase.google.com/) e crie ou selecione seu projeto.
2. Abra a engrenagem ao lado de **Visão geral do projeto > Configurações do projeto**. Os nomes podem aparecer em inglês, como **Project settings**.
3. Na aba **Geral**, procure **Seus aplicativos / Your apps**.
4. Se ainda não houver um app Web, clique no ícone `</>`, dê um nome como `Inter na Mesa Web` e registre. Não é necessário ativar Firebase Hosting, pois a hospedagem será na Vercel.
5. Na configuração do SDK do app Web, selecione a opção **Config** para visualizar o objeto `firebaseConfig`.

Você verá campos semelhantes a estes; os valores abaixo são fictícios:

```javascript
const firebaseConfig = {
  apiKey: "valor-fornecido-pelo-firebase",
  authDomain: "inter-da-sua-atletica.firebaseapp.com",
  projectId: "inter-da-sua-atletica",
  storageBucket: "valor-fornecido-pelo-firebase",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:identificador-do-app"
};
```

Copie **apenas o valor** de cada campo para o nome correspondente em `.env.local`:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=valor-fornecido-pelo-firebase
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=inter-da-sua-atletica.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=inter-da-sua-atletica
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:identificador-do-app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
```

Use os valores reais do console, sem copiar os exemplos. `storageBucket` e `measurementId` não são usados por este aplicativo. A configuração Web identifica o projeto e não substitui permissões de acesso. Leia a [explicação oficial do objeto de configuração](https://firebase.google.com/docs/web/learn-more#config-object).

### Habilitar o login

1. No menu Firebase, abra **Authentication** e clique em **Começar / Get started**, se necessário.
2. Em **Método de login / Sign-in method**, habilite **Google**.
3. Selecione o e-mail de suporte solicitado e salve.
4. Em **Authentication > Configurações > Domínios autorizados**, confira se `localhost` está cadastrado; adicione se necessário.
5. Depois da publicação, adicione também o domínio definitivo, por exemplo `inter-da-atletica.vercel.app`. Nesse campo, informe apenas o domínio, sem `https://` ou caminhos.

## 4. Configurar o Firebase no servidor

Esta é a segunda metade da configuração. As variáveis públicas não dão ao servidor acesso administrativo para salvar pedidos ou validar retiradas.

### Obter o JSON da conta de serviço

1. No mesmo projeto Firebase, abra **Configurações do projeto > Contas de serviço / Service accounts**.
2. Na seção **Firebase Admin SDK**, escolha **Gerar nova chave privada / Generate new private key** e confirme.
3. O navegador baixa um arquivo `.json`. Guarde-o fora da pasta do projeto e abra no editor somente para copiar os três campos necessários. Não é preciso importar esse arquivo no código.
4. Preencha `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` com os campos abaixo.

| Campo no JSON baixado | Variável em `.env.local` |
| --- | --- |
| `project_id` | `FIREBASE_PROJECT_ID` |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_PRIVATE_KEY` |

O e-mail tem um formato parecido com `firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com`. **Não use o seu e-mail pessoal nesse campo.** O `private_key_id` também não é a chave privada.

O procedimento de geração está na [documentação do Firebase Admin SDK](https://firebase.google.com/docs/admin/setup#initialize_the_sdk_in_non-google_environments). A chave dá acesso administrativo; mantenha-a somente no ambiente local e nas configurações privadas do servidor.

### Como colar `FIREBASE_PRIVATE_KEY`

Use **uma linha no arquivo**, com aspas duplas ao redor e os caracteres `\n` entre as linhas do certificado:

```dotenv
FIREBASE_PROJECT_ID=inter-da-sua-atletica
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@inter-da-sua-atletica.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nCONTEUDO_REAL_DA_CHAVE\n-----END PRIVATE KEY-----\n"
```

Esse certificado é ilustrativo e não funciona. No valor verdadeiro:

- Preserve `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`.
- Copie o conteúdo completo de `private_key`, sem o nome do campo e sem a vírgula final do JSON.
- No arquivo, cada separação deve ter **uma barra invertida e a letra n** (`\n`), não duas barras (`\\n`). Não substitua por `/n`.
- Não corte o texto e não invente um novo certificado. O servidor converte as sequências `\n` para quebras de linha; ele também aceita quebras reais quando fornecidas corretamente pelo ambiente.

### Criar o Firestore e publicar regras

1. Abra **Build / Criação > Firestore Database** e escolha **Criar banco de dados**.
2. Use o banco padrão `(default)`, em modo nativo. Este projeto usa esse banco, sem nome alternativo.
3. Selecione a localização apropriada para sua operação e crie em **modo de produção**.
4. No terminal da pasta do projeto, autentique a CLI e publique as regras e índices:

```powershell
npx firebase-tools login
npx firebase-tools deploy --only firestore --project SEU_PROJECT_ID
```

Substitua `SEU_PROJECT_ID` pelo mesmo valor de `FIREBASE_PROJECT_ID`, sem aspas adicionais se não houver espaços. Aguarde os índices terminarem de criar no console.

As regras deste projeto negam acesso direto do navegador ao Firestore. Isso é intencional: o app acessa a API, que verifica o login, e o servidor usa o Admin SDK. Não mude as regras para `allow read, write: if true` para contornar erros. Se a conta de serviço foi criada manualmente com permissões reduzidas, confira se ela tem acesso ao Firestore e ao envio de mensagens FCM.

### Conferir esta etapa

```powershell
npm ci
npm run dev
```

Abra http://localhost:3000. O aviso de demonstração deve desaparecer. Clique no avatar no topo para entrar com Google. Um cardápio vazio é esperado em um banco novo: falta cadastrar os pratos.

Para habilitar seu painel, faça login pelo menos uma vez e execute em outro terminal:

```powershell
npm run admin -- seu-email@faculdade.br grant
```

Saia e entre novamente no aplicativo para receber a permissão. O comando usa o e-mail da conta Google que acabou de entrar; se ela ainda não existe no Firebase Auth, o comando falha. Para retirar a permissão, use `revoke` no lugar de `grant`.

Agora você pode cadastrar os restaurantes reais no painel. Se quiser apenas dados fictícios para conhecer o fluxo, `npm run seed` adiciona exemplos sem sobrescrever documentos existentes. **Não execute o seed em produção se não quiser publicar pratos fictícios.**

## 5. Configurar notificações no celular

Você pode deixar esta parte para depois do login e do banco.

1. No Firebase, abra **Configurações do projeto > Cloud Messaging**.
2. Procure **Configuração da Web / Web configuration > Certificados Web Push / Web Push certificates**.
3. Clique em **Gerar par de chaves / Generate key pair**, se ainda não houver um par.
4. Copie a **chave pública** e preencha:

```dotenv
NEXT_PUBLIC_FIREBASE_VAPID_KEY=CHAVE_PUBLICA_COPIADA_DO_FIREBASE
```

Não use o JSON administrativo ou a chave de API nesse campo. Confira também `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, já copiado na etapa 3. Se o console solicitar habilitar a API FCM Registration, use o link do próprio Firebase para ativá-la no mesmo projeto. Consulte a [configuração oficial de Web Push](https://firebase.google.com/docs/cloud-messaging/web/get-started#configure_web_credentials_with_fcm).

Reinicie o app, entre com sua conta e abra **Avisos > Ativar notificações**. Permita a solicitação do navegador. Para testar um aviso de chegada, deve existir uma refeição paga daquela conta; o disparo é feito pelo painel da atlética. Não basta preencher a VAPID para o aviso chegar: o aparelho precisa registrar a permissão e o token.

## 6. Configurar o Pix da Efí Bank

A integração usa **a API Pix da conta Efí que receberá o dinheiro da atlética**. O código não usa mais Mercado Pago. As variáveis antigas `MERCADOPAGO_*` não são utilizadas; não coloque nelas os valores da Efí.

### Credenciais, ambiente e escopos

Na conta Efí, abra **API > Aplicações**, crie ou edite a aplicação e habilite API Pix. Separe o Client ID e Client Secret do mesmo ambiente do certificado. Use `EFI_SANDBOX=true` para homologação ou `false` para produção. Não misture certificado de produção com credenciais de teste.

Habilite os escopos `cob.write`, `cob.read`, `pix.read`, `payloadlocation.read`, `webhook.write` e `webhook.read`. Não é necessário conceder envio de Pix para receber pedidos. Confira as [credenciais e os certificados na documentação Efí](https://dev.efipay.com.br/docs/api-pix/credenciais/).

`EFI_PIX_KEY` é uma chave Pix cadastrada na conta Efí recebedora. Não é a senha bancária. `EFI_CLIENT_SECRET` não é a senha do certificado. O token OAuth é obtido e renovado pelo servidor; você não precisa copiar tokens temporários para o arquivo.

### Preparar o certificado .p12

O arquivo completo vira o valor de `EFI_CERTIFICATE_BASE64`. Não coloque o nome do arquivo ou caminho nesse campo. O projeto ignora arquivos .p12, .pfx, .pem e .key no Git e no envio via Vercel CLI. Nunca coloque certificados em `public/`.

Se você já preparou o certificado no arquivo local, reaproveite o valor existente. Para converter outro certificado no PowerShell, escolha o caminho correto e copie o resultado para a área de transferência:

```powershell
$p12Path = "C:\Certificados\producao.p12"
Set-Clipboard -Value ([Convert]::ToBase64String([System.IO.File]::ReadAllBytes($p12Path)))
```

Cole o resultado inteiro depois de `EFI_CERTIFICATE_BASE64=` no arquivo e no campo correspondente da Vercel. Base64 não criptografa o arquivo: trate esse texto como uma credencial privada. Se o .p12 tiver senha, preencha `EFI_CERTIFICATE_PASSWORD`; caso contrário, deixe vazio.

### Conferir a autenticação sem criar cobrança

Com as variáveis preenchidas em .env.local:

```powershell
npm run efi:check
```

Esse comando carrega o certificado, solicita um token OAuth e consulta um `txid` aleatório para verificar o escopo `cob.read`. Exibe o ambiente e o resultado, sem imprimir credenciais nem criar ou alterar cobranças. Não comprova os escopos de criação de cobrança ou webhook.

A consulta de uma cobrança inexistente pode retornar HTTP 400 com `cobranca_nao_encontrada`, conforme a [documentação da Efí](https://dev.efipay.com.br/docs/api-pix/cobrancas-imediatas/). O app reconhece essa resposta e segue para criar o Pix; outros erros HTTP 400 continuam bloqueando a operação.

### URL pública e confirmação por webhook

Defina `APP_URL=https://SEU_DOMINIO`, sem caminho ou barra final. Cadastre na Vercel as variáveis Firebase, as variáveis Efí desta seção e o CRON_SECRET. O certificado deve entrar como variável Base64, e não como arquivo versionado.

Gere um segredo específico para o webhook caso ainda não tenha um:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Guarde o resultado em `EFI_WEBHOOK_SECRET` no .env.local e na Vercel. Use o mesmo segredo nos dois ambientes que configuram e recebem esse webhook. Ele é criado por você, não é fornecido pela Efí, e não deve ser igual ao CRON_SECRET.

**Publique as variáveis antes de cadastrar o webhook.** Com o servidor atualizado e APP_URL local apontando ao domínio definitivo, execute:

```powershell
# Consulta o cadastro existente, sem alterar:
npm run efi:webhook -- check
# Cadastra ou substitui o webhook desta chave Pix:
npm run efi:webhook -- register
```

A chave Pix só pode ter um webhook cadastrado. O comando register substitui o destino anterior; use uma chave dedicada se ela já estiver ligada a outro sistema. Não execute o comando contra um domínio de exemplo, localhost ou um deploy ainda protegido por login da Vercel. A Efí precisa alcançar essa rota sem login interativo; o segredo e a origem são validados pela aplicação.

O cadastro usa `/api/webhooks/efi?hmac=SEGREDO&ignorar=`. O script não imprime o segredo. O parâmetro ignorar evita a adição automática do sufixo /pix; a API também aceita esse sufixo para compatibilidade.

Para o recebimento na Vercel, o script cadastra a opção documentada **skip-mTLS**, com `x-skip-mtls-checking: true`. A aplicação exige o segredo, confere o IP na Vercel e sempre consulta a cobrança por mTLS antes de aprovar qualquer pedido. Isso não é validação de certificado do remetente no TLS de entrada. A documentação explica a [opção skip-mTLS e a proteção por origem e hash](https://dev.efipay.com.br/en/docs/api-pix/webhooks/).

O IP permitido por padrão é `34.193.116.226`. Se a Efí alterar seus IPs, atualize `EFI_WEBHOOK_ALLOWED_IPS`, com endereços separados por vírgula, após conferir a documentação. Não adicione IPs de visitantes para contornar recusas. A verificação usa o [header definido pela Vercel](https://vercel.com/docs/headers/request-headers#x-forwarded-for); outra hospedagem ou proxy precisa de configuração própria para verificar a origem. Localmente, a rota exige o segredo mas não simula a verificação de IP feita na Vercel.

### Cobranças, QR e teste de ponta a ponta

Cada pedido tem um txid estável, gravado antes da chamada à Efí, e uma referência privada em `pixTransactions`. Repetir a tentativa usa o mesmo identificador; não cria outra cobrança com outro txid. O servidor confere chave recebedora, txid, valor original e recebimentos confirmados antes de liberar a retirada. A imagem do Pix é gerada a partir do copia e cola retornado pela Efí.

O CPF é enviado na criação da cobrança e não é salvo no banco do aplicativo. Se a resposta da criação for incerta, uma trava de até três minutos evita conciliar a reserva enquanto a chamada pode estar em andamento. Depois, tente novamente pelo mesmo pedido.

Homologação e produção ficam identificadas nos pedidos e não são misturadas nas telas nem na retirada. Na homologação, a Efí simula confirmação automática para cobranças de R$ 0,01 a R$ 10,00; acima disso, ficam ativas. Para ensaiar o fluxo nesse ambiente, cadastre uma opção de teste nesse intervalo. Veja [cobranças imediatas](https://dev.efipay.com.br/docs/api-pix/cobrancas-imediatas/).

Antes da divulgação, faça uma compra real de baixo valor sob seu controle e confira saldo, webhook e retirada. Os testes automatizados não criam cobranças reais. O comando de cadastro de webhook altera apenas a configuração de notificações, não transfere dinheiro.

### Pedidos anteriores à migração

Pedidos da integração antiga não são convertidos em cobranças Efí. Eles exigem conciliação pelo provedor de origem e atendimento da atlética. A expiração não tenta cancelar um pagamento antigo na conta Efí. Revise os pendentes antigos antes de liberar a produção.

## 7. Gerar `CRON_SECRET` e configurar expiração

Essa variável é criada por você. Ela não vem do Firebase nem da Efí e não precisa ser igual a outro segredo.

No terminal:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copie os 64 caracteres gerados para `CRON_SECRET` no arquivo local e no painel da Vercel. O comando gera um valor novo toda vez: se executar novamente, escolha qual vai manter e atualize o ambiente correspondente.

A rota `/api/cron/expire` espera o header `Authorization: Bearer SEU_CRON_SECRET`. A Vercel usa a variável com esse nome para autenticar chamadas do cron; abrir a rota diretamente no navegador, sem o header, deve retornar **401**. Veja [como proteger cron jobs na Vercel](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).

O `vercel.json` usa uma execução **diária**, com a expressão `0 8 * * *` (08h UTC), compatível com o plano Hobby. A Vercel pode executar dentro da janela daquela hora; não há garantia de minuto exato nesse plano. Essa execução é uma limpeza de apoio, não uma verificação a cada 15 minutos. Consulte os [limites de cron da Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing).

**Para operar durante o Inter:** reservas de Pix vencidos podem ficar presas até a execução diária quando o provedor não enviar um webhook que as libere. Para liberar com frequência, configure um agendador externo para chamar `GET https://SEU_DOMINIO/api/cron/expire` a cada 15 minutos, enviando o header `Authorization: Bearer SEU_CRON_SECRET`, ou use um plano Vercel compatível com essa frequência. Cadastre o segredo no campo privado de headers do agendador, nunca na URL ou no repositório. Não há agendador externo configurado automaticamente neste projeto.

O webhook de pagamento e o botão de verificar Pix continuam funcionando independentemente desse cron. O agendamento diário não deve ser usado como confirmação de pagamento para liberar QR Codes.

A rotina consulta o provedor, sincroniza pagamentos aprovados e tenta cancelar cobranças pendentes vencidas antes de liberar a reserva. Não roda automaticamente só porque `npm run dev` está aberto. Durante o evento, monitore as execuções e o contador `unresolved`, descrito na seção de operação.

## 8. Cadastrar as variáveis na Vercel

O arquivo `.env.local` do seu computador **não é enviado automaticamente** para a Vercel.

1. Envie o código ao seu repositório, sem arquivos de credenciais, e importe o projeto na Vercel com o preset **Next.js**. O `package.json` configura Node 22.
2. Na criação do projeto ou em **Project > Settings > Environment Variables**, adicione cada nome da tabela da seção 2 e o respectivo valor. Se a interface oferecer importação de `.env`, confira o resultado campo a campo.
3. Escolha o ambiente **Production** para o endereço definitivo. Só configure **Preview** se quiser usar essas integrações nos links de prévia; prefira outro projeto Firebase e credenciais de teste para evitar misturar dados e cobranças.
4. No campo de valor, cole somente o conteúdo: não inclua `NOME=`, comentários ou as aspas externas do arquivo `.env.local`. Para a chave privada, o código aceita `\n` literais ou as quebras reais do certificado completo.
5. Faça o deploy. No primeiro, se ainda não souber o domínio, deixe Efí sem configurar. Assim que souber, ajuste `APP_URL`, configure o webhook, preencha as credenciais e faça novo deploy.
6. Abra **Deployments** e gere uma nova implantação depois de mudar variáveis. As mudanças valem para novos deploys; `NEXT_PUBLIC_*` entra no JavaScript durante o build. Veja o [guia de variáveis da Vercel](https://vercel.com/docs/environment-variables).
7. Adicione o domínio definitivo em **Firebase Authentication > Domínios autorizados**. Confira que `APP_URL`, o domínio acessado pelos atletas e a URL de webhook apontam para o endereço planejado.

Não reutilize `APP_URL=http://localhost:3000` em produção. Não cadastre as credenciais administrativas com prefixo `NEXT_PUBLIC_`. As funções usam essas credenciais somente no servidor.

## 9. Resolver os erros mais comuns

| Sintoma | O que conferir |
| --- | --- |
| Continua em demonstração | `NEXT_PUBLIC_FIREBASE_API_KEY` e `NEXT_PUBLIC_FIREBASE_PROJECT_ID` precisam estar preenchidas; reinicie o dev server ou faça novo build/deploy. Não basta editar `.env.example`. |
| Saiu da demonstração, mas os dados não carregam | Confira as três variáveis `FIREBASE_*` do servidor, o banco `(default)` e se todos os IDs apontam ao mesmo projeto. |
| “Firebase do servidor ainda não foi configurado” | Falta `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` ou `FIREBASE_PRIVATE_KEY` no ambiente que está executando a API. |
| Erro de chave privada, PEM ou certificado | Confira BEGIN/END, conteúdo completo, aspas no arquivo, `\n` corretos e ausência de vírgula de JSON. Não use `private_key_id`. |
| `auth/unauthorized-domain` | Cadastre o domínio onde está abrindo o app em Firebase Auth; `localhost` também precisa estar autorizado. |
| `Component auth has not been registered yet` | O SDK App e o Auth podem estar usando cópias diferentes do núcleo Firebase. Este projeto fixa versões compatíveis com Node 22 em `package.json` e `package-lock.json`. Pare o servidor, execute `npm ci` e reinicie com `npm run dev`. Preserve o lockfile; não instale `@firebase/*` separadamente. |
| Login Google indisponível ou configuração inválida | Habilite o provedor Google e confira os cinco campos do app Web. Não misture configuração pública de um projeto com conta de serviço de outro. |
| “Usuário não encontrado” no comando `admin` | Faça login no aplicativo com aquela conta Google primeiro. Depois execute o comando e saia/entre novamente. |
| `admin` ou `seed` diz que `.env.local` não existe | Você provavelmente preencheu `.env`. Padronize o nome conforme a seção 1; esses scripts não carregam `.env` automaticamente. |
| Firestore pede um índice | Publique `firestore.indexes.json` com a CLI e aguarde sua criação. Não altere as regras para acesso público. |
| Cardápio vazio, sem mensagem de erro | Um banco novo não tem pratos. Cadastre opções no painel ou use `npm run seed` somente se desejar exemplos. |
| Pix informa que precisa configurar provedor/URL | Confira as variáveis EFI, o certificado, o ambiente e APP_URL HTTPS no servidor. |
| Webhook retorna 401/403 | Confira EFI_WEBHOOK_SECRET, cadastro da URL e IPs autorizados. Na Vercel, o IP precisa corresponder à Efí; chamadas manuais sem segredo/origem válidos são recusadas. |
| Pagou, mas QR não apareceu | Use “Já paguei · verificar”; confira webhook e logs da Vercel. O app exige chave recebedora, txid, valor cobrado e recebimento corretos. Não aprove pelo comprovante. |
| Push não ativa ou não chega | Confira VAPID, sender ID, permissão do navegador e registro no aparelho. Reabra o app após publicar a configuração. Confira também a aba Avisos. |
| Funciona localmente, mas não na Vercel | Confira as variáveis de Production e refaça o deploy; a configuração local não é sincronizada automaticamente. |
| Deploy falha por frequência do cron | Confira se o deploy está usando a versão atual de `vercel.json`, com `0 8 * * *`. A expressão antiga `*/15 * * * *` não é aceita no Hobby. |

Se precisar compartilhar um erro para pedir ajuda, copie a mensagem e os **nomes** das variáveis envolvidas, ocultando os valores secretos.

## 10. Instalação e teste antes da divulgação

- **Android:** abra o link no Chrome e escolha Instalar aplicativo.
- **iPhone:** Safari > Compartilhar > Adicionar à Tela de Início. Push exige app instalado e iOS 16.4+.
- Se abrir pelo WhatsApp, use a opção de abrir no navegador do aparelho.
- É um PWA instalável, distribuído por link. Não é um APK/IPA ou publicação nas lojas.
- Pagamentos, consulta de pedidos e validação de retirada exigem internet.

Antes de enviar o link aos atletas, confira:

- [ ] Login Google funciona no domínio definitivo.
- [ ] Conta comum não acessa ações administrativas.
- [ ] Restaurantes, ingredientes/alergênicos, preços, capacidades e prazos são reais.
- [ ] Uma compra combina refeições de dias diferentes e cobra o total correto.
- [ ] Pix foi confirmado pela API e o saldo foi conferido na conta recebedora.
- [ ] QR aparece após pagamento; entrega exige chegada liberada e não pode ser repetida.
- [ ] Câmera, instalação e notificações foram testadas em celulares reais.
- [ ] A rotina de expiração executa no agendador escolhido.
- [ ] Canal de atendimento, cancelamento e privacidade foram definidos pela atlética.

## Fluxo do aplicativo

Uma compra pode combinar várias datas, restaurantes e refeições. Os preços vêm do servidor e ficam preservados no pedido. O estoque é reservado ao criar a cobrança. Existe uma autorização de retirada por opção de prato, data e refeição; várias unidades da mesma opção são entregues juntas. O QR contém uma credencial aleatória, e os detalhes são consultados no servidor.

Somente o pagamento confirmado pela API libera o QR. O clique em “já paguei” apenas consulta a situação. Depois, a equipe libera a chegada, confere o prato e confirma a entrega. Uma transação no Firestore impede duas retiradas do mesmo item.

O Pix tem uma janela de até 30 minutos, limitada ao fechamento da refeição mais próxima na sacola (almoço 10h30, jantar 18h, Brasília). A exportação de produção contabiliza somente pedidos pagos. As contas da equipe recebem permissão administrativa individual, sem compartilhar senha.

## Operação, conciliação e dados

Se a criação de cobrança tiver resposta incerta, o pedido pode permanecer pendente com a reserva. Em Meus pedidos, use a tentativa de gerar o Pix novamente para o mesmo pedido: a integração reutiliza a chave da cobrança. O CPF é enviado ao provedor, sem persistência no banco do app.

A rotina de expiração consulta a cobrança pelo txid. Uma resposta autenticada de cobrança inexistente só libera a reserva após o fim da trava de criação. Em falhas temporárias, divergências ou pedidos legados, mantém a reserva e retorna `unresolved`. O campo `remaining` indica itens do lote ainda não processados; podem existir outros lotes. Confira a referência no provedor antes de corrigir o pedido/estoque pelo console; nunca libere estoque de uma cobrança que ainda pode ser paga. O app não tem conciliação financeira completa, cancelamento pelo atleta ou reembolso automático. Devoluções são executadas no provedor; ao consultar uma devolução concluída, inclusive parcial, o app marca o pedido como estornado e bloqueia os QR restantes para atendimento manual. Devolução em processamento não é considerada concluída. Recebimentos inesperados após fechamento local são sinalizados com paymentReviewRequired, sem liberar QR automaticamente.

Avisos ficam salvos no aplicativo; push é uma tentativa de entrega e pode falhar. O app consulta atualizações a cada dois minutos enquanto está visível e online; ao voltar ao primeiro plano, atualiza se esse intervalo já passou. Para delegações grandes, coloque o disparo em fila antes de escalar.

Confirme com os restaurantes os horários, responsáveis, ingredientes, alergênicos e política de cancelamento. Observações no pedido não garantem substituições. Defina responsável pelo atendimento, política de privacidade e prazo de retenção antes de divulgar.

O QR é uma credencial de retirada: quem apresentar pode retirar as unidades correspondentes. Não o publique. Saia da conta em aparelhos compartilhados. Depois do evento, revogue acessos da equipe e organize a exclusão de pedidos, avisos, tokens e contas após a conciliação. Não existe exclusão automática nesta versão.

## Comandos de verificação

O `package.json` fixa `jose@5.10.0` somente na dependência `firebase-admin > jwks-rsa`, para que o Firebase Auth carregue também em runtimes que desabilitam `require(ESM)`. Sem essa compatibilidade, a função inteira da API pode retornar 500 com `ERR_REQUIRE_ESM` antes de executar qualquer rota. Mantenha o override e o lockfile juntos; o teste `firebase-admin-runtime.test.ts` reproduz esse ambiente e confere a conversão de uma chave pública e sua assinatura RSA sem acesso à rede. Referência: [problema no Firebase Admin](https://github.com/firebase/firebase-admin-node/issues/3181).

```powershell
npm run typecheck
npm test
npm run build
npm start
```

`npm run dev` abre o modo de desenvolvimento; `npm start` exige um build concluído. Os testes verificam preço, múltiplas refeições, estoque/prazo, quantidades, retirada, validação do checkout e autenticação do webhook e comportamento simulado da API Efí. Eles não substituem o teste integrado com suas contas Firebase/Efí e aparelhos reais.

## Crédito à vista: ativação e variáveis

O checkout oferece **Pix sem acréscimo** e **crédito em uma parcela com acréscimo de 3,49%**. Débito permanece indisponível. A taxa é calculada sobre o subtotal das refeições, arredondada para centavos e discriminada antes de pagar, no pedido e no painel administrativo. Exemplo: refeições de R$ 22,00 + taxa de R$ 0,77 = R$ 22,77. Esse acréscimo não é um cálculo para garantir o valor líquido: a Efí aplica a tarifa contratada sobre o total cobrado. Confira sua condição de recebimento na conta.

O crédito fica desabilitado até completar a configuração abaixo; o Pix continua disponível.

1. Na Efí, abra **API > Aplicações**, edite a aplicação e habilite **API de Emissão de cobranças**. A API Pix e a API de cobranças são serviços diferentes. O certificado `.p12` já configurado atende ao Pix; cobranças usa Client ID/Secret via OAuth, sem outro certificado.
2. Cadastre o ramo de atividade e conclua a aprovação de cartão/KYC exigida pela Efí. A documentação informa análise de até cinco dias úteis: confira a liberação antes do Inter. Consulte o [guia oficial de cartão](https://dev.efipay.com.br/docs/api-cobrancas/cartao/).
3. Abra **API > Introdução > Identificador de conta** e copie para `NEXT_PUBLIC_EFI_PAYEE_CODE`. Este identificador é usado no navegador para tokenizar o cartão. Não coloque Client Secret ou certificado nesse campo.
4. Se Pix e cobranças usam a mesma aplicação com ambas as APIs habilitadas, deixe `EFI_CARD_CLIENT_ID` e `EFI_CARD_CLIENT_SECRET` vazios: o servidor reutiliza `EFI_CLIENT_ID` e `EFI_CLIENT_SECRET`. Se forem aplicações diferentes, preencha o par `EFI_CARD_*` com as credenciais de cobranças. Os dois campos precisam ser preenchidos juntos. Use sempre o ambiente correspondente a `EFI_SANDBOX`.
5. Mantenha `APP_URL` com seu domínio público HTTPS e `EFI_WEBHOOK_SECRET` preenchido. Não modifique esses valores enquanto houver cobranças em aberto. O domínio precisa ser acessível pela Efí, sem proteção de login da Vercel.
6. Preencha `EFI_CREDIT_ENABLED=true`. Copie os valores para **Vercel > Settings > Environment Variables** e faça **novo deploy/build**, inclusive ao alterar o identificador `NEXT_PUBLIC_EFI_PAYEE_CODE`. Para desligar novas compras com cartão, defina a flag como `false`; a conciliação dos pedidos existentes continua funcionando.

```dotenv
# Exemplo de estrutura: preencha o identificador real da sua conta.
EFI_CREDIT_ENABLED=true
NEXT_PUBLIC_EFI_PAYEE_CODE=
# Deixe vazios para reutilizar as credenciais da aplicação do Pix:
EFI_CARD_CLIENT_ID=
EFI_CARD_CLIENT_SECRET=
```

A biblioteca oficial `payment-token-efi` tokeniza o cartão diretamente no navegador. O servidor recebe somente o token de uso único, o identificador 3DS e os dados do pagador; não salva número do cartão, CVV, CPF, telefone ou token de pagamento no Firestore. O servidor força `installments: 1` na rota atual `POST /v1/charge/card`. Quando o banco solicitar autenticação, o atleta verá **Autenticar com meu banco**, sairá para o ambiente do emissor e retornará aos pedidos.

A URL de notificações do crédito é incluída automaticamente em cada cobrança (`/api/webhooks/efi-card` com segredo). Não execute `efi:webhook register` para cartão: esse comando é exclusivo do Pix. O retorno do 3DS não libera retirada. A API consulta a cobrança autenticada e confere pedido, identificador, valor total, método de pagamento e uma parcela antes de aceitar `approved` ou `paid`. `approved` significa aprovação do cartão; o depósito do dinheiro na conta segue o prazo contratado com a Efí, sem exigir que o atleta espere a liquidação para retirar.

Em caso de resposta incerta, não há reenvio automático do pagamento. O app mantém a reserva e sinaliza **Conferir no provedor**. A notificação pode recuperar o identificador da cobrança; notificações recebidas são gravadas para nova tentativa de conciliação pelo cron. Se continuar inconclusivo, a equipe precisa consultar a Efí antes de ajustar o pedido ou liberar estoque. Recusa definitiva encerra o pedido e libera sua reserva; o atleta pode iniciar outra compra. Estornos continuam sendo feitos na Efí.

Antes de divulgar: teste em homologação a aprovação, a recusa, o desafio 3DS, o retorno após fechar o app, a atualização por notificação e o bloqueio de retirada sem pagamento. Use os [cenários oficiais de homologação](https://dev.efipay.com.br/docs/api-cobrancas/cartao/#homologação-e-cenários-de-teste), com credenciais desse ambiente. Os testes automatizados do projeto usam respostas simuladas e não realizam cobranças reais.

## Horários de venda — Brasília

| Refeição | Aviso para pedir | Bloqueio de novas vendas |
| --- | --- | --- |
| Almoço | Até 10h | Às 10h30 do dia da refeição |
| Jantar | Até 17h30 | Às 18h do dia da refeição |

O aviso aparece no cardápio. A meia hora adicional permite concluir a compra, e o bloqueio é validado no servidor, mesmo se a tela estiver aberta ou alguém tentar chamar a API diretamente. Os dias 20, 21 e 22 são independentes: o fechamento do almoço de sexta não bloqueia os dias seguintes nem o jantar. O prazo fixo vale também para cardápios antigos, sem precisar recadastrar dados. O formulário administrativo mostra o encerramento calculado e não permite alterá-lo.

O Pix dura no máximo 30 minutos e vence no fechamento mais próximo entre as refeições da sacola. No crédito, a compra precisa ser enviada antes do fechamento; uma autenticação já iniciada depende do processamento do banco. O cron concilia e tenta cancelar pagamentos vencidos, liberando reservas somente após confirmação do provedor. A validação do horário de novas vendas não depende do cron nem do plano Vercel.

## Lembretes automáticos de compra

Durante **20, 21 e 22/11/2026**, o app pode enviar um lembrete de almoço às **10h** (vendas até 10h30) e jantar às **17h30** (vendas até 18h), em Brasília. Se o agendador atrasar, a API ainda aceita o disparo até o fechamento; depois disso não envia. Não há lembretes fora do evento.

Os destinatários são atletas que já entraram no aplicativo e ainda não têm um pedido pago ou pagamento pendente válido daquela refeição, data e ambiente. Sem opções publicadas com estoque, não há disparo. O aviso fica na aba **Avisos**; o push exige que o atleta toque em **Ativar notificações** e conceda a permissão do celular. Em **Avisos > Lembretes de compra**, o atleta pode desativar os lembretes sem desativar avisos de chegada.

**O código sozinho não agenda os disparos.** A Vercel Hobby não fornece a frequência necessária no cron atual. Este projeto inclui `.github/workflows/purchase-reminders.yml` para chamar a rota protegida pelo GitHub Actions, a cada cinco minutos nas horas das refeições. Para ativar:

1. Publique estas alterações no branch principal do GitHub e faça o deploy na Vercel. Confirme que `APP_URL` é o domínio definitivo do app.
2. No repositório GitHub, abra **Settings > Secrets and variables > Actions > New repository secret**.
3. Cadastre `APP_URL` com a URL HTTPS do app e `CRON_SECRET` com o **mesmo segredo** do ambiente Production da Vercel. Não use o Client Secret da Efí nem o segredo do webhook.
4. Em **Actions**, habilite workflows se o GitHub solicitar. Execute **Lembretes de compra do Inter > Run workflow**, mantendo `dry_run` marcado, para verificar sem enviar. Fora do horário/dias do evento, o resultado correto é `windows: 0`.
5. No evento, confira as execuções de Actions e os contadores `notices`, `pushSent` e `pushFailed`. Workflows agendados podem atrasar; se precisar de maior pontualidade, use um agendador externo que chame `GET /api/cron/reminders` a cada cinco minutos com `Authorization: Bearer SEU_CRON_SECRET`. Não coloque o segredo na URL. Use apenas um agendador.

A rotina grava uma entrega por atleta, dia e refeição para evitar duplicação entre chamadas. Cada execução processa um lote e salva o cursor; `remaining: true` significa que a próxima chamada deve continuar. Os avisos na tela usam IDs estáveis. Push é uma tentativa de entrega: não há garantia de recebimento nem reenvio automático de um push cuja resposta foi incerta. O aviso permanece no app. Tokens que o Firebase confirmar como inválidos são removidos. Mensagens push têm validade somente até o encerramento das vendas.

Referência: [GitHub Actions — eventos agendados e possíveis atrasos](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Diagnóstico do cadastro do webhook Pix

O comando `npm run efi:webhook -- register` cadastra **Pix**, mesmo que você já tenha ativado crédito na API de cobranças. Para Pix, a aplicação precisa dos escopos `webhook.write` e `webhook.read`. O comando mostra HTTP, código Efí e uma orientação segura quando a Efí informar falha de acesso, HTTP de destino ou TLS, sem imprimir certificado, segredo ou chave Pix.

Antes de registrar, rode `npm run efi:webhook -- check`: confira se o webhook já aponta para outro sistema. O comando bloqueia o cadastro quando a chave já atende outro domínio. Use uma chave Pix dedicada para este app, mantendo a chave e o webhook do outro projeto intactos. Na mesma conta Efí, ambas as chaves recebem no mesmo saldo.

Se o cadastro falhar:

- **HTTP 403 na API Efí:** confira os escopos da API Pix no mesmo ambiente do certificado e credenciais.
- **URL do webhook responde 401:** confira se `EFI_WEBHOOK_SECRET` no servidor é exatamente igual ao local.
- **URL responde 403:** confira proteção de deploy da Vercel e IPs oficiais Efí. A chamada feita do seu computador pode receber 403 pela restrição de origem; isso não prova que a chamada da Efí será recusada.
- **URL responde 404:** faça o deploy da versão atual e confira o domínio `APP_URL`.
- **URL responde 500:** corrija o erro da função em **Vercel > Logs**. Não é possível registrar um destino que falha ao responder.
- **TLS/mTLS:** o comando inclui o cabeçalho de dispensa da validação mTLS suportado pela Efí. Confira o [guia Efí para webhook sem mTLS](https://dev.efipay.com.br/docs/api-pix/webhooks/). O app mantém segredo, validação de origem e consulta autenticada da cobrança.

A Efí testa a URL ao registrar. Nunca use `localhost`, domínio de exemplo ou deploy protegido por login. Corrija e publique primeiro, depois tente cadastrar novamente. Não remova a autenticação do webhook para contornar falhas de configuração.

Para conferir as credenciais do cartão, use `npm run efi:card-check`. O comando autentica na API de cobranças sem criar pagamentos, não altera o webhook Pix e não confirma KYC ou limite de cartão. O identificador público e a flag de crédito precisam estar também na Vercel, com novo build.

## Consumo do Firebase no plano Spark

O Firestore Standard oferece **50.000 leituras, 20.000 gravações e 20.000 exclusões por dia**, além de **1 GiB de dados** e **10 GiB/mês de saída de rede**. A cota diária reinicia perto da meia-noite do horário do Pacífico, não de Brasília. Confira os valores e o consumo em [Firestore > Usage](https://console.firebase.google.com/) e na [documentação oficial de cotas](https://firebase.google.com/docs/firestore/quotas). No Spark, atingir a cota pode interromper operações; estas otimizações não garantem que ela nunca será atingida.

Proteções implementadas:

- Atualização automática a cada **120 segundos**, somente com a aba visível e conexão ativa. Chamadas simultâneas de atualização compartilham a mesma requisição por conta. Login evita uma atualização duplicada, e o perfil é lido uma vez por sessão do app.
- Cardápio público em cache por **60 segundos por instância do servidor**, compartilhando consultas simultâneas. Salvar prato ou anunciar chegada invalida o cache daquela instância. Outras instâncias e inicializações novas têm cache próprio. Estoque/preços exibidos podem atrasar; compra, pagamento e retirada consultam os documentos reais e mantêm suas validações.
- O painel carrega todos os pedidos ao abrir e no botão **Atualizar pedidos**, sem reler toda a coleção em cada atualização do atleta. Atualize antes de conferir totais ou exportar produção. A confirmação de retirada também atualiza o painel.
- Quando a API recebe erro de cota do Firestore, responde com HTTP 503 e orientação para aguardar. As atualizações do app fazem uma pausa de cinco minutos após HTTP 503/429.

Para estimar as leituras automáticas de pedidos e avisos, use: **atletas ativos × ciclos de atualização × (documentos de pedidos + documentos de avisos por atleta)**. Cada consulta vazia também custa pelo menos uma leitura. Exemplo: 100 atletas com a tela aberta por uma hora, um pedido e dois avisos cada, geram aproximadamente **9.000 leituras** apenas nessas duas consultas (30 ciclos), além das leituras iniciais, cardápios, operações de compra, retiradas, painel, cron e lembretes. Cada aba/dispositivo adicional aumenta o consumo.

O painel ainda lê todos os pedidos quando solicitado; lembretes e avisos de chegada também leem destinatários/pedidos e gravam avisos. Evite recarregar o painel repetidamente e use apenas um agendador. Acompanhe o uso real durante os testes e o evento; cache local e pausa no navegador não impõem um teto global ao projeto nem impedem chamadas diretas à API. O app não consulta automaticamente a cota restante no Firebase.


## Cardápios — Marmitex Garota Nota 100

`npx tsx --env-file=.env.local scripts/register-garota.ts` cadastra as opções reais sem substituir documentos existentes:

- Sexta, 20/11: costela cozida ou bisteca suína; pequena R$ 20, média R$ 22, grande R$ 24.
- Sábado, 21/11: churrasco ou feijoada; pequena R$ 22, média R$ 25, grande R$ 28.
- Domingo, 22/11: arroz, feijão, macarronada, frango assado, farofa e salada de maionese; pequena R$ 20, média R$ 22, grande R$ 24.

Funcionamento: sexta das 8h às 17h; sábado das 8h às 13h. Domingo somente por encomenda até sábado, com encerramento às 13h. Delivery ou retirada no restaurante. No alojamento, a retirada padrão é das 12h às 13h30 no almoço e das 18h às 19h30 no jantar.

Os 15 cadastros são publicados com capacidade padrão de 50 unidades por opção/tamanho. Novos pratos no painel e os exemplos usam a mesma capacidade e os mesmos horários, definidos em `lib/menu-defaults.ts`. Ao trocar a refeição no formulário, o horário é ajustado para o padrão correspondente. O servidor impede publicar sem preço e capacidade válidos. Não foram cadastrados jantares, pois os materiais fornecidos não os especificam.

`npx tsx --env-file=.env.local scripts/apply-menu-defaults.ts` aplica capacidade 50 e os horários de retirada a todos os cardápios existentes. Também publica as opções Garota Nota 100 que estavam com capacidade zero. Preserva reservas, estado das demais opções e dados de pedidos já criados; se houver mais de 50 reservas em uma opção, interrompe sem alterações.

Os horários de funcionamento não entram na descrição e não alteram o fechamento padrão de vendas de almoço (10h30). Para este restaurante, o almoço de domingo tem prazo antecipado no sábado às 13h, aplicado também ao pagamento. Lembretes de domingo não promovem opções cujo prazo já terminou.

Para atualizar o rascunho antigo de domingo e incluir seus três tamanhos, execute `npx tsx --env-file=.env.local scripts/update-garota-sunday.ts`. O comando preserva capacidade, reservas e estado das opções existentes.

## Cardápios Sabor & Cia e Lar dos Sabores

Foram extraídos 31 produtos de cada restaurante, incluindo refeições, saladas e bebidas. O catálogo público está em `data/imports/external-products.json`, com nomes, acompanhamentos, fotos, preços, grupos de escolhas e links de origem. Dados de contato, endereço e funcionamento não são incluídos nas descrições dos pratos.

Os horários confirmados são das 9h às 14h, com domingo fechado, para ambos os restaurantes. A importação cria 124 cardápios: os 62 produtos no almoço de sexta, 20/11, e sábado, 21/11. Cada produto tem capacidade de 50 unidades, compartilhada pelas diferentes combinações de tamanho e adicionais, e retirada das 12h às 13h30. Não cria jantares nem opções de domingo desses restaurantes.

O formulário permite escolher tamanho, salada, acompanhamentos e adicionais conforme o produto. Há um tamanho por marmita; para pedir tamanhos ou escolhas diferentes, adicione cada combinação à sacola. As quantidades dos adicionais são por unidade da marmita. A observação também pertence àquela combinação. O servidor valida opções obrigatórias, limites, preços e estoque somado antes de criar pagamentos Pix ou crédito. As escolhas ficam registradas no pedido, QR de retirada, painel e CSV de produção. O administrador pode editar grupos, opções, limites e acréscimos no formulário do prato; o preço exibido é o menor total válido, calculado a partir do preço base e das escolhas obrigatórias.

Para importar no Firebase configurado:

```powershell
npx tsx --env-file=.env.local scripts/import-external-menus.ts
```

O comando confere `/api/payments/config` no `APP_URL`. Se o site já responder `menuCustomization: true`, publica os produtos. Caso contrário, salva os novos cadastros ocultos até o deploy da versão compatível; execute novamente depois de publicar o código. Isso evita que a versão antiga venda produtos ignorando as escolhas obrigatórias. Cadastros existentes e suas reservas são preservados; a limpeza das descrições do Garota Nota 100 também é aplicada no banco. A importação não atualiza preços automaticamente em cadastros já existentes.

Para extrair uma nova fotografia dos catálogos públicos, sem enviar pedidos aos restaurantes:

```powershell
python -m pip install beautifulsoup4
python scripts/extract-external-menus.py
```

Revise o JSON antes de uma nova importação: pratos do dia, saladas e preços podem mudar nos sites de origem. A extração ignora a categoria de avisos do Saipos (incluindo instruções de pagamento do restaurante). O pagamento do Inter continua no checkout próprio do aplicativo. O extrator interrompe se encontrar um tipo de escolha ou cálculo que não sabe converter.
