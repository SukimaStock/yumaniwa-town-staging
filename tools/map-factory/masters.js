(() => {
  'use strict';

  const COMMON = `SOURCE-ASSET COMMON RULES

These are source assets, not final production-ready pixel sprites.
They will later be cropped, normalized, converted into clean native pixel art, manually adjusted, and combined in Map Factory.

Prioritize:
1. clear silhouette
2. low visual density
3. consistent Tomogushi Alley world feel
4. useful differences between variations

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

Keep assets isolated.
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

VARIATION RULE

Two interpretations of the SAME idea.
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

  const KIT_MASTER = `YUMANIWA TOWN / TOMOGUSHI ALLEY
IDENTITY KIT SHEET / PRODUCTION MASTER v1

Create one practical source-asset sheet for one small neighborhood shop in Yumaniwa Town.

IMPORTANT PURPOSE

This is NOT a poster.
This is NOT a presentation board.
This is NOT a complete shop illustration.
This is NOT a finished game sprite sheet.

This is a practical source-asset kit for Map Factory.

The image will later be:
- automatically detected
- split into individual parts
- cropped
- separated
- compared
- combined with other storefront parts
- normalized
- converted into clean native pixel art
- manually refined

THE MOST IMPORTANT GOALS

1. strong visual consistency
2. restrained detail
3. useful variety
4. clear separation between parts
5. unified scale feeling
6. easy automatic cutout
7. compatibility with the fixed Yumaniwa Identity Kit Sheet layout

Do NOT make any individual asset feel like a hero illustration.


FIXED SHEET STRUCTURE

Create exactly 32 assets in exactly these six groups.

TOP LEFT:
BASE BUILDINGS
exactly 2 variations

TOP RIGHT:
NOREN
exactly 6 variations
arranged as 2 rows × 3 columns

MIDDLE LEFT:
SIGNS
exactly 6 variations
arranged in one horizontal row

MIDDLE RIGHT:
LANTERNS
exactly 6 variations
arranged in one horizontal row

LOWER MIDDLE:
STANDING BOARDS
exactly 6 variations
arranged in one horizontal row

BOTTOM:
SPECIAL SHOP PROPS
exactly 6 variations
arranged in one horizontal row

TOTAL:
32 assets

Do not change the number of assets.

Keep each asset centered in its own visual slot.
Leave generous empty space around every individual asset.
No asset may touch another asset.
Do not overlap objects.
Do not combine multiple slots into one scene.


BACKGROUND

Use a plain clean background that is easy to remove.

Prefer:
- transparent background
or
- plain warm white / very light neutral background

Do NOT use:
- textured paper
- wood background
- gradients
- whole-sheet shadows
- poster backgrounds
- decorative borders
- section boxes
- environment scenery


NO TEXT OR PRESENTATION ELEMENTS

Do not add:
- titles
- headings
- captions
- category names
- arrows
- explanations
- decorative labels
- promotional text

The final image should contain only the 32 source assets.


OVERALL STYLE

True low-resolution 2D pixel art.

The entire sheet must feel like one coherent set of handcrafted retro game map assets.

Use:
- clearly visible square pixels
- chunky pixel clusters
- hard edges
- broad simple shapes
- restrained shading
- deliberately low visual density
- simple readable silhouettes

The designs should feel as if they were originally created at a small native pixel resolution and enlarged with nearest-neighbor scaling.

Do NOT imitate pixel art by adding many tiny high-resolution square details.
The underlying designs themselves must remain simple.


PIXEL CONSISTENCY

This is extremely important.

All six asset groups must share:
- the same logical pixel size
- the same outline thickness
- the same amount of detail
- the same shading complexity
- the same rendering quality

A lantern must not look more detailed than a building.
A special prop must not look like a separate illustration.
A sign must not use thinner pixels than the other parts.

Everything must feel produced in the same asset batch.


WORLD FEEL

Tomogushi Alley is a quiet small-town alley at night.

Every shop should feel:
- small
- modest
- slightly old
- practical
- local
- calm
- handmade
- warmly inhabited
- familiar rather than impressive

Avoid:
- luxury
- prestige
- fashionable styling
- chain-store polish
- tourist-attraction aesthetics
- highly designed commercial branding
- hero-object presentation


IMPORTANT ANTI-LUXURY RULE

Do not over-design the assets.

Slight plainness is desirable.
Slight awkwardness is acceptable.
Some assets may feel ordinary.

Do not make every object beautiful, premium, ornamental, or highly polished.

The charm should come from:
- consistency
- simplicity
- usefulness
- warmth
- small differences
- quiet handmade feeling

If an asset begins to look impressive, dramatic, luxurious, or highly polished, simplify it.


COLOR SYSTEM

Use one unified muted night palette across the entire sheet.

Always include:
- dark brown
- charcoal
- warm beige
- faded cream
- restrained amber
- very dark outline color

Add only a small number of identity-specific accent colors.

Avoid:
- neon
- strong saturation
- glossy commercial colors
- pure white dominating an asset
- many unrelated accent colors


BASE BUILDINGS

Create exactly 2 neutral storefront base variations.

The BASE buildings must remain reusable and mostly neutral.

They should feel:
- small
- wooden
- modest
- slightly old
- one-story in feeling
- quiet

Use:
- dark simple tiled roof
- wooden posts
- one entrance
- one main window area
- lower wooden panels
- restrained warm interior light

The two BASE variations should share approximately 70% of their design language.

Useful differences:
- entrance left vs right
- different window width
- different lattice rhythm
- slightly different beam placement

Do NOT add:
- noren
- signs
- lanterns
- standing boards
- shop-specific symbols
- products
- shop-specific decoration

The BASE assets should still be usable for other small shops.


NOREN

Create exactly 6 noren variations in 2 rows × 3 columns.

Use simple compact 2-panel or 3-panel forms.
Use one main identity motif per noren.
Vary color and motif while keeping the same overall family.

Avoid:
- readable shop names
- typography
- elaborate patterns
- realistic fabric folds


SIGNS

Create exactly 6 small sign variations in one horizontal row.

Possible forms:
- narrow vertical hanging sign
- small square hanging sign
- round projecting sign
- compact rectangular plaque

Use one clear identity symbol per sign.

Avoid:
- long text
- typography
- ornate sign frames
- oversized brackets
- luxury signage


LANTERNS

Create exactly 6 lantern variations in one horizontal row.

Their main role is:
- nighttime presence
- shop-open feeling
- warm human atmosphere

Possible forms:
- small round lantern
- short oval lantern
- compact rectangular lantern
- small framed hanging lamp

Some lanterns should be almost plain.

Use restrained warm light.
No strong bloom.
Do not make all lanterns identical or overly decorative.


STANDING BOARDS

Create exactly 6 standing board variations in one horizontal row.

Possible forms:
- A-frame board
- narrow standing board
- simple leaning board

Use only a few large graphic marks.
Do not create detailed readable menus.
Keep them modest and handmade.


SPECIAL PROPS

Create exactly 6 shop-specific prop variations in one horizontal row.

Each slot must contain ONE clear prop idea.

Keep all props compact.
Do not create full scenes.
Do not add people.
Do not combine many unrelated objects into one slot.
The props must feel useful beside a small storefront, not like decorative hero objects.


VARIATION PHILOSOPHY

Aim for approximately:
70% shared visual language
30% meaningful variation

Variation should come from:
- shape
- proportion
- motif
- mounting method
- arrangement

Not from:
- radically different art styles
- different pixel densities
- different lighting quality
- dramatically different palettes
- different realism levels


SIZE FEEL

Keep apparent scale consistent within each category.

BASE assets are naturally larger.

NOREN, SIGN, LANTERN, BOARD, and SPECIAL must all feel proportionally appropriate for the same small storefront.

Do not create oversized signs, giant lanterns, or huge props.


LIGHTING

Use restrained nighttime lighting.

Warm amber may appear in:
- BASE windows
- LANTERNS
- small highlights

No cinematic lighting.
No dramatic glow.
No deep photographic shadows.
No atmospheric background lighting.


FINAL GOAL

The final image should look like a practical internal game-development asset sheet for one small neighborhood shop in Yumaniwa Town.

It must contain exactly:
- 2 BASE
- 6 NOREN
- 6 SIGN
- 6 LANTERN
- 6 BOARD
- 6 SPECIAL

The entire sheet should feel as though one pixel artist created all 32 assets at the same time for the same town.

Success means:
- unified color palette
- unified pixel density
- unified scale feeling
- restrained detail
- no unnecessary luxury
- clear shop identity
- clean separation for automatic Map Factory import
- enough variation to assemble several different storefronts
- the result feels native to Yumaniwa Town

Apply the following SHOP IDENTITY ADD-ON carefully.
The add-on defines motifs, accent colors, special props, and what to avoid.
Do not let the identity override the fixed sheet structure or consistency rules above.`;

  const KIT_IDENTITIES = {
    'craft-cola': {
      name: 'Craft Cola',
      text: `SHOP IDENTITY ADD-ON / CRAFT COLA

SHOP FEEL
A small neighborhood craft-cola maker.
Handmade rather than branded.
Quiet, local, slightly nostalgic, experimental but modest.

IDENTITY MOTIFS
Use only one or two per asset:
- simple cola bottle silhouette
- carbonation bubbles
- citrus-like circular slice
- small botanical leaf
- abstract drink emblem

ACCENT COLORS
- faded cola red
- deep rust
- warm cream
- dark brown
- small muted olive-green accents

NOREN / SIGN / LANTERN / BOARD MOTIFS
- bottle
- bubbles
- citrus
- leaf
- simple abstract cola mark

SPECIAL PROP IDEAS
Create six compact variations based on:
- wooden cola bottle crate
- faded red beverage crate
- two stacked bottle cases
- small cluster of glass bottles
- botanical ingredient box
- compact delivery crate

AVOID
- sake shop appearance
- liquor store appearance
- beer-bar appearance
- izakaya appearance
- modern soda branding
- American diner aesthetics
- luxury craft beverage branding
- large readable logos`
    },

    kissaten: {
      name: 'Kissaten',
      text: `SHOP IDENTITY ADD-ON / KISSATEN

SHOP FEEL
A small traditional neighborhood kissaten.
Familiar, calm, slightly old, quietly warm.
Not a fashionable specialty coffee shop.

IDENTITY MOTIFS
Use only one or two per asset:
- coffee cup
- coffee bean
- coffee pot
- dripper
- steam
- spoon
- simple cake slice

ACCENT COLORS
- deep coffee brown
- muted brick red
- warm cream
- dark brown
- small muted olive-green accents

NOREN / SIGN / LANTERN / BOARD MOTIFS
- cup
- bean
- coffee pot
- dripper
- steam
- spoon

SPECIAL PROP IDEAS
Create six compact variations based on:
- wooden crate with cups and saucers
- coffee bean sack
- wooden box with bottles or containers
- small manual coffee grinder
- modest leafy potted plant
- small cake or pastry display case

AVOID
- modern third-wave coffee aesthetics
- takeaway paper cups
- latte art
- minimalist Scandinavian cafe design
- luxury coffee packaging
- fashionable chain-cafe styling
- large English typography`
    },

    curry: {
      name: 'Curry Shop',
      text: `SHOP IDENTITY ADD-ON / CURRY SHOP

SHOP FEEL
A small neighborhood curry shop.
Warm, practical, local, handmade, slightly old.
The curry identity should be clear without turning into an exotic restaurant poster.

IDENTITY MOTIFS
Use only one or two per asset:
- curry bowl
- rice-and-curry plate
- spoon
- pot
- steam
- spice leaf
- small chili
- naan-like oval bread

ACCENT COLORS
- muted curry yellow
- faded saffron
- dull brick red
- warm cream
- muted green
- dark brown

NOREN / SIGN / LANTERN / BOARD MOTIFS
- bowl
- spoon
- pot
- steam
- spice leaf
- naan-like oval

SPECIAL PROP IDEAS
Create six compact variations based on:
- stacked curry pots
- small bottled-drink crate
- spice box or spice crate
- small rice or ingredient sack
- bread or wrapped-goods box
- simple herb or ingredient box

AVOID
- giant plated curry glamour shots
- chef mascots
- flashy ethnic restaurant poster design
- dense flag-like decoration
- ornate palace motifs
- exoticized travel-poster imagery
- chain curry branding
- long readable text`
    },

    yakitori: {
      name: 'Yakitori Shop',
      text: `SHOP IDENTITY ADD-ON / YAKITORI SHOP

SHOP FEEL
A small neighborhood yakitori shop.
Warmly active, familiar, modest, slightly smoky, practical.
It should read as a yakitori shop rather than a generic izakaya or liquor store.

IDENTITY MOTIFS
Use only one or two per asset:
- skewer
- crossed skewers
- simple chicken silhouette
- charcoal brazier
- grill grid
- small fan of smoke
- bowl or plate
- round stamp-like emblem

ACCENT COLORS
- dull red
- muted ochre
- warm beige
- faded cream
- smoky brown-gray
- dark brown
- restrained warm orange

NOREN / SIGN / LANTERN / BOARD MOTIFS
- skewer
- crossed skewers
- chicken
- grill grid
- smoke
- small bowl

SPECIAL PROP IDEAS
Create six compact variations based on:
- small charcoal grill or brazier
- box or tray of skewers
- small bottled-drink crate
- ingredient crate or prep box
- small stool or utility container
- simple smoke-exhaust or grill utility object

AVOID
- beer mug focus
- sake bottle branding
- large alcohol symbolism
- loud izakaya text
- flashy festival stall aesthetics
- chain tavern styling
- giant food displays
- dramatic grilled-meat close-ups`
    }
  };

  const FOCUS_IDENTITIES = {
    neutral: {
      name: 'Neutral',
      text: ''
    },
    'craft-cola': {
      name: 'Craft Cola',
      text: `IDENTITY ADD-ON / CRAFT COLA

Use one simple craft-cola clue appropriate to this part:
- bottle silhouette
- bubbles
- citrus mark
- subtle leaf
- beverage crate

Use faded cola red, dark brown, warm cream, and muted olive accents.

Avoid sake-shop, liquor-store, beer-bar, izakaya, modern soda-brand, and American-diner appearance.
Keep the identity subtle and neighborhood-scale.`
    },
    kissaten: {
      name: 'Kissaten',
      text: `IDENTITY ADD-ON / KISSATEN

Use one simple kissaten clue appropriate to this part:
- coffee cup
- bean
- pot
- dripper
- steam
- spoon

Use deep coffee brown, warm cream, muted brick red, and restrained olive accents.

Avoid modern third-wave coffee, takeaway cups, latte art, luxury branding, and fashionable chain-cafe styling.`
    },
    curry: {
      name: 'Curry Shop',
      text: `IDENTITY ADD-ON / CURRY SHOP

Use one simple curry-shop clue appropriate to this part:
- bowl
- spoon
- pot
- steam
- spice leaf
- naan-like oval

Use muted curry yellow, faded saffron, dull brick red, warm cream, and muted green.

Avoid flashy ethnic poster design, chain branding, exoticized decoration, and realistic food glamour shots.`
    },
    yakitori: {
      name: 'Yakitori Shop',
      text: `IDENTITY ADD-ON / YAKITORI SHOP

Use one simple yakitori clue appropriate to this part:
- skewer
- crossed skewers
- chicken silhouette
- grill grid
- smoke
- small bowl

Use dull red, muted ochre, warm beige, smoky brown-gray, and dark brown.

Avoid generic izakaya, liquor-store, beer-pub, festival-stall, and alcohol-focused appearance.`
    }
  };

  window.YUMANIWA_KIT_MASTER = KIT_MASTER;
  window.YUMANIWA_KIT_IDENTITIES = KIT_IDENTITIES;

  window.YUMANIWA_SOURCE_MASTERS = {
    base: BASE,
    noren: NOREN,
    sign: SIGN,
    lantern: LANTERN,
    board: BOARD,
    special: SPECIAL
  };

  window.YUMANIWA_IDENTITIES = FOCUS_IDENTITIES;
})();