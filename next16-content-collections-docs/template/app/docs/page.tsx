import Link from "next/link";
import { allDocs } from "content-collections";

export default function DocsIndex() {
  const docs = [...allDocs].sort(
    (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
  );

  return (
    <article className="prose prose-neutral max-w-none dark:prose-invert">
      <h1>Documentation</h1>
      <p className="lead text-muted-foreground">
        Everything you need to install and start using the components.
      </p>
      <ul>
        {docs.map((doc) => (
          <li key={doc._meta.path}>
            <Link href={`/docs/${doc._meta.path}`}>{doc.title}</Link>
            {doc.description ? <> — {doc.description}</> : null}
          </li>
        ))}
      </ul>
    </article>
  );
}
