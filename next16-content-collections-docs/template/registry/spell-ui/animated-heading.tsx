"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const DEFAULT_WORDS = ["Animated", "Composable", "Accessible", "Fully Typed"];

/**
 * AnimatedHeading — 定时轮换的标题词。
 *
 * 用 `key` 重新挂载触发入场动画；`prefers-reduced-motion` 下只保留首词。
 */
export function AnimatedHeading({
  words = DEFAULT_WORDS,
  interval = 2200,
  className,
  textClassName,
}: {
  words?: string[];
  /** 每个词的停留时间（毫秒） */
  interval?: number;
  className?: string;
  textClassName?: string;
}) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (words.length <= 1) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const id = window.setInterval(
      () => setIndex((n) => (n + 1) % words.length),
      interval,
    );
    return () => window.clearInterval(id);
  }, [interval, words.length]);

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden px-6",
        className,
      )}
    >
      <span
        key={index}
        className={cn(
          "text-4xl font-bold tracking-tight text-foreground sm:text-5xl",
          textClassName,
        )}
        style={{ animation: "word-in 560ms cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        {words[index]}
      </span>
    </div>
  );
}
