# Button 按钮

> 来源 `.demo-assets/button.js` ｜ 适用：任意容器 ｜ 依赖 `--demo-*` 变量（需在预览作用域内）

## 功能描述

`DEMO_UI.Button` 用于触发操作，支持主要 / 次要 / 禁用三种状态。组件以工厂函数形式提供，返回一个真实 DOM 元素，由调用方决定挂到哪里。

## 实时预览

<DemoBlock title="Button · 主要 / 次要 / 禁用" source="demo/icons">
  <LiveComponent asset="demo" create="Button.create" :args="[{ variant: 'solid', label: '主要按钮' }]" />
  <LiveComponent asset="demo" create="Button.create" :args="[{ variant: 'ghost', label: '次要按钮' }]" />
  <LiveComponent
    asset="demo"
    create="Button.create"
    :args="[{ variant: 'solid', label: '不可用', disabled: true }]"
  />
</DemoBlock>

## API

### `DEMO_UI.Button.create(opts)`

| 参数 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| `variant` | `'solid' \| 'ghost'` | `'solid'` | 否 | 视觉层级，主要操作与次要操作用不同变体 |
| `label` | string | `'Button'` | 否 | 按钮文案 |
| `disabled` | boolean | `false` | 否 | 是否禁用 |

返回 `{ el: HTMLButtonElement }`，真正的 DOM 元素在 `.el` 上：

```js
const UI = await loadAsset('demo')
const { el } = UI.Button.create({ variant: 'solid', label: '提交' })
document.querySelector('.toolbar').append(el)
```

## 注意事项

1. `tip`：按钮高度与圆角走 `--demo-button-*` 组件级令牌，改令牌即改全部按钮，不要在业务里写死数值。
2. `tip`：样式依赖 `--demo-*` 变量，这些变量被限定在 `.demo-scope` 内 —— 在文档站外使用时，记得把组件放进对应作用域容器。

## 相关组件

- [Badge 徽章](/design/gallery#badge)
- [组件总览](/components/overview)
- [设计变量](/design/tokens)
