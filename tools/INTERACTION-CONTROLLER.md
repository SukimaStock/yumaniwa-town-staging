# Town interaction ownership (Phase 4)

`town-interaction-flow.js` owns one private movement request:

```js
{sceneId, path: [{x, y}], pathIndex, arrival: {type: 'none' | 'trigger' | 'edgeWarp', triggerId?, side?}}
```

`YUMANIWA_TOWN_INTERACTION` is called explicitly by canvas input, main's update
loop, keyboard/D-pad, action button, message confirmation, Editor lifecycle and
scene transitions. No global movement/action function is captured or replaced.

- `requestTap` chooses dedicated prop tap geometry, ordinary trigger, exit, ground.
  Existing `tap:false` policies and footY ordering are retained.
- Every request entry cancels its predecessor **before** eligibility/path search.
  Failure leaves no old path or arrival action. A selected unreachable trigger
  does not fall through to ground movement.
- `requestGroundMove`, `requestTrigger(id)`, `requestEdgeWarp(candidate)` create the
  same request shape. Empty paths pass through the same completion function.
- Completion consumes the request before dispatch. Trigger IDs are resolved from
  current scene triggers; scene, enabled status and player proximity are checked.
  Unknown/removed/disabled/out-of-range targets are rejected. Edited replacements
  with the same ID are read at arrival, not captured at request time.
- Main retains pathfinding, collision, player geometry, facing and manual edge warp.
  Approach tiles must be inside the existing two-tile activation proximity.
  Dynamic blocked paths cancel. Only an explicit edge arrival requests a tap warp;
  the update loop no longer independently warps on arbitrary tap movement.
- `getRequest()` returns a detached diagnostic copy. `isMoving()` is read-only.
  The tap marker remains visual state only. No focus state is stored or invalidated
  by hints. `getNearbyTrigger` and `updateInteractionHint` are interaction readers.

## Accepted activation

Tap arrival and all manual action controls use `activateTrigger(id)`.
It cancels movement, resolves and validates the current trigger, faces it, obtains
an ephemeral ghost payload if needed, then dispatches the existing behavior:

| Type | Behavior |
| --- | --- |
| tourist_map ID | Station guide map |
| work | Existing work launch; missing work displays its preparation message |
| inspect | Message |
| menu | Existing direct menu; shinpo retains its note-rack behavior |
| warp | Description, then second action confirms scene transition |

Only a `true` dispatch result notifies the known hooks:
`YumaniwaMemory.onTriggerActivated(trigger)` and
`YUMANIWA_TRIGGER_ANALYTICS.onTriggerActivated(trigger, sourceSceneId)`.
Analytics retains its existing Venue Open event policy; it does not add an event
for every inspect. Source scene is captured before menu dispatch changes scenes.
Cancelled/unreachable/failed activations do not notify hooks.

Ghost exposes `YUMANIWA_GHOST_NPC.prepareActivation(trigger)` and returns a temporary
payload. Its existing initial placement and render offset are unchanged. No
canonical, baseline, draft or history write is introduced by conversations.

## Confirmation and lifecycle

`pendingWarp` remains a separate message-confirmation target in main. Cancelling
movement does not clear an open confirmation. Normal `closeMessage`, a new message,
Editor lifecycle and scene transition clear it. `handleAction` consumes the target
before closing the message and calling the existing scene transition. Message tap
uses that same action entry; Escape/ordinary message close does not transition.

Editor open/close, messages, guide/work overlays, manual movement and scene change
cancel movement; rejected/dirty scene transitions cancel it too. Editor session
state never stores interaction state. Returning from an overlay cannot restart an
old request.

## Verification and remaining scope

```sh
node tests/test-town-interaction.cjs
node tests/test-editor-session.cjs
node tests/test-editor-history.cjs
python3 tests/test_editor_session_desk.py
python3 tests/test_scene_validation.py
```

The interaction tests run actual pathfinding, movement, input handlers, memory and
analytics modules under strict mode with frozen canonical definitions. DOM layout,
rendering and fade timing are simulated; this is not browser E2E.

Destination management, ghost placement, trigger.area schema, asset retry,
environment detection and non-trigger analytics wrappers remain outside Phase 4.
