'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldCheck } from 'lucide-react';
export function LoginForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  return (
    <main className="login-layout">
      <section className="login-story">
        <div className="brand">
          <span className="brand-mark">R</span> RITM Tracker
        </div>
        <div>
          <p className="eyebrow">MENOS RUÍDO. MAIS FLUXO.</p>
          <h1>
            O seu trabalho.
            <br />
            Cada detalhe.
            <br />
            <em>Sob controle.</em>
          </h1>
          <p>
            Da primeira solicitação à última evidência.
            <br />
            Um lugar para conectar tudo.
          </p>
        </div>
        <small>Seu espaço pessoal de desenvolvimento ServiceNow.</small>
      </section>
      <section className="login-panel">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            const form = new FormData(e.currentTarget);
            try {
              const { error } = await browserSupabase().auth.signInWithPassword({
                email: String(form.get('email')),
                password: String(form.get('password')),
              });
              if (error) setError('E-mail ou senha inválidos. Tente novamente.');
              else {
                router.replace('/');
                router.refresh();
              }
            } catch {
              setError('Não foi possível conectar. Tente novamente.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <span className="pill">
            <ShieldCheck size={14} /> Workspace privado
          </span>
          <h2>Bom ter você de volta.</h2>
          <p>Entre para continuar de onde parou.</p>
          <label>
            E-mail
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="voce@exemplo.com"
            />
          </label>
          <label>
            Senha
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Sua senha"
            />
          </label>
          {error && (
            <p role="alert" className="danger">
              {error}
            </p>
          )}
          <Button disabled={busy} type="submit">
            {busy ? 'Entrando…' : 'Entrar no workspace'}
            <ArrowRight size={16} />
          </Button>
          <small>Acesso exclusivo. O usuário é criado pelo administrador no Supabase.</small>
        </form>
      </section>
    </main>
  );
}
