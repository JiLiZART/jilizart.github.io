---
title: "Frontend infrastructure that doesn't fight you back"
excerpt: "Typed data layers, design tokens that survive design reviews, and build pipelines you can debug at 2 AM."
date: 2026-05-07
tag: "Engineering"
readTime: "8 min read"
---

Most "infrastructure" bugs aren't bugs. They're decisions made years ago by people who never
had to live with them. The fix isn't more tooling — it's fewer choices, made deliberately,
written down where the next engineer will actually look.

## The data layer is the product

Before reaching for state libraries, ask one question: *where does this data live, and
who's allowed to mutate it?* If you can't answer in a sentence, the abstraction is wrong.

```ts
// Good: a single typed entry point
const useProject = (id: string) => useQuery({
  queryKey: ['project', id],
  queryFn: () => api.projects.get(id),
});
```

Notice what's missing: no Redux slice, no context provider, no selector memoization gymnastics.
The cache is the source of truth. The component reads it. That's the whole pattern.

> Pick technologies on objective criteria — not fashion.

## Design tokens that scale with the team

A design system fails the moment a designer can't reason about it without opening Figma.
Keep the token surface small enough to memorize: a color ramp, a spacing scale, a radius set,
a type scale. Six tokens of each, not sixty.

- **Colors:** a neutral ramp + one accent, derived in OKLCH so dark mode comes free.
- **Spacing:** a base unit (4 or 8) and powers of it. Resist the urge to add 14px.
- **Type:** 5–7 sizes, no more. Body, caption, h1–h3, eyebrow, mono.

### Why this matters at 2 AM

The on-call engineer who's never seen your codebase needs to ship a fix in 20 minutes.
If the design system has 200 tokens, they'll invent token #201. Now you have 201 tokens.
Six months later: 250. The system has lost.

## Build pipelines you can debug

Every minute spent waiting on a build is a minute the team isn't shipping. But speed isn't
the only axis — debuggability matters more. A 30-second build you can't trace beats a
5-second build that fails opaquely on CI.

```bash
# Useful in production, every time
pnpm build --reporter=verbose 2>&1 | tee build.log
```

Three rules I keep returning to:

1. Cache aggressively, invalidate explicitly.
2. Fail loud on CI; warn quiet locally.
3. Every output is reproducible from a single command.

---

None of this is novel. The hard part isn't picking the patterns — it's saying no to the
shiny thing your team wants to add next quarter. Good infrastructure is mostly
a series of well-defended *no*s.
