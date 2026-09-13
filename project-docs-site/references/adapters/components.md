# 适配器 · 组件

「可交互优先于截图」—— 能跑真组件就绝不放静态图。这里说清三种形态怎么接。

## 判定：这个组件能不能跑？

| 情况 | 结论 |
|---|---|
| 有可独立运行的源码（哪怕只是 vanilla JS 工厂函数） | **能跑**，走形态 A/B |
| 依赖整个应用才能初始化（要路由、要全局 store） | **跑不了**，走形态 C |
| 只有设计稿、还没落成代码 | **跑不了**，走形态 C |

---

## 形态 A · vanilla JS，挂到全局命名空间

**特征**：`components.js` 是个 IIFE，把自己挂到 `window.XXX`。这是最常见也最好接的一种。

**做法**：在 `theme/docs.config.ts` 的 preview 里声明作用域与主题，在 `assets.generated.ts` 的 `LOADERS` 里登记：

```ts
export const LOADERS = {
  ui: {
    load: () => import('../../src/components.js'),   // 静态 import，不能拼路径
    globalKey: 'DQUI',                               // 从 window.DQUI 取命名空间
  },
}
```

然后在页面里一行挂载：

```html
<LiveComponent asset="ui" create="Chip.create" :args="[{ kind: 'text' }]" />
```

`LiveComponent` 会自己处理「加载 → 调用工厂 → 塞进容器」，工厂返回 `{ el }` 或直接返回元素都支持。

---

## 形态 B · ES module / React / Vue 组件

**ES module**：同上，`exportKey` 填具名导出、或留空让它取 `default`。

**React / Vue 组件**：需要先挂到 DOM 上。写一个薄包装：

```ts
// demos/mount-react.js
import { createRoot } from 'react-dom/client'
export function mount(Component, props, container) {
  const root = createRoot(container)
  root.render(React.createElement(Component, props))
  return () => root.unmount()
}
```

然后在 demo 组件里 `onMounted` 调它。**仍然走真实组件**，只是多了一层挂载适配。

> 这类包装会引入 React 运行时。若文档站已有的依赖里没有它，需要在 `docs-site/package.json` 里补上 —— 这是接 React 项目的必要成本。

---

## 形态 C · 跑不起来时

按这个优先级降级，**不要跳级**：

1. **静态 HTML 快照** —— 把组件输出的真实 DOM 结构 + 类名存成 `.html`，用 `?raw` 引入后 `v-html`。配合真实 CSS 一起 import，视觉仍然与线上一致，只是不可交互。
   - **必须**在页面上标注这是静态快照（用 `SourceBadge` 的 snapshot 模式）
2. **设计稿截图** —— 最后手段。截图会过期、不跟随主题、无法复制样式，但比没有强。
   - 同样要标注来源与导出时间

---

## 预览容器的两个必配项

组件能不能正确显示，八成取决于这两个配置（都在 `docs.config.ts` 的 `preview`）：

```ts
preview: {
  // 1) 作用域：组件的 token 限定在哪个选择器内
  scope: { attr: 'id', value: 'pageChat' },
  // 2) 主题：预览要不要跟随文档亮暗，以及怎么跟随
  theme: { mode: 'attr', attr: 'data-dq-theme', light: 'light', dark: 'dark' },
}
```

- 组件的 token 挂在 `:root` 上不限定作用域 → `scope: null`
- 组件是固定主题（如纯深色产品）→ `theme: { mode: 'none' }`
- 组件用 `@media (prefers-color-scheme: dark)` 跟随系统 → 预览**不会**跟随文档主题（因为媒体查询看的是系统）。要么接受，要么在容器上加属性开关

**别忘了 `theme/preview.css`**：token + 组件样式都要 import，且 token 必须是作用域限定过的。详见 `pitfalls.md` 第 1 条。

---

## 写 Showcase 的套路

一个组件在画廊里占一格，用 `<ComponentShowcase>`：

```html
<ComponentShowcase
  title="Button 按钮"
  description="一句话说明"
  :index="1"
  :variants="[{ label: '主要', value: 'solid' }, { label: '次要', value: 'ghost' }]"
  default-variant="solid"
  :code-map="codeMap"
>
  <template #solid><LiveComponent … /></template>
  <template #ghost><LiveComponent … /></template>
</ComponentShowcase>
```

三个要点：

1. **`variants` 是变体，不是组件数量。** 一个组件有 3 种状态 → 1 个 Showcase + 3 个变体，不是 3 个 Showcase。
2. **`codeMap` 给的是「用户能直接复制走」的代码**，不是 Showcase 自己的模板源码。
3. **插槽名必须等于变体的 `value`**（`#solid` 对应 `value: 'solid'`），写错了会显示「暂无预览」而不是报错。
