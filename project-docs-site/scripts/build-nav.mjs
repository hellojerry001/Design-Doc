#!/usr/bin/env node
/**
 * Phase 1 · 定信息架构（IA）—— 生成导航
 * ───────────────────────────────────────────────────────────
 * 读取 <docs-site>/ia.json（由 scan-project.mjs 产出、用户确认后的版本），
 * 生成 .vitepress/nav.mts（nav + sidebar 两段导出）。
 *
 * ia.json 结构见 scan-project.mjs 的 buildIA() 输出：
 *   { product, boards: { guide/design/components/api: {enabled,title,items} }, nav: [...] }
 * 每个 item 形如 { text, link?, items? } —— 与 VitePress 的 NavItem 同构。
 *
 * 设计约束（原则 5：导航即目录）：
 *   - 长页面 + 锚点 + 侧边栏二级菜单；build-nav 只负责把 IA 落成静态结构
 *   - 改了分类名 / 增删条目，改 ia.json 后重跑本脚本即可，不用手写 nav
 *
 * 用法：
 *   node scripts/build-nav.mjs [--dir <docs-site 根>] [--ia <ia.json 路径>]
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS_SITE = path.resolve(__dirname, '..', 'assets', 'scaffold')

function parseArgs(argv) {
  const args = { dir: DOCS_SITE, ia: null }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dir') args.dir = path.resolve(argv[++i])
    else if (a === '--ia') args.ia = path.resolve(argv[++i])
  }
  if (!args.ia) args.ia = path.join(args.dir, 'ia.json')
  return args
}

function itemToTs(item, indent) {
  const pad = '  '.repeat(indent)
  let s = `${pad}{ text: ${JSON.stringify(item.text)}`
  if (item.link) s += `, link: ${JSON.stringify(item.link)}`
  if (Array.isArray(item.items) && item.items.length) {
    s += `, items: [\n`
    s += item.items.map((sub) => itemToTs(sub, indent + 1)).join(',\n')
    s += `\n${pad}]`
  }
  s += ' }'
  return s
}

function main() {
  const { dir, ia } = parseArgs(process.argv)
  if (!fs.existsSync(ia)) {
    console.error(`✗ 找不到 ia.json：${ia}\n  先跑 scan-project.mjs 生成，或直接写一个 ia.json。`)
    process.exit(1)
  }
  const data = JSON.parse(fs.readFileSync(ia, 'utf8'))
  const boards = data.boards ?? {}
  const navOrder = data.nav ?? ['guide', 'design', 'components', 'api']

  // 顶层 nav：按 navOrder 取已启用板块，链接落到该板块第一个可点的条目
  const nav = []
  for (const key of navOrder) {
    const b = boards[key]
    if (!b || !b.enabled) continue
    const firstLink = firstLinkOf(b.items)
    nav.push({ text: b.title, link: firstLink })
  }

  // sidebar：每个启用板块一个 key `/<key>//`
  const sidebar = {}
  for (const key of navOrder) {
    const b = boards[key]
    if (!b || !b.enabled) continue
    sidebar[`/${key}/`] = [
      { text: b.title, items: (b.items ?? []).map((it) => normalizeItem(it)) },
    ]
  }

  const out = []
  out.push('/**')
  out.push(' * 导航树 —— 由 scripts/build-nav.mjs 从 ia.json 生成，不要手改。')
  out.push(' * 改板块 / 分类 / 条目请改 ia.json 后重跑本脚本。')
  out.push(' */')
  out.push('')
  out.push('export interface NavItem {')
  out.push('  text: string')
  out.push('  link?: string')
  out.push('  collapsed?: boolean')
  out.push('  items?: NavItem[]')
  out.push('}')
  out.push('')
  out.push('export const nav: NavItem[] = [')
  out.push(nav.map((n) => itemToTs(n, 1)).join(',\n'))
  out.push(']')
  out.push('')
  out.push('export const sidebar: Record<string, NavItem[]> = {')
  const sideEntries = Object.entries(sidebar).map(([k, v]) => {
    return `  ${JSON.stringify(k)}: [\n${v.map((it) => itemToTs(it, 2)).join(',\n')}\n  ]`
  })
  out.push(sideEntries.join(',\n'))
  out.push('}')
  out.push('')

  const OUT_FILE = path.join(dir, '.vitepress', 'nav.mts')
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, out.join('\n'), 'utf8')
  console.log(`✓ 已生成 ${path.relative(DOCS_SITE, OUT_FILE)}`)
  console.log(`  顶层板块：${nav.map((n) => n.text).join(' / ')}`)
  for (const [k, v] of Object.entries(sidebar)) {
    const n = v[0].items.length
    console.log(`  · /${k}  ${v[0].text} —— ${n} 个直接条目`)
  }
}

function normalizeItem(it) {
  const o = { text: it.text }
  if (it.link) o.link = it.link
  if (Array.isArray(it.items) && it.items.length) o.items = it.items.map(normalizeItem)
  return o
}

function firstLinkOf(items) {
  if (!Array.isArray(items) || !items.length) return undefined
  for (const it of items) {
    if (it.link) return it.link
    if (Array.isArray(it.items) && it.items.length) {
      const sub = firstLinkOf(it.items)
      if (sub) return sub
    }
  }
  return undefined
}

main()
