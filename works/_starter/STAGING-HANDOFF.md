# Staging Handoff

Move a work from local rough development to Staging when one meaningful play loop exists.

## Handoff checklist

1. Put the work at `works/<work-id>/`.
2. Confirm `work-config.js` id/title/size/frameRate.
3. Change the marked Engine script from the local snapshot to the canonical repository Engine.
4. Keep the local Engine copy temporarily as rollback during the first canary.
5. Load the Staging URL normally.
6. Load the same URL with `?dev=1`.
7. Play one ordinary loop on the real target device.
8. Check Session Report.
9. If accepted, remove the obsolete work-local Engine copy.
10. If the work will ship standalone, create/update `standalone-export.json`.

## Important

Do not use the handoff as an excuse to redesign the work.

The first Staging pass should be a **behavior-zero migration**:

```text
same work
same tuning
same save semantics
same audio levels
different shared runtime source
```

Only after the canary passes should shared systems be migrated further.

## Useful request to ChatGPT

When ready, say:

```text
この作品は1ループ遊べるようになりました。
Staging Handoffを開始してください。
まず挙動を変えず、canonical Engineへの接続とcanary確認だけ進めてください。
```
