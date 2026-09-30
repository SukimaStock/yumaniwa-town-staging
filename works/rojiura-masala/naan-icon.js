(() => {
  "use strict";

  // ==========================================================
  // ROJIURA MASALA — CODE-DRAWN NAAN ICON
  // ==========================================================
  // Logical pixel canvas: 30 x 17 cells.
  // Pointed left tip, rounded right side, one dark baked edge, direct dough fill, simple scorch marks.
  // Keep the shading deliberately chunky so it matches the curry icon's lower-resolution feel.
  // Everything is drawn from integer pixel runs. No PNG asset is used.

  const W = 30;
  const H = 17;

  const GEOMETRY = {
    outline: [
      [0, 18, 21], [1, 14, 24], [2, 11, 26], [3, 8, 27],
      [4, 6, 28], [5, 4, 29], [6, 2, 29], [7, 0, 29],
      [8, 0, 29], [9, 1, 29], [10, 3, 29], [11, 5, 28],
      [12, 7, 27], [13, 10, 26], [14, 13, 24], [15, 16, 22],
      [16, 18, 20],
    ],
    crust: [
      [1, 18, 21], [2, 14, 24], [3, 11, 26], [4, 8, 27],
      [5, 6, 28], [6, 4, 28], [7, 2, 28], [8, 2, 28],
      [9, 3, 28], [10, 5, 28], [11, 7, 27], [12, 9, 26],
      [13, 12, 24], [14, 15, 22], [15, 18, 20],
    ],
    dough: [
      [2, 18, 21], [3, 14, 23], [4, 11, 25], [5, 8, 26],
      [6, 6, 27], [7, 4, 27], [8, 4, 27], [9, 5, 27],
      [10, 7, 27], [11, 9, 26], [12, 11, 25], [13, 14, 23],
      [14, 17, 21],
    ],
    warmShade: [
      [5, 24, 26], [6, 25, 27], [7, 26, 27],
      [10, 22, 26], [11, 20, 25], [12, 19, 23],
      [9, 7, 9], [10, 9, 11],
    ],
    highlight: [
      [4, 15, 17], [5, 14, 16], [7, 19, 20],
      [8, 18, 20], [11, 14, 15], [12, 13, 14],
    ],
    scorchDark: [
      [4, 22, 23], [5, 21, 24], [6, 22, 24],
      [8, 14, 15], [9, 13, 16], [10, 14, 16],
      [11, 21, 22], [12, 20, 23], [13, 21, 23],
      [7, 8, 9], [8, 7, 10], [9, 8, 10],
    ],
    scorchLight: [
      [5, 22, 22], [9, 14, 14], [12, 21, 21], [8, 8, 8],
    ],
    smallMarks: [
      [6, 17, 17], [7, 18, 18], [10, 18, 18],
      [11, 17, 17], [6, 11, 11], [12, 16, 16],
    ],
  };

  const PALETTE = Object.freeze({
    outline: "#a86638",
    dough: "#f0cd86",
    highlight: "#f7ddb0",
    scorchDark: "#bf7741",
    scorchLight: "#d9965d",
  });

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

  function drawNaan(ctx, x, y, options = {}) {
    const {
      pixelSize = 4,
      scale = 1,
      alpha = 1,
      mirror = false,
    } = options;

    const px = pixelSize * scale;

    ctx.save();
    ctx.globalAlpha *= alpha;

    if (mirror) {
      ctx.translate(x + W * px, y);
      ctx.scale(-1, 1);
      x = 0;
      y = 0;
    }

    // Keep only one dark outer edge. Start the dough immediately inside it so
    // the naan does not read with a thick double border.
    paintRuns(ctx, GEOMETRY.outline, PALETTE.outline, x, y, px);
    paintRuns(ctx, GEOMETRY.crust, PALETTE.dough, x, y, px);
    paintRuns(ctx, GEOMETRY.highlight, PALETTE.highlight, x, y, px);
    paintRuns(ctx, GEOMETRY.smallMarks, PALETTE.scorchLight, x, y, px);
    paintRuns(ctx, GEOMETRY.scorchDark, PALETTE.scorchDark, x, y, px);
    paintRuns(ctx, GEOMETRY.scorchLight, PALETTE.scorchLight, x, y, px);

    ctx.restore();

    return { width: W * px, height: H * px };
  }

  window.RojiuraNaanIcon = Object.freeze({
    width: W,
    height: H,
    geometry: GEOMETRY,
    palette: PALETTE,
    draw: drawNaan,
  });
})();
