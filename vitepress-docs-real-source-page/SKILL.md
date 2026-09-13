---
name: vitepress-docs-real-source-page
description: This skill should be used when adding or modifying pages in the design-qa developer docs site (开发者文档/docs-site, VitePress) — especially galleries/showcases that must stay in sync with real source code. Covers starting the dev server, registering theme components, importing source from outside the Vite root, extracting non-exported constants via ?raw (from JS or CSS), the layout pitfalls of the 624px content column, and the browser-based verification that is required because curl cannot distinguish routes in dev.
agent_created: true
---

# 开发者文档站：新增「跟随真实源码」的页面

## 触发场景

- 要往 `开发者文档/docs-site` 加页面、加侧边栏菜单、加导航
- 要做「组件预览 / 图标资源 / 设计变量」这类**展示型页面**，且要求**不漂移**（文档 == 实现）
- 页面数据来自 `design-qa-desktop/src/**` 的真实源码

## 站点事实

| 项 | 值 |
|---|---|
| 站点根 | `开发者文档/docs-site`（VitePress 1.6.4） |
| 启动 | `node node_modules/vitepress/bin/vitepress.js dev --port 5180 --strictPort --host 127.0.0.1` |
| 端口 | **5180**。5173 留给插件 side panel 预览（`npm run preview:ui`），不要占用 |
| 主题 | `.vitepress/theme/`（`index.ts` 注册组件，`components/*.vue`） |
| 侧边栏 | `.vitepress/config.mts` 的 `themeConfig.sidebar`，按路径前缀分组（`'/design/'` 等） |
| 热更新 | 改 `.md` / 主题文件 HMR；改 `config.mts` 会**自动重启**整个 dev server |

---

## 1. 关键手法：用 `?raw` 读源码，而不是 `import`

文档站的既定原则是「让文档预览永远等于线上组件，不漂移」。但源码里的图标表/常量**往往没有 export**（例如 `src/dqui/components.js` 的 `const ICONS = {...}`），`import` 拿不到。

**解法：`?raw` 取原文，在构建期自己解析。**

```ts
// .vitepress/theme/icons-data.ts
import dquiSrc from '../../../../design-qa-desktop/src/dqui/components.js?raw'
```

前提是 `.vitepress/config.mts` 里放开 Vite 的 fs 白名单（**已配置**，两级 `..` 到仓库根）：

```ts
vite: { server: { fs: { allow: ['..', '../..'] } } }
```

目录文件用 glob：

```ts
const mods = import.meta.glob('../../../../design-qa-desktop/src/assets/icons/*.svg',
  { eager: true, query: '?raw', import: 'default' }) as Record<string, string>
```

相对路径从 `theme/` 起算：`../../../../` = 仓库根，再拼 `design-qa-desktop/src/…`。

### 解析「未导出的对象字面量」

不要用 `new Function` 求值 —— 值里可能含**函数调用**（如 `pin: chatIcon('pin')`）会直接抛错。改成**只匹配字符串字面量**：

```ts
// 同时支持 '...' / "..." / `...`，按转义规则读取
const LITERAL_RE =
  /(?:^|[\s,{])(?:"([A-Za-z_$][\w$]*)"|([A-Za-z_$][\w$]*))\s*:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/gm
```

要点：
- **必须包含反引号** —— 漏了会静默少掉整组数据（本项目 DQUI 的 27 个图标就是用反引号，漏掉后页面「看起来正常」但少一半内容）。
- 用 `([^"\\]|\\.)*` 而不是 `.*?`，否则值里的转义引号会提前截断。
- 抽出后用 `value.startsWith('<svg')` 之类的**前缀过滤**，把同一文件里别的字符串常量排除掉。
- 非 `<svg>` 的裸路径片段（如 `package: '<path …/>'`）需要自己套一层 `<svg …>` 外壳。

### SSR 安全
解析是纯字符串运算，模块顶层执行即可，不影响 VitePress 的 SSG。`navigator`/`document` 只能出现在事件处理函数里。

