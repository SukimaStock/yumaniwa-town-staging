# A1-2 candidate measurement (scratch-only)

Base aabc77cb54f10838b8b9975161fda29b84977b51. No repository files edited.

The runner serves base repository bytes over local HTTP, seeds the same legal collecting state, loads the actual app, and ends collection with a real Playwright pointer click. performance.now and clocks are unmodified. Baseline250 uses the shipped sample and paint methods. Candidate350/400/450/500 overrides only CanvasScene sampleDistillCompletion/paintDistillCompletion in the browser prototype. These are experiments, not the final implementation or evidence of its frame guard.

Candidates preserve the existing glass movement and start light at150ms.350 uses170ms light+30ms tail;400 uses200ms light+50ms tail;450/500 use200ms light+100/150ms tail. Light is a4-native-cell horizontal cream segment in3steps (x+2,+4,+6), each cell3logicalpx. Formal snapshots and serialized stored games match D.stopDistillation(expected) in every case; page errors0.

Each draw record is sampled before/after the actual CanvasScene.draw call and captures canvas world-key change, glass position, sliding, completionStep, modal state. Since the base draw composites world to main canvas synchronously, a changed world key with nonzero step on a completed draw identifies an actual destination-canvas glint composition. RAF records are observational independent callbacks and do not ask CanvasScene to paint or change the product's scheduling. They show browser rendering opportunities while the glint pixels persist, not a physical display guarantee. Capturing canvas PNG inside draw adds minor observation overhead. Modal visibleRAF is the next RAF with open modal, visible CSS and nonempty bounds; it is not physical display timing.

All captured images are main scene canvas PNGs after actual draw, except modal PNGs which are page screenshots. This excludes DOM overlays from canvas captures; scene access/hit elements are transparent and modal remains closed at every glint draw. Stage labels are actual observed steps. results.json retains every recorded draw/RAF opportunity and absolute performance timestamps; summary.csv has relative timings.

350ms is recommended as the shortest candidate giving170ms intended light, three changed destination-canvas draws and several intervening RAF opportunities, without a long empty tail.400 adds30ms light and20ms blank tail;450/500 add only blank tail. Candidate350 observed light persistence183.3ms Chromium/178ms WebKit, compared66.6ms Chromium/106ms WebKit baseline. Natural browser modal-visible-RAF can add processing/RAF latency beyond the nominal duration. Do not interpret these observations as author iPhone Safari visibility confirmation.

The production implementation must separately ensure successful paint stages and bounded fallback under frame loss. These scratch candidates retain base elapsed-only finish and do not prove that improvement.
