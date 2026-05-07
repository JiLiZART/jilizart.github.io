---
title: "Reverse engineering Battle.net for fun and Node.js"
excerpt: "What Wireshark, node-ffi, and a Warcraft 3 client taught me about binary protocols and keeping a long-running process honest."
date: 2025-11-04
tag: "Engineering"
readTime: "11 min read"
---

In 2018, I wanted to host Warcraft 3 games from a Node.js process. Blizzard's protocol was
undocumented. So I opened Wireshark.

What followed was six months of staring at hex dumps, learning packet framing, and writing the
single most fragile piece of code I've ever shipped. It worked. It still works.

## The first packet

Every Battle.net session starts with `0xFF 0x50` — the magic bytes that say *this is a
Warcraft 3 session, not StarCraft.* Get this wrong and the server hangs up.

The next four bytes are length-prefixed. The next four after that are the protocol version.
Get any of it wrong and the server hangs up.

There is no error message. There is only silence.

## node-ffi: the underrated hero

Some of the cryptography Battle.net uses isn't available in pure Node. The Bnet CHAT protocol
needs SHA-1 in a specific way, plus a checksum function nobody's reimplemented. So I wired in
a C library via node-ffi:

```js
const ffi = require('ffi-napi');
const lib = ffi.Library('./libbnet', {
  'bncsutil_HashPassword': ['void', ['string', 'string', 'pointer']],
});
```

It's ugly. It's also faster than rewriting cryptography I don't fully understand.

## Long-running Node is hard

Most Node tutorials assume you'll handle a request and exit. A Battle.net bot stays connected
for weeks. Memory leaks compound. Open file handles compound. Unhandled promise rejections
*definitely* compound.

The trick is treating the process like a server, not a script: structured logging, health
checks, automatic reconnect with backoff, and a watchdog that kills the process if it stops
responding. Boring infrastructure. Worth every line.
