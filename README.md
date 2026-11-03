# RITM Tracker

Workspace pessoal em português para organizar desenvolvimento e suporte ServiceNow. Next.js App Router, TypeScript estrito, Tailwind 4, componentes shadcn/ui, Lucide, React Hook Form/Zod e Supabase (PostgreSQL, Auth e Storage privado). Não há dados de exemplo nem modo de persistência simulada.

## Executar

Requisitos: Node.js 22 LTS e npm. O Node portátil em `.tools/` é somente uma ferramenta local ignorada pelo Git.

```powershell
npm install
Copy-Item .env.example .env.local
# Preencha .env.local com a URL e publishable key do seu projeto Supabase.
npm run dev
```

Abra http://localhost:3000. Sem configuração, a aplicação mostra instruções em vez de tentar acessar um banco inexistente. Nunca inclua `.env.local` no Git. Não é necessária chave `service_role`.

## Configurar Supabase

1. Crie um projeto no Supabase. Em Project Settings > API, copie Project URL e a publishable key para `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. Abra SQL Editor e execute **uma vez o conteúdo completo de `supabase/migrations/001_initial.sql`**. A transação cria `ritms`, `ritm_attachments`, `ritm_checklist_items`, `ritm_activity_logs`, `tags`, `ritm_tags`, índices, triggers, RLS e o bucket privado `ritm-evidence`. Para CLI em um projeto novo: `supabase link --project-ref SEU_PROJECT_REF`, seguido de `supabase db push`.
3. Em Authentication > Sign In / Providers, desative **Allow new users to sign up** e desative sign-in anônimo. Mantenha email/password habilitado. Não existe formulário ou endpoint de cadastro na aplicação. Desativar o cadastro no painel é obrigatório: ocultar um formulário não impede chamadas diretas à API de Auth.
4. Em Authentication > Users, use Add user > Create new user, com seu e-mail e senha forte; confirme manualmente o e-mail. Crie somente seu usuário.
5. Em Authentication > URL Configuration, configure Site URL para `http://localhost:3000` no desenvolvimento e para a URL HTTPS da Vercel em produção. Login usa senha e não depende de redirecionamentos OAuth.
6. Em Storage, confirme que `ritm-evidence` está **privado**, com limite de 10 MB e tipos PNG/JPEG/WebP. Não altere para público. A migration configura essas opções e as policies.

Cada registro pertence a `auth.uid()`. Chaves estrangeiras compostas impedem associar filhos a RITMs de outro proprietário. O servidor valida a sessão com `getUser()`, e o Proxy atualiza os cookies de autenticação. Logs são criados pelo banco e não podem ser inseridos ou alterados diretamente pelo cliente. O trigger registra criação, edição, arquivamento, conclusão e reabertura sem copiar textos técnicos para o histórico. Datas de conclusão são controladas pelo banco.

As imagens usam caminhos `user_id/ritm_id/uuid.ext`; o servidor valida tamanho, MIME e assinatura binária. Metadados ficam no PostgreSQL; URLs de leitura assinadas expiram em cinco minutos e a galeria renova a página a cada quatro minutos. O botão Atualizar links também renova o acesso. Uploads são sequenciais com progresso real via XMLHttpRequest e enviados diretamente ao Storage por URL assinada autorizada pelo servidor. A URL de upload tem a validade padrão do Supabase (duas horas) e não permite sobrescrita. Apenas pequenos JSONs passam pelas Functions, evitando o limite de corpo de 4,5 MB da Vercel. O servidor baixa e valida o arquivo antes de finalizar os metadados. Em caso de falha ao gravar metadados, o arquivo enviado é removido. Se a conexão cair antes da finalização, pode sobrar um objeto sem metadados; remova objetos órfãos pelo painel Storage.

## Funcionalidades

- Dashboard com totais reais, pendentes, em andamento, aguardando, concluídas, atrasadas e concluídas na semana (segunda-feira em diante, fuso do navegador).
- CRUD com confirmação de exclusão, duplicação com novo número, conclusão, reabertura, arquivamento/restauração e favoritos.
- Formulário com identificação, organização, origem e campos técnicos; validação Zod também no servidor. Proteção contra descarte ao fechar o formulário e ao sair/recarregar a página com alterações.
- Tabela com colunas ordenáveis, cards e Kanban com drag and drop e seletor de status para teclado/touch. Todos usam os mesmos dados persistidos.
- Busca por número, título, descrição, categoria, tags, problema e solução; filtros combináveis de status, prioridade, categoria, ambiente, origem e intervalo de criação. Filtros e ordenação persistidos na URL.
- Biblioteca Soluções com RITMs concluídas e acesso ao problema, código e evidências; favoritos em seção própria.
- Checklist editável, reordenável e com progresso; edição de texto salva ao sair do campo.
- Galeria com múltiplos uploads, pré-visualização antes do envio, arraste, Ctrl+V (fora de campos de texto), legendas, tipos de evidência, reordenação, exclusão confirmada e lightbox com zoom.
- Exportação CSV da lista filtrada, com UTF-8 BOM e neutralização de fórmulas.
- Tema escuro padrão, tema claro, responsividade, skeletons, estados vazios e notificações.

