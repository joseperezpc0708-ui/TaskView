import { redirect } from 'next/navigation';
import { configured, supabase } from '@/lib/supabase/server';
import { LoginForm } from '@/components/login-form';
import Link from 'next/link';
export const dynamic = 'force-dynamic';
export default async function Login() {
  if (!configured())
    return (
      <main className="setup">
        <h1>Configure seu workspace</h1>
        <p>As variáveis do Supabase ainda não foram definidas.</p>
        <Link href="/">Ver instruções de configuração →</Link>
      </main>
    );
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (user) redirect('/');
  return <LoginForm />;
}
