import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>Aivora</h1>
      <nav>
        <Link href="/users">Users</Link>
      </nav>
    </main>
  );
}
