"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function SiteHeader() {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Spell Style
        </Link>
        <nav className="flex items-center gap-5">
          <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
            Docs
          </Link>
          <Link
            href="https://github.com"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            GitHub
          </Link>
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded-md p-1.5 hover:bg-muted"
          >
            <Sun className="hidden h-4 w-4 dark:block" />
            <Moon className="block h-4 w-4 dark:hidden" />
          </button>
        </nav>
      </div>
    </header>
  );
}
