import * as React from "react";
import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * 这些卡片都是纯视觉组件，不含状态 —— 动画全部由 CSS 关键帧驱动，
 * 所以可以在 Server Component 里直接渲染，不往客户端包里塞 JS。
 * ------------------------------------------------------------------ */

/** 光束卡：以卡片下方为圆心放射的窄扇形，模糊后成为"光线"。 */
export function LightRays({
  title = "Beautiful",
  subtitle = "Light Rays",
  className,
}: {
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-[#eaf1ff] dark:bg-[#080d1a]", className)}>
      {/* 光锥本体：一块远大于卡片、水平居中的圆盘，
          圆锥原点落在卡片下方中心，于是光从底部向上扇形发散。 */}
      <div
        className="absolute top-[-150%] left-1/2 h-[290%] w-[290%] -translate-x-1/2 opacity-80 blur-[7px] dark:opacity-40"
        style={{
          background:
            "repeating-conic-gradient(from 0deg at 50% 100%, #a6c6ff 0deg 1.4deg, transparent 1.4deg 3.9deg)",
          animation: "rays-drift 16s ease-in-out infinite",
        }}
      />
      {/* 中心柔光：压暗光束中心，让文字区域干净 */}
      <div className="absolute inset-0 bg-[radial-gradient(78%_60%_at_50%_50%,#ffffff_0%,rgba(255,255,255,0.8)_38%,rgba(255,255,255,0)_80%)] dark:bg-[radial-gradient(78%_60%_at_50%_50%,#0b1224_0%,rgba(11,18,36,0.8)_40%,rgba(11,18,36,0)_82%)]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center">
        <span className="text-4xl leading-none font-semibold tracking-tight text-neutral-900 sm:text-5xl dark:text-neutral-50">
          {title}
        </span>
        <span className="font-display text-3xl leading-tight italic text-neutral-800 sm:text-4xl dark:text-neutral-200">
          {subtitle}
        </span>
      </div>
    </div>
  );
}

/** Spotify 卡片：左侧封面 + 右侧曲目信息。 */
export function SpotifyNowPlaying({
  track = "Past Won't Leave My Bed",
  artist = "Joji",
  className,
}: {
  track?: string;
  artist?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-xl bg-[#150a0c]",
        className,
      )}
    >
      {/* 封面 */}
      <div className="absolute inset-y-0 left-0 w-[40%] overflow-hidden bg-[linear-gradient(150deg,#f0556a_0%,#b21f31_45%,#3a0a11_100%)]">
        <div className="absolute right-[-18%] bottom-[-22%] h-[86%] w-[86%] rounded-full bg-black/35 blur-[6px]" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_18%_8%,rgba(255,255,255,0.38),transparent_62%)]" />
      </div>
      <div className="relative flex h-full flex-col justify-between p-3 pl-[44%]">
        <div className="flex justify-end">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            aria-hidden="true"
            className="h-4 w-4 text-white/75"
          >
            <path d="M5.6 9.4c3.9-1.2 8.2-.8 11.6 1.3" strokeWidth="2.2" />
            <path d="M6.5 13.1c3.1-1 6.6-.6 9.3 1.1" strokeWidth="1.9" />
            <path d="M7.4 16.4c2.3-.7 4.9-.5 6.9.8" strokeWidth="1.6" />
          </svg>
        </div>
        <div className="text-right">
          <p className="text-[11px] leading-tight font-medium text-white">{track}</p>
          <p className="mt-0.5 text-[10px] text-white/55">{artist}</p>
        </div>
      </div>
    </div>
  );
}

/** 立体按钮：用硬阴影做出"浮起"的厚度，按下去会真的陷进去。 */
export function PopButton({
  children = "Button",
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full border border-black/85 bg-white px-6 py-2.5 text-sm font-semibold text-black",
        "shadow-[0_4px_0_0_rgba(0,0,0,0.85)] transition-all duration-150",
        "hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_rgba(0,0,0,0.85)]",
        "active:translate-y-[3px] active:shadow-[0_1px_0_0_rgba(0,0,0,0.85)]",
        "dark:border-white/85 dark:bg-neutral-900 dark:text-white",
        "dark:shadow-[0_4px_0_0_rgba(255,255,255,0.85)]",
        "dark:hover:shadow-[0_5px_0_0_rgba(255,255,255,0.85)]",
        "dark:active:shadow-[0_1px_0_0_rgba(255,255,255,0.85)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** 书本卡：带书脊、切口与轻微透视的"封面"。 */
export function DesignPlatformCard({
  title = "Your complete platform for the Design.",
  className,
}: {
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("h-full w-full", className)}
      style={{ perspective: "1000px" }}
    >
      <div
        className="relative flex h-full w-full flex-col justify-center gap-4 overflow-hidden rounded-l-sm rounded-r-lg bg-[linear-gradient(100deg,#f4f4f5_0%,#ffffff_38%,#fafafa_100%)] pl-7 shadow-[0_20px_34px_-20px_rgba(0,0,0,0.5)] dark:bg-[linear-gradient(100deg,#1b1b1e_0%,#26262b_38%,#1a1a1d_100%)] dark:shadow-[0_20px_34px_-20px_rgba(0,0,0,0.9)]"
        style={{ transform: "rotateY(-10deg) rotateX(3deg)" }}
      >
        {/* 书脊 */}
        <div className="absolute inset-y-0 left-0 w-2.5 bg-[linear-gradient(90deg,rgba(0,0,0,0.26),rgba(0,0,0,0.03))]" />
        {/* 切口 */}
        <div className="absolute inset-y-0 right-0 w-1 bg-[linear-gradient(90deg,rgba(0,0,0,0.05),rgba(0,0,0,0.16))]" />
        <p className="pr-5 text-[15px] leading-snug font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          {title}
        </p>
        <Copy className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
      </div>
    </div>
  );
}

/** 手写体文字：靠 background-clip 做"逐字写出来"的循环。 */
export function ScrollStudio({
  children = "Scroll Studio",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full w-full items-center justify-center px-4", className)}>
      <span
        className="font-script text-4xl leading-none font-bold"
        style={{
          backgroundImage:
            "linear-gradient(90deg, var(--foreground) 50%, transparent 50%)",
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          animation: "handwriting 5s ease-in-out infinite",
        }}
      >
        {children}
      </span>
    </div>
  );
}

/** 微光文字：一条高光在文字上反复扫过。 */
export function ShimmerText({
  children = "Shimmer Text",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full w-full items-center justify-center px-4", className)}>
      <span
        className="bg-clip-text text-3xl font-semibold tracking-tight text-transparent"
        style={{
          backgroundImage:
            "linear-gradient(100deg, var(--foreground) 38%, color-mix(in oklab, var(--foreground) 35%, transparent) 50%, var(--foreground) 62%)",
          backgroundSize: "200% 100%",
          animation: "shimmer-sweep 2.8s linear infinite",
        }}
      >
        {children}
      </span>
    </div>
  );
}
