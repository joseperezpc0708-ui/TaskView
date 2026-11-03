'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  ListTodo,
  BookOpen,
  Star,
  Archive,
  Plus,
  Search,
  SlidersHorizontal,
  Table2,
  Columns3,
  LayoutGrid,
  ArrowUpRight,
  ArrowDownToLine,
  CheckCircle2,
  Clock3,
  Circle,
  Activity as ActivityIcon,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  Menu,
  Paperclip,
  AlertCircle,
  Command,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RitmForm } from '@/components/ritm-form';
import {
  statuses,
  priorities,
  categories,
  environments,
  origins,
  overdue,
  localDate,
  csv,
  type Ritm,
  type Activity,
} from '@/lib/domain';
import { saveRitm, signOut } from '@/lib/actions';
import { Status, Priority } from '@/components/ritm-badges';
const sections = [
  ['dashboard', 'Visão geral', LayoutDashboard],
  ['tasks', 'Minhas RITMs', ListTodo],
  ['solutions', 'Soluções', BookOpen],
  ['favorites', 'Favoritos', Star],
  ['archive', 'Arquivadas', Archive],
] as const;
export function Workspace({
  rows,
  activity,
  email,
  initialQuery,
}: {
  rows: Ritm[];
  activity: Activity[];
  email: string;
  initialQuery: string;
}) {
  const [section, setSection] = useState('dashboard');
  const [view, setView] = useState('table');
  const [create, setCreate] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [filters, setFilters] = useState(() => {
    const p = new URLSearchParams(initialQuery);
    return {
      q: p.get('q') || '',
      status: p.get('status') || '',
      priority: p.get('priority') || '',
      category: p.get('category') || '',
      environment: p.get('environment') || '',
      origin: p.get('origin') || '',
      from: p.get('from') || '',
      to: p.get('to') || '',
      sort: p.get('sort') || 'updated_at',
      direction: p.get('direction') || 'desc',
    };
  });
  const update = (key: keyof typeof filters, value: string) => {
    const next = {
      ...filters,
      [key]: value,
      ...(key === 'sort' ? { direction: filters.direction === 'desc' ? 'asc' : 'desc' } : {}),
    };
    setFilters(next);
    const p = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    window.history.replaceState(null, '', `/?${p}`);
  };
  const active = rows.filter((r) => !r.archived);
  const scope = rows.filter(
    (r) =>
      (section === 'archive' ? r.archived : !r.archived) &&
      (section !== 'solutions' || r.status === 'Concluída') &&
      (section !== 'favorites' || r.favorite),
  );
  const filtered = scope
    .filter(
      (r) =>
        (!filters.q ||
          [r.number, r.title, r.description, r.category, r.problem, r.solution, ...r.tags]
            .join(' ')
            .toLocaleLowerCase('pt-BR')
            .includes(filters.q.toLocaleLowerCase('pt-BR'))) &&
        (!filters.status || r.status === filters.status) &&
        (!filters.priority || r.priority === filters.priority) &&
        (!filters.category || r.category === filters.category) &&
        (!filters.environment || r.environment === filters.environment) &&
        (!filters.origin || r.origin === filters.origin) &&
        (!filters.from || r.created_at.slice(0, 10) >= filters.from) &&
        (!filters.to || r.created_at.slice(0, 10) <= filters.to),
    )
    .sort((a, b) => {
      const key = filters.sort as keyof Ritm;
      const av = key === 'priority' ? priorities.indexOf(a.priority) : String(a[key] || '');
      const bv = key === 'priority' ? priorities.indexOf(b.priority) : String(b[key] || '');
      const result =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'pt-BR');
      return filters.direction === 'desc' ? -result : result;
    });
  const week = new Date();
  week.setHours(0, 0, 0, 0);
  week.setDate(week.getDate() - ((week.getDay() + 6) % 7));
  const stats = [
    { label: 'Total de RITMs', value: active.length, icon: ListTodo, color: 'violet' },
    {
      label: 'Em andamento',
      value: active.filter((r) => r.status === 'Em andamento').length,
      icon: ActivityIcon,
      color: 'blue',
    },
    {
      label: 'Aguardando resposta',
      value: active.filter((r) => r.status === 'Aguardando resposta').length,
      icon: Clock3,
      color: 'amber',
    },
    {
      label: 'Concluídas',
      value: active.filter((r) => r.status === 'Concluída').length,
      icon: CheckCircle2,
      color: 'green',
    },
  ];
  const changeStatus = (id: string, status: string) =>
    startTransition(async () => {
      const row = rows.find((r) => r.id === id);
      if (!row) return;
      try {
        await saveRitm({ ...row, status }, id);
        toast.success('Status atualizado');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao atualizar');
      }
    });
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([csv(filtered)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ritms-${localDate()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const title = sections.find((s) => s[0] === section)?.[1] || '';
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <Link href="/" className="brand">
          <span className="brand-mark">R</span>
          <span>
            RITM <b>Tracker</b>
            <small>PERSONAL WORKSPACE</small>
          </span>
        </Link>
        <div className="workspace-label">
          <span className="avatar">{email.slice(0, 2).toUpperCase()}</span>
          <div>
            Meu workspace<small>ServiceNow Development</small>
          </div>
          <span className="online" />
        </div>
        <p className="nav-caption">WORKSPACE</p>
        <nav>
          {sections.map(([id, label, Icon]) => (
            <button
              key={id}
              className={section === id ? 'selected' : ''}
              onClick={() => {
                setSection(id);
                setMobile(false);
              }}
            >
              <Icon size={18} />
              {label}
              {id === 'tasks' && <span className="nav-count">{active.length}</span>}
              {section === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="mini-icon">
            <Command size={17} />
          </span>
          <b>Conhecimento que fica.</b>
          <p>Cada solução registrada é um próximo problema resolvido.</p>
          <button onClick={() => setSection('solutions')}>
            Explorar soluções <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
            <Sun size={17} />
            <span>Alternar aparência</span>
            <Moon size={14} />
          </button>
          <form action={signOut}>
            <button type="submit">
              <LogOut size={17} />
              Sair da conta
            </button>
          </form>
          <div className="profile">
            <span className="avatar">{email.slice(0, 2).toUpperCase()}</span>
            <div>
              Meu perfil<small title={email}>{email}</small>
            </div>
            <span className="online" />
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu"
              onClick={() => setMobile(!mobile)}
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{title}</strong>
          </div>
          <span className="private-label">
            <span className="online" />
            Workspace pessoal
          </span>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {section === 'dashboard' ? 'SEU TRABALHO, EM FLUXO' : 'CADA DETALHE NO SEU LUGAR'}
              </p>
              <h1>
                {title}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {section === 'dashboard'
                  ? 'Tudo o que você precisa para transformar solicitações em soluções.'
                  : section === 'solutions'
                    ? 'Seu conhecimento organizado. Pronto para o próximo desafio.'
                    : 'Organize, acompanhe e dê o próximo passo nas suas solicitações.'}
              </p>
            </div>
            <Button onClick={() => setCreate(true)}>
              <Plus size={17} />
              Nova RITM
            </Button>
          </div>
          {section === 'dashboard' && (
            <>
              <div className="stats-grid">
                {stats.map(({ label, value, icon: Icon, color }) => (
                  <div className="stat-card" key={label}>
                    <div>
                      <span>{label}</span>
                      <span className={`stat-icon ${color}`}>
                        <Icon size={18} />
                      </span>
                    </div>
                    <strong>
                      {value}
                      <small>RITMs</small>
                    </strong>
                    <div className="stat-footer">
                      {label === 'Total de RITMs'
                        ? `${active.filter((r) => r.status === 'Pendente').length} pendentes`
                        : label === 'Concluídas'
                          ? `${active.filter((r) => r.completed_at && new Date(r.completed_at) >= week).length} concluídas nesta semana`
                          : label === 'Em andamento'
                            ? 'Seu foco no momento'
                            : 'Aguardando o próximo passo'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="overview-strip">
                <span>
                  <Circle size={14} /> <b>{active.filter((r) => r.status === 'Pendente').length}</b>{' '}
                  pendentes
                </span>
                <span className="danger">
                  <AlertCircle size={14} />
                  <b>{active.filter(overdue).length}</b> atrasadas
                </span>
                <span>
                  <CheckCircle2 size={14} />
                  <b>
                    {
                      active.filter((r) => r.completed_at && new Date(r.completed_at) >= week)
                        .length
                    }
                  </b>{' '}
                  concluídas na semana
                </span>
                <span className="strip-note">Um passo de cada vez. Você está no controle.</span>
              </div>
            </>
          )}
          <section className="tasks-panel">
            <div className="section-heading">
              <div>
                <h2>
                  {section === 'dashboard' ? 'Suas RITMs' : title}
                  <span className="count">{filtered.length}</span>
                </h2>
                <p>
                  {section === 'dashboard'
                    ? 'Acompanhe cada etapa do seu trabalho.'
                    : 'Encontre exatamente o que você precisa.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <ArrowDownToLine size={14} />
                Exportar CSV
              </Button>
            </div>
            <div className="toolbar">
              <div className="search-box">
                <Search size={17} />
                <input
                  aria-label="Buscar RITMs"
                  placeholder="Buscar por número, título, tag ou solução..."
                  value={filters.q}
                  onChange={(e) => update('q', e.target.value)}
                />
                <kbd>⌕</kbd>
              </div>
              <Button variant="outline" size="sm" onClick={() => setFiltersOpen(!filtersOpen)}>
                <SlidersHorizontal size={15} />
                Filtros
                {Object.entries(filters).filter(
                  ([k, v]) => v && !['q', 'sort', 'direction'].includes(k),
                ).length > 0 && <span className="nav-dot" />}
              </Button>
              <div className="view-switch">
                {[
                  ['table', Table2, 'Tabela'],
                  ['kanban', Columns3, 'Kanban'],
                  ['cards', LayoutGrid, 'Cards'],
                ].map(([id, Icon, label]) => {
                  const I = Icon as typeof Table2;
                  return (
                    <button
                      key={String(id)}
                      aria-label={String(label)}
                      title={String(label)}
                      className={view === id ? 'active' : ''}
                      onClick={() => setView(String(id))}
                    >
                      <I size={16} />
                    </button>
                  );
                })}
              </div>
            </div>
            {filtersOpen && (
              <div className="filters">
                {(
                  [
                    ['status', 'Status', statuses],
                    ['priority', 'Prioridade', priorities],
                    ['category', 'Categoria', categories],
                    ['environment', 'Ambiente', environments],
                    ['origin', 'Origem', origins],
                  ] as const
                ).map(([key, label, values]) => (
                  <label key={key}>
                    {label}
                    <select value={filters[key]} onChange={(e) => update(key, e.target.value)}>
                      <option value="">Todos</option>
                      {values.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                ))}
                <label>
                  Criada de
                  <input
                    type="date"
                    value={filters.from}
                    onChange={(e) => update('from', e.target.value)}
                  />
                </label>
                <label>
                  Até
                  <input
                    type="date"
                    value={filters.to}
                    onChange={(e) => update('to', e.target.value)}
                  />
                </label>
              </div>
            )}
            <div className="list-meta">
              <span>
                {filtered.length} {filtered.length === 1 ? 'solicitação' : 'solicitações'}
                {pending ? ' · Atualizando…' : ''}
              </span>
              <label>
                Ordenar por{' '}
                <select
                  aria-label="Ordenação"
                  value={filters.sort}
                  onChange={(e) => update('sort', e.target.value)}
                >
                  <option value="updated_at">Última atualização</option>
                  <option value="created_at">Data de criação</option>
                  <option value="priority">Prioridade</option>
                  <option value="due_date">Prazo</option>
                </select>
              </label>
            </div>
            {!filtered.length ? (
              <div className="empty-state">
                <div>
                  <ListTodo size={28} />
                </div>
                <h3>
                  {scope.length ? 'Nenhuma RITM encontrada' : 'Um novo espaço para suas ideias.'}
                </h3>
                <p>
                  {scope.length
                    ? 'Ajuste a busca ou os filtros para encontrar sua solicitação.'
                    : 'Cadastre sua primeira RITM e acompanhe cada etapa até a solução.'}
                </p>
                <Button variant="outline" onClick={() => setCreate(true)}>
                  <Plus size={16} />
                  Criar uma RITM
                </Button>
              </div>
            ) : view === 'table' ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {[
                        ['number', 'RITM'],
                        ['title', 'Título'],
                        ['priority', 'Prioridade'],
                        ['status', 'Status'],
                        ['category', 'Categoria'],
                        ['due_date', 'Prazo'],
                        ['completed_at', 'Conclusão'],
                      ].map(([key, label]) => (
                        <th key={key}>
                          <button
                            onClick={() => {
                              update('sort', key);
                            }}
                          >
                            {label} ↕
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link className="ritm-number" href={`/ritms/${r.id}`}>
                            {r.number}
                          </Link>
                        </td>
                        <td>
                          <Link className="ritm-title" href={`/ritms/${r.id}`}>
                            {r.favorite && <Star size={12} className="favorite" />}
                            {r.title}
                          </Link>
                          <span className="row-sub">
                            {r.environment}
                            {r.attachment_count ? ` · ${r.attachment_count} evidências` : ''}
                          </span>
                        </td>
                        <td>
                          <Priority value={r.priority} />
                        </td>
                        <td>
                          <Status value={r.status} />
                        </td>
                        <td>
                          <span className="category">{r.category}</span>
                        </td>
                        <td className={overdue(r) ? 'danger' : ''}>
                          {r.due_date
                            ? new Date(`${r.due_date}T12:00:00`).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                              })
                            : '—'}
                        </td>
                        <td>
                          {r.completed_at
                            ? new Date(r.completed_at).toLocaleDateString('pt-BR')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : view === 'cards' ? (
              <div className="cards-grid">
                {filtered.map((r) => (
                  <RitmCard key={r.id} r={r} />
                ))}
              </div>
            ) : (
              <div className="kanban">
                {statuses.map((status) => (
                  <div
                    className="kanban-column"
                    key={status}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      changeStatus(e.dataTransfer.getData('text/plain'), status);
                    }}
                  >
                    <h3>
                      <Status value={status} />
                      <span>{filtered.filter((r) => r.status === status).length}</span>
                    </h3>
                    {filtered
                      .filter((r) => r.status === status)
                      .map((r) => (
                        <div
                          key={r.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', r.id)}
                        >
                          <RitmCard r={r} />
                          <select
                            aria-label={`Status de ${r.number}`}
                            value={r.status}
                            disabled={pending}
                            onChange={(e) => changeStatus(r.id, e.target.value)}
                          >
                            {statuses.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            )}
            <div className="panel-footer">
              <span>
                <span className="online" /> Dados do seu workspace
              </span>
              <span>Feito para manter seu foco.</span>
            </div>
          </section>
          {section === 'dashboard' && (
            <div className="bottom-grid">
              <section className="subpanel">
                <h2>
                  <span className="mini-icon amber">
                    <Clock3 size={17} />
                  </span>
                  Próximas prioridades
                </h2>
                {active
                  .filter((r) => !['Concluída', 'Cancelada'].includes(r.status))
                  .sort(
                    (a, b) =>
                      priorities.indexOf(b.priority) - priorities.indexOf(a.priority) ||
                      String(a.due_date || '9999').localeCompare(b.due_date || '9999'),
                  )
                  .slice(0, 4)
                  .map((r) => (
                    <Link className="priority-row" href={`/ritms/${r.id}`} key={r.id}>
                      <Circle size={16} />
                      <div>
                        <b>{r.title}</b>
                        <small>
                          {r.number} · {r.due_date || 'Sem prazo definido'}
                        </small>
                      </div>
                      <Priority value={r.priority} />
                    </Link>
                  ))}
                {!active.some((r) => !['Concluída', 'Cancelada'].includes(r.status)) && (
                  <p className="panel-empty">
                    Tudo em dia. Suas próximas prioridades aparecerão aqui.
                  </p>
                )}
              </section>
              <section className="subpanel">
                <h2>
                  <span className="mini-icon violet">
                    <ActivityIcon size={17} />
                  </span>
                  Atividade recente
                </h2>
                {activity.slice(0, 5).map((a) => (
                  <div className="activity-row" key={a.id}>
                    <span className="timeline-dot" />
                    <div>
                      <b>{a.action}</b>
                      <small>{new Date(a.created_at).toLocaleString('pt-BR')}</small>
                    </div>
                  </div>
                ))}
                {!activity.length && (
                  <p className="panel-empty">Sua jornada começa com a primeira RITM.</p>
                )}
              </section>
            </div>
          )}
          <footer className="page-footer">
            RITM Tracker <span>Seu trabalho organizado. Seu conhecimento preservado.</span>
            <small>PERSONAL WORKSPACE</small>
          </footer>
        </div>
      </main>
      {create && <RitmForm onClose={() => setCreate(false)} />}
    </div>
  );
}
function RitmCard({ r }: { r: Ritm }) {
  return (
    <Link href={`/ritms/${r.id}`} className="ritm-card">
      <div>
        <span className="ritm-number">{r.number}</span>
        <Priority value={r.priority} />
      </div>
      <h3>{r.title}</h3>
      <p>{r.description.slice(0, 110) || 'Sem descrição adicional.'}</p>
      <Status value={r.status} />
      <div className="card-bottom">
        <span>{r.category}</span>
        <span>
          <Paperclip size={12} />
          {r.attachment_count || 0}
        </span>
      </div>
    </Link>
  );
}
