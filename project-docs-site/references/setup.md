# 最短上手路径

这是设计师唯一必须过的技术门槛。全部命令都在 `docs-site/` 目录下执行。

## 0. 起骨架（一键剥离 demo）

```bash
node scripts/new-site.mjs <你的 docs-site 目录> --name "项目名"
cd <你的 docs-site 目录>
```

它会把脚手架拷过来并**自动剥离示例资产**（删 `.demo-assets`、去掉 `preview.demo.css` 的 import、清空 `assets.generated.ts`），得到一个干净、能直接 build 的起点。

之后照下面的 1~4 步走。

## 1. 装 Node

需要 Node 18 以上。检查：

```bash
node -v
```

没装就去 https://nodejs.org 下 LTS 版，一路下一步即可。

## 2. 装依赖

```bash
cd <你的项目>/docs-site
npm install
```

只有一次。之后不再需要联网。

## 3. 起本地预览

```bash
npm run docs:dev
```

浏览器打开 http://127.0.0.1:5180。改任何文件都会自动刷新。

> 端口被占用时改 `package.json` 里 `docs:dev` 的 `--port`。
> 加了 `--strictPort` 是故意的：宁可报错也不要静默换端口，
> 否则你会对着一个旧窗口调试半天。

## 4. 交付前跑一次构建

```bash
npm run docs:build
```

这一步同时验证三件事：

| 验什么 | 为什么必须跑 |
|---|---|
| SSR 安全 | 组件在模块顶层访问 `window`/`document` 会在这里炸，浏览器里看不出来 |
| 死链 | VitePress 1.6.4 **默认开启死链检查**，链接写错、锚点不存在、或导航指向已删页面都会直接构建失败 |
| 产物可用 | 出 `dist/`，可直接丢到任意静态托管 |

> 死链检查是护栏不是麻烦：它逼着「导航 = 目录」真正闭合。若构建报 dead link，
> 先确认 `ia.json` 与 `build-nav.mjs` 生成的 `nav.mts` 是否和真实页面一致。

## 出问题时的排查顺序

1. **页面白屏 / 组件没渲染** → 看浏览器控制台第一行报错；多半是某个组件在 SSR 阶段访问了 `window`，把它放进 `onMounted` 或包 `<ClientOnly>`
2. **组件渲染出来了但看不见** → token 没引入。检查 `theme/preview.css` 是否 **同时** import 了 token 和组件样式（详见 pitfalls 第 1 条）
3. **改了配置没生效** → `docs.generated.ts` 是脚本生成的，改完 `scripts/gen-assets.mjs` 要重跑 `node scripts/gen-assets.mjs`
4. **锚点跳不过去 / 侧边栏指向空位** → 分类名改了但导航没重建，重跑 `node scripts/build-nav.mjs`
