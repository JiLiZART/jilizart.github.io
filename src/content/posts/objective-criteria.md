---
title: "Pick technologies on objective criteria — not fashion"
excerpt: "A short rant on framework churn, and a checklist I run through before adding any dependency that ends in -js."
date: 2025-08-19
tag: "Process"
readTime: "4 min read"
---

Every six months, the JavaScript ecosystem invents a new framework. Every twelve months, half
the teams I know rewrite their app to use it. Every twenty-four months, they regret it.

This is not progress. This is fashion.

## The checklist

Before I add any new dependency, I run through five questions:

1. **What problem does this solve?** Specifically. Not "developer experience" — what does it let
   me do that I can't do today?
2. **Is the maintainer still active?** Check the commit history. If the last release was 18
   months ago, it's a museum piece, not a dependency.
3. **Does it compose with what I already have?** Or does it want to own the whole stack?
4. **What happens when I want to leave?** If the migration path is "rewrite the app," you don't
   own your code anymore.
5. **Is there a stable, simpler alternative?** Usually, yes.

If three of these answers are weak, I don't add it. I write the 200 lines myself.

## The cost of fashion

Every framework you adopt is a bet. You're betting that the maintainers will stay, the API will
stay, and the community will stay. Two years from now, you have to pay that bet — in migrations,
in bug reports nobody answers, in junior engineers who only know one way to do things.

Boring tech wins. Pick boring tech.
