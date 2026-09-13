---
name: project-docs-site
description: 把任意项目（尤其前端 / 设计系统 / 组件库）的源码资产，整理成「文档=实现」的结构化文档站。基于 VitePress 单轨，四大板块（指南 / 设计 / 组件 / API），配置驱动，可交互预览优先于截图。多个项目时可在上层加一个「项目管理门户」页面统一入口（搜索 + 筛选 + 6 列卡片）。适用：设计师或前端想把单个或多个项目做成规范化文档站时。
---

# project-docs-site —— 把项目做成结构化文档站

让**任何一个设计师 / 前端**都能把自己的项目，整理成「文档 = 实现」的结构化文档站。
不要求读源码、不要求写解析器；脚本负责数资产、生成导航，人只做确认与填空。

## 这套方案值钱在哪（三层）

| 层 | 内容 | 可迁移性 |
|---|---|---|
| 表现层 | VitePress 主题 / 侧边栏 / 搜索 / 亮暗 | 低（换静态站框架都有） |
| **机械层** | `DemoBlock` / `ComponentShowcase` / `ComponentGallery` / `IconGalleryPage` / `TokenVariablesPage` / 通用解析器 | **高（核心沉淀）** |
| **方法论层** | 四大板块 IA、页面骨架模板、「文档=实现」、导航即目录、先梳理后实施 | **最高（不写代码也成立）** |

本 skill 打包的是**后两层**。

## 六条硬约束（原则）

1. **四大板块分离**：指南（怎么用/为什么）· 设计（长什么样/怎么复现）· 组件（是什么/参数）· API（怎么调用/返回什么）。指南与参考必须分离。
2. **文档 = 实现，不漂移**：可视化页面在构建期解析**真实源码**，不存人工快照。快照过期会无声无息（旧 `tokens.json` 报 248、真实 250）。
3. **一个条目一个骨架**：组件页 / 命令页标题层级逐字相同，字段缺写「无」，不自由发挥。
4. **可交互优先于截图**：能跑真组件就绝不放静态图。
5. **导航即目录**：长页面 + 锚点 + 侧边栏二级菜单，优于拆成 N 个碎页。新增资产只往长页追加 + 加锚点。
6. **先梳理、后实施**：动笔前先产「资产清单 + 导航树」给用户确认（强制卡点，跳过会返工）。

## 五个阶段（执行流程）

| 阶段 | 做什么 | 产出 | 门槛 |
|---|---|---|---|
| **Phase 0 勘察** | 脚本扫项目，自动数资产 | `inventory.json` + `INVENTORY.md` + `ia.json`（起始 IA） | 每类资产用两套信号互验；标命中「源码」还是「快照」；给「建议板块 + 理由」 |
| **Phase 1 定 IA** | 用户确认 `ia.json` 的板块 / 分类 / 条目 | 确认后的 `ia.json` | **强制卡点**：每个资产有归属，无「其他」垃圾桶；用户确认 |
| **Phase 2 立骨架** | `new-site.mjs` 起站 + 改 `docs.config.ts` | 可跑的 `docs-site/` | `docs:dev` 起得来、`docs:build` 过、侧边栏与 IA 一致 |
| **Phase 3 逐条填** | 按模板填空 | 各板块页面 | 每个条目有实时预览或写明为何无；快照数据页头有来源标注 |
| **Phase 4 校验** | `verify-docs.mjs` | 验收报告 | 数字全对得上（不是"看起来没问题"）+ 截图给人看 |
| **Phase 5 门户**（多项目时） | 加一层「项目管理」门户页，统一入口 | `index.html` + `serve.mjs` | 点卡片能进文档且**样式正常**；1920 下 6 列；嵌套页不 404 |

## 怎么用（最短路径）

```bash
# 1) 起一个干净骨架（自动剥离 demo 资产）
node scripts/new-site.mjs <你的 docs-site 目录> --name "项目名"

# 2) 装依赖
cd <docs-site> && npm install

# 3) 勘察：扫你的项目根，产出清单 + 起始 IA
node scripts/scan-project.mjs --root <项目根> --out .

# 4) 确认 ia.json（板块 / 条目），然后生成导航
node scripts/build-nav.mjs

# 5) 接真实资产：改 theme/docs.config.ts + scripts/gen-assets.mjs，按 templates/ 填空

# 6) 校验
npm run docs:build && node scripts/verify-docs.mjs
```

