'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Prism from 'prismjs';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Star,
  Pencil,
  CheckCircle2,
  RotateCcw,
  Archive,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RitmForm } from '@/components/ritm-form';
import { EvidenceGallery } from '@/components/evidence-gallery';
import { Status, Priority } from '@/components/ritm-badges';
import { saveRitm, deleteRitm, checklistChange } from '@/lib/actions';
import type { Ritm, Attachment, Checklist, Activity } from '@/lib/domain';
export function RitmDetail({
  ritm: r,
  attachments,
  checklist,
  logs,
}: {
  ritm: Ritm;
  attachments: Attachment[];
  checklist: Checklist[];
  logs: Activity[];
}) {
  const [tab, setTab] = useState('Visão geral');
  const [edit, setEdit] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const percent = checklist.length
    ? Math.round((checklist.filter((c) => c.completed).length / checklist.length) * 100)
    : 0;
  const run = (fn: () => Promise<unknown>, message?: string) =>
    startTransition(async () => {
      try {
        await fn();
        if (message) toast.success(message);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Não foi possível concluir a ação');
      }
    });
  const text = (label: string, value: string) => (
    <section className="detail-text">
      <h3>{label}</h3>
      <p>{value || 'Ainda não informado.'}</p>
    </section>
  );
  return (
    <main className="detail-page">
      <Link href="/" className="back-link">
        <ArrowLeft size={16} />
        Voltar ao workspace
      </Link>
      <header className="detail-heading">
        <div>
          <div className="detail-number">
            <span className="ritm-number">{r.number}</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Copiar número"
              onClick={() => {
                navigator.clipboard
                  .writeText(r.number)
                  .then(() => toast.success('Número copiado'))
                  .catch(() => toast.error('Não foi possível copiar'));
              }}
            >
              <Copy size={14} />
            </Button>
            <Status value={r.status} />
            {r.archived && <span className="pill">Arquivada</span>}
          </div>
          <h1>{r.title}</h1>
          <p>
            Criada em {new Date(r.created_at).toLocaleString('pt-BR')} · Atualizada em{' '}
            {new Date(r.updated_at).toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="detail-buttons">
          <Button
            variant="outline"
            size="icon"
            aria-label="Alternar favorito"
            disabled={pending}
            onClick={() => run(() => saveRitm({ ...r, favorite: !r.favorite }, r.id))}
          >
            <Star size={17} fill={r.favorite ? 'currentColor' : 'none'} />
          </Button>
          <Button variant="outline" onClick={() => setEdit(true)}>
            <Pencil size={15} />
            Editar
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  saveRitm(
                    { ...r, status: r.status === 'Concluída' ? 'Em andamento' : 'Concluída' },
                    r.id,
                  ),
                'Status atualizado',
              )
            }
          >
            {r.status === 'Concluída' ? <RotateCcw size={16} /> : <CheckCircle2 size={16} />}{' '}
            {r.status === 'Concluída' ? 'Reabrir' : 'Concluir'}
          </Button>
        </div>
      </header>
      <nav className="tabs">
        {['Visão geral', 'Solicitação original', 'Desenvolvimento', 'Evidências', 'Histórico'].map(
          (t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t}
              {t === 'Evidências' && <span className="count">{attachments.length}</span>}
            </button>
          ),
        )}
      </nav>
      <div className="detail-layout">
        <section className="detail-main">
          {tab === 'Visão geral' && (
            <>
              {text('Descrição', r.description)}
              <div className="detail-properties">
                <div>
                  <small>Status</small>
                  <Status value={r.status} />
                </div>
                <div>
                  <small>Prioridade</small>
                  <Priority value={r.priority} />
                </div>
                <div>
                  <small>Categoria</small>
                  <b>{r.category}</b>
                </div>
                <div>
                  <small>Ambiente</small>
                  <b>{r.environment}</b>
                </div>
                <div>
                  <small>Recebimento</small>
                  <b>{r.received_at || 'Não informado'}</b>
                </div>
                <div>
                  <small>Prazo</small>
                  <b>{r.due_date || 'Sem prazo'}</b>
                </div>
                <div>
                  <small>Conclusão</small>
                  <b>
                    {r.completed_at
                      ? new Date(r.completed_at).toLocaleString('pt-BR')
                      : 'Em aberto'}
                  </b>
                </div>
              </div>
              {r.servicenow_url && (
                <Button asChild variant="outline">
                  <a href={r.servicenow_url} target="_blank" rel="noopener noreferrer">
                    Abrir no ServiceNow
                    <ExternalLink size={15} />
                  </a>
                </Button>
              )}
              <div className="tags">
                {r.tags.map((t) => (
                  <span className="pill" key={t}>
                    # {t}
                  </span>
                ))}
              </div>
            </>
          )}
          {tab === 'Solicitação original' && (
            <>
              {text('Origem', r.origin)}
              {text('Solicitante', r.requester)}
              {text('Informações recebidas', r.request_notes)}
              <Button variant="outline" onClick={() => setTab('Evidências')}>
                Ver prints e evidências (
                {attachments.filter((a) => a.evidence_type === 'Solicitação original').length} da
                solicitação)
              </Button>
            </>
          )}
          {tab === 'Desenvolvimento' && (
            <>
              {text('Problema identificado', r.problem)}
              {text('Solução implementada', r.solution)}
              {text('Procedimento utilizado', r.procedure)}
              <section className="detail-text">
                <h3>
                  Código / scripts{' '}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(r.code)
                        .then(() => toast.success('Código copiado'))
                        .catch(() => toast.error('Não foi possível copiar'))
                    }
                  >
                    <Copy size={13} />
                    Copiar
                  </Button>
                </h3>
                {r.code ? (
                  <pre className="code-block">
                    <code
                      dangerouslySetInnerHTML={{
                        __html: Prism.highlight(r.code, Prism.languages.javascript, 'javascript'),
                      }}
                    />
                  </pre>
                ) : (
                  <p>Nenhum script registrado.</p>
                )}
              </section>
              {text('Observações técnicas', r.technical_notes)}
              {text('Dificuldades encontradas', r.difficulties)}
              {text('Validação da solução', r.validation)}
            </>
          )}
          {tab === 'Evidências' && <EvidenceGallery ritmId={r.id} files={attachments} />}
          {tab === 'Histórico' && (
            <>
              <h2>Histórico de alterações</h2>
              {logs.map((log) => (
                <div className="activity-row" key={log.id}>
                  <span className="timeline-dot" />
                  <div>
                    <b>{log.action}</b>
                    <small>{new Date(log.created_at).toLocaleString('pt-BR')}</small>
                  </div>
                </div>
              ))}
            </>
          )}
        </section>
        <aside className="detail-aside">
          <section className="subpanel">
            <h2>
              Checklist{' '}
              <span className="count">
                {checklist.filter((c) => c.completed).length}/{checklist.length}
              </span>
            </h2>
            <div className="progress-label">
              <span>Progresso da RITM</span>
              <b>{percent}%</b>
            </div>
            <progress max={100} value={percent} />
            <div className="checklist">
              {checklist.map((c, index) => (
                <div className="checklist-item" key={c.id}>
                  <input
                    type="checkbox"
                    aria-label={`Concluir ${c.title}`}
                    checked={c.completed}
                    disabled={pending}
                    onChange={(e) =>
                      run(() =>
                        checklistChange(r.id, 'update', { id: c.id, completed: e.target.checked }),
                      )
                    }
                  />
                  <input
                    aria-label="Editar subtarefa"
                    className={c.completed ? 'done' : ''}
                    defaultValue={c.title}
                    maxLength={500}
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value !== c.title)
                        run(() =>
                          checklistChange(r.id, 'update', { id: c.id, title: e.target.value }),
                        );
                    }}
                  />
                  <div>
                    <button
                      aria-label="Mover para cima"
                      disabled={!index || pending}
                      onClick={() =>
                        run(async () => {
                          const reordered = [...checklist];
                          [reordered[index], reordered[index - 1]] = [
                            reordered[index - 1],
                            reordered[index],
                          ];
                          for (let i = 0; i < reordered.length; i++)
                            await checklistChange(r.id, 'update', {
                              id: reordered[i].id,
                              position: i,
                            });
                        })
                      }
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      aria-label="Mover para baixo"
                      disabled={index === checklist.length - 1 || pending}
                      onClick={() =>
                        run(async () => {
                          const reordered = [...checklist];
                          [reordered[index], reordered[index + 1]] = [
                            reordered[index + 1],
                            reordered[index],
                          ];
                          for (let i = 0; i < reordered.length; i++)
                            await checklistChange(r.id, 'update', {
                              id: reordered[i].id,
                              position: i,
                            });
                        })
                      }
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      aria-label="Excluir subtarefa"
                      disabled={pending}
                      onClick={() => {
                        if (confirm('Excluir esta subtarefa?'))
                          run(() => checklistChange(r.id, 'delete', { id: c.id }));
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <form
              className="add-checklist"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newItem.trim()) return;
                run(async () => {
                  await checklistChange(r.id, 'add', {
                    title: newItem,
                    position: checklist.length,
                  });
                  setNewItem('');
                });
              }}
            >
              <input
                aria-label="Nova atividade"
                placeholder="Adicionar atividade..."
                maxLength={500}
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
              />
              <Button
                size="icon"
                variant="outline"
                type="submit"
                disabled={pending || !newItem.trim()}
                aria-label="Adicionar subtarefa"
              >
                <Plus size={16} />
              </Button>
            </form>
          </section>
          <section className="subpanel action-list">
            <h2>Ações</h2>
            <Button variant="ghost" onClick={() => setDuplicate(true)}>
              <Copy size={15} />
              Duplicar RITM
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                run(
                  () => saveRitm({ ...r, archived: !r.archived }, r.id),
                  r.archived ? 'RITM restaurada' : 'RITM arquivada',
                )
              }
            >
              <Archive size={15} />
              {r.archived ? 'Restaurar RITM' : 'Arquivar RITM'}
            </Button>
            <Button
              variant="ghost"
              className="danger"
              disabled={pending}
              onClick={() => {
                if (confirm(`Excluir ${r.number} e todas as evidências permanentemente?`))
                  run(async () => {
                    await deleteRitm(r.id);
                    router.push('/');
                  }, 'RITM excluída');
              }}
            >
              <Trash2 size={15} />
              Excluir RITM
            </Button>
            <small>
              <Save size={13} />
              Alterações de status e checklist são salvas automaticamente. Textos do checklist são
              salvos ao sair do campo.
            </small>
          </section>
        </aside>
      </div>
      {(edit || duplicate) && (
        <RitmForm
          ritm={r}
          duplicate={duplicate}
          onClose={() => {
            setEdit(false);
            setDuplicate(false);
          }}
        />
      )}
    </main>
  );
}
