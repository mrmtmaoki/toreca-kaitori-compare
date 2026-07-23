import Link from "next/link";
import { SERIES_LIST } from "@/lib/series";

export default function GenreNav({ activeSlug }: { activeSlug?: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {SERIES_LIST.map((s) => {
        const active = s.slug === activeSlug;
        return (
          <Link
            key={s.slug}
            href={`/${s.slug}`}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              active
                ? "text-[var(--bg)]"
                : "border border-[var(--line)] bg-[var(--bg-card)] text-[var(--ink)] hover:border-[var(--gold)]/50"
            }`}
            style={active ? { backgroundColor: s.accent } : undefined}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
