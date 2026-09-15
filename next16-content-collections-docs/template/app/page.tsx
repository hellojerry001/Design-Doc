import Link from "next/link";
import { Demo } from "@/registry/examples/bento-showcase";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          A large collection of high-quality React components
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          you can copy and paste into any project.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/docs"
            className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Get Started
          </Link>
          <Link
            href="/docs/components"
            className="rounded-md border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Components
          </Link>
        </div>
      </section>

      {/* Bento 展示墙 */}
      <section className="mt-14 sm:mt-20">
        <Demo />
      </section>
    </main>
  );
}
