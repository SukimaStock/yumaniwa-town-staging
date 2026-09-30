(() => {
  "use strict";

  // ==========================================================
  // ROJIURA MASALA — MAKANAI CURRY ICON PROTOTYPE
  // ==========================================================
  // Logical pixel canvas:
  //   32 × 20 cells
  //
  // The source image is treated as layered pixel construction:
  //   bowl silhouette -> bowl body -> rim -> curry -> shadows
  //   -> highlights -> ingredients.
  //
  // The geometry is intentionally separated from palette and
  // toppings so one shape can produce many makanai variations.

  const W = 32;
  const H = 20;

  // Each run is [y, xStart, xEnd] (inclusive).
  // Keeping broad shapes as runs is much easier to edit than a
  // giant 2D matrix while still staying pixel-perfect.

  const GEOMETRY = {
    // --------------------------------------------------------
    // Handles
    // --------------------------------------------------------
    // The handles are kept as their own geometry now.
    // This guarantees:
    // - exact left/right symmetry
    // - a dark outer sticker outline
    // - exactly one transparent cell in the middle of each handle
    //
    // Left handle hole = (x=3, y=8)
    // Right handle hole = mirrored (x=28, y=8)
    handleOutline: [
      [5, 3, 5], [5, 26, 28],
      [6, 2, 6], [6, 25, 29],
      [7, 1, 6], [7, 25, 30],

      // Split around the one transparent center cell.
      [8, 1, 2], [8, 4, 6],
      [8, 25, 27], [8, 29, 30],

      [9, 2, 6], [9, 25, 29],
      [10, 3, 5], [10, 26, 28],
    ],

    handleFill: [
      [6, 3, 5], [6, 26, 28],
      [7, 2, 5], [7, 26, 29],

      // The hole itself is never painted, so the game background shows through.
      [8, 2, 2], [8, 4, 5],
      [8, 26, 27], [8, 29, 29],

      [9, 3, 5], [9, 26, 28],
    ],

    // --------------------------------------------------------
    // Bowl
    // --------------------------------------------------------
    // Main sticker silhouette. The lower half now holds its width for a
    // couple of rows before tapering, which reads rounder and less triangular.
    bowlOutline: [
      [2, 12, 19],
      [3, 10, 21],
      [4, 8, 23],
      [5, 7, 24],
      [6, 6, 25],
      [7, 5, 26],
      [8, 5, 26],
      [9, 5, 26],
      [10, 5, 26],
      [11, 5, 26],
      [12, 5, 26],
      [13, 6, 25],
      [14, 6, 25],
      [15, 7, 24],
      [16, 9, 22],
      [17, 11, 20],
      [18, 13, 18],
    ],

    bowlBody: [
      [3, 12, 19],
      [4, 10, 21],
      [5, 8, 23],
      [6, 7, 24],
      [7, 6, 25],
      [8, 6, 25],
      [9, 6, 25],
      [10, 6, 25],
      [11, 6, 25],
      [12, 6, 25],
      [13, 7, 24],
      [14, 7, 24],
      [15, 8, 23],
      [16, 10, 21],
      [17, 12, 19],
    ],

    bowlRim: [
      [3, 12, 19],
      [4, 10, 11], [4, 20, 21],
      [5, 8, 9], [5, 22, 23],
      [6, 7, 7], [6, 24, 24],
      [7, 6, 6], [7, 25, 25],
      [8, 6, 6], [8, 25, 25],
      [9, 6, 6], [9, 25, 25],
      [10, 6, 6], [10, 25, 25],
    ],

    bowlBottomShade: [
      [11, 6, 25],
      [12, 6, 25],
      [13, 7, 24],
      [14, 7, 24],
      [15, 8, 23],
      [16, 10, 21],
      [17, 12, 19],
    ],

    // --------------------------------------------------------
    // Curry
    // --------------------------------------------------------
    curryBase: [
      [5, 9, 22],
      [6, 8, 23],
      [7, 7, 24],
      [8, 7, 24],
      [9, 7, 24],
      [10, 7, 24],
      [11, 8, 23],
      [12, 9, 22],
    ],

    curryShadow: [
      [6, 17, 20],
      [7, 15, 20],
      [8, 14, 19],
      [9, 15, 18],
      [10, 17, 21],
      [11, 15, 21],

      [8, 10, 12],
      [9, 10, 13],
      [10, 11, 13],
    ],

    curryHighlight: [
      [6, 18, 19],
      [7, 18, 18],
      [9, 12, 13],
      [10, 11, 12],
    ],
  };

  // Ingredients are points or tiny blocks instead of baked-in geometry.
  const TOPPINGS = {
    butterChicken: {
      cream: [
        [7, 13], [7, 14],
        [8, 11], [8, 12],
        [9, 9], [9, 10],
        [10, 10],
        [9, 23],
        [11, 19], [11, 20], [11, 21],
      ],
      orange: [
        [6, 18],
        [7, 18],
        [10, 12], [10, 13],
        [11, 12],
      ],
      dark: [],
    },

    sparse: {
      cream: [
        [8, 12], [9, 23], [11, 20],
      ],
      orange: [
        [7, 18], [10, 12],
      ],
      dark: [],
    },

    chunky: {
      cream: [
        [7, 12], [7, 13], [8, 12],
        [8, 20], [8, 21],
        [10, 10], [10, 11],
        [11, 18], [11, 19],
        [11, 22],
      ],
      orange: [
        [7, 18], [8, 18],
        [9, 14], [10, 14],
      ],
      dark: [
        [9, 17], [10, 18],
      ],
    },

    // Small round-ish dots read as lentils / chickpeas at this resolution.
    dal: {
      cream: [
        [7, 11], [8, 15], [8, 21],
        [9, 10], [9, 18], [10, 14],
        [10, 22], [11, 17],
      ],
      orange: [
        [7, 18], [9, 13], [11, 20],
      ],
      dark: [],
    },

    chana: {
      cream: [
        [7, 10], [7, 15], [7, 20],
        [8, 12], [8, 18], [8, 22],
        [9, 9], [9, 14], [9, 19],
        [10, 11], [10, 17], [10, 22],
        [11, 14], [11, 20],
      ],
      orange: [],
      dark: [],
    },

    keema: {
      cream: [
        [8, 12], [10, 20],
      ],
      orange: [
        [7, 17], [9, 13], [11, 18],
      ],
      dark: [
        [7, 11], [7, 20],
        [8, 15], [8, 22],
        [9, 10], [9, 17],
        [10, 13], [10, 21],
        [11, 15], [11, 22],
      ],
    },

    alooGobi: {
      cream: [
        [7, 11], [7, 12], [8, 11],
        [8, 19], [8, 20],
        [10, 14], [10, 15],
        [11, 21], [11, 22],
      ],
      orange: [
        [7, 17], [8, 17],
        [9, 9], [9, 10],
        [10, 19], [11, 18],
      ],
      dark: [],
    },

    biryani: {
      cream: [
        [6, 13], [6, 18],
        [7, 10], [7, 15], [7, 21],
        [8, 12], [8, 19], [8, 23],
        [9, 9], [9, 14], [9, 17], [9, 21],
        [10, 11], [10, 16], [10, 20],
        [11, 13], [11, 18], [11, 22],
      ],
      orange: [
        [7, 18], [8, 15], [9, 12], [10, 22], [11, 10],
      ],
      dark: [
        [8, 10], [9, 19], [10, 14],
      ],
    },

    special: {
      cream: [
        [6, 12], [6, 19],
        [7, 10], [7, 14], [7, 21],
        [8, 12], [8, 18], [8, 22],
        [9, 9], [9, 15], [9, 20],
        [10, 11], [10, 17], [10, 23],
        [11, 14], [11, 19],
      ],
      orange: [
        [6, 17], [7, 18], [8, 15],
        [9, 12], [10, 20], [11, 11],
      ],
      dark: [
        [8, 20], [10, 14],
      ],
    },
  };

  const PALETTES = {
    butterChicken: {
      bowlOutline: "#2b160f",
      bowlBody: "#8a4b2c",
      bowlRim: "#cf842c",
      bowlBottomShade: "#6e3a25",
      curryBase: "#c94f18",
      curryShadow: "#9e2717",
      curryHighlight: "#ff8b24",
      toppingCream: "#f0d89a",
      toppingOrange: "#ff8d21",
      toppingDark: "#7b2d18",
    },

    // Proof-of-concept palettes only: same geometry, different meal family.
    dal: {
      bowlOutline: "#2b160f",
      bowlBody: "#86503a",
      bowlRim: "#c88a42",
      bowlBottomShade: "#633b2c",
      curryBase: "#c89028",
      curryShadow: "#9b681c",
      curryHighlight: "#efb64a",
      toppingCream: "#efd48d",
      toppingOrange: "#d98d25",
      toppingDark: "#705025",
    },

    saag: {
      bowlOutline: "#241811",
      bowlBody: "#7c4b34",
      bowlRim: "#bb7a37",
      bowlBottomShade: "#5d3728",
      curryBase: "#547536",
      curryShadow: "#354e27",
      curryHighlight: "#78944b",
      toppingCream: "#ead9a9",
      toppingOrange: "#b78335",
      toppingDark: "#28391f",
    },

    keema: {
      bowlOutline: "#291610",
      bowlBody: "#81482f",
      bowlRim: "#be7731",
      bowlBottomShade: "#60372a",
      curryBase: "#9a4829",
      curryShadow: "#6c2e20",
      curryHighlight: "#bf6232",
      toppingCream: "#d9c68f",
      toppingOrange: "#aa5528",
      toppingDark: "#4d241b",
    },

    chana: {
      bowlOutline: "#2b160f",
      bowlBody: "#86503a",
      bowlRim: "#c88a42",
      bowlBottomShade: "#633b2c",
      curryBase: "#ae5c25",
      curryShadow: "#7f3b1d",
      curryHighlight: "#d47b32",
      toppingCream: "#dfbd71",
      toppingOrange: "#c3782d",
      toppingDark: "#6a3a1d",
    },

    alooGobi: {
      bowlOutline: "#2b160f",
      bowlBody: "#87503a",
      bowlRim: "#c98a42",
      bowlBottomShade: "#633b2c",
      curryBase: "#bd7a28",
      curryShadow: "#8f511d",
      curryHighlight: "#e1a03b",
      toppingCream: "#ead39a",
      toppingOrange: "#dc7d27",
      toppingDark: "#735020",
    },

    biryani: {
      bowlOutline: "#28170f",
      bowlBody: "#84513a",
      bowlRim: "#c4863b",
      bowlBottomShade: "#623a2b",
      curryBase: "#a96726",
      curryShadow: "#74431f",
      curryHighlight: "#d29643",
      toppingCream: "#e2c57c",
      toppingOrange: "#c8752c",
      toppingDark: "#5d3420",
    },

    special: {
      bowlOutline: "#24120d",
      bowlBody: "#77432d",
      bowlRim: "#d18b36",
      bowlBottomShade: "#573022",
      curryBase: "#d14b1d",
      curryShadow: "#8c2018",
      curryHighlight: "#ff922a",
      toppingCream: "#f0dca1",
      toppingOrange: "#ff982c",
      toppingDark: "#6d2518",
    },

    darkBowlButter: {
      bowlOutline: "#17130f",
      bowlBody: "#34302b",
      bowlRim: "#766b5a",
      bowlBottomShade: "#24211e",
      curryBase: "#c94f18",
      curryShadow: "#9e2717",
      curryHighlight: "#ff8b24",
      toppingCream: "#f0d89a",
      toppingOrange: "#ff8d21",
      toppingDark: "#7b2d18",
    },
  };

  const SIZE_VARIANTS = {
    normal: {
      curryMoundRows: [],
      toppingCopies: 0,
    },

    // Large = piled higher in the CENTER of the bowl.
    // Nothing extends below the normal curry edge, so it cannot read as spilled.
    large: {
      curryMoundRows: [
        [4, 12, 19],
        [5, 10, 21],
        [6, 9, 22],
      ],
      toppingCopies: 7,
    },
  };

  function paintRuns(ctx, runs, color, ox, oy, px) {
    ctx.fillStyle = color;
    for (const [y, x0, x1] of runs) {
      ctx.fillRect(
        Math.round(ox + x0 * px),
        Math.round(oy + y * px),
        Math.ceil((x1 - x0 + 1) * px),
        Math.ceil(px)
      );
    }
  }

  function paintPoints(ctx, points, color, ox, oy, px) {
    ctx.fillStyle = color;
    for (const [y, x] of points) {
      ctx.fillRect(
        Math.round(ox + x * px),
        Math.round(oy + y * px),
        Math.ceil(px),
        Math.ceil(px)
      );
    }
  }

  function makeExtraToppings(points, count) {
    if (!count || !points.length) return [];
    const extras = [];
    const candidates = [
      [4, 15],
      [5, 13], [5, 18],
      [6, 14], [6, 20],
      [7, 16], [7, 21],
      [8, 15], [8, 19],
      [9, 17],
    ];
    for (let i = 0; i < count; i += 1) {
      extras.push(candidates[i % candidates.length]);
    }
    return extras;
  }

  function paintEgg(ctx, ox, oy, px, rowOffset = 0, colOffset = 0) {
    // Compact fried egg: white plus one yolk. Kept deliberately coarse.
    // Endless-result bonuses can place up to three, but the offsets keep every
    // egg inside the curry opening so the bowl still reads as the main subject.
    const shift = (points) => points.map(([row, col]) => [row + rowOffset, col + colOffset]);
    const white = shift([
      [6, 15], [6, 16],
      [7, 14], [7, 15], [7, 16], [7, 17],
      [8, 14], [8, 15], [8, 16], [8, 17],
      [9, 15], [9, 16],
    ]);
    const yolk = shift([
      [7, 15], [7, 16],
      [8, 15], [8, 16],
    ]);
    paintPoints(ctx, white, "#f2e7cb", ox, oy, px);
    paintPoints(ctx, yolk, "#e29a2d", ox, oy, px);
  }

  function paintRoastedChili(ctx, ox, oy, px, level) {
    const amount = Math.max(0, Math.min(2, Math.floor(Number(level) || 0)));
    if (!amount) return;

    // Cooked-in chili reads as a few dark-red flecks inside the curry, not as
    // a hotter color wash. More RUSH adds only a little extra texture.
    const dark = [
      [7, 13], [9, 20], [11, 11],
      [8, 17], [10, 15], [11, 22],
    ];
    const bright = [
      [8, 13], [10, 20], [7, 18],
      [9, 16], [11, 15], [10, 22],
    ];
    const count = amount === 1 ? 3 : 6;
    paintPoints(ctx, dark.slice(0, count), "#6f2118", ox, oy, px);
    paintPoints(ctx, bright.slice(0, count), "#b43a27", ox, oy, px);
  }

  function paintFreshChili(ctx, ox, oy, px, style) {
    if (!style) return;

    const red = "#c2512a";
    const darkRed = "#8f3024";

    if (style === "slices") {
      // A few fresh rings near one side of the bowl. Keep them fully red-toned:
      // at result-screen scale, a single green stem pixel reads as a bug.
      paintPoints(ctx, [[6, 20], [7, 21], [8, 20]], darkRed, ox, oy, px);
      paintPoints(ctx, [[6, 21], [7, 20], [8, 21]], red, ox, oy, px);
      return;
    }

    // One tiny whole chili laid diagonally across the curry. Omit the green
    // stem here as well so the silhouette reads cleanly instead of noisy.
    paintPoints(ctx, [[6, 20], [7, 19], [8, 18], [9, 17]], darkRed, ox, oy, px);
    paintPoints(ctx, [[6, 21], [7, 20], [8, 19]], red, ox, oy, px);
  }

  function drawMakanaiCurryIcon(ctx, x, y, options = {}) {
    const {
      pixelSize = 4,
      palette = "butterChicken",
      toppings = "butterChicken",
      size = "normal",
      scale = 1,
      mirror = false,
      egg = false,
      eggCount = null,
      roastedChili = 0,
      freshChili = null,
    } = options;

    const px = pixelSize * scale;
    const pal = typeof palette === "string" ? PALETTES[palette] : palette;
    const top = typeof toppings === "string" ? TOPPINGS[toppings] : toppings;
    const sizeVariant =
      typeof size === "string" ? SIZE_VARIANTS[size] : size;

    if (!pal) throw new Error(`Unknown makanai palette: ${palette}`);
    if (!top) throw new Error(`Unknown makanai topping set: ${toppings}`);
    if (!sizeVariant) throw new Error(`Unknown makanai size: ${size}`);

    ctx.save();

    if (mirror) {
      ctx.translate(x + W * px, y);
      ctx.scale(-1, 1);
      x = 0;
      y = 0;
    }

    // Handles first: dark sticker outline, then inset fill.
    paintRuns(ctx, GEOMETRY.handleOutline, pal.bowlOutline, x, y, px);
    paintRuns(ctx, GEOMETRY.handleFill, pal.bowlRim, x, y, px);

    // Bowl body.
    paintRuns(ctx, GEOMETRY.bowlOutline, pal.bowlOutline, x, y, px);
    paintRuns(ctx, GEOMETRY.bowlBody, pal.bowlBody, x, y, px);
    paintRuns(ctx, GEOMETRY.bowlBottomShade, pal.bowlBottomShade, x, y, px);

    // Normal curry stays inside the bowl.
    paintRuns(ctx, GEOMETRY.curryBase, pal.curryBase, x, y, px);
    paintRuns(ctx, GEOMETRY.curryShadow, pal.curryShadow, x, y, px);
    paintRuns(ctx, GEOMETRY.curryHighlight, pal.curryHighlight, x, y, px);

    // Rim is redrawn over the curry edge, keeping it visually contained.
    paintRuns(ctx, GEOMETRY.bowlRim, pal.bowlRim, x, y, px);

    // Large portions pile upward only through the central opening.
    if (sizeVariant.curryMoundRows.length) {
      paintRuns(
        ctx,
        sizeVariant.curryMoundRows,
        pal.curryBase,
        x,
        y,
        px
      );
    }

    paintPoints(ctx, top.dark || [], pal.toppingDark, x, y, px);
    paintPoints(ctx, top.orange || [], pal.toppingOrange, x, y, px);
    paintPoints(ctx, top.cream || [], pal.toppingCream, x, y, px);

    const extras = makeExtraToppings(
      top.cream || [],
      sizeVariant.toppingCopies || 0
    );
    if (extras.length) {
      paintPoints(ctx, extras, pal.toppingCream, x, y, px);
    }

    paintRoastedChili(ctx, x, y, px, roastedChili);

    const eggs = Math.max(0, Math.min(3, Math.floor(
      eggCount == null ? (egg ? 1 : 0) : Number(eggCount) || 0
    )));
    const eggOffsets = [
      [0, 0],
      [2, 4],
      [3, -4],
    ];
    for (let i = 0; i < eggs; i += 1) {
      paintEgg(ctx, x, y, px, eggOffsets[i][0], eggOffsets[i][1]);
    }

    paintFreshChili(ctx, x, y, px, freshChili);

    ctx.restore();

    return {
      width: W * px,
      height: H * px,
    };
  }

  window.RojiuraMakanaiIcon = Object.freeze({
    width: W,
    height: H,
    geometry: GEOMETRY,
    palettes: PALETTES,
    toppings: TOPPINGS,
    sizeVariants: SIZE_VARIANTS,
    draw: drawMakanaiCurryIcon,
  });
})();
