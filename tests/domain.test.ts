import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, ritmSchema, csv, overdue, localDate, type Ritm } from '../src/lib/domain';
const valid = { ...defaults, number: 'RITM0012345', title: 'Corrigir ACL de catálogo' };
test('valida número, título, enumerações e URL segura', () => {
  assert.equal(ritmSchema.parse(valid).number, 'RITM0012345');
  for (const data of [
    { ...valid, number: '123' },
    { ...valid, title: '' },
    { ...valid, status: 'inválido' },
    { ...valid, servicenow_url: 'javascript:alert(1)' },
    { ...valid, servicenow_url: 'http://example.com' },
    { ...valid, tags: Array(21).fill('x') },
  ])
    assert.equal(ritmSchema.safeParse(data).success, false);
});
test('CSV escapa aspas, separadores e fórmulas', () => {
  const output = csv([{ ...valid, title: '=HYPERLINK("teste");foo', completed_at: null } as Ritm]);
  assert.ok(output.startsWith('\uFEFF'));
  assert.ok(output.includes('"\'=HYPERLINK(""teste"");foo"'));
});
test('atraso exclui concluídas e canceladas, e aceita prazo de hoje', () => {
  const row = { ...valid, due_date: '2000-01-01' } as Ritm;
  assert.equal(overdue(row), true);
  assert.equal(overdue({ ...row, status: 'Concluída' }), false);
  assert.equal(overdue({ ...row, status: 'Cancelada' }), false);
  assert.equal(overdue({ ...row, due_date: localDate() }), false);
});
