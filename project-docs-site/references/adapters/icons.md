# 适配器 · 图标

## 形态 A · JS/TS 源码里的字符串常量（最常见）

**特征**：`const ICONS = { search: '<svg …>', close: '<svg …>' }`，且这些常量**通常没有 export**。

**做法**：`?raw` 取源码原文 → `iconsFromSource()` 解析。**不需要为了写文档去改业务代码加 export** —— 这正是 `?raw` 的价值。

```ts
// docs.config.ts
iconSources: [
  {
    id: 'icons',
    group: '聊天区',
    source: 'src/chat-icons.js',
    from: { rawKey: 'icons/chat' },
  },
]
```

**三种变体**：

| 情况 | 配置 |
|---|---|
| 值就是完整 `<svg>` | 默认即可（`prefix` 默认 `'<svg'`） |
| 值只是裸 `<path>` 片段 | `prefix: '<path'` —— 会自动套一层标准 svg 外壳 |
| 一个文件里混了两组图标 | 用 `nameIn: ['a','b']` 按变量名筛 |
| 图标是构建期烘死的灰色（如 `#9a9aa3`） | `muteHex: ['#9a9aa3']` —— 归一成 `currentColor`，否则不跟随文档主题 |

---

## 形态 B · 独立 SVG 文件目录

**特征**：`src/assets/icons/*.svg`，一个文件一个图标。

**做法**：用 `import.meta.glob`，文件名即图标名：

```ts
const mods = import.meta.glob('../../src/assets/icons/*.svg', {
  eager: true, query: '?raw', import: 'default',
})
// → iconsFromGlob(mods, { group: '导航图标', source: 'src/assets/icons/' })
```

**注意**：glob 的路径必须是**字面量**，不能拼字符串。`gen-assets.mjs` 会把它生成到 `assets.generated.ts` 的 `GLOBS` 里。

---

## 形态 C · 图标字体 / iconfont / 第三方图标库

**特征**：图标不是 SVG 字符串，而是 `<i class="icon-search">` 或 Unicode 码点。

**做法**：优先找该库自身的 SVG 源（大多数 iconfont 包都附带 `.svg` 或 JS 对象），走形态 A/B。

实在拿不到 SVG 时，退到快照模式：导出一份 `{ name, unicode }` 的 JSON，页面上用图标字体渲染。**必须标注快照来源与时间。**

> 顺带一提：**能不用图标字体就别用**。这条本身就是文档站该告诉读者的事 —— 「项目自有 SVG 图标，没有引入第三方图标库」是个值得写进指南的事实。

---

## 图标页能自动做的三件事

`IconGalleryPage` 已经内置，不用自己写：

1. **点击复制名称** —— 复制的是源码里的键名，直接能贴回代码
2. **统一切换线宽** —— 只在 `kind: 'stroke'` 的图标上生效，用来比对不同粗细下的观感
3. **按分组筛选 + 搜索** —— 分组来自 `iconSources` 的 `group`

**填充型图标（`fill`）没有描边**，线宽滑块对它们无效 —— 这是正确行为，不是 bug。若某组图标本该是线性却被判成填充，检查其 SVG 是否写了 `stroke="currentColor"`。

---

## 数量对不上的常见原因

| 现象 | 原因 |
|---|---|
| 少了一批 | 那些图标的字面量不在 `key: '…'` 形式里（如数组元素、函数返回）—— 正则只认键值对 |
| 多了一些 | 该文件里除了图标表还有别的 `<svg>` 字符串，用 `nameIn` 收窄 |
| 全部为 0 | `rawKey` 指错了文件，或该文件没被 `gen-assets.mjs` 登记 |
