import { BentoCard, BentoGrid } from "@/registry/spell-ui/bento-grid";
import {
  DesignPlatformCard,
  LightRays,
  PopButton,
  ScrollStudio,
  ShimmerText,
  SpotifyNowPlaying,
} from "@/registry/spell-ui/bento-cards";
import { AnimatedHeading } from "@/registry/spell-ui/animated-heading";
import { ExplodingInput } from "@/registry/spell-ui/exploding-input";

/**
 * 首页展示墙：8 张卡片拼成 4 列便当格。
 *
 * 大卡占 2×2（光束），右侧两行各两张 1×1，
 * 第三行是「手写体 + 2 列宽标题 + 微光文字」。
 */
export function Demo() {
  return (
    <BentoGrid className="w-full">
      <BentoCard
        label="Light Rays"
        className="sm:col-span-2 lg:row-span-2"
        contentClassName="p-0"
      >
        <LightRays />
      </BentoCard>

      <BentoCard label="Exploding Input">
        <ExplodingInput />
      </BentoCard>

      <BentoCard label="Spotify Card" contentClassName="p-3">
        <SpotifyNowPlaying />
      </BentoCard>

      <BentoCard label="Pop Button">
        <PopButton />
      </BentoCard>

      <BentoCard label="Design Platform" contentClassName="p-4">
        <DesignPlatformCard />
      </BentoCard>

      <BentoCard label="Scroll Studio">
        <ScrollStudio />
      </BentoCard>

      <BentoCard label="Animated" className="sm:col-span-2">
        <AnimatedHeading />
      </BentoCard>

      <BentoCard label="Shimmer Text">
        <ShimmerText />
      </BentoCard>
    </BentoGrid>
  );
}
