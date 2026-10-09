(function (root) {
  'use strict';
  const parameter = (key, label, value, hint, min = 0, max = 100) => ({ key, label, value, hint, min, max, step: 1 });
  const catalog = [
    { id: 'slime', verb: '引っ張る', title: 'Slime', number: '01', version: '0.1.0', file: 'Slime.codea', source: 'https://drive.google.com/file/d/1NTziYonHtCmH2PU4MSRsGoeLqCAgDf3f/view',
      hint: '1本指でつかむ。2本指で、ゆっくり伸ばす。', pcHint: 'PCでは Shift＋ドラッグで片端を固定。', motion: '指への遅れ、35個の節、中央のたわみ、伸びるほど細くなる面。',
      difference: '原作は指を離すと自由落下します。実験室では小さな塊へ戻り、揺れが収まるように変更。雫と3本指以上の折れ線は省略しました。',
      parameters: [parameter('elasticity', '弾力', 48, '元の形へ戻ろうとする強さ'), parameter('viscosity', '粘り', 55, '指に追いつくまでのゆっくりさ'), parameter('weight', '重さ', 45, '伸ばした中央の垂れ下がり'), parameter('damping', '減衰', 55, '離したあとの揺れの収まりやすさ')] },
    { id: 'puddle', verb: '広がる', title: 'PuddleMoon', number: '02', version: '0.1.0', file: 'PuddleMoon.codea', source: 'https://drive.google.com/file/d/1a98QmyXisnetCMd5LNUmivqce5jYdFqo/view',
      hint: 'タップで波紋。なぞると、月にも余韻が残る。', pcHint: 'クリック、またはゆっくりドラッグ。', motion: '薄くなる波紋、遅れる軌跡、引かれる月と重なる光。',
      difference: '原作の円状波紋と6層の月を残しています。距離による発生に時間間隔を追加。複数指に対応し、重なりは加算描画です。流体の干渉計算はしていません。',
      parameters: [parameter('speed', '速度', 38, '波が広がる速さ'), parameter('size', '大きさ', 45, '触れたところの波紋の大きさ'), parameter('damping', '減衰', 45, '波が消えていく速さ'), parameter('interval', '発生間隔', 42, 'なぞったときの波紋と波紋の間')] },
    { id: 'firefly', verb: '集まる・逃げる', title: 'Firefly', number: '03', version: '0.1.0', file: 'Firefly.codea', source: 'https://drive.google.com/file/d/17OlvroUARcn3RHEJY3XCrunzYuv8RiRF/view',
      hint: '1本指は「あまい」。2本指は「にがい」。', pcHint: 'PCでは Shift＋ドラッグ、または「逃げる」を選択。', motion: 'ゆっくり集まる、素早く逃げる、個体差のある漂いと明滅。',
      difference: '指本数の切替を維持。原作のnoiseを滑らかな周期の組合せに変更し、引力にも影響範囲を追加。軽い粒同士の距離調整、反応の余韻を加えました。',
      parameters: [parameter('attraction', '引力', 50, 'あまい水へ集まろうとする強さ'), parameter('repulsion', '斥力', 40, 'にがい水から逃げようとする強さ'), parameter('radius', '影響範囲', 65, '指のまわりで反応する距離'), parameter('count', '粒数', 35, '漂う粒の数', 12, 120)] }
  ];
  function defaults(id) { return Object.fromEntries(catalog.find(x => x.id === id).parameters.map(p => [p.key, p.value])); }
  function normalize(id, values) {
    const entry = catalog.find(x => x.id === id);
    if (!entry) throw new Error('Unknown experiment');
    return Object.fromEntries(entry.parameters.map(p => [p.key, typeof values?.[p.key] === 'number' && Number.isFinite(values[p.key]) ? Math.round(Math.max(p.min, Math.min(p.max, values[p.key]))) : p.value]));
  }
  const api = { catalog, defaults, normalize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotionCatalog = api;
})(typeof window !== 'undefined' ? window : globalThis);
