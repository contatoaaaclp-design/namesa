# Inter na Mesa

Aplicativo PWA para organizar as refeições da delegação no Inter, de **20 a 22 de novembro de 2026**, em horário de Brasília. Usa Next.js, Firebase e Pix via Mercado Pago, com hospedagem preparada para a Vercel.

## Por onde começar

Você pode configurar em três etapas. Não precisa conseguir todas as credenciais de uma vez.

| Etapa | O que configurar | O que você consegue testar |
| --- | --- | --- |
| 1. Demonstração | Nenhuma variável | Cardápio fictício, pedidos simulados, QR e painel de teste |
| 2. Firebase | As cinco variáveis públicas do app Web e as três variáveis do Admin SDK | Login Google, banco real, pedidos da conta e painel administrativo |
| 3. Publicação e integrações | URL HTTPS, Mercado Pago, VAPID e cron | Pix real, notificações no celular e expiração automática |

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
| `MERCADOPAGO_ACCESS_TOKEN` | Credenciais da aplicação Mercado Pago | Cria e consulta cobranças na conta recebedora | Pix; **secreta** |
| `MERCADOPAGO_WEBHOOK_SECRET` | Configuração de Webhooks no Mercado Pago | Confere a assinatura das notificações de pagamento | Pix; **secreta** |
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

## 6. Publicar e configurar o Pix

### Entenda qual conta recebe

Esta implementação usa a **conta Mercado Pago da atlética**. O pagamento entra no saldo dessa conta, conforme as condições do provedor. `MERCADOPAGO_ACCESS_TOKEN` não é a chave Pix, senha, Public Key, Client ID ou Client Secret.

Se vocês querem receber diretamente por outro banco, será preciso adaptar a integração. Colocar uma chave Pix de outro banco no arquivo não realiza essa adaptação.

### Obter o token e uma URL HTTPS

