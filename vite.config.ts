import { defineConfig } from "vite";
export default defineConfig({
  // The game's home address: ALWAYS http://localhost:7777 (owner request —
  // away from Vite's default 5173 and from the verify harness's 5199).
  // strictPort: if 7777 is taken, FAIL LOUDLY instead of silently drifting
  // to another port — the stale-server incident taught us that "some server
  // answered" is how you end up playing old code.
  server: { open: true, port: 7777, strictPort: true },
  // Emit every sprite PNG as its own hashed file — never base64-inline small
  // ones into the JS bundle. Sprites load lazily via Image() at boot, so
  // inlining just bloats the entry chunk (small crop/prop PNGs pushed it past
  // 500KB). 0 = always a separate file.
  build: { assetsInlineLimit: 0 },
});