## Verificações

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Teste integrado após configurar o Supabase: entre, crie uma RITM, tente repetir o número (deve falhar), edite, anexe PNG/JPG/WebP por seleção/arraste/colar, recarregue e confirme persistência. Edite legenda, reordene, amplie e remova evidências. Crie e conclua subtarefas. Mova status pelo Kanban, conclua/reabra e confira datas e histórico. Teste filtros, CSV, favoritos, arquivamento, duplicação com novo número e exclusão. Saia e confirme que `/` e `/ritms/ID` redirecionam ao login.

Validação de isolamento: em projeto de testes, crie um segundo usuário manualmente. Esse usuário não deve ler nem alterar registros, metadados ou caminhos de Storage do primeiro usuário, nem criar filhos apontando para sua RITM. Uma requisição anônima não deve retornar dados. Remova o usuário de testes ao finalizar.

## Vercel e GitHub

O repositório já aponta para `joseperezpc0708-ui/TaskView`. Revise as alterações, faça commit e push pela sua instalação Git:

```powershell
git add .
git commit -m "Implement RITM Tracker"
git push origin main
```

Na Vercel: Add New Project > importe o repositório GitHub > framework Next.js > Node 22.x > mantenha os comandos padrão. Adicione as duas variáveis do `.env.example` em Production e nos ambientes Preview necessários. Faça Deploy e ajuste a Site URL no Supabase para o domínio final. Alterar variáveis públicas exige novo build/deploy. Nenhuma credencial privilegiada deve ser adicionada. Os planos gratuitos podem ser usados respeitando os limites e regras de cada serviço.

## Estrutura

- `src/app`: rotas App Router, login, detalhes, endpoint de upload e estados de erro/carregamento.
- `src/components`: workspace, formulário, detalhes, galeria e primitivos de UI.
- `src/lib/domain.ts`: tipos, schemas, cálculo de atraso e CSV.
- `src/lib/actions.ts`: mutações autenticadas e validação.
- `src/lib/supabase`: clientes SSR e browser.
- `supabase/migrations`: esquema e segurança.
- `tests`: testes de validação, CSV e atraso.

## Escopo e limites explícitos

Esta entrega prioriza o MVP funcional. Não integra a API do ServiceNow. A duplicação copia campos e tags; evidências, checklist e histórico não são duplicados. O histórico registra alterações na RITM, não cada edição de anexo/subtarefa. Não há recuperação de senha na UI; use o painel Auth para administrar o único usuário.

A busca e indicadores operam em memória após carregar os registros autenticados em lotes de 500, adequado ao uso pessoal. Paginação e busca integral no servidor são evolução para volumes grandes. O índice textual SQL já está disponível. Reordenação persiste posições sequencialmente; se a rede falhar no meio, recarregue e repita. Não há edição colaborativa, bloqueio otimista nem salvamento offline; mantenha uma aba editora por registro.

Storage e PostgreSQL não compartilham transações: a exclusão remove primeiro os arquivos e depois os registros. Se a etapa SQL falhar após apagar o arquivo, repita a exclusão; os metadados podem temporariamente apontar para um arquivo ausente. O usuário não deve fechar a aba durante uploads. Faça backups pelo painel Supabase conforme a importância dos dados.

A URL e a chave pública foram configuradas somente em `.env.local` (ignorado pelo Git). O proprietário informou a execução da migration; uma nova consulta confirmou a existência de `public.ritms` e recusou leitura anônima com HTTP 401 (`42501`). A consulta pública de Auth confirmou que cadastros ainda estavam habilitados e sign-in anônimo desabilitado. A criação do usuário e a desativação de novos cadastros permanecem pendentes, assim como a validação integrada de CRUD, RLS autenticada e Storage. O commit inicial foi enviado ao GitHub. Sem acesso à Vercel, o deploy também permanece pendente. O código não substitui essa validação integrada.
