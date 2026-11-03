'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="setup">
      <h1>Não foi possível carregar o workspace.</h1>
      <p>Verifique sua conexão e a configuração do Supabase.</p>
      <Button onClick={reset}>Tentar novamente</Button>
    </main>
  );
}
