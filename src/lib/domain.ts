import { z } from 'zod';
export const statuses = [
  'Pendente',
  'Em andamento',
  'Aguardando resposta',
  'Concluída',
  'Cancelada',
] as const;
export const priorities = ['Baixa', 'Média', 'Alta', 'Crítica'] as const;
export const categories = [
  'Business Rule',
  'Client Script',
  'UI Policy',
  'Flow Designer',
  'Script Include',
  'Catalog Item',
  'ACL',
  'Integração',
  'Correção de Bug',
  'Melhoria',
  'Outros',
] as const;
export const environments = ['DEV', 'TEST', 'HOMOLOG', 'PROD'] as const;
export const origins = ['Teams', 'ServiceNow', 'E-mail', 'Reunião', 'WhatsApp', 'Outro'] as const;
export const evidenceTypes = [
  'Solicitação original',
  'Registro ServiceNow',
  'Antes da correção',
  'Implementação',
  'Resultado final',
  'Adicional',
] as const;
const text = z.string().max(50000).default('');
const date = z
  .string()
  .refine(
    (v) => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))),
    'Data inválida',
  );
export const ritmSchema = z.object({
  number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^RITM\d{4,15}$/, 'Use RITM seguido de 4 a 15 dígitos'),
  title: z.string().trim().min(3, 'Informe ao menos 3 caracteres').max(240),
  description: text,
  servicenow_url: z
    .string()
    .max(2000)
    .refine(
      (v) =>
        !v ||
        (() => {
          try {
            return new URL(v).protocol === 'https:';
          } catch {
            return false;
          }
        })(),
      'Use uma URL HTTPS',
    ),
  received_at: date,
  due_date: date,
  status: z.enum(statuses),
  priority: z.enum(priorities),
  category: z.enum(categories),
  environment: z.enum(environments),
  origin: z.enum(origins),
  requester: z.string().max(200),
  request_notes: text,
  problem: text,
  solution: text,
  procedure: text,
  code: text,
  technical_notes: text,
  difficulties: text,
  validation: text,
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  favorite: z.boolean().default(false),
  archived: z.boolean().default(false),
});
export type RitmInput = z.infer<typeof ritmSchema>;
export type Ritm = RitmInput & {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  attachment_count?: number;
  checklist_total?: number;
  checklist_done?: number;
};
export type Attachment = {
  id: string;
  ritm_id: string;
  path: string;
  caption: string;
  evidence_type: string;
  position: number;
  name: string;
  url?: string;
};
export type Checklist = { id: string; title: string; completed: boolean; position: number };
export type Activity = { id: string; action: string; created_at: string };
export const defaults: RitmInput = {
  number: '',
  title: '',
  description: '',
  servicenow_url: '',
  received_at: '',
  due_date: '',
  status: 'Pendente',
  priority: 'Média',
  category: 'Outros',
  environment: 'DEV',
  origin: 'ServiceNow',
  requester: '',
  request_notes: '',
  problem: '',
  solution: '',
  procedure: '',
  code: '',
  technical_notes: '',
  difficulties: '',
  validation: '',
  tags: [],
  favorite: false,
  archived: false,
};
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function overdue(r: Ritm) {
  return !!r.due_date && r.due_date < localDate() && !['Concluída', 'Cancelada'].includes(r.status);
}
export function csv(rows: Ritm[]) {
  const cell = (s: string) => '"' + s.replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"';
  return (
    '\uFEFF' +
    [
      ['Número', 'Título', 'Status', 'Prioridade', 'Categoria', 'Ambiente', 'Prazo', 'Conclusão'],
      ...rows.map((r) => [
        r.number,
        r.title,
        r.status,
        r.priority,
        r.category,
        r.environment,
        r.due_date,
        r.completed_at || '',
      ]),
    ]
      .map((row) => row.map(cell).join(';'))
      .join('\r\n')
  );
}
