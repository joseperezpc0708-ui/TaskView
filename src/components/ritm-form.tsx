'use client';
import { useEffect, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  defaults,
  ritmSchema,
  statuses,
  priorities,
  categories,
  environments,
  origins,
  type RitmInput,
  type Ritm,
} from '@/lib/domain';
import { saveRitm } from '@/lib/actions';
export function RitmForm({
  ritm,
  onClose,
  duplicate = false,
}: {
  ritm?: Ritm;
  onClose: () => void;
  duplicate?: boolean;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLElement>(null);
  const [tab, setTab] = useState('Geral');
  const form = useForm<RitmInput>({
    resolver: zodResolver(ritmSchema) as Resolver<RitmInput>,
    defaultValues: ritm
      ? {
          ...ritm,
          ...(duplicate
            ? {
                number: '',
                title: `${ritm.title} (cópia)`,
                status: 'Pendente' as const,
                archived: false,
              }
            : {}),
        }
      : defaults,
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = form;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLInputElement>('input')?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!isDirty || confirm('Descartar as alterações não salvas?')) onClose();
      }
      if (event.key === 'Tab') {
        const elements = Array.from(
          dialog.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]',
          ) || [],
        ).filter((e) => e.offsetParent !== null);
        const first = elements[0];
        const last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [isDirty, onClose]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [isDirty]);
  const close = () => {
    if (!isDirty || confirm('Descartar as alterações não salvas?')) onClose();
  };
  const field = (name: keyof RitmInput, label: string, multi = false, type = 'text') => (
    <label key={name}>
      {label}
      {multi ? (
        <textarea
          rows={name === 'code' ? 12 : 4}
          className={name === 'code' ? 'code-input' : ''}
          {...register(name)}
        />
      ) : (
        <input type={type} {...register(name)} />
      )}
      {errors[name] && <span className="danger">{errors[name]?.message}</span>}
    </label>
  );
  const select = (name: keyof RitmInput, label: string, values: readonly string[]) => (
    <label>
      {label}
      <select {...register(name)}>
        {values.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="modal-backdrop">
      <section
        ref={dialog}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={ritm ? 'Editar RITM' : 'Nova RITM'}
      >
        <header>
          <div>
            <p className="eyebrow">ORGANIZE O PRÓXIMO PASSO</p>
            <h2>{duplicate ? 'Duplicar RITM' : ritm ? 'Editar RITM' : 'Nova RITM'}</h2>
          </div>
          <Button variant="ghost" size="icon" aria-label="Fechar" onClick={close}>
            <X size={20} />
          </Button>
        </header>
        <nav className="tabs">
          {['Geral', 'Solicitação', 'Desenvolvimento'].map((t) => (
            <button
              type="button"
              key={t}
              className={tab === t ? 'active' : ''}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </nav>
        <form
          onSubmit={handleSubmit(
            async (data) => {
              try {
                const id = await saveRitm(data, duplicate ? undefined : ritm?.id);
                toast.success('RITM salva com sucesso');
                onClose();
                router.push(`/ritms/${id}`);
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
              }
            },
            () => {
              setTab('Geral');
              toast.error('Revise os campos indicados.');
            },
          )}
        >
          <div className="form-body">
            {tab === 'Geral' && (
              <>
                <div className="form-grid">
                  {field('number', 'Número da RITM *')}
                  {field('title', 'Título *')}
                </div>
                {field('description', 'Descrição detalhada', true)}
                <div className="form-grid">
                  {select('status', 'Status', statuses)}
                  {select('priority', 'Prioridade', priorities)}
                  {select('category', 'Categoria', categories)}
                  {select('environment', 'Ambiente', environments)}
                  {field('received_at', 'Data de recebimento', false, 'date')}
                  {field('due_date', 'Prazo de entrega', false, 'date')}
                </div>
                {field('servicenow_url', 'Link do ServiceNow (HTTPS)', false, 'url')}
                <label>
                  Tags (separadas por vírgula)
                  <input
                    defaultValue={form.getValues('tags').join(', ')}
                    onChange={(e) =>
                      form.setValue(
                        'tags',
                        [
                          ...new Set(
                            e.target.value
                              .split(',')
                              .map((t) => t.trim())
                              .filter(Boolean),
                          ),
                        ],
                        { shouldDirty: true },
                      )
                    }
                  />
                  {errors.tags && (
                    <span className="danger">Use até 20 tags, com até 40 caracteres.</span>
                  )}
                </label>
              </>
            )}
            {tab === 'Solicitação' && (
              <>
                {select('origin', 'Origem', origins)}
                {field('requester', 'Solicitante')}
                {field('request_notes', 'Observações da solicitação', true)}
                <p className="hint">Salve a RITM para anexar prints na aba Evidências.</p>
              </>
            )}
            {tab === 'Desenvolvimento' && (
              <>
                {field('problem', 'Problema identificado', true)}
                {field('solution', 'Solução implementada', true)}
                {field('procedure', 'Procedimento utilizado', true)}
                {field('code', 'Código / scripts JavaScript', true)}
                {field('technical_notes', 'Observações técnicas', true)}
                {field('difficulties', 'Dificuldades encontradas', true)}
                {field('validation', 'Como a solução foi validada', true)}
              </>
            )}
          </div>
          <footer>
            <span className="hint">
              {isDirty ? 'Alterações ainda não salvas' : 'Os campos com * são obrigatórios'}
            </span>
            <Button type="button" variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save size={16} />
              {isSubmitting ? 'Salvando…' : 'Salvar RITM'}
            </Button>
          </footer>
        </form>
      </section>
    </div>
  );
}
