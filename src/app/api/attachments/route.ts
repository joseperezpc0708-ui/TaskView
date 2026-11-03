import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/server';
import { evidenceTypes } from '@/lib/domain';
const schema = z.object({
  stage: z.enum(['prepare', 'finalize']),
  ritm_id: z.uuid(),
  name: z.string().min(1).max(240),
  size: z.number().int().min(1).max(10485760),
  mime_type: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  caption: z.string().max(500),
  evidence_type: z.enum(evidenceTypes),
  path: z.string().optional(),
});
export async function POST(request: Request) {
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return NextResponse.json({ error: 'Origem inválida' }, { status: 403 });
  try {
    const input = schema.parse(await request.json());
    const { data: parent } = await db
      .from('ritms')
      .select('id')
      .eq('id', input.ritm_id)
      .eq('user_id', user.id)
      .single();
    if (!parent) return NextResponse.json({ error: 'RITM não encontrada' }, { status: 404 });
    const bucket = db.storage.from('ritm-evidence');
    if (input.stage === 'prepare') {
      const extension =
        input.mime_type === 'image/png' ? 'png' : input.mime_type === 'image/jpeg' ? 'jpg' : 'webp';
      const path = `${user.id}/${input.ritm_id}/${crypto.randomUUID()}.${extension}`;
      const { data, error } = await bucket.createSignedUploadUrl(path);
      if (error) throw error;
      return NextResponse.json({ path, signedUrl: data.signedUrl });
    }
    const path = input.path;
    const prefix = `${user.id}/${input.ritm_id}/`;
    if (
      !path ||
      !path.startsWith(prefix) ||
      !/^[-a-f0-9]{36}\.(png|jpg|webp)$/.test(path.slice(prefix.length))
    )
      throw new Error('Caminho inválido');
    const { data: existing } = await db
      .from('ritm_attachments')
      .select('id')
      .eq('path', path)
      .maybeSingle();
    if (existing) return NextResponse.json({ ok: true });
    const { data: file, error: downloadError } = await bucket.download(path);
    if (downloadError || !file) throw downloadError;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const png =
      bytes[0] === 137 &&
      bytes[1] === 80 &&
      bytes[2] === 78 &&
      bytes[3] === 71 &&
      bytes[4] === 13 &&
      bytes[5] === 10 &&
      bytes[6] === 26 &&
      bytes[7] === 10;
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp =
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
    const mime = png ? 'image/png' : jpg ? 'image/jpeg' : webp ? 'image/webp' : null;
    if (!mime || mime !== input.mime_type || file.size !== input.size) {
      await bucket.remove([path]);
      return NextResponse.json(
        { error: 'Imagem inválida. Use PNG, JPG ou WebP.' },
        { status: 400 },
      );
    }
    const { error } = await db.from('ritm_attachments').insert({
      user_id: user.id,
      ritm_id: input.ritm_id,
      path,
      name: input.name,
      size: file.size,
      mime_type: mime,
      caption: input.caption,
      evidence_type: input.evidence_type,
      position: Date.now() % 2147483647,
    });
    if (error) {
      await bucket.remove([path]);
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível enviar a imagem. Tente novamente.' },
      { status: 400 },
    );
  }
}
