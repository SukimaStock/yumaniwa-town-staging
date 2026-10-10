# PUMPOKO FEEL LAB — order-comparison study

Base HEAD: `2ebe228a1348294f3ed8fcf6796b6292b19b486c` (staging). All changes are work-local. PUMPOKO 02, shared Engine/Codea and production are untouched.

## Owner-led comparison

User iPhone observations in Phase 1: ROLL finds slope acceleration in A (FLOW) and C (PUMP) especially enjoyable; BOUNCE finds B (RHYTHM) and D (BREATH) enjoyable for jumping.

Phase 2 adds a third lab mode **順番比較** with four courses:

- A→C: original FLOW then original PUMP
- C→A: original PUMP then original FLOW
- B→D: original RHYTHM then original BREATH
- D→B: original BREATH then original RHYTHM

The same prior Hermite arrays are reused. The second course is *translated only*, not resculpted or rescaled. A short 180-unit transition joins them: the first 55 units ease the first course endpoint tangent to zero, the middle 70 units are flat, and the last 55 units smoothly introduce the second course entry tangent (Hermite C1 contact). No new accelerators, physical settings, holes or baton mechanics are added. Each composed course's range is x=-500..4080. The join is displayed as “つなぎ” between sections, and a brief “前半/後半” status shows which part is being played.

Original single 8 and chain 4 modes are retained. All 4 pair options remain selectable with either fruit, but toggling character defaults to the owner-preferred comparison (pumpkin A→C, rutabaga B→D). The optional local note save records active kind/mode/order, source course IDs, exact composed Hermite control points and optional impression under the existing localStorage key. Updated work-local JS and CSS use versioned assets to avoid stale iPhone Safari cache.

## Tests

Exact PUMPOKO 02 `physics.js`, `world.js` and `draw.js` loaded unmodified into a synthetic DOM/canvas environment together with the candidate FEEL LAB runtime. Tested 2 fruits × 4 order pairs, each using 13 seconds simulated 60Hz right-hold input. All 8 advanced past x=1880 into the second section with no JS exceptions; across the eight, x after input ranged from 3736 to 4033. Camera view zoom was finite and positive; its sampled local min/max floor elevations were inside the logical canvas in all eight observations. The four generated courses each contained 27 points with strictly increasing X; both endpoints of the connector shared one elevation and internal flats have zero slope. Tested mode switching to original chain FLOW and single halfpipe, and saving B→D with sourceCourses = rhythm/breath, junctionX and 27 point records.

These model/DOM tests do **not** establish real iPhone Safari visual integrity, touch responsiveness or enjoyable sequencing. Those must be checked by the owner. Release/production is not authorized. Formal verificationState remains UNVERIFIED.

## Manual experiment

1. Choose “順番比較 4種”; pumpkin defaults to A→C. Test A→C and C→A in both directions, watching where momentum builds, stalls or feels self-made.
2. Switch to rutabaga; B→D should be selected by default. Test B→D and D→B, attending to the transition between successive rebounds and the quiet flat.
3. Test RESET, body change, seam crossing, reverse movement, mobile button taps and source course labels. Save a short memo for anything worth adopting.
4. After iPhone evaluation, consider introducing holes as a separate factor. **Do not** interpret this comparison as evidence about hole placement.

Rollback: revert isolated PR and retain prior connected course study.
