import { AppNav } from '@/components/AppNav';

// Authenticated pages fetch live data per-request — never statically prerender them.
export const dynamic = 'force-dynamic';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <AppNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
