# Verificação da entrega — 03/11/2026

## Ambiente

- Windows; Node portátil 22.23.4, npm 10.9.9.
- Next.js 16.4.4, React 19.3.1, TypeScript 5.9.3, Tailwind 4.3.4.
- Supabase JS 2.118.0, Supabase SSR 0.7.0.
- Versões resolvidas e integridades registradas em `package-lock.json`.

## Verificações locais

- ESLint: aprovado, sem avisos.
- TypeScript estrito: aprovado.
- Testes automatizados: 3 aprovados (validação de RITM/URL, CSV e cálculo de atraso).
- Build de produção: aprovado.
- Login: HTTP 200 e formulário presente no HTML.
- Sem autenticação: `/` e `/ritms/UUID` retornam HTTP 307 para `/login`.
- Upload sem autenticação: HTTP 401.
- Formatação Prettier aplicada.

O sandbox do Windows bloqueou processos filhos com `spawn EPERM`; testes e build foram executados com aprovação fora do sandbox. Não foi desativada a validação TLS. Para consultar Supabase nesse Windows foi usado `node --use-system-ca`; o servidor local usa `NODE_USE_SYSTEM_CA=1`.

## Serviço real e verificações pendentes

A URL e publishable key fornecidas foram armazenadas em `.env.local`, ignorado pelo Git. Uma consulta de leitura ao projeto retornou `PGRST205`: `public.ritms` não encontrada no schema cache. A migration precisa ser executada pelo proprietário no SQL Editor. A chave pública não concede DDL nem administração de usuários.

Não foram verificados contra o serviço real: execução da migration, login com usuário válido, persistência CRUD, regras RLS entre dois usuários, upload/remoção de imagens e geração de URLs assinadas. O roteiro completo está no README. Não há navegador conectado ao ambiente; não foi possível inspecionar screenshots ou testar visualmente a responsividade.

Nenhum projeto Vercel foi configurado ou publicado nesta sessão. Configure o serviço e as variáveis e execute os testes integrados antes de considerar a implantação pronta para produção.

## Auditoria de dependências

A instalação npm reportou **16 vulnerabilidades moderadas**. O log da instalação cita `minimatch` e o advisory `GHSA-g3hv-75wg-m249`. A consulta detalhada `npm audit --json` exigiu acesso de rede e foi rejeitada na aprovação; nenhuma correção forçada foi aplicada. A análise e resolução dos avisos permanecem pendentes. Não há conclusão de ausência de vulnerabilidades na aplicação.
