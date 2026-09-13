#!/usr/bin/env node
// 本地预览：在同一起点同时提供「门户页(/)」与「各项目的子路径文档(/{project}/)」。
// 支持 VitePress 的 cleanUrls（/a/b -> a/b.html），因此下钻页面不会 404。
//
// 用法：  node serve.mjs [port]        # 默认 5190
import { createServer } from 'node:http'
import { stat, readFile } from 'node:fs/promises'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const port = Number(process.argv[2]) || 5190

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

async function isFile(p) {
  try {
    return (await stat(p)).isFile()
  } catch {
    return false
  }
}

async function resolveFile(pathname) {
  const clean = decodeURIComponent(pathname.split('?')[0])
  const rel = normalize(clean).replace(/^(\.\.(\/|\\|$))+/, '')
  const base = join(root, rel)
  const candidates = [base, base + '.html', join(base, 'index.html')]
  for (const c of candidates) {
    if (await isFile(c)) return c
  }
  return null
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const file = await resolveFile(url.pathname)
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
    const nf = join(root, '404.html')
    res.end((await isFile(nf)) ? await readFile(nf) : 'Not found')
    return
  }
  const buf = await readFile(file)
  res.writeHead(200, {
    'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  })
  res.end(buf)
}).listen(port, '127.0.0.1', () => {
  console.log(`开发者文档预览： http://127.0.0.1:${port}/`)
})
