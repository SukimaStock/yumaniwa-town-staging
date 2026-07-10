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
      backgroundImagePath: 'assets/maps/grounds/station-plaza-ground.png',
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
        rect(1, 7, 4, 2),   // 横長掲示板
        rect(1, 10, 1, 1),  // 鉢植え
        rect(4, 10, 1, 1),
        rect(7, 8, 2, 1),   // ベンチ
        rect(15, 13, 2, 1), // ベンチ
        rect(11, 9, 2, 2),  // 観光案内板
        rect(19, 6, 4, 7),  // 湯窓通り入口の建物気配
        rect(8, 0, 8, 3),   // 温泉方面の工事柵
        rect(7, 17, 4, 4),  // 駅舎 左
        rect(13, 17, 4, 4), // 駅舎 右
        rect(8, 21, 8, 3)   // レジャーセンター案内口
      ],
      blockedPoints: [
        { x: 6, y: 10 }, // 街灯
        { x: 18, y: 10 },
        { x: 6, y: 15 }, // 横丁入口の提灯柱
        { x: 17, y: 15 }
      ],
      areaZones: [
        { id: 'station_plaza', title: '駅前広場', subtitle: '駅と広場がひとつになった中心地', area: rect(0, 0, 24, 24) }
      ],
      triggers: [
        { id: 'station_notice', label: '駅の案内', actionLabel: '読む', type: 'inspect', text: '湯間庭駅前広場。\n\n左に灯串横丁、右に湯窓通り、上に温泉方面、下にレジャーセンターがあります。', area: rect(9, 18, 6, 2), tapPadding: 1 },
        { id: 'tourist_map', label: '観光案内板', actionLabel: '調べる', type: 'inspect', text: '駅前広場の観光案内板。\n\n町の中心なので、ここから各マップへ散歩していけます。', area: rect(11, 9, 2, 2), tapPadding: 1 },
        { id: 'shinpo_board_trigger', label: '掲示板を読む', actionLabel: '読む', type: 'menu', target: 'shinpo_board', text: '広場の横長掲示板。\n\nnoteの記事やお知らせを並べていく場所です。', area: rect(1, 7, 4, 2), tapPadding: 1 }
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
        deco(1, 6, 4, 1, '#8c765f', '#2d241b', ''), // 掲示板のひさし
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
      id: 'tomogushi_alley_map',
      title: '横丁',
      subtitle: '灯串横丁',
      mapWidth: 24,
      mapHeight: 24,
      backgroundStyle: 'alley',
      backgroundImagePath: 'assets/maps/grounds/tomogushi-alley-ground.png',
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
        rect(4, 16, 4, 3),
        rect(12, 16, 5, 3),
        rect(2, 15, 1, 2),
        rect(18, 15, 1, 2)
      ],
      blockedPoints: [
        { x: 3, y: 3 }, { x: 6, y: 3 }, { x: 10, y: 3 }, { x: 14, y: 3 }, { x: 17, y: 3 },
        { x: 8, y: 16 }, { x: 11, y: 16 }
      ],
      areaZones: [
        { id: 'alley', title: '灯串横丁', subtitle: '夜の遊び場の路地', area: rect(0, 0, 24, 24) }
      ],
      triggers: [
        { id: 'midnight_cola_booth', label: '真夜中コーラ', actionLabel: '遊ぶ', type: 'work', workId: 'midnight-cola', text: '真夜中コーラ。', area: rect(2, 4, 5, 4), tapPadding: 1 },
        { id: 'yakitori_wars_booth', label: 'Yakitori Wars', actionLabel: '遊ぶ', type: 'work', workId: 'yakitori-wars', text: 'Yakitori Wars。', area: rect(9, 4, 6, 4), tapPadding: 1 },
        { id: 'game_list_stall', label: 'ゲーム案内屋台', actionLabel: '見る', type: 'menu', target: 'tomogushi_game_board', text: 'ゲーム案内屋台。\n\n灯串横丁で遊べるゲームを一覧で見られます。', area: rect(4, 16, 4, 3), tapPadding: 1 },
        { id: 'empty_stall', label: '空き屋台', actionLabel: '調べる', type: 'inspect', text: '空き屋台。\n\nここには次のゲームや小さな遊びを置けそうです。', area: rect(12, 16, 5, 3), tapPadding: 1 }
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
        deco(4, 16, 4, 3, '#73553d', '#2d241b', '一覧'),
        deco(12, 16, 5, 3, '#73553d', '#2d241b', '空き'),
        deco(21, 10, 3, 5, '#a9b8c5', '#2d241b', '広場'),
        deco(2, 15, 1, 2, '#6a4d36', '#2d241b', ''),
        deco(18, 15, 1, 2, '#6a4d36', '#2d241b', ''),
        deco(3, 3, 1, 1, '#cf9a4c', '#2d241b', ''),
        deco(6, 3, 1, 1, '#cf9a4c', '#2d241b', ''),
        deco(10, 3, 1, 1, '#cf9a4c', '#2d241b', ''),
        deco(14, 3, 1, 1, '#cf9a4c', '#2d241b', ''),
        deco(17, 3, 1, 1, '#cf9a4c', '#2d241b', ''),
        deco(8, 16, 1, 1, '#8c6b4c', '#2d241b', ''),
        deco(11, 16, 1, 1, '#8c6b4c', '#2d241b', '')
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
        rect(7, 16, 3, 2),
        rect(15, 16, 4, 2),
        rect(11, 10, 2, 2),
        rect(21, 15, 1, 1)
      ],
      blockedPoints: [
        { x: 12, y: 16 },
        { x: 14, y: 9 }
      ],
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
        deco(7, 16, 3, 2, '#7c6a57', '#2d241b', '看板'),
        deco(15, 16, 4, 2, '#7c6a57', '#2d241b', 'ベンチ'),
        deco(11, 10, 2, 2, '#8c846d', '#2d241b', '札'),
        deco(0, 10, 3, 5, '#a9b8c5', '#2d241b', '広場'),
        deco(21, 15, 1, 1, '#6f8468', '#2d241b', ''),
        deco(12, 16, 1, 1, '#6f8468', '#2d241b', ''),
        deco(14, 9, 1, 1, '#8b6f4b', '#2d241b', '')
      ]
    },

    leisure_center_map: {
      id: 'leisure_center_map',
      title: 'レジャーセンター',
      subtitle: '湯窓レジャーセンター',
      mapWidth: 24,
      mapHeight: 24,
      backgroundStyle: 'leisure',
      backgroundImagePath: 'assets/maps/grounds/leisure-center-ground.png',
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
        rect(4, 4, 5, 3),
        rect(15, 4, 5, 3),
        rect(9, 16, 6, 2),
        rect(4, 8, 1, 1),
        rect(19, 8, 1, 1),
        rect(8, 18, 1, 1),
        rect(15, 18, 1, 1)
      ],
      blockedPoints: [
        { x: 11, y: 18 },
        { x: 13, y: 18 }
      ],
      areaZones: [
        { id: 'leisure', title: '湯窓レジャーセンター', subtitle: '展示と遊びの入口', area: rect(0, 0, 24, 24) }
      ],
      triggers: [
        { id: 'leisure_counter', label: '案内カウンター', actionLabel: '調べる', type: 'inspect', text: '案内カウンター。\n\nここでは展示の見方や、この建物の使い方を案内できます。', area: rect(4, 4, 5, 3), tapPadding: 1 },
        { id: 'leisure_pickup', label: 'おすすめ棚', actionLabel: '調べる', type: 'inspect', text: 'おすすめ棚。\n\nピックアップした展示や、今おすすめしたいものを置けそうです。', area: rect(15, 4, 5, 3), tapPadding: 1 },
        { id: 'leisure_catalog', label: '展示ガイド', actionLabel: '見る', type: 'menu', target: 'leisure_catalog', text: '展示ガイド。\n\n触れるらくがきや展示を、選択肢からまとめて見られます。', area: rect(9, 16, 6, 2), tapPadding: 1 }
      ],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#4a4b55' },
        { x: 0, y: 10, w: 24, h: 5, color: '#6e6b63' },
        { x: 5, y: 5, w: 14, h: 14, color: '#5e594f' },
        { x: 10, y: 0, w: 4, h: 24, color: '#7a756a' },
        { x: 7, y: 15, w: 10, h: 5, color: '#676157' }
      ],
      decor: [
        deco(4, 4, 5, 3, '#7c756c', '#222', '案内'),
        deco(15, 4, 5, 3, '#90856d', '#222', '棚'),
        deco(9, 16, 6, 2, '#7d715e', '#222', 'ガイド'),
        deco(10, 0, 4, 3, '#a9b8c5', '#222', '広場'),
        deco(4, 8, 1, 1, '#6d846d', '#222', ''),
        deco(19, 8, 1, 1, '#6d846d', '#222', ''),
        deco(8, 18, 1, 1, '#8a806f', '#222', ''),
        deco(15, 18, 1, 1, '#8a806f', '#222', ''),
        deco(11, 18, 1, 1, '#8a806f', '#222', ''),
        deco(13, 18, 1, 1, '#8a806f', '#222', '')
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
        rect(6, 3, 12, 3),
        rect(8, 6, 8, 1),
        rect(4, 10, 3, 3),
        rect(17, 10, 3, 3),
        rect(7, 14, 1, 1),
        rect(16, 14, 1, 1)
      ],
      blockedPoints: [
        { x: 9, y: 7 }, { x: 14, y: 7 }
      ],
      areaZones: [
        { id: 'onsen', title: '温泉方面', subtitle: 'ただいま工事中', area: rect(0, 0, 24, 24) }
      ],
      triggers: [
        { id: 'onsen_notice', label: '工事看板', actionLabel: '読む', type: 'inspect', text: 'この先は温泉方面。\n\nただいま工事中です。将来、町の上側へつながります。', area: rect(8, 3, 8, 4), tapPadding: 1 }
      ],
      groundRects: [
        { x: 0, y: 0, w: 24, h: 24, color: '#cbbfa8' },
        { x: 10, y: 0, w: 4, h: 24, color: '#d8ccb5' },
        { x: 7, y: 16, w: 10, h: 8, color: '#ede1be' },
        { x: 8, y: 8, w: 8, h: 8, color: '#d4c5ab' }
      ],
      decor: [
        deco(6, 3, 12, 3, '#8f8472', '#2d241b', '工事中'),
        deco(8, 6, 8, 1, '#7f7566', '#2d241b', ''),
        deco(4, 10, 3, 3, '#768470', '#2d241b', ''),
        deco(17, 10, 3, 3, '#768470', '#2d241b', ''),
        deco(10, 21, 4, 3, '#a9b8c5', '#2d241b', '広場'),
        deco(7, 14, 1, 1, '#88745e', '#2d241b', ''),
        deco(16, 14, 1, 1, '#88745e', '#2d241b', ''),
        deco(9, 7, 1, 1, '#b89275', '#2d241b', ''),
        deco(14, 7, 1, 1, '#b89275', '#2d241b', '')
      ]
    }
  };

  window.DESTINATIONS = window.DESTINATIONS || {};

  if (!window.DESTINATIONS.tomogushi_game_board) {
    window.DESTINATIONS.tomogushi_game_board = {
      id: 'tomogushi_game_board',
      title: 'ゲーム案内屋台',
      subtitle: '灯串横丁',
      description: '灯串横丁で遊べるゲームをまとめた屋台です。',
      flavor: '屋台を毎回増やさなくても、ここから一覧で選べるようにしておきます。',
      menuTitle: '遊ぶゲームを選ぶ',
      items: [
        { workId: 'midnight-cola', label: '真夜中コーラ' },
        { workId: 'yakitori-wars', label: 'Yakitori Wars' },
        { kind: 'message', label: 'これから増えるゲーム', text: '新しいゲームは、まずこの一覧に追加していく想定です。\n\n常設屋台は看板作品だけに絞ると、横丁の管理がかなり楽になります。' },
        { kind: 'back', label: '駅前へ戻る' }
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
      menuTitle: '見たい展示を選ぶ',
      items: [
        { kind: 'message', label: '触れるらくがき一覧', text: '触れるらくがきの一覧をここから見せる想定です。\n\n今後はカテゴリ別や新着順にも広げられます。' },
        { kind: 'message', label: 'おすすめ展示', text: 'いま推したい展示や、最近追加した展示をここから案内できます。' },
        { kind: 'message', label: 'テーマ別に見る', text: 'たとえば「時計」「音」「くだらないもの」など、テーマ別の選び方にも対応しやすい構成です。' },
        { kind: 'back', label: '駅前へ戻る' }
      ]
    };
  }
})();
