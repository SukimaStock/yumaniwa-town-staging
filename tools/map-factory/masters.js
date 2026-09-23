(() => {
  'use strict';

  const BASE = `YUMANIWA TOWN / TOMOGUSHI ALLEY
BASE BUILDING / SOURCE ASSET MASTER v1

Create TWO variations of a neutral small storefront base for Tomogushi Alley in Yumaniwa Town.

PURPOSE

These are source assets, not final production-ready pixel sprites.
They will later be cropped, normalized in size, converted into clean native pixel art, manually adjusted, and combined with separate storefront parts.

Prioritize:
1. consistent visual language
2. clear simple silhouettes
3. useful structural differences
4. low visual density

Do NOT prioritize exact pixel dimensions or microscopic pixel accuracy.

ROLE

This is not a finished shop.
This is a reusable storefront shell.

Separate parts will later be added:
- noren
- hanging signs
- lanterns
- standing signs
- shop-specific props
- special identity parts

The base itself must remain neutral.
It must not clearly communicate a specific business type.

WORLD FEEL

Tomogushi Alley is a quiet small-town alley at night.

The building should feel:
- small
- modest
- slightly old
- practical
- handmade
- calm
- lived-in
- humble

Avoid:
- luxury
- prestige
- elegance
- tourist-attraction architecture
- formal historical reconstruction
- excessive cuteness
- decorative fantasy architecture

VIEW

Front-facing storefront.
Almost no horizontal perspective.
A very slight elevated game-map feeling is acceptable.
Both variations must use the same general camera and proportion family.

STRUCTURE

One-story storefront feeling.
A dark tiled roof with a broad simple silhouette.
Keep the upper area visually quiet.
The visual focus should remain around the first floor.

Use:
- simple wooden posts
- broad wall panels
- one entrance
- one main window area
- simple lower wooden panels
- restrained warm interior light

Do not make the facade too elaborate.

VARIATION RULE

Create two genuinely useful variations of the same architectural family.
Keep approximately 70% of the visual language shared.
Change approximately 30% of the structure.

Good differences include:
- entrance on opposite sides
- different window width
- different lattice rhythm
- slightly different beam placement
- slightly different lower panel structure

Do NOT create two completely different architectural styles.

DETAIL LEVEL

Keep the source visually simple.
Use broad shapes.

Avoid:
- fine wood grain
- tiny roof texture
- many small highlights
- realistic weathering
- dense window interiors
- tiny objects
- signage
- noren
- lanterns
- shop products

COLOR

Restrained muted palette:
- dark charcoal
- dark brown
- muted medium brown
- warm beige
- restrained amber light

Avoid saturated colors.

LIGHTING

Night setting.
Warm interior light is allowed.
Do not make the whole building glow.
Keep large dark areas.

SOURCE-ASSET REQUIREMENTS

Two standalone buildings side by side.
Keep both at approximately the same apparent scale.
Leave comfortable empty space around each building.
Do not crop the roof or bottom.

No people.
No street.
No neighboring buildings.
No scenery.
No signs.
No text.
No shop-specific objects.

Prefer a transparent or plain removable background.

FINAL GOAL

The two results should immediately feel like they belong to the same town and the same asset family, while being structurally different enough that they do not look like simple duplicates.`;

  const NOREN = `YUMANIWA TOWN / TOMOGUSHI ALLEY
NOREN / SOURCE ASSET MASTER v1

Create TWO variations of a small noren storefront overlay for Tomogushi Alley in Yumaniwa Town.

PURPOSE

These are source assets, not final production-ready pixel sprites.
They will later be cropped, resized, converted into clean native pixel art, manually adjusted, and placed onto a separate storefront base.

Prioritize:
1. clear silhouette
2. simple readable identity
3. compatibility with Tomogushi Alley
4. meaningful differences between the two variations

Do NOT prioritize exact pixel dimensions.

ROLE

This is NOT a complete storefront.
Do not draw a building.
Do not draw a shop.
Create only the noren assembly.

The noren acts as one identity layer placed onto an existing neutral storefront base.

STYLE

Quiet retro game asset feeling.
Simple low-resolution visual language.

Use:
- large simple cloth shapes
- hard readable edges
- restrained shading
- limited colors
- simple symbols

Avoid:
- realistic fabric rendering
- detailed folds
- embroidery texture
- many tiny highlights
- decorative illustration
- fashion design
- overly polished graphic design

WORLD FEEL

It must feel native to Tomogushi Alley:
- modest
- slightly nostalgic
- handmade
- quiet
- warm
- practical

It should not feel luxurious, prestigious, ceremonial, or like a historical tourist attraction.

STRUCTURE

The noren may use:
- two panels
- three panels
- four panels

Keep the overall form compact.
Use a simple horizontal hanging rod.
Cloth pieces should hang mostly straight.
Minor asymmetry is welcome.
Do not use dramatic wind movement.

IDENTITY

Use one large simple visual motif rather than many small details.
Symbols should remain understandable when reduced.
Avoid detailed typography and long written words.
If text-like marks are used, treat them as simple graphic symbols rather than readable lettering.

VARIATION RULE

Create two variations from the same visual family.
Keep the overall color language and mood consistent.

Make the differences visible through:
- panel count
- motif placement
- cloth proportion
- small structural differences
- slightly different symbol arrangement

Do not simply duplicate one design with tiny changes.

COLOR

Use muted colors compatible with dark wooden storefronts at night:
- faded red
- deep rust
- muted navy
- dark green
- warm beige
- dark brown

Avoid bright primary colors, pure white, and neon colors.

LIGHTING

Keep lighting restrained.
The noren itself should not glow.
Minor warm ambient influence is acceptable.

SOURCE-ASSET REQUIREMENTS

Two isolated noren assemblies side by side.
No storefront.
No wall.
No street.
No people.
No unrelated props.
No large scenery.

Leave generous empty space around each asset.
Do not crop any hanging cloth or rod.
Keep both variations at roughly similar apparent scale.
Prefer a transparent or plain removable background.

FINAL GOAL

The two noren should clearly belong to the same Yumaniwa Town asset system, while still being visually different enough to provide a real choice when assembling storefronts.`;

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

  window.YUMANIWA_SOURCE_MASTERS = { base: BASE, noren: NOREN };
  window.YUMANIWA_IDENTITIES = IDENTITIES;
})();