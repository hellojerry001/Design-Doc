# 通用手法：让页面跟随真实源码（不漂移）

「文档 = 实现」的落地手段。**本篇只写 `pitfalls.md` 里没有的内容**——
布局陷阱（624px / 棋盘底纹 / auto-fill 撑爆）、解析坑（覆盖块 section 继承 / 判类型带上下文 / 两套实现互验）、
验证坑（dev 下 curl 恒 200 / CDP 截图 / BSD grep / ESM NODE_PATH）一律见 `pitfalls.md`，此处不重复。

## 1. 用 `?raw` 读源码，而不是 `import`

源码里的图标表 / 常量**常常没有 export**（`const ICONS = {...}`），`import` 拿不到。
解法是 `?raw` 取原文，在**构建期**自己解析。

```ts
// theme/icons-data.ts
import dquiSrc from '../../../../design-qa-desktop/src/dqui/components.js?raw'
```

前提是放开 Vite 的 fs 白名单（Vite 默认禁止访问 Vite root 之外的文件）：

```ts
// config.mts
vite: { server: { fs: { allow: ['..', '../..'] } } }
```

目录型文件用 glob（`query`/`import` 缺一不可，否则拿到的是模块对象不是字符串）：

```ts
const mods = import.meta.glob('../../<项目>/src/assets/icons/*.svg',
  { eager: true, query: '?raw', import: 'default' }) as Record<string, string>
```

- 相对路径从 `theme/` 起算，数清楚 `../` 的层数（到仓库根）。
- **解析是纯字符串运算，模块顶层执行即可**，不影响 VitePress 的 SSG。
  `navigator` / `document` 只能出现在事件处理函数里（否则 `vitepress build` 阶段会炸）。

## 2. 解析「未导出的对象字面量」

**不要用 `new Function` 求值**——值里可能含函数调用（如 `pin: chatIcon('pin')`），会直接抛错。
改成**只匹配字符串字面量**：

```ts
// 同时支持 '...' / "..." / `...`，按转义规则读取
const LITERAL_RE =
  /(?:^|[\s,{])(?:"([A-Za-z_$][\w$]*)"|([A-Za-z_$][\w$]*))\s*:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/gm
```

三个要点（漏了会**静默少数据**，页面看起来正常）：

- **必须包含反引号**。实测某项目 27 个图标就用反引号，漏掉后页面照常渲染但少掉一整组。
- 用 `([^"\\]|\\.)*` 而不是 `.*?`，否则值里的转义引号会提前截断。
- 抽出后做**前缀过滤**（如 `value.startsWith('<svg')`），把同一文件里别的字符串常量排除；
  非 `<svg>` 的裸路径片段（`package: '<path …/>'`）要自己套一层 `<svg …>` 外壳。

## 3. 同法解析 CSS（设计变量这类场景）

`?raw` 对 `.css` 同样有效。CSS 用**行级状态机**，不用正则套全文：

```ts
const SECTION_RE = /^\/\*\s*──\s*(.*?)\s*──\s*\*\/$/   // /* ── Component · Chip ── */
const DECL_RE = /^(--[\w-]+)\s*:\s*(.+?);?$/
// 数花括号深度：0→1 即进入一个顶层块
// @media：遇到 '@media' 开头的行置 pendingMedia，落到 depth 0→1 时记 mediaDepth，深度回落时清空
```

两个 `pitfalls.md` 未覆盖的点：

- **`var()` 引用链要递归展开**（`var(--x)` → 值；`var(--x, fallback)` → 优先解析目标，否则用 fallback）。
  做法：先把**同一文件里所有声明**灌进一个 `Map<name, value>` 再解析，
  否则拿到的是 `var(--dq-color-white)` 这种中间态，而不是最终色值。
- **别把「基础块 / 覆盖块」直接叫成「亮色 / 暗色」**。同一文件里两块的关系可能是「无条件覆盖」，
  也可能是 `@media`。先 grep 该文件有没有 `@media` / `[data-*]` 选择器再下结论——
  有项目就是把 A 端的 `@media` 双主题机制错记到了 B 端头上，文档跟着错了很久。

