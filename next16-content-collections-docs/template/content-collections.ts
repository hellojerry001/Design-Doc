import { defineCollection, defineConfig } from "@content-collections/core";
import { z } from "zod";
import { compileMDX } from "@content-collections/mdx";
import codeImport from "remark-code-import";
import rehypeShiki from "@shikijs/rehype";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

export const docs = defineCollection({
  name: "docs",
  directory: "content/docs",
  include: "**/*.mdx",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number().optional(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [[codeImport, { cache: false }], remarkGfm],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["subheading-anchor"],
              ariaLabel: "Link to section",
            },
          },
        ],
        // Shiki 双主题高亮（github-light / github-dark），由 globals.css 的 .dark 切换
        [
          rehypeShiki,
          {
            themes: { light: "github-light", dark: "github-dark" },
            defaultColor: false,
          },
        ],
      ],
    });
    return { ...document, mdx };
  },
});

export default defineConfig({
  collections: [docs],
});
