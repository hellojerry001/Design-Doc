import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * BentoGrid — 首页展示墙的栅格容器。
 *
 * 默认 4 列、行高固定 190px，卡片靠 `col-span-*` / `row-span-*` 拼出不规则格子。
 * 断点：移动端 1 列 → sm 2 列 → lg 4 列。
 */
type BentoGridProps = React.ComponentProps<"div">;

export function BentoGrid({ className, ...props }: BentoGridProps) {
  return (
    <div
      data-slot="bento-grid"
      className={cn(
        "grid auto-rows-[190px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
      {...props}
    />
  );
}

type BentoCardProps = React.ComponentProps<"div"> & {
  /** 左下角标签，例如 "Light Rays" */
  label?: string;
  /** 标签右侧的附加节点（链接、按钮等） */
  action?: React.ReactNode;
  /** 内容区的额外类名，常用来控制内边距 */
  contentClassName?: string;
};

/**
 * BentoCard — 单张便当卡。
 *
 * 结构：外层负责圆角/边框/悬停，内容区 `flex-1` 撑满剩余空间，
 * 标签固定在左下角。卡片内容自行决定布局（居中、贴边、绝对定位都可以）。
 */
export function BentoCard({
  label,
  action,
  className,
  contentClassName,
  children,
  ...props
}: BentoCardProps) {
  return (
    <div
      data-slot="bento-card"
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-background transition-colors hover:border-foreground/25",
        className,
      )}
      {...props}
    >
      <div className={cn("relative min-h-0 flex-1 overflow-hidden", contentClassName)}>
        {children}
      </div>
      {label ? (
        <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-1 pb-3 text-xs text-muted-foreground">
          <span className="truncate">{label}</span>
          {action}
        </div>
      ) : null}
    </div>
  );
}
