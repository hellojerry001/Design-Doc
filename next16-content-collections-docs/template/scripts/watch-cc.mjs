import { createBuilder } from "@content-collections/core";

const builder = await createBuilder("content-collections.ts");
await builder.build();
await builder.watch();
console.log("✓ content-collections watching for changes...");
