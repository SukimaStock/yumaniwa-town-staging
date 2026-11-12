# Bounded IDB × lossless formal save integration

This is a local integration candidate, not a Staging release or completed long-save acceptance.

## Inputs and sequence

- Storage and title integration: `1051d6e6fedfc0de1462668303d65cb3dc597453`, descending from main `0778bcf4555737ec45947a80aca8f761f39fa429`.
- Independently reviewed codec code: `1d642273d12973761855c9739ef70db279c313c5`. Its old Plan is not copied as a new approval.
- A new integration Plan is locked before these edits. Existing locks and branches are unchanged.
- Consignment #927 and world expansion are not silently included; they require the subsequent serial integration and cross-product evidence.

## Format and storage contract

The default `serializeSession` API still emits v8. Only the live app's `sessionText` explicitly selects `encoding: 'lossless-v1'`, emitting v9. Fresh start, import replacement, clock and ordinary actions use that one encoding path. An initial migration can preserve an already verified v8 head byte-for-byte; the next confirmed game write emits v9. Both formats are read by the official full reader.

Formal v9 is a bounded lossless representation of the complete logical v8 session, not history truncation or changed game rules. Original v8 wire limits remain. Decoder budgets and canonical validation remain mandatory. Codec unit success is not proof of device memory or acceptable restoration time.

IDB still has one player slot and bounded origin/metadata/head/previous records. Mixed v8/v9 generations are validated with the same official reader. The legacy raw source and immutable origin are retained. No new backup archive, automatic rollback, deletion or implicit previous-generation recovery is added.

A save becomes successful only after atomic commit and exact readback. Failed or uncertain commits cannot publish candidate game/ledger/history/recall state. Explicit confirmed new-start may re-open and revalidate an adapter; this is not an automatic retry.

## Browser module delivery

The ten-path incoming dependency closure is versioned with the exact `codec=v03` identifier. All parents of a changed shared module use one canonical URL identity. Cache tests compare against the exact predecessor, including cycles and dynamic dependencies, without replacing historical immutable graph anchors. Diagnostics accepts only the fixed codec identifier and reports the actual outer save version.

## Verification boundaries

Node tests exercise official native game/session readers and serialized transaction simulations. Those simulations are not native browser durability or physical-device evidence. The earlier native Chromium launch was blocked before any browser scenarios; there is no bypass or new claim of browser success here.

Five-strategy long formal save, cold restoration and next-month continuation use frozen original control snapshots maintained separately. Their original bytes must not be modified, and an independently generated expected complete session is required before encoding. A repeated regional strategy is not genuine multi-desk coverage.

Required CI, actual integration commit, full regression results, long capacity and performance evidence must be evaluated before any Staging merge. Production is not authorized.
