import type { MDXComponents } from "mdx/types";
import { cn } from "@/lib/utils";
import { ComponentPreview } from "@/components/component-preview";
import { Demo as BentoShowcase } from "@/registry/examples/bento-showcase";

export const mdxComponents: MDXComponents = {
  ComponentPreview,
  BentoShowcase,
  h1: ({ className, ...props }) => (
    <h1
      className={cn("mt-2 scroll-m-20 text-3xl font-bold tracking-tight", className)}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        "mt-10 scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight first:mt-0",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn("mt-8 scroll-m-20 text-xl font-semibold tracking-tight", className)}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4 className={cn("mt-6 text-lg font-semibold tracking-tight", className)} {...props} />
  ),
  p: ({ className, ...props }) => (
    <p className={cn("leading-7 not-first:mt-6", className)} {...props} />
  ),
  a: ({ className, ...props }) => (
    <a
      className={cn("font-medium text-foreground underline underline-offset-4", className)}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn("my-6 ml-6 list-disc [&>li]:mt-2", className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={cn("my-6 ml-6 list-decimal [&>li]:mt-2", className)} {...props} />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote className={cn("mt-6 border-l-2 pl-6 italic text-muted-foreground", className)} {...props} />
  ),
  table: ({ className, ...props }) => (
    <div className="my-6 w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn("border px-4 py-2 text-left font-semibold", className)}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td className={cn("border px-4 py-2", className)} {...props} />
  ),
};

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...mdxComponents, ...components };
}
