"use client";

import * as React from "react";
import { Check, Copy, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

function V0Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 1.7 15.3 14.3H0.7L8 1.7Zm-.8 4.7v7.9h1.6V6.4H7.2Z"
      />
    </svg>
  );
}

type ComponentPreviewTabsProps = {
  preview: React.ReactNode | null;
  codeHtml?: string;
  code?: string;
  name?: string;
  openInV0?: boolean;
  v0Url?: string;
  previewClassName?: string;
  className?: string;
};

export function ComponentPreviewTabs({
  preview,
  codeHtml,
  code,
  name,
  openInV0 = true,
  v0Url,
  previewClassName,
  className,
}: ComponentPreviewTabsProps) {
  const hasPreview = preview != null;
  const hasCode = Boolean(codeHtml);
  const [tab, setTab] = React.useState<"preview" | "code">(
    hasPreview ? "preview" : "code",
  );
  const [nonce, setNonce] = React.useState(0);
  const [copied, setCopied] = React.useState(false);

  const active = !hasPreview ? "code" : tab;

  const href =
    v0Url ??
    (code
      ? `https://v0.dev/chat?q=${encodeURIComponent(
          `Render this React component. Use Tailwind CSS and shadcn/ui conventions.\n\n\`\`\`tsx\n${code}\n\`\`\``,
        )}`
      : undefined);

  const onCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard 不可用时静默失败 */
    }
  };

  return (
    <div
      data-slot="component-preview"
      data-name={name}
      className={cn("not-prose my-6", className)}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-0.5 rounded-lg border bg-muted/60 p-0.5">
          {hasPreview ? (
            <button
              type="button"
              onClick={() => setTab("preview")}
              aria-pressed={active === "preview"}
              className={cn(
                "rounded-md px-3 py-1 text-sm transition-colors",
                active === "preview"
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Preview
            </button>
          ) : null}
          {hasCode ? (
            <button
              type="button"
              onClick={() => setTab("code")}
              aria-pressed={active === "code"}
              className={cn(
                "rounded-md px-3 py-1 text-sm transition-colors",
                active === "code"
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Code
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {openInV0 && href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90"
            >
              Open in
              <V0Mark className="h-3.5 w-3.5" />
            </a>
          ) : null}
          {hasPreview ? (
            <button
              type="button"
              onClick={() => setNonce((n) => n + 1)}
              aria-label="重新播放预览"
              title="重新播放预览"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {hasPreview ? (
        <div
          key={nonce}
          hidden={active !== "preview"}
          className={cn(
            "min-h-[350px] items-center justify-center overflow-hidden rounded-xl border bg-background p-10",
            active === "preview" ? "flex" : "hidden",
            previewClassName,
          )}
        >
          {preview}
        </div>
      ) : null}

      {hasCode ? (
        <div
          hidden={active !== "code"}
          className={cn(
            "relative overflow-hidden rounded-xl border bg-background",
            active === "code" ? "block" : "hidden",
          )}
        >
          <button
            type="button"
            onClick={onCopy}
            aria-label="复制代码"
            title="复制代码"
            className="absolute top-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          {codeHtml ? (
            <div
              className="preview-code text-sm"
              dangerouslySetInnerHTML={{ __html: codeHtml }}
            />
          ) : (
            <p className="p-5 text-sm text-muted-foreground">未找到示例源码。</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
