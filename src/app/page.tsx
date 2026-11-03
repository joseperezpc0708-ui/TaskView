import Link from 'next/link';
import { redirect } from 'next/navigation';
import { configured, supabase } from '@/lib/supabase/server';
import { Workspace } from '@/components/workspace';
import type { Ritm, Activity } from '@/lib/domain';
export const dynamic = 'force-dynamic';
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!configured())
    return (
      <main className="setup">
        <span className="brand-mark">R</span>
        <p className="eyebrow">SEU WORKSPACE ESTÁ QUASE PRONTO</p>
        <h1>Bem-vindo ao RITM Tracker.</h1>
        <p>Configure o Supabase para começar a organizar seu trabalho com segurança.</p>
        <ol>
          <li>
            Copie <code>.env.example</code> para <code>.env.local</code> e informe a URL e a chave
            pública.
          </li>
          <li>
            Execute <code>supabase/migrations/001_initial.sql</code> no SQL Editor.
          </li>
          <li>Desative cadastros públicos e crie seu usuário no painel Authentication.</li>
          <li>Reinicie o servidor e entre na sua conta.</li>
        </ol>
        <Link className="btn btn-primary" href="/login">
          Ir para o login →
        </Link>
        <small>As instruções completas estão no README do projeto.</small>
      </main>
    );
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/login');
  const rows: Ritm[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await db
      .from('ritms')
      .select('*,ritm_attachments(count),ritm_checklist_items(completed)')
      .order('updated_at', { ascending: false })
      .range(offset, offset + 499);
    if (error)
      throw new Error('Não foi possível carregar as RITMs. Verifique a conexão e as migrations.');
    rows.push(
      ...data.map((r) => ({
        ...r,
        received_at: r.received_at || '',
        due_date: r.due_date || '',
        attachment_count: r.ritm_attachments[0]?.count || 0,
        checklist_total: r.ritm_checklist_items.length,
        checklist_done: r.ritm_checklist_items.filter((c: { completed: boolean }) => c.completed)
          .length,
      })),
    );
    if (data.length < 500) break;
    offset += 500;
  }
  const { data: activity } = await db
    .from('ritm_activity_logs')
    .select('id,action,created_at')
    .order('created_at', { ascending: false })
    .limit(8);
  const query = new URLSearchParams();
  Object.entries(await searchParams).forEach(([key, value]) => {
    if (typeof value === 'string') query.set(key, value);
  });
  return (
    <Workspace
      rows={rows}
      activity={(activity || []) as Activity[]}
      email={user.email || ''}
      initialQuery={query.toString()}
    />
  );
}