1. Entre no [Mercado Pago Developers](https://www.mercadopago.com.br/developers/pt) com a conta que deve receber os pagamentos.
2. Acesse **Suas integrações**, crie ou abra a aplicação e consulte **Credenciais**. Se precisar selecionar a solução, use a configuração de pagamentos online compatível com Checkout API/Pix deste projeto.
3. Copie o **Access Token** do ambiente que pretende usar. Para cobranças reais, conclua a ativação das credenciais de produção. Os prefixos dos tokens não são uma forma confiável de distinguir todos os ambientes; confira a identificação no painel. Veja a [documentação de credenciais](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/credentials).
4. Coloque o token em `MERCADOPAGO_ACCESS_TOKEN`. Credenciais de teste devem ser usadas com o fluxo e as contas de teste definidos pelo provedor; elas não recebem dinheiro real da delegação.
5. Publique na Vercel seguindo a seção 8. Você pode fazer o primeiro deploy apenas com Firebase, sem liberar cobranças, para descobrir seu domínio.
6. Com o domínio definido, preencha `APP_URL` com a URL pública, sem barra ao final:

```dotenv
APP_URL=https://inter-da-atletica.vercel.app
MERCADOPAGO_ACCESS_TOKEN=TOKEN_COPIADO_DO_PAINEL
```

Use seu endereço real. `http://localhost:3000` serve para login e navegação local, mas **o código bloqueia a criação de Pix quando `APP_URL` não começa com `https://`**. O provedor também não consegue enviar eventos ao `localhost` do seu computador. Para o primeiro teste integrado, use o app publicado e mantenha acesso e divulgação sob seu controle.

### Obter o segredo do webhook

Webhook é a chamada que o Mercado Pago faz ao servidor para avisar uma alteração no pagamento.

1. Na sua aplicação Mercado Pago, abra **Webhooks / Notificações**.
2. Configure a URL de notificação do ambiente correspondente:

```text
https://SEU_DOMINIO/api/webhooks/mercadopago
```

3. Selecione o evento **Payments / Pagamentos** e salve.
4. Copie a **assinatura secreta / secret signature** exibida na configuração para:

```dotenv
MERCADOPAGO_WEBHOOK_SECRET=SEGREDO_COPIADO_DA_CONFIGURACAO_DE_WEBHOOKS
```

Não invente esse valor nem copie o Access Token nele. Esse segredo precisa corresponder ao que assina os eventos recebidos. O servidor exige a assinatura e consulta o pagamento no provedor antes de liberar o QR. Veja a [documentação de Webhooks](https://www.mercadopago.com.br/developers/pt/docs/iset/additional-content/your-integrations/notifications/webhooks).

Cadastre ou atualize esses valores também na Vercel e faça novo deploy. O simulador de webhook ajuda a verificar a chamada, mas sozinho não prova um pagamento real correspondente a um pedido do app. Antes da divulgação, valide o fluxo completo com uma compra real de baixo valor e confira o recebimento na conta.

## 7. Gerar `CRON_SECRET` e configurar expiração

Essa variável é criada por você. Ela não vem do Firebase nem do Mercado Pago e não precisa ser igual a outro segredo.

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
5. Faça o deploy. No primeiro, se ainda não souber o domínio, deixe Mercado Pago sem configurar. Assim que souber, ajuste `APP_URL`, configure o webhook, preencha as credenciais e faça novo deploy.
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
| Login Google indisponível ou configuração inválida | Habilite o provedor Google e confira os cinco campos do app Web. Não misture configuração pública de um projeto com conta de serviço de outro. |
| “Usuário não encontrado” no comando `admin` | Faça login no aplicativo com aquela conta Google primeiro. Depois execute o comando e saia/entre novamente. |
| `admin` ou `seed` diz que `.env.local` não existe | Você provavelmente preencheu `.env`. Padronize o nome conforme a seção 1; esses scripts não carregam `.env` automaticamente. |
| Firestore pede um índice | Publique `firestore.indexes.json` com a CLI e aguarde sua criação. Não altere as regras para acesso público. |
| Cardápio vazio, sem mensagem de erro | Um banco novo não tem pratos. Cadastre opções no painel ou use `npm run seed` somente se desejar exemplos. |
| Pix informa que precisa configurar provedor/URL | Confira `MERCADOPAGO_ACCESS_TOKEN` e `APP_URL` HTTPS no servidor. Uma chave Pix estática não substitui o token. |
| Webhook retorna 401 | Confira o segredo da aplicação e ambiente corretos. Uma chamada manual sem assinatura também é recusada por projeto. |
| Pagou, mas QR não apareceu | Use “Já paguei · verificar”; confira webhook e logs da Vercel. O app exige referência, método, moeda e valor corretos. Não aprove pelo comprovante. |
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

O Pix tem uma janela de 30 minutos após a criação. Considere essa janela ao combinar o horário de fechamento da produção com os restaurantes. A exportação de produção contabiliza somente pedidos pagos. As contas da equipe recebem permissão administrativa individual, sem compartilhar senha.

## Operação, conciliação e dados

Se a criação de cobrança tiver resposta incerta, o pedido pode permanecer pendente com a reserva. Em Meus pedidos, use a tentativa de gerar o Pix novamente para o mesmo pedido: a integração reutiliza a chave da cobrança. O CPF é enviado ao provedor, sem persistência no banco do app.

A rotina de expiração procura referências sem `paymentId`. Se não encontrar a cobrança, mantém a reserva e retorna `unresolved`. Confira a referência no provedor antes de corrigir o pedido/estoque pelo console; nunca libere estoque de uma cobrança que ainda pode ser paga. O app não tem conciliação financeira completa, cancelamento pelo atleta ou reembolso automático. Estornos são executados no provedor; o webhook recebido bloqueia os QR restantes de pedidos estornados.

Avisos ficam salvos no aplicativo; push é uma tentativa de entrega e pode falhar. O app consulta atualizações a cada 15 segundos e ao voltar ao primeiro plano. Para delegações grandes, coloque o disparo em fila antes de escalar.

Confirme com os restaurantes os horários, responsáveis, ingredientes, alergênicos e política de cancelamento. Observações no pedido não garantem substituições. Defina responsável pelo atendimento, política de privacidade e prazo de retenção antes de divulgar.

O QR é uma credencial de retirada: quem apresentar pode retirar as unidades correspondentes. Não o publique. Saia da conta em aparelhos compartilhados. Depois do evento, revogue acessos da equipe e organize a exclusão de pedidos, avisos, tokens e contas após a conciliação. Não existe exclusão automática nesta versão.

## Comandos de verificação

```powershell
npm run typecheck
npm test
npm run build
npm start
```

`npm run dev` abre o modo de desenvolvimento; `npm start` exige um build concluído. Os testes verificam preço, múltiplas refeições, estoque/prazo, quantidades, retirada, validação do checkout e assinatura de webhook. Eles não substituem o teste integrado com suas contas Firebase/Mercado Pago e aparelhos reais.
