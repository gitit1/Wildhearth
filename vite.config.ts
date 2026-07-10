import { defineConfig } from "vite";
export default defineConfig({
  server: { open: true },
  // Emit every sprite PNG as its own hashed file — never base64-inline small
  // ones into the JS bundle. Sprites load lazily via Image() at boot, so
  // inlining just bloats the entry chunk (small crop/prop PNGs pushed it past
  // 500KB). 0 = always a separate file.
  build: { assetsInlineLimit: 0 },
});
