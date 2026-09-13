#!/usr/bin/env node
/**
 * Phase 4 · 校验与交付（Verify）
 * ───────────────────────────────────────────────────────────
 * 1. 跑 `vitepress build`（同时验 SSR 安全 + 死链）
 * 2. 起 `vitepress preview`，逐路由 HTTP 检查（200、非 404 页）
 * 3. 若装了 playwright，再跑深度断言：横向溢出 / 文本截断 / 控制台报错 / 侧边栏项数 / 锚点可达
 *
 * 用法：
 *   node scripts/verify-docs.mjs [--dir <docs-site 根>] [--port 5180]
 *
 * 依赖：
 *   - 必须：vitepress（已在 docs-site 的 devDependencies）
 *   - 可选：playwright（npm i -D playwright 后才有深度断言；没有也能跑前两步）
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync, spawn } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS_SITE = path.resolve(__dirname, '..', 'assets', 'scaffold')

function parseArgs(argv) {
  const args = { dir: DOCS_SITE, port: 5180 }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dir') args.dir = path.resolve(argv[++i])
    else if (a === '--port') args.port = Number(argv[++i])
  }
  return args
}

function log(ok, msg) {
  console.log(`${ok ? '✓' : '✗'} ${msg}`)
  return ok
}

function runBuild(dir) {
  console.log(`\n[1/3] vitepress build @ ${dir}`)
  try {
    execSync('npx vitepress build', { cwd: dir, stdio: 'inherit' })
    return true
  } catch (e) {
    console.error('✗ 构建失败，详情见上方。')
    return false
  }
}

function collectRoutes(distDir) {
  const routes = []
  const walk = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name)
      const r = path.join(rel, e.name)
      if (e.isDirectory()) walk(full, r)
      else if (e.name === 'index.html') {
        const route = '/' + rel.split(path.sep).join('/')
        routes.push(route === '/' ? '/' : route.replace(/\/$/, ''))
      } else if (e.name.endsWith('.html')) {
        // VitePress 默认把子页面输出成 <name>.html（非 index.html）
        const base = e.name.replace(/\.html$/, '')
        if (base === '404') continue // 404 页不是内容路由，跳过（continue 而非 return，否则会中断整个遍历）
        const route = '/' + path.join(rel, base).split(path.sep).join('/')
        routes.push(route)
      }
    }
  }
  walk(distDir, '')
  return [...new Set(routes)]
}

async function checkRoutes(baseUrl, routes) {
  console.log(`\n[2/3] HTTP 路由检查（${routes.length} 条）`)
  let fails = 0
  for (const r of routes) {
    try {
      const res = await fetch(baseUrl + r)
      const html = await res.text()
      const is404 = /<title>404<\/title>/.test(html) || /This page could not be found/.test(html)
      const hasH1 = /<h1[ >]/.test(html)
      if (res.status >= 400 || is404 || !hasH1) {
        fails++
        console.log(`  ✗ ${r}  status=${res.status} 404page=${is404} h1=${hasH1}`)
      }
    } catch (e) {
      fails++
      console.log(`  ✗ ${r}  fetch error: ${e.message}`)
    }
  }
  return fails === 0
}

function startPreview(dir, port) {
  const p = spawn('npx', ['vitepress', 'preview', '--port', String(port), '--strictPort'], {
    cwd: dir,
    stdio: 'ignore',
    detached: false,
  })
  return p
}

async function waitFor(baseUrl, timeoutMs = 20000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(baseUrl)
      if (res.ok) return true
    } catch {}
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

async function deepAssert(baseUrl, routes, dir) {
  console.log(`\n[3/3] 深度断言（Playwright）`)
  let playwright
  try {
    playwright = await import('playwright')
  } catch {
    console.log('  · 未安装 playwright，跳过深度断言。')
    console.log('    需要深度断言时：cd <docs-site> && npm i -D playwright && npx playwright install chromium')
    return null
  }
  const browser = await playwright.chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('favicon')) errors.push(`HTTP ${res.status()}: ${res.url()}`)
  })

  let overflow = 0
  let truncated = 0
  let anchorFails = 0
  const sidebarCounts = {}

  for (const r of routes) {
    await page.goto(baseUrl + r, { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)
    // 横向溢出
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (ov > 1) overflow++
    // 文本截断：可见文本容器被裁切
    const tr = await page.evaluate(() => {
      const els = [...document.querySelectorAll('p,span,div,td,th,code,a,li')]
      return els.filter((el) => {
        const style = getComputedStyle(el)
        if (style.overflow === 'hidden' || style.overflowX === 'hidden' || style.textOverflow === 'ellipsis')
          return el.scrollWidth > el.clientWidth + 1
        return false
      }).length
    })
    truncated += tr
    // 侧边栏项数（取首页与首个详情页）
    if (!sidebarCounts[r]) {
      sidebarCounts[r] = await page.evaluate(() => document.querySelectorAll('.VPSidebarItem.level-1, .VPSidebarItem.level-2').length)
    }
    // 锚点可达性：页内所有 #xxx 链接都要有对应 id
    const anchorRes = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a[href*="#"]')]
      let missing = 0
      for (const a of links) {
        const href = a.getAttribute('href')
        const hash = href.split('#')[1]
        if (!hash) continue
        if (hash === '/' || hash.startsWith('http')) continue
        const id = decodeURIComponent(hash)
        if (!document.getElementById(id) && !document.querySelector(`[name="${id}"]`)) missing++
      }
      return missing
    })
    anchorFails += anchorRes
  }

  await browser.close()

  log(overflow === 0, `横向溢出页面数 = 0（实际 ${overflow}）`)
  log(truncated === 0, `文本截断元素数 = 0（实际 ${truncated}）`)
  log(anchorFails === 0, `缺失锚点目标数 = 0（实际 ${anchorFails}）`)
  log(errors.length === 0, `控制台报错/HTTP≥400 数 = 0（实际 ${errors.length}）`)
  if (errors.length) errors.slice(0, 10).forEach((e) => console.log('     - ' + e))
  return { overflow, truncated, anchorFails, errors: errors.length }
}

async function main() {
  const { dir, port } = parseArgs(process.argv)
  if (!fs.existsSync(path.join(dir, 'package.json'))) {
    console.error(`✗ 不是 docs-site 目录（缺少 package.json）：${dir}`)
    process.exit(1)
  }
  const distDir = path.join(dir, '.vitepress', 'dist')
  if (!runBuild(dir)) process.exit(1)

  const routes = collectRoutes(distDir)
  console.log(`  构建产物路由数：${routes.length}`)

  const preview = startPreview(dir, port)
  const baseUrl = `http://127.0.0.1:${port}`
  const ready = await waitFor(baseUrl)
  if (!ready) {
    console.error('✗ preview 服务起不来，无法做路由检查。')
    preview.kill()
    process.exit(1)
  }
  const httpOk = await checkRoutes(baseUrl, routes)
  log(httpOk, '所有路由 200 且含 h1、非 404 页')

  await deepAssert(baseUrl, routes, dir)

  preview.kill('SIGTERM')
  console.log('\n完成。若全部 ✓，可归档验收截图并交付。')
}

main()
