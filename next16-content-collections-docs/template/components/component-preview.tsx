import * as fs from "node:fs";
import * as path from "node:path";
import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import githubLight from "shiki/themes/github-light.mjs";
import githubDark from "shiki/themes/github-dark.mjs";
import langTsx from "shiki/langs/tsx.mjs";
import langBash from "shiki/langs/bash.mjs";
import langJson from "shiki/langs/json.mjs";
import langCss from "shiki/langs/css.mjs";
import { registry } from "@/registry";
import { ComponentPreviewTabs } from "./component-preview-tabs";

/**
 * 同步 Shiki 实例。因为用的是 JS 正则引擎（无需 WASM 异步加载），
 * 可以在服务端组件里同步取到高亮 HTML —— 不需要把 shiki 打进客户端包。
 */
const highlighter = createHighlighterCoreSync({
  themes: [githubLight, githubDark],
  langs: [langTsx, langBash, langJson, langCss],
  engine: createJavaScriptRegexEngine({ forgiving: true }),
});

const THEMES = { light: "github-light", dark: "github-dark" } as const;

const EXAMPLE_DIR = path.join(process.cwd(), "registry", "examples");
const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

/** 从 registry/examples 读取示例源码，用于 Code 标签展示。 */
function readExampleSource(name: string): string | undefined {
  const safe = name.replace(/\\/g, "/");
  if (safe.includes("..")) return undefined;

  for (const ext of EXTENSIONS) {
    const file = path.join(EXAMPLE_DIR, `${safe}${ext}`);
    if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  }
  return undefined;
}

function highlight(code: string, lang: string) {
  const loaded = highlighter.getLoadedLanguages();
  const target = (loaded.includes(lang) ? lang : "tsx") as Parameters<
    typeof highlighter.codeToHtml
  >[1]["lang"];

  return highlighter.codeToHtml(code, {
    lang: target,
    themes: { ...THEMES },
    defaultColor: false,
  });
}

type ComponentPreviewProps = {
  /** 示例名：既用于在 registry 中查找预览组件，也用于定位示例源码文件 */
  name?: string;
  /** 直接给源码字符串（覆盖按 name 自动读取） */
  code?: string;
  lang?: string;
  /** 自定义预览内容，默认取 registry[name] */
  children?: React.ReactNode;
  /** 关闭右上角「Open in v0」按钮 */
  openInV0?: boolean;
  v0Url?: string;
  previewClassName?: string;
  className?: string;
};

export function ComponentPreview({
  name,
  code,
  lang = "tsx",
  children,
  openInV0 = true,
  v0Url,
  previewClassName,
  className,
}: ComponentPreviewProps) {
  if (!name && !code && !children) {
    throw new Error(
      "<ComponentPreview> 至少需要 name / code / children 其中之一。",
    );
  }

  const Registered = name ? registry[name] : undefined;
  const preview = children ?? (Registered ? <Registered /> : null);

  const source = code ?? (name ? readExampleSource(name) : undefined);
  const codeHtml = source ? highlight(source, lang) : undefined;

  return (
    <ComponentPreviewTabs
      preview={preview}
      code={source}
      codeHtml={codeHtml}
      name={name}
      openInV0={openInV0}
      v0Url={v0Url}
      previewClassName={previewClassName}
      className={className}
    />
  );
}
