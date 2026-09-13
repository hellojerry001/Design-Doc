# 适配器 · 设计变量

token 的形态决定了走源码还是快照。**优先源码。**

## 形态 A · CSS 自定义属性（首选）

**特征**：`--x: value;` 写在 `.css` 里，可能分多份文件 / 多个作用域。

**做法**：

1. `scripts/gen-assets.mjs` 的 `SOURCES` 里登记每个 CSS 文件，跑一遍生成 `?raw` import
2. `docs.config.ts` 的 `tokenScopes` 里为每份声明一个作用域：

```ts
{
  id: 'shell',                    // 英文 id，用于内部引用
  label: '桌面壳',                 // 展示名
  rawKey: 'shell/tokens',         // 对应 RAW 的键
  selector: ':root',              // 该文件生效的选择器
  baseLabel: '写死的取值',          // 基础块的语义 → 列头
  overrideLabel: null,            // 没有覆盖块就填 null
  themeNote: '深色产品，值直接写死，不随系统外观变化。',
}
```

**前置条件**：CSS 里用 `/* ── 分类名 ── */` 注释分段。没有分段注释时所有变量会归到「未分组」，页面仍能用但没有分类导航。

**解析规则**（`lib/parse-css-tokens.ts`）：

| 情形 | 判定 |
|---|---|
| 第一个顶层块 | 基础值 |
| 第二个及以后的顶层块 | 覆盖值 |
| `@media` 内的块 | 覆盖值 |
| 覆盖块里的声明 | 分类沿用同名基础声明的（覆盖块通常没有分段注释） |

> ⚠️ **不要把「基础块 / 覆盖块」直接叫成「亮色 / 暗色」**。先 grep 该文件有没有 `@media` 或 `[data-*]` 选择器再下结论 —— 两块的关系可能是「无条件覆盖」，也可能是媒体查询。叫错了会误导所有读文档的人。

---

## 形态 B · JSON token 文件（快照）

**特征**：`tokens.json` / Style Dictionary 输出 / MasterGo、Figma 导出。

**做法**：转入快照模式，并且**必须**标注来源与时间：

```ts
sources: {
  'design/tokens': {
    path: 'design/exported-tokens.json',
    kind: 'snapshot',
    syncedAt: '2026-09-01',              // 缺这个构建直接失败
    via: 'MasterGo 画板 3:09459 导出',     // 缺这个也失败
  },
}
```

页面顶部会渲染一行醒目的「快照 · 2026-09-01」，悬停显示采集方式与已过去的时长。

**JSON 与 CSS 的差异**：JSON 通常直接给出「亮/暗」两套值，不存在「基础块 / 覆盖块」的推断问题。映射到本脚手架时，把亮色当 `base`、暗色当 `override` 即可 —— 但**不要**因此把列头叫成「亮色默认值」，除非它真的是媒体查询驱动的。

**如果项目里有 codegen**：优先改 codegen，让它**同时**输出一份 `.css`。有了 CSS 就能走形态 A，彻底消除快照过期问题。这是最值的投入。

---

## 形态 C · JS/TS 常量对象

**特征**：`export const tokens = { colorBg: '#fff', … }`，或 `satisfies` 的类型化 token。

**做法**：参照 `lib/parse-source-icons.ts` 的思路 —— 用 `?raw` 取源码原文，再用正则解析。**不要求改业务代码去 export 什么**，这正是 `?raw` 的价值。

若常量是嵌套结构（`{ color: { bg: … } }`），解析出嵌套路径当分类，如 `color.bg`。

---

## 数量对不上时怎么办

**先怀疑解析器，再怀疑源码。** 用第二套独立实现重新数一遍（比如 Python 一段脚本 + Node 一段脚本互验）。历史上就是「只数一遍」导致文档悄悄报错了 2 个变量。
