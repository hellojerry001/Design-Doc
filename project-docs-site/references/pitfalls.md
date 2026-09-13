# 踩坑清单

全部来自真实事故，不是预防性建议。按「症状 → 根因 → 解法」组织，方便按症状反查。

---

## 1. 组件渲染出来了，但看不见

**症状**：预览区一片空白，控制台没有报错，DOM 里确实有元素。

**根因**：token 文件**只被解析、没被引入**。组件里 `background: var(--x-accent)` 取不到值，CSS 变量在计算值阶段失效 → 属性回退到初始值（透明）。

**解法**：`theme/preview.css` 里 **token 和组件样式都要 import**：

```css
@import url('../../src/tokens.css');      /* 变量定义 */
@import url('../../src/components.css');  /* 组件样式 */
```

⚠️ 但 token 必须是**作用域限定过的**（`#pageChat { … }` / `.demo-scope { … }`）。挂在 `:root` 上的全局 token 文件千万别 import —— 它会覆盖 VitePress 自己的 `--vp-*` 变量，把整个文档站 UI 搞坏（顶栏、侧边栏、搜索框一起歪）。设计变量的**展示**走「解析源码 + 渲染字面值」，不注入真实 CSS。

---

## 2. 内容宽只有 ~624px，长变量名被截断

**症状**：三个取值列排下去后变量名列被压到 230px 左右，长名字变成 `--demo-color-semant…`。

**根因**：VitePress 的 `.vp-doc` 在 1280 视口下实际内容宽只有 **624px**（不是视口宽）。按 1280 设计的固定列宽必然溢出。

**解法**：变量名与取值都改成**折行**，不要靠截断：

```css
.tv-name code, .tv-val {
  white-space: normal;        /* 不要 nowrap */
  overflow-wrap: anywhere;    /* 长 token 名没有空格，必须 anywhere */
  text-overflow: clip;        /* 不要 ellipsis */
}
```

零截断是可断言的：`[...document.querySelectorAll(sel)].filter(e => e.scrollWidth > e.clientWidth + 1).length === 0`。

---

## 3. 半透明色块的棋盘底纹消失

**症状**：检查 `rgba(255,255,255,0.06)` 这类色值时，格子背景没了，看起来像纯色。

**根因**：内联 `style="{ background: X }"` 的 **`background` 简写会把 CSS 类里的 `background-image` 重置掉**，棋盘底纹正是用 `background-image` 画的。

**解法**：拆成两层 —— 外层的 `.tv-sw` 负责棋盘（`background-image`），内层的 `.tv-sw-fill` 负责颜色（`backgroundColor`）：

```html
<span class="tv-sw"><span class="tv-sw-fill" :style="{ backgroundColor: v }" /></span>
```

**永远用 `backgroundColor` 而不是 `background`。**

---

## 4. 多列网格被长值撑爆

**症状**：`repeat(auto-fill, minmax(280px, 1fr))` 的卡片列表里，名字列塌成逐字竖排。

**根因**：值里出现 `rgba(255, 255, 255, 0.06)` 这种**带空格的长串**，把 `1fr auto auto` 里的 `auto` 轨道撑到极限，剩下的 `1fr` 被压到接近 0。

**解法**：对照表用**单列全宽 + 固定列宽的列**，别用 auto-fill 多列卡。列数随数据变化时用内联 `gridTemplateColumns`：

```html
:style="{ gridTemplateColumns: `minmax(0,1fr) repeat(${SCOPES.length}, minmax(0,1fr))` }"
```

`minmax(0, 1fr)` 里的 **0 不能省** —— 写 `1fr` 时内容仍能把轨道撑开。

---

## 5. 覆盖块的变量全跑到了最后一个分类

**症状**：解析 CSS 时，本该属于「Color · Semantic」的暗色覆盖声明，全被归到「Legacy aliases」。

**根因**：**覆盖块里通常没有区块注释**（`/* ── X ── */`），解析器只好用「当前 section」——也就是文件里最后出现过的那个。

**解法**：按变量名 join 基础块，section 取 `(base ?? override).section`。见 `lib/parse-css-tokens.ts` 的 `buildScopeRecords`。

