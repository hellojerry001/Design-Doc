#!/usr/bin/env node
/**
 * Phase 2 · 立骨架（一键起站）
 * ───────────────────────────────────────────────────────────
 * 把 assets/scaffold 拷到目标项目，并**剥离 demo 资产**，得到一个干净起点：
 *   - 不拷 .demo-assets/
 *   - 删掉 theme/preview.demo.css 及其在 index.ts 里的 import 行
 * 这样拷出来的站点不含任何示例数据，build 不会因指向不存在的文件而失败。
 *
 * 用法：
 *   node scripts/new-site.mjs <目标目录> [--name "项目名"]
 *
 * 之后：
 *   1. cd <目标目录> && npm install
 *   2. node scripts/scan-project.mjs --root <你的项目根> --out .
 *   3. 确认 ia.json → node scripts/build-nav.mjs
 *   4. 改 theme/docs.config.ts + scripts/gen-assets.mjs，按模板补页面
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCAFFOLD = path.resolve(__dirname, '..', 'assets', 'scaffold')

function parseArgs(argv) {
  const args = { dest: null, name: null }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--name') args.name = argv[++i]
    else if (!args.dest) args.dest = path.resolve(a)
  }
  if (!args.dest) {
    console.error('用法：node scripts/new-site.mjs <目标目录> [--name "项目名"]')
    process.exit(1)
  }
  return args
}

function copyDir(src, dest, skip) {
  fs.mkdirSync(dest, { recursive: true })
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name)
    const d = path.join(dest, e.name)
    if (skip(e.name)) continue
    if (e.isDirectory()) copyDir(s, d, skip)
    else fs.copyFileSync(s, d)
  }
}

function main() {
  const { dest, name } = parseArgs(process.argv)
  if (fs.existsSync(dest) && fs.readdirSync(dest).length) {
    console.error(`✗ 目标目录已存在且非空：${dest}`)
    process.exit(1)
  }

  // 跳过 demo 资产目录
  copyDir(SCAFFOLD, dest, (n) => n === '.demo-assets' || n === 'node_modules')

  // 删 theme/preview.demo.css 及 index.ts 里的 import 行
  const demoCss = path.join(dest, '.vitepress', 'theme', 'preview.demo.css')
  if (fs.existsSync(demoCss)) fs.unlinkSync(demoCss)
  const indexTs = path.join(dest, '.vitepress', 'theme', 'index.ts')
  if (fs.existsSync(indexTs)) {
    const txt = fs.readFileSync(indexTs, 'utf8').split('\n').filter((l) => !l.includes('preview.demo.css')).join('\n')
    fs.writeFileSync(indexTs, txt, 'utf8')
  }

  // 把 assets.generated.ts 的 demo ?raw 导入清空，否则会指向已删除的 .demo-assets
  const gen = path.join(dest, '.vitepress', 'theme', 'assets.generated.ts')
  if (fs.existsSync(gen)) {
    fs.writeFileSync(
      gen,
      "/* ⚠️ 本文件由 scripts/gen-assets.mjs 生成，不要手改。 */\nimport type { LoaderEntry } from './lib/loader'\n\nexport const RAW: Record<string, string> = {}\nexport const GLOBS: Record<string, Record<string, string>> = {}\nexport const LOADERS: Record<string, LoaderEntry> = {}\n",
      'utf8',
    )
  }

  console.log(`✓ 已生成干净文档站骨架：${dest}`)
  console.log('')
  console.log('下一步：')
  console.log(`  1. cd ${path.relative(process.cwd(), dest) || '.'} && npm install`)
  console.log(`  2. node scripts/scan-project.mjs --root <你的项目根> --out .`)
  console.log('  3. 确认生成的 ia.json → node scripts/build-nav.mjs')
  console.log('  4. 编辑 .vitepress/theme/docs.config.ts 与 scripts/gen-assets.mjs，按模板补页面')
  console.log('')
  console.log('  （docs.config.ts 默认保留 demo 占位，build 前请按项目实际情况改好；')
  console.log('   空资产源会在构建期因死链/空数据报错，这正是要你补真实资产信号的关卡。）')
}

main()
