'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/server';
import { ritmSchema, evidenceTypes } from '@/lib/domain';
async function context() {
  const db = await supabase();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new Error('Sessão expirada. Entre novamente.');
  return { db, user };
}
function fail(error: { message: string; code?: string } | null) {
  if (error)
    throw new Error(
      error.code === '23505'
        ? 'Já existe uma RITM com esse número.'
        : 'Não foi possível salvar. Verifique os dados e tente novamente.',
    );
}
export async function saveRitm(input: unknown, id?: string) {
  const data = ritmSchema.parse(input);
  const { db, user } = await context();
  const values = {
    ...data,
    received_at: data.received_at || null,
    due_date: data.due_date || null,
    user_id: user.id,
  };
  const query = id
    ? db.from('ritms').update(values).eq('id', z.uuid().parse(id)).eq('user_id', user.id)
    : db.from('ritms').insert(values);
  const { data: row, error } = await query.select('id').single();
  fail(error);
  revalidatePath('/');
  return row!.id as string;
}
export async function deleteRitm(id: string) {
  const { db, user } = await context();
  z.uuid().parse(id);
  const { data: files, error: readError } = await db
    .from('ritm_attachments')
    .select('path')
    .eq('ritm_id', id)
    .eq('user_id', user.id);
  fail(readError);
  if (files?.length) {
    const { error } = await db.storage.from('ritm-evidence').remove(files.map((x) => x.path));
    fail(error);
  }
  const { error } = await db.from('ritms').delete().eq('id', id).eq('user_id', user.id);
  fail(error);
  revalidatePath('/');
}
export async function checklistChange(
  ritmId: string,
  operation: 'add' | 'update' | 'delete',
  input: unknown,
) {
  const { db, user } = await context();
  z.uuid().parse(ritmId);
  const schema = z.object({
    id: z.uuid().optional(),
    title: z.string().trim().min(1).max(500).optional(),
    completed: z.boolean().optional(),
    position: z.number().int().min(0).optional(),
  });
  const data = schema.parse(input);
  if (operation === 'add') {
    if (!data.title) throw new Error('Informe a atividade.');
    const { error } = await db
      .from('ritm_checklist_items')
      .insert({ ...data, ritm_id: ritmId, user_id: user.id });
    fail(error);
  } else {
    const id = z.uuid().parse(data.id);
    const query =
      operation === 'delete'
        ? db.from('ritm_checklist_items').delete()
        : db.from('ritm_checklist_items').update(data);
    const { error } = await query.eq('id', id).eq('ritm_id', ritmId).eq('user_id', user.id);
    fail(error);
  }
  revalidatePath('/');
}
export async function attachmentChange(id: string, input: unknown) {
  const { db, user } = await context();
  const data = z
    .object({
      caption: z.string().max(500).optional(),
      evidence_type: z.enum(evidenceTypes).optional(),
      position: z.number().int().min(0).optional(),
    })
    .parse(input);
  const { error } = await db
    .from('ritm_attachments')
    .update(data)
    .eq('id', z.uuid().parse(id))
    .eq('user_id', user.id);
  fail(error);
  revalidatePath('/');
}
export async function deleteAttachment(id: string) {
  const { db, user } = await context();
  const { data, error } = await db
    .from('ritm_attachments')
    .select('path')
    .eq('id', z.uuid().parse(id))
    .eq('user_id', user.id)
    .single();
  fail(error);
  const { error: storageError } = await db.storage.from('ritm-evidence').remove([data!.path]);
  fail(storageError);
  const { error: deleteError } = await db
    .from('ritm_attachments')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  fail(deleteError);
  revalidatePath('/');
}
export async function signOut() {
  const { db } = await context();
  await db.auth.signOut();
  redirect('/login');
}
