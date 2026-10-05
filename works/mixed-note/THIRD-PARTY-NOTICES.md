# Third-party notices

## Runtime dependencies

| Package | Version | License | Distribution |
| --- | --- | --- | --- |
| [WanaKana](https://github.com/WaniKani/WanaKana) | 5.3.1 | MIT | npm package `wanakana@5.3.1`, unmodified `esm/index.js` renamed to `vendor/wanakana.mjs` |
| [memoize-one](https://github.com/alexreardon/memoize-one) | 6.0.0 | MIT | Included in the WanaKana ESM bundle |
| [dequal](https://github.com/lukeed/dequal) | 2.0.3 | MIT | Included in the WanaKana ESM bundle |

Copyright and complete licenses are retained in `vendor/WANAKANA-LICENSE.txt`,
`vendor/MEMOIZE-ONE-LICENSE.txt`, and `vendor/DEQUAL-LICENSE.txt`.

Source inspected: WanaKana commit `63a00b513979ccc96b530da2f3efb677361d573c`,
package.json version 5.3.1 and yarn.lock versions above.
Actual vendored artifact: npm `wanakana-5.3.1.tgz` / `package/esm/index.js`.
SHA-256 of `vendor/wanakana.mjs`:
`fa9cfd1f841e57094da55ab372d02246277ba2e2fab2c771715dc2824d4e785f`.
No CDN or package service is contacted during use.

## Architectural inspiration

[Meltype](https://github.com/yksr-melt/Meltype), Copyright (C) 2026 Yukishiro,
GPL-3.0-or-later. Its source, dictionary datasets and test bodies are not included.
See RESEARCH.md for observed architecture and the independent implementation boundary.
This work does not set or change the licensing of the SukimaStock repository.