## 多项目：加一层「项目管理门户」

只有一个项目时跳过。有≥2 个项目时，在**所有文档站之上**加一个门户首页：
门户管所有项目，点卡片进入对应项目文档（**上下两层，不是平级导航**）。

```text
开发者文档/
├── index.html      ← 门户（纯静态，无构建）
├── serve.mjs       ← 本地预览（支持 VitePress cleanUrls）
├── <项目A>/         ← 文档站构建产物
└── docs-site/      ← 项目 A 的 VitePress 源码
```

**⚠️ 最容易做错**：在 `docs-site` 里加一个「项目」菜单项或页面——那是文档站的**子页面**，层级反了。
门户必须独立于任何单个文档站。

**最容易踩的三个坑**（详见 `references/multi-project-portal.md`）：
1. **下钻后页面没样式**：文档站没按子路径构建。必须用 `vitepress build --base /<项目名>/`，
   否则产物引用 `/assets/*.css` 在子路径下全 404。→ **重建文档只能跑 `docs:build:portal`**。
2. **二级页 404**：VitePress `cleanUrls` 把 `/a/b` 落成 `a/b.html`，`python -m http.server` 补不了 `.html`。
   → 用 `templates/serve.mjs`。
3. **点卡片跳走门户**：项目链接一律 `target="_blank" rel="noopener"`，不要只在外部链接上加。

模板：`templates/portal-index.html`（改 `PROJECTS` 数组即可）、`templates/serve.mjs`。

## 你唯一要手改的两个文件

- **`theme/docs.config.ts`** —— 产品名、板块开关、预览作用域、token/图标源清单、数据来源标注。
- **`scripts/gen-assets.mjs`** —— `SOURCES`（读哪些 `?raw` 文件）/ `LOADERS`（哪些真实组件可挂载）。
  Vite 要求 `?raw` 与 `import.meta.glob` 的路径是**静态字面量**，不能拼字符串，所以「读哪些文件」落到生成文件里，改完重跑生成。

## 资产来源：源码优先 + 快照兜底（硬性约束）

- 读得到仓库 → **源码**（`?raw` 取原文 → 解析器解析），文档永远等于实现。
- 读不到（设计稿还没落成代码）→ **快照**，但必须在页头渲染来源标注（`SourceBadge` 的 snapshot 模式），且 `docs.config.ts` 的 `sources` 里标 `kind:'snapshot'` 并带 `syncedAt` / `via`，**否则构建直接失败**（`lib/source-meta.ts` 的 `assertSourcesComplete`）。

## 必须知道的坑（详见 references/pitfalls.md）

1. 组件看不见 = `preview.css` 没同时 import token + 组件样式，或 token 没限定作用域。
2. 624px 列宽会被 VitePress 截断 → 长表格用横向滚动容器。
3. 棋盘格 `background` 简写会重置单轴属性。
4. `Duplicate attribute`：预览容器的作用域与主题属性要合并成一个 `v-bind`。
5. 快照过期无声 → 用上面的 `assertSourcesComplete` 兜底。

## 参考文件（别塞进本文件，避免过胖）

- `references/setup.md` —— 设计师唯一必须过的技术门槛（装 Node → npm i → dev/build）。
- `references/pitfalls.md` —— 9 类坑的完整清单。
- `references/verify-checklist.md` —— 每个阶段的验收门槛（硬数字）。
- `references/walkthrough.md` —— **第二个真实项目（antd-ui-kit，React+TS）的端到端记录**，证明本 skill 不止在本项目成立。
- `references/adapters/` —— 四类资产的接入方式（tokens / icons / components / api）。
- `references/multi-project-portal.md` —— **多项目门户**：层级、数据模型、布局规格、三个必踩的坑、验收清单。
- `templates/` —— 6 份页面骨架（home / guide / token / gallery / component / api），抄了就能填；
  外加门户两件套 `portal-index.html` + `serve.mjs`。

## 明确不做

- 不做在线托管 / 部署流水线（只产出本地站点）。
- 不做 Markdown 所见即所得编辑器。
- 不追求「一次生成全部页面」—— 原则 6 要求先定 IA、逐条填。
- 不做静态 HTML 降级版（已确认 VitePress 单轨）。
