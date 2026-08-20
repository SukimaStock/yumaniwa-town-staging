// ==========================================
// 湯間庭町 / 湯窓レジャーセンター 調べるコメント
// 開発モードで確定した表示名・ボタン・コメント範囲を staging に反映する。
// ==========================================
(function () {
  'use strict';

  var maps = window.TOWN_SCENE_MAPS;
  var leisure = maps && maps.leisure_center_map;
  if (!leisure) return;

  if (!Array.isArray(leisure.triggers)) leisure.triggers = [];

  function upsertTrigger(trigger) {
    for (var i = 0; i < leisure.triggers.length; i++) {
      if (leisure.triggers[i] && leisure.triggers[i].id === trigger.id) {
        leisure.triggers[i] = trigger;
        return;
      }
    }
    leisure.triggers.push(trigger);
  }

  // 旧エディタ既定IDが残っている場合だけ除去する。
  leisure.triggers = leisure.triggers.filter(function (trigger) {
    return !trigger || trigger.id !== 'new_trigger';
  });

  upsertTrigger({
    id: 'Panf',
    label: 'パンフレット',
    actionLabel: '調べる',
    area: { x: 15, y: 3, w: 2, h: 1 },
    type: 'inspect',
    target: '',
    text: '「ご自由にお持ちください」と書かれている'
  });

  upsertTrigger({
    id: 'Uketsuke',
    label: '受付端末',
    actionLabel: '調べる',
    area: { x: 8, y: 3, w: 2, h: 1 },
    type: 'inspect',
    target: '',
    text: '「湯窓レジャーセンターへようこそ」と音声が流れている'
  });

  upsertTrigger({
    id: 'Poster',
    label: '掲示板',
    actionLabel: '調べる',
    area: { x: 3, y: 3, w: 2, h: 1 },
    type: 'inspect',
    target: '',
    text: '催し物のポスターが貼られているようだ'
  });

  upsertTrigger({
    id: 'Annai',
    label: '案内板',
    actionLabel: '調べる',
    area: { x: 7, y: 16, w: 1, h: 1 },
    type: 'inspect',
    target: '',
    text: '展示ガイドはこちら→'
  });
})();
