---
title: "Moving 1 GB of PHP rendering to the client"
excerpt: "How musescore.com cut comment rendering from seconds to milliseconds by deleting code, not adding it."
date: 2025-06-02
tag: "Engineering"
readTime: "7 min read"
---

The PHP comment renderer at musescore.com peaked at about a gigabyte of memory per request.
On a busy thread — say, a 500-comment debate about a Beethoven sonata fingering — the page
took several seconds to render. Sometimes it OOM'd outright.

The fix wasn't to optimize the PHP. The fix was to delete it.

## The problem

Every comment was BBCode. Every BBCode pass walked the whole comment tree on the server,
allocating intermediate strings as it went. Nested quotes were the worst — a quote-inside-a-
quote-inside-a-quote multiplied the work geometrically.

We could have rewritten the renderer in C. We could have cached aggressively. Instead we asked
a different question: *why is the server doing this at all?*

## The fix

Send the BBCode source to the browser. Render with [BBob](https://github.com/jilizart/bbob) on
the client. The server now does roughly nothing.

Page render dropped from seconds to **15 ms**. Server memory dropped from 1 GB to ~50 MB. Cache
warming, which used to be a critical operations chore, became unnecessary.

The lesson is one I keep relearning: the fastest code is the code you don't run.
