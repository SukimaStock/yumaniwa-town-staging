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

    function fixture(x, y, w, h, color, reach, spill) {
        return { x, y, w, h, color, reach, spill };
    }

    function pool(cx, cy, rx, ry, opacity, color) {
        return { cx, cy, rx, ry, opacity, color };
    }

    function shop(roofPoints, glazing, extraShapes, base, fixtures, pools) {
        return {
            width: 96, height: 96,
            shapes: [wall(0, 0, 96, 96), roof(roofPoints), ...glazing, ...extraShapes, base],
            fixtures, pools
        };
    }

    const stationGlass = [255, 219, 161];
    const stationDoor = [255, 230, 184];
    const streetLight = [255, 228, 157];
    const colaGlass = [254, 199, 109];
    const yakitoriGlass = [255, 204, 132];
    const redLantern = [255, 110, 59];
    const coffeeGlass = [252, 217, 167];
    const curryGlass = [251, 177, 91];

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
            fixtures: [
                fixture(22, 81, 10, 12, stationGlass, 7, 0.19),
                fixture(50, 79, 27, 16, stationDoor, 9, 0.24),
                fixture(96, 81, 8, 12, stationGlass, 7, 0.21)
            ],
            // At the south map edge only the front step and the end of the platform
            // are exposed. Keep this light against the building at its true position.
            pools: [
                pool(64, 123, 25, 7, 0.32, stationDoor),
                pool(102, 122, 27, 7, 0.24, stationGlass)
            ]
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
            fixtures: [fixture(11, 13, 7, 5, streetLight, 5, 0.24)],
            // The two northern posts stand at the sides of the plaza approach.
            pools: [pool(15, 55, 37, 22, 0.58, streetLight)]
        },
        craft_cola_shop_01: shop(
            [[8, 41], [15, 20], [79, 20], [87, 41], [87, 45], [8, 45]],
            [
                ...panes(commonColumns, [[53, 6], [60, 5], [66, 3]], 219),
                ...panes(commonSill, [[69, 3]], 219)
            ],
            [], footprint(48, 89, 33, 2),
            [fixture(47, 53, 27, 19, colaGlass, 8, 0.24)],
            [pool(61, 94, 32, 22, 0.37, colaGlass)]
        ),
        yakitori_shop_01: shop(
            [[9, 42], [16, 21], [79, 21], [87, 42], [87, 47], [9, 47]],
            [
                ...panes(commonColumns, [[55, 5], [61, 5], [67, 3]], 220),
                ...panes(commonSill, [[70, 3]], 220)
            ],
            [{ kind: 'lantern', shape: 'ellipse', cx: 43.5, cy: 54.5, rx: 3.4, ry: 4.5, emissionValue: 248 }],
            footprint(48, 90, 33, 2),
            [fixture(40, 50, 7, 9, redLantern, 7, 0.28),
             fixture(47, 55, 27, 18, yakitoriGlass, 7, 0.22)],
            [pool(61, 95, 28, 20, 0.34, yakitoriGlass),
             pool(42, 94, 16, 16, 0.32, redLantern)]
        ),
        kissaten_shop_01: shop(
            [[6, 40], [13, 20], [77, 20], [84, 40], [84, 45], [6, 45]],
            [
                ...panes(kissatenColumns, [[54, 5], [60, 5], [66, 3]], 200),
                ...panes([[45, 5], [51, 5], [58, 3], [65, 3], [69, 3]], [[69, 3]], 200)
            ],
            [], footprint(45, 89, 32, 2),
            [fixture(45, 54, 27, 18, coffeeGlass, 7, 0.19)],
            [pool(58, 94, 28, 20, 0.32, coffeeGlass)]
        ),
        curry_shop_01: shop(
            [[8, 39], [15, 18], [80, 18], [88, 39], [88, 44], [8, 44]],
            [
                ...panes([[47, 5], [53, 6], [60, 5], [66, 8]], [[53, 5], [59, 10]], 212),
                ...panes([[47, 5], [53, 6], [60, 4], [67, 8]], [[69, 3]], 212)
            ],
            [], footprint(48, 89, 34, 2),
            [fixture(47, 53, 28, 19, curryGlass, 8, 0.22)],
            [pool(61, 95, 31, 22, 0.36, curryGlass)]
        )
    };

    // Noon-only support footprints, measured in the original logical PNG grid.
    // Ground geometry is independent of the sprite material and its opaque bounds.
    function contacts(width, height, ...shapes) {
        return { width, height, shapes };
    }

    const noonContacts = {
        // The platform stands slightly above the ground on four visible piers.
        station_building_01: contacts(128, 128,
            footprint(12, 124.5, 6.5, 2), footprint(45.5, 124.5, 5.5, 2),
            footprint(82, 124.5, 6, 2), footprint(115, 124.5, 6.5, 2)),
        // The beige pixels to the right of this post are already painted into the PNG.
        street_lamp_01: contacts(32, 56, footprint(15, 53.5, 5.5, 1.75)),
        bench_wood_01: contacts(56, 56,
            footprint(3, 53.5, 4.5, 2), footprint(52.5, 53.5, 4, 2)),
        notice_board_01: contacts(96, 96,
            footprint(9, 92.5, 7.5, 2), footprint(87.5, 92.5, 7.5, 2)),
        tourist_map_01: contacts(64, 64,
            footprint(13, 60.5, 5, 1.75), footprint(49, 60.5, 5, 1.75)),
        standing_sign_01: contacts(32, 32,
            footprint(8, 29.5, 3, 1.5), footprint(24, 29.5, 3, 1.5)),
        planter_01: contacts(32, 32, footprint(16, 29.5, 6.5, 1.75)),
        post_box_01: contacts(32, 32, footprint(16.5, 29.5, 4.5, 1.5)),
        onsen_no_entry_barrier_01: contacts(64, 64,
            footprint(12, 60.5, 7, 2), footprint(52.5, 60.5, 7, 2)),

        // The long wood sill, not the edge of the transparent 96px image.
        craft_cola_shop_01: contacts(96, 96,
            footprint(48.5, 89.5, 35, 2.25), footprint(9, 91, 6, 1.5)),
        yakitori_shop_01: contacts(96, 96, footprint(48, 90.5, 36, 2.25)),
        kissaten_shop_01: contacts(96, 96, footprint(46.5, 90, 37.5, 2)),
        curry_shop_01: contacts(96, 96, footprint(48, 90, 37, 2)),

        // Indoors the counter and exhibit cases meet the tiled floor at their plinths.
        leisure_counter_01: contacts(96, 96, footprint(50, 93.5, 39, 2)),
        leisure_pickup_shelf_01: contacts(96, 96, footprint(47, 93, 32.5, 2)),
        leisure_exhibit_steamclock_01: contacts(56, 56, footprint(28, 53.5, 17, 1.75)),
        leisure_exhibit_dotweather_01: contacts(56, 56, footprint(28, 53.5, 17, 1.75)),
        leisure_exhibit_coffeefactory_01: contacts(64, 64, footprint(32, 60.5, 25, 2)),
        // Follow the sloping front edges of these two three-quarter-view bases.
        leisure_exhibit_diorama_calendar_01: contacts(56, 56,
            footprint(20, 51.5, 14, 1.5), footprint(39, 53, 9, 1.5)),
        leisure_catalog_terminal_01: contacts(56, 56,
            footprint(21, 50, 8.5, 1.5), footprint(34.5, 52, 8.5, 1.5))
    };

    root.YUMANIWA_TOWN_LIGHTING_MATERIALS = { version: 'town-3', objects, noonContacts };
})(typeof globalThis !== 'undefined' ? globalThis : window);
