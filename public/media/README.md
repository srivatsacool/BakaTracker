# Home cinematic background — asset slot

Home (`src/pages/Home.tsx`) expects exactly one optional asset pair here:

- `home-loop.mp4` — fullscreen looping background film
- `home-poster.webp` — poster frame (optional; until real footage exists the
  live LightTunnel background plays the poster role and the video layer stays
  dormant at opacity 0 until it actually plays)

Requirements when the real asset lands:

- autoplay, muted, loop, playsInline (already enforced by the component)
- decorative only — no audio track needed; keep it silent
- H.264 MP4 primary, keep the file lean (< ~8 MB target) so the cover loads fast
- direction: BakaTracker's own world — focused, dark, intelligent, personal,
  calm; violet/indigo light, slow drift, no generic stock productivity footage

The component self-hides the layer if the file is missing or fails to load,
so this folder can ship empty without breaking anything.
