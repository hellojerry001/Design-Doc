#!/usr/bin/env node
/**
 * Phase 0 · 勘察（Inventory）
 * ───────────────────────────────────────────────────────────
 * 扫一个项目目录，自动产出：
 *   1. <out>/inventory.json        机器读的资产清单
 *   2. <out>/INVENTORY.md          人读清单（含「建议开哪几个板块 + 理由」「每类资产命中源码还是快照」）
 *   3. <out>/ia.json               起始信息架构（build-nav.mjs 的入参，用户确认后再跑）
 *
 * 设计约束（见 SKILL.md 六原则）：
 *   - 设计师不数数，让脚本数；每类资产用两套独立信号互验（文件名 + 内容特征）
 *   - 资产来源标注：检测到的都标 source；并额外把潜在的「快照文件」列出来，提醒将来会漂移
 *
 * 用法：
 *   node scripts/scan-project.mjs [--root <项目根>] [--out <输出目录>] [--src <组件目录,逗号分隔>]
 *
 * 默认：root = 当前目录；out = root；src = 自动探测常见组件目录。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── 参数解析 ──
function parseArgs(argv) {
  const args = { root: process.cwd(), out: null, src: null }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--root') args.root = path.resolve(argv[++i])
    else if (a === '--out') args.out = path.resolve(argv[++i])
    else if (a === '--src') args.src = argv[++i]
  }
  if (!args.out) args.out = args.root
  return args
}

const IGNORE = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.output',
  'coverage', '.cache', '.vitepress', 'out', 'release', 'target', '.turbo',
  'artifacts', 'vendor',
])

const COMPONENT_EXT = new Set(['.tsx', '.jsx', '.ts', '.js', '.vue', '.svelte'])

// ── 目录遍历 ──
function walk(root, onFile, onDir) {
  const stack = [root]
  while (stack.length) {
    const dir = stack.pop()
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const e of entries) {
      if (IGNORE.has(e.name)) continue
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        onDir?.(full, e.name)
        stack.push(full)
      } else if (e.isFile()) {
        onFile?.(full, e.name)
      }
    }
  }
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/·/g, '-')
    .replace(/[^a-z0-9一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function readSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8')
  } catch {
    return ''
  }
}

function countMatches(text, re) {
  let n = 0
  let m
  re.lastIndex = 0
  while ((m = re.exec(text)) !== null) n++
  if (re.global) re.lastIndex = 0
  return n
}

// ── 1. 设计变量（CSS 自定义属性）──
function scanTokens(root) {
  const files = []
  walk(root, (full, name) => {
    if (name.endsWith('.css')) files.push(full)
  })
  const candidates = []
  for (const f of files) {
    const src = readSafe(f)
    // 信号 1：行级声明 `--name:`
    const declReg = /^\s*--[\w-]+\s*:/gm
    // 信号 2：被引用 `var(--name)`
    const refReg = /var\(\s*--[\w-]+/g
    const declCount = countMatches(src, declReg)
    const refCount = countMatches(src, refReg)
    if (declCount >= 3) {
      // 提取分类区块注释（如 /* ── Color · Primitive ── */）
      const sections = []
      const secReg = /\/\*\s*─+\s*(.+?)\s*─+\s*\*\//g
      let sm
      while ((sm = secReg.exec(src)) !== null) {
        const label = sm[1].trim()
        if (label && /[·\w一-龥]/.test(label)) sections.push({ label, anchor: `tv-cat-${slugify(label)}` })
      }
      const rel = path.relative(root, f)
      candidates.push({
        file: rel,
        varCount: declCount,
        refCount,
        sections,
        kind: 'source',
      })
    }
  }
  // 只保留变量最多的若干文件作为候选作用域
  candidates.sort((a, b) => b.varCount - a.varCount)
  return candidates.slice(0, 6)
}

// ── 2. 组件 ──
function scanComponents(root, srcDirs) {
  const found = new Map() // 组件名 -> { files: [], source }
  const push = (name, file) => {
    if (!found.has(name)) found.set(name, { files: [], name })
    found.get(name).files.push(path.relative(root, file))
  }
  for (const dir of srcDirs) {
    const abs = path.resolve(root, dir)
    if (!fs.existsSync(abs)) continue
    walk(abs, (full, name) => {
      if (!COMPONENT_EXT.has(path.extname(name))) return
      // 排除测试 / 故事 / 类型声明
      if (/\.(test|spec|stories|d)\.(tsx?|jsx?)$/.test(name)) return
      if (/\.d\.ts$/.test(name)) return
      const parent = path.basename(path.dirname(full))
      const base = path.basename(name, path.extname(name))
      // 组件名取父目录（若不是散落的 src 根），否则取文件名
      const compName = parent && parent !== path.basename(abs) ? parent : base
      // 排除 index / 入口 / 工具类 这类非组件文件名
      if (/^(index|main|app|root|entry|types|utils?|helpers?|constants?)$/i.test(compName)) return
      push(compName, full)
    })
  }
  const list = [...found.values()].sort((a, b) => a.name.localeCompare(b.name))
  return list
}

