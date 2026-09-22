# SukimaStock Standalone Export

Updated: 2026-09-22

## Purpose

Some SukimaStock works are developed inside the Yumaniwa repository but distributed as self-contained Web ZIPs, for example on itch.io.

Development and distribution have different needs:

```text
development
works/<work>/index.html
→ ../../engine/sukimastock-engine.v0.2.0.js
→ one canonical Engine keeps evolving

distribution
index.html
→ sukimastock-engine.js
→ package contains the exact Engine snapshot it needs
```

Do not maintain a separate hand-edited Engine copy during development.

The export step creates the local copy only when packaging.

## Export contract

A standalone work adds:

```text
standalone-export.json
```

Example:

```json
{
  "schema": 1,
  "id": "orbit",
  "entry": "index.html",
  "output": "ORBIT-itch.zip",
  "engine": {
    "source": "engine/sukimastock-engine.v0.2.0.js",
    "target": "sukimastock-engine.js",
    "htmlMarker": "data-sse-engine"
  },
  "include": [
    "index.html",
    "codea-lite.js",
    "sketch.js"
  ]
}
```

The development HTML marks the canonical Engine tag:

```html
<script data-sse-engine src="../../engine/sukimastock-engine.v0.2.0.js"></script>
```

The exporter rewrites only that marked tag.

## Exporter

Canonical tool:

```text
engine/export-standalone.py
```

Validate only:

```bash
python3 engine/export-standalone.py works/ORBIT/standalone-export.json --check
```

Build:

```bash
python3 engine/export-standalone.py works/ORBIT/standalone-export.json
```

Default output:

```text
dist/ORBIT-itch.zip
```

The ZIP root contains `index.html` directly. There is no extra wrapper directory.

## What the exporter guarantees

Before building:

- manifest schema is supported
- every included runtime file exists
- entry file is included
- canonical Engine source exists
- paths cannot escape their allowed roots
- exactly one marked Engine script exists

During build:

- only manifest-whitelisted work files are copied
- canonical Engine is copied to the package target
- marked Engine `src` is rewritten from repository-relative to package-local
- output entry is validated again
- repository Engine paths must not remain in the packaged entry

## What it deliberately does not do

The exporter does not:

- decide which files a work needs
- rewrite work logic
- migrate saves
- tune audio
- minify code
- modify the development folder
- include notes/docs merely because they exist beside the work

The manifest is the explicit distribution boundary.

## ORBIT canary

ORBIT is the first standalone-export canary.

Current manifest packages 15 work files:

- index
- Codea Lite
- locale loader
- inline RESTORE ritual
- game sketch
- 8 OGG cues
- Japanese and English runtime text

The canonical Engine is added as the 16th file.

Development notes, Starter docs, examples, patcher, demo HTML, source RESTORE ritual HTML, README files and `.gitkeep` files are excluded.

## Migration order

For a standalone work:

```text
1. Develop against canonical /engine
2. Validate the work on Staging
3. Keep standalone-export.json current
4. Run exporter
5. Test the generated ZIP itself
6. Upload that ZIP to itch
```

A successful Staging test is not enough by itself: the generated standalone ZIP must also receive one smoke test because its Engine path and origin are different.

## Design principle

The repository owns one evolving Engine.

A distributed work owns a frozen Engine snapshot **only as an export artifact**.

This avoids both failure modes:

```text
many work-local Engines drifting apart

and

a standalone ZIP depending on repository-relative paths
```