## 4. 页面组件四步范式

1. `.vitepress/theme/components/<Name>Page.vue` —— UI（`<script setup lang="ts">`）
2. `.vitepress/theme/index.ts` 里 `import` + `app.component('<Name>Page', …)`
   （**只 import 不注册 = 页面静默空白**，这是最常见的"组件没生效"）
3. `design/<name>.md` 极简：
   ```md
   # 页面标题

   说明文字…

   <IconGalleryPage />
   ```
4. 在 `config.mts` 对应路径分组里加 `{ text, link }`——
   **只加菜单不建页 = 死链**，`vitepress build` 会报。

样式一律用 VitePress 变量 `--vp-c-bg-soft` / `--vp-c-text-1~3` / `--vp-c-divider` / `--vp-c-brand-1` /
`--vp-font-family-mono`，自动跟随文档亮暗主题。

**图标类页面**：预览容器设 `color: var(--vp-c-text-1)`，内联 SVG 用 `currentColor`。
若 SVG 在构建期就烘死了固定色（如 `#9a9aa3`），解析时替换成 `currentColor`，否则暗色主题下看不清。

## 5. 两个小手法（提升可读性的低成本改动）

- 给「取值 / 标识符」这类可复制内容加 `:title` 兜底——长值即使折行也能悬停看到完整内容。
- 长清单的列头行加 `position: sticky; top: var(--vp-nav-height, 64px)` 很值。
  （VitePress 导航栏是半透明 + `backdrop-filter`，滚动时会透出一点模糊影子，这是框架默认表现，不是 bug。）

## 6. 补充验证项（`pitfalls.md` 之外）

- **确认没有未注册组件的裸标签残留**（没注册的组件会原样留在 DOM 里，页面看着"少了东西"却不报错）：
  ```js
  ['tokenshowcase','icongallerypage'].filter(t => document.querySelector(t))  // 期望 []
  ```
- **Playwright 在本机需显式 `executablePath`** 指向缓存的 chromium（版本与 playwright 包不匹配时必填）。
  查路径：`ls ~/Library/Caches/ms-playwright/`。
- 页面很长时**全页截图会有上万像素高、没法审阅**——改成分区域截：
  `scrollIntoViewIfNeeded()` + `window.scrollBy`，再 `Page.captureScreenshot`（**不带** `captureBeyondViewport`）。
- 切到**每一档作用域 / 每个 tab 后分别数一遍**渲染出的元素数，不能只在默认档数——
  不同作用域数量可能差很多（某项目侧栏 102 vs 插件端 250）。

## 7. 改动自检清单

- [ ] 解析出的条目数 == 预期（**写死期望值比对**，别只看"有内容"）；可疑时另写一套实现重新数
- [ ] 每个分组都在 chips / 列表里出现
- [ ] 浏览器里无 `.NotFound`、h1 正确、侧边栏层级正确、无未解析的裸组件标签
- [ ] 亮色 + 暗色各截一张确认内容可见
- [ ] 交互（搜索 / 切换 / 复制）逐个点一遍；复制用 `navigator.clipboard.readText()` 回读校验
- [ ] 文本**零截断**（`scrollWidth > clientWidth` 计数为 0），620px 窄屏无横向溢出
- [ ] 按「值类型 / 分组」切换可视化的页面：**每一类都数一遍**，任一为 0 视为死分支
- [ ] 改过 `config.mts` 侧边栏：新增二级项数与预期一致（`.VPSidebarItem.level-2` 计数），锚点真能滚到目标
- [ ] `vitepress build` 通过（一次验 SSR 安全 + 死链，约 2–7s，比在浏览器逐个点便宜得多）
- [ ] 改了旧文档：检查是否有与代码不符的表述 / 指向不存在组件的引用，并补上与新页的互链
