# 实例：design-qa 开发者文档站（本站）

本 skill 的**第一个真实项目实例**。通用手法见 `real-source-pages.md`，这里只记**站点专属事实**——
路径、端口、组件名、类名、关键数字。换项目时整份替换即可。

## 站点事实

| 项 | 值 |
|---|---|
| 站点根 | `开发者文档/docs-site`（VitePress 1.6.4） |
| 启动 | `node node_modules/vitepress/bin/vitepress.js dev --port 5180 --strictPort --host 127.0.0.1` |
| 端口 | **5180**。5173 留给插件 side panel 预览（`npm run preview:ui`），不要占用 |
| 主题 | `.vitepress/theme/`（`index.ts` 注册组件，`components/*.vue`） |
| 侧边栏 | `.vitepress/config.mts` 的 `themeConfig.sidebar`，按路径前缀分组（`/guide/`、`/design/`、`/components/`、`/api/ipc/`、`/api/http/`） |
| 热更新 | 改 `.md` / 主题文件 HMR；改 `config.mts` 会**自动重启**整个 dev server |
| 同源源码 | `design-qa-desktop/src/**`（从 `theme/` 起算 `../../../../` 到仓库根） |

## 四大板块与入口

指南 `/guide/` · 设计 `/design/` · 组件 `/components/` · API（IPC + HTTP）`/api/ipc/`、`/api/http/`

## 已注册的主题组件

`DemoBlock` · `CopyCodeBlock` · `ComponentShowcase` · `ComponentGallery` · `ComponentGalleryPage` ·
`IconGalleryPage` · `TokenVariablesPage`，外加 `components/demos/*.vue` 的**自动注册**（`import.meta.glob` eager，
按文件名转 PascalCase，新增演示只需丢一个 `.vue` 进 `demos/`，不用手动登记）。

## 数据页与关键数字（验收用硬指标）

| 页面 | 选择器 | 期望 |
|---|---|---|
| 图标资源 `/design/icons` | `.ig-cell` | 27 个（DQUI 用**反引号**定义，解析正则漏了反引号会静默少一整组） |
| 设计变量 `/design/tokens` | `.tv-sw-fill` / `.tv-bar` / `.tv-rad` / `.tv-ease` / `.tv-shadow` / `.tv-fontsize` / `.tv-font` | 每一类都 > 0，任一为 0 = 死分支 |
| 设计变量作用域档位 | `.tv-tab` | **逐档分别数**：侧栏 ~102 行 vs 插件端 ~250 行，差很大 |

- 变量总数：源码真实 **250**。历史人工快照 `tokens.json` 报 248 —— 这个差 2 就是「快照过期」的实证，
  也是本 skill 坚持"源码优先"的由来。
- `document.querySelector('tokenshowcase')` / `('icongallerypage')` 应为 `null`（无裸标签残留）。

## 本项目专属的两个禁区

1. **不要 import 插件端的 `:root` 样式文件**——它的裸 Legacy 别名（`--bg` / `--text` / `--accent` / `--border`）
   会覆盖 VitePress 自己的变量，把文档站 UI 搞坏。
   token 一律只渲染**解析出来的字面值**（色块用 `backgroundColor`、长度条用百分比），不注入真实 CSS。
   反过来，`theme/index.ts` 里已 import 的 `dqui/tokens.css`（`#pageChat` 作用域）是安全的，因为它不碰 `:root`。
2. **别把桌面端的主题机制记错**——本站侧栏的「基础块 / 覆盖块」是**无条件覆盖**，
   不是 `@media` 双主题（那是插件端的机制）。旧文档曾记反。

## 构建命令

```bash
cd 开发者文档/docs-site
npm run docs:build          # 常规构建（base '/'）
npm run docs:build:portal   # ✅ 门户子路径构建：--base /design-assistant/ --outDir ../design-assistant
```

> ⚠️ 文档挂在门户子路径下时**必须**用 `docs:build:portal`，否则 base 回退到 `/`，
> 下钻后 CSS/JS 全 404、页面变纯文本。详见 `multi-project-portal.md`。
