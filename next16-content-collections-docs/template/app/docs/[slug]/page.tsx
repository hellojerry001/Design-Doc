import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allDocs } from "content-collections";
import { MDXContent } from "@content-collections/mdx/react";
import { mdxComponents } from "@/mdx-components";

export function generateStaticParams() {
  return allDocs.map((doc) => ({ slug: doc._meta.path }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = allDocs.find((d) => d._meta.path === slug);
  if (!doc) return {};
  return { title: doc.title, description: doc.description };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = allDocs.find((d) => d._meta.path === slug);
  if (!doc) notFound();

  return (
    <article className="prose prose-neutral max-w-none dark:prose-invert">
      <h1>{doc.title}</h1>
      {doc.description ? (
        <p className="lead !mt-2 text-muted-foreground">{doc.description}</p>
      ) : null}
      <MDXContent code={doc.mdx} components={mdxComponents} />
    </article>
  );
}
