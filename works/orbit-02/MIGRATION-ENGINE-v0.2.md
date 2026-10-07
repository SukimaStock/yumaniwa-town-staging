# ORBIT — Engine v0.2 / Standalone Export

Updated: 2026-09-22

## Goal

ORBIT is both an Engine v0.2 migration and the first standalone-distribution canary.

Development uses the canonical repository Engine. itch distribution receives a frozen local Engine copy only at export time.

## Staging canary

ORBIT development index now references:

```text
../../engine/sukimastock-engine.v0.2.0.js
```

No ORBIT game logic was changed for the canary.

Existing systems deliberately remain work-local for now:

- HOME / MEMORY save semantics
- direct save keys and save migrations
- ORBIT OGG cue layer
- procedural tone compositions
- physics, progression, story and restore logic

### Real-device result

Accepted:

```text
Engine: 0.2.0
Scene: drift
ATTENTION: OK
FPS avg: 59.9
p95: 17ms
max: 25ms
rendered/skipped/slow: 3054 / 0 / 2
AudioContext: running
```

`No defined Storage v2 keys` is expected because ORBIT still owns its HOME/MEMORY persistence directly.

`Buffers: 0/0` is also expected because current ORBIT OGG buffers are managed by the work-side audio layer rather than Audio v2 buffer definitions.

## Standalone export contract

Manifest:

```text
works/ORBIT/standalone-export.json
```

Exporter:

```text
engine/export-standalone.py
```

The manifest currently packages 15 ORBIT runtime files. The exporter adds canonical Engine as the 16th file.

Excluded from distribution:

- historical version notes
- Starter documentation
- examples
- patcher.py
- index.demo.html
- restore-ritual.html source/testing page
- README files inside runtime asset folders
- gitkeep files

## GitHub Actions

Workflow:

```text
.github/workflows/orbit-standalone-export.yml
```

The workflow runs on relevant pushes and can also be started manually.

It:

1. validates the standalone manifest
2. builds the standalone package
3. extracts and inspects the package
4. verifies exactly 16 runtime files
5. verifies the packaged Engine reference is local
6. rejects repository-relative Engine paths
7. parses both locale JSON files
8. runs Node syntax checks on all five JavaScript runtime files
9. publishes an `ORBIT-itch` artifact

### First automated build

GitHub Actions run `35721119803` completed successfully on the first attempt.

Artifact:

```text
ORBIT-itch
16 files
194134 bytes
```

Downloaded artifact audit confirmed:

- index.html is at ZIP root
- packaged Engine tag is `<script data-sse-engine src="sukimastock-engine.js">`
- no repository Engine reference remains
- all five JS files pass syntax checking
- ja.json and en.json parse successfully
- all eight OGG files are valid Vorbis streams
- all eight OGG files are decodable with finite durations

## Final acceptance still pending

Do not remove `works/ORBIT/sukimastock-engine.js` yet.

The last acceptance gate is a real browser test of the generated standalone ZIP itself.

After that passes:

1. remove the obsolete work-local development Engine copy
2. keep canonical Engine reference for Staging
3. keep standalone-export.json as the distribution boundary
4. use the GitHub Actions artifact as the itch upload package
