---
title: "Design tokens in OKLCH: dark mode comes free"
excerpt: "Why I stopped maintaining two color palettes and started deriving them from a single perceptual ramp."
date: 2025-03-14
tag: "Craft"
readTime: "9 min read"
---

For years I maintained two color palettes: light mode and dark mode. Every time we added a new
shade, I added it twice. Every time a designer adjusted a hue, I adjusted it twice. Half the
time the two palettes drifted out of sync.

Then I switched to OKLCH. Now I maintain one ramp.

## What OKLCH gives you

Unlike HSL, OKLCH is *perceptually uniform.* That means moving the lightness value from 0.5 to
0.6 produces the same perceived change in brightness regardless of hue. No more "this blue
feels darker than that red at the same lightness."

```css
:root {
  --accent: oklch(0.62 0.17 211);
  --accent-2: oklch(0.74 0.13 211);
}
html.dark {
  --accent: oklch(0.72 0.17 211);
  --accent-2: oklch(0.84 0.13 211);
}
```

Same hue. Same chroma. Just a lightness shift. The dark-mode color *feels* the same hue as the
light-mode one — because it actually is.

## The pattern

I keep three numbers in my head: hue, chroma, lightness. The hue stays. The chroma shifts a
little. The lightness flips. Done.

For an entire color system, I need maybe twelve OKLCH values, not 60+. The dark variant is
arithmetic, not design.

## The catch

Browser support is fine in 2026, but if you need to target old WebViews you'll want a fallback.
A small PostCSS plugin can downconvert at build time. I haven't needed it in two years.