// ── 3. 图标 ──
function scanIcons(root) {
  const svgDirs = []
  const dirCounts = new Map()
  walk(root, (full, name) => {
    if (name.endsWith('.svg')) {
      const d = path.dirname(full)
      dirCounts.set(d, (dirCounts.get(d) ?? 0) + 1)
    }
  })
  for (const [d, count] of dirCounts) {
    if (count >= 3) svgDirs.push({ dir: path.relative(root, d), count, kind: 'source' })
  }
  svgDirs.sort((a, b) => b.count - a.count)

  // JS/TS 里的图标常量（含 <svg 字面量）
  const constFiles = []
  walk(root, (full, name) => {
    if (!/\.(ts|tsx|js|jsx|mjs)$/.test(name)) return
    if (IGNORE.has(path.basename(path.dirname(full)))) return
    const src = readSafe(full)
    if (!src.includes('<svg')) return
    if (/const\s+(?:[A-Z]\w*Icons?|ICONS|icons)\b/.test(src) || /^export\s+const\s+\w*[Ii]con/.test(src)) {
      const n = countMatches(src, /<svg/g)
      if (n >= 1) constFiles.push({ file: path.relative(root, full), count: n, kind: 'source' })
    }
  })
  return { svgDirs, constFiles }
}

// ── 4. 接口 / 命令 ──
function scanApi(root) {
  const markers = [
    /ipcMain\.handle\(/g,
    /ipcRenderer\.(invoke|send|on)\(/g,
    /\brouter\.(get|post|put|delete|patch)\(/g,
    /\bapp\.(get|post|put|delete)\(/g,
    /createServer\(/g,
    /export\s+(async\s+)?function\s+\w+/g,
  ]
  const routeFileReg = /(route|router|endpoint|api|controller|handler)s?\.(ts|tsx|js|jsx)$/i
  const files = []
  walk(root, (full, name) => {
    if (!/\.(ts|tsx|js|jsx|mjs|py|go|java|rb)$/.test(name)) return
    const src = readSafe(full)
    let hit = 0
    for (const re of markers) hit += countMatches(src, re)
    const isRouteFile = routeFileReg.test(name)
    if (hit >= 3 || isRouteFile) {
      files.push({ file: path.relative(root, full), markers: hit, routeFile: isRouteFile, kind: 'source' })
    }
  })
  files.sort((a, b) => b.markers - a.markers)
  return files
}

// ── 5. 已有文档 ──
function scanDocs(root) {
  const boards = { guide: 0, design: 0, components: 0, api: 0 }
  const docDirs = []
  walk(root, null, (full, name) => {
    if (/^(docs|docs-site|doc|document)$/i.test(name)) docDirs.push(full)
  })
  for (const d of docDirs) {
    walk(d, (full) => {
      if (!full.endsWith('.md')) return
      const rel = path.relative(d, full).toLowerCase()
      if (rel.startsWith('guide') || rel.includes('指南')) boards.guide++
      else if (rel.startsWith('design') || rel.includes('设计') || rel.includes('token') || rel.includes('图标')) boards.design++
      else if (rel.startsWith('components') || rel.includes('组件')) boards.components++
      else if (rel.startsWith('api') || rel.includes('接口') || rel.includes('命令')) boards.api++
      else boards.guide++ // 兜底归类
    })
  }
  return { docDirs: docDirs.map((d) => path.relative(root, d)), boards }
}

// ── 6. 潜在快照文件（提醒会漂移）──
function scanSnapshotCandidates(root) {
  const out = []
  walk(root, (full, name) => {
    if (/\.(json|csv|yaml|yml)$/.test(name) && /(token|design|export|snapshot|inspect)/i.test(name)) {
      out.push(path.relative(root, full))
    }
  })
  return out.slice(0, 12)
}

// ── 主流程 ──
function main() {
  const { root, out, src } = parseArgs(process.argv)
  if (!fs.existsSync(root)) {
    console.error(`✗ 项目根不存在：${root}`)
    process.exit(1)
  }
  console.log(`○ 扫描项目：${root}`)

  const srcDirs = src
    ? src.split(',').map((s) => s.trim())
    : autoDetectSrc(root)

  const tokens = scanTokens(root)
  const components = scanComponents(root, srcDirs)
  const icons = scanIcons(root)
  const api = scanApi(root)
  const docs = scanDocs(root)
  const snapshots = scanSnapshotCandidates(root)

  const projectName = detectProjectName(root)

  // 建议板块
  const suggested = {
    guide: {
      enabled: true,
      rationale: '任何非玩具项目都需要「怎么用 / 为什么这么设计」的说明，且指南是文档能长大的根。',
    },
    design: {
      enabled: tokens.length > 0 || icons.svgDirs.length > 0 || icons.constFiles.length > 0,
      rationale:
        tokens.length > 0
          ? `检测到 ${tokens.length} 个含 CSS 变量的文件（共 ${tokens.reduce((s, t) => s + t.varCount, 0)} 个变量），且/或图标资源，适合开设计板块。`
          : '未检测到成体系的 CSS 变量或图标源，设计板块可不开或仅保留图标墙。',
    },
    components: {
      enabled: components.length > 0,
      rationale: components.length > 0 ? `检测到 ${components.length} 个组件目录/文件，应逐个建组件页。` : '未检测到组件源文件。',
    },
    api: {
      enabled: api.length > 0,
      rationale: api.length > 0 ? `检测到 ${api.length} 个接口/命令定义文件，应建 API 参考。` : '未检测到接口/命令定义。',
    },
  }

  const inventory = {
    scannedAt: new Date().toISOString(),
    root: path.relative(process.cwd(), root) || '.',
    srcDirs,
    tokens,
    components: { count: components.length, list: components.slice(0, 200).map((c) => ({ name: c.name, files: c.files })) },
    icons,
    api: { count: api.length, files: api },
    existingDocs: docs,
    snapshotCandidates: snapshots,
    suggestedBoards: suggested,
  }

  // 生成起始 IA
  const ia = buildIA(projectName, inventory)

  fs.mkdirSync(out, { recursive: true })
  fs.writeFileSync(path.join(out, 'inventory.json'), JSON.stringify(inventory, null, 2), 'utf8')
  fs.writeFileSync(path.join(out, 'ia.json'), JSON.stringify(ia, null, 2), 'utf8')
  const md = renderMarkdown(inventory)
  fs.writeFileSync(path.join(out, 'INVENTORY.md'), md, 'utf8')

  console.log(`✓ inventory.json   (${tokens.length} 个 token 文件 / ${components.length} 个组件 / ${icons.svgDirs.length + icons.constFiles.length} 个图标源 / ${api.length} 个 API 文件)`)
  console.log(`✓ ia.json          (起始信息架构，确认后交给 build-nav.mjs)`)
  console.log(`✓ INVENTORY.md     人读清单 + 建议板块`)
  // 板块建议速览
  const on = Object.entries(suggested).filter(([, v]) => v.enabled).map(([k]) => k)
  console.log(`\n建议板块：${on.join(' / ')}`)
}

function autoDetectSrc(root) {
  const cand = ['components', 'src/components', 'src', 'app', 'lib', 'packages', 'ui', 'src/ui']
  const hit = cand.filter((d) => fs.existsSync(path.resolve(root, d)))
  return hit.length ? hit : ['.']
}

function detectProjectName(root) {
  const pkg = path.join(root, 'package.json')
  if (fs.existsSync(pkg)) {
    try {
      const j = JSON.parse(readSafe(pkg))
      if (j.name) return j.name
    } catch {}
  }
  return path.basename(root)
}

function buildIA(projectName, inv) {
  const tokenItems = []
  if (inv.tokens.length > 0) {
    const allSections = []
    for (const t of inv.tokens) for (const s of t.sections) allSections.push(s)
    tokenItems.push({ text: '设计变量', link: '/design/tokens', items: allSections })
  }
  if (inv.icons.svgDirs.length > 0 || inv.icons.constFiles.length > 0) {
    tokenItems.push({ text: '图标资源', link: '/design/icons' })
  }
  const galleryItems = []
  for (const d of inv.icons.svgDirs) {
    const anchor = `g-${slugify(d.dir)}`
    galleryItems.push({ text: path.basename(d.dir), link: `/design/gallery#${anchor}` })
  }
  if (galleryItems.length) tokenItems.push({ text: '组件预览', link: '/design/gallery', items: galleryItems })

  const componentItems = inv.components.list.slice(0, 120).map((c) => ({
    text: c.name,
    link: `/components/${slugify(c.name)}`,
  }))

  const apiItems = inv.api.files.slice(0, 120).map((f) => ({
    text: path.basename(f.file).replace(/\.(ts|tsx|js|jsx|mjs|py|go|java|rb)$/, ''),
    link: `/api/${slugify(path.basename(f.file).replace(/\.(ts|tsx|js|jsx|mjs|py|go|java|rb)$/, ''))}`,
  }))

  const boards = {
    guide: {
      enabled: inv.suggestedBoards.guide.enabled,
      title: '指南',
      items: [{ text: '架构与目录', link: '/guide/overview' }],
    },
    design: { enabled: inv.suggestedBoards.design.enabled, title: '设计', items: tokenItems },
    components: { enabled: inv.suggestedBoards.components.enabled, title: '组件', items: componentItems },
    api: { enabled: inv.suggestedBoards.api.enabled, title: 'API', items: apiItems },
  }

  return {
    product: {
      name: projectName,
      tagline: '把项目资产整理成结构化文档',
      description: '本 IA 由 scan-project.mjs 自动生成，请在确认板块与条目后交给 build-nav.mjs。',
    },
    boards,
    nav: ['guide', 'design', 'components', 'api'],
  }
}

function renderMarkdown(inv) {
  const lines = []
  lines.push(`# 资产清单（${inv.root}）`)
  lines.push('')
  lines.push(`> 扫描时间：${inv.scannedAt}　组件源目录：${inv.srcDirs.join(', ') || '(自动)'}`)
  lines.push('')

  const on = Object.entries(inv.suggestedBoards).filter(([, v]) => v.enabled).map(([k]) => k)
  lines.push(`## 建议板块`)
  for (const [k, v] of Object.entries(inv.suggestedBoards)) {
    lines.push(`- **${k}** ${v.enabled ? '✅ 开' : '⬜ 关'} —— ${v.rationale}`)
  }
  lines.push('')

  lines.push(`## 设计变量（源码）`)
  if (inv.tokens.length) {
    lines.push('| 文件 | 变量数 | 引用数 | 分类数 | 来源 |')
    lines.push('|---|---|---|---|---|')
    for (const t of inv.tokens) {
      lines.push(`| \`${t.file}\` | ${t.varCount} | ${t.refCount} | ${t.sections.length} | ${t.kind} |`)
    }
  } else {
    lines.push('_未检测到含 CSS 变量的文件。_')
  }
  lines.push('')

  lines.push(`## 组件（源码）`)
  lines.push(`共 **${inv.components.count}** 个组件（列出前 60 个）：`)
  for (const c of inv.components.list.slice(0, 60)) {
    lines.push(`- \`${c.name}\` —— ${c.files.join(', ')}`)
  }
  if (inv.components.count > 60) lines.push(`- … 等 ${inv.components.count - 60} 个`)
  lines.push('')

  lines.push(`## 图标（源码）`)
  if (inv.icons.svgDirs.length) {
    lines.push('**SVG 目录：**')
    for (const d of inv.icons.svgDirs) lines.push(`- \`${d.dir}\` ×${d.count}（${d.kind}）`)
  }
  if (inv.icons.constFiles.length) {
    lines.push('**JS/TS 图标常量：**')
    for (const f of inv.icons.constFiles) lines.push(`- \`${f.file}\` ×${f.count}（${f.kind}）`)
  }
  if (!inv.icons.svgDirs.length && !inv.icons.constFiles.length) lines.push('_未检测到图标源。_')
  lines.push('')

  lines.push(`## 接口 / 命令（源码）`)
  if (inv.api.count) {
    lines.push(`共 **${inv.api.count}** 个文件：`)

    for (const f of inv.api.files.slice(0, 40)) {
      lines.push(`- \`${f.file}\` —— 命中 ${f.markers} 处（${f.routeFile ? '路由文件' : '接口特征'}）`)
    }
  } else {
    lines.push('_未检测到接口/命令定义。_')
  }
  lines.push('')

  lines.push(`## 已有文档`)
  lines.push(`文档目录：${inv.existingDocs.docDirs.join(', ') || '无'}`)
  lines.push(`已写页面（按板块估计）：指南 ${inv.existingDocs.boards.guide} / 设计 ${inv.existingDocs.boards.design} / 组件 ${inv.existingDocs.boards.components} / API ${inv.existingDocs.boards.api}`)
  lines.push('')

  lines.push(`## ⚠️ 潜在快照文件（会漂移，需标注 syncedAt）`)
  if (inv.snapshotCandidates.length) {
    for (const s of inv.snapshotCandidates) lines.push(`- \`${s}\``)
    lines.push('')
    lines.push('> 这些文件若被文档引用，必须在 docs.config.ts 的 sources 里标 `kind: \'snapshot\'` 并带 `syncedAt` / `via`，否则构建会失败。')
  } else {
    lines.push('_未检测到疑似快照文件。_')
  }
  lines.push('')
  lines.push('---')
  lines.push('下一步：确认 / 调整 `ia.json` 的板块与条目，然后运行 `node scripts/build-nav.mjs` 生成导航。')

  return lines.join('\n')
}

main()
