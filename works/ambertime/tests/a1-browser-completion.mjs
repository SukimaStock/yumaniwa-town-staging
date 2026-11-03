// A1 completion entrypoint retained for existing verification commands.
// A1-2 intentionally replaces the old 250/300/400ms, two-cell/two-stage
// assumptions with natural-time 350ms, four-cell/three-stage checks.
// Coverage is strengthened in the shared runner: every original viewport now
// runs both motion modes; all three glint stages have strict bounded pixel and
// unchanged hit/DOM/focus/ARIA checks; save/formal/callback/lifecycle assertions
// remain, with extra conflict/reset/font/context/RAF-stop and rapid-click cases.
// Original A1 candidate measurements remain immutable in Git and A1 design/.
import './a1-2-browser-completion.mjs';
