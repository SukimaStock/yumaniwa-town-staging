(function() {
  function rect(x, y, w, h) { return { x: x, y: y, w: w, h: h }; }
  function deco(x, y, w, h, fill, stroke, label, labelColor) {
    return { x: x, y: y, w: w, h: h, fill: fill, stroke: stroke, label: label || '', labelColor: labelColor || '#ffffff' };
  }

  window.TOWN_SCENE_MAPS = {
    station_plaza: {
      id: 'station_plaza',
      title: '駅前広場',
      subtitle: '町の中心',
      mapWidth: 24,
      mapHeight: 24,
      backgroundStyle: 'plaza',
      backgroundImagePath: 'assets/maps/grounds/station-plaza-ground.jpg',
      spawnPoints: {
        default: { x: 12, y: 15, dir: 'up' },
        fromAlley: { x: 3, y: 12, dir: 'right' },
        fromStreet: { x: 20, y: 12, dir: 'left' },
        fromOnsen: { x: 12, y: 3, dir: 'down' },
        fromLeisure: { x: 12, y: 20, dir: 'up' },
        fromRecreation: { x: 12, y: 20, dir: 'up' }
      },
      edgeWarps: [
        { side: 'left', min: 9, max: 14, target: 'tomogushi_alley_map', targetSpawn: 'fromPlaza' },
        { side: 'right', min: 9, max: 14, target: 'yumado_street_map', targetSpawn: 'fromPlaza' },
        { side: 'up', min: 9, max: 14, target: 'onsen_slope_map', targetSpawn: 'fromPlaza' },
        { side: 'down', min: 9, max: 14, target: 'recreation_road_map', targetSpawn: 'fromPlaza' }
      ],
      passableRects: [
        rect(10, 0, 4, 9), rect(7, 7, 3, 9), rect(14, 7, 2, 9), rect(0, 9, 7, 5),
        rect(10, 9, 1, 15), rect(13, 9, 1, 15), rect(16, 9, 8, 5), rect(11, 10, 2, 14),
        rect(9, 23, 1, 1), rect(14, 23, 1, 1)
      ],
      blockedRects: [
        rect(0, 0, 10, 7), rect(14, 0, 10, 7), rect(0, 7, 7, 2), rect(16, 7, 8, 2),
        rect(11, 9, 2, 1), rect(0, 14, 7, 10), rect(16, 14, 8, 10), rect(7, 16, 3, 7),
        rect(14, 16, 2, 7), rect(7, 23, 2, 1)
      ],
      blockedPoints: [{ x: 15, y: 23 }],
      areaZones: [
        { id: 'station_plaza', title: '駅前広場', subtitle: '駅と広場がひとつになった中心地', area: rect(0, 0, 24, 24) }
      ],
      triggers: [
        {
          id: 'station_notice', label: '駅の案内', actionLabel: '読む', type: 'inspect',
          text: '湯間庭駅前広場。左に灯串横丁、右に湯窓通り、上に温泉方面、下に湯間庭レクリエーションロードがあり、その先が湯窓レジャーセンターです。',
          area: rect(9, 18, 5, 5), tapPadding: 1
        },
        {
          id: 'tourist_map', label: '観光案内板', actionLabel: '調べる', type: 'inspect',
          text: '駅前広場の観光案内板。町の中心なので、ここから各マップへ散歩していけます。',
          area: rect(11, 9, 2, 1), tapPadding: 1
        },
        {
          id: 'shinpo_board_trigger', label: '掲示板を読む', actionLabel: '読む', type: 'menu', target: 'shinpo_board',
          text: '広場の横長掲示板。noteの記事やお知らせを並べていく場所です。',
          area: rect(1, 7, 6, 2), tapPadding: 1
        }
      ],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#d9ccb3' },
        { x: 0, y: 10, w: 24, h: 5, color: '#f0e4c2' },
        { x: 10, y: 0, w: 4, h: 24, color: '#f0e4c2' },
        { x: 6, y: 6, w: 12, h: 12, color: '#eadbb5' },
        { x: 8, y: 15, w: 8, h: 6, color: '#e6d2a8' }
      ],
      decor: [
        deco(1, 7, 4, 2, '#735944', '#2d241b', '掲示板'),
        deco(1, 6, 4, 1, '#8c765f', '#2d241b', ''),
        deco(1, 10, 1, 1, '#748465', '#2d241b', ''),
        deco(4, 10, 1, 1, '#748465', '#2d241b', ''),
        deco(7, 8, 2, 1, '#84735f', '#2d241b', 'ベンチ'),
        deco(15, 13, 2, 1, '#84735f', '#2d241b', 'ベンチ'),
        deco(11, 9, 2, 2, '#8b937c', '#2d241b', '案内'),
        deco(19, 6, 4, 7, '#72806a', '#2d241b', '通り'),
        deco(8, 0, 8, 3, '#8a7d6a', '#2d241b', '温泉'),
        deco(7, 17, 4, 4, '#8c7b64', '#2d241b', '駅'),
        deco(13, 17, 4, 4, '#8c7b64', '#2d241b', '駅'),
        deco(8, 21, 8, 3, '#6d746b', '#2d241b', 'レジャー'),
        deco(6, 10, 1, 1, '#6b5a46', '#2d241b', ''),
        deco(18, 10, 1, 1, '#6b5a46', '#2d241b', ''),
        deco(6, 15, 1, 1, '#aa7f4f', '#2d241b', ''),
        deco(17, 15, 1, 1, '#aa7f4f', '#2d241b', '')
      ]
    },

    tomogushi_alley_map: {
        "id": "tomogushi_alley_map",
        "title": "横丁",
        "subtitle": "灯串横丁",
        "mapWidth": 24,
        "mapHeight": 24,
        "backgroundStyle": "alley",
        "backgroundImagePath": "assets/maps/grounds/tomogushi-alley-ground.jpg",
        "spawnPoints": {
            "default": {
                "x": 20,
                "y": 12,
                "dir": "left"
            },
            "fromPlaza": {
                "x": 20,
                "y": 12,
                "dir": "left"
            }
        },
        "edgeWarps": [
            {
                "side": "right",
                "min": 9,
                "max": 14,
                "target": "station_plaza",
                "targetSpawn": "fromAlley"
            }
        ],
        "passableRects": [
            {
                "x": 4,
                "y": 4,
                "w": 15,
                "h": 3
            },
            {
                "x": 0,
                "y": 8,
                "w": 24,
                "h": 6
            },
            {
                "x": 4,
                "y": 14,
                "w": 20,
                "h": 1
            },
            {
                "x": 4,
                "y": 15,
                "w": 15,
                "h": 1
            },
            {
                "x": 4,
                "y": 16,
                "w": 9,
                "h": 4
            },
            {
                "x": 16,
                "y": 16,
                "w": 3,
                "h": 4
            },
            {
                "x": 13,
                "y": 19,
                "w": 3,
                "h": 1
            }
        ],
        "blockedRects": [
            {
                "x": 0,
                "y": 0,
                "w": 24,
                "h": 4
            },
            {
                "x": 0,
                "y": 4,
                "w": 4,
                "h": 4
            },
            {
                "x": 19,
                "y": 4,
                "w": 5,
                "h": 4
            },
            {
                "x": 4,
                "y": 7,
                "w": 15,
                "h": 1
            },
            {
                "x": 0,
                "y": 14,
                "w": 4,
                "h": 9
            },
            {
                "x": 19,
                "y": 15,
                "w": 5,
                "h": 9
            },
            {
                "x": 13,
                "y": 16,
                "w": 3,
                "h": 3
            },
            {
                "x": 4,
                "y": 20,
                "w": 15,
                "h": 4
            },
            {
                "x": 2,
                "y": 23,
                "w": 2,
                "h": 1
            }
        ],
        "blockedPoints": [],
        "areaZones": [
            {
                "id": "alley",
                "title": "灯串横丁",
                "subtitle": "夜の遊び場の路地",
                "area": {
                    "x": 0,
                    "y": 0,
                    "w": 24,
                    "h": 24
                }
            }
        ],
        "triggers": [
            {
                "id": "yakitori_wars_booth",
                "label": "焼き鳥屋 ゆまど",
                "actionLabel": "遊ぶ",
                "type": "work",
                "workId": "yakitori-wars",
                "text": "炭火の向こうから、焼き鳥の香りが漂っている。",
                "area": {
                    "x": 16,
                    "y": 5,
                    "w": 5,
                    "h": 3
                },
                "tapPadding": 1
            },
            {
                "id": "midnight_cola_booth",
                "label": "クラフトコーラ研究所",
                "actionLabel": "遊ぶ",
                "type": "work",
                "workId": "midnight-cola",
                "text": "夜の研究所から、柑橘とスパイスの香りがする。",
                "area": {
                    "x": 11,
                    "y": 5,
                    "w": 5,
                    "h": 3
                },
                "tapPadding": 1
            },
            {
                "id": "junkissa_dive_booth",
                "label": "純喫茶ダイヴ",
                "actionLabel": "遊ぶ",
                "type": "work",
                "workId": "junkissa-dive",
                "text": "深夜の純喫茶から、甘いコーヒーの香りが漂っている。",
                "area": {
                    "x": 6,
                    "y": 5,
                    "w": 5,
                    "h": 3
                },
                "tapPadding": 1
            },
            {
                "id": "rojiura_masala_booth",
                "label": "路地裏マサラ",
                "actionLabel": "遊ぶ",
                "type": "work",
                "workId": "rojiura-masala",
                "text": "路地裏のカレー屋から、スパイスの香りが漂っている。",
                "area": {
                    "x": 0,
                    "y": 5,
                    "w": 6,
                    "h": 3
                },
                "tapPadding": 1
            }
        ],
        "groundRects": [
            {
                "x": 0,
                "y": 0,
                "w": 24,
                "h": 24,
                "color": "#49392f"
            },
            {
                "x": 0,
                "y": 10,
                "w": 24,
                "h": 5,
                "color": "#6f5b46"
            },
            {
                "x": 4,
                "y": 6,
                "w": 16,
                "h": 12,
                "color": "#5a4738"
            },
            {
                "x": 3,
                "y": 15,
                "w": 16,
                "h": 4,
                "color": "#6a543f"
            }
        ],
        "props": [
            {
                "id": "craft_cola_shop",
                "objectId": "craft_cola_shop_01",
                "src": "assets/maps/objects/shops/craft_cola_shop_01.png?rev=20260925-alleyshops96",
                "x": 10.375,
                "y": 2.375,
                "w": 6,
                "h": 6,
                "footY": 8.375,
                "enabled": true,
                "collision": {
                    "enabled": true,
                    "x": 0.11458333333333333,
                    "y": 0.78125,
                    "w": 0.7708333333333334,
                    "h": 0.1875
                },
                "interaction": {
                    "enabled": true,
                    "triggerId": "midnight_cola_booth",
                    "x": 0.10416666666666667,
                    "y": 0.6666666666666666,
                    "w": 0.7916666666666666,
                    "h": 0.3333333333333333
                }
            },
            {
                "id": "yakitori_yumado_shop",
                "objectId": "yakitori_shop_01",
                "src": "assets/maps/objects/shops/yakitori_shop_01.png?rev=20260925-yakitori96-r2",
                "x": 15.375,
                "y": 2.3125,
                "w": 6,
                "h": 6,
                "footY": 8.3125,
                "enabled": true,
                "collision": {
                    "enabled": true,
                    "x": 0.17078993055555555,
                    "y": 0.8131510416666667,
                    "w": 0.658420138888889,
                    "h": 0.16015625
                },
                "interaction": {
                    "enabled": true,
                    "triggerId": "yakitori_wars_booth",
                    "x": 0.1618923611111111,
                    "y": 0.7152777777777777,
                    "w": 0.6762152777777777,
                    "h": 0.2847222222222222
                }
            },
            {
                "id": "junkissa_dive_shop",
                "objectId": "kissaten_shop_01",
                "src": "assets/maps/objects/shops/kissaten_shop_01.png?rev=20260925-alleyshops96",
                "x": 5.125,
                "y": 2.375,
                "w": 6,
                "h": 6,
                "footY": 8.375,
                "enabled": true,
                "collision": {
                    "enabled": true,
                    "x": 0.11458333333333333,
                    "y": 0.78125,
                    "w": 0.7708333333333334,
                    "h": 0.1875
                },
                "interaction": {
                    "enabled": true,
                    "triggerId": "junkissa_dive_booth",
                    "x": 0.10416666666666667,
                    "y": 0.6666666666666666,
                    "w": 0.7916666666666666,
                    "h": 0.3333333333333333
                }
            },
            {
                "id": "rojiura_masala_shop",
                "objectId": "curry_shop_01",
                "src": "assets/maps/objects/shops/curry_shop_01.png?rev=20260925-alleyshops96",
                "x": -0.0625,
                "y": 2.3476543495998135,
                "w": 6,
                "h": 6,
                "footY": 8.347654349599814,
                "enabled": true,
                "collision": {
                    "enabled": true,
                    "x": 0.16276041666666666,
                    "y": 0.80859375,
                    "w": 0.6744791666666667,
                    "h": 0.1640625
                },
                "interaction": {
                    "enabled": true,
                    "triggerId": "rojiura_masala_booth",
                    "x": 0.15364583333333334,
                    "y": 0.7083333333333333,
                    "w": 0.6927083333333333,
                    "h": 0.2916666666666667
                }
            }
        ],
        "decor": []
    },

    yumado_street_map: {
      id: 'yumado_street_map',
      title: '湯窓通り',
      subtitle: '商店の通り',
      mapWidth: 24,
      mapHeight: 24,
      backgroundStyle: 'street',
      backgroundImagePath: 'assets/maps/grounds/yumado-street-ground.jpg',
      spawnPoints: {
        default: { x: 3, y: 12, dir: 'right' },
        fromPlaza: { x: 3, y: 12, dir: 'right' }
      },
      edgeWarps: [{ side: 'left', min: 9, max: 14, target: 'station_plaza', targetSpawn: 'fromStreet' }],
      passableRects: [
        rect(1, 0, 2, 24), rect(3, 3, 21, 7), rect(0, 10, 1, 4),
        rect(3, 10, 8, 11), rect(13, 10, 11, 11), rect(11, 12, 2, 9)
      ],
      blockedRects: [
        rect(0, 0, 1, 10), rect(3, 0, 21, 3), rect(11, 10, 2, 2),
        rect(0, 14, 1, 10), rect(3, 21, 21, 3)
      ],
      blockedPoints: [],
      areaZones: [{ id: 'street', title: '湯窓通り', subtitle: 'まだ静かな商店街', area: rect(0, 0, 24, 24) }],
      triggers: [
        {
          id: 'street_info', label: '通りの立て札', actionLabel: '読む', type: 'inspect',
          text: '湯窓通り。\n\n今後、店や看板を少しずつ増やしていく予定の通りです。',
          area: rect(11, 10, 2, 2), tapPadding: 1
        }
      ],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#d5c8b0' },
        { x: 0, y: 10, w: 24, h: 5, color: '#efe2bf' },
        { x: 5, y: 6, w: 19, h: 12, color: '#ead9b4' },
        { x: 6, y: 15, w: 15, h: 4, color: '#e4d1aa' }
      ],
      props: [
        {
          id: 'yumado_street_info_sign',
          objectId: 'standing_sign_01',
          src: 'assets/maps/objects/signs/standing_sign_01.png?rev=20260925-standing32x32',
          x: 11,
          y: 10,
          w: 2,
          h: 2,
          footY: 12,
          enabled: true,
          catalogKey: 'standingSignboard',
          collision: {
            enabled: false,
            x: 0.14,
            y: 0.7375,
            w: 0.72,
            h: 0.2625
          },
          interaction: {
            enabled: true,
            triggerId: 'street_info',
            x: -0.00625,
            y: 0.25,
            w: 1.0125,
            h: 0.75
          },
          tap: {
            enabled: true,
            x: -0.00625,
            y: 0.175,
            w: 1.0125,
            h: 0.825
          }
        }
      ],
      decor: [
        deco(6, 4, 5, 4, '#6d776b', '#2d241b', '店'), deco(13, 4, 5, 4, '#8b7658', '#2d241b', '店'),
        deco(19, 4, 4, 4, '#7b6650', '#2d241b', '空き'), deco(7, 16, 3, 2, '#7c6a57', '#2d241b', '看板'),
        deco(15, 16, 4, 2, '#7c6a57', '#2d241b', 'ベンチ'),
        deco(0, 10, 3, 5, '#a9b8c5', '#2d241b', '広場'), deco(21, 15, 1, 1, '#6f8468', '#2d241b', ''),
        deco(12, 16, 1, 1, '#6f8468', '#2d241b', ''), deco(14, 9, 1, 1, '#8b6f4b', '#2d241b', '')
      ]
    },

    recreation_road_map: {
      id: 'recreation_road_map',
      title: '湯間庭レクリエーションロード',
      subtitle: '湯窓レジャーセンター前',
      mapWidth: 24,
      mapHeight: 24,
      backgroundStyle: 'street',
      backgroundImagePath: 'assets/maps/grounds/recreation-road.jpg?rev=20260826-1',
      spawnPoints: {
        default: { x: 12, y: 3, dir: 'down' },
        fromPlaza: { x: 12, y: 3, dir: 'down' },
        fromLeisure: { x: 12, y: 20, dir: 'up' }
      },
      edgeWarps: [
        { side: 'up', min: 10, max: 14, target: 'station_plaza', targetSpawn: 'fromRecreation' },
        { side: 'down', min: 10, max: 15, target: 'leisure_center_map', targetSpawn: 'fromRecreation' }
      ],
      passableRects: [
        { x: 10, y: 0, w: 5, h: 8 },
        { x: 10, y: 8, w: 6, h: 1 },
        { x: 9, y: 9, w: 7, h: 2 },
        { x: 9, y: 11, w: 15, h: 2 },
        { x: 9, y: 13, w: 8, h: 3 },
        { x: 10, y: 16, w: 6, h: 8 }
      ],
      blockedRects: [
        { x: 0, y: 0, w: 10, h: 9 },
        { x: 15, y: 0, w: 9, h: 8 },
        { x: 16, y: 8, w: 8, h: 3 },
        { x: 0, y: 9, w: 9, h: 7 },
        { x: 17, y: 13, w: 7, h: 3 },
        { x: 0, y: 16, w: 10, h: 8 },
        { x: 16, y: 16, w: 8, h: 8 }
      ],
      blockedPoints: [],
      areaZones: [
        {
          id: 'recreation_road',
          title: '湯間庭レクリエーションロード',
          titleLines: ['湯間庭', 'レクリエーションロード'],
          subtitle: '駅前と湯窓レジャーセンターを結ぶ道',
          area: { x: 0, y: 0, w: 24, h: 24 }
        }
      ],
      triggers: [],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#cbbb9c' },
        { x: 10, y: 0, w: 5, h: 24, color: '#aaa79c' },
        { x: 9, y: 9, w: 8, h: 7, color: '#aaa79c' },
        { x: 16, y: 11, w: 8, h: 2, color: '#aaa79c' }
      ],
      props: [],
      decor: []
    },

    leisure_center_map: {
      id: 'leisure_center_map',
      title: 'レジャーセンター',
      subtitle: '湯窓レジャーセンター',
      mapWidth: 24,
      mapHeight: 24,
      backgroundStyle: 'leisure',
      backgroundImagePath: 'assets/maps/grounds/leisure-center-ground.jpg',
      spawnPoints: {
        default: { x: 12, y: 3, dir: 'down' },
        fromPlaza: { x: 12, y: 3, dir: 'down' },
        fromRecreation: { x: 12, y: 3, dir: 'down' }
      },
      edgeWarps: [
        { side: 'up', min: 9, max: 14, target: 'recreation_road_map', targetSpawn: 'fromLeisure' }
      ],
      passableRects: [
        { x: 9, y: 0, w: 6, h: 1 },
        { x: 10, y: 1, w: 5, h: 21 },
        { x: 1, y: 2, w: 9, h: 20 },
        { x: 15, y: 2, w: 8, h: 20 },
        { x: 10, y: 22, w: 4, h: 2 }
      ],
      blockedRects: [
        { x: 0, y: 0, w: 9, h: 2 },
        { x: 15, y: 0, w: 9, h: 2 },
        { x: 0, y: 2, w: 1, h: 22 },
        { x: 23, y: 2, w: 1, h: 22 },
        { x: 1, y: 22, w: 9, h: 2 },
        { x: 14, y: 22, w: 9, h: 2 }
      ],
      blockedPoints: [{ x: 9, y: 1 }],
      areaZones: [
        { id: 'leisure', title: '湯窓レジャーセンター', subtitle: '展示と遊びの入口', area: { x: 0, y: 0, w: 24, h: 24 } }
      ],
      triggers: [
        {
          id: 'leisure_counter',
          label: '案内カウンター',
          actionLabel: '調べる',
          type: 'inspect',
          area: { x: 1, y: 2, w: 6, h: 4 },
          tapPadding: 1,
          text: '案内カウンター。展示は左右に続いている。'
        },
        {
          id: 'leisure_pickup',
          label: 'おすすめ棚',
          actionLabel: '調べる',
          type: 'inspect',
          area: { x: 17, y: 2, w: 6, h: 4 },
          tapPadding: 1,
          text: 'おすすめ棚。ときどき中身が入れ替わる。'
        },
        {
          id: 'leisure_work_steamclock',
          label: 'SteamClock',
          actionLabel: '触る',
          type: 'work',
          workId: 'steamclock',
          area: { x: 2, y: 6, w: 4, h: 4 },
          tapPadding: 1,
          text: '時計の展示。'
        },
        {
          id: 'leisure_work_dotweather',
          label: 'DotWeather',
          actionLabel: '触る',
          type: 'work',
          workId: 'dotweather',
          area: { x: 18, y: 7, w: 4, h: 5 },
          tapPadding: 1,
          text: '空模様の展示。'
        },
        {
          id: 'leisure_work_coffee_factory',
          label: 'CoffeeFactory',
          actionLabel: '触る',
          type: 'work',
          workId: 'coffee-factory',
          area: { x: 2, y: 12, w: 5, h: 5 },
          tapPadding: 1,
          text: 'コーヒーの展示。'
        },
        {
          id: 'leisure_work_diorama_calendar',
          label: 'Diorama Calendar',
          actionLabel: '触る',
          type: 'work',
          workId: 'diorama-calendar',
          area: { x: 18, y: 14, w: 4, h: 4 },
          tapPadding: 1,
          text: '季節の展示。'
        },
        {
          id: 'leisure_catalog',
          label: '展示ガイド',
          actionLabel: '見る',
          type: 'menu',
          target: 'leisure_catalog',
          area: { x: 10, y: 14, w: 4, h: 4 },
          tapPadding: 1,
          text: '展示ガイド。'
        }
      ],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#4a4b55' },
        { x: 0, y: 10, w: 24, h: 5, color: '#6e6b63' },
        { x: 5, y: 5, w: 14, h: 14, color: '#5e594f' },
        { x: 10, y: 0, w: 4, h: 24, color: '#7a756a' },
        { x: 7, y: 15, w: 10, h: 5, color: '#676157' }
      ],
      props: [
        {
          id: 'leisure_counter',
          objectId: 'leisure_counter_01',
          src: 'assets/maps/props/leisure-center/leisure-counter.png?v=20260925-1',
          x: 1.0, y: 0.0, w: 6.0, h: 6.0, footY: 6.0,
          enabled: true,
          catalogKey: 'worldObjectFacility',
          collision: { enabled: true, x: 0.05, y: 0.82, w: 0.90, h: 0.15 },
          interaction: { enabled: true, triggerId: 'leisure_counter', x: 0.03, y: 0.30, w: 0.94, h: 0.68 },
          tap: { enabled: true, x: 0.03, y: 0.30, w: 0.94, h: 0.68 }
        },
        {
          id: 'leisure_pickup',
          objectId: 'leisure_pickup_shelf_01',
          src: 'assets/maps/props/leisure-center/leisure-pickup-shelf.png?v=20260925-6',
          x: 17.375, y: 0, w: 5.25, h: 5.25, footY: 5.25,
          enabled: true,
          catalogKey: 'worldObjectFacility',
          collision: { enabled: true, x: 0.12, y: 0.82, w: 0.76, h: 0.14 },
          interaction: { enabled: true, triggerId: 'leisure_pickup', x: 0.08, y: 0.30, w: 0.84, h: 0.68 },
          tap: { enabled: true, x: 0.08, y: 0.30, w: 0.84, h: 0.68 }
        },
        {
          id: 'leisure_exhibit_steamclock',
          objectId: 'leisure_exhibit_steamclock_01',
          src: 'assets/maps/props/leisure-center/leisure-exhibit-steamclock.png?v=20260925-1',
          x: 2.25, y: 6.25, w: 3.5, h: 3.5, footY: 9.75,
          enabled: true,
          catalogKey: 'worldObjectExhibit',
          collision: { enabled: true, x: 0.08, y: 0.82, w: 0.84, h: 0.16 },
          interaction: { enabled: true, triggerId: 'leisure_work_steamclock', x: 0.04, y: 0.05, w: 0.92, h: 0.92 },
          tap: { enabled: true, x: 0.04, y: 0.05, w: 0.92, h: 0.92 }
        },
        {
          id: 'leisure_exhibit_dotweather',
          objectId: 'leisure_exhibit_dotweather_01',
          src: 'assets/maps/props/leisure-center/leisure-exhibit-dotweather.png?v=20260925-1',
          x: 18.25, y: 7.75, w: 3.5, h: 3.5, footY: 11.25,
          enabled: true,
          catalogKey: 'worldObjectExhibit',
          collision: { enabled: true, x: 0.08, y: 0.82, w: 0.84, h: 0.16 },
          interaction: { enabled: true, triggerId: 'leisure_work_dotweather', x: 0.04, y: 0.05, w: 0.92, h: 0.92 },
          tap: { enabled: true, x: 0.04, y: 0.05, w: 0.92, h: 0.92 }
        },
        {
          id: 'leisure_exhibit_coffee_factory',
          objectId: 'leisure_exhibit_coffeefactory_01',
          src: 'assets/maps/props/leisure-center/leisure-exhibit-coffeefactory.png?v=20260925-1',
          x: 2.0, y: 12.75, w: 4.0, h: 4.0, footY: 16.75,
          enabled: true,
          catalogKey: 'worldObjectExhibit',
          collision: { enabled: true, x: 0.05, y: 0.80, w: 0.90, h: 0.17 },
          interaction: { enabled: true, triggerId: 'leisure_work_coffee_factory', x: 0.03, y: 0.05, w: 0.94, h: 0.92 },
          tap: { enabled: true, x: 0.03, y: 0.05, w: 0.94, h: 0.92 }
        },
        {
          id: 'leisure_exhibit_diorama_calendar',
          objectId: 'leisure_exhibit_diorama_calendar_01',
          src: 'assets/maps/props/leisure-center/leisure-exhibit-diorama-calendar.png?v=20260925-2',
          x: 18.0, y: 14.25, w: 3.5, h: 3.5, footY: 17.75,
          enabled: true,
          catalogKey: 'worldObjectExhibit',
          collision: { enabled: true, x: 0.08, y: 0.82, w: 0.84, h: 0.16 },
          interaction: { enabled: true, triggerId: 'leisure_work_diorama_calendar', x: 0.04, y: 0.05, w: 0.92, h: 0.92 },
          tap: { enabled: true, x: 0.04, y: 0.05, w: 0.92, h: 0.92 }
        },
        {
          id: 'leisure_catalog_terminal',
          objectId: 'leisure_catalog_terminal_01',
          src: 'assets/maps/props/leisure-center/leisure-catalog-terminal.png?v=20260925-1',
          x: 10.5625, y: 15.125, w: 2.875, h: 2.875, footY: 18.0,
          enabled: true,
          catalogKey: 'worldObjectFacility',
          collision: { enabled: true, x: 0.12, y: 0.74, w: 0.76, h: 0.22 },
          interaction: { enabled: true, triggerId: 'leisure_catalog', x: 0.04, y: 0.04, w: 0.92, h: 0.92 },
          tap: { enabled: true, x: 0.04, y: 0.04, w: 0.92, h: 0.92 }
        }
      ],
      decor: []
    },

    onsen_slope_map: {
      id: 'onsen_slope_map',
      title: '温泉(工事中)',
      subtitle: '湯けむり坂',
      mapWidth: 24,
      mapHeight: 24,
      backgroundStyle: 'onsen',
      backgroundImagePath: 'assets/maps/grounds/onsen-slope-ground.jpg',
      spawnPoints: {
        default: { x: 12, y: 20, dir: 'up' },
        fromPlaza: { x: 12, y: 20, dir: 'up' }
      },
      edgeWarps: [{ side: 'down', min: 9, max: 14, target: 'station_plaza', targetSpawn: 'fromOnsen' }],
      passableRects: [
        rect(10, 1, 4, 2), rect(10, 7, 4, 8), rect(9, 8, 1, 5), rect(8, 9, 1, 4), rect(14, 9, 2, 4),
        rect(7, 11, 1, 2), rect(17, 11, 1, 2), rect(8, 14, 1, 1), rect(15, 14, 1, 10), rect(11, 15, 2, 9),
        rect(7, 16, 3, 2), rect(14, 16, 1, 3), rect(16, 16, 1, 8), rect(7, 18, 2, 6), rect(10, 19, 1, 5),
        rect(13, 19, 1, 5)
      ],
      blockedRects: [
        rect(10, 0, 5, 1), rect(14, 1, 1, 8), rect(6, 3, 8, 3), rect(15, 3, 3, 3), rect(8, 6, 6, 1),
        rect(8, 7, 2, 1), rect(7, 8, 2, 1), rect(15, 8, 2, 1), rect(6, 9, 2, 2), rect(17, 9, 1, 2),
        rect(4, 10, 2, 3), rect(18, 10, 2, 4), rect(6, 11, 1, 2), rect(7, 13, 3, 1), rect(14, 13, 4, 1),
        rect(9, 14, 1, 2), rect(14, 14, 1, 2), rect(10, 15, 1, 4), rect(13, 15, 1, 4), rect(9, 18, 1, 6),
        rect(14, 19, 1, 5)
      ],
      blockedPoints: [{ x: 15, y: 6 }, { x: 7, y: 14 }, { x: 16, y: 14 }, { x: 8, y: 15 }],
      areaZones: [{ id: 'onsen', title: '温泉方面', subtitle: 'ただいま工事中', area: rect(0, 0, 24, 24) }],
      triggers: [
        {
          id: 'onsen_notice', label: '工事看板', actionLabel: '読む', type: 'inspect',
          text: 'この先は温泉方面。\n\nただいま工事中です。将来、町の上側へつながります。',
          area: rect(8, 3, 8, 4), tapPadding: 1
        }
      ],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#cbbfa8' },
        { x: 10, y: 0, w: 4, h: 24, color: '#d8ccb5' },
        { x: 7, y: 16, w: 10, h: 8, color: '#ede1be' },
        { x: 8, y: 8, w: 8, h: 8, color: '#d4c5ab' }
      ],
      props: [
        {
          id: 'onsen_no_entry_barrier',
          objectId: 'onsen_no_entry_barrier_01',
          src: 'assets/maps/objects/signs/no-entry-sign.png?v=20260925-1',
          x: 10,
          y: 2,
          w: 4,
          h: 4,
          footY: 6,
          enabled: true,
          catalogKey: 'worldObjectFacility',
          collision: {
            enabled: false,
            x: 0.08,
            y: 0.72,
            w: 0.84,
            h: 0.22
          },
          interaction: {
            enabled: true,
            triggerId: 'onsen_notice',
            x: 0.02,
            y: 0.38,
            w: 0.96,
            h: 0.60
          },
          tap: {
            enabled: true,
            x: 0.02,
            y: 0.32,
            w: 0.96,
            h: 0.66
          }
        }
      ],
      decor: [
        deco(8, 6, 8, 1, '#7f7566', '#2d241b', ''),
        deco(4, 10, 3, 3, '#768470', '#2d241b', ''), deco(17, 10, 3, 3, '#768470', '#2d241b', ''),
        deco(10, 21, 4, 3, '#a9b8c5', '#2d241b', '広場'), deco(7, 14, 1, 1, '#88745e', '#2d241b', ''),
        deco(16, 14, 1, 1, '#88745e', '#2d241b', ''), deco(9, 7, 1, 1, '#b89275', '#2d241b', ''),
        deco(14, 7, 1, 1, '#b89275', '#2d241b', '')
      ]
    }
  };

  window.DESTINATIONS = window.DESTINATIONS || {};

  if (!window.DESTINATIONS.tomogushi_game_board) {
    window.DESTINATIONS.tomogushi_game_board = {
      id: 'tomogushi_game_board',
      title: 'ゲーム案内所',
      subtitle: '灯串横丁',
      description: '灯串横丁で遊べるゲームをまとめた案内所です。',
      flavor: '入口近くの小さな店先に、今夜の案内札が並んでいる。',
      returnScene: 'tomogushi_alley_map',
      returnLabel: '灯串横丁',
      menuTitle: '遊ぶゲームを選ぶ',
      items: [
        { workId: 'midnight-cola', label: '真夜中コーラ' },
        { workId: 'yakitori-wars', label: 'Yakitori Wars' },
        { kind: 'message', label: 'これから増えるゲーム', text: '新しいゲームは、まずこの一覧に追加していく想定です。' },
        { kind: 'back', label: '横丁へ戻る' }
      ]
    };
  }

  if (!window.DESTINATIONS.leisure_catalog) {
    window.DESTINATIONS.leisure_catalog = {
      id: 'leisure_catalog',
      title: '展示ガイド',
      subtitle: '湯窓レジャーセンター',
      description: '展示を全部個別の台にせず、ここから選択肢で見られるようにしたガイドです。',
      flavor: '展示が増えても、通路や棚を毎回作り直さずに済む構成です。',
      returnScene: 'leisure_center_map',
      returnLabel: 'レジャーセンター',
      menuTitle: '見たい展示を選ぶ',
      items: [
        { kind: 'message', label: '触れるらくがき一覧', text: '触れるらくがきの一覧をここから見せる想定です。' },
        { kind: 'message', label: 'おすすめ展示', text: 'いま推したい展示や、最近追加した展示をここから案内できます。' },
        { kind: 'message', label: 'テーマ別に見る', text: 'テーマ別の選び方にも対応しやすい構成です。' },
        { kind: 'back', label: 'レジャーセンターへ戻る' }
      ]
    };
  }
})();