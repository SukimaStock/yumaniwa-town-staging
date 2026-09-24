(function() {
    'use strict';

    var objects = {
        bench_wood_01: {
            id: 'bench_wood_01',
            category: 'furniture',
            type: 'bench',
            src: 'assets/maps/props/station-plaza/station-bench.png?rev=20260822-clean',
            finalization: {
                target: 'PROP_M',
                logicalCanvasPx: [32, 32],
                fileCanvasPx: [96, 96],
                exportScale: 3,
                grid: {
                    block: 8,
                    offsetX: 0,
                    offsetY: 0
                },
                pixelSafe: false,
                status: 'calibrating'
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
