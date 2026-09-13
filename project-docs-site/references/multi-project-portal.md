# 多项目门户（Project Portal）

当**不止一个项目**要做文档站时，在上面加一层「项目管理门户」：门户管所有项目，点卡片进入对应项目文档。

## 一、先搞清层级（最容易做错）

```
开发者文档/            ← 门户（一级，管所有项目）
├── index.html        ← 门户首页：项目卡片 + 搜索 + 筛选
├── serve.mjs         ← 本地预览服务器（支持 cleanUrls）
├── <项目A>/           ← 项目 A 的文档站（VitePress 构建产物）
├── <项目B>/           ← 项目 B 的文档站
└── docs-site/        ← 项目 A 的 VitePress 源码
```

**门户与文档是上下两层，不是平级导航。**

> ⚠️ 常见误解：在 `docs-site` 里加一个「项目」菜单项／页面。
> 那是错的——它是文档站的**子页面**，层级反了。门户必须独立于任何单个文档站存在。

## 二、门户是纯静态页（无构建）

`index.html` 自带样式与脚本，项目数据写在 `<script>` 里的 `PROJECTS` 数组。改数据即所见，不需要 npm。

## 三、数据模型

```js
{
  id: 'my-project',        // 唯一标识（星标持久化、头像取色）
  name: '我的项目开发者文档',
  description: '一句话简介',  // 参与搜索
  tags: ['Web', '组件库'],   // 参与搜索
  status: 'active',        // active 已上线 | planning 规划中 | archived 已归档
  visibility: 'public',    // public | private（显示锁图标）
  url: 'my-project/',      // 相对路径（子路径站点）或 https 链接（外部站）
  createdAt: '2026-08-20', // 列表「创建时间」列
  updatedAt: '2026-09-13', // 「编辑于 X」+ 分组依据
  owner: '我的团队',        // 自动进入「维护方」筛选
  favorite: false,         // 默认星标（点击可切换，存 localStorage）
  accent: '#3451b2',       // 头像/缩略图主色
}
```

**可点击判定**：`status === 'active'` 且 `url` 非空。否则卡片变灰、不可点——
这样 roadmap 里的「规划中」项目能列出来，但不会点进 404。

## 四、布局规格（对齐主流项目库，如 GitHub/Linear 的 Projects）

| 项 | 规格 |
|---|---|
| 网格列数 | 默认 `repeat(6, minmax(0,1fr))`，**封顶 6 列**；断点 1700/1400/1120/820/540 → 5/4/3/2/1 |
| 容器 | `max-width: 1880px`，左右 padding 28px（1920 下卡片约 287px） |
| 工具条 | 搜索框（匹配 名称/简介/标签/维护方）+ 4 个筛选下拉（排序 · 可见性 · 状态 · 维护方）+ 网格/列表切换 |
| 分组 | 按 `updatedAt` 距今天数：≤14 天 / 15–60 天 / >60 天；组标题带计数胶囊 |
| 卡片 | 内联 SVG 生成的「文档页」缩略图（**不依赖外部图片**）+ 状态徽章 + 星标/私有锁 + 头像 + 名称 + 「编辑于 X」 |
| 列表模式 | 真表格：粘性表头（名称 / 创建时间 / 维护方 / ★），行=小缩略图+名称+「编辑于 X·状态」\| 创建时间 \| 头像+owner \| 星标 |
| 列表列比例 | `minmax(0,2fr) minmax(0,1.05fr) minmax(0,1fr) 44px` → 1920 下表头落在 ~47% / ~72% / ~95% |
| 星标 | 点击切换，存 `localStorage['doc-portal:favorites']`（存「被收藏 id 集合」） |

**缩略图用内联 SVG 画**：一个带侧边栏和正文线框的「文档页」，按 `accent` 上色。
好处是零外部依赖、可离线、换项目只改颜色。

## 五、三个必踩的坑

### 坑 1：VitePress base —— 下钻后页面「乱码」（没有样式）

**现象**：门户点进文档，页面变成无样式的纯文本。

