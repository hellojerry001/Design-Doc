# 端到端演练 · 第二个真实项目（antd-ui-kit）

> 这是 Skill §6 第 5 条「至少在一个形态不同的项目上跑过全流程」的实证记录。
> 目的：证明这套 skill 不是「只在本项目（设计验收工具 Pro）成立」。

## 被测项目

`antd-ui-kit/` —— **React + TypeScript 组件库**，有组件但**没有 token 体系**、**没有图标源**、**没有接口定义**。
形态上和原项目（Tauri 桌面端、自带 DQUI token + 图标 + IPC 接口）差异很大，正好用来验证泛化能力。

## Phase 0 · 勘察（scan-project.mjs）

```bash
node scripts/scan-project.mjs \
  --root /…/antd-ui-kit --out /tmp/antd-scan
```

实际产出（`inventory.json` / `INVENTORY.md` / `ia.json`）：

| 资产类 | 检出数 | 命中 |
|---|---|---|
| 设计变量（CSS `--*`） | 0 个文件 | — |
| 组件 | 8 个目录 → 排除 app/main 入口后 **6 个**：Button / Form / Input / Modal / Select / Table | source |
| 图标（SVG 目录 / JS 常量） | 0 | — |
| 接口 / 命令 | 0 | — |

**建议板块**：`guide ✅` + `components ✅`，`design ⬜` + `api ⬜`（理由写进 INVENTORY.md）。

> 这一步完全没读 antd-ui-kit 的业务代码，纯靠文件名 + 内容特征互验，自动得出「该开哪几个板块」。

## Phase 1 · 定 IA（build-nav.mjs）

直接拿 scan 产出的 `ia.json`（用户确认后）生成导航：

```bash
node scripts/build-nav.mjs --dir /tmp/antd-e2e
```

生成 `nav.mts`：

- 顶层板块：**指南 / 组件**（design、api 因关闭未出现）
- 侧边栏：`/guide/` 1 项；`/components/` 6 项（6 个组件各一页）

## Phase 2 · 立骨架（new-site.mjs）

```bash
node scripts/new-site.mjs /tmp/antd-e2e3 --name antd-ui-kit
# → 自动剥离 .demo-assets、删除 preview.demo.css 及其 import、清空 assets.generated.ts
cd /tmp/antd-e2e3 && npm i   # 本机用 /tmp/pds-test/node_modules 软链验证
npx vitepress build           # ✓ build complete in 1.81s
```

干净的骨架开箱即 build 通过，不会因为指向不存在的 demo 文件而炸。

## Phase 3 · 逐条填（按模板）

针对本项目的「components-only」形态：

- `docs.config.ts`：`sections.design=false, api=false`；`preview.scope=null`；`tokenScopes/iconSources/sources` 全空。
- 删除 `design/`、`api/` 目录（板块关了就不建）。
- 6 个组件页用 `templates/component-page.md` 骨架逐个填（E2E 用脚本批量生成 6 份 stub 验证骨架一致性）。

## Phase 4 · 校验（verify-docs.mjs + build 死链门）

- 先 `npx vitepress build`：VitePress 1.6.4 **默认开启死链检查**，第一次构建报出 **7 个死链**——
  根因是 `nav.mts` 还是 demo 版（仍指向已删的 `/design/*`、`/api/*`），且 `components/overview.md` 列了 6 个组件但当时只建了 1 页。
- 重新 `build-nav.mjs` 生成与 IA 一致的导航，并补齐 6 个组件页后，构建通过：

```text
✓ building client + server bundles...
✓ rendering pages...
build complete in 1.86s.
```

> 死链门在这里不是麻烦，是护栏：它逼着「导航 = 目录」真正闭合，避免出现指向空位的侧边栏。

## 结论（泛化能力验证）

| 验证点 | 结果 |
|---|---|
| 框架无关的资产勘察 | ✅ React+TS 项目自动识别出 6 个组件、0 token，给出正确板块建议 |
| 配置驱动而非硬编码 | ✅ 关闭 design/api 后机械层照常 build，不依赖 demo 数据 |
| 导航 = 目录 | ✅ 导航由 ia.json 生成，与页面闭合；死链门兜底 |
| 骨架零自由度 | ✅ 组件页直接套 template，标题层级一致 |
| 真实可跑 | ✅ 全流程在第二个项目跑通，非「只在本项目成立」 |

**唯一项目特定的集成点**：组件「实时预览」需要按 `adapters/components.md` 形态 B 写一个 React 挂载薄包装（引入 react-dom）。这是接 React 项目的必要成本，与文档站骨架无关，已在该 adapter 写明。
