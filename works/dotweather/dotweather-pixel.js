// DotWeather pixel drawing helpers.

(function (root) {
  "use strict";

  const GLYPHS = {
    " ": ["00000","00000","00000","00000","00000","00000","00000"],
    "A": ["01110","10001","10001","11111","10001","10001","10001"],
    "B": ["11110","10001","10001","11110","10001","10001","11110"],
    "C": ["01111","10000","10000","10000","10000","10000","01111"],
    "D": ["11110","10001","10001","10001","10001","10001","11110"],
    "E": ["11111","10000","10000","11110","10000","10000","11111"],
    "F": ["11111","10000","10000","11110","10000","10000","10000"],
    "G": ["01111","10000","10000","10111","10001","10001","01111"],
    "H": ["10001","10001","10001","11111","10001","10001","10001"],
    "I": ["11111","00100","00100","00100","00100","00100","11111"],
    "J": ["00111","00010","00010","00010","10010","10010","01100"],
    "K": ["10001","10010","10100","11000","10100","10010","10001"],
    "L": ["10000","10000","10000","10000","10000","10000","11111"],
    "M": ["10001","11011","10101","10101","10001","10001","10001"],
    "N": ["10001","11001","10101","10011","10001","10001","10001"],
    "O": ["01110","10001","10001","10001","10001","10001","01110"],
    "P": ["11110","10001","10001","11110","10000","10000","10000"],
    "Q": ["01110","10001","10001","10001","10101","10010","01101"],
    "R": ["11110","10001","10001","11110","10100","10010","10001"],
    "S": ["01111","10000","10000","01110","00001","00001","11110"],
    "T": ["11111","00100","00100","00100","00100","00100","00100"],
    "U": ["10001","10001","10001","10001","10001","10001","01110"],
    "V": ["10001","10001","10001","10001","10001","01010","00100"],
    "W": ["10001","10001","10001","10101","10101","11011","10001"],
    "X": ["10001","10001","01010","00100","01010","10001","10001"],
    "Y": ["10001","10001","01010","00100","00100","00100","00100"],
    "Z": ["11111","00001","00010","00100","01000","10000","11111"],
    "0": ["01110","10001","10011","10101","11001","10001","01110"],
    "1": ["00100","01100","00100","00100","00100","00100","01110"],
    "2": ["01110","10001","00001","00010","00100","01000","11111"],
    "3": ["11110","00001","00001","01110","00001","00001","11110"],
    "4": ["00010","00110","01010","10010","11111","00010","00010"],
    "5": ["11111","10000","10000","11110","00001","00001","11110"],
    "6": ["01110","10000","10000","11110","10001","10001","01110"],
    "7": ["11111","00001","00010","00100","01000","01000","01000"],
    "8": ["01110","10001","10001","01110","10001","10001","01110"],
    "9": ["01110","10001","10001","01111","00001","00001","01110"],
    ":": ["00000","00100","00100","00000","00100","00100","00000"],
    ".": ["00000","00000","00000","00000","00000","00110","00110"],
    ",": ["00000","00000","00000","00000","00110","00100","01000"],
    "-": ["00000","00000","00000","11111","00000","00000","00000"],
    "+": ["00000","00100","00100","11111","00100","00100","00000"],
    "/": ["00001","00010","00010","00100","01000","01000","10000"],
    "<": ["00010","00100","01000","10000","01000","00100","00010"],
    ">": ["01000","00100","00010","00001","00010","00100","01000"],
    "=": ["00000","11111","00000","11111","00000","00000","00000"],
    "?": ["01110","10001","00001","00010","00100","00000","00100"],
    "°": ["00110","01001","01001","00110","00000","00000","00000"],
    "_": ["00000","00000","00000","00000","00000","00000","11111"],
  };

  const ICONS = {
    clear: [
      "0011100", "0111110", "1111111", "1111111", "1111111", "0111110", "0011100",
    ],
    cloudy: [
      "000000000", "000111000", "001111100", "011111110", "111111111", "111111111", "011111110",
    ],
    rain: [
      "000000000", "000111000", "001111100", "011111110", "111111111", "010010010", "100100100", "001001000",
    ],
    snow: [
      "000000000", "000111000", "001111100", "011111110", "111111111", "001010100", "010101010", "001010100",
    ],
    thunder: [
      "000000000", "000111000", "001111100", "011111110", "111111111", "000110000", "001100000", "000100000",
    ],
    fog: [
      "000000000", "111111111", "000000000", "011111110", "000000000", "111111111", "000000000",
    ],
    windy: [
      "000000000", "001111000", "110000100", "000111000", "111000000", "000011110", "000000000",
    ],
  };

  function snap(value, pixel) {
    return Math.round(value / pixel) * pixel;
  }

  const CELL_BLEED_RATIO = 0.08;
  const CELL_BLEED_MAX = 0.12;

  function drawBlock(x, y, width, height, colorValue, alpha, bleed) {
    const effectiveAlpha = alpha === undefined ? 255 : Number(alpha);
    const overlap = Math.max(0, Number(bleed) || 0);

    noStroke();
    fill(SSE.theme.color(colorValue, effectiveAlpha));
    rect(
      x - overlap,
      y - overlap,
      width + overlap * 2,
      height + overlap * 2
    );
  }

  function drawCell(x, y, size, colorValue, alpha) {
    const effectiveAlpha = alpha === undefined ? 255 : Number(alpha);
    const snappedX = snap(x, size);
    const snappedY = snap(y, size);

    // A tiny overlap prevents hairline seams when the logical 360x640 canvas
    // is displayed at a non-integer scale. Keep translucent cells untouched
    // so neighbouring cells do not create darker overlap bands.
    const bleed = effectiveAlpha >= 254
      ? Math.min(CELL_BLEED_MAX, size * CELL_BLEED_RATIO)
      : 0;

    drawBlock(snappedX, snappedY, size, size, colorValue, effectiveAlpha, bleed);
  }

  function measureText(value, scale, spacing) {
    const textValue = String(value || "").toUpperCase();
    const step = 5 * scale + spacing;
    return Math.max(0, textValue.length * step - spacing);
  }

  function drawText(value, x, y, options) {
    const opts = options || {};
    const textValue = String(value ?? "").toUpperCase();
    const scale = Math.max(1, Number(opts.scale) || 2);
    const spacing = opts.spacing === undefined ? scale : Number(opts.spacing);
    const colorValue = opts.color || "pixelText";
    const alpha = opts.alpha === undefined ? 255 : opts.alpha;
    const align = opts.align || "left";
    const width = measureText(textValue, scale, spacing);
    let startX = x;

    if (align === "center") startX -= width * 0.5;
    else if (align === "right") startX -= width;

    for (let index = 0; index < textValue.length; index += 1) {
      const glyph = GLYPHS[textValue[index]] || GLYPHS["?"];
      const glyphX = startX + index * (5 * scale + spacing);

      for (let row = 0; row < 7; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          if (glyph[row][col] !== "1") continue;
          drawCell(glyphX + col * scale, y + (6 - row) * scale, scale, colorValue, alpha);
        }
      }
    }

    return width;
  }

  function drawIcon(key, cx, cy, options) {
    const opts = options || {};
    const pattern = ICONS[key] || ICONS.cloudy;
    const scale = Math.max(1, Number(opts.scale) || 2);
    const colorValue = opts.color || "pixelText";
    const alpha = opts.alpha === undefined ? 255 : opts.alpha;
    const width = Math.max(...pattern.map((lineValue) => lineValue.length));
    const height = pattern.length;
    const startX = cx - width * scale * 0.5;
    const startY = cy - height * scale * 0.5;

    for (let row = 0; row < height; row += 1) {
      const lineValue = pattern[row];
      for (let col = 0; col < lineValue.length; col += 1) {
        if (lineValue[col] !== "1") continue;
        drawCell(startX + col * scale, startY + (height - 1 - row) * scale, scale, colorValue, alpha);
      }
    }
  }

  function panel(bounds, options) {
    const opts = options || {};
    const pixel = opts.pixel || 2;
    const fillColor = opts.fill || "pixelPanel";
    const edgeColor = opts.edge || "pixelSub";
    const density = Math.max(1, Number(opts.density) || 4);

    noStroke();
    fill(SSE.theme.color(fillColor, opts.alpha === undefined ? 160 : opts.alpha));
    rect(snap(bounds.x, pixel), snap(bounds.y, pixel), snap(bounds.w, pixel), snap(bounds.h, pixel));

    fill(SSE.theme.color(edgeColor, opts.edgeAlpha === undefined ? 120 : opts.edgeAlpha));
    for (let x = bounds.x; x < bounds.x + bounds.w; x += pixel) {
      if ((Math.round(x / pixel) + Math.round(bounds.y / pixel)) % density === 0) {
        rect(snap(x, pixel), snap(bounds.y, pixel), pixel, pixel);
        rect(snap(x, pixel), snap(bounds.y + bounds.h - pixel, pixel), pixel, pixel);
      }
    }
    for (let y = bounds.y; y < bounds.y + bounds.h; y += pixel) {
      if ((Math.round(bounds.x / pixel) + Math.round(y / pixel)) % density === 0) {
        rect(snap(bounds.x, pixel), snap(y, pixel), pixel, pixel);
        rect(snap(bounds.x + bounds.w - pixel, pixel), snap(y, pixel), pixel, pixel);
      }
    }
  }

  root.DotWeatherPixel = {
    glyphs: GLYPHS,
    icons: ICONS,
    snap,
    drawBlock,
    drawCell,
    drawText,
    measureText,
    drawIcon,
    panel,
  };
})(typeof window !== "undefined" ? window : globalThis);
