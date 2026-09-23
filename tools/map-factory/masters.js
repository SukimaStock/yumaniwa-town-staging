(() => {
  'use strict';

  const COMMON = `SOURCE-ASSET COMMON RULES

These are source assets, not final production-ready pixel sprites.
They will later be cropped, normalized, converted into clean native pixel art, manually adjusted, and combined in Map Factory.

Prioritize:
1. clear silhouette
2. low visual density
3. consistent Tomogushi Alley world feel
4. useful differences between two variations

Do NOT prioritize exact final pixel dimensions.

WORLD FEEL
- quiet small-town alley at night
- modest
- handmade
- slightly old
- practical
- calm
- lived-in

VISUAL LANGUAGE
- simple low-resolution retro game asset feeling
- broad shapes
- hard readable edges
- restrained shading
- limited muted colors
- no realistic texture
- no decorative noise
- no glossy modern branding

Create TWO isolated variations side by side.
Keep both at roughly similar apparent scale.
Leave generous empty space around each asset.
Prefer a transparent or plain removable background.`;

  const BASE = `YUMANIWA TOWN / TOMOGUSHI ALLEY
BASE BUILDING / SOURCE ASSET MASTER v1

Create TWO variations of a neutral small storefront base.

${COMMON}

ROLE

This is not a finished shop.
This is a reusable storefront shell.
Separate parts will later be added: noren, signs, lanterns, boards, and shop-specific props.

The base itself must remain neutral.
It must not clearly communicate a specific business type.

VIEW

Front-facing storefront.
Almost no horizontal perspective.
A very slight elevated game-map feeling is acceptable.
Both variations must use the same camera and proportion family.

STRUCTURE

One-story storefront feeling.
Use:
- dark tiled roof with broad simple silhouette
- simple wooden posts
- broad wall panels
- one entrance
- one main window area
- simple lower wooden panels
- restrained warm interior light

Keep the upper area visually quiet.
The visual focus should remain around the first floor.

VARIATION RULE

Keep approximately 70% shared and 30% different.

Useful differences:
- entrance on opposite sides
- different window width
- different lattice rhythm
- slightly different beam placement
- slightly different lower panel structure

Do NOT create two unrelated architectural styles.

AVOID

No signage.
No noren.
No lanterns.
No products.
No shop-specific objects.
No people.
No street.
No scenery.
No readable text.

FINAL GOAL

Two neutral building vessels that immediately belong to the same Yumaniwa Town asset family while still being structurally distinguishable.`;

  const NOREN = `YUMANIWA TOWN / TOMOGUSHI ALLEY
NOREN / SOURCE ASSET MASTER v1

Create TWO variations of a small noren storefront overlay.

${COMMON}

ROLE

Create only the noren assembly.
Do not draw a building or complete shop.

STRUCTURE

Possible forms:
- two panels
- three panels
- four panels

Use a simple horizontal hanging rod.
Keep the cloth mostly straight.
Minor asymmetry is welcome.
No dramatic wind movement.

IDENTITY

Use one large simple motif rather than many small details.
Symbols must remain understandable when reduced.
Avoid detailed typography and long readable words.

VARIATION RULE

Keep the same color family and mood.
Vary:
- panel count
- motif placement
- cloth proportion
- small structural differences

AVOID

No building.
No wall.
No people.
No unrelated props.
No realistic fabric folds.
No ornate textile design.

FINAL GOAL

Two quiet shop-identity layers that clearly belong to the same system but offer a meaningful visual choice.`;

  const SIGN = `YUMANIWA TOWN / TOMOGUSHI ALLEY
SIGN / SOURCE ASSET MASTER v1

Create TWO variations of a small storefront sign asset.

${COMMON}

ROLE

Create only a compact sign that gives one visual clue about the shop.
It may be:
- a hanging sign
- a small projecting sign
- a small wall plaque

Keep it secondary to the building.

FORM

Use a simple physically plausible structure:
- dark wood
- painted wood
- muted metal
- simple bracket, rope, or hook if needed

IDENTITY

Prefer ONE strong symbol:
- object silhouette
- geometric mark
- food or drink symbol
- simple tool
- abstract shop emblem

Do not explain the whole business.
Do not use long readable text.

VARIATION RULE

Two variations from the same family.
Good differences:
- vertical vs square
- hanging vs projecting
- centered vs offset motif
- slightly different frame construction

AVOID

No building.
No full storefront.
No modern corporate branding.
No detailed lettering.
No ornate frame.
No neon.

FINAL GOAL

A tiny readable identity clue that can be attached to many storefront bases without overpowering them.`;

  const LANTERN = `YUMANIWA TOWN / TOMOGUSHI ALLEY
LANTERN / SOURCE ASSET MASTER v1

Create TWO variations of a small storefront lantern overlay.

${COMMON}

ROLE

The lantern primarily communicates:
- the shop is open
- warm human presence
- nighttime alley atmosphere

It does NOT need to strongly identify the business type.

FORM

Possible forms:
- small round lantern
- short oval lantern
- compact rectangular paper lantern
- simple hanging lamp inspired by traditional storefront lighting

Keep it modest and small.

LIGHT

Warm amber or muted orange.
The lantern may look illuminated, but avoid a large glow halo.

VARIATION RULE

Good differences:
- rounder vs slightly taller
- simple mark vs blank
- short tassel vs none
- different hanging hardware

AVOID

No building.
No scene lighting.
No giant lantern.
No realistic paper texture.
No elaborate calligraphy.
No strong bloom.

FINAL GOAL

A quiet night-presence layer, visually useful but never the centerpiece.`;

  const BOARD = `YUMANIWA TOWN / TOMOGUSHI ALLEY
STANDING BOARD / SOURCE ASSET MASTER v1

Create TWO variations of a small standing storefront board.

${COMMON}

ROLE

The board adds everyday shop activity near the entrance.
It may suggest today's item, menu, recommendation, or opening information.
Actual writing does not need to be readable.

FORM

Possible structures:
- small A-frame board
- single wooden standing board
- narrow menu plaque
- handmade sign leaning slightly

Keep complete ground-contact silhouette visible.

CONTENT

Use only a few large graphic marks:
- one simple symbol
- two or three block-like text marks
- one tiny decorative icon

Treat text as graphic marks, not readable typography.

VARIATION RULE

Good differences:
- A-frame vs single panel
- taller vs wider
- icon at top vs center
- different simple wood construction

AVOID

No building.
No street scene.
No realistic chalk writing.
No dense menu.
No modern printed signage.

FINAL GOAL

A small secondary prop that makes the shop feel active and inhabited.`;

  const SPECIAL = `YUMANIWA TOWN / TOMOGUSHI ALLEY
SPECIAL PART / SOURCE ASSET MASTER v1

Create TWO variations of ONE small shop-specific special prop.

${COMMON}

ROLE

This is the memorable shop-specific accent.
It should provide one clue about what makes this shop different.

CORE RULE

Create ONE visual idea per variation.
Do not create a pile of unrelated props.
Memorability should come from silhouette, not detail count.

PLACEMENT

The prop should plausibly sit:
- beside the entrance
- below a window
- against the wall
- under an awning

It must remain secondary to the building.

IDENTITY

Choose one clear object family appropriate to the shop identity.
Examples:
- beverage crates
- stacked bottles
- curry pot
- coffee sack
- repair toolbox
- flower bucket
- old delivery box

VARIATION RULE

Two interpretations of the SAME idea:
- one crate vs two stacked crates
- closed container vs slightly visible contents
- neat vs mildly irregular arrangement

Do not switch to an unrelated object category.

AVOID

No building.
No full display scene.
No people.
No clutter.
No many tiny objects.
No realistic textures.

FINAL GOAL

One small memorable clue that helps distinguish the shop without making the storefront busier.`;

  const IDENTITIES = {
    neutral: {
      name: 'Neutral',
      text: ''
    },
    'craft-cola': {
      name: 'Craft Cola',
      text: `IDENTITY ADD-ON / CRAFT COLA

This part belongs to a small neighborhood craft-cola shop.

MOOD
- handmade rather than branded
- quiet and slightly nostalgic
- small local maker, not a modern beverage company

VISUAL MOTIFS
Use only what suits the selected asset type:
- simple cola bottle silhouette
- carbonation bubbles
- citrus-like geometric marks
- subtle botanical shapes
- bottle crates

ACCENT COLORS
- faded cola red
- dark brown
- warm cream

AVOID
- sake shop appearance
- liquor store appearance
- beer-bar appearance
- izakaya appearance
- modern soda branding
- American diner aesthetics
- large readable logos

Keep the identity subtle. It should still look like a quiet neighborhood shop.`
    }
  };

  window.YUMANIWA_SOURCE_MASTERS = {
    base: BASE,
    noren: NOREN,
    sign: SIGN,
    lantern: LANTERN,
    board: BOARD,
    special: SPECIAL
  };
  window.YUMANIWA_IDENTITIES = IDENTITIES;
})();