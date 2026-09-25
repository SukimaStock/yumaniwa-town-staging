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
            src: 'assets/maps/objects/signs/notice_board_01.png?rev=20260925-noticeboard96logical1',
            finalization: {
                target: 'FACILITY_M',
                logicalCanvasPx: [96, 96],
                fileCanvasPx: [96, 96],
                exportScale: 1,
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
        },
        post_box_01: {
            id: 'post_box_01',
            category: 'street_furniture',
            type: 'post_box',
            src: 'assets/maps/objects/street_furniture/post_box_01.png?rev=20260925-postbox-contract02',
            finalization: {
                target: 'PROP_M',
                logicalCanvasPx: [32, 32],
                townAssetFilePx: [32, 32],
                townAssetPixelRatio: 1,
                sourceDeliveryFilePx: [96, 96],
                sourceDeliveryPixelRatio: 3,
                sourceDeliveryVerified: true,
                importNormalization: {
                    applied: true,
                    type: 'LOSSLESS_INTEGER_DEVICE_SCALE_COLLAPSE',
                    fromPixelRatio: 3,
                    toPixelRatio: 1
                },
                exportContract: 'yumaniwa-logical-canvas-physical-file/0.1',
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
                    townUsesLogicalCanvas: true,
                    physicalFileMayUseDeviceScale: true,
                    sourcePhysicalPx: [1536, 1536]
                },
                pixelSafe: false,
                status: 'final'
            }
        },
        standing_sign_01: {
            id: 'standing_sign_01',
            category: 'sign',
            type: 'standing_sign',
            src: 'assets/maps/objects/signs/standing_sign_01.png?rev=20260925-standing32x32',
            finalization: {
                target: 'PROP_M',
                logicalCanvasPx: [32, 32],
                townAssetFilePx: [32, 32],
                townAssetPixelRatio: 1,
                sourceDeliveryFilePx: [96, 96],
                sourceDeliveryPixelRatio: 3,
                sourceDeliveryVerified: true,
                importNormalization: {
                    applied: true,
                    type: 'LOSSLESS_INTEGER_DEVICE_SCALE_COLLAPSE',
                    fromPixelRatio: 3,
                    toPixelRatio: 1
                },
                exportContract: 'yumaniwa-logical-canvas-physical-file/0.1',
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
                    townUsesLogicalCanvas: true,
                    physicalFileMayUseDeviceScale: true,
                    sourcePhysicalPx: [576, 480]
                },
                pixelSafe: false,
                status: 'final'
            }
        },
        yakitori_shop_01: {
            id: 'yakitori_shop_01',
            category: 'shop',
            type: 'yakitori_shop',
            src: 'assets/maps/objects/shops/yakitori_shop_01.png?rev=20260925-yakitori-persistent96',
            finalization: {
                target: 'SHOP_S',
                sourceCleanerTarget: 'SHOP_S',
                logicalCanvasPx: [96, 96],
                townAssetFilePx: [96, 96],
                townAssetPixelRatio: 1,
                sourceDeliveryFilePx: [288, 288],
                sourceDeliveryPixelRatio: 3,
                sourceDeliveryVerified: true,
                importNormalization: {
                    applied: true,
                    type: 'LOSSLESS_INTEGER_DEVICE_SCALE_COLLAPSE',
                    fromPixelRatio: 3,
                    toPixelRatio: 1
                },
                exportContract: 'yumaniwa-logical-canvas-physical-file/0.1',
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
                    version: 'yumaniwa-pixel/0.2',
                    contentBounds: { x: 7, y: 14, w: 82, h: 82 },
                    groundAnchorY: 95,
                    contentMode: 'LEGACY_RENDER_BAKE',
                    runtimeCanonicalization: false,
                    persistentCanonical: true,
                    logicalRasterized: true,
                    logicalRasterMethod: 'EXPLICIT_LOGICAL_NEAREST',
                    logicalGridVerified: true,
                    pixelSafe: true,
                    pixelSafeMethod: 'EXPLICIT_LOGICAL_NEAREST_PLUS_PHYSICAL_INTEGER_SCALE_PASS',
                    worldPxPerLogicalPx: 1,
                    editingSpace: 'TOWN_LOGICAL_PIXELS',
                    previewMatchesTown: true,
                    townUsesLogicalCanvas: true,
                    physicalFileMayUseDeviceScale: true,
                    sourcePhysicalPx: [720, 720]
                },
                pixelSafe: true,
                status: 'final'
            }
        },
        craft_cola_shop_01: {
            id: 'craft_cola_shop_01',
            category: 'shop',
            type: 'craft_cola_shop',
            src: 'assets/maps/objects/shops/craft_cola_shop_01.png?rev=20260925-pixelstd02',
            finalization: {
                target: 'SHOP_S',
                sourceCleanerTarget: 'FACILITY_M',
                logicalCanvasPx: [96, 96],
                townAssetFilePx: [96, 96],
                townAssetPixelRatio: 1,
                sourceDeliveryFilePx: [288, 288],
                sourceDeliveryPixelRatio: 3,
                sourceDeliveryVerified: true,
                importNormalization: {
                    applied: true,
                    type: 'LOSSLESS_INTEGER_DEVICE_SCALE_COLLAPSE',
                    fromPixelRatio: 3,
                    toPixelRatio: 1
                },
                exportContract: 'yumaniwa-logical-canvas-physical-file/0.1',
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
                    version: 'yumaniwa-pixel/0.2',
                    contentBounds: { x: 0, y: 0, w: 96, h: 96 },
                    groundAnchorY: 95,
                    contentMode: 'DIRECT_CANONICAL',
                    runtimeCanonicalization: false,
                    worldPxPerLogicalPx: 1,
                    editingSpace: 'TOWN_LOGICAL_PIXELS',
                    previewMatchesTown: true,
                    townUsesLogicalCanvas: true,
                    physicalFileMayUseDeviceScale: true,
                    sourcePhysicalPx: [720, 720]
                },
                pixelSafe: false,
                status: 'final'
            }
        },
        kissaten_shop_01: {
            id: 'kissaten_shop_01',
            category: 'shop',
            type: 'kissaten_shop',
            src: 'assets/maps/objects/shops/kissaten_shop_01.png?rev=20260925-pixelstd02',
            finalization: {
                target: 'SHOP_S',
                sourceCleanerTarget: 'FACILITY_M',
                logicalCanvasPx: [96, 96],
                townAssetFilePx: [96, 96],
                townAssetPixelRatio: 1,
                sourceDeliveryFilePx: [288, 288],
                sourceDeliveryPixelRatio: 3,
                sourceDeliveryVerified: true,
                importNormalization: {
                    applied: true,
                    type: 'LOSSLESS_INTEGER_DEVICE_SCALE_COLLAPSE',
                    fromPixelRatio: 3,
                    toPixelRatio: 1
                },
                exportContract: 'yumaniwa-logical-canvas-physical-file/0.1',
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
                    version: 'yumaniwa-pixel/0.2',
                    contentBounds: { x: 0, y: 0, w: 96, h: 96 },
                    groundAnchorY: 95,
                    contentMode: 'DIRECT_CANONICAL',
                    runtimeCanonicalization: false,
                    worldPxPerLogicalPx: 1,
                    editingSpace: 'TOWN_LOGICAL_PIXELS',
                    previewMatchesTown: true,
                    townUsesLogicalCanvas: true,
                    physicalFileMayUseDeviceScale: true,
                    sourcePhysicalPx: [720, 720]
                },
                pixelSafe: false,
                status: 'final'
            }
        },
        curry_shop_01: {
            id: 'curry_shop_01',
            category: 'shop',
            type: 'curry_shop',
            src: 'assets/maps/objects/shops/curry_shop_01.png?rev=20260925-pixelstd02',
            finalization: {
                target: 'SHOP_S',
                sourceCleanerTarget: 'FACILITY_M',
                logicalCanvasPx: [96, 96],
                townAssetFilePx: [96, 96],
                townAssetPixelRatio: 1,
                sourceDeliveryFilePx: [288, 288],
                sourceDeliveryPixelRatio: 3,
                sourceDeliveryVerified: true,
                importNormalization: {
                    applied: true,
                    type: 'LOSSLESS_INTEGER_DEVICE_SCALE_COLLAPSE',
                    fromPixelRatio: 3,
                    toPixelRatio: 1
                },
                exportContract: 'yumaniwa-logical-canvas-physical-file/0.1',
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
                    version: 'yumaniwa-pixel/0.2',
                    contentBounds: { x: 6, y: 12, w: 84, h: 84 },
                    groundAnchorY: 95,
                    contentMode: 'LEGACY_RENDER_BAKE',
                    runtimeCanonicalization: true,
                    worldPxPerLogicalPx: 1,
                    editingSpace: 'TOWN_LOGICAL_PIXELS',
                    previewMatchesTown: true,
                    townUsesLogicalCanvas: true,
                    physicalFileMayUseDeviceScale: true,
                    sourcePhysicalPx: [720, 720]
                },
                pixelSafe: false,
                status: 'final'
            }
        },
        station_building_01: {
            id: 'station_building_01',
            category: 'facility',
            type: 'station_building',
            src: 'assets/maps/objects/facilities/station_building_01.png?rev=20260925-station128',
            finalization: {
                target: 'FACILITY_L',
                logicalCanvasPx: [128, 128],
                townAssetFilePx: [128, 128],
                townAssetPixelRatio: 1,
                sourceDeliveryFilePx: [384, 384],
                sourceDeliveryPixelRatio: 3,
                sourceDeliveryVerified: true,
                importNormalization: {
                    applied: true,
                    type: 'LOSSLESS_INTEGER_DEVICE_SCALE_COLLAPSE',
                    fromPixelRatio: 3,
                    toPixelRatio: 1
                },
                exportContract: 'yumaniwa-logical-canvas-physical-file/0.1',
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
                    townUsesLogicalCanvas: true,
                    physicalFileMayUseDeviceScale: true,
                    sourcePhysicalPx: [1152, 1152]
                },
                pixelSafe: true,
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