### 1b. 同法解析 CSS（设计变量这类场景）

`?raw` 对 `.css` 同样有效。CSS 的解析方式和 JS 不同，用**行级状态机**：

```ts
const SECTION_RE = /^\/\*\s*──\s*(.*?)\s*──\s*\*\/$/   // /* ── Component · Chip ── */
const DECL_RE = /^(--[\w-]+)\s*:\s*(.+?);?$/

// 数花括号深度：depth 0→1 即进入一个顶层块
//   topBlock 1 = 基础块（亮色/默认值）；topBlock >= 2 = 覆盖块（暗色/兼容覆盖）
// @media：遇到以 '@media' 开头的行置 pendingMedia，落到 depth 0→1 时记 mediaDepth，
//         深度回落到 mediaDepth 时清空。
```

要点与坑：

- **覆盖块里通常没有区块注释**。若不给覆盖块的声明**继承同名基础声明的 section**，它们会全部落到文件里最后出现过的那个 section（本项目全部 34 条都掉进了「Legacy aliases」）。做法：按变量名 join 基础块，section 取 `(base ?? override).section`。
- **别把「基础块 / 覆盖块」直接叫成「亮色 / 暗色」**。同一个文件里两块的关系可能是「无条件覆盖」（本项目侧栏就是），也可能是 `@media`。先 grep 该文件有没有 `@media` / `[data-*]` 选择器再下结论 —— 本项目旧文档就是把插件端的 `@media` 双主题机制错记到了桌面端头上。
- **`var()` 引用链要递归展开**（`var(--x)` → 值；`var(--x, fallback)` → 优先解析目标，否则用 fallback），并把同一文件里所有声明先灌进一个 `Map<name, value>` 再解析，否则拿到的是 `var(--dq-color-white)` 这种中间态。
- **数数量用两套独立实现互验**。本项目旧快照给出的变量数（248）与源码实际（250）不符，只有重新从文件数才发现。
- **不要 import 插件端的 `:root` 样式文件**：它的裸 Legacy 别名（`--bg` / `--text` / `--accent` / `--border`）会覆盖 VitePress 自己的变量，把文档站 UI 搞坏。这类 token 一律只渲染**解析出来的字面值**（色块用 `backgroundColor`、长度条用百分比），不注入真实 CSS。反过来说，`theme/index.ts` 里已经 import 的 `dqui/tokens.css`（`#pageChat` 作用域）是安全的，因为它不碰 `:root`。
- **按「值类型」给可视化时，判类型不能只看值**。`12px` 既是间距也可能是圆角/字号，只靠正则会把所有 px 判成 `length`，模板里 `kind === 'radius'` 的分支**永不命中**（表现为某一类可视化数量恒为 0，且不会有任何报错）。判类型要带上 `sectionLabel` 与变量名：`kindOf(value, sectionLabel, name)`。
- **验收必须逐个 kind 数渲染出来的元素**，不要只截图肉眼看：

  ```js
  { 色块: '.tv-sw-fill', 长度条: '.tv-bar', 圆角块: '.tv-rad',
    缓动: '.tv-ease', 阴影: '.tv-shadow', 字号: '.tv-fontsize', 字体: '.tv-font' }
  ```

  任一 kind 为 0 = 有死分支。同时要**每档作用域分别数**（切换 tab 后再数），本项目侧栏与插件端数量差很大（102 vs 250 行）。
- **新增 kind 后回头对一遍模板分支**：类型联合里加了成员、`kindOf` 也返回了它，但模板没有对应 `v-else-if` 时会静默掉进兜底空槽（如 `'fontsize'` 掉进 `.tv-vis-none`）。兜底空槽本身是合理的 —— `font-weight` / 无单位 `line-height` / `z-index` / `0` 这类值**本来就没有视觉表示**，右侧取值列已展示原值，不要为了填满格子硬造图形。

---

## 2. 页面组件范式

