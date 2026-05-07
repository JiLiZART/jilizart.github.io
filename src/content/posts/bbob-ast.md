---
title: "Why BBob still uses an AST in 2026"
excerpt: "How parsing BBCode into a tree — instead of regexing it into HTML — keeps Ultimate Guitar's tablature renderer under 15 ms."
date: 2026-03-18
tag: "Open source"
readTime: "6 min read"
---

When I started BBob in 2015, the obvious thing to do was to write a regex. Everyone else's BBCode
parser was a regex. They were also all wrong on edge cases — nested tags, malformed input,
attribute parsing, you name it.

So I built a parser. It produces an AST. Ten years later, that decision is the only reason the
library is still alive.

## The regex trap

```js
// What every BBCode parser looks like at first
text.replace(/\[b\](.*?)\[\/b\]/g, '<strong>$1</strong>');
```

This works until someone writes `[b]bold [i]and italic[/b][/i]`. Now what?

A regex can't track open tags. An AST can. Once you have a tree, the renderer is trivial:
walk it, emit HTML (or React, or Vue, or anything else).

## What scale taught me

Ultimate Guitar renders tablature on every page view. Their old PHP pipeline OOM'd at
about 1 GB per render — chord positions, verse alignment, two-column print layouts.

Moving to BBob on the client cut full-page render to 15 ms. Not because the parser is fast
(it is), but because the AST lets us cache transformations and short-circuit work the regex
approach couldn't even see.

The lesson: **shape your data first.** Speed follows.
