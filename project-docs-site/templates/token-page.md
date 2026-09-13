# 设计变量

本页直接解析项目里的**真实 token 源码**，呈现变量名、分层、取值与引用关系 —— 与「图标资源」「组件预览」同一原则：**文档等于实现，不漂移**。

需要注意的一件事是：设计变量可能分布在**多个作用域**里（一份源码 = 一个作用域），而它们的主题机制往往并不相同。下方的「各来源源码」卡片由 `theme/docs.config.ts` 的 `tokenScopes` 声明生成，不是手写的。

<!--
  接入要点（都在 .vitepress/theme/docs.config.ts）：
    1) tokenScopes 里为每份 CSS 声明一个作用域：rawKey / selector / 两种块的语义
    2) sources 里写清每份来源是 source（实时解析）还是 snapshot（会过期，必须带日期）
    3) 分类锚点由解析出的区块注释自动生成，形如 #tv-cat-color-semantic
       —— 改分类名（CSS 里的 `/* ── X ── */`）要重跑 scripts/build-nav.mjs
-->

<TokenVariablesPage />