**根因**：文档站用 VitePress 默认 `base:'/'` 构建，产物里全是对 `/assets/*.css` 的**绝对路径**引用；
但站点挂在 `/<项目名>/` 子路径下，这些路径全部 404 → CSS/JS 全丢。

**修复**：构建时显式指定 base 和输出目录。

```jsonc
// docs-site/package.json
"scripts": {
  "docs:build": "vitepress build",                                              // 默认 base，子路径下必挂
  "docs:build:portal": "vitepress build --base /my-project/ --outDir ../my-project",  // ✅ 用这个
  "docs:dev:portal": "vitepress dev --base /my-project/",
}
```

> **约定：重新构建文档必须用 `docs:build:portal`，不能只跑 `docs:build`。**
> 否则 base 回退到 `/`，样式又会全丢。这是最容易复发的问题。

### 坑 2：cleanUrls 需要服务器支持，否则二级页 404

VitePress 的 `cleanUrls`（默认开）把 `/guide/architecture` 落盘成 `guide/architecture.html`。
`python -m http.server` 不会自动补 `.html`，于是**首页正常、二级页全 404**——很容易误判成构建坏了。

用 `templates/serve.mjs`（纯 Node，无依赖），`resolveFile()` 依次尝试：
`base` → `base + '.html'` → `join(base, 'index.html')`。

```bash
node serve.mjs 5190     # http://127.0.0.1:5190/ 即门户；/my-project/ 即文档
```

### 坑 3：相对路径 + 新标签页

门户里的项目 `url` 用**相对路径**（`'my-project/'`），配合 `target="_blank"`：
浏览器按当前页解析成 `/my-project/`，在新标签页打开，门户保留在前台。

```js
// card() / row() 里：
const attrs = ' target="_blank" rel="noopener"'   // 一律新标签页，不要只在外部链接上加
```

判断「是否外部」不要再用来决定 target——同源子路径也要新开标签。

## 六、可选：文档里放「返回门户」链接

VitePress 的 `themeConfig.nav[].link` **会被 base 前缀化**，无法用 nav 项链接到 base 之外的门户根。
要加返回链接，只能覆盖 `Layout` 用原生 `<a>`：

```ts
// .vitepress/theme/index.ts
import BackToPortalLayout from './components/BackToPortalLayout.vue'
export default { extends: DefaultTheme, Layout: BackToPortalLayout, enhanceApp({ app }) { /* … */ } }
```

```vue
<!-- BackToPortalLayout.vue -->
<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
const { Layout } = DefaultTheme
const portalHref = ((import.meta as any).env?.BASE_URL ?? '/').replace(/[^/]+\/$/, '')
</script>
<template>
  <Layout>
    <template #nav-bar-title-after>
      <a :href="portalHref" target="_blank" rel="noopener">← 返回项目管理</a>
    </template>
  </Layout>
</template>
```

要点：
- `portalHref` 由 base 取上一级（`/my-project/` → `/`），不写死 host，挂任何子路径都对。
- `#nav-bar-title-after` 会 **SSR 进初始 HTML**，每个文档页（含嵌套页）都有。
- 改完**必须重新 `docs:build:portal`**，否则产物不带返回链接。

> 本项目最终**没有保留**这个返回链接（用户反馈去掉了），保留方案备查。

## 七、验收清单

- [ ] 门户 `/` 200，卡片渲染出项目名
- [ ] 点卡片 → 新标签页打开 `/<项目>/`，**样式正常**（不是纯文本）
- [ ] 嵌套页（如 `/<项目>/guide/architecture`）200，不 404
- [ ] 1920 窗口下 `getComputedStyle(grid).gridTemplateColumns` 是 **6 列**
- [ ] 搜索 / 各筛选 / 网格-列表切换 均生效
- [ ] 星标点击后刷新仍保留
- [ ] 非 active 或 url 为空的项目不可点击

## 八、模板

- `templates/portal-index.html` —— 门户首页（改 `PROJECTS` 数组即可）
- `templates/serve.mjs` —— 支持 cleanUrls 的本地预览服务器
