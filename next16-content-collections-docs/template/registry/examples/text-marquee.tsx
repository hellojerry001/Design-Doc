"use client";

import { TextMarquee } from "@/registry/spell-ui/text-marquee";

export function Demo() {
  return (
    <TextMarquee
      height={250}
      speed={1}
      items={["hugh", "alex", "emily", "dennis", "max", "nina", "oliver"]}
      prefix={
        <span className="text-3xl text-muted-foreground/75 font-medium">
          spell.sh/
        </span>
      }
    />
  );
}
