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
            src: 'assets/maps/objects/lights/street_lamp_01.png?rev=20260924-lamp32x56',
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
