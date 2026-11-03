import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { supabase, configured } from '@/lib/supabase/server';
import { RitmDetail } from '@/components/ritm-detail';
import type { Ritm, Attachment, Checklist, Activity } from '@/lib/domain';
export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  if (!configured()) redirect('/');
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data, error } = await db
    .from('ritms')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (error?.code === 'PGRST116') notFound();
  if (error) throw new Error('Falha ao carregar registro.');
  const [attachments, checklist, logs] = await Promise.all([
    db.from('ritm_attachments').select('*').eq('ritm_id', id).order('position'),
    db.from('ritm_checklist_items').select('*').eq('ritm_id', id).order('position'),
    db
      .from('ritm_activity_logs')
      .select('*')
      .eq('ritm_id', id)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  if (attachments.error || checklist.error || logs.error)
    throw new Error('Falha ao carregar detalhes.');
  const files = await Promise.all(
    (attachments.data || []).map(async (a) => {
      const { data: signed } = await db.storage.from('ritm-evidence').createSignedUrl(a.path, 300);
      return { ...a, url: signed?.signedUrl };
    }),
  );
  return (
    <RitmDetail
      ritm={{ ...data, received_at: data.received_at || '', due_date: data.due_date || '' } as Ritm}
      attachments={files as Attachment[]}
      checklist={(checklist.data || []) as Checklist[]}
      logs={(logs.data || []) as Activity[]}
    />
  );
}
