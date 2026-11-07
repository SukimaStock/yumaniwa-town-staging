> Historical D1 stop record, preserved unchanged below. The separately authorized repair is documented in [D1-R-REPORT.md](D1-R-REPORT.md). D1 overall remains incomplete.

# Decision: do not proceed to D2

B's exact reconstruction and short future equivalence are promising, but D1 has not met all acceptance conditions. In particular malformed active-history data is silently overwritten rather than rejected. Preserve this failed prototype and evidence; do not call it a successful limited trial.

A separately authorized D1 correction would first define an exact candidate grammar: allowed keys at envelope/table/active town boundaries, disallow active history shadows, require all schemas used or explicitly define allowed unused schemas, validate each representation before hydrate. Then rerun the failing test and all earlier gates with an independent reviewer. This is a proposal, not implemented work. Do not simply trust a matching final hash as structural validity.

Formal design still requires full record existence/order/ID/causality and operation/RNG/collector equivalence; origin and same-generation assurances; safe old-v8 retention and independently verified fallback; bounded validation without repeatedly constructing a huge legacy JSON; growth/capacity analysis; native browser and Safari memory/storage verification. The present independently anchored full-hydrate codec solves none of those deployment contracts.

The 100-year hydrated game remains above the formal cap. No cap increase, official validator replacement, record aggregation/deletion, checkpoint redesign, or IndexedDB introduction is authorized by this result. S3 remains incomplete; author decision required before D1 repair or D2.