1. `.vitepress/theme/components/<Name>Page.vue` —— UI（`<script setup lang="ts">`）
2. `.vitepress/theme/index.ts` 里 `import` + `app.component('<Name>Page', …)`
3. `design/<name>.md` 极简：
   ```md
   # 页面标题

   说明文字…

   <IconGalleryPage />
   ```
4. 需要在 `config.mts` 的 `'/design/'` 分组里加 `{ text, link }`（只加菜单不建页 → 死链，VitePress 构建会报）

样式用 VitePress 变量 `--vp-c-bg-soft` / `--vp-c-text-1~3` / `--vp-c-divider` / `--vp-c-brand-1` / `--vp-font-family-mono`，自动跟随文档亮暗主题。

**图标类页面**：预览容器设 `color: var(--vp-c-text-1)`，并让内联 SVG 用 `currentColor`。若 SVG 是构建期烘死了固定色的（如导航图标 `#9a9aa3`），解析时替换成 `currentColor`，否则暗色主题下会看不清。

### 2b. 布局陷阱（本项目实测）

- **`.vp-doc` 的内容列在 1280 视口下只有约 624px 宽**（不是你以为的 800+）。一旦做「名称 + 两列取值」的三列栅格，固定取值列（如 `175px`）会把名称列压到 238px，长标识符被 `text-overflow: ellipsis` 截断。
  - **正解是折行而不是截断**：标识符与取值都设 `overflow-wrap: anywhere`，去掉 `white-space: nowrap` / `text-overflow: ellipsis`。截断会让人读不到全名，而这是参考页的核心价值。
  - 不要试图靠 `aside: false` 加宽 —— VitePress 的 `.content-container` 上限仍是 688px。
- **别用 `repeat(auto-fill, minmax(280px, 1fr))` 做「对比表」的多列卡**。行内若用 `grid-template-columns: 1fr auto auto`，某个 `rgba(255, 255, 255, 0.06)` 这类长值会把 `auto` 轨道撑爆，`1fr` 的名字列塌成逐字竖排。改成**单列全宽 + 固定像素取值列 + 表头行**。
- **半透明色块的棋盘底纹要用 `backgroundColor` 写**。内联 `style="{ background: X }"` 的 `background` **简写会重置** CSS 类里的 `background-image`，棋盘格直接消失。
- 给「取值 / 标识符」这类可复制内容加 `:title` 兜底，长值即使折行也有完整提示。
- 长清单加 `position: sticky; top: var(--vp-nav-height, 64px)` 的列头行很值；但注意 VitePress 导航栏是半透明 + `backdrop-filter`，滚动内容会透出一点模糊影子，这是框架默认表现，不是 bug。

---

## 3. ⚠️ 验证：curl 在 dev 下没用

**dev server 对任意路径都返回同一个 ~503B 的 SPA 壳**，连不存在的路由也返回 200。所以 `curl -o /dev/null -w '%{http_code}'` 完全无法区分「页面存在 / 404」—— 别用它下结论。

必须用真实浏览器：

```js
const p = await (await chromium.launch({ executablePath: <缓存的chromium>, args:['--no-proxy-server'] })).newPage()
await p.goto('http://127.0.0.1:5180/design/icons', { waitUntil:'domcontentloaded' })
await p.waitForTimeout(3000)
await p.locator('.NotFound').count()                    // 0 = 不是 404 页
await p.locator('.vp-doc h1').first().textContent()     // 校验标题
await p.$$eval('.VPSidebarItem', els => …)              // level-N class 校验侧边栏层级
```

