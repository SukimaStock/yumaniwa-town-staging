(function() {
    'use strict';

    var objects = {
        bench_wood_01: {
            id: 'bench_wood_01',
            category: 'furniture',
            type: 'bench',
            src: 'assets/maps/objects/furniture/bench_wood_01.png?rev=20260924-bench56',
            finalization: {
                target: 'PROP_L',
                logicalCanvasPx: [56, 56],
                fileCanvasPx: [168, 168],
                exportScale: 3,
                grid: {
                    block: 1,
                    offsetX: 0,
                    offsetY: 0
                },
                townCanvas: {
                    enabled: true,
                    editable: true,
                    exactFinal: true
                },
                pixelStandard: {
                    version: 'yumaniwa-pixel/0.1',
                    worldPxPerLogicalPx: 1,
                    editingSpace: 'TOWN_LOGICAL_PIXELS',
                    previewMatchesTown: true,
                    sourcePhysicalPx: [768, 768]
                },
                pixelSafe: false,
                status: 'final'
            }
        },
        street_lamp_01: {
            id: 'street_lamp_01',
            category: 'light',
            type: 'street_lamp',
            src: 'assets/maps/objects/lights/street_lamp_01.png?rev=20260924-lamp32x56fix1',
            finalization: {
                target: 'PROP_T',
                logicalCanvasPx: [32, 56],
                fileCanvasPx: [96, 168],
                exportScale: 3,
                grid: {
                    block: 1,
                    offsetX: 0,
                    offsetY: 0
                },
                townCanvas: {
                    enabled: true,
                    editable: true,
                    exactFinal: true
                },
                pixelStandard: {
                    version: 'yumaniwa-pixel/0.1',
                    worldPxPerLogicalPx: 1,
                    editingSpace: 'TOWN_LOGICAL_PIXELS',
                    previewMatchesTown: true,
                    sourcePhysicalPx: [256, 256]
                },
                pixelSafe: false,
                status: 'final'
            }
        },
        planter_01: {
            id: 'planter_01',
            category: 'greenery',
            type: 'planter',
            src: 'assets/maps/objects/greenery/planter_01.png?rev=20260924-planter32fix1',
            finalization: {
                target: 'PROP_M',
                logicalCanvasPx: [32, 32],
                fileCanvasPx: [96, 96],
                exportScale: 3,
                grid: {
                    block: 1,
                    offsetX: 0,
                    offsetY: 0
                },
                townCanvas: {
                    enabled: true,
                    editable: true,
                    exactFinal: true
                },
                pixelStandard: {
                    version: 'yumaniwa-pixel/0.1',
                    worldPxPerLogicalPx: 1,
                    editingSpace: 'TOWN_LOGICAL_PIXELS',
                    previewMatchesTown: true,
                    sourcePhysicalPx: [576, 480]
                },
                pixelSafe: false,
                status: 'final'
            }
        },
        tourist_map_01: {
            id: 'tourist_map_01',
            category: 'sign',
            type: 'tourist_map',
            src: 'assets/maps/objects/signs/tourist_map_01.png?rev=20260924-touristmap64',
            finalization: {
                target: 'FACILITY_S',
                logicalCanvasPx: [64, 64],
                fileCanvasPx: [192, 192],
                exportScale: 3,
                grid: {
                    block: 1,
                    offsetX: 0,
                    offsetY: 0
                },
                townCanvas: {
                    enabled: true,
                    editable: true,
                    exactFinal: true
                },
                pixelStandard: {
                    version: 'yumaniwa-pixel/0.1',
                    worldPxPerLogicalPx: 1,
                    editingSpace: 'TOWN_LOGICAL_PIXELS',
                    previewMatchesTown: true,
                    sourcePhysicalPx: [256, 256]
                },
                pixelSafe: false,
                status: 'final'
            }
        },
        notice_board_01: {
            id: 'notice_board_01',
            category: 'sign',
            type: 'notice_board',
            src: 'assets/maps/objects/signs/notice_board_01.png?rev=20260924-noticeboard96',
            finalization: {
                target: 'FACILITY_M',
                logicalCanvasPx: [96, 96],
                fileCanvasPx: [288, 288],
                exportScale: 3,
                grid: {
                    block: 1,
                    offsetX: 0,
                    offsetY: 0
                },
                townCanvas: {
                    enabled: true,
                    editable: true,
                    exactFinal: true
                },
                pixelStandard: {
                    version: 'yumaniwa-pixel/0.1',
                    worldPxPerLogicalPx: 1,
                    editingSpace: 'TOWN_LOGICAL_PIXELS',
                    previewMatchesTown: true,
                    sourcePhysicalPx: [1024, 1024]
                },
                pixelSafe: false,
                status: 'final'
            }
        }
    };

    function get(objectId) {
        return objects[objectId] || null;
    }

    function resolveSrc(objectId, fallbackSrc) {
        var objectDef = get(objectId);

        if (objectDef && objectDef.src) {
            return objectDef.src;
        }

        return fallbackSrc || '';
    }

    window.YUMANIWA_WORLD_OBJECTS = {
        version: '0.1',
        objects: objects,
        get: get,
        resolveSrc: resolveSrc
    };
})();
