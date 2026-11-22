// Shapes are measured on the original town art at logical 1×, including transparent padding.
// Pools and contact shadows use the same local origin as the sprite and may extend beyond it.
(function (root) {
    'use strict';

    function wall(x, y, w, h) {
        return { type: 'rect', surface: 'wall', x, y, w, h, heightValue: 115 };
    }

    function roof(points, surface = 'roof') {
        return { type: 'polygon', surface, points, heightValue: 220 };
    }

    function pane(x, y, w, h, emissionValue) {
        return { kind: 'window', shape: 'rect', x, y, w, h, emissionValue };
    }

    function panes(columns, rows, emissionValue) {
        // Column/row pairs are [start, length]. Gaps keep the painted sash and mullions dark.
        return rows.flatMap(([y, h]) => columns.map(([x, w]) => pane(x, y, w, h, emissionValue)));
    }

    function footprint(cx, cy, rx, ry) {
        return { kind: 'shadow', id: 'base', shape: 'ellipse', cx, cy, rx, ry };
    }

    function pool(cx, cy, rx, ry, opacity) {
        return { cx, cy, rx, ry, opacity };
    }

    function shop(roofPoints, glazing, extraShapes, base, pools) {
        return {
            width: 96, height: 96,
            shapes: [wall(0, 0, 96, 96), roof(roofPoints), ...glazing, ...extraShapes, base],
            pools
        };
    }

    const commonColumns = [[47, 5], [53, 6], [60, 5], [66, 5], [72, 2]];
    const kissatenColumns = [[45, 5], [51, 5], [58, 5], [64, 4], [69, 3]];
    // On the bottom row each window has a small dark object on its sill.
    const commonSill = [[47, 5], [53, 6], [60, 3], [67, 4], [72, 2]];
    const objects = {
        station_building_01: {
            width: 128, height: 128,
            shapes: [
                wall(6, 11, 115, 114),
                roof([[9, 40], [63, 11], [65, 12], [65, 40], [9, 66]]),
                roof([[65, 12], [118, 41], [118, 66], [65, 40]], 'side'),
                roof([[9, 67], [118, 67], [120, 76], [8, 77]]),
                // Outer windows and the glazed upper halves of the two central doors.
                ...panes([[22, 10]], [[81, 2], [86, 7]], 165),
                ...panes([[96, 4], [101, 3]], [[81, 2], [86, 7]], 160),
                ...panes([[50, 6], [57, 5]], [[79, 4], [85, 9]], 204),
                ...panes([[65, 5], [72, 5]], [[79, 4], [86, 4], [91, 4]], 204),
                footprint(63, 122, 53, 2.5)
            ],
            pools: [pool(63, 123, 16, 5, 0.045)]
        },
        street_lamp_01: {
            width: 32, height: 56,
            shapes: [
                wall(9, 4, 14, 50),
                pane(11, 13, 1, 4, 170),
                pane(13, 13, 3, 5, 255),
                pane(17, 13, 1, 4, 185),
                footprint(15, 52.5, 4, 1.5)
            ],
            pools: [pool(15, 53, 14, 6, 0.13)]
        },
        craft_cola_shop_01: shop(
            [[8, 41], [15, 20], [79, 20], [87, 41], [87, 45], [8, 45]],
            [
                ...panes(commonColumns, [[53, 6], [60, 5], [66, 3]], 219),
                ...panes(commonSill, [[69, 3]], 219)
            ],
            [], footprint(48, 89, 33, 2), [pool(61, 90, 14, 4, 0.053)]
        ),
        yakitori_shop_01: shop(
            [[9, 42], [16, 21], [79, 21], [87, 42], [87, 47], [9, 47]],
            [
                ...panes(commonColumns, [[55, 5], [61, 5], [67, 3]], 220),
                ...panes(commonSill, [[70, 3]], 220)
            ],
            [{ kind: 'lantern', shape: 'ellipse', cx: 43.5, cy: 54.5, rx: 3.4, ry: 4.5, emissionValue: 248 }],
            footprint(48, 90, 33, 2),
            [pool(43.5, 90.5, 6, 3, 0.066), pool(61, 91, 13, 4, 0.05)]
        ),
        kissaten_shop_01: shop(
            [[6, 40], [13, 20], [77, 20], [84, 40], [84, 45], [6, 45]],
            [
                ...panes(kissatenColumns, [[54, 5], [60, 5], [66, 3]], 200),
                ...panes([[45, 5], [51, 5], [58, 3], [65, 3], [69, 3]], [[69, 3]], 200)
            ],
            [], footprint(45, 89, 32, 2), [pool(58, 90, 13, 4, 0.045)]
        ),
        curry_shop_01: shop(
            [[8, 39], [15, 18], [80, 18], [88, 39], [88, 44], [8, 44]],
            [
                ...panes([[47, 5], [53, 6], [60, 5], [66, 8]], [[53, 5], [59, 10]], 212),
                ...panes([[47, 5], [53, 6], [60, 4], [67, 8]], [[69, 3]], 212)
            ],
            [], footprint(48, 89, 34, 2), [pool(61, 90, 14, 4, 0.05)]
        )
    };

    root.YUMANIWA_TOWN_LIGHTING_MATERIALS = { version: 'town-1', objects };
})(typeof globalThis !== 'undefined' ? globalThis : window);
