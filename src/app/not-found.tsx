import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="setup">
      <h1>Registro não encontrado.</h1>
      <Link href="/">Voltar ao workspace →</Link>
    </main>
  );
}
