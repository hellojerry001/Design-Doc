import type * as React from "react";
import { Demo as TextMarqueeDemo } from "./examples/text-marquee";
import { Demo as BentoShowcase } from "./examples/bento-showcase";

/**
 * 组件注册表：把示例名映射到可直接渲染的示例组件。
 *
 * `<ComponentPreview name="text-marquee" />` 会：
 *  1. 从这里取到示例组件用于左侧预览；
 *  2. 从 `registry/examples/<name>.tsx` 读取源码用于 Code 标签。
 *
 * 新增组件时：在 `registry/examples/` 放一个示例文件，再在这里登记一行即可。
 */
export const registry: Record<string, React.ComponentType> = {
  "text-marquee": TextMarqueeDemo,
  "bento-showcase": BentoShowcase,
};
