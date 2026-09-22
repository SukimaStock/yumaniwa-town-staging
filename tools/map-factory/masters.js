(() => {
  'use strict';

  const COMMON_STYLE = `
STYLE

True low-resolution 2D pixel art.

This must look like a small handcrafted retro game map sprite,
not a detailed pixel illustration and not an illustration converted into pixel art.

Use clearly visible square pixels,
chunky pixel clusters,
hard edges,
simple silhouettes,
and deliberately low visual density.

The image should feel as if it were originally designed at a small native pixel resolution
and then enlarged with nearest-neighbor scaling.

Do not imitate pixel art by adding many tiny high-resolution square details.
The underlying design itself must be simple.


PIXEL DENSITY

Use deliberately coarse pixel art.

Think in large logical pixel clusters.

Use broad shapes rather than fine details.

Avoid:
- tiny texture pixels
- small highlights everywhere
- realistic material texture
- fine wood grain
- detailed roof weathering
- detailed fabric folds
- tiny reflections
- dense interior objects
- decorative noise

Large surfaces should contain calm areas with very little detail.

The sprite should remain understandable even when viewed very small.


PIXEL STRUCTURE

Keep pixel scale visually consistent across the whole asset.

Use:
- clean horizontal lines
- clean vertical lines
- simple stair-step diagonals
- chunky outlines
- repeated simple shapes

Avoid:
- mixed pixel scales
- anti-aliasing
- smooth curves made from many tiny steps
- sub-pixel-looking details
- thin high-resolution lines

Small objects should be simplified into recognizable pixel symbols rather than miniature illustrations.


COLOR LIMIT

Use a restrained retro palette.

Aim for approximately 8 to 12 principal colors for the storefront,
excluding transparency.

For most materials use:
- one base color
- one shadow color
- optionally one highlight color

Avoid smooth color ramps and many near-identical shades.

Preferred palette character:
- dark brown
- deep charcoal
- muted gray-blue
- faded dark red
- dull beige
- warm amber
- very dark outline color

Colors should feel muted and old-fashioned rather than vivid or polished.


SHADING

Very simple pixel shading.

Use flat pixel clusters.
No realistic light gradients.
No soft glow spreading across surfaces.
No complex ambient lighting.
No cinematic lighting.

Use shadow mainly to separate forms.

Keep most of the storefront relatively flat and graphic.


RETRO CHARACTER

The sprite should feel like an asset from a restrained late-16-bit-era map game.

Prioritize readability and graphic design over atmosphere and realism.

Let some surfaces remain plain.
Use simple repeated shapes.
Do not polish every surface.

The charm should come from simplification, limited colors, strong silhouettes, and iconic shop details.

Do not make it look modern, premium, luxurious, cinematic, or highly rendered.


VIEW

Front-facing or almost front-facing storefront.

A very slight elevated game-map perspective is acceptable,
but keep the facade mostly straight and readable.

Avoid dramatic perspective and strong depth.


TOMOGUSHI ALLEY FEEL

The shop belongs to a quiet small-town alley at night.

It should feel:
- handmade
- slightly worn
- modest
- lived-in
- old-fashioned
- calm

It should not feel:
- elegant
- expensive
- luxurious
- fashionable
- polished
- tourist-oriented
- highly decorative


SHOP IDENTITY

Communicate the shop type using only 2 or 3 strong visual symbols.

Possible primary elements:
- noren
- hanging sign
- lantern
- one small display window
- one symbolic object

Use simple symbols rather than detailed readable typography.


DETAIL BUDGET

Keep detail density low.

Every detail must justify its existence.

If a detail does not help identify the shop, explain the structure, or improve readability, remove it.

Do not add decorative clutter simply to make the image richer.


WINDOW AND INTERIOR

Interior visibility should be minimal.

Do not draw a detailed room.
Do not draw furniture, reflections, labels, or many products.

If a display window is present,
show only a few simplified iconic objects.


LIGHTING

Night setting.

Use one or two small warm light sources.

The entrance and shop identity should remain readable.

Use warm amber light around:
- a lantern
- a small window
- a sign light

Do not illuminate the entire building.
Do not use large soft halos.
Do not create cinematic contrast.


GAME ASSET REQUIREMENTS

Designed specifically as a game map sprite.

Readable at small in-game scale.
Clear silhouette.
Clear ground contact.
Transparent background.
No environmental context.
No street, pavement, sky, people, or neighboring scenery.


NEGATIVE

Not a painting.
Not concept art.
Not semi-realistic.
Not photorealistic.
Not detailed pixel illustration.
Not high-resolution pixel art.
Not realistic pixel rendering.
Not painterly.
Not soft.
Not blurry.
Not anti-aliased.
Not cinematic.
Not luxurious.
Not ornate.
Not highly textured.
Not a large Japanese traditional building.
Not a two-story commercial building.
Not a full environment scene.
Not anime background art.
Not 3D.
Not isometric.
Not a cozy detailed storefront illustration.
Not dense with props.
Not dense with colors.
`;

  const single = {
    id: 'alley-shop-single',
    type: 'alley_shop',
    name: 'Alley Shop / Single',
    version: 5,
    generationMode: 'single',
    pairStrategy: 'none',
    description: '単体生成用。縦長・低密度・レトロな灯串店舗の基準。',
    prompt: `YUMANIWA TOWN / TOMOGUSHI ALLEY SHOP / MASTER PROMPT v5

Create a standalone small shop sprite for Tomogushi Alley in Yumaniwa Town.

${COMMON_STYLE}

PROPORTION

Make the storefront compact, narrow, and slightly vertical.

Reduce horizontal spread.

Prefer a modest narrow facade with a slightly taller silhouette.

The building should remain small, humble, and space-efficient.


SCALE AND STRUCTURE

One small modest alley shop.

Compact.
Slightly taller than wide.
Narrow and vertically organized rather than broad and sprawling.

Use a relatively large simple roof shape,
but keep the building footprint narrow and compact.

The storefront beneath it should remain simple and slightly tall.


ROOF

Use a dark simple tiled roof.

Represent roof tiles through a simple repeated pixel rhythm.

Do not individually render every tile.
Do not add realistic weathering or texture noise.


FACADE

Use a simple wooden facade.

Wood should be represented by large flat panels.

Do not render realistic grain.
Use only a few structural beams.
Keep windows and doors geometrically simple.


OUTPUT GOAL

A modest, compact, retro, low-color pixel-art storefront
that feels native to Tomogushi Alley.

Prioritize:
1. silhouette
2. pixel readability
3. limited palette
4. low detail density
5. shop identity
6. narrow vertical fit

over realism or visual richness.


SHOP TYPE

{{shopType}}


DESCRIPTION

{{description}}


MAIN COLOR

{{mainColor}}


SIGN

{{sign}}


LIGHTING

{{lighting}}


SMALL PROPS

{{props}}


MANUAL ADJUSTMENT

{{manualAdjustment}}

Exact final pixel-grid normalization is not required at generation time.
Prioritize strong coarse pixel structure and simple shapes that can later be cleaned and aligned to a uniform pixel grid.
`
  };

  const doubleVariation = {
    id: 'alley-shop-double',
    type: 'alley_shop',
    name: 'Alley Shop / Double Variation',
    version: 1,
    generationMode: 'double_variation',
    pairStrategy: 'same_shop_variations',
    description: '同じ店を2軒並べ、1軒あたりの情報密度を自然に落とす現在の推奨方式。',
    prompt: `YUMANIWA TOWN / TOMOGUSHI ALLEY SHOP / MASTER PROMPT v6

Create two standalone small shop sprites for Tomogushi Alley in Yumaniwa Town.

${COMMON_STYLE}

PROPORTION

Each storefront should be compact, narrow, and slightly vertical.

Because two shops are placed in one image,
each individual shop should be smaller and simpler than a single-shop version.

Reduce horizontal spread per shop.

Prefer modest narrow facades with slightly taller silhouettes.


SCALE AND STRUCTURE

Create two small modest alley shops.

Each one should be:
- compact
- slightly taller than wide
- narrow and vertically organized
- low and humble rather than impressive

Use relatively large simple roof shapes,
but keep each building footprint narrow and compact.


MULTI-SHOP LAYOUT

Place two independent storefronts side by side in one image.

They should feel like neighboring shops in Tomogushi Alley.

Do not merge them into one wide building.
Do not create a full street scene.
Do not add road, pavement, sky, or environmental scenery.

Use a transparent background.

Leave only a narrow gap between the two shops.

Each shop must remain individually readable as its own storefront.


SHOP VARIATION RULE

Both shops are the same shop category.

They should not be exact duplicates.

They should feel like two slightly different storefront variations built from the same design language.

Allow only small differences such as:
- sign position
- lantern position
- window arrangement
- small prop placement
- noren shape
- facade partitioning

Keep the differences modest.


DETAIL REDUCTION FOR DOUBLE VERSION

Because two storefronts appear in the same image,
simplify each shop more than the single-shop version.

Use fewer colors, fewer decorative elements, fewer objects, and simpler silhouettes per shop.

Do not compensate by adding extra small details.


ROOF

Use dark simple tiled roofs.

Represent roof tiles through a simple repeated pixel rhythm.

Do not individually render every tile.
Do not add realistic weathering or texture noise.


FACADE

Use simple wooden facades.

Wood should be represented by large flat panels.

Do not render realistic grain.
Use only a few structural beams.
Keep windows and doors geometrically simple.


OUTPUT GOAL

Two modest, compact, retro, low-color pixel-art storefronts
that feel native to Tomogushi Alley.

Each shop should look simpler and slightly smaller than the equivalent single-shop version.

The purpose is to push the result closer to a compact retro map-sprite scale
while also making the two variations easy to compare.

Prioritize:
1. silhouette
2. pixel readability
3. limited palette
4. low detail density
5. shop identity
6. compact narrow fit

over realism or visual richness.


SHOP TYPE

Both shops are {{shopType}}.


DESCRIPTION

{{description}}


MAIN COLOR

{{mainColor}}


SIGN

{{sign}}


LIGHTING

{{lighting}}


SMALL PROPS

{{props}}

Keep the props very few.
Each object should be represented using only a few pixel clusters.


MANUAL ADJUSTMENT

{{manualAdjustment}}

Create two close variations of the same shop idea.

Exact final pixel-grid normalization is not required at generation time.
Prioritize strong coarse pixel structure and simple shapes that can later be cleaned and aligned to a uniform pixel grid.
`
  };

  window.YUMANIWA_MAP_FACTORY_MASTERS = {
    [single.id]: single,
    [doubleVariation.id]: doubleVariation
  };

  window.YUMANIWA_MAP_FACTORY_DEFAULT_MASTER = doubleVariation.id;
})();
