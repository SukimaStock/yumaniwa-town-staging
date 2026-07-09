(function() {
  function rect(x, y, w, h) { return { x: x, y: y, w: w, h: h }; }
  function deco(x, y, w, h, fill, stroke, label, labelColor) {
    return { x: x, y: y, w: w, h: h, fill: fill, stroke: stroke, label: label || '', labelColor: labelColor || '#ffffff' };
  }

  window.TOWN_SCENE_MAPS = {
    station_plaza: {
      id: 'station_plaza',
      title: '広場',
      subtitle: '町の中心',
      mapWidth: 24,
      mapHeight: 24,
      backgroundStyle: 'plaza',
      spawnPoints: {
        default: { x: 12, y: 16, dir: 'up' },
        fromStation: { x: 12, y: 20, dir: 'up' },
        fromBoard: { x: 3, y: 11, dir: 'right' },
        fromStreet: { x: 20, y: 11, dir: 'left' },
        fromOnsen: { x: 12, y: 3, dir: 'down' }
      },
      edgeWarps: [
        { side: 'left', min: 9, max: 14, target: 'shinpo_board_map', targetSpawn: 'fromPlaza' },
        { side: 'right', min: 9, max: 14, target: 'yumado_street_map', targetSpawn: 'fromPlaza' },
        { side: 'up', min: 9, max: 14, target: 'onsen_slope_map', targetSpawn: 'fromPlaza' },
        { side: 'down', min: 9, max: 14, target: 'station_map', targetSpawn: 'fromPlaza' }
      ],
      passableRects: [rect(0, 9, 24, 6), rect(9, 0, 6, 24), rect(6, 6, 12, 12)],
      blockedRects: [
        rect(0, 6, 5, 12), rect(19, 6, 5, 12), rect(8, 0, 8, 3), rect(8, 21, 8, 3),
        rect(6, 16, 2, 2), rect(16, 16, 2, 2), rect(10, 10, 4, 2)
      ],
      blockedPoints: [],
      areaZones: [{ id: 'plaza', title: '広場', subtitle: '町の中心', area: rect(0, 0, 24, 24) }],
      triggers: [
        { id: 'tourist_map', label: '観光案内板', actionLabel: '調べる', type: 'inspect', text: '広場の観光案内板。\n\n町の中心なので、ここから各マップへ散歩していけます。', area: rect(11, 10, 2, 2), tapPadding: 1 },
        { id: 'plaza_hint', label: '広場の掲示', actionLabel: '読む', type: 'inspect', text: '広場。\n\n左に掲示板、右に湯窓通り、上に温泉方面、下に駅があります。', area: rect(10, 15, 4, 1), tapPadding: 1 }
      ],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#d9ccb3' },
        { x: 0, y: 9, w: 24, h: 6, color: '#f0e4c2' },
        { x: 9, y: 0, w: 6, h: 24, color: '#f0e4c2' },
        { x: 6, y: 6, w: 12, h: 12, color: '#eadbb5' }
      ],
      decor: [
        deco(0, 6, 5, 12, '#77634d', '#2d241b', '掲示板'),
        deco(19, 6, 5, 12, '#72806a', '#2d241b', '湯窓通り'),
        deco(8, 0, 8, 3, '#8a7d6a', '#2d241b', '温泉'),
        deco(8, 21, 8, 3, '#6d746b', '#2d241b', '駅'),
        deco(6, 16, 2, 2, '#8c7b64', '#2d241b', ''),
        deco(16, 16, 2, 2, '#8c7b64', '#2d241b', '')
      ]
    },

    station_map: {
      id: 'station_map',
      title: '駅',
      subtitle: '湯間庭駅',
      mapWidth: 24,
      mapHeight: 24,
      backgroundStyle: 'station',
      spawnPoints: {
        default: { x: 12, y: 6, dir: 'down' },
        fromPlaza: { x: 12, y: 4, dir: 'down' },

        // 画面上の左 = x が小さい側。
        // 横丁は駅の左、レジャーセンターは駅の右。
        fromAlley: { x: 3, y: 12, dir: 'right' },
        fromLeisure: { x: 20, y: 12, dir: 'left' }
      },
      edgeWarps: [
        // 駅の上端 → 広場
        { side: 'up', min: 9, max: 14, target: 'station_plaza', targetSpawn: 'fromStation' },

        // 駅の左端 → 横丁
        { side: 'left', min: 9, max: 14, target: 'tomogushi_alley_map', targetSpawn: 'fromStation' },

        // 駅の右端 → レジャーセンター
        { side: 'right', min: 9, max: 14, target: 'leisure_center_map', targetSpawn: 'fromStation' }
      ],
      passableRects: [rect(0, 9, 24, 6), rect(9, 0, 6, 18), rect(7, 18, 10, 6)],
      blockedRects: [rect(6, 18, 12, 6), rect(9, 0, 6, 3)],
      blockedPoints: [],
      areaZones: [{ id: 'station', title: '湯間庭駅', subtitle: '列車の小さな終着点', area: rect(0, 0, 24, 24) }],
      triggers: [
        { id: 'station_notice', label: '駅の案内', actionLabel: '読む', type: 'inspect', text: '湯間庭駅。\n\n上へ行くと広場、左へ行くと横丁、右へ行くとレジャーセンターです。', area: rect(10, 6, 4, 1), tapPadding: 1 }
      ],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#d4c6ac' },
        { x: 0, y: 9, w: 24, h: 6, color: '#efe3c1' },
        { x: 9, y: 0, w: 6, h: 18, color: '#efe3c1' },
        { x: 7, y: 18, w: 10, h: 6, color: '#a98054' }
      ],
      decor: [
        deco(0, 6, 5, 12, '#6d655b', '#2d241b', '横丁'),
        deco(19, 6, 5, 12, '#6d776b', '#2d241b', 'レジャー'),
        deco(6, 18, 12, 6, '#86755d', '#2d241b', '駅舎'),
        deco(9, 0, 6, 3, '#857968', '#2d241b', '広場')
      ]
    },

    shinpo_board_map: {
      id: 'shinpo_board_map',
      title: '掲示板',
      subtitle: '湯間庭新報',
      mapWidth: 24,
      mapHeight: 24,
      backgroundStyle: 'board',
      spawnPoints: {
        default: { x: 20, y: 12, dir: 'left' },
        fromPlaza: { x: 20, y: 12, dir: 'left' }
      },
      edgeWarps: [
        { side: 'right', min: 9, max: 14, target: 'station_plaza', targetSpawn: 'fromBoard' }
      ],
      passableRects: [rect(0, 9, 24, 6), rect(3, 5, 12, 10), rect(15, 8, 9, 8)],
      blockedRects: [rect(3, 4, 10, 4), rect(0, 6, 3, 12)],
      blockedPoints: [],
      areaZones: [{ id: 'board', title: '掲示板', subtitle: '湯間庭新報', area: rect(0, 0, 24, 24) }],
      triggers: [
        { id: 'shinpo_board_trigger', label: '掲示板を読む', actionLabel: '読む', type: 'menu', target: 'shinpo_board', text: '町の掲示板。\n\nnoteの記事やお知らせを並べていく場所です。', area: rect(6, 5, 8, 3), tapPadding: 1 },
        { id: 'board_info', label: '新聞差し', actionLabel: '調べる', type: 'inspect', text: '新聞差し。\n\nここから、町の回覧板や記事一覧を見られるようにする予定です。', area: rect(16, 10, 4, 2), tapPadding: 1 }
      ],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#d8ccb6' },
        { x: 0, y: 9, w: 24, h: 6, color: '#efe4c6' },
        { x: 3, y: 5, w: 12, h: 10, color: '#e8d7b5' }
      ],
      decor: [
        deco(3, 4, 10, 4, '#7a6550', '#2d241b', '掲示板'),
        deco(15, 8, 6, 5, '#8e7b65', '#2d241b', '新聞差し'),
        deco(21, 9, 3, 6, '#a9b8c5', '#2d241b', '広場')
      ]
    },

    yumado_street_map: {
      id: 'yumado_street_map',
      title: '湯窓通り',
      subtitle: '商店の通り',
      mapWidth: 24,
      mapHeight: 24,
      backgroundStyle: 'street',
      spawnPoints: {
        default: { x: 3, y: 12, dir: 'right' },
        fromPlaza: { x: 3, y: 12, dir: 'right' }
      },
      edgeWarps: [
        { side: 'left', min: 9, max: 14, target: 'station_plaza', targetSpawn: 'fromStreet' }
      ],
      passableRects: [rect(0, 9, 24, 6), rect(5, 6, 19, 12)],
      blockedRects: [rect(6, 4, 5, 4), rect(13, 4, 5, 4), rect(18, 4, 5, 4), rect(7, 16, 4, 3), rect(14, 16, 5, 3)],
      blockedPoints: [],
      areaZones: [{ id: 'street', title: '湯窓通り', subtitle: 'まだ静かな商店街', area: rect(0, 0, 24, 24) }],
      triggers: [
        { id: 'street_info', label: '通りの立て札', actionLabel: '読む', type: 'inspect', text: '湯窓通り。\n\n今後、店や看板を少しずつ増やしていく予定の通りです。', area: rect(10, 10, 3, 2), tapPadding: 1 },
        { id: 'street_shop', label: '空き店舗', actionLabel: '調べる', type: 'inspect', text: '空き店舗。\n\n展示やお店、あるいは別の入口を置けそうです。', area: rect(18, 16, 2, 2), tapPadding: 1 }
      ],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#d5c8b0' },
        { x: 0, y: 9, w: 24, h: 6, color: '#efe2bf' },
        { x: 5, y: 6, w: 19, h: 12, color: '#ead9b4' }
      ],
      decor: [
        deco(6, 4, 5, 4, '#6d776b', '#2d241b', '店'),
        deco(13, 4, 5, 4, '#8b7658', '#2d241b', '店'),
        deco(18, 4, 5, 4, '#7b6650', '#2d241b', '店'),
        deco(7, 16, 4, 3, '#7c6a57', '#2d241b', ''),
        deco(14, 16, 5, 3, '#7c6a57', '#2d241b', ''),
        deco(0, 9, 3, 6, '#a9b8c5', '#2d241b', '広場')
      ]
    },

    tomogushi_alley_map: {
      id: 'tomogushi_alley_map',
      title: '横丁',
      subtitle: '灯串横丁',
      mapWidth: 24,
      mapHeight: 24,
      backgroundStyle: 'alley',
      spawnPoints: {
        default: { x: 20, y: 12, dir: 'left' },

        // 駅から横丁へ来た時:
        // 横丁は駅の左側にあるので、駅側の出入口は横丁マップの右端。
        fromStation: { x: 20, y: 12, dir: 'left' }
      },
      edgeWarps: [
        // 横丁の右端 → 駅の左側
        { side: 'right', min: 9, max: 14, target: 'station_map', targetSpawn: 'fromAlley' }
      ],
      passableRects: [rect(0, 9, 24, 6), rect(4, 6, 16, 12)],
      blockedRects: [rect(2, 4, 4, 4), rect(9, 4, 5, 4), rect(4, 16, 4, 4), rect(12, 16, 5, 4)],
      blockedPoints: [],
      areaZones: [{ id: 'alley', title: '灯串横丁', subtitle: '夜の遊び場の路地', area: rect(0, 0, 24, 24) }],
      triggers: [
        { id: 'midnight_cola_booth', label: '真夜中コーラ', actionLabel: '遊ぶ', type: 'work', workId: 'midnight-cola', text: '真夜中コーラ。', area: rect(2, 4, 4, 3), tapPadding: 1 },
        { id: 'yakitori_wars_booth', label: 'Yakitori Wars', actionLabel: '遊ぶ', type: 'work', workId: 'yakitori-wars', text: 'Yakitori Wars。', area: rect(9, 4, 5, 3), tapPadding: 1 },
        { id: 'empty_stall', label: '空き屋台', actionLabel: '調べる', type: 'inspect', text: '空き屋台。\n\nここには次のゲームや小さな遊びを置けそうです。', area: rect(12, 16, 5, 3), tapPadding: 1 }
      ],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#49392f' },
        { x: 0, y: 9, w: 24, h: 6, color: '#6f5b46' },
        { x: 4, y: 6, w: 16, h: 12, color: '#5a4738' }
      ],
      decor: [
        deco(2, 4, 4, 4, '#7d5a42', '#2d241b', 'コーラ'),
        deco(9, 4, 5, 4, '#8a6445', '#2d241b', '焼き鳥'),
        deco(4, 16, 4, 4, '#73553d', '#2d241b', '屋台'),
        deco(12, 16, 5, 4, '#73553d', '#2d241b', '空き'),
        deco(21, 9, 3, 6, '#a9b8c5', '#2d241b', '駅')
      ]
    },

    leisure_center_map: {
      id: 'leisure_center_map',
      title: 'レジャーセンター',
      subtitle: '湯窓レジャーセンター',
      mapWidth: 24,
      mapHeight: 24,
      backgroundStyle: 'leisure',
      spawnPoints: {
        default: { x: 3, y: 12, dir: 'right' },

        // 駅からレジャーセンターへ来た時:
        // レジャーセンターは駅の右側にあるので、駅側の出入口はレジャーマップの左端。
        fromStation: { x: 3, y: 12, dir: 'right' }
      },
      edgeWarps: [
        // レジャーセンターの左端 → 駅の右側
        { side: 'left', min: 9, max: 14, target: 'station_map', targetSpawn: 'fromLeisure' }
      ],
      passableRects: [rect(0, 9, 24, 6), rect(4, 5, 18, 14)],
      blockedRects: [rect(6, 4, 4, 4), rect(13, 4, 5, 4), rect(7, 16, 5, 3), rect(15, 16, 5, 3)],
      blockedPoints: [],
      areaZones: [{ id: 'leisure', title: '湯窓レジャーセンター', subtitle: '展示と遊びの入口', area: rect(0, 0, 24, 24) }],
      triggers: [
        { id: 'leisure_counter', label: '案内カウンター', actionLabel: '調べる', type: 'inspect', text: '案内カウンター。\n\nここには展示案内や説明を置けそうです。', area: rect(6, 4, 4, 3), tapPadding: 1 },
        { id: 'leisure_showcase', label: '展示台', actionLabel: '調べる', type: 'inspect', text: '展示台。\n\n触れるらくがきや展示物を置く場所として使えそうです。', area: rect(15, 16, 5, 2), tapPadding: 1 },
        { id: 'leisure_pickup', label: 'おすすめ棚', actionLabel: '調べる', type: 'inspect', text: 'おすすめ棚。\n\nランダム展示やピックアップ作品を置けそうです。', area: rect(13, 4, 5, 3), tapPadding: 1 }
      ],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#4a4b55' },
        { x: 0, y: 9, w: 24, h: 6, color: '#6e6b63' },
        { x: 4, y: 5, w: 18, h: 14, color: '#5e594f' }
      ],
      decor: [
        deco(6, 4, 4, 4, '#7c756c', '#222', '案内'),
        deco(13, 4, 5, 4, '#90856d', '#222', '棚'),
        deco(7, 16, 5, 3, '#7d715e', '#222', '展示'),
        deco(15, 16, 5, 3, '#7d715e', '#222', '展示'),
        deco(0, 9, 3, 6, '#a9b8c5', '#222', '駅')
      ]
    },

    onsen_slope_map: {
      id: 'onsen_slope_map',
      title: '温泉(工事中)',
      subtitle: '湯けむり坂',
      mapWidth: 24,
      mapHeight: 24,
      backgroundStyle: 'onsen',
      spawnPoints: {
        default: { x: 12, y: 20, dir: 'up' },
        fromPlaza: { x: 12, y: 20, dir: 'up' }
      },
      edgeWarps: [
        { side: 'down', min: 9, max: 14, target: 'station_plaza', targetSpawn: 'fromOnsen' }
      ],
      passableRects: [rect(9, 0, 6, 24), rect(6, 17, 12, 7)],
      blockedRects: [rect(6, 3, 12, 4), rect(4, 10, 5, 4), rect(15, 10, 5, 4)],
      blockedPoints: [],
      areaZones: [{ id: 'onsen', title: '温泉方面', subtitle: 'ただいま工事中', area: rect(0, 0, 24, 24) }],
      triggers: [
        { id: 'onsen_notice', label: '工事看板', actionLabel: '読む', type: 'inspect', text: 'この先は温泉方面。\n\nただいま工事中です。将来、町の上側へつながります。', area: rect(9, 4, 6, 2), tapPadding: 1 }
      ],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#cbbfa8' },
        { x: 9, y: 0, w: 6, h: 24, color: '#d8ccb5' },
        { x: 6, y: 17, w: 12, h: 7, color: '#ede1be' }
      ],
      decor: [
        deco(6, 3, 12, 4, '#8f8472', '#2d241b', '工事中'),
        deco(4, 10, 5, 4, '#768470', '#2d241b', ''),
        deco(15, 10, 5, 4, '#768470', '#2d241b', ''),
        deco(9, 21, 6, 3, '#a9b8c5', '#2d241b', '広場')
      ]
    }
  };
})();