补充要点：
- Playwright 在本机需显式 `executablePath` 指向缓存的 chromium。本项目路径：
  `~/Library/Caches/ms-playwright/chromium-1200/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
- **ESM 脚本不认 `NODE_PATH`**。`import 'playwright'` 会报 `ERR_MODULE_NOT_FOUND`。把脚本写到**含 `node_modules` 的那个目录**再运行（本项目 Playwright 装在 `/Users/jerry/.workbuddy/binaries/node/workspace`）。
- **别用 Bash heredoc（`cat <<'EOF'`）写含 `${...}` 模板字符串的脚本** —— zsh 会报 `Bad substitution: ...`。改用 Write 工具直接写文件。
- `page.screenshot()` **会卡在 `waiting for fonts to load`** 超时。改用 CDP：
  ```js
  const cdp = await p.context().newCDPSession(p)
  const { data } = await cdp.send('Page.captureScreenshot', { format:'png' })
  ```
  页面很长时全页截图会有上万像素高、没法审阅；改成分区域截（`scrollIntoViewIfNeeded()` + `window.scrollBy`）再 `Page.captureScreenshot`（不带 `captureBeyondViewport`）。
- 断言「内容真的渲染了」要数具体节点（如 `.ig-cell` 数量）并**与预期总数比对** —— 只判断 h1 存在会漏掉「少了一整组数据」这类静默失败。
- **顺手量一下有没有被截断**，这是排版类改动最容易漏的静默失败：
  ```js
  [...document.querySelectorAll('.tv-name code')].filter(c => c.scrollWidth > c.clientWidth + 1).length  // 期望 0
  ```
- **最后跑一次 `node node_modules/vitepress/bin/vitepress.js build`**（约 7s）。这一步同时验证 SSR 安全（`document`/`navigator` 误用在模块顶层会在这里炸）与死链，比在浏览器里逐个点便宜得多。既有的 `chunks are larger than 500 kB` 警告与改动无关，可忽略。
- 残留的单个 404 console 错误先别急着追：多页连续导航时中途 abandon 的模块请求会记成 404。用 `waitUntil: 'load'` 逐页完整加载再复测，若 `response` 里没有任何 ≥400 就是虚警。
- 想确认「没有未注册组件的裸标签残留」，在页面里查一下自定义元素是否真的没被解析：
  ```js
  ['tokenshowcase','icongallerypage'].filter(t => document.querySelector(t))  // 期望 []
  ```
- **写验证脚本前先查真实的 class / 文案**，别照记忆猜选择器。本项目脚本里猜的 `.tv-stat-num`（实为 `.tv-stat-v`）和页签文案 `text=对话`（实为「侧栏 · 聊天区」）都直接让 Playwright 超时 30s。稳妥做法：先 `[...document.querySelectorAll('.tv-tab')].map(e=>e.textContent.trim())` 打印一遍，再用 `locator('.tv-tab').nth(i)` 按下标点，避免文案耦合。
- ⚠️ **macOS 自带 BSD `grep` 不支持 `\|` 交替**：`grep "radius\|ValueKind" f.ts` 会**静默返回空**（不报错、退出码 0），极易误判成「改动没落盘」。一律用 `grep -E "a|b"`。

---

## 4. 改动自检清单

- [ ] 解析出的条目数 == 预期（写死一个期望值比对，别只看"有内容"）；条数可疑时另写一套实现重新数
- [ ] 每个分组都在 chips/列表里出现
- [ ] 浏览器里无 `.NotFound`、h1 正确、侧边栏层级正确、无未解析的裸组件标签
- [ ] 亮色 + 暗色都截一张图确认内容可见
- [ ] 交互（搜索 / 切换 / 复制）逐个点一遍，复制用 `navigator.clipboard.readText()` 回读校验
- [ ] 文本**零截断**（`scrollWidth > clientWidth` 计数为 0），620px 窄屏无横向溢出
- [ ] 若页面按「值类型/分组」切换可视化或列表：**每一类都数一遍渲染出的元素数并逐档作用域分测**，任一为 0 视为死分支
- [ ] 改过 `config.mts` 侧边栏：确认新增的二级项数与预期一致（`.VPSidebarItem.level-2` 计数），且每个锚点真的能滚到目标位置
- [ ] `vitepress build` 通过（SSR 安全 + 无死链）
- [ ] 若改了旧文档，检查是否有与代码不符的表述 / 指向不存在组件的引用，并补上与新页的互链