---

## 6. 圆角 / 字号的可视化恒为 0

**症状**：某个「按值类型给可视化」的 kind 一个都没渲染出来，且**不报任何错**。

**根因**：判类型只看值。`12px` 既可能是间距、也可能是圆角或字号，只靠正则会把所有 px 判成 `length`，于是模板里 `kind === 'radius'` 的分支永不命中。

**解法**：判类型要带上**所在分类与变量名**：`kindOf(value, sectionLabel, name)`。

**排查手法**：逐个 kind 数渲染出的元素，任一为 0 就是死分支 —— 不要靠肉眼截图。

```js
{ 色块:'.tv-sw-fill', 长度条:'.tv-bar', 圆角块:'.tv-rad',
  缓动:'.tv-ease', 阴影:'.tv-shadow', 字号:'.tv-fontsize', 字体:'.tv-font' }
```

反过来，兜底空槽 `.tv-vis-none` **是合理的**：`font-weight`、无单位 `line-height`、`z-index`、`0` 这类值本来就没有视觉表示，右侧取值列已展示原值，别为了填满格子硬造图形。

---

## 7. 快照悄悄过期

**症状**：文档里的数字和代码对不上，但没有任何报错。曾有一个人工导出的 `tokens.json` 报 248 个变量，而真实源码是 250。

**根因**：快照是静态文件，源码改了它不会动，也不会有人发现。

**解法**：两条一起上 ——

1. 能用源码就用源码（`?raw` 构建期解析），从根上消除快照
2. 实在只能快照时，**必须在页头渲染来源与同步时间**（`SourceBadge`），且 `snapshot` 类型缺 `syncedAt` / `via` 时**直接让构建失败**：

```ts
assertSourcesComplete(docsConfig.sources)  // 缺字段就 throw，宁可构建挂掉
```

**数字要两套独立实现互验**。只数一遍就会像上面那样悄悄错 2 个。

---

## 8. VitePress 特有

| 症状 | 根因 | 解法 |
|---|---|---|
| `Duplicate attribute` | 一个元素上写了两个 `v-bind="obj"` | 合并成一个对象再绑 |
| 具名插槽内容不渲染 | 用了 `#default`，但组件只认 `#<item.id>` 具名槽 | 看组件的 `<slot :name="…">` 用对槽名 |
| 组件预览在构建时报 `window is not defined` | 真实组件在模块顶层访问 `window` | 包 `<ClientOnly>` + 在 `onMounted` 里动态 `import()` |
| dev 环境 `curl` 任何路径都返回 200 | dev 有 SPA fallback，无法区分真实路由 | 验证必须用真实浏览器，别用 curl 判存在性 |
| `page.screenshot()` 卡在 waiting for fonts | Playwright 等字体加载超时 | 改用 CDP `Page.captureScreenshot` |

---

## 9. 验证脚本的坑

- **`vitepress build` 是最省事的一步**（约 2–7s），一次同时验 SSR 安全与死链。既有的大 chunk 警告与你的改动无关，可忽略。
- **别猜选择器**。写验证脚本前先把真实 class 与文案打印一遍，否则会等到 Playwright 30s 超时才发现 `.tv-stat-num` 其实叫 `.tv-stat-v`。页签按 `locator('.tv-tab').nth(i)` 点，不要按文案匹配。
- **⚠️ macOS 自带 BSD `grep` 不支持 `\|` 交替**：`grep "radius\|ValueKind" f.ts` 会**静默返回空**（退出码还是 0），极易误判成「改动没落盘」。一律用 `grep -E "a|b"`。
- **别用 Bash heredoc 写含 `${…}` 的脚本** —— zsh 会报 `Bad substitution`。用编辑器/写文件的方式。
- **ESM 脚本不认 `NODE_PATH`**。`import 'playwright'` 必须在含 `node_modules` 的目录下运行。
- **残留的单个 404 先别追**：连续导航时中途 abandon 的模块请求会记成 404。改成先记录 `response` 事件里所有 ≥400 的 URL 再判断。
