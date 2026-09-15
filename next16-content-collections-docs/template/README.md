# Spell Style Docs Template

与 [spell.sh](https://spell.sh) 同款技术栈的文档站脚手架：基于 **Next.js 16 (App Router) + MDX + Content Collections + Shiki + Tailwind CSS v4** 自研文档站（不是 VitePress / Docusaurus / Nextra / Fumadocs 这类现成文档生成器）。

支持 spell.sh 那种**组件演示块**：`Preview / Code` 双标签、一键复制、重播预览、`Open in v0`。

## 技术栈

| 用途 | 技术 |
| --- | --- |
| 框架 | Next.js 16（App Router，**webpack 模式**） |
| 文档内容 | MDX（`@next/mdx`）+ Content Collections（`@content-collections/*`） |
| 代码高亮 | Shiki（`@shikijs/rehype` 用于正文代码块；`createHighlighterCoreSync` 用于演示块，github-light / github-dark 双主题） |
| MDX 流水线 | `remark-gfm`、`remark-code-import`、`rehype-slug`、`rehype-autolink-headings` |
| 样式 | Tailwind CSS v4 + `@tailwindcss/typography` |
| 主题 | `next-themes`（class 策略，明暗 + system） |
| 组件 | React 19 |

## 快速开始

```bash
npm install
npm run dev      # http://localhost:3000
```

构建与预览：

```bash
npm run build
npm run start
```

> ⚠️ 必须走 webpack：`npm run dev` / `npm run build` 已内置 `--webpack`。Turbopack 下 content-collections 不会生成虚拟模块。

## 目录结构

```
.
├── content-collections.ts          # 定义 docs 集合 + compileMDX（含正文代码块的 Shiki 配置）
├── content/docs/                   # 你的 .mdx 文档（frontmatter: title/description/order）
├── registry/
│   ├── index.ts                    # 示例名 → 示例组件 的注册表
│   ├── spell-ui/                   # 组件本体（bento-grid / bento-cards / text-marquee ...）
│   └── examples/                   # 每个组件的示例文件（Code 标签展示的就是它）
├── app/
│   ├── layout.tsx                  # 根布局（ThemeProvider + 顶部导航 + 展示墙字体）
│   ├── page.tsx                    # 首页 Hero + Bento 展示墙
│   ├── globals.css                 # Tailwind v4 + Shiki 双主题 + 演示块样式
│   └── docs/
│       ├── layout.tsx              # 文档页 + 侧边栏（从 allDocs 自动生成）
│       ├── page.tsx                # /docs 索引
│       └── [slug]/page.tsx         # 文档详情（渲染 MDX）
├── components/
│   ├── component-preview.tsx       # 服务端：读源码 + Shiki 高亮（不进客户端包）
│   ├── component-preview-tabs.tsx  # 客户端：标签切换 / 复制 / 重播 / Open in v0
│   └── theme-provider.tsx / site-header.tsx
├── scripts/build-cc.mjs            # 构建前显式触发 content-collections
└── scripts/watch-cc.mjs            # dev 下监听 content 目录
```

## 组件演示块

在任意 `.mdx` 里放一个 `<ComponentPreview>` 就能得到 spell.sh 同款演示块：

```mdx
<ComponentPreview name="text-marquee" />
```

`name` 一次解决两件事：

1. 去 `registry/index.ts` 取到示例组件 → 渲染左侧 **Preview**；
2. 读 `registry/examples/<name>.tsx` → 作为右侧 **Code**。

预览与代码永远同源，不存在两边不同步的问题。新增一个组件演示只需两步：在
`registry/examples/` 放示例文件，再到 `registry/index.ts` 登记一行。

也可以完全内联，自己指定源码与预览内容：

```mdx
<ComponentPreview code={`export function Demo() { return <span>Hi</span>; }`}>
  <Demo />
</ComponentPreview>
```

其余 props：

| prop | 默认值 | 说明 |
| --- | --- | --- |
| `name` | — | registry 键 + 示例源码文件名 |
| `code` | — | 直接给源码字符串，覆盖按 `name` 读取 |
| `lang` | `tsx` | 代码高亮语言 |
| `children` | — | 自定义预览内容，默认 `registry[name]` |
| `openInV0` | `true` | 关闭右上角 v0 按钮 |
| `v0Url` | 自动生成 | 覆盖 v0 跳转链接 |
| `previewClassName` | — | 调整预览画布样式 |

实现要点：高亮在**服务端**用同步 Shiki 引擎完成（`createHighlighterCoreSync` + JS 正则引擎），
因此 shiki 不会进客户端包，Code 面板也能被静态输出；只有标签切换、复制这些交互是客户端组件。

## 首页 Bento 展示墙

首页的卡片墙（spell.sh 同款 bento 布局）也做成了模板，由两个原语 + 一组卡片组成：

```
registry/spell-ui/
├── bento-grid.tsx        # BentoGrid（4 列栅格，行高 190px）+ BentoCard（圆角卡片 + 左下角标签）
├── bento-cards.tsx       # LightRays / SpotifyNowPlaying / PopButton / DesignPlatformCard / ScrollStudio / ShimmerText
├── exploding-input.tsx   # 交互卡片：输入时炸出火星（客户端）
└── animated-heading.tsx  # 交互卡片：标题词轮换（客户端）
registry/examples/
└── bento-showcase.tsx    # 把 8 张卡片拼成 4 列便当格（Demo）
```

首页 `app/page.tsx` 直接渲染它；文档页 `content/docs/bento.mdx` 用 `<BentoShowcase />` 复用同一份示例。

用两个原语自己拼格子：

```tsx
import { BentoCard, BentoGrid } from "@/registry/spell-ui/bento-grid";

<BentoGrid>
  <BentoCard label="Light Rays" className="sm:col-span-2 lg:row-span-2" contentClassName="p-0">
    <LightRays />
  </BentoCard>
  <BentoCard label="Pop Button">
    <PopButton />
  </BentoCard>
</BentoGrid>
```

| 原语 | prop | 说明 |
| --- | --- | --- |
| `BentoGrid` | `className` | 4 列栅格；`sm` 收 2 列、移动端 1 列；行高固定 190px |
| `BentoCard` | `label` | 左下角标签 |
| | `action` | 标签右侧的节点（链接 / 按钮） |
| | `contentClassName` | 内容区额外类名（控制内边距） |

卡片默认都是 **Server Component**（动画全由 CSS 关键帧驱动，零客户端 JS）；只有
`ExplodingInput` / `AnimatedHeading` 因需要交互才标了 `"use client"`。

关键帧（`rays-drift` / `handwriting` / `shimmer-sweep` / `particle-burst` / `word-in`）定义在
`app/globals.css` 末尾，并带 `prefers-reduced-motion` 兜底。展示墙用到的两款字体
（Instrument Serif 衬线斜体、Caveat 手写体）在 `app/layout.tsx` 里通过 Google Fonts `<link>`
引入，离线时自动回落到 `@theme` 中的系统字体栈。

新增一张卡片：在 `registry/spell-ui/` 写组件 → 在 `registry/examples/bento-showcase.tsx`
里加一个 `<BentoCard>` 包住它。

## 新增一篇文档

在 `content/docs/` 下新建 `xxx.mdx`，填好 frontmatter 即可，侧边栏与 `/docs` 索引会自动更新：

```mdx
---
title: My Component
description: What it does.
order: 3
---

# My Component
你的内容，代码块会被 Shiki 自动高亮。
```

## 配置要点

Next 16 下 `withContentCollections(withMDX(nextConfig))` 那套写法已失效（它靠 `process.argv`
判断 build/dev，而 Next 16 走独立 worker 进程），因此改为显式脚本触发：

- `scripts/build-cc.mjs` 在 prebuild 阶段生成 `.content-collections/generated`；
- dev 用 `concurrently` 同时跑 `watch-cc` 与 `next dev --webpack`；
- `tsconfig.json` 的 `paths` 把 `content-collections` 指向生成产物（并需要 `baseUrl`）；
- 配置文件必须叫 `content-collections.ts`（不是 `content-collections.config.ts`）；
- schema 直接从 `zod` 导入（`@content-collections/core` 运行时并未 re-export `z`）。

## 演示块样式调整

演示块的代码区样式集中在 `app/globals.css` 的 `.preview-code` 规则里（外边距、内边距、
最大高度、背景透明），想改外观只动这一处即可。
