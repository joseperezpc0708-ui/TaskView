'use client';
/* Private signed images are served directly by Supabase; they are never cached by an image proxy. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  UploadCloud,
  ImagePlus,
  X,
  ZoomIn,
  ZoomOut,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { attachmentChange, deleteAttachment } from '@/lib/actions';
import { evidenceTypes, type Attachment } from '@/lib/domain';
type Preview = { id: string; file: File; url: string; caption: string; type: string };
export function EvidenceGallery({ ritmId, files }: { ritmId: string; files: Attachment[] }) {
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [viewer, setViewer] = useState<Attachment | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const previewRef = useRef(previews);
  useEffect(() => {
    previewRef.current = previews;
  }, [previews]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (previews.length || progress !== null) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [previews.length, progress]);
  useEffect(
    () => () => {
      previewRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    },
    [],
  );
  const add = (incoming: File[]) => {
    const valid = incoming.filter((f) => {
      if (
        !['image/png', 'image/jpeg', 'image/webp'].includes(f.type) ||
        f.size > 10485760 ||
        !f.size
      ) {
        toast.error(`${f.name}: use PNG, JPG ou WebP de até 10 MB.`);
        return false;
      }
      return true;
    });
    setPreviews((p) => [
      ...p,
      ...valid.map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
        caption: '',
        type: 'Adicional',
      })),
    ]);
  };
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 240000);
    return () => clearInterval(timer);
  }, [router]);
  useEffect(() => {
    const listener = (e: ClipboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const images = Array.from(e.clipboardData?.files || []).filter((f) =>
        f.type.startsWith('image/'),
      );
      if (images.length) {
        e.preventDefault();
        add(images);
      }
    };
    window.addEventListener('paste', listener);
    return () => window.removeEventListener('paste', listener);
  }, []);
  useEffect(() => {
    if (!viewer) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewer(null);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [viewer]);
  const removePreview = (id: string) =>
    setPreviews((p) => {
      const removed = p.find((x) => x.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return p.filter((x) => x.id !== id);
    });
  const upload = async () => {
    const queue = [...previews];
    setProgress(0);
    let done = 0;
    try {
      for (const p of queue) {
        const metadata = {
          ritm_id: ritmId,
          name: p.file.name.slice(0, 240),
          size: p.file.size,
          mime_type: p.file.type,
          caption: p.caption,
          evidence_type: p.type,
        };
        const prepare = await fetch('/api/attachments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...metadata, stage: 'prepare' }),
        });
        const signed = await prepare.json();
        if (!prepare.ok) throw new Error(signed.error);
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', signed.signedUrl);
          xhr.setRequestHeader('Content-Type', p.file.type);
          xhr.setRequestHeader('x-upsert', 'false');
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable)
              setProgress(Math.round(((done + e.loaded / e.total) / queue.length) * 100));
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error('Falha no upload para o Storage.'));
          };
          xhr.onerror = () => reject(new Error('Conexão interrompida. Tente novamente.'));
          xhr.send(p.file);
        });
        const finalize = await fetch('/api/attachments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...metadata, path: signed.path, stage: 'finalize' }),
        });
        if (!finalize.ok) throw new Error((await finalize.json()).error);
        done++;
        removePreview(p.id);
      }
      toast.success(`${done} imagem(ns) enviada(s)`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro no upload');
      router.refresh();
    } finally {
      setProgress(null);
    }
  };
  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Não foi possível salvar');
      }
    });
  const reorder = (index: number, delta: number) =>
    run(async () => {
      const reordered = [...files];
      [reordered[index], reordered[index + delta]] = [reordered[index + delta], reordered[index]];
      for (let i = 0; i < reordered.length; i++)
        await attachmentChange(reordered[i].id, { position: i });
    });
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>
            Evidências <span className="count">{files.length}</span>
          </h2>
          <p>Da solicitação ao resultado: mantenha cada detalhe documentado.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.refresh()}>
          <RefreshCw size={14} />
          Atualizar links
        </Button>
      </div>
      <div
        className="dropzone"
        tabIndex={0}
        role="button"
        aria-label="Adicionar imagens"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') input.current?.click();
        }}
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (progress === null) add(Array.from(e.dataTransfer.files));
        }}
      >
        <UploadCloud size={32} />
        <h3>Arraste suas imagens para cá</h3>
        <p>ou clique para selecionar · Cole screenshots com Ctrl+V</p>
        <small>PNG, JPG ou WebP · Até 10 MB por imagem · Acesso privado</small>
        <input
          ref={input}
          hidden
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          disabled={progress !== null}
          onChange={(e) => {
            add(Array.from(e.target.files || []));
            e.target.value = '';
          }}
        />
      </div>
      {!!previews.length && (
        <div className="preview-panel">
          <h3>Pré-visualização · {previews.length} imagens</h3>
          <div className="gallery-grid">
            {previews.map((p) => (
              <div className="evidence-card" key={p.id}>
                <img src={p.url} alt={p.file.name} />
                <label>
                  Legenda
                  <input
                    disabled={progress !== null}
                    value={p.caption}
                    maxLength={500}
                    onChange={(e) =>
                      setPreviews((items) =>
                        items.map((x) => (x.id === p.id ? { ...x, caption: e.target.value } : x)),
                      )
                    }
                  />
                </label>
                <select
                  aria-label="Tipo de evidência"
                  disabled={progress !== null}
                  value={p.type}
                  onChange={(e) =>
                    setPreviews((items) =>
                      items.map((x) => (x.id === p.id ? { ...x, type: e.target.value } : x)),
                    )
                  }
                >
                  {evidenceTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <Button
                  disabled={progress !== null}
                  size="sm"
                  variant="ghost"
                  onClick={() => removePreview(p.id)}
                >
                  <X size={14} />
                  Remover
                </Button>
              </div>
            ))}
          </div>
          <Button disabled={progress !== null} onClick={upload}>
            <ImagePlus size={16} />
            {progress !== null ? `Enviando… ${progress}%` : 'Enviar imagens'}
          </Button>
          {progress !== null && (
            <progress max={100} value={progress} aria-label="Progresso do upload" />
          )}
        </div>
      )}
      <div className="gallery-grid">
        {files.map((file, index) => (
          <article key={file.id} className="evidence-card">
            <button
              className="image-preview"
              onClick={() => {
                setViewer(file);
                setZoom(1);
              }}
            >
              <img
                src={file.url}
                alt={file.caption || file.name}
                onError={(e) => {
                  e.currentTarget.alt = 'Link expirado. Clique em Atualizar links.';
                }}
              />
              <span>
                <ZoomIn size={18} />
                Ampliar
              </span>
            </button>
            <p className="file-name">{file.name}</p>
            <label>
              Legenda
              <input
                maxLength={500}
                defaultValue={file.caption}
                onBlur={(e) => {
                  if (e.target.value !== file.caption)
                    run(() => attachmentChange(file.id, { caption: e.target.value }));
                }}
              />
            </label>
            <select
              aria-label={`Tipo de ${file.name}`}
              value={file.evidence_type}
              disabled={pending}
              onChange={(e) =>
                run(() => attachmentChange(file.id, { evidence_type: e.target.value }))
              }
            >
              {evidenceTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <div className="evidence-actions">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Mover para cima"
                disabled={!index || pending}
                onClick={() => reorder(index, -1)}
              >
                <ArrowUp size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Mover para baixo"
                disabled={index === files.length - 1 || pending}
                onClick={() => reorder(index, 1)}
              >
                <ArrowDown size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Excluir imagem"
                disabled={pending}
                onClick={() => {
                  if (confirm('Excluir esta imagem permanentemente?'))
                    run(() => deleteAttachment(file.id));
                }}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!files.length && !previews.length && (
        <p className="panel-empty">Nenhuma evidência anexada. Comece pelo print da solicitação.</p>
      )}
      {viewer && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Visualizar evidência">
          <div className="lightbox-toolbar">
            <span>{viewer.caption || viewer.name}</span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Diminuir zoom"
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
            >
              <ZoomOut size={18} />
            </Button>
            <span>{Math.round(zoom * 100)}%</span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Aumentar zoom"
              onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
            >
              <ZoomIn size={18} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Fechar visualização"
              onClick={() => setViewer(null)}
            >
              <X size={18} />
            </Button>
          </div>
          <div className="lightbox-image">
            <img
              src={viewer.url}
              alt={viewer.caption || viewer.name}
              style={{ width: `${zoom * 80}%`, maxWidth: 'none' }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
