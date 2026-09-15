"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TextMarqueeProps = {
  /** 参与滚动的文案列表，循环播放 */
  items: string[];
  /** 可视区域高度（px） */
  height?: number;
  /** 滚动速度：每秒前进多少个条目 */
  speed?: number;
  /** 仅在中轴（激活项）上渲染的前缀节点，通常用于展示品牌名 */
  prefix?: React.ReactNode;
  /** 同时可见的条目数量，影响条目间距 */
  visible?: number;
  direction?: "up" | "down";
  className?: string;
  itemClassName?: string;
};

/**
 * TextMarquee — 垂直无限文字跑马灯。
 *
 * 条目按「到中轴的距离」做缩放与透明度衰减：中轴项最大最实，
 * 越远越小越淡，配合上下遮罩形成柔和的聚焦感。
 */
export function TextMarquee({
  items,
  height = 250,
  speed = 1,
  prefix,
  visible = 5,
  direction = "up",
  className,
  itemClassName,
}: TextMarqueeProps) {
  const [progress, setProgress] = React.useState(0);
  const count = items.length;
  const slot = height / visible;

  React.useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || count <= 1) return;

    let raf = 0;
    let last: number | null = null;
    const sign = direction === "up" ? 1 : -1;

    const tick = (t: number) => {
      if (last === null) last = t;
      const dt = Math.min((t - last) / 1000, 0.1);
      last = t;
      setProgress((p) => p + dt * speed * sign);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count, speed, direction]);

  const mask =
    "linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)";

  return (
    <div
      className={cn("relative w-full select-none overflow-hidden", className)}
      style={{ height, maskImage: mask, WebkitMaskImage: mask }}
    >
      {items.map((item, i) => {
        // 归一到 [0, count) 再折成以中轴为 0 的有符号偏移
        let offset = (((i - progress) % count) + count) % count;
        if (offset > count / 2) offset -= count;

        const distance = Math.abs(offset);
        const isActive = distance < 0.5;
        const scale = Math.max(0.55, 1 - distance * 0.16);
        const opacity = Math.max(0.06, 1 - distance * 0.34);

        return (
          <div
            key={item}
            className="absolute inset-x-0 top-1/2 flex items-center justify-center gap-2"
            style={{
              transform: `translateY(-50%) translateY(${offset * slot}px) scale(${scale})`,
              opacity,
              willChange: "transform, opacity",
            }}
            aria-hidden={!isActive}
          >
            {isActive && prefix ? prefix : null}
            <span
              className={cn(
                "text-3xl font-medium tracking-tight whitespace-nowrap text-foreground",
                itemClassName,
              )}
            >
              {item}
            </span>
          </div>
        );
      })}
    </div>
  );
}
