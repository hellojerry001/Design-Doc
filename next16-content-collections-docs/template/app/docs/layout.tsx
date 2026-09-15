import Link from "next/link";
import { allDocs } from "content-collections";
import { cn } from "@/lib/utils";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const docs = [...allDocs].sort(
    (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
  );

  return (
    <div className="mx-auto flex max-w-6xl gap-10 px-4 py-10">
      <aside className="hidden w-56 shrink-0 md:block">
        <nav className="sticky top-20 space-y-1 text-sm">
          {docs.map((doc) => (
            <Link
              key={doc._meta.path}
              href={`/docs/${doc._meta.path}`}
              className={cn(
                "block rounded px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              )}
            >
              {doc.title}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 overflow-x-hidden">{children}</div>
    </div>
  );
}
