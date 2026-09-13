# <长页面标题>

<一两句话说明这一页装了什么、数据来自哪里，并指出「文档等于实现」。>

<!--
  长页面（画廊 / 变量表 / 图标墙）的共同套路：
    - 整页只有一个 <XxxPage />，实际内容全部由 theme 组件按配置渲染
    - 侧边栏二级菜单用锚点导航，锚点由数据自动生成，不手写
    - 不要在这里手写 HTML 列表 —— 那会立刻和源码漂移

  对应关系：
    design/gallery.md → <ComponentGalleryPage />   条目清单：theme/gallery.config.ts
    design/tokens.md  → <TokenVariablesPage />     作用域清单：docs.config.ts
    design/icons.md   → <IconGalleryPage />        分组清单：docs.config.ts
-->

<ComponentGalleryPage />

<!--
  新增一个组件预览 = 两步：
    1) 在 .vitepress/theme/components/demos/ 放 XxxShowcase.vue
    2) 在 .vitepress/theme/gallery.config.ts 加一行 { id, name, showcase }
  然后重跑 scripts/build-nav.mjs 更新侧边栏锚点。
-->
