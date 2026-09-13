#!/usr/bin/env node
/**
 * 生成 .vitepress/theme/assets.generated.ts
 *
 * ══ 为什么必须生成，不能写进配置 ══
 * Vite 要求 `?raw` 的 import 路径是**静态字面量**，不能拼字符串；
 * `import.meta.glob` 的 glob 也必须是字面量。所以「读哪些文件」这份清单
 * 只能落成真实的 import 语句 —— 这正是本脚本存在的意义。
 *
 * 用法：
 *   1. 改下面的 SOURCES / LOADERS
 *   2. node scripts/gen-assets.mjs
 *
 * path 一律相对 **docs-site 根目录** 填写：
 *   · 资产在 docs-site 内       → `.demo-assets/tokens.css`
 *   · 资产在项目源码里（常见）  → `../src/tokens.css`
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS_SITE = path.resolve(__dirname, '..')
const THEME_DIR = path.join(DOCS_SITE, '.vitepress', 'theme')
const OUT_FILE = path.join(THEME_DIR, 'assets.generated.ts')

/**
 * 资产源清单 —— 你唯一需要改的地方。
 *
 *   key   在 docs.config.ts 里通过 rawKey / globKey 引用
 *   path  相对 docs-site 根的路径
 *   type  'raw'  → 取源码原文（?raw），供解析器读取
 *         'glob' → 目录通配，用于一批 .svg 之类的文件
 */
const SOURCES = [
  { key: 'demo/tokens', path: '.demo-assets/tokens.css', type: 'raw' },
  { key: 'demo/tokens-web', path: '.demo-assets/tokens-web.css', type: 'raw' },
  { key: 'demo/icons', path: '.demo-assets/icons.js', type: 'raw' },
]

/**
 * 真实组件加载器 —— 登记后才能在页面里用 <LiveComponent asset="…" />。
 *   load      静态 dynamic import（路径不能拼）
 *   exportKey 取模块的哪个导出；留空则先试 default
 *   globalKey 模块把自己挂到 window 上时的全局键名
 */
const LOADERS = [
  {
    key: 'demo',
    path: '.demo-assets/button.js',
    exportKey: 'DEMO_UI',
    globalKey: 'DEMO_UI',
  },
]

// ────────────────────────────────────────────────────────────
//  以下为生成逻辑，通常不用改
// ────────────────────────────────────────────────────────────

/** 把相对 docs-site 根的路径转成相对 theme 目录的 import 路径，并保证带 ./ 或 ../ 前缀 */
function toImportPath(relFromDocsSite) {
  const abs = path.resolve(DOCS_SITE, relFromDocsSite)
  if (!fs.existsSync(abs)) {
    throw new Error(`资产源不存在：${relFromDocsSite}\n  期望位置：${abs}`)
  }
  let rel = path.relative(THEME_DIR, abs).split(path.sep).join('/')
  if (!rel.startsWith('.')) rel = './' + rel
  return rel
}

/** 目录通配：把 `src/icons/*.svg` 这类路径拆成 base + glob */
function splitGlob(p) {
  const m = p.match(/^(.*?)([*{].*)$/)
  if (!m) throw new Error(`glob 类型需要通配符（如 src/icons/*.svg）：${p}`)
  return { base: m[1], pattern: m[2] }
}

const lines = []
lines.push('/* ⚠️ 本文件由 scripts/gen-assets.mjs 生成，不要手改。 */')
lines.push('/* 改资产源请编辑 scripts/gen-assets.mjs 的 SOURCES / LOADERS 后重新生成。 */')
lines.push('')
lines.push("import type { LoaderEntry } from './lib/loader'")
lines.push('')

// ── RAW ──
const rawSources = SOURCES.filter((s) => (s.type ?? 'raw') === 'raw')
if (rawSources.length) {
  lines.push('// ── 源码原文（?raw，构建期读取，不执行） ──')
  rawSources.forEach((s, i) => {
    lines.push(`import raw${i} from '${toImportPath(s.path)}?raw'`)
  })
  lines.push('')
  lines.push('/** rawKey → 源码原文 */')
  lines.push('export const RAW: Record<string, string> = {')
  rawSources.forEach((s, i) => lines.push(`  '${s.key}': raw${i},`))
  lines.push('}')
  lines.push('')
}

// ── GLOBS ──（始终生成，没有 glob 源时是空对象，方便 assets.ts 静态引用）
const globSources = SOURCES.filter((s) => s.type === 'glob')
lines.push('// ── 目录通配（eager 载入，用于一批 .svg 之类的文件） ──')
lines.push('/** globKey → { 文件路径: 源码原文 } */')
lines.push('export const GLOBS: Record<string, Record<string, string>> = {')
for (const s of globSources) {
  const { base, pattern } = splitGlob(s.path)
  const baseImport = toImportPath(base.replace(/\/$/, ''))
  const tail = pattern.replace(/^\*\//, '')
  lines.push(`  '${s.key}': import.meta.glob('${baseImport}/${tail}', {`)
  lines.push('    eager: true,')
  lines.push("    query: '?raw',")
  lines.push("    import: 'default',")
  lines.push('  }) as Record<string, string>,')
}
lines.push('}')
lines.push('')

// ── LOADERS ──
if (LOADERS.length) {
  lines.push('/**')
  lines.push(' * 真实组件加载器。')
  lines.push(' * import 必须是静态字面量 —— 同样不能拼路径。')
  lines.push(' */')
  lines.push('export const LOADERS: Record<string, LoaderEntry> = {')
  for (const l of LOADERS) {
    lines.push(`  '${l.key}': {`)
    lines.push(`    load: () => import('${toImportPath(l.path)}'),`)
    if (l.exportKey) lines.push(`    exportKey: '${l.exportKey}',`)
    if (l.globalKey) lines.push(`    globalKey: '${l.globalKey}',`)
    lines.push('  },')
  }
  lines.push('}')
  lines.push('')
}

fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf8')

const rel = path.relative(DOCS_SITE, OUT_FILE)
console.log(`✓ 已生成 ${rel}`)
console.log(`  raw 源 ${rawSources.length} 个，glob 源 ${globSources.length} 个，加载器 ${LOADERS.length} 个`)
for (const s of SOURCES) {
  console.log(`    · ${s.key}  ← ${s.path}`)
}
