import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export function InfoPage({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link
        href="/"
        className="mono inline-block text-xs tracking-[0.25em] text-[var(--gold)] uppercase hover:underline"
      >
        ← {SITE_NAME}
      </Link>
      <h1 className="mt-2 mb-2 text-2xl font-black text-[var(--ink)]">{title}</h1>
      {lead && <p className="mb-8 text-sm text-[var(--ink-soft)]">{lead}</p>}
      <div className="flex flex-col gap-6">{children}</div>
    </main>
  );
}

export function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card)] p-5">
      <h2 className="mb-2 text-base font-bold text-[var(--ink)]">{title}</h2>
      <div className="space-y-2.5 text-sm leading-relaxed text-[var(--ink-soft)]">{children}</div>
    </section>
  );
}
