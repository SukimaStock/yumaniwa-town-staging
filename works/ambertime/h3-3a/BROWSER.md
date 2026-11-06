# H3-3A browser verification

Status: **UNVERIFIED — Draft required**.

On 2026-11-06, the installed `/usr/bin/chromium` was launched through the installed
Playwright Core with headless Chromium and its usual container `--no-sandbox`
argument. The process aborted before creating a page:

```
FATAL:chrome/browser/process_singleton_posix.cc:297
Check failed: . socket() failed: Operation not permitted (1)
process did exit: exitCode=null, signal=SIGABRT
```

Crash handling also reported `ptrace: Operation not permitted`. No application UI,
localStorage behavior, quota boundary, multi-tab behavior, or rendering was reached.
The user's instruction explicitly prohibits bypassing socket restrictions; no
alternative flags, socket bypass, or elevated launch was attempted.

A runnable optional browser regression is in `tests/recall-browser.test.mjs`. It
launches Chromium before its local HTTP server, then exercises current-session
boot, formal observed distillation, the actual fill button, month progression,
reload, and write-failure rollback. Test-only state inspection is appended by the
local server, not shipped in product source. **Its browser assertions have not
executed in this environment.**

```
AMBER_BROWSER_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs \
AMBER_BROWSER_EXECUTABLE=/usr/bin/chromium \
node --test works/ambertime/tests/recall-browser.test.mjs
```

Still required in an unrestricted Chromium environment: the above regression,
actual bottling and normal delivery, reputation updates, generation-review preview
without advancement, the actual handover button and restored frozen recall,
quota exhaustion, a write that succeeds followed by failed readback, retry/reload,
and real competing tabs. Node storage doubles do not establish browser CAS or
multi-tab atomicity.

Still required on iPhone Safari: native touch/lever/glass flow; no extra player UI;
long-save write/readback/quota recovery; 30/60/90/100-year total save size and memory;
month/recall preparation latency; interruption/reload around handover; storage
competition and recovery. No Safari performance or storage limit is inferred from
Node measurements.
