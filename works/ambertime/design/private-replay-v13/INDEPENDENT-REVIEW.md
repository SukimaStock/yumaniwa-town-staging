# Independent review

Reviewer /root/state_review inspected exact adapter SHA256 `8de2a4614f2e0bcb8a4a5e185fc0ef26eb201461a6f5e54884f4fbabfbff79f3` and loader `4f14245f3b0e38785d97594b1e0b2a7c5376d847f38f477591ecdd6c5295fb00`.

Findings addressed before final gate:
- Fill cannot be classified readonly: automatic assignment can invoke syncTown. Removed from allowlist; fallback native.
- Native enable-stage validation recurses. Rejecting nested validation rejected valid saves. Stack independent sessions and restore parent active/session in finally.
- Native/unknown operations invalidate prior cross-alias certificate. Recertify next safe region rather than assuming a global proof of all writers.
- Post-checkpoint exception is after verified native cache promotion, not proof of unchanged cache identity.

Final source inspection found no new safety blocker in the limited four-key scope. Dynamic price/list coverage was requested separately; start/stop are covered by existing prefix tests. This is not endorsement of broad mutable-town sharing or shipped connection.

C faults occur in readonly journal regions and cannot prove changed-town rollback. Synthetic town-after-bottling funds rollback is full-state native-equal but month uses native fallback (zero omitted clones/journal segments); this limitation is intentional. Native observer tests remain native.

Dynamic price/list coverage subsequently completed with native legal operations and B/C separate-process formal/canonical equality (results/price-list-summary.json). No adapter/loader changes.
