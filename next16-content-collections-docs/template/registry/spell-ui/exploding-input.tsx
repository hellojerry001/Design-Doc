"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Particle = {
  id: number;
  /** 相对输入框左边的水平位置 */
  x: number;
  /** 飞行角度（度），-90 为正上方 */
  angle: number;
  distance: number;
  size: number;
  color: string;
};

const LIFETIME = 640;
const COLORS = ["#f97316", "#fb7185", "#a1a1aa", "#71717a"];

/**
 * ExplodingInput — 每次输入都在光标附近炸出几粒火星。
 *
 * 爆点用「字符数 × 字宽」近似光标位置，避免依赖 range 测量；
 * 粒子只活在 CSS 动画里，超时后从 state 中移除。
 */
export function ExplodingInput({
  placeholder = "try@spell.here",
  className,
  inputClassName,
}: {
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}) {
  const [value, setValue] = React.useState("");
  const [particles, setParticles] = React.useState<Particle[]>([]);
  const idRef = React.useRef(0);
  const timers = React.useRef<number[]>([]);

  React.useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const burst = React.useCallback((count: number, x: number) => {
    const batch: Particle[] = Array.from({ length: count }, () => ({
      id: idRef.current++,
      x: x + (Math.random() - 0.5) * 22,
      angle: -90 + (Math.random() - 0.5) * 160,
      distance: 26 + Math.random() * 44,
      size: 2 + Math.random() * 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    setParticles((prev) => [...prev, ...batch]);

    const ids = new Set(batch.map((p) => p.id));
    const timer = window.setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !ids.has(p.id)));
    }, LIFETIME);
    timers.current.push(timer);
  }, []);

  return (
    <div className={cn("flex h-full w-full items-center justify-center px-5", className)}>
      <div className="relative w-full max-w-[210px]">
        <input
          value={value}
          placeholder={placeholder}
          aria-label={placeholder}
          spellCheck={false}
          onChange={(event) => {
            const next = event.target.value;
            const growing = next.length >= value.length;
            setValue(next);
            if (!growing || next.length === 0) return;
            // 12px 左内边距 + 每字符约 6.6px
            const caret = Math.min(190, 12 + next.length * 6.6);
            burst(3 + Math.floor(Math.random() * 3), caret);
          }}
          className={cn(
            "h-11 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none transition-[box-shadow,border-color] duration-200",
            "placeholder:text-muted-foreground focus:border-foreground/35 focus:ring-4 focus:ring-foreground/[0.06]",
            inputClassName,
          )}
        />

        {particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          return (
            <span
              key={p.id}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 rounded-full"
              style={
                {
                  left: p.x,
                  width: p.size,
                  height: p.size,
                  background: p.color,
                  "--tx": `${Math.cos(rad) * p.distance}px`,
                  "--ty": `${Math.sin(rad) * p.distance}px`,
                  animation: `particle-burst ${LIFETIME}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                } as React.CSSProperties
              }
            />
          );
        })}
      </div>
    </div>
  );
}
