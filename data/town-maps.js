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
      spawnPoints: {
        default: { x: 12, y: 15, dir: 'up' },
        fromAlley: { x: 3, y: 12, dir: 'right' },
        fromStreet: { x: 20, y: 12, dir: 'left' },
        fromOnsen: { x: 12, y: 3, dir: 'down' },
        fromLeisure: { x: 12, y: 20, dir: 'up' }
      },
      edgeWarps: [
        { side: 'left', min: 9, max: 14, target: 'tomogushi_alley_map', targetSpawn: 'fromPlaza' },
        { side: 'right', min: 9, max: 14, target: 'yumado_street_map', targetSpawn: 'fromPlaza' },
        { side: 'up', min: 9, max: 14, target: 'onsen_slope_map', targetSpawn: 'fromPlaza' },
        { side: 'down', min: 9, max: 14, target: 'leisure_center_map', targetSpawn: 'fromPlaza' }
      ],
      passableRects: [
        rect(0, 10, 24, 5),
        rect(10, 0, 4, 24),
        rect(6, 6, 12, 12),
        rect(8, 15, 8, 6)
      ],
      blockedRects: [
        rect(0, 5, 5, 8),
        rect(19, 5, 5, 8),
        rect(8, 0, 8, 3),
        rect(7, 17, 4, 4),
        rect(13, 17, 4, 4),
        rect(6, 16, 1, 2),
        rect(17, 16, 1, 2)
      ],
      blockedPoints: [],
      areaZones: [
        { id: 'station_plaza', title: '駅前広場', subtitle: '駅と広場がひとつになった中心地', area: rect(0, 0, 24, 24) }
      ],
      triggers: [
        { id: 'station_notice', label: '駅の案内', actionLabel: '読む', type: 'inspect', text: '湯間庭駅前広場。\n\n左に灯串横丁、右に湯窓通り、上に温泉方面、下にレジャーセンターがあります。', area: rect(9, 18, 6, 2), tapPadding: 1 },
        { id: 'tourist_map', label: '観光案内板', actionLabel: '調べる', type: 'inspect', text: '駅前広場の観光案内板。\n\n町の中心なので、ここから各マップへ散歩していけます。', area: rect(11, 9, 2, 2), tapPadding: 1 },
        { id: 'shinpo_board_trigger', label: '掲示板を読む', actionLabel: '読む', type: 'menu', target: 'shinpo_board', text: '広場の掲示板。\n\nnoteの記事やお知らせを並べていく場所です。', area: rect(1, 6, 3, 6), tapPadding: 1 }
      ],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#d9ccb3' },
        { x: 0, y: 10, w: 24, h: 5, color: '#f0e4c2' },
        { x: 10, y: 0, w: 4, h: 24, color: '#f0e4c2' },
        { x: 6, y: 6, w: 12, h: 12, color: '#eadbb5' },
        { x: 8, y: 15, w: 8, h: 6, color: '#e6d2a8' }
      ],
      decor: [
        deco(0, 5, 5, 8, '#735944', '#2d241b', '掲示板'),
        deco(19, 5, 5, 8, '#72806a', '#2d241b', '通り'),
        deco(8, 0, 8, 3, '#8a7d6a', '#2d241b', '温泉'),
        deco(7, 17, 4, 4, '#8c7b64', '#2d241b', '駅'),
        deco(13, 17, 4, 4, '#8c7b64', '#2d241b', '駅'),
        deco(8, 21, 8, 3, '#6d746b', '#2d241b', 'レジャー'),
        deco(11, 9, 2, 2, '#8b937c', '#2d241b', '案内'),
        deco(6, 16, 1, 2, '#8c7b64', '#2d241b', ''),
        deco(17, 16, 1, 2, '#8c7b64', '#2d241b', '')
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
        fromPlaza: { x: 20, y: 12, dir: 'left' }
      },
      edgeWarps: [
        { side: 'right', min: 9, max: 14, target: 'station_plaza', targetSpawn: 'fromAlley' }
      ],
      passableRects: [
        rect(0, 10, 24, 5),
        rect(4, 6, 16, 12),
        rect(3, 15, 16, 4)
      ],
      blockedRects: [
        rect(2, 4, 5, 4),
        rect(9, 4, 6, 4),
        rect(4, 16, 4, 4),
        rect(12, 16, 5, 4)
      ],
      blockedPoints: [],
      areaZones: [
        { id: 'alley', title: '灯串横丁', subtitle: '夜の遊び場の路地', area: rect(0, 0, 24, 24) }
      ],
      triggers: [
        { id: 'midnight_cola_booth', label: '真夜中コーラ', actionLabel: '遊ぶ', type: 'work', workId: 'midnight-cola', text: '真夜中コーラ。', area: rect(2, 4, 5, 4), tapPadding: 1 },
        { id: 'yakitori_wars_booth', label: 'Yakitori Wars', actionLabel: '遊ぶ', type: 'work', workId: 'yakitori-wars', text: 'Yakitori Wars。', area: rect(9, 4, 6, 4), tapPadding: 1 },
        { id: 'empty_stall', label: '空き屋台', actionLabel: '調べる', type: 'inspect', text: '空き屋台。\n\nここには次のゲームや小さな遊びを置けそうです。', area: rect(12, 16, 5, 4), tapPadding: 1 }
      ],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#49392f' },
        { x: 0, y: 10, w: 24, h: 5, color: '#6f5b46' },
        { x: 4, y: 6, w: 16, h: 12, color: '#5a4738' },
        { x: 3, y: 15, w: 16, h: 4, color: '#6a543f' }
      ],
      decor: [
        deco(2, 4, 5, 4, '#7d5a42', '#2d241b', 'コーラ'),
        deco(9, 4, 6, 4, '#8a6445', '#2d241b', '焼き鳥'),
        deco(4, 16, 4, 4, '#73553d', '#2d241b', '屋台'),
        deco(12, 16, 5, 4, '#73553d', '#2d241b', '空き'),
        deco(21, 10, 3, 5, '#a9b8c5', '#2d241b', '広場')
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
      passableRects: [
        rect(0, 10, 24, 5),
        rect(5, 6, 19, 12),
        rect(6, 15, 15, 4)
      ],
      blockedRects: [
        rect(6, 4, 5, 4),
        rect(13, 4, 5, 4),
        rect(19, 4, 4, 4),
        rect(7, 16, 4, 3),
        rect(15, 16, 5, 3)
      ],
      blockedPoints: [],
      areaZones: [
        { id: 'street', title: '湯窓通り', subtitle: 'まだ静かな商店街', area: rect(0, 0, 24, 24) }
      ],
      triggers: [
        { id: 'street_info', label: '通りの立て札', actionLabel: '読む', type: 'inspect', text: '湯窓通り。\n\n今後、店や看板を少しずつ増やしていく予定の通りです。', area: rect(11, 10, 2, 2), tapPadding: 1 },
        { id: 'street_shop', label: '空き店舗', actionLabel: '調べる', type: 'inspect', text: '空き店舗。\n\n展示やお店、あるいは別の入口を置けそうです。', area: rect(19, 4, 4, 4), tapPadding: 1 }
      ],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#d5c8b0' },
        { x: 0, y: 10, w: 24, h: 5, color: '#efe2bf' },
        { x: 5, y: 6, w: 19, h: 12, color: '#ead9b4' },
        { x: 6, y: 15, w: 15, h: 4, color: '#e4d1aa' }
      ],
      decor: [
        deco(6, 4, 5, 4, '#6d776b', '#2d241b', '店'),
        deco(13, 4, 5, 4, '#8b7658', '#2d241b', '店'),
        deco(19, 4, 4, 4, '#7b6650', '#2d241b', '空き'),
        deco(7, 16, 4, 3, '#7c6a57', '#2d241b', '看板'),
        deco(15, 16, 5, 3, '#7c6a57', '#2d241b', 'ベンチ'),
        deco(0, 10, 3, 5, '#a9b8c5', '#2d241b', '広場')
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
        default: { x: 12, y: 3, dir: 'down' },
        fromPlaza: { x: 12, y: 3, dir: 'down' }
      },
      edgeWarps: [
        { side: 'up', min: 9, max: 14, target: 'station_plaza', targetSpawn: 'fromLeisure' }
      ],
      passableRects: [
        rect(10, 0, 4, 24),
        rect(0, 10, 24, 5),
        rect(5, 5, 14, 14),
        rect(7, 15, 10, 5)
      ],
      blockedRects: [
        rect(4, 4, 5, 4),
        rect(15, 4, 5, 4),
        rect(6, 16, 5, 3),
        rect(14, 16, 5, 3)
      ],
      blockedPoints: [],
      areaZones: [
        { id: 'leisure', title: '湯窓レジャーセンター', subtitle: '展示と遊びの入口', area: rect(0, 0, 24, 24) }
      ],
      triggers: [
        { id: 'leisure_counter', label: '案内カウンター', actionLabel: '調べる', type: 'inspect', text: '案内カウンター。\n\nここには展示案内や説明を置けそうです。', area: rect(4, 4, 5, 4), tapPadding: 1 },
        { id: 'leisure_pickup', label: 'おすすめ棚', actionLabel: '調べる', type: 'inspect', text: 'おすすめ棚。\n\nランダム展示やピックアップ作品を置けそうです。', area: rect(15, 4, 5, 4), tapPadding: 1 },
        { id: 'leisure_showcase_left', label: '展示台', actionLabel: '調べる', type: 'inspect', text: '展示台。\n\n触れるらくがきや展示物を置く場所として使えそうです。', area: rect(6, 16, 5, 3), tapPadding: 1 },
        { id: 'leisure_showcase_right', label: '展示台', actionLabel: '調べる', type: 'inspect', text: '展示台。\n\n触れるらくがきや展示物を置く場所として使えそうです。', area: rect(14, 16, 5, 3), tapPadding: 1 }
      ],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#4a4b55' },
        { x: 0, y: 10, w: 24, h: 5, color: '#6e6b63' },
        { x: 5, y: 5, w: 14, h: 14, color: '#5e594f' },
        { x: 10, y: 0, w: 4, h: 24, color: '#7a756a' },
        { x: 7, y: 15, w: 10, h: 5, color: '#676157' }
      ],
      decor: [
        deco(4, 4, 5, 4, '#7c756c', '#222', '案内'),
        deco(15, 4, 5, 4, '#90856d', '#222', '棚'),
        deco(6, 16, 5, 3, '#7d715e', '#222', '展示'),
        deco(14, 16, 5, 3, '#7d715e', '#222', '展示'),
        deco(10, 0, 4, 3, '#a9b8c5', '#222', '広場')
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
      passableRects: [
        rect(10, 0, 4, 24),
        rect(7, 16, 10, 8),
        rect(8, 8, 8, 8)
      ],
      blockedRects: [
        rect(6, 3, 12, 4),
        rect(4, 10, 4, 4),
        rect(16, 10, 4, 4)
      ],
      blockedPoints: [],
      areaZones: [
        { id: 'onsen', title: '温泉方面', subtitle: 'ただいま工事中', area: rect(0, 0, 24, 24) }
      ],
      triggers: [
        { id: 'onsen_notice', label: '工事看板', actionLabel: '読む', type: 'inspect', text: 'この先は温泉方面。\n\nただいま工事中です。将来、町の上側へつながります。', area: rect(8, 4, 8, 3), tapPadding: 1 }
      ],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#cbbfa8' },
        { x: 10, y: 0, w: 4, h: 24, color: '#d8ccb5' },
        { x: 7, y: 16, w: 10, h: 8, color: '#ede1be' },
        { x: 8, y: 8, w: 8, h: 8, color: '#d4c5ab' }
      ],
      decor: [
        deco(6, 3, 12, 4, '#8f8472', '#2d241b', '工事中'),
        deco(4, 10, 4, 4, '#768470', '#2d241b', ''),
        deco(16, 10, 4, 4, '#768470', '#2d241b', ''),
        deco(10, 21, 4, 3, '#a9b8c5', '#2d241b', '広場')
      ]
    }
  };
})();
