(function() {
    'use strict';

    var objects = {
        bench_wood_01: {
            id: 'bench_wood_01',
            editor: {
                catalogKey: 'bench',
                label: '木製ベンチ',
                addable: true,
                order: 30,
                inferFromObjectId: true,
                defaults: {
                    w: 3,
                    h: 3,
                    collision: { enabled: true, x: 0.14, y: 0.8133333333333334, w: 0.72, h: 0.2 }
                }
            },
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
            editor: {
                catalogKey: 'streetLamp',
                label: 'レトロな街灯',
                addable: true,
                order: 40,
                inferFromObjectId: true,
                defaults: {
                    w: 2,
                    h: 3.5,
                    collision: { enabled: true, x: 0.405125, y: 0.9342857142857142, w: 0.18975, h: 0.1807142857142857 }
                }
            },
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
            editor: {
                catalogKey: 'planter',
                label: '植木鉢',
                addable: true,
                order: 50,
                inferFromObjectId: true,
                defaults: {
                    w: 2,
                    h: 2,
                    collision: { enabled: true, x: 0.302, y: 0.66925, w: 0.396, h: 0.33075 }
                }
            },
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
            editor: {
                catalogKey: 'touristMap',
                label: '観光案内図',
                addable: true,
                order: 20,
                inferFromObjectId: true,
                defaults: {
                    w: 4,
                    h: 4,
                    collision: { enabled: true, x: 0.2520833333333332, y: 0.90625, w: 0.4958333333333333, h: 0.1125 }
                }
            },
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
            editor: {
                catalogKey: 'noticeBoard',
                label: '横長掲示板',
                addable: true,
                order: 10,
                inferFromObjectId: true,
                defaults: {
                    w: 5.25,
                    h: 5.25,
                    collision: { enabled: true, x: 0.041666666666666664, y: 0.8363636363636365, w: 0.9166666666666666, h: 0.15 }
                }
            },
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
            editor: {
                catalogKey: 'standingSignboard',
                label: '立て看板（共通）',
                addable: true,
                order: 80,
                inferFromObjectId: false,
                idStem: 'town_standing_signboard',
                defaults: {
                    w: 2,
                    h: 2,
                    collision: { enabled: true, x: 0.14, y: 0.7375, w: 0.72, h: 0.2625 }
                }
            },
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
        station_direction_sign_01: {
            id: 'station_direction_sign_01',
            editor: {
                catalogKey: 'directionSign',
                label: '方向案内札',
                addable: true,
                order: 60,
                inferFromObjectId: true,
                idStem: 'station_direction_sign',
                defaults: {
                    w: 1.4,
                    h: 2.4,
                    collision: { enabled: true, x: 0.34, y: 0.84, w: 0.32, h: 0.20 }
                }
            },
            category: 'sign',
            type: 'direction_sign',
            src: 'assets/maps/props/station-plaza/station-direction-sign.png?rev=asset-29b83965',
            finalization: {
                townCanvas: {
                    enabled: true,
                    editable: true,
                    exactFinal: false
                },
                pixelSafe: false,
                normalizationPending: true,
                status: 'registered'
            }
        },
        station_ghost_npc_01: {
            id: 'station_ghost_npc_01',
            category: 'npc',
            type: 'ghost_npc',
            src: 'assets/maps/props/station-plaza/station-ghost-npc.png?rev=asset-d28a6ed3',
            finalization: {
                townCanvas: {
                    enabled: true,
                    editable: true,
                    exactFinal: false
                },
                pixelSafe: false,
                normalizationPending: true,
                status: 'registered'
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
            src: 'assets/maps/objects/shops/curry_shop_01.png?rev=20260925-curry-persistent96',
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
                    contentBounds: { x: 6, y: 12, w: 84, h: 84 },
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
        leisure_counter_01: {
            id: 'leisure_counter_01',
            category: 'facility',
            type: 'information_counter',
            src: 'assets/maps/props/leisure-center/leisure-counter.png?v=20260925-1',
            finalization: {
                target: 'FACILITY_M',
                logicalCanvasPx: [96, 96],
                townAssetFilePx: [96, 96],
                townAssetPixelRatio: 1,
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
                    physicalFileMayUseDeviceScale: false
                },
                pixelSafe: false,
                status: 'final'
            }
        },
        leisure_pickup_shelf_01: {
            id: 'leisure_pickup_shelf_01',
            category: 'facility',
            type: 'pickup_shelf',
            src: 'assets/maps/props/leisure-center/leisure-pickup-shelf.png?v=20260925-6',
            finalization: {
                target: 'FACILITY_M',
                logicalCanvasPx: [96, 96],
                townAssetFilePx: [96, 96],
                townAssetPixelRatio: 1,
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
                    physicalFileMayUseDeviceScale: false
                },
                pixelSafe: false,
                status: 'final'
            }
        },
        leisure_exhibit_steamclock_01: {
            id: 'leisure_exhibit_steamclock_01',
            category: 'exhibit',
            type: 'steamclock_exhibit',
            src: 'assets/maps/props/leisure-center/leisure-exhibit-steamclock.png?v=20260925-1',
            finalization: {
                target: 'PROP_L',
                logicalCanvasPx: [56, 56],
                townAssetFilePx: [56, 56],
                townAssetPixelRatio: 1,
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
                    physicalFileMayUseDeviceScale: false
                },
                pixelSafe: false,
                status: 'final'
            }
        },
        leisure_exhibit_dotweather_01: {
            id: 'leisure_exhibit_dotweather_01',
            category: 'exhibit',
            type: 'dotweather_exhibit',
            src: 'assets/maps/props/leisure-center/leisure-exhibit-dotweather.png?v=20260925-1',
            finalization: {
                target: 'PROP_L',
                logicalCanvasPx: [56, 56],
                townAssetFilePx: [56, 56],
                townAssetPixelRatio: 1,
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
                    physicalFileMayUseDeviceScale: false
                },
                pixelSafe: false,
                status: 'final'
            }
        },
        leisure_exhibit_coffeefactory_01: {
            id: 'leisure_exhibit_coffeefactory_01',
            category: 'exhibit',
            type: 'coffee_factory_exhibit',
            src: 'assets/maps/props/leisure-center/leisure-exhibit-coffeefactory.png?v=20260925-1',
            finalization: {
                target: 'FACILITY_S',
                logicalCanvasPx: [64, 64],
                townAssetFilePx: [64, 64],
                townAssetPixelRatio: 1,
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
                    physicalFileMayUseDeviceScale: false
                },
                pixelSafe: false,
                status: 'final'
            }
        },
        leisure_exhibit_diorama_calendar_01: {
            id: 'leisure_exhibit_diorama_calendar_01',
            category: 'exhibit',
            type: 'diorama_calendar_exhibit',
            src: 'assets/maps/props/leisure-center/leisure-exhibit-diorama-calendar.png?v=20260925-2',
            finalization: {
                target: 'PROP_L',
                logicalCanvasPx: [56, 56],
                townAssetFilePx: [56, 56],
                townAssetPixelRatio: 1,
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
                    physicalFileMayUseDeviceScale: false
                },
                pixelSafe: false,
                status: 'final'
            }
        },
        leisure_catalog_terminal_01: {
            id: 'leisure_catalog_terminal_01',
            category: 'facility',
            type: 'catalog_terminal',
            src: 'assets/maps/props/leisure-center/leisure-catalog-terminal.png?v=20260925-1',
            finalization: {
                target: 'PROP_L',
                logicalCanvasPx: [56, 56],
                townAssetFilePx: [56, 56],
                townAssetPixelRatio: 1,
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
                    physicalFileMayUseDeviceScale: false
                },
                pixelSafe: false,
                status: 'final'
            }
        },
        leisure_direction_sign_01: {
            id: 'leisure_direction_sign_01',
            editor: {
                catalogKey: 'leisureDirectionSign',
                label: '簡易案内サイン（レジャーセンター）',
                addable: true,
                order: 90,
                inferFromObjectId: false,
                idStem: 'leisure_direction_sign',
                defaults: {
                    w: 3.5,
                    h: 3.5,
                    collision: { enabled: true, x: 0.35, y: 0.82, w: 0.30, h: 0.16 }
                }
            },
            category: 'sign',
            type: 'direction_sign',
            src: 'assets/maps/props/leisure-center/leisure-direction-sign.png?rev=asset-03542011',
            finalization: {
                townCanvas: {
                    enabled: true,
                    editable: true,
                    exactFinal: false
                },
                pixelSafe: false,
                normalizationPending: true,
                status: 'registered'
            }
        },
        leisure_pamphlet_rack_01: {
            id: 'leisure_pamphlet_rack_01',
            editor: {
                catalogKey: 'leisurePamphletRack',
                label: 'パンフレットラック（レジャーセンター）',
                addable: true,
                order: 100,
                inferFromObjectId: false,
                idStem: 'leisure_pamphlet_rack',
                defaults: {
                    w: 3.75,
                    h: 3.75,
                    collision: { enabled: true, x: 0.15, y: 0.84, w: 0.70, h: 0.14 }
                }
            },
            category: 'facility',
            type: 'pamphlet_rack',
            src: 'assets/maps/props/leisure-center/leisure-pamphlet-rack.png?rev=asset-b7863407',
            finalization: {
                townCanvas: {
                    enabled: true,
                    editable: true,
                    exactFinal: false
                },
                pixelSafe: false,
                normalizationPending: true,
                status: 'registered'
            }
        },
        leisure_bulletin_board_01: {
            id: 'leisure_bulletin_board_01',
            editor: {
                catalogKey: 'leisureBulletinBoard',
                label: '掲示スタンド（レジャーセンター）',
                addable: true,
                order: 110,
                inferFromObjectId: false,
                idStem: 'leisure_bulletin_board',
                defaults: {
                    w: 3.25,
                    h: 3.25,
                    collision: { enabled: true, x: 0.08, y: 0.82, w: 0.84, h: 0.14 }
                }
            },
            category: 'sign',
            type: 'bulletin_board',
            src: 'assets/maps/props/leisure-center/leisure-bulletin-board.png?rev=asset-bcec8713',
            finalization: {
                townCanvas: {
                    enabled: true,
                    editable: true,
                    exactFinal: false
                },
                pixelSafe: false,
                normalizationPending: true,
                status: 'registered'
            }
        },
        leisure_guide_terminal_01: {
            id: 'leisure_guide_terminal_01',
            editor: {
                catalogKey: 'leisureGuideTerminal',
                label: '展示ガイド端末（レジャーセンター）',
                addable: true,
                order: 120,
                inferFromObjectId: false,
                idStem: 'leisure_guide_terminal',
                defaults: {
                    w: 3.0,
                    h: 3.0,
                    collision: { enabled: true, x: 0.05, y: 0.76, w: 0.90, h: 0.18 }
                }
            },
            category: 'facility',
            type: 'guide_terminal',
            src: 'assets/maps/props/leisure-center/leisure-guide-terminal.png?rev=asset-e2a2c8ac',
            finalization: {
                townCanvas: {
                    enabled: true,
                    editable: true,
                    exactFinal: false
                },
                pixelSafe: false,
                normalizationPending: true,
                status: 'registered'
            }
        },
        onsen_no_entry_barrier_01: {
            id: 'onsen_no_entry_barrier_01',
            category: 'sign',
            type: 'road_closure_barrier',
            src: 'assets/maps/objects/signs/no-entry-sign.png?v=20260925-1',
            finalization: {
                target: 'FACILITY_S',
                logicalCanvasPx: [64, 64],
                townAssetFilePx: [192, 192],
                townAssetPixelRatio: 3,
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
                    physicalFileMayUseDeviceScale: true
                },
                pixelSafe: true,
                status: 'final'
            }
        },
        station_building_01: {
            id: 'station_building_01',
            editor: {
                catalogKey: 'stationBuilding',
                label: '湯間庭駅舎',
                addable: true,
                order: 70,
                inferFromObjectId: true,
                defaults: {
                    w: 8,
                    h: 8,
                    collision: { enabled: false, x: 0.06086956521739131, y: 0.7825292397660817, w: 0.8869565217391304, h: 0.21747076023391812 }
                }
            },
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

    function resolveSrc(objectId) {
        var objectDef = get(objectId);
        return objectDef && objectDef.src ? objectDef.src : '';
    }

    // Editor placement defaults are derived from the literal registry, never
    // applied to existing scene props. Return copies so UI edits cannot alter it.
    function getEditorDefinition(objectId) {
        var objectDef = get(objectId);
        if (!objectDef || !objectDef.editor) return null;
        var definition = JSON.parse(JSON.stringify(objectDef.editor));
        definition.objectId = objectDef.id;
        return definition;
    }

    function getEditorDefinitions() {
        return Object.keys(objects).map(getEditorDefinition).filter(function (definition) {
            return definition !== null;
        }).sort(function (a, b) {
            return a.order - b.order;
        });
    }

    function getAddableEditorDefinitions() {
        return getEditorDefinitions().filter(function (definition) {
            return definition.addable === true;
        });
    }

    window.YUMANIWA_WORLD_OBJECTS = {
        version: '0.1',
        objects: objects,
        get: get,
        resolveSrc: resolveSrc,
        getEditorDefinition: getEditorDefinition,
        getEditorDefinitions: getEditorDefinitions,
        getAddableEditorDefinitions: getAddableEditorDefinitions
    };
})();
