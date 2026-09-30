// Junkissa Dive Web Port — Final integrated build
// Codea Lite target: setup(), draw(), touched(touch)
// Goal: improve motif recognition while keeping gameplay and hit logic intact.

const JD = {};
const JD_WEB_PORT_VERSION = "Buddy + Prologue No Dot v1";

/*
 * Plausible の読込失敗や広告ブロックがあっても、
 * ゲーム本体へ例外を伝播させない共通計測入口。
 *
 * コンソール確認が必要な時だけ、起動後に
 * window.__JUNKISSA_DIVE_ANALYTICS_DEBUG__ = true
 * を設定する。
 */
function trackJunkissaDiveEvent(
  name,
  props
) {
  try {
    if (
      typeof window === "undefined" ||
      typeof window.plausible !== "function"
    ) {
      if (
        typeof window !== "undefined" &&
        window.__JUNKISSA_DIVE_ANALYTICS_DEBUG__
      ) {
        console.info(
          "[Junkissa Dive analytics skipped]",
          name,
          props || {}
        );
      }

      return false;
    }

    const options =
      props &&
      typeof props === "object"
        ? {
            props: props
          }
        : undefined;

    window.plausible(
      name,
      options
    );

    if (
      window.__JUNKISSA_DIVE_ANALYTICS_DEBUG__
    ) {
      console.info(
        "[Junkissa Dive analytics sent]",
        name,
        props || {}
      );
    }

    return true;
  } catch (error) {
    if (
      typeof window !== "undefined" &&
      window.__JUNKISSA_DIVE_ANALYTICS_DEBUG__
    ) {
      console.warn(
        "[Junkissa Dive analytics error]",
        name,
        error
      );
    }

    return false;
  }
}

// 端末内蔵フォントへ依存せず、PCとスマートフォンで同じ字形を使う。
// 真夜中コーラと同じ三層構成にそろえ、役割ごとの個性を保つ。
// ・看板、商品名、店名：昭和の印刷物になじむ Kaisei Decol
// ・説明、操作、通常UI：読みやすい Zen Kaku Gothic New
// ・判定語、素材名、伝票英数字：活字らしい Courier Prime
const JD_FONT_TITLE =
  '"Kaisei Decol", ' +
  '"Yu Mincho", ' +
  '"Hiragino Mincho ProN", ' +
  'serif';

const JD_FONT_PRIMARY =
  '"Zen Kaku Gothic New", ' +
  '"Hiragino Sans", ' +
  '"Noto Sans JP", ' +
  'sans-serif';

const JD_FONT_RECEIPT =
  '"Courier Prime", ' +
  '"Courier New", ' +
  'Courier, ' +
  'monospace';

const STATE_TITLE = 0;
const STATE_PLAY = 1;
const STATE_RECEIPT = 2;

// 完成ポスターは、店内フォーカス、組み立て、静止、撤収、
// レシート用遠景へのカメラ移動を独立した状態で管理する。
const STATE_POSTER_TRANSITION = 3;
const STATE_POSTER_REVEAL = 4;
const STATE_POSTER_HOLD = 5;
const STATE_POSTER_PEEL = 6;
const STATE_POSTER_CAFE_HOLD = 7;

// 端末側の拡大・丸め・セーフ領域による端欠けを吸収する描画余白。
const JD_SCREEN_BLEED = 36;

// デバッグ時と、結果自体がない場合のフォールバックに使う確認用商品。
// 通常プレイのポスター種別は JD.posterItem によって決まる。
const JD_POSTER_PREVIEW_KIND = "coffee";

// ポスタータイトルは一文字ずつ固定字送りで描く。
// 幅計算と描画で同じ値を共有し、端末固有の未確認APIへ依存しない。
const JD_POSTER_TITLE_TRACKING = 4.2;
const JD_POSTER_TITLE_SCALE_X = 1.05;

// ポスター内の小見出しと店名は、スマートフォンでも印刷物の
// 階層が一目で読める大きさに固定する。組み立て・静止・撤収で共有。
const JD_POSTER_SPECIAL_SIZE_JP = 10.5;
const JD_POSTER_SPECIAL_SIZE_EN = 10.5;
const JD_POSTER_SPECIAL_ALPHA = 205;
const JD_POSTER_BRAND_SIZE = 10.5;
const JD_POSTER_BRAND_ALPHA = 205;

// 下部の情報面は、モック画像寄りのやわらかな生成りへ寄せる。
// タイトル文字のクリーム色とは分け、紙らしい少し落ち着いた色にする。
const JD_POSTER_INFO_PAPER = [235, 225, 205];

const JD_POSTER_DESCRIPTION_SIZE_JP = 11;
const JD_POSTER_DESCRIPTION_SIZE_EN_MAX = 9.5;
const JD_POSTER_DESCRIPTION_SIZE_EN_MIN = 8.5;
const JD_POSTER_DESCRIPTION_MAX_WIDTH = 224;
const JD_POSTER_VIEW_RECEIPT_SIZE_JP = 15;
const JD_POSTER_VIEW_RECEIPT_SIZE_EN = 14;

// 商品名は日本語を主役に固定し、その下へ英語名を小さく添える。
const JD_POSTER_SUBTITLE_SIZE_MAX = 14.5;
const JD_POSTER_SUBTITLE_SIZE_MIN = 11;
const JD_POSTER_SUBTITLE_MAX_WIDTH = 286;
const JD_POSTER_SUBTITLE_Y = 497;

// 外側の太線と内側の細線を組み合わせ、昭和の印刷ポスターらしい
// 二重罫にする。演出中も同じ比率を保つ。
const JD_POSTER_FRAME_OUTER_WEIGHT = 2.4;
const JD_POSTER_FRAME_INNER_WEIGHT = 0.75;

const PHASE_OPENING_MONOLOGUE = "OPENING_MONOLOGUE";
const PHASE_SHIFT_START = "SHIFT_START";
const PHASE_FORTUNE = "FORTUNE";

const JD_OPENING_MONOLOGUE_FADE_IN = 0.48;
const JD_OPENING_MONOLOGUE_FADE_OUT = 0.42;
const JD_OPENING_MONOLOGUE_DURATIONS = [8.0, 8.0, 3.2, 4.8, 3.2];
const PHASE_AIM = "AIM";
const PHASE_AIMING = "AIMING";
const PHASE_FLYING = "FLYING";
const PHASE_RESULT = "RESULT";

function setup() {
  JD.LOGICAL_W = 360;
  JD.LOGICAL_H = 640;

  jdInstallWebFonts();
  jdInitText();
  jdInitVisualTheme();
  jdReadWebOptions();
  jdInstallRuntimeErrorHandlers();
  jdResetAll();

  // 正式ビジュアルはポスターカラー版に固定。
  // 端末に保存されている旧スタイル設定は使用しない。
  JD.visualStyle =
    "poster";

  // アプリを開いて最初の1投目だけ表示
  JD.tutorialSeen = false;
  JD.tutorialActive = false;
  JD.tutorialTimer = 0;
  JD.tutorialDuration = 2.85;
}



function draw() {
  let pushed = false;
  let logicalClipContext = null;

  try {
    // 完成ポスター静止中は、論理画面の外側も朱色で埋める。
    // 端末の縦横比差で生じる余白が、黒い枠として戻るのを防ぐ。
    if (
      JD.state === STATE_POSTER_HOLD
    ) {
      const posterPalette = jdGetPosterPalette(jdGetPosterItem());

      background(
        posterPalette.bg[0],
        posterPalette.bg[1],
        posterPalette.bg[2]
      );

    } else if (
      JD.state === STATE_POSTER_PEEL
    ) {
      const dismissDuration =
        Number.isFinite(JD.posterDismissDuration)
          ? Math.max(0.001, JD.posterDismissDuration)
          : 1.26;

      const dismissRaw =
        jdClamp(
          (JD.posterDismissTimer || 0) /
            dismissDuration,
          0,
          1
        );

      const outerT =
        jdClamp(
          (dismissRaw - 0.52) / 0.42,
          0,
          1
        );

      const outerEase =
        outerT * outerT *
        (3 - 2 * outerT);

      const posterPalette = jdGetPosterPalette(jdGetPosterItem());

      background(
        jdPosterLerp(posterPalette.bg[0], 27, outerEase),
        jdPosterLerp(posterPalette.bg[1], 20, outerEase),
        jdPosterLerp(posterPalette.bg[2], 18, outerEase)
      );

    } else {
      background(27, 20, 18);
    }

    jdUpdateScale();

    // 背景や軌道はカメラ用に論理画面より広く描いている。
    // その余白を削らず、最終表示だけを360×640へ切り抜くことで、
    // PCの左右余白へ店内や投擲ガイドが漏れないようにする。
    logicalClipContext =
      jdBeginLogicalViewportClip();

    pushMatrix();
    pushed = true;

    translate(JD.offsetX, JD.offsetY);
    scale(JD.scale);

    if (
      JD.shake > 0
    ) {
      const duration =
        Math.max(
          0.001,
          JD.shakeDuration ||
          JD.shake
        );

      const progress =
        jdClamp(
          JD.shake /
          duration,
          0,
          1
        );

      // 最初だけ強く、すぐ静かになる
      const strength =
        (
          JD.shakeStrength ||
          3
        ) *
        progress *
        progress;

      const shakeX =
        (
          Math.random() *
          2 -
          1
        ) *
        strength;

      // 縦揺れを少し弱くし、
      // 視認性を保ちながら衝撃だけ伝える
      const shakeY =
        (
          Math.random() *
          2 -
          1
        ) *
        strength *
        0.68;

      translate(
        shakeX,
        shakeY
      );

      JD.shake =
        Math.max(
          0,
          JD.shake -
          DeltaTime
        );
    }

    jdAppUpdate(DeltaTime);
    jdAppDraw();

    popMatrix();
    pushed = false;

    jdEndLogicalViewportClip(
      logicalClipContext
    );
    logicalClipContext = null;

    // 保存ボタンはキャンバスの外に置き、書き出すPNGには含めない。
    jdSyncPosterSaveButton();
  } catch (error) {
    if (pushed) {
      try {
        popMatrix();
      } catch (_popError) {
      }
    }

    jdEndLogicalViewportClip(
      logicalClipContext
    );
    logicalClipContext = null;

    jdShowRuntimeError(error, "draw");
  }
}

function jdBeginLogicalViewportClip() {
  if (
    typeof document === "undefined"
  ) {
    return null;
  }

  const canvas =
    jdFindGameCanvas();

  if (
    !canvas ||
    typeof canvas.getContext !== "function"
  ) {
    return null;
  }

  const context =
    canvas.getContext("2d");

  if (!context) {
    return null;
  }

  try {
    context.save();
    context.beginPath();
    context.rect(
      JD.offsetX,
      JD.offsetY,
      JD.LOGICAL_W * JD.scale,
      JD.LOGICAL_H * JD.scale
    );
    context.clip();
    return context;

  } catch (_error) {
    try {
      context.restore();
    } catch (_restoreError) {
    }

    return null;
  }
}

function jdEndLogicalViewportClip(
  context
) {
  if (!context) return;

  try {
    context.restore();
  } catch (_error) {
  }
}

function jdInstallRuntimeErrorHandlers() {
  if (JD.runtimeErrorHandlersInstalled) return;
  JD.runtimeErrorHandlersInstalled = true;

  if (typeof window === "undefined") return;

  window.addEventListener("error", function(event) {
    const message = event && event.error ? event.error : event.message;
    jdShowRuntimeError(message, "window.error");
  });

  window.addEventListener("unhandledrejection", function(event) {
    const reason = event && event.reason ? event.reason : "Unhandled Promise rejection";
    jdShowRuntimeError(reason, "promise");
  });
}

function jdShowRuntimeError(error, where) {
  const raw = error && error.stack ? error.stack : String(error);
  const message = "[" + where + "]\n" + raw;

  JD.runtimeErrorMessage = message;

  try {
    console.error(message);
  } catch (_consoleError) {
  }

  if (typeof document === "undefined") return;

  let box = document.getElementById("jd-runtime-error");
  if (!box) {
    box = document.createElement("div");
    box.id = "jd-runtime-error";
    box.style.position = "fixed";
    box.style.left = "10px";
    box.style.right = "10px";
    box.style.bottom = "10px";
    box.style.zIndex = "999999";
    box.style.maxHeight = "42vh";
    box.style.overflow = "auto";
    box.style.padding = "10px";
    box.style.borderRadius = "8px";
    box.style.background = "rgba(80, 0, 0, 0.92)";
    box.style.color = "#fff4dc";
    box.style.font = "12px monospace";
    box.style.whiteSpace = "pre-wrap";
    box.style.boxShadow = "0 4px 18px rgba(0,0,0,0.45)";
    document.body.appendChild(box);
  }

  box.textContent = "JUNKISSA ERROR\n" + message;
}



function touched(touch) {
  if (!jdAcceptPrimaryPointer(touch)) return;

  try {
    try {
      if (!JD.scale) {
        jdUpdateScale();
      }

      const p =
        jdToLogical(touch);

      // iOS Safariではユーザー操作内で
      // AudioContextを開始する必要がある
      if (
        touch.state === BEGAN ||
        touch.state === ENDED
      ) {
        jdEnsureAudio();
      }

      // 画面左上のJP/EN切り替えは、各画面固有のタップ処理より先に受ける。
      // タイトル開始・ポスター撤収・再シフトへ誤って流れないようにする。
      if (
        touch.state === ENDED &&
        jdLanguageToggleVisible() &&
        jdLanguageToggleHit(p.x, p.y)
      ) {
        if (jdHandleLanguageToggleTouch(p.x, p.y)) {
          jdPlaySound("route_switch", {
            volume: 0.20,
            playbackRate:
              JD.lang === "en"
                ? 1.05
                : 0.96
          });
        }
        return;
      }

      // タイトル画面
      if (
        JD.state ===
        STATE_TITLE
      ) {
        if (
          touch.state ===
          ENDED &&
          !(JD.titleExitTimer > 0)
        ) {
          // 表示スタイル設定は廃止。
          // ポスターカラー版を正式スタイルとして固定する。

          // 開店ボタン
          // 看板の点灯 → 文字の消灯 → 店内への暗転までを
          // 一続きで見せるため、タイトル専用の長さへ固定する。
          JD.titleExitDuration =
            1.18;

          JD.titleExitTimer =
            JD.titleExitDuration;

          jdPlaySound("open");
        }

        return;
      }

      // 完成ポスターをタップしたら、直接レシートへ飛ばさず
      // 撤収専用ステートへ入り、完成ポスターから店内へ戻す。
      if (
        JD.state ===
        STATE_POSTER_HOLD
      ) {
        // DOM上の保存ボタンを押したタッチが、キャンバスの撤収操作へ
        // 同時に届く環境だけを短く吸収する。
        if (
          JD.posterSaveInputUntil > jdNowMs()
        ) {
          return;
        }

        if (
          touch.state ===
          ENDED
        ) {
          JD.posterPhaseName =
            "DISMISS";

          JD.posterDismissTimer = 0;

          // 完成ポスターを外す瞬間だけ、紙の擦れる音を一度鳴らす。
          // タッチ処理内なので、iOSでもAudioContext開始後に再生できる。
          if (!JD.posterDismissSoundPlayed) {
            JD.posterDismissSoundPlayed = true;
            jdPlaySound("poster_turn");
          }

          JD.state =
            STATE_POSTER_PEEL;
        }

        return;
      }

      // 撤収中は入力を受け付けない。
      if (
        JD.state ===
        STATE_POSTER_PEEL
      ) {
        return;
      }

      // レシート画面
      if (
        JD.state ===
        STATE_RECEIPT
      ) {
        if (
          touch.state === ENDED &&
          jdReceiptReady() &&
          p.x >= 70 &&
          p.x <= 290 &&
          p.y >= 70 &&
          p.y <= 114
        ) {
          jdStartPlay();
        }

        return;
      }

      if (
        JD.state !==
        STATE_PLAY
      ) {
        return;
      }

      // 初回プレイ時のモノローグ。
      if (
        JD.gamePhase ===
        PHASE_OPENING_MONOLOGUE
      ) {
        if (
          touch.state ===
          ENDED
        ) {
          if (
            p.x >=
              JD.LOGICAL_W - 92 &&
            p.y <= 74
          ) {
            jdSkipOpeningMonologue();

          } else {
            jdTapOpeningMonologue();
          }
        }

        return;
      }

      // 開店導入
      if (
        JD.gamePhase ===
        PHASE_SHIFT_START
      ) {
        if (
          touch.state ===
          ENDED
        ) {
          const duration =
            Number.isFinite(
              JD.shiftStartDuration
            )
              ? JD.shiftStartDuration
              : 7.4;

          const elapsed =
            duration -
            (
              Number.isFinite(
                JD.shiftStartTimer
              )
                ? JD.shiftStartTimer
                : duration
            );

          let nextElapsed;

          if (
            elapsed < 1.7
          ) {
            nextElapsed = 1.7;

          } else if (
            elapsed < 5.2
          ) {
            nextElapsed = 5.2;

          } else {
            nextElapsed =
              duration;
          }

          JD.shiftStartTimer =
            Math.max(
              0,
              duration -
              nextElapsed
            );
        }

        return;
      }

      if (
        jdDebugButtonHit(
          p.x,
          p.y
        ) &&
        touch.state ===
        ENDED
      ) {
        JD.debugMode =
          !JD.debugMode;

        return;
      }

      if (
        JD.gamePhase ===
        PHASE_FORTUNE
      ) {
        return;
      }

      // チュートリアルを待たずに触ったプレイヤーは、
      // そのタッチからすぐ通常操作へ入れる。
      if (
        JD.tutorialActive &&
        touch.state === BEGAN
      ) {
        jdStopAimTutorial(true);
      }

      if (
        !jdCanAcceptAimTouch()
      ) {
        return;
      }

      if (
        touch.state ===
        BEGAN
      ) {
        jdBeginAimTouch(p);

      } else if (
        touch.state ===
        MOVING
      ) {
        jdUpdateAimTouch(p);

      } else if (
        touch.state ===
          ENDED ||
        touch.state ===
          CANCELLED
      ) {
        jdReleaseAimTouch(
          p,
          touch.state ===
            CANCELLED
        );
      }

    } finally {
      jdClearPrimaryPointerIfDone(
        touch
      );
    }

  } catch (error) {
    jdShowRuntimeError(
      error,
      "touched"
    );
  }
}



function jdInitVisualTheme() {
  JD.visual = {
    // 画面外・夜の空気
    page: color(27, 20, 18),

    // ポスター・タイトル背景
    // 明るいベージュから、少し古びた紙色へ
    posterBg: color(224, 199, 158),
    posterBg2: color(203, 163, 113),

    // 店内壁
    // 新しいカフェの白壁ではなく、照明で飴色に見える壁
    wall: color(210, 178, 132),
    wallShade: color(160, 112, 73),
    wallLine: color(111, 66, 45),

    // カウンター
    // 鮮やかな緑を抑え、夜の深いモスグリーンへ
    tableTop: color(46, 77, 59),
    tableLip: color(25, 47, 39),
    tableFront: color(31, 58, 47),
    tableStripe: color(197, 169, 125),

    // 木材
    // 茶色を少し赤く、重くする
    wood: color(112, 59, 39),
    woodDark: color(57, 31, 27),

    // クリーム・紙類
    // 真っ白を避けて、生成りと古紙へ
    cream: color(239, 222, 184),
    creamWarm: color(246, 224, 180),
    paper: color(235, 219, 184),

    // 文字
    ink: color(48, 34, 29),

    // 飲食物
    coffee: color(52, 27, 21),
    coffeeLight: color(89, 50, 34),

    // メロンソーダは鮮やかさを少し抑え、
    // 暗い店内でも光って見える程度に残す
    soda: color(77, 181, 117),
    sodaLight: color(159, 222, 170),
    sodaDeep: color(38, 127, 81),

    cakeCream: color(245, 229, 203),
    cakeSponge: color(214, 164, 82),
    cakePink: color(207, 105, 119),

    // 赤は昭和ポスターの朱色寄り
    red: color(177, 48, 43),
    redDeep: color(111, 33, 34),

    // 影は真っ黒ではなく、赤みのある濃茶
    shadow: color(29, 18, 16),

    // UI
    uiPanel: color(38, 27, 24),
    uiText: color(241, 224, 188),

    // 真鍮
    gold: color(207, 166, 83),

    // ガラス・氷
    // 青白さを減らし、店内照明になじませる
    glass: color(211, 229, 210),
    glassEdge: color(227, 237, 218),
    ice: color(181, 220, 190),

    plate: color(232, 216, 179),

    // ハイライトも真っ白ではなく暖色
    highlight: color(246, 230, 190)
  };
}

function jdC(name) {
  if (
    !JD.visual
  ) {
    jdInitVisualTheme();
  }

  const base =
    JD.visual[name] ||
    color(
      255,
      255,
      255
    );

  const styled =
    jdStyleColor(
      name,
      base
    );

  // フルーツとアクセント用の赤だけ、
  // ポスターの印刷インクらしく少し鮮やかにする。
  if (
    name === "red"
  ) {
    return color(
      jdClamp(
        styled.r * 1.08 + 5,
        0,
        255
      ),

      jdClamp(
        styled.g * 0.96,
        0,
        255
      ),

      jdClamp(
        styled.b * 0.95,
        0,
        255
      ),

      styled.a === undefined
        ? 255
        : styled.a
    );
  }

  if (
    name === "redDeep"
  ) {
    return color(
      jdClamp(
        styled.r * 1.07 + 3,
        0,
        255
      ),

      jdClamp(
        styled.g * 0.97,
        0,
        255
      ),

      jdClamp(
        styled.b * 0.97,
        0,
        255
      ),

      styled.a === undefined
        ? 255
        : styled.a
    );
  }

  return styled;
}





function jdFill(
  name,
  alpha = null
) {
  const c =
    jdC(name);

  const baseAlpha =
    alpha === null
      ? (
          c.a === undefined
            ? 255
            : c.a
        )
      : alpha;

  fill(
    c.r,
    c.g,
    c.b,
    jdStyleAlpha(
      name,
      baseAlpha
    )
  );
}


function jdStroke(
  name,
  alpha = null
) {
  const c =
    jdC(name);

  const baseAlpha =
    alpha === null
      ? (
          c.a === undefined
            ? 255
            : c.a
        )
      : alpha;

  stroke(
    c.r,
    c.g,
    c.b,
    jdStyleAlpha(
      name,
      baseAlpha
    )
  );
}











function jdIsPosterStyle() {
  return true;
}
















function jdPosterAlpha(
  normalAlpha,
  posterAlpha
) {
  return jdIsPosterStyle()
    ? posterAlpha
    : normalAlpha;
}


function jdDrawPosterPrintFinish() {
  if (
    !jdIsPosterStyle()
  ) {
    return;
  }

  rectMode(CORNER);
  ellipseMode(CENTER);
  noStroke();

  // ごく薄い暖色の刷り重ね。
  // 黄色いフィルターに見えない強さへ抑える。
  fill(
    125,
    67,
    48,
    4
  );

  rect(
    0,
    0,
    JD.LOGICAL_W,
    JD.LOGICAL_H
  );

  // 印刷筋は動かさず、
  // 一枚の紙として固定する。
  for (
    let y = 8;
    y < JD.LOGICAL_H;
    y += 31
  ) {
    fill(
      255,
      239,
      205,
      3
    );

    rect(
      0,
      y,
      JD.LOGICAL_W,
      1
    );
  }

  // 印刷物らしい登録点はタイトル画面だけ。
  if (
    JD.state ===
    STATE_TITLE
  ) {
    jdFill(
      "redDeep",
      42
    );

    ellipse(
      13,
      13,
      3,
      3
    );

    ellipse(
      JD.LOGICAL_W - 13,
      13,
      3,
      3
    );

    ellipse(
      13,
      JD.LOGICAL_H - 13,
      3,
      3
    );

    ellipse(
      JD.LOGICAL_W - 13,
      JD.LOGICAL_H - 13,
      3,
      3
    );
  }

  noStroke();
  rectMode(CORNER);
}









function jdStyleMixColor(
  source,
  target,
  amount
) {
  const t =
    jdClamp(
      amount,
      0,
      1
    );

  return {
    r:
      source.r +
      (
        target.r -
        source.r
      ) * t,

    g:
      source.g +
      (
        target.g -
        source.g
      ) * t,

    b:
      source.b +
      (
        target.b -
        source.b
      ) * t,

    a:
      source.a === undefined
        ? 255
        : source.a
  };
}

function jdStyleColor(
  name,
  source
) {
  const style =
    JD.visualStyle ||
    "current";

  if (
    style === "current"
  ) {
    return source;
  }

  // --------------------------------
  // 極細線画
  // 紙色へ少し寄せ、コントラストを穏やかに
  // --------------------------------

  if (
    style === "fine"
  ) {
    const paper = {
      r: 239,
      g: 222,
      b: 188,
      a: 255
    };

    if (
      name === "ink" ||
      name === "woodDark" ||
      name === "wallLine"
    ) {
      return jdStyleMixColor(
        source,
        paper,
        0.20
      );
    }

    if (
      name === "shadow" ||
      name === "uiPanel"
    ) {
      return jdStyleMixColor(
        source,
        paper,
        0.30
      );
    }

    return jdStyleMixColor(
      source,
      paper,
      0.08
    );
  }

  // --------------------------------
  // 極太線画
  // 暗部を締め、色面を少し強くする
  // --------------------------------

  if (
    style === "bold"
  ) {
    const dark = {
      r: 30,
      g: 20,
      b: 18,
      a: 255
    };

    if (
      name === "ink" ||
      name === "shadow" ||
      name === "woodDark" ||
      name === "wallLine" ||
      name === "tableLip"
    ) {
      return jdStyleMixColor(
        source,
        dark,
        0.30
      );
    }

    return {
      r:
        jdClamp(
          (
            source.r -
            128
          ) *
          1.10 +
          128,
          0,
          255
        ),

      g:
        jdClamp(
          (
            source.g -
            128
          ) *
          1.10 +
          128,
          0,
          255
        ),

      b:
        jdClamp(
          (
            source.b -
            128
          ) *
          1.10 +
          128,
          0,
          255
        ),

      a:
        source.a === undefined
          ? 255
          : source.a
    };
  }

  // --------------------------------
  // ポスターカラー
  // 中間色を整理して、面の差を明確にする
  // --------------------------------

  if (
    style === "poster"
  ) {
    // 昭和の喫茶店広告を意識した、
    // 少数の強い色面へ整理する。
    const posterPalette = {
      page: {
        r: 43,
        g: 30,
        b: 26,
        a: 255
      },

      posterBg: {
        r: 220,
        g: 193,
        b: 151,
        a: 255
      },

      posterBg2: {
        r: 185,
        g: 143,
        b: 102,
        a: 255
      },

      // 黄土色ではなく、少し灰色を含む古い漆喰壁
      wall: {
        r: 215,
        g: 188,
        b: 149,
        a: 255
      },

      wallShade: {
        r: 187,
        g: 151,
        b: 112,
        a: 255
      },

      wallLine: {
        r: 125,
        g: 78,
        b: 59,
        a: 255
      },

      // 少し青みを含む、夜の深緑
      tableTop: {
        r: 43,
        g: 76,
        b: 62,
        a: 255
      },

      tableFront: {
        r: 30,
        g: 62,
        b: 52,
        a: 255
      },

      tableLip: {
        r: 24,
        g: 45,
        b: 40,
        a: 255
      },

      tableStripe: {
        r: 205,
        g: 179,
        b: 137,
        a: 255
      },

      wood: {
        r: 133,
        g: 64,
        b: 42,
        a: 255
      },

      woodDark: {
        r: 75,
        g: 35,
        b: 31,
        a: 255
      },

      // 壁より明るくし、紙UIを明確に分離
      paper: {
        r: 240,
        g: 225,
        b: 193,
        a: 255
      },

      cream: {
        r: 243,
        g: 229,
        b: 199,
        a: 255
      },

      creamWarm: {
        r: 247,
        g: 232,
        b: 199,
        a: 255
      },

      ink: {
        r: 52,
        g: 34,
        b: 29,
        a: 255
      },

      coffee: {
        r: 59,
        g: 29,
        b: 22,
        a: 255
      },

      coffeeLight: {
        r: 95,
        g: 48,
        b: 31,
        a: 255
      },

      soda: {
        r: 61,
        g: 174,
        b: 105,
        a: 255
      },

      sodaLight: {
        r: 156,
        g: 216,
        b: 145,
        a: 255
      },

      sodaDeep: {
        r: 32,
        g: 113,
        b: 70,
        a: 255
      },

      cakeCream: {
        r: 246,
        g: 229,
        b: 199,
        a: 255
      },

      cakeSponge: {
        r: 205,
        g: 151,
        b: 78,
        a: 255
      },

      cakePink: {
        r: 205,
        g: 83,
        b: 101,
        a: 255
      },

      red: {
        r: 190,
        g: 45,
        b: 39,
        a: 255
      },

      redDeep: {
        r: 119,
        g: 30,
        b: 32,
        a: 255
      },

      shadow: {
        r: 70,
        g: 42,
        b: 34,
        a: 255
      },

      uiPanel: {
        r: 57,
        g: 39,
        b: 32,
        a: 255
      },

      uiText: {
        r: 246,
        g: 221,
        b: 169,
        a: 255
      },

      gold: {
        r: 211,
        g: 158,
        b: 59,
        a: 255
      },

      glass: {
        r: 187,
        g: 215,
        b: 195,
        a: 255
      },

      glassEdge: {
        r: 224,
        g: 233,
        b: 213,
        a: 255
      },

      ice: {
        r: 166,
        g: 207,
        b: 184,
        a: 255
      },

      plate: {
        r: 240,
        g: 225,
        b: 194,
        a: 255
      },

      // 黄色い光ではなく乳白色の照明
      highlight: {
        r: 255,
        g: 244,
        b: 218,
        a: 255
      }
    };

    if (
      posterPalette[name]
    ) {
      return posterPalette[name];
    }

    return source;
  }

  return source;
}





function jdStyleAlpha(
  name,
  alpha
) {
  const style =
    JD.visualStyle ||
    "current";

  let result =
    alpha === null ||
    alpha === undefined
      ? 255
      : alpha;

  if (
    style === "fine"
  ) {
    if (
      name === "shadow"
    ) {
      result *= 0.025;

    } else if (
      name === "highlight"
    ) {
      result *= 0.18;

    } else if (
      name === "glass"
    ) {
      result *= 0.56;

    } else if (
      name === "glassEdge"
    ) {
      result *= 0.68;

    } else if (
      name === "wallShade"
    ) {
      result *= 0.32;

    } else if (
      name === "tableFront" ||
      name === "tableTop"
    ) {
      result *= 0.76;

    } else if (
      name === "woodDark" ||
      name === "wallLine" ||
      name === "ink" ||
      name === "redDeep"
    ) {
      result *= 0.94;

    } else {
      result *= 0.84;
    }

  } else if (
    style === "bold"
  ) {
    if (
      name === "shadow"
    ) {
      result *= 1.20;

    } else if (
      name === "ink" ||
      name === "wallLine" ||
      name === "woodDark"
    ) {
      result *= 1.10;
    }

  } else if (
    style === "poster"
  ) {
    if (
      name === "shadow"
    ) {
      result *= 0.03;

    } else if (
      name === "highlight"
    ) {
      result *= 0.20;

    } else if (
      name === "wallLine"
    ) {
      result *= 0.48;

    } else if (
      name === "woodDark"
    ) {
      result *= 0.72;

    } else if (
      name === "glassEdge"
    ) {
      result *= 0.42;
    }
  }

  return jdClamp(
    result,
    0,
    255
  );
}


















// ポスター版の色取得は、ファイル前半にある正式なjdCへ統一。
function jdInstallWebFonts() {
  JD.webFontsReady = false;

  if (
    typeof document === "undefined" ||
    !document.head
  ) {
    return;
  }

  const stylesheetId =
    "jd-junkissa-webfonts";
  const fontHref =
    "https://fonts.googleapis.com/css2" +
    "?family=Kaisei+Decol:wght@400;500;700" +
    "&family=Courier+Prime:wght@400;700" +
    "&family=Zen+Kaku+Gothic+New:wght@400;500;700" +
    "&display=block";

  // Canvasは読み込み前の代替書体で一度描かれると、その字形が一瞬見える。
  // 真夜中コーラと同じく、三書体の準備が終わるまでCanvasを隠しておく。
  const revealCanvas =
    jdStartWebFontGate();

  const warmFonts = () => {
    if (
      !document.fonts ||
      typeof document.fonts.load !== "function"
    ) {
      revealCanvas();
      return;
    }

    Promise.all([
      document.fonts.load(
        '400 16px "Kaisei Decol"',
        "純喫茶 ダイヴ"
      ),
      document.fonts.load(
        '500 16px "Kaisei Decol"',
        "メロンソーダ"
      ),
      document.fonts.load(
        '700 16px "Kaisei Decol"',
        "ショートケーキ"
      ),
      document.fonts.load(
        '400 16px "Zen Kaku Gothic New"',
        "本日のご注文"
      ),
      document.fonts.load(
        '500 16px "Zen Kaku Gothic New"',
        "あと一回"
      ),
      document.fonts.load(
        '700 16px "Zen Kaku Gothic New"',
        "▶ レシートを見る ◀"
      ),
      document.fonts.load(
        '400 16px "Courier Prime"',
        "CHERRY SUGAR 0123456789"
      ),
      document.fonts.load(
        '700 16px "Courier Prime"',
        "DIVE NOKKARI KANTSU TOBIDASHI"
      )
    ]).then(() => {
      JD.webFontsReady = true;
      // SafariのCanvas描画キャッシュへ一拍だけ渡してから表示する。
      setTimeout(revealCanvas, 32);
    }).catch(() => {
      // 読み込みに失敗しても、下記の端末フォントへ安全に戻す。
      JD.webFontsReady = false;
      revealCanvas();
    });
  };

  const existingStylesheet =
    document.getElementById(stylesheetId);

  if (existingStylesheet) {
    const existingHref =
      String(existingStylesheet.href || "");

    if (existingHref !== fontHref) {
      existingStylesheet.addEventListener(
        "load",
        warmFonts,
        { once: true }
      );
      existingStylesheet.addEventListener(
        "error",
        revealCanvas,
        { once: true }
      );
      existingStylesheet.href = fontHref;
    } else {
      warmFonts();
    }

    return;
  }

  const preconnectApi =
    document.createElement("link");
  preconnectApi.rel = "preconnect";
  preconnectApi.href =
    "https://fonts.googleapis.com";

  const preconnectStatic =
    document.createElement("link");
  preconnectStatic.rel = "preconnect";
  preconnectStatic.href =
    "https://fonts.gstatic.com";
  preconnectStatic.crossOrigin =
    "anonymous";

  const stylesheet =
    document.createElement("link");
  stylesheet.id = stylesheetId;
  stylesheet.rel = "stylesheet";
  stylesheet.href = fontHref;
  stylesheet.addEventListener(
    "load",
    warmFonts,
    { once: true }
  );
  stylesheet.addEventListener(
    "error",
    revealCanvas,
    { once: true }
  );

  document.head.appendChild(
    preconnectApi
  );
  document.head.appendChild(
    preconnectStatic
  );
  document.head.appendChild(
    stylesheet
  );
}

function jdFontGateCanvas() {
  if (
    typeof CodeaLite !== "undefined" &&
    CodeaLite.state &&
    CodeaLite.state.ctx &&
    CodeaLite.state.ctx.canvas
  ) {
    return CodeaLite.state.ctx.canvas;
  }

  return jdFindGameCanvas();
}

function jdStartWebFontGate() {
  const root =
    typeof globalThis !== "undefined"
      ? globalThis
      : (
          typeof window !== "undefined"
            ? window
            : {}
        );

  if (root.__junkissaDiveFontGateReveal) {
    return root.__junkissaDiveFontGateReveal;
  }

  if (typeof document === "undefined") {
    return function() {};
  }

  const canvas = jdFontGateCanvas();
  if (!canvas || !canvas.style) {
    return function() {};
  }

  const body = document.body;
  const documentRoot = document.documentElement;

  if (body) {
    body.style.backgroundColor = "rgb(27, 20, 18)";
  }

  if (documentRoot) {
    documentRoot.style.backgroundColor = "rgb(27, 20, 18)";
  }

  const previousPointerEvents =
    canvas.style.pointerEvents || "auto";

  canvas.style.transition = "none";
  canvas.style.opacity = "0";
  canvas.style.pointerEvents = "none";

  // opacity:0を先に確定し、実フォントがそろった時だけフェードインする。
  void canvas.offsetWidth;
  canvas.style.transition = "opacity 0.26s ease";

  let revealed = false;
  const startedAt = Date.now();

  const revealCanvas = function() {
    if (revealed) return;
    revealed = true;

    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, 80 - elapsed);

    setTimeout(function() {
      const show = function() {
        canvas.style.opacity = "1";
        canvas.style.pointerEvents = previousPointerEvents;
      };

      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(show);
      } else {
        show();
      }
    }, remaining);
  };

  root.__junkissaDiveFontGateReveal = revealCanvas;

  // 回線不調でもタイトル画面を閉じたままにしない。
  setTimeout(revealCanvas, 3200);

  return revealCanvas;
}

function jdApplyTextWeight(
  weight = "regular"
) {
  if (
    typeof textStyle !== "function"
  ) {
    return;
  }

  const isBold =
    weight === "bold" ||
    weight === "black";

  const styleValue = isBold
    ? (
        typeof BOLD !== "undefined"
          ? BOLD
          : "bold"
      )
    : (
        typeof NORMAL !== "undefined"
          ? NORMAL
          : "normal"
      );

  try {
    textStyle(styleValue);
  } catch (_error) {
  }
}

function jdSetRuntimeFontStack(stack) {
  // Codea Liteはfont()に加えてstate.fontNameを参照する版があるため、
  // 真夜中コーラと同じ経路にも書体を渡して端末差をなくす。
  if (
    typeof CodeaLite !== "undefined" &&
    CodeaLite.state
  ) {
    CodeaLite.state.fontName = stack;
  }

  if (typeof font === "function") {
    font(stack);
  }
}

function jdTitleFont(
  weight = "regular"
) {
  jdSetRuntimeFontStack(JD_FONT_TITLE);
  jdApplyTextWeight(weight);
}

function jdPrimaryFont(
  weight = "regular"
) {
  jdSetRuntimeFontStack(JD_FONT_PRIMARY);
  jdApplyTextWeight(weight);
}

function jdReceiptFont(
  weight = "regular"
) {
  jdSetRuntimeFontStack(JD_FONT_RECEIPT);
  jdApplyTextWeight(weight);
}

function jdReceiptLocalizedFont(
  weight = "regular"
) {
  if (jdIsEnglish()) {
    jdReceiptFont(weight);
  } else {
    jdPrimaryFont(weight);
  }
}

function jdJapaneseFont(
  weight = "regular"
) {
  jdPrimaryFont(weight);
}


function jdEnsureAudio() {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!JD.audioContext) {
    try {
      JD.audioContext =
        new AudioContextClass();

      JD.audioMaster =
        JD.audioContext.createGain();

      JD.audioMaster.gain.value =
        0.44;

      JD.audioMaster.connect(
        JD.audioContext.destination
      );

      JD.soundLastPlayed = {};
    } catch (_error) {
      JD.audioContext = null;
      JD.audioMaster = null;
      return null;
    }
  }

  if (
    JD.audioContext.state ===
    "suspended"
  ) {
    try {
      JD.audioContext.resume();
    } catch (_error) {
      // 再開できなくてもゲームは続行
    }
  }

  return JD.audioContext;
}

function jdSoundCanPlay(
  key,
  cooldown = 0.04
) {
  const now =
    jdNowMs();

  if (!JD.soundLastPlayed) {
    JD.soundLastPlayed = {};
  }

  const last =
    JD.soundLastPlayed[key] ||
    0;

  if (
    now - last <
    cooldown * 1000
  ) {
    return false;
  }

  JD.soundLastPlayed[key] =
    now;

  return true;
}

function jdPlayTone(options = {}) {
  const ctx =
    jdEnsureAudio();

  if (
    !ctx ||
    !JD.audioMaster
  ) {
    return;
  }

  const now =
    ctx.currentTime;

  const delay =
    Math.max(
      0,
      options.delay || 0
    );

  const start =
    now + delay;

  const duration =
    Math.max(
      0.025,
      options.duration || 0.10
    );

  const frequency =
    Math.max(
      40,
      options.frequency || 440
    );

  const endFrequency =
    Math.max(
      40,
      options.endFrequency ||
      frequency
    );

  const volume =
    Math.max(
      0.0001,
      options.volume || 0.08
    );

  const oscillator =
    ctx.createOscillator();

  const gain =
    ctx.createGain();

  oscillator.type =
    options.type ||
    "sine";

  oscillator.frequency.setValueAtTime(
    frequency,
    start
  );

  oscillator.frequency.exponentialRampToValueAtTime(
    endFrequency,
    start + duration
  );

  gain.gain.setValueAtTime(
    0.0001,
    start
  );

  gain.gain.exponentialRampToValueAtTime(
    volume,
    start + 0.008
  );

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    start + duration
  );

  oscillator.connect(gain);
  gain.connect(JD.audioMaster);

  oscillator.start(start);
  oscillator.stop(
    start + duration + 0.02
  );
}

const JD_SOUND_FILE_CONFIG = {
  directory: "./Sound/",
  sources: {
    open: "sfx_start.ogg",
    fortune_pick: "sfx_fortune_pick.ogg",
    fortune_tick: "sfx_fortune_tick.ogg",
    ticket: "sfx_material_popup.ogg",
    intro_open_card: "sfx_intro_open_card.ogg",
    intro_order_sheet: "sfx_intro_order_sheet.ogg",
    launch: "sfx_launcher_release.ogg",
    hit_coffee: "sfx_land_coffee.ogg",
    hit_cake: "sfx_land_cake.ogg",
    hit_melon: "sfx_land_soda.ogg",
    hit_glass: "sfx_hit_glass.ogg",
    hit_stab: "sfx_hit_stab.ogg",
    result_dive: "sfx_result_dive.ogg",
    result_nokkari: "sfx_result_nokkari.ogg",
    result_kantsu: "sfx_result_kantsu.ogg",
    perfect_center: "sfx_perfect_center.ogg",
    bounce_bonus: "sfx_bounce_bonus.ogg",
    drop: "sfx_bounce_soft.ogg",
    out: "sfx_out.ogg",
    receipt_drop: "sfx_delivery_setdown.ogg",
    receipt_feed_start: "sfx_receipt_feed_start.ogg",
    receipt_finish: "sfx_finish_chime.ogg",
    poster_stamp: "sfx_label_paste.ogg",
    poster_ready: "sfx_poster_reveal.ogg",
    poster_turn: "sfx_paper_swish.ogg",
    button_ready: "sfx_button_ready.ogg",
    route_switch: "sfx_route_switch.ogg",
    ambience_cafe: "ambience_cafe_loop.mp3",
    bgm_cafe: "bgm_cafe_loop.mp3"
  },
  volumes: {
    open: 0.52,
    fortune_in: 0.32,
    fortune_pick: 0.34,
    fortune_tick: 0.12,
    ticket: 0.30,
    intro_open_card: 0.22,
    intro_order_sheet: 0.24,
    intro_count_stamp: 0.20,
    launch: 0.50,
    hit_coffee: 0.38,
    hit_cake: 0.36,
    hit_melon: 0.38,
    hit_glass: 0.26,
    hit_stab: 0.34,
    result_dive: 0.20,
    result_nokkari: 0.18,
    result_kantsu: 0.22,
    perfect_center: 0.24,
    bounce_bonus: 0.18,
    drop: 0.36,
    out: 0.34,
    receipt_drop: 0.34,
    receipt_feed_start: 0.22,
    receipt_settle: 0.20,
    receipt_print: 0.24,
    receipt_rank: 0.26,
    receipt_rank_badge: 0.28,
    manager_memo: 0.22,
    receipt_finish: 0.42,
    poster_ink: 0.22,
    poster_stamp: 0.34,
    poster_ready: 0.40,
    poster_turn: 0.30,
    button_ready: 0.32,
    route_switch: 0.38,
    ambience_cafe: 0.055,
    bgm_cafe: 0.115
  },
  cooldowns: {
    open: 0.08,
    fortune_in: 0.18,
    fortune_pick: 0.18,
    fortune_tick: 0.055,
    ticket: 0.08,
    intro_open_card: 0.20,
    intro_order_sheet: 0.20,
    intro_count_stamp: 0.20,
    launch: 0.08,
    hit_coffee: 0.10,
    hit_cake: 0.10,
    hit_melon: 0.10,
    hit_glass: 0.10,
    hit_stab: 0.08,
    result_dive: 0.12,
    result_nokkari: 0.12,
    result_kantsu: 0.12,
    perfect_center: 0.22,
    bounce_bonus: 0.18,
    drop: 0.10,
    out: 0.12,
    receipt_drop: 0.18,
    receipt_feed_start: 0.18,
    receipt_settle: 0.20,
    receipt_print: 0.07,
    receipt_rank: 0.11,
    receipt_rank_badge: 0.18,
    manager_memo: 0.12,
    receipt_finish: 0.14,
    poster_ink: 0.08,
    poster_stamp: 0.12,
    poster_ready: 0.14,
    poster_turn: 0.10,
    button_ready: 0.08,
    route_switch: 0.20,
    ambience_cafe: 0.50,
    bgm_cafe: 0.50
  },
  warmupIds: [
    "open",
    "fortune_in",
    "fortune_pick",
    "fortune_tick",
    "launch",
    "ticket",
    "intro_open_card",
    "intro_order_sheet",
    "intro_count_stamp",
    "hit_coffee",
    "hit_cake",
    "hit_melon",
    "hit_glass",
    "hit_stab",
    "result_dive",
    "result_nokkari",
    "result_kantsu",
    "perfect_center",
    "bounce_bonus",
    "receipt_feed_start",
    "receipt_drop",
    "receipt_settle",
    "receipt_print",
    "receipt_rank",
    "receipt_rank_badge",
    "manager_memo",
    "receipt_finish",
    "poster_ready",
    "poster_turn",
    "button_ready",
    "route_switch",
    "ambience_cafe",
    "bgm_cafe"
  ]
};

/*
 * 最初の開店音だけは、タイトル表示中の静かな時間に先読みする。
 * sfx_start.ogg が置かれている場合、初回タップで合成フォールバックへ落ちるのを防ぐ。
 */
const JD_SOUND_BOOT_IDS = [
  "open"
];

function jdRequestBootSoundWarmup() {
  const state = jdInitSoundFileState();

  if (state.bootRequested) {
    return;
  }

  state.bootRequested = true;

  setTimeout(function() {
    for (
      let index = 0;
      index < JD_SOUND_BOOT_IDS.length;
      index += 1
    ) {
      jdPrepareSoundFile(
        JD_SOUND_BOOT_IDS[index]
      );
    }
  }, 220);
}


function jdInitSoundFileState() {
  if (JD.soundFileState) {
    return JD.soundFileState;
  }

  JD.soundFileState = {
    buffers: {},
    loading: {},
    failed: {},
    loopSources: {},
    loopGains: {},
    loopTargets: {},
    bootRequested: false,
    warmupRequested: false,
    warmupQueue: [],
    warmupTimer: null,
    debugLastError: ""
  };

  return JD.soundFileState;
}

function jdDecodeSoundFileData(ctx, data) {
  return new Promise(function(resolve, reject) {
    let settled = false;

    function resolveOnce(buffer) {
      if (settled) return;
      settled = true;
      resolve(buffer);
    }

    function rejectOnce(error) {
      if (settled) return;
      settled = true;
      reject(error);
    }

    try {
      const result = ctx.decodeAudioData(
        data,
        resolveOnce,
        rejectOnce
      );

      if (
        result &&
        typeof result.then === "function"
      ) {
        result.then(resolveOnce).catch(rejectOnce);
      }
    } catch (error) {
      rejectOnce(error);
    }
  });
}

function jdPrepareSoundFile(name) {
  const state = jdInitSoundFileState();
  const filename = JD_SOUND_FILE_CONFIG.sources[name];

  if (!filename) {
    return Promise.resolve(null);
  }

  if (state.buffers[name]) {
    return Promise.resolve(state.buffers[name]);
  }

  if (state.loading[name]) {
    return state.loading[name];
  }

  if (state.failed[name]) {
    return Promise.resolve(null);
  }

  const ctx = jdEnsureAudio();

  if (!ctx || typeof fetch !== "function") {
    state.failed[name] = true;
    return Promise.resolve(null);
  }

  const url =
    JD_SOUND_FILE_CONFIG.directory +
    filename;

  const task = fetch(
    url,
    { cache: "force-cache" }
  ).then(function(response) {
    if (!response.ok) {
      throw new Error(
        "Sound load failed: " +
          name +
          " (" +
          String(response.status) +
          ")"
      );
    }

    return response.arrayBuffer();
  }).then(function(data) {
    return jdDecodeSoundFileData(
      ctx,
      data
    );
  }).then(function(buffer) {
    state.buffers[name] = buffer || null;
    delete state.loading[name];
    return buffer || null;
  }).catch(function(error) {
    state.failed[name] = true;
    state.debugLastError = String(
      error && error.message
        ? error.message
        : error
    );
    delete state.loading[name];
    return null;
  });

  state.loading[name] = task;
  return task;
}

function jdScheduleNextSoundWarmup(delay) {
  const state = jdInitSoundFileState();

  if (state.warmupQueue.length <= 0) {
    state.warmupTimer = null;
    return;
  }

  const wait =
    typeof delay === "number"
      ? delay
      : 84;

  state.warmupTimer = setTimeout(
    function() {
      const nextName =
        state.warmupQueue.shift();

      if (!nextName) {
        jdScheduleNextSoundWarmup(84);
        return;
      }

      jdPrepareSoundFile(nextName).then(
        function() {
          jdScheduleNextSoundWarmup(84);
        }
      );
    },
    Math.max(0, wait)
  );
}

function jdRequestSoundWarmup() {
  const state = jdInitSoundFileState();

  if (state.warmupRequested) {
    return;
  }

  state.warmupRequested = true;
  state.warmupQueue =
    JD_SOUND_FILE_CONFIG.warmupIds.slice();

  jdScheduleNextSoundWarmup(120);
}

function jdPlayBufferedSound(name, options = {}) {
  const state = jdInitSoundFileState();
  const buffer = state.buffers[name];

  if (!buffer) {
    if (
      !state.loading[name] &&
      !state.failed[name]
    ) {
      jdPrepareSoundFile(name);
    }

    return false;
  }

  const ctx = jdEnsureAudio();

  if (!ctx || !JD.audioMaster) {
    return false;
  }

  try {
    const source =
      ctx.createBufferSource();
    const gain =
      ctx.createGain();

    source.buffer = buffer;
    source.playbackRate.value =
      Number.isFinite(options.playbackRate) &&
      options.playbackRate > 0
        ? options.playbackRate
        : 1;

    const configuredVolume =
      Number.isFinite(
        JD_SOUND_FILE_CONFIG.volumes[name]
      )
        ? JD_SOUND_FILE_CONFIG.volumes[name]
        : 0.34;

    gain.gain.value = Math.max(
      0,
      Number.isFinite(options.volume)
        ? options.volume
        : configuredVolume
    );

    source.connect(gain);
    gain.connect(JD.audioMaster);

    source.start(
      ctx.currentTime +
        Math.max(
          0,
          options.delay || 0
        )
    );

    return true;
  } catch (error) {
    state.debugLastError = String(
      error && error.message
        ? error.message
        : error
    );
    return false;
  }
}


function jdGetLoopConfiguredVolume(name) {
  const configuredVolume =
    JD_SOUND_FILE_CONFIG &&
    JD_SOUND_FILE_CONFIG.volumes
      ? JD_SOUND_FILE_CONFIG.volumes[name]
      : null;

  return Number.isFinite(configuredVolume)
    ? Math.max(0, configuredVolume)
    : 0.04;
}

function jdStartBufferedLoop(name, volume) {
  const state = jdInitSoundFileState();
  const buffer = state.buffers[name];

  if (!buffer || state.loopSources[name]) {
    return false;
  }

  const ctx = jdEnsureAudio();

  if (!ctx || !JD.audioMaster) {
    return false;
  }

  try {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();

    source.buffer = buffer;
    source.loop = true;

    gain.gain.value = 0.0001;

    source.connect(gain);
    gain.connect(JD.audioMaster);

    source.start(ctx.currentTime);

    state.loopSources[name] = source;
    state.loopGains[name] = gain;
    state.loopTargets[name] = 0;

    source.onended = function() {
      if (state.loopSources[name] === source) {
        delete state.loopSources[name];
        delete state.loopGains[name];
        delete state.loopTargets[name];
      }
    };

    jdSetSoundLoopVolume(
      name,
      Number.isFinite(volume)
        ? volume
        : jdGetLoopConfiguredVolume(name),
      0.42
    );

    return true;
  } catch (error) {
    state.debugLastError = String(
      error && error.message
        ? error.message
        : error
    );
    return false;
  }
}

function jdEnsureSoundLoop(name, volume) {
  jdRequestSoundWarmup();

  const state = jdInitSoundFileState();

  if (state.loopSources[name]) {
    jdSetSoundLoopVolume(
      name,
      Number.isFinite(volume)
        ? volume
        : jdGetLoopConfiguredVolume(name),
      0.42
    );

    return true;
  }

  if (state.buffers[name]) {
    return jdStartBufferedLoop(name, volume);
  }

  if (
    !state.loading[name] &&
    !state.failed[name]
  ) {
    jdPrepareSoundFile(name).then(function(buffer) {
      if (
        buffer &&
        JD &&
        JD.state !== STATE_TITLE
      ) {
        jdStartBufferedLoop(name, volume);
      }
    });
  }

  return false;
}

function jdSetSoundLoopVolume(name, volume, duration = 0.32) {
  const state = jdInitSoundFileState();
  const gain = state.loopGains[name];

  if (!gain) {
    return;
  }

  const ctx = jdEnsureAudio();

  if (!ctx) {
    return;
  }

  const target =
    Math.max(
      0.0001,
      Number.isFinite(volume)
        ? volume
        : 0
    );

  const now = ctx.currentTime;

  try {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(
      Math.max(0.0001, gain.gain.value || 0.0001),
      now
    );
    gain.gain.linearRampToValueAtTime(
      target,
      now + Math.max(0.02, duration)
    );
  } catch (_error) {
    gain.gain.value = target;
  }

  state.loopTargets[name] = volume;
}

function jdStopSoundLoop(name, duration = 0.38) {
  const state = jdInitSoundFileState();
  const source = state.loopSources[name];
  const gain = state.loopGains[name];

  if (!source || !gain) {
    return;
  }

  const ctx = jdEnsureAudio();

  if (!ctx) {
    return;
  }

  const now = ctx.currentTime;

  try {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(
      Math.max(0.0001, gain.gain.value || 0.0001),
      now
    );
    gain.gain.linearRampToValueAtTime(
      0.0001,
      now + Math.max(0.03, duration)
    );

    source.stop(
      now + Math.max(0.04, duration) + 0.04
    );
  } catch (_error) {
    try {
      source.stop();
    } catch (__error) {
      // 停止済みでも無視
    }
  }

  delete state.loopSources[name];
  delete state.loopGains[name];
  delete state.loopTargets[name];
}

function jdStopAllSoundLoops(duration = 0.38) {
  const state = jdInitSoundFileState();
  const names = Object.keys(
    state.loopSources || {}
  );

  for (const name of names) {
    jdStopSoundLoop(name, duration);
  }
}

function jdPlaySyntheticCafeAmbiencePulse() {
  const ctx = jdEnsureAudio();

  if (!ctx || !JD.audioMaster) {
    return;
  }

  const state = jdInitSoundFileState();
  const nowMs = jdNowMs();

  if (
    state.syntheticAmbienceLastMs &&
    nowMs - state.syntheticAmbienceLastMs < 2600
  ) {
    return;
  }

  state.syntheticAmbienceLastMs = nowMs;

  jdPlayNoise({
    duration: 0.22,
    frequency: 520,
    q: 0.26,
    volume: 0.0038,
    filterType: "lowpass"
  });

  jdPlayTone({
    frequency: 92,
    endFrequency: 88,
    duration: 0.30,
    volume: 0.0028,
    delay: 0.03,
    type: "sine"
  });
}

function jdShouldRunCafeAudioBed() {
  if (!JD || JD.soundMuted === true) {
    return false;
  }

  return (
    JD.state === STATE_PLAY ||
    JD.state === STATE_POSTER_TRANSITION ||
    JD.state === STATE_POSTER_REVEAL ||
    JD.state === STATE_POSTER_HOLD ||
    JD.state === STATE_POSTER_PEEL ||
    JD.state === STATE_POSTER_CAFE_HOLD ||
    JD.state === STATE_RECEIPT
  );
}

function jdUpdateCafeAudioBed() {
  if (
    !JD ||
    JD.audioBedDisabled === true
  ) {
    jdStopAllSoundLoops(0.45);
    return;
  }

  if (!jdShouldRunCafeAudioBed()) {
    jdStopSoundLoop("bgm_cafe", 0.55);
    jdStopSoundLoop("ambience_cafe", 0.55);
    return;
  }

  const hasBgm =
    jdEnsureSoundLoop(
      "bgm_cafe",
      jdGetLoopConfiguredVolume("bgm_cafe")
    );

  const hasAmbience =
    jdEnsureSoundLoop(
      "ambience_cafe",
      jdGetLoopConfiguredVolume("ambience_cafe")
    );

  // BGMファイルは任意。未配置でも喫茶店の空気だけは薄く残す。
  if (!hasAmbience) {
    jdPlaySyntheticCafeAmbiencePulse();
  }

  return hasBgm || hasAmbience;
}

function jdPlayNoise(options = {}) {
  const ctx =
    jdEnsureAudio();

  if (
    !ctx ||
    !JD.audioMaster
  ) {
    return;
  }

  const duration =
    Math.max(
      0.025,
      options.duration || 0.08
    );

  const sampleCount =
    Math.max(
      1,
      Math.floor(
        ctx.sampleRate *
        duration
      )
    );

  const buffer =
    ctx.createBuffer(
      1,
      sampleCount,
      ctx.sampleRate
    );

  const data =
    buffer.getChannelData(0);

  for (
    let i = 0;
    i < sampleCount;
    i++
  ) {
    const fade =
      1 -
      i /
      sampleCount;

    data[i] =
      (
        Math.random() *
        2 -
        1
      ) *
      fade;
  }

  const source =
    ctx.createBufferSource();

  const filter =
    ctx.createBiquadFilter();

  const gain =
    ctx.createGain();

  source.buffer = buffer;

  filter.type =
    options.filterType ||
    "bandpass";

  filter.frequency.value =
    options.frequency ||
    1200;

  filter.Q.value =
    options.q ||
    0.8;

  gain.gain.value =
    options.volume ||
    0.035;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(JD.audioMaster);

  source.start(
    ctx.currentTime +
    Math.max(
      0,
      options.delay || 0
    )
  );
}

function jdPlaySound(name, options = {}) {
  jdRequestSoundWarmup();

  const configuredCooldown =
    JD_SOUND_FILE_CONFIG.cooldowns[name];

  const cooldown =
    Number.isFinite(configuredCooldown)
      ? configuredCooldown
      : (
          name === "receipt_print"
            ? 0.07
            : 0.04
        );

  if (!jdSoundCanPlay(name, cooldown)) {
    return;
  }

  if (jdPlayBufferedSound(name, options)) {
    return;
  }

  const mappedSoundFile =
    JD_SOUND_FILE_CONFIG.sources[name];

  /*
   * ファイルが登録されていて、まだ失敗扱いになっていない音は
   * fetch / decode の完了を待つ。
   * ここで即フォールバックを鳴らすと、ogg配置済みでも初回だけ合成音になる。
   */
  if (mappedSoundFile) {
    const fileState =
      jdInitSoundFileState();

    if (!fileState.failed[name]) {
      jdPrepareSoundFile(name).then(function(buffer) {
        if (buffer) {
          jdPlayBufferedSound(
            name,
            options
          );
          return;
        }

        jdPlaySyntheticSoundFallback(
          name
        );
      });

      return;
    }
  }

  jdPlaySyntheticSoundFallback(
    name
  );
}

function jdPlaySyntheticSoundFallback(name) {
  switch (name) {
    // タイトル・開店
    case "open":
      jdPlayTone({
        frequency: 660,
        endFrequency: 880,
        duration: 0.12,
        volume: 0.055,
        type: "sine"
      });

      jdPlayTone({
        frequency: 990,
        endFrequency: 1180,
        duration: 0.16,
        volume: 0.038,
        delay: 0.08,
        type: "sine"
      });
      break;

    // Fortune登場。札がせり出す低い気配を少し控えめに。
    case "fortune_in":
      jdPlayTone({
        frequency: 140,
        endFrequency: 190,
        duration: 0.16,
        volume: 0.040,
        type: "triangle"
      });

      jdPlayNoise({
        duration: 0.065,
        frequency: 620,
        q: 0.55,
        volume: 0.014
      });
      break;

    // Fortune抽選中。名前が切り替わるたび、ごく薄く刻む。
    case "fortune_tick":
      jdPlayTone({
        frequency: 940,
        endFrequency: 860,
        duration: 0.020,
        volume: 0.010,
        type: "square"
      });

      jdPlayNoise({
        duration: 0.014,
        frequency: 1900,
        q: 0.70,
        volume: 0.004
      });
      break;

    // Fortune確定。素材札の音と重なりすぎないよう短めに。
    case "fortune_pick":
      jdPlayTone({
        frequency: 520,
        endFrequency: 540,
        duration: 0.055,
        volume: 0.046,
        type: "square"
      });

      jdPlayTone({
        frequency: 780,
        endFrequency: 720,
        duration: 0.095,
        volume: 0.028,
        delay: 0.048,
        type: "triangle"
      });
      break;

    // 素材札
    case "ticket":
      jdPlayNoise({
        duration: 0.09,
        frequency: 1750,
        q: 0.55,
        volume: 0.028
      });
      break;

    // 開店札。勤務票が小さく出る紙音。
    case "intro_open_card":
      jdPlayNoise({
        duration: 0.060,
        frequency: 1500,
        q: 0.55,
        volume: 0.012
      });

      jdPlayTone({
        frequency: 360,
        endFrequency: 310,
        duration: 0.048,
        volume: 0.010,
        delay: 0.018,
        type: "triangle"
      });
      break;

    // 本日の注文票。少し大きい紙が置かれる音。
    case "intro_order_sheet":
      jdPlayNoise({
        duration: 0.090,
        frequency: 1200,
        q: 0.48,
        volume: 0.016
      });

      jdPlayTone({
        frequency: 230,
        endFrequency: 180,
        duration: 0.070,
        volume: 0.012,
        delay: 0.044,
        type: "triangle"
      });
      break;

    // 本日の全5件を示す小さな押印。説明を押しつけず、区切りだけつける。
    case "intro_count_stamp":
      jdPlayTone({
        frequency: 520,
        endFrequency: 430,
        duration: 0.038,
        volume: 0.014,
        type: "square"
      });

      jdPlayNoise({
        duration: 0.028,
        frequency: 1800,
        q: 0.62,
        volume: 0.008,
        delay: 0.012
      });
      break;

    // 発射
    case "launch":
      jdPlayTone({
        frequency: 185,
        endFrequency: 95,
        duration: 0.13,
        volume: 0.075,
        type: "triangle"
      });

      jdPlayNoise({
        duration: 0.055,
        frequency: 900,
        volume: 0.026
      });
      break;

    // コーヒー成功
    case "hit_coffee":
      jdPlayTone({
        frequency: 205,
        endFrequency: 150,
        duration: 0.14,
        volume: 0.066,
        type: "sine"
      });

      jdPlayNoise({
        duration: 0.07,
        frequency: 520,
        volume: 0.018
      });
      break;

    // ケーキ成功
    case "hit_cake":
      jdPlayTone({
        frequency: 310,
        endFrequency: 245,
        duration: 0.11,
        volume: 0.060,
        type: "triangle"
      });
      break;

    // メロンソーダ成功
    case "hit_melon":
      jdPlayTone({
        frequency: 610,
        endFrequency: 840,
        duration: 0.13,
        volume: 0.052,
        type: "sine"
      });

      jdPlayTone({
        frequency: 920,
        endFrequency: 1120,
        duration: 0.10,
        volume: 0.027,
        delay: 0.07,
        type: "sine"
      });
      break;

    // メロンソーダのグラスへ当たった、小さなガラス接触音。
    // 成功音より短く軽くし、側面バウンドの手触りだけを足す。
    case "hit_glass":
      jdPlayTone({
        frequency: 1780,
        endFrequency: 1460,
        duration: 0.050,
        volume: 0.025,
        type: "sine"
      });

      jdPlayTone({
        frequency: 2860,
        endFrequency: 2320,
        duration: 0.032,
        volume: 0.012,
        delay: 0.006,
        type: "sine"
      });
      break;

    // ケーキへ刺さる
    case "hit_stab":
      jdPlayTone({
        frequency: 420,
        endFrequency: 165,
        duration: 0.09,
        volume: 0.068,
        type: "square"
      });

      jdPlayNoise({
        duration: 0.045,
        frequency: 1300,
        volume: 0.027
      });
      break;

    // DIVE。液体に入った後の、短い泡の余韻。
    case "result_dive":
      jdPlayNoise({
        duration: 0.080,
        frequency: 1850,
        q: 0.52,
        volume: 0.014
      });

      jdPlayTone({
        frequency: 420,
        endFrequency: 520,
        duration: 0.055,
        volume: 0.012,
        delay: 0.028,
        type: "sine"
      });
      break;

    // NOKKARI。皿やケーキ上に、軽く乗った感じ。
    case "result_nokkari":
      jdPlayTone({
        frequency: 660,
        endFrequency: 540,
        duration: 0.046,
        volume: 0.016,
        type: "triangle"
      });

      jdPlayNoise({
        duration: 0.030,
        frequency: 1400,
        q: 0.70,
        volume: 0.010,
        delay: 0.018
      });
      break;

    // KANTSU。刺さりのあとに、小さく硬い決まり音。
    case "result_kantsu":
      jdPlayTone({
        frequency: 980,
        endFrequency: 720,
        duration: 0.048,
        volume: 0.018,
        type: "square"
      });

      jdPlayTone({
        frequency: 1320,
        endFrequency: 1180,
        duration: 0.040,
        volume: 0.011,
        delay: 0.035,
        type: "triangle"
      });
      break;

    // PERFECT CENTER。通常成功に重ねる、ごく短い高音のご褒美。
    case "perfect_center":
      jdPlayTone({
        frequency: 1320,
        endFrequency: 1760,
        duration: 0.060,
        volume: 0.018,
        type: "sine"
      });

      jdPlayTone({
        frequency: 1980,
        endFrequency: 1640,
        duration: 0.070,
        volume: 0.012,
        delay: 0.045,
        type: "triangle"
      });

      jdPlayNoise({
        duration: 0.024,
        frequency: 3100,
        q: 0.82,
        volume: 0.006,
        delay: 0.020
      });
      break;

    // バウンドボーナス。跳ねた手応えを、得点成立時だけ控えめに知らせる。
    case "bounce_bonus":
      jdPlayTone({
        frequency: 760,
        endFrequency: 1040,
        duration: 0.050,
        volume: 0.014,
        type: "triangle"
      });

      jdPlayTone({
        frequency: 1040,
        endFrequency: 860,
        duration: 0.045,
        volume: 0.010,
        delay: 0.040,
        type: "sine"
      });

      jdPlayNoise({
        duration: 0.020,
        frequency: 2200,
        q: 0.70,
        volume: 0.006,
        delay: 0.018
      });
      break;

    // テーブル落下
    case "drop":
      jdPlayTone({
        frequency: 120,
        endFrequency: 75,
        duration: 0.13,
        volume: 0.060,
        type: "triangle"
      });
      break;

    // 画面外
    case "out":
      jdPlayTone({
        frequency: 190,
        endFrequency: 92,
        duration: 0.23,
        volume: 0.042,
        type: "sine"
      });
      break;

    // レシートが置かれる
    case "receipt_drop":
      jdPlayNoise({
        duration: 0.15,
        frequency: 1450,
        q: 0.6,
        volume: 0.035
      });

      jdPlayTone({
        frequency: 155,
        endFrequency: 120,
        duration: 0.08,
        volume: 0.028,
        delay: 0.07,
        type: "triangle"
      });
      break;

    // レシートが画面へ送り出され始める、薄い紙送り音。
    case "receipt_feed_start":
      jdPlayNoise({
        duration: 0.18,
        frequency: 1750,
        q: 0.48,
        volume: 0.018
      });

      jdPlayNoise({
        duration: 0.11,
        frequency: 900,
        q: 0.38,
        volume: 0.010,
        delay: 0.055
      });
      break;

    // レシートが定位置に収まったあとの、ごく小さな紙の止まり。
    case "receipt_settle":
      jdPlayNoise({
        duration: 0.060,
        frequency: 1250,
        q: 0.55,
        volume: 0.012
      });

      jdPlayTone({
        frequency: 210,
        endFrequency: 170,
        duration: 0.055,
        volume: 0.014,
        delay: 0.028,
        type: "triangle"
      });
      break;

    // 印字
    case "receipt_print":
      jdPlayTone({
        frequency: 1180,
        endFrequency: 920,
        duration: 0.035,
        volume: 0.022,
        type: "square"
      });

      jdPlayNoise({
        duration: 0.028,
        frequency: 2100,
        volume: 0.013
      });
      break;

    // ランク印字。通常の明細より少し硬く、評価欄の存在だけを立てる。
    case "receipt_rank":
      jdPlayTone({
        frequency: 1040,
        endFrequency: 760,
        duration: 0.042,
        volume: 0.024,
        type: "square"
      });

      jdPlayNoise({
        duration: 0.030,
        frequency: 2350,
        q: 0.72,
        volume: 0.012
      });

      jdPlayTone({
        frequency: 520,
        endFrequency: 565,
        duration: 0.052,
        volume: 0.014,
        delay: 0.034,
        type: "triangle"
      });
      break;

    // ランク名が見えた直後の小さな評価音。
    // ファンファーレではなく、レジ横の小さなベルくらいに抑える。
    case "receipt_rank_badge":
      jdPlayTone({
        frequency: 880,
        endFrequency: 990,
        duration: 0.060,
        volume: 0.020,
        type: "sine"
      });

      jdPlayTone({
        frequency: 1320,
        endFrequency: 1180,
        duration: 0.070,
        volume: 0.014,
        delay: 0.040,
        type: "triangle"
      });

      jdPlayNoise({
        duration: 0.022,
        frequency: 2600,
        q: 0.80,
        volume: 0.006,
        delay: 0.018
      });
      break;

    // 店長メモ印字。少し低く、紙に一言が置かれる感じ。
    case "manager_memo":
      jdPlayNoise({
        duration: 0.038,
        frequency: 1600,
        q: 0.65,
        volume: 0.013
      });

      jdPlayTone({
        frequency: 470,
        endFrequency: 360,
        duration: 0.070,
        volume: 0.018,
        delay: 0.014,
        type: "triangle"
      });

      jdPlayTone({
        frequency: 840,
        endFrequency: 720,
        duration: 0.030,
        volume: 0.010,
        delay: 0.062,
        type: "square"
      });
      break;

    // THANK YOU
    case "receipt_finish":
      jdPlayTone({
        frequency: 520,
        endFrequency: 620,
        duration: 0.10,
        volume: 0.040,
        type: "sine"
      });

      jdPlayTone({
        frequency: 780,
        endFrequency: 820,
        duration: 0.12,
        volume: 0.032,
        delay: 0.09,
        type: "sine"
      });
      break;

    // ポスターへインクが入る短い印字音
    case "poster_ink":
      jdPlayNoise({
        duration: 0.055,
        frequency: 1850,
        q: 0.7,
        volume: 0.018
      });

      jdPlayTone({
        frequency: 860,
        endFrequency: 720,
        duration: 0.045,
        volume: 0.018,
        type: "square"
      });
      break;

    // 価格が押される、小さなスタンプ音
    case "poster_stamp":
      jdPlayTone({
        frequency: 170,
        endFrequency: 112,
        duration: 0.085,
        volume: 0.048,
        type: "triangle"
      });

      jdPlayNoise({
        duration: 0.045,
        frequency: 920,
        q: 0.8,
        volume: 0.022
      });
      break;

    // ポスターが完成し、下の帯が定位置へ収まる音
    case "poster_ready":
      jdPlayTone({
        frequency: 520,
        endFrequency: 690,
        duration: 0.12,
        volume: 0.034,
        type: "sine"
      });
      break;

    // 店頭ポスターを外し、裏側の営業記録へ送る紙の擦れ。
    case "poster_turn":
      jdPlayNoise({
        duration: 0.24,
        frequency: 1180,
        q: 0.55,
        volume: 0.025
      });

      jdPlayTone({
        frequency: 245,
        endFrequency: 182,
        duration: 0.16,
        volume: 0.024,
        type: "triangle"
      });
      break;

    // 言語切替・小さな真鍮プレートのスイッチ音
    case "route_switch":
      jdPlayTone({
        frequency: 620,
        endFrequency: 840,
        duration: 0.045,
        volume: 0.026,
        type: "triangle"
      });

      jdPlayTone({
        frequency: 340,
        endFrequency: 280,
        duration: 0.055,
        volume: 0.018,
        delay: 0.028,
        type: "square"
      });

      jdPlayNoise({
        duration: 0.026,
        frequency: 1700,
        q: 0.75,
        volume: 0.010,
        delay: 0.008
      });
      break;

    // 再シフトボタン
    case "button_ready":
      jdPlayTone({
        frequency: 440,
        endFrequency: 550,
        duration: 0.11,
        volume: 0.043,
        type: "triangle"
      });
      break;
  }
}







/*
 * 起動時の一斉 preload ではなく、タイトルの idle 時間で
 * 最初の開店音だけ準備する。
 */
jdRequestBootSoundWarmup();


function jdReadWebOptions() {
  JD.webPortVersion = JD_WEB_PORT_VERSION;
  JD.webOptions = { debugDefault: false };

  if (typeof window === "undefined" || !window.location) return;

  const params = new URLSearchParams(window.location.search || "");
  JD.webOptions.debugDefault = params.get("debug") === "1" || params.get("debug") === "true";

  try {
    JD.lang = jdNormalizeLanguage(
      window.localStorage
        ? window.localStorage.getItem("junkissa-dive-lang")
        : JD.lang
    );
  } catch (_error) {
    JD.lang = jdNormalizeLanguage(JD.lang);
  }
}

function jdAcceptPrimaryPointer(touch) {
  const id = touch && touch.id !== undefined ? touch.id : "mouse";

  if (touch.state === BEGAN) {
    if (JD.activePointerId !== null && JD.activePointerId !== undefined) return false;
    JD.activePointerId = id;
    return true;
  }

  if (JD.activePointerId !== null && JD.activePointerId !== undefined && JD.activePointerId !== id) {
    return false;
  }

  return true;
}

function jdClearPrimaryPointerIfDone(touch) {
  if (!touch) return;
  if (touch.state === ENDED || touch.state === CANCELLED) JD.activePointerId = null;
}

function jdCancelActiveTouch() {
  JD.activePointerId = null;

  if (JD.dragging) {
    JD.dragging = false;
    JD.dragScreenStart = null;
    JD.dragScreenNow = null;
    if (JD.state === STATE_PLAY && JD.food && !JD.food.launched && !JD.food.resolved) {
      jdSetGamePhase(PHASE_AIM);
      jdSetCameraClose(false);
    }
  }
}

function jdInitText() {
  JD.text = {
    title: {
      brandTop: { jp: "純喫茶", en: "JUNKISSA" },
      brandBottom: { jp: "ダイヴ", en: "DIVE" },
      sub: { jp: "レトロ喫茶スリングショット", en: "RETRO CAFE SLINGSHOT" },
      start: { jp: "タッチしてはじめる", en: "TOUCH TO START" },
      open: { jp: "開店する", en: "OPEN THE CAFE" }
    },
    ui: {
      shift: { jp: "月曜シフト", en: "MONDAY SHIFT" },
      sales: { jp: "売上", en: "SALES" },
      yen: { jp: "円", en: "YEN" },
      rest: { jp: "残り", en: "LEFT" },
      item: { jp: "素材", en: "ITEM" },
      pull: { jp: "ひっぱってダイブ", en: "PULL TO DIVE" },
      dragging: { jp: "はなして発射", en: "RELEASE TO SHOOT" },
      fortuneSpin: { jp: "喫茶フォーチュン回転中", en: "KISSA FORTUNE IS SPINNING" },
      workTicket: { jp: "勤務票", en: "WORK TICKET" },
      choosing: { jp: "", en: "CHOOSING TODAY'S INGREDIENT" }
    },
    intro: {
      open: { jp: "開店", en: "OPEN" },
      startShift: { jp: "本日のシフトを始めます", en: "YOUR SHIFT STARTS NOW" },
      todayOrder: { jp: "本日のご注文", en: "TODAY'S ORDERS" },
      mondayShift: { jp: "月曜日のシフト", en: "MONDAY SHIFT" },
      fiveThrows: { jp: "全5件", en: "5 ORDERS" }
    },
    fortune: {
      title: { jp: "喫茶フォーチュン", en: "KISSA FORTUNE" },
      lucky: { jp: "ラッキー素材", en: "LUCKY ITEM" },
      luckySpin: { jp: "ラッキー素材…", en: "LUCKY ITEM..." },
      chin: { jp: "チン！", en: "CHIN!" },
      berry: { jp: "いちご", en: "BERRY" },
      luck: { jp: "運", en: "LUCK" }
    },
    result: {
      dive: { jp: "DIVE", en: "DIVE" },
      land: { jp: "NOKKARI", en: "NOKKARI" },
      stab: { jp: "KANTSU", en: "KANTSU" },
      floor: { jp: "", en: "" },
      out: { jp: "TOBIDASHI", en: "TOBIDASHI" },
      perfect: { jp: "ど真ん中", en: "PERFECT CENTER" }
    },
    receipt: {
      shop: { jp: "純喫茶 ダイヴ", en: "JUNKISSA DIVE" },
      title: { jp: "JUNKISSA DIVE", en: "JUNKISSA DIVE" },
      total: { jp: "合計", en: "TOTAL" },
      rank: { jp: "ランク", en: "RANK" },
      tencho: { jp: "店長メモ:", en: "MANAGER:" },
      oneMore: { jp: "もう一度シフトへ", en: "ONE MORE SHIFT" },
      shift: { jp: "月曜シフト", en: "MONDAY SHIFT" },
      memo: { jp: "店長メモ", en: "MANAGER MEMO" },
      thanks: { jp: "ありがとうございました", en: "THANK YOU" }
    },
    rank: {
      legendary: { jp: "伝説級", en: "LEGENDARY" },
      excellent: { jp: "絶好調", en: "ON FIRE" },
      good: { jp: "好調", en: "GOOD NIGHT" },
      fair: { jp: "まずまず", en: "NOT BAD" },
      oneJob: { jp: "一仕事", en: "ONE GOOD JOB" },
      tomorrow: { jp: "また明日", en: "TRY AGAIN TOMORROW" }
    },
    manager: {
      diveMaster: { jp: "やるじゃん。店が回ってきたぞ。", en: "Nice. The place is starting to run." },
      floorHeavy: { jp: "おいおい…。まぁ、売れたから良いか。", en: "Come on... Well, it sold, so fine." },
      sold: { jp: "まあ、店は回ったな。そういう日も大事だ。", en: "The café ran. Days like that matter." },
      default: { jp: "こういう日もあるな。さあ、片づけるか。", en: "Days like this happen. Let’s clean up." }
    },
    target: {
      coffee: { jp: "コーヒー", en: "COFFEE" },
      cake: { jp: "ケーキ", en: "CAKE" },
      melon: { jp: "メロンソーダ", en: "MELON SODA" }
    },
    food: {
      CHERRY: { jp: "チェリー", en: "CHERRY" },
      SUGAR: { jp: "シュガー", en: "SUGAR" },
      STRAWBERRY: { jp: "いちご", en: "STRAWBERRY" }
    },
    shot: {
      power: { jp: "強さ", en: "POWER" },
      angle: { jp: "角度", en: "ANGLE" },
      last: { jp: "前回", en: "LAST" },
      yowame: { jp: "弱め", en: "LIGHT" },
      futsu: { jp: "ふつう", en: "NORMAL" },
      tsuyome: { jp: "強め", en: "STRONG" },
      yarisugi: { jp: "強すぎ", en: "TOO STRONG" },
      low: { jp: "低め", en: "LOW" },
      naname: { jp: "ななめ", en: "DIAGONAL" },
      high: { jp: "高め", en: "HIGH" }
    },
    tutorial: {
      tap: { jp: "タップ", en: "TAP" },
      pull: { jp: "ひっぱる", en: "PULL" },
      release: { jp: "はなす", en: "RELEASE" }
    },
    beat: {
      next: { jp: "次の一投", en: "NEXT!" }
    },
    poster: {
      special: { jp: "本日の特製", en: "TODAY'S SPECIAL" },
      viewReceipt: { jp: "レシートを見る", en: "VIEW RECEIPT" },
      save: { jp: "画像を保存", en: "SAVE IMAGE" },
      preparing: { jp: "準備中…", en: "PREPARING..." },
      saved: { jp: "保存しました", en: "SAVED" },
      openImage: { jp: "画像を開きました", en: "IMAGE OPENED" },
      unavailable: { jp: "保存できません", en: "SAVE FAILED" },
      failureTop: { jp: "からっぽ", en: "EMPTY" },
      failureMain: { jp: "プレート", en: "PLATE" },
      failureDescription: {
        jp: "お皿だけは、きれいに用意できました。",
        en: "AT LEAST THE PLATE WAS READY."
      }
    }
  };

  JD.lang = "jp";
}

function jdT(path, fallback = "") {
  const parts = String(path).split(".");
  let node = JD.text;
  for (const part of parts) {
    if (!node || node[part] === undefined) return fallback;
    node = node[part];
  }

  if (
    node &&
    typeof node === "object" &&
    (
      typeof node.jp === "string" ||
      typeof node.en === "string"
    )
  ) {
    const lang = JD.lang === "en" ? "en" : "jp";
    return node[lang] || node.jp || node.en || fallback;
  }

  return node;
}

function jdIsEnglish() {
  return JD.lang === "en";
}

function jdFontForLanguage(weight = "regular") {
  // 操作説明と本文はJP/ENとも同じUI書体にそろえる。
  // 見出しと判定語は、用途側から専用ヘルパーを明示して切り替える。
  jdPrimaryFont(weight);
}

function jdNormalizeLanguage(value) {
  return String(value || "").toLowerCase() === "en"
    ? "en"
    : "jp";
}

function jdSetLanguage(language) {
  const nextLanguage = jdNormalizeLanguage(language);
  if (JD.lang === nextLanguage) return false;

  JD.lang = nextLanguage;

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("junkissa-dive-lang", JD.lang);
    }
  } catch (_error) {
    // 保存を許可しない環境でも、今回の表示切り替えは続ける。
  }

  jdRefreshLocalizedPosterItem();
  return true;
}

function jdToggleLanguage() {
  return jdSetLanguage(JD.lang === "en" ? "jp" : "en");
}

function jdRefreshLocalizedPosterItem() {
  if (!JD.posterItem) return;

  if (JD.posterItem.isFailurePoster) {
    const failureItem = jdBuildFailurePosterItem(JD.results);
    if (failureItem) JD.posterItem = failureItem;
    return;
  }

  if (
    Array.isArray(JD.posterItem.resultIndices) &&
    JD.posterItem.resultIndices.length > 0
  ) {
    const product = jdBuildCompletedProducts(JD.results).find(
      (candidate) =>
        candidate.productKey === JD.posterItem.productKey
    );

    if (product) {
      JD.posterBestResult = product;
      JD.posterItem = jdBuildPosterItem(product);
      return;
    }
  }

  const resultIndex = JD.posterItem.resultIndex;
  const result =
    Array.isArray(JD.results) &&
    Number.isInteger(resultIndex)
      ? JD.results[resultIndex]
      : null;

  if (result && jdIsPosterSuccessResult(result)) {
    JD.posterItem = jdBuildPosterItem({
      ...result,
      resultIndex
    });
    return;
  }

  if (resultIndex === -1) {
    JD.posterItem = jdMakePosterMockItem();
  }
}

function jdLanguageToggleBounds() {
  // 真夜中コーラと同じ、右上の76×24真鍮プレート。
  // 論理画面360×640に対して上下左右8pxの余白を取る。
  const width = 76;
  const height = 24;
  const margin = 8;

  return {
    x: margin,
    y: JD.LOGICAL_H - margin - height,
    w: width,
    h: height
  };
}

function jdLanguageToggleVisible() {
  return JD.state === STATE_TITLE;
}

function jdLanguageToggleHit(x, y) {
  const bounds = jdLanguageToggleBounds();
  return (
    x >= bounds.x &&
    x <= bounds.x + bounds.w &&
    y >= bounds.y &&
    y <= bounds.y + bounds.h
  );
}

function jdHandleLanguageToggleTouch(x, y) {
  if (!jdLanguageToggleVisible()) return false;

  const bounds = jdLanguageToggleBounds();
  if (!jdLanguageToggleHit(x, y)) return false;

  const nextLanguage =
    x < bounds.x + bounds.w * 0.5
      ? "jp"
      : "en";

  return jdSetLanguage(nextLanguage);
}

function jdDrawLanguageToggle() {
  if (!jdLanguageToggleVisible()) return;

  const button = jdLanguageToggleBounds();
  const selectedLanguage =
    JD.lang === "en"
      ? "en"
      : "jp";

  const halfWidth =
    button.w * 0.5;

  const activePulse =
    0.5 +
    Math.sin(
      (typeof ElapsedTime === "number" ? ElapsedTime : 0) *
      2.6
    ) * 0.5;

  // 真夜中コーラと同じ、暗い真鍮プレート。
  rectMode(CORNER);
  noStroke();

  fill(
    50,
    34,
    25,
    232
  );

  rect(
    button.x,
    button.y,
    button.w,
    button.h,
    5
  );

  noFill();

  stroke(
    173,
    126,
    69,
    218
  );

  strokeWidth(1.15);

  rect(
    button.x + 0.5,
    button.y + 0.5,
    button.w - 1,
    button.h - 1,
    5
  );

  // 中央の仕切り。
  stroke(
    125,
    83,
    48,
    205
  );

  line(
    button.x + halfWidth,
    button.y + 3,
    button.x + halfWidth,
    button.y + button.h - 3
  );

  noStroke();

  function drawLanguagePlateHalf(
    language,
    label,
    x
  ) {
    const active =
      selectedLanguage === language;

    if (active) {
      // 選択側だけ、薄い琥珀色が呼吸する。
      fill(
        232,
        167,
        73,
        25 + activePulse * 17
      );

      rect(
        x + 2,
        button.y + 2,
        halfWidth - 4,
        button.h - 4,
        3
      );

      fill(
        244,
        161,
        65,
        180 + activePulse * 50
      );

      ellipse(
        x + 8,
        button.y + button.h * 0.5,
        4.2,
        4.2
      );
    } else {
      fill(
        95,
        69,
        50,
        120
      );

      ellipse(
        x + 8,
        button.y + button.h * 0.5,
        3.2,
        3.2
      );
    }

    jdPrimaryFont();

    fill(
      active ? 244 : 220,
      active ? 198 : 202,
      active ? 133 : 180,
      active ? 248 : 155
    );

    fontSize(10);
    textAlign(CENTER);

    text(
      label,
      x + halfWidth * 0.60,
      button.y + button.h * 0.5 - 0.5
    );
  }

  drawLanguagePlateHalf(
    "jp",
    "JP",
    button.x
  );

  drawLanguagePlateHalf(
    "en",
    "EN",
    button.x + halfWidth
  );

  rectMode(CORNER);
  textAlign(CENTER);
  noStroke();
}

let JD_POSTER_CAPTURE_CLEAN = false;

// =====================================================
// 完成ポスターの画像保存
//
// 保存UIはDOMに置くことで、キャンバスから作るPNGへは入れない。
// iPhoneでは共有シートから「画像を保存」を選べ、共有非対応の環境では
// 通常のダウンロードへ安全にフォールバックする。
// =====================================================

function jdPosterSaveButtonVisible() {
  return (
    JD.state === STATE_POSTER_HOLD &&
    (JD.posterTimer || 0) >= 0.16
  );
}

function jdFindGameCanvas() {
  if (typeof document === "undefined") return null;

  const canvases = Array.from(
    document.querySelectorAll("canvas")
  );

  if (canvases.length === 0) return null;

  return canvases.reduce(
    (largest, canvas) => {
      const largestArea =
        (largest.width || 0) *
        (largest.height || 0);
      const canvasArea =
        (canvas.width || 0) *
        (canvas.height || 0);

      return canvasArea > largestArea
        ? canvas
        : largest;
    }
  );
}

function jdPosterSaveButtonText() {
  const status = JD.posterSaveStatus;
  const statusUntil =
    Number.isFinite(JD.posterSaveStatusUntil)
      ? JD.posterSaveStatusUntil
      : 0;

  if (status && jdNowMs() < statusUntil) {
    return jdT(
      `poster.${status}`,
      jdT("poster.save", "SAVE IMAGE")
    );
  }

  return jdT("poster.save", "SAVE IMAGE");
}

function jdSetPosterSaveStatus(status, duration = 1.4) {
  JD.posterSaveStatus = status;
  JD.posterSaveStatusUntil =
    jdNowMs() + duration * 1000;
}

function jdBuildPosterImageFileName() {
  const item = jdGetPosterItem();
  const targetType = String(
    (item && item.targetType) || ""
  ).toLowerCase();

  if (targetType === "failure") {
    return "junkissa-dive-empty-plate.png";
  }

  const toppingItems = jdGetProductToppings(item);
  const uniqueToppings = Array.from(
    new Set(toppingItems.map((topping) => topping.item))
  );

  let ingredient = String(
    (item && item.item) || ""
  ).toLowerCase();

  if (toppingItems.length > 1) {
    ingredient = uniqueToppings.length === 1
      ? `double-${uniqueToppings[0].toLowerCase()}`
      : "mixed";
  }

  ingredient = ingredient.replace(/[^a-z0-9_-]/g, "");

  const product = {
    melon: "melon-soda",
    cake: "shortcake",
    coffee: "coffee"
  }[targetType] || "";

  const menuSlug = [ingredient, product]
    .filter(Boolean)
    .join("-");

  return `junkissa-dive-${menuSlug || "poster"}.png`;
}

function jdConsumePosterSavePointer(event) {
  JD.posterSaveInputUntil = jdNowMs() + 360;

  if (!event) return;

  if (typeof event.preventDefault === "function") {
    event.preventDefault();
  }

  if (typeof event.stopPropagation === "function") {
    event.stopPropagation();
  }
}

function jdEnsurePosterSaveButton() {
  if (typeof document === "undefined") return null;

  let button = document.getElementById(
    "jd-poster-save"
  );

  if (button) return button;

  button = document.createElement("button");
  button.id = "jd-poster-save";
  button.type = "button";
  button.setAttribute(
    "aria-label",
    jdT("poster.save", "SAVE IMAGE")
  );

  button.style.position = "fixed";
  button.style.zIndex = "10000";
  button.style.display = "none";
  button.style.margin = "0";
  button.style.padding = "0";
  button.style.boxSizing = "border-box";
  button.style.border = "1.5px solid rgba(248,232,197,0.82)";
  button.style.borderRadius = "7px";
  button.style.background = "rgba(53,31,27,0.84)";
  button.style.color = "rgb(248,232,197)";
  button.style.fontFamily = JD_FONT_PRIMARY;
  button.style.fontWeight = "700";
  button.style.letterSpacing = "0.04em";
  button.style.boxShadow = "0 2px 8px rgba(0,0,0,0.24)";
  button.style.touchAction = "manipulation";
  button.style.webkitTapHighlightColor = "transparent";

  // iOS / itch.io iframe:
  // touchend の preventDefault() が後続 click を抑止することがあるため、
  // Pointer Events を一本化し、pointerup 自体を保存操作にする。
  let savePointerActive = false;
  let saveLastActivatedAt = 0;

  const restorePosterSaveButtonPress = function() {
    button.style.transform = "scale(1)";
    button.style.opacity = "1";
  };

  button.addEventListener("pointerdown", function(event) {
    savePointerActive = true;
    jdConsumePosterSavePointer(event);

    // 押せたことが一発で分かる、小さな押し込みフィードバック。
    button.style.transformOrigin = "center";
    button.style.transform = "scale(0.96)";
    button.style.opacity = "0.82";
  });

  button.addEventListener("pointercancel", function(event) {
    savePointerActive = false;
    jdConsumePosterSavePointer(event);
    restorePosterSaveButtonPress();
  });

  button.addEventListener("pointerup", function(event) {
    jdConsumePosterSavePointer(event);
    restorePosterSaveButtonPress();

    if (!savePointerActive) return;
    savePointerActive = false;

    saveLastActivatedAt = jdNowMs();

    // 非同期処理へ入る前に表示を変え、タップ受付を即座に知らせる。
    jdSetPosterSaveStatus("preparing", 3);
    jdSavePosterImage();
  });

  // キーボード操作や Pointer Events 非対応環境用。
  // pointerup 後に発生する click では二重保存しない。
  button.addEventListener("click", function(event) {
    jdConsumePosterSavePointer(event);

    if (jdNowMs() - saveLastActivatedAt < 700) {
      return;
    }

    saveLastActivatedAt = jdNowMs();
    jdSetPosterSaveStatus("preparing", 3);
    jdSavePosterImage();
  });

  document.body.appendChild(button);
  return button;
}

function jdSyncPosterSaveButton() {
  if (typeof document === "undefined") return;

  const button = jdEnsurePosterSaveButton();
  if (!button) return;

  // タイトル画面で選んだ言語を、表示文と読み上げ名の両方へ反映する。
  button.setAttribute(
    "aria-label",
    jdT("poster.save", "SAVE IMAGE")
  );

  const canvas = jdFindGameCanvas();
  if (!jdPosterSaveButtonVisible() || !canvas) {
    button.style.display = "none";
    return;
  }

  const rect = canvas.getBoundingClientRect();
  if (!(rect.width > 0 && rect.height > 0)) {
    button.style.display = "none";
    return;
  }

  // ポスター右上の余白へ置き、タイトル・主役・価格から離す。
  const logicalX = 234;
  // 上辺の内側罫とほぼ同じ高さへ合わせ、ポスターの角に収める。
  const logicalY = 592;
  const logicalW = 112;
  const logicalH = 34;
  const canvasCoordinateW =
    typeof WIDTH === "number" && WIDTH > 0
      ? WIDTH
      : (canvas.width || JD.LOGICAL_W);
  const canvasCoordinateH =
    typeof HEIGHT === "number" && HEIGHT > 0
      ? HEIGHT
      : (canvas.height || JD.LOGICAL_H);
  const coordinateToCssX = rect.width / canvasCoordinateW;
  const coordinateToCssY = rect.height / canvasCoordinateH;
  const logicalScaleX = JD.scale * coordinateToCssX;
  const logicalScaleY = JD.scale * coordinateToCssY;
  const viewportLeft = rect.left + JD.offsetX * coordinateToCssX;
  const viewportTop = rect.top +
    (
      canvasCoordinateH -
      JD.offsetY -
      JD.LOGICAL_H * JD.scale
    ) * coordinateToCssY;

  // PCの余白を含むCanvasでも、360×640のポスター右上へ固定する。
  button.style.left = `${viewportLeft + logicalX * logicalScaleX}px`;
  button.style.top = `${viewportTop + (JD.LOGICAL_H - logicalY - logicalH) * logicalScaleY}px`;
  button.style.width = `${logicalW * logicalScaleX}px`;
  button.style.height = `${logicalH * logicalScaleY}px`;
  button.style.fontSize = `${Math.max(10, 9.5 * Math.min(logicalScaleX, logicalScaleY))}px`;
  button.textContent = jdPosterSaveButtonText();
  button.style.display = "block";
}

function jdCreatePosterCaptureCanvas(canvas) {
  if (
    !canvas ||
    typeof document === "undefined" ||
    typeof document.createElement !== "function"
  ) {
    return null;
  }

  const canvasCoordinateW =
    typeof WIDTH === "number" && WIDTH > 0
      ? WIDTH
      : (canvas.width || JD.LOGICAL_W);
  const canvasCoordinateH =
    typeof HEIGHT === "number" && HEIGHT > 0
      ? HEIGHT
      : (canvas.height || JD.LOGICAL_H);
  const backingScaleX = canvas.width / canvasCoordinateW;
  const backingScaleY = canvas.height / canvasCoordinateH;
  const viewportTop =
    canvasCoordinateH -
    JD.offsetY -
    JD.LOGICAL_H * JD.scale;

  const sourceX = Math.max(
    0,
    JD.offsetX * backingScaleX
  );
  const sourceY = Math.max(
    0,
    viewportTop * backingScaleY
  );
  const sourceW = Math.min(
    canvas.width - sourceX,
    JD.LOGICAL_W * JD.scale * backingScaleX
  );
  const sourceH = Math.min(
    canvas.height - sourceY,
    JD.LOGICAL_H * JD.scale * backingScaleY
  );

  if (!(sourceW > 0 && sourceH > 0)) {
    return null;
  }

  const captureCanvas =
    document.createElement("canvas");
  captureCanvas.width = Math.max(
    1,
    Math.round(sourceW)
  );
  captureCanvas.height = Math.max(
    1,
    Math.round(sourceH)
  );

  const context =
    captureCanvas.getContext("2d");
  if (!context) return null;

  // PCの左右・上下余白を除き、ゲームの論理画面だけをPNGへ写す。
  context.drawImage(
    canvas,
    sourceX,
    sourceY,
    sourceW,
    sourceH,
    0,
    0,
    captureCanvas.width,
    captureCanvas.height
  );

  return captureCanvas;
}

function jdDataUrlToPngBlob(dataUrl) {
  if (
    typeof Blob === "undefined" ||
    typeof atob !== "function"
  ) {
    return null;
  }

  const base64 = String(dataUrl || "").split(",")[1];
  if (!base64) return null;

  let binary;

  try {
    binary = atob(base64);
  } catch (_error) {
    return null;
  }

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob(
    [bytes],
    { type: "image/png" }
  );
}

function jdNamePosterPngBlob(blob, fileName) {
  if (!blob) return null;

  if (typeof File === "function") {
    try {
      return new File(
        [blob],
        fileName,
        { type: "image/png" }
      );
    } catch (_error) {
    }
  }

  try {
    blob.name = fileName;
  } catch (_error) {
  }

  return blob;
}

function jdShowPosterImageFallback(dataUrl, fileName) {
  if (
    typeof document === "undefined" ||
    !dataUrl
  ) {
    jdSetPosterSaveStatus("unavailable");
    return false;
  }

  let overlay = document.getElementById("jd-poster-image-fallback");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "jd-poster-image-fallback";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "20000";
    overlay.style.display = "none";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.flexDirection = "column";
    overlay.style.gap = "10px";
    overlay.style.padding = "18px";
    overlay.style.background = "rgba(20,14,12,0.96)";
    overlay.style.touchAction = "manipulation";

    const image = document.createElement("img");
    image.id = "jd-poster-image-fallback-img";
    image.alt = "JUNKISSA DIVE poster";
    image.style.display = "block";
    image.style.maxWidth = "min(88vw, 360px)";
    image.style.maxHeight = "78vh";
    image.style.width = "auto";
    image.style.height = "auto";
    image.style.objectFit = "contain";
    image.style.borderRadius = "2px";
    image.style.boxShadow = "0 8px 28px rgba(0,0,0,0.45)";
    // iOS: generated image must allow the native long-press menu.
    image.style.webkitTouchCallout = "default";
    image.style.userSelect = "auto";
    image.style.webkitUserSelect = "auto";

    const note = document.createElement("div");
    note.id = "jd-poster-image-fallback-note";
    note.style.maxWidth = "360px";
    note.style.color = "rgb(248,232,197)";
    note.style.fontFamily = JD_FONT_PRIMARY;
    note.style.fontSize = "13px";
    note.style.lineHeight = "1.5";
    note.style.textAlign = "center";
    note.style.userSelect = "none";

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Close");
    close.style.position = "absolute";
    close.style.top = "12px";
    close.style.right = "14px";
    close.style.width = "40px";
    close.style.height = "40px";
    close.style.border = "0";
    close.style.background = "transparent";
    close.style.color = "rgb(248,232,197)";
    close.style.font = "30px/40px system-ui, sans-serif";
    close.style.touchAction = "manipulation";

    const closeOverlay = function(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      overlay.style.display = "none";
      JD.posterSaveInputUntil = jdNowMs() + 360;
    };

    close.addEventListener("click", closeOverlay);
    overlay.addEventListener("click", function(event) {
      if (event.target === overlay) {
        closeOverlay(event);
      }
    });

    overlay.appendChild(image);
    overlay.appendChild(note);
    overlay.appendChild(close);
    document.body.appendChild(overlay);
  }

  const image = document.getElementById("jd-poster-image-fallback-img");
  const note = document.getElementById("jd-poster-image-fallback-note");

  if (!image || !note) {
    jdSetPosterSaveStatus("unavailable");
    return false;
  }

  image.src = dataUrl;
  image.setAttribute("download", fileName || "junkissa-dive-poster.png");

  note.textContent =
    JD.lang === "en"
      ? "Press and hold the image to save or share it."
      : "画像を長押しして、保存または共有してください。";

  overlay.style.display = "flex";
  JD.posterSaveInputUntil = jdNowMs() + 600;

  trackJunkissaDiveEvent(
    "Result Save",
    {
      method: "image_fallback",
      language: JD.lang === "en" ? "en" : "jp",
      poster_type: String(
        (
          jdGetPosterItem() &&
          jdGetPosterItem().targetType
        ) || "failure"
      )
    }
  );

  JD.posterSaveStatus = null;
  JD.posterSaveStatusUntil = 0;
  return true;
}

async function jdSavePosterImage() {
  const canvas = jdFindGameCanvas();
  if (!canvas) {
    jdSetPosterSaveStatus("unavailable");
    return;
  }

  // Keep the whole operation rooted in the button's user gesture.
  // itch.io runs the game in an iframe, where Web Share/download permissions
  // can differ from a standalone page.
  JD.posterSaveInputUntil = jdNowMs() + 1200;

  JD_POSTER_CAPTURE_CLEAN = true;
  try {
    // 保存用の再描画も通常フレームと同じ論理座標変換で描く。
    // iframeや小さいスマートフォン画面では JD.scale が 1 未満になるため、
    // ここを素の360x640で描くと右端・上端がキャンバス外へはみ出してしまう。
    if (!Number.isFinite(JD.scale) || JD.scale <= 0) {
      jdUpdateScale();
    }

    pushMatrix();
    try {
      translate(JD.offsetX, JD.offsetY);
      scale(JD.scale);
      jdDrawCompletionPosterStatic();
    } finally {
      popMatrix();
    }
  } catch (_error) {
  }

  const captureCanvas =
    jdCreatePosterCaptureCanvas(canvas);

  JD_POSTER_CAPTURE_CLEAN = false;
  if (
    !captureCanvas ||
    typeof captureCanvas.toDataURL !== "function"
  ) {
    jdSetPosterSaveStatus("unavailable");
    return;
  }

  let dataUrl = "";

  try {
    jdSetPosterSaveStatus("preparing", 3);
    dataUrl = captureCanvas.toDataURL("image/png");
  } catch (_error) {
    jdSetPosterSaveStatus("unavailable");
    return;
  }

  const fileName = jdBuildPosterImageFileName();
  const imageBlob = jdDataUrlToPngBlob(dataUrl);
  const imageFile = jdNamePosterPngBlob(imageBlob, fileName);

  if (!imageFile) {
    jdShowPosterImageFallback(dataUrl, fileName);
    return;
  }

  // First choice: native share sheet.
  try {
    const canUseShare =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      (
        typeof navigator.canShare !== "function" ||
        navigator.canShare({ files: [imageFile] })
      );

    if (canUseShare) {
      await navigator.share({
        files: [imageFile],
        title: jdT("receipt.shop", "JUNKISSA DIVE")
      });

      trackJunkissaDiveEvent(
        "Result Save",
        {
          method: "share",
          language: JD.lang === "en" ? "en" : "jp",
          poster_type: String(
            (
              jdGetPosterItem() &&
              jdGetPosterItem().targetType
            ) || "failure"
          )
        }
      );

      jdSetPosterSaveStatus("saved");
      return;
    }
  } catch (error) {
    // User cancellation is not an error. Just restore the normal button.
    if (error && error.name === "AbortError") {
      JD.posterSaveStatus = null;
      JD.posterSaveStatusUntil = 0;
      return;
    }
    // In an itch.io iframe Web Share can be denied by iframe policy.
    // Continue to the visible-image fallback below.
  }

  // On iPhone/iPad inside itch.io, synthetic downloads can be silently blocked.
  // Show the generated PNG itself so the native long-press Save/Share menu works.
  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent || "");

  const inFrame =
    typeof window !== "undefined" &&
    window.self !== window.top;

  if (isIOS || inFrame) {
    jdShowPosterImageFallback(dataUrl, fileName);
    return;
  }

  // Standalone/desktop fallback: normal browser download.
  try {
    if (
      typeof document === "undefined" ||
      typeof URL === "undefined" ||
      typeof URL.createObjectURL !== "function"
    ) {
      throw new Error("Object URL unavailable");
    }

    const objectUrl = URL.createObjectURL(imageFile);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();

    trackJunkissaDiveEvent(
      "Result Save",
      {
        method: "download",
        language: JD.lang === "en" ? "en" : "jp",
        poster_type: String(
          (
            jdGetPosterItem() &&
            jdGetPosterItem().targetType
          ) || "failure"
        )
      }
    );

    setTimeout(function() {
      URL.revokeObjectURL(objectUrl);
    }, 1200);

    jdSetPosterSaveStatus("saved");
  } catch (_error) {
    jdShowPosterImageFallback(dataUrl, fileName);
  }
}

function jdResetAll() {
  jdStopAllSoundLoops(0.25);

  JD.state = STATE_TITLE;
  JD.gamePhase = PHASE_SHIFT_START;

  JD.scale = 1;
  JD.offsetX = 0;
  JD.offsetY = 0;

  JD.worldW = 980;
  JD.worldH = 640;
  JD.tableY = 164;
  JD.launcher = { x: 760, y: 248 };

  JD.gravity = 980;
  JD.shotPower = 10.2;
  JD.maxPull = 104;

  JD.camScreenX = JD.LOGICAL_W / 2;
  JD.camScreenY = 300;
  JD.cam = { x: 655, y: 252, zoom: 1, tx: 655, ty: 252, tz: 1 };

  JD.shake = 0;
  JD.particles = [];
  JD.floatTexts = [];
  JD.placedFoods = [];
  JD.debugMode = JD.webOptions ? !!JD.webOptions.debugDefault : false;

  // アプリを開いて最初のシフトだけ、バイト本人の独白を表示する。
  // 再プレイでは繰り返さず、ページ再読み込み時にだけ戻る。
  JD.openingMonologueSeen = false;

  JD.activePointerId = null;
  JD.lastTrail = null;
  JD.currentTrail = null;
  JD.lastTrailResult = "-";
  JD.lastPowerRatio = 0;
  JD.lastAngleName = "-";

  jdInitTables();
  jdResetShift();
}

function jdInitTables() {
  JD.priceBook = {
    "CHERRY_MELON SODA": { price: 600, name: "オウドウノ アカイヤツ", comment: "シュワット キマッタ" },
    "SUGAR_COFFEE": { price: 500, name: "イツモノ ヤツ", comment: "ニガミト アマミ" },
    "STRAWBERRY_CAKE": { price: 650, name: "シュヤクノ キカン", comment: "オマタセシマシタ" },
    "CHERRY_COFFEE": { price: 430, name: "ナゾノ サンミ", comment: "ミナカッタ コトニ シタ" },
    "CHERRY_CAKE": { price: 450, name: "イロドリ ダケ", comment: "ワルクハナイ" },
    "SUGAR_MELON SODA": { price: 480, name: "アマスギル ミドリ", comment: "トケキラナイ" },
    "SUGAR_CAKE": { price: 520, name: "ジャリジャリ ケーキ", comment: "ハカイリョクアリ" },
    "STRAWBERRY_COFFEE": { price: 420, name: "アサノ マチガイ", comment: "スッパニガイ" },
    "STRAWBERRY_MELON SODA": { price: 530, name: "アカト ミドリ", comment: "ミタメハ ヨイ" }
  };

  // 販売額をそのままゲームの評価値として使う。
  // 商品の難しさはメロンソーダ > ケーキ > コーヒーとし、
  // 組み合わせと着地技術で一投ごとの売上を上積みする。
  JD.scoreRules = {
    targetBase: {
      coffee: 350,
      cake: 500,
      melon: 650
    },
    toppingBonus: {
      CHERRY: {
        coffee: 70,
        cake: 30,
        melon: 150
      },
      SUGAR: {
        coffee: 150,
        cake: 70,
        melon: 30
      },
      STRAWBERRY: {
        coffee: 30,
        cake: 150,
        melon: 70
      }
    },
    perfectBonus: 100,
    stabBonus: 120,
    bounceBonuses: [40, 20],
    rankThresholds: {
      // 1ターゲット1商品の集約後は理論上限が約3070点。
      // 全成功に加えて技術点も重ねた時だけ最高ランクへ届く幅にする。
      great: 2800,
      good: 2200,
      mid: 1400,
      low: 600
    }
  };

  // 完成商品の正式名称・ポスターの二行表記・説明文をここへ集約する。
  // JP/ENとも同じ組み合わせデータから名称と説明文を取得する。
  JD.recipeBook = {
    CHERRY_MELON_SODA: {
      menuName: { jp: "チェリーメロンソーダ", en: "Cherry Melon Soda" },
      posterTop: { jp: "チェリー", en: "CHERRY" },
      posterMain: { jp: "メロンソーダ", en: "MELON SODA" },
      description: { jp: "赤い実をひとつ沈めた、喫茶店の定番。", en: "A café classic crowned with a bright cherry." }
    },
    SUGAR_COFFEE: {
      menuName: { jp: "シュガーコーヒー", en: "Sugar Coffee" },
      posterTop: { jp: "シュガー", en: "SUGAR" },
      posterMain: { jp: "コーヒー", en: "COFFEE" },
      description: { jp: "ひとさじの甘さでほどける、深煎りの一杯。", en: "Dark roast softened by one spoonful of sugar." }
    },
    STRAWBERRY_CAKE: {
      menuName: { jp: "いちごショートケーキ", en: "Strawberry Shortcake" },
      posterTop: { jp: "いちご", en: "STRAWBERRY" },
      posterMain: { jp: "ショートケーキ", en: "SHORTCAKE" },
      description: { jp: "いちごが主役の、やわらかな喫茶店の定番。", en: "Soft shortcake with strawberry center stage." }
    },
    CHERRY_COFFEE: {
      menuName: { jp: "チェリーコーヒー", en: "Cherry Coffee" },
      posterTop: { jp: "チェリー", en: "CHERRY" },
      posterMain: { jp: "コーヒー", en: "COFFEE" },
      description: { jp: "甘酸っぱい余韻を残す、夜更けのコーヒー。", en: "Late-night coffee with a tart cherry finish." }
    },
    CHERRY_CAKE: {
      menuName: { jp: "チェリーショートケーキ", en: "Cherry Shortcake" },
      posterTop: { jp: "チェリー", en: "CHERRY" },
      posterMain: { jp: "ショートケーキ", en: "SHORTCAKE" },
      description: { jp: "赤い実を添えた、午後のショートケーキ。", en: "Cherry brightens a soft afternoon shortcake." }
    },
    SUGAR_MELON_SODA: {
      menuName: { jp: "シュガーメロンソーダ", en: "Sugar Melon Soda" },
      posterTop: { jp: "シュガー", en: "SUGAR" },
      posterMain: { jp: "メロンソーダ", en: "MELON SODA" },
      description: { jp: "ひとさじの甘さを重ねた、緑のソーダ。", en: "Green soda with an extra spoonful of sugar." }
    },
    SUGAR_CAKE: {
      menuName: { jp: "シュガーショートケーキ", en: "Sugar Shortcake" },
      posterTop: { jp: "シュガー", en: "SUGAR" },
      posterMain: { jp: "ショートケーキ", en: "SHORTCAKE" },
      description: { jp: "角砂糖の食感が楽しい、気まぐれケーキ。", en: "A whimsical cake with a sugar-cube crunch." }
    },
    STRAWBERRY_COFFEE: {
      menuName: { jp: "いちごコーヒー", en: "Strawberry Coffee" },
      posterTop: { jp: "いちご", en: "STRAWBERRY" },
      posterMain: { jp: "コーヒー", en: "COFFEE" },
      description: { jp: "ほのかな甘酸っぱさを添えた、夜のコーヒー。", en: "Night coffee with a hint of berry sweetness." }
    },
    STRAWBERRY_MELON_SODA: {
      menuName: { jp: "いちごメロンソーダ", en: "Strawberry Melon Soda" },
      posterTop: { jp: "いちご", en: "STRAWBERRY" },
      posterMain: { jp: "メロンソーダ", en: "MELON SODA" },
      description: { jp: "赤と緑がきらめく、夏のクリームソーダ。", en: "Red and green sparkle in summer cream soda." }
    }
  };

  JD.foodCatalog = {
    CHERRY: {
      name: "CHERRY", jp: "チェリー", shape: "circle", r: 10,
      col: color(245, 55, 55), bounce: 0.68, groundFriction: 0.82,
      gravityScale: 0.90, airDrag: 0.999
    },
    SUGAR: {
      name: "SUGAR", jp: "シュガー", shape: "rect", w: 18, h: 18,
      col: color(255, 255, 244), bounce: 0.24, groundFriction: 0.58,
      gravityScale: 1.18, airDrag: 0.996
    },
    STRAWBERRY: {
      name: "STRAWBERRY", jp: "いちご", shape: "oval", w: 22, h: 25,
      col: color(245, 80, 105), bounce: 0.40, groundFriction: 0.70,
      gravityScale: 1.00, airDrag: 0.9975
    }
  };

  JD.fortuneNames = ["CHERRY", "SUGAR", "STRAWBERRY"];
}

function jdResetShift() {
  // ==================================================
  // シフト結果
  // ==================================================

  JD.totalSales = 0;
  JD.results = [];
  JD.throwIndex = 0;

  JD.receiptTimer = 0;
  JD.receiptLines = [];

  // 完成ポスター（成功商品から生成、固定データはフォールバック用）
  JD.posterTimer = 0;
  JD.posterItem = null;
  JD.posterBestResult = null;
  JD.posterFocusKind = null;
  JD.posterCafeHoldTimer = 0;
  JD.posterCafeHoldStartCamera = null;
  JD.posterDismissTimer = 0;
  JD.posterDismissDuration = 1.26;
  JD.posterDismissSoundPlayed = false;

  // ==================================================
  // 画面上に残るオブジェクト
  // ==================================================

  JD.placedFoods = [];
  JD.particles = [];
  JD.floatTexts = [];

  // ==================================================
  // ターゲット
  // ==================================================

  JD.targets = [
    {
      id: "COFFEE",
      label: "COFFEE",
      x: 500,
      y: JD.tableY + 48,
      w: 78,
      h: 76,
      kind: "coffee",
      isLiquid: true,
      col: color(58, 31, 18)
    },
    {
      id: "CAKE",
      label: "CAKE",
      x: 310,
      y: JD.tableY + 48,
      w: 92,
      h: 74,
      kind: "cake",
      isLiquid: false,
      col: color(252, 239, 229)
    },
    {
      id: "MELON SODA",
      label: "MELON SODA",
      x: 120,
      y: JD.tableY + 82,
      w: 66,
      h: 158,
      kind: "melon",
      isLiquid: true,
      col: color(77, 226, 116)
    }
  ];

  // ==================================================
  // 障害物
  // ==================================================

  JD.obstacles = [
    {
      kind: "spoon",
      x: 620,
      y: JD.tableY + 24,
      w: 62,
      h: 10
    },
    {
      kind: "ticket",
      x: 400,
      y: JD.tableY + 38,
      w: 18,
      h: 54
    },
    {
      kind: "coaster",
      x: 210,
      y: JD.tableY + 8,
      r: 18
    }
  ];

  // 新しいシフト用の素材順
  jdBuildFortuneQueue();

  // ==================================================
  // 現在の素材・タッチ操作
  // ==================================================

  JD.food = null;

  JD.dragging = false;
  JD.activePointerId = null;
  JD.dragScreenStart = null;
  JD.dragScreenNow = null;

  JD.shiftStartTimer = 0.35;

  // 初回独白のページ状態。seenはシフトをまたいで維持する。
  JD.openingMonologuePage = 0;
  JD.openingMonologueTimer = 0;

  // 素材札の登場演出
  JD.itemTicketTimer = 0;

  // 再シフトではチュートリアルを再表示しない。
  // tutorialSeenはsetup時から維持する。
  JD.tutorialActive = false;
  JD.tutorialTimer = 0;

  // ==================================================
  // Fortune
  // ==================================================

  JD.pendingFood = null;
  JD.fortuneSpinning = false;
  JD.fortuneTimer = 0;
  JD.fortuneLastTickIndex = -1;
  JD.fortuneDuration = 0;
  JD.fortuneSelected = null;
  JD.fortuneDisplayName = null;
  JD.fortunePickedTimer = 0;

  // ==================================================
  // 発射軌跡・前回ショット情報
  // ==================================================

  JD.lastTrail = null;
  JD.currentTrail = null;
  JD.lastTrailResult = "-";
  JD.trailTick = 0;

  JD.lastPowerRatio = 0;
  JD.lastAngleName = "-";

  // ==================================================
  // 衝突・連続反射の履歴
  // ==================================================

  JD.lastBounceInfo = null;
  JD.bounceChain = 0;
  JD.stuckBounceTimer = 0;
  JD.pendingCakeSasari = false;

  // ==================================================
  // 命中・ズーム演出
  // ==================================================

  JD.hitEffectTimer = 0;
  JD.hitEffectDuration = 0;
  JD.hitEffectX = 0;
  JD.hitEffectY = 0;
  JD.hitEffectLabel = null;
  JD.hitEffectKind = null;
  JD.hitEffectPerfect = false;

  JD.perfectZoomActive = false;
  JD.hitZoomTimer = 0;
  JD.hitZoomX = 0;
  JD.hitZoomY = 0;
  JD.hitZoomLevel = 1;

  // ==================================================
  // その他の一時演出
  // ==================================================

  JD.shake = 0;
  JD.shakeDuration = 0;
  JD.shakeStrength = 0;
  JD.hitStopTimer = 0;

  // シフト内の一度きり効果音を初期化
  JD.itemTicketSoundPlayed = false;
  JD.soundLastPlayed = {};

  // 初期カメラへ戻す
  jdSetCameraClose(true);
}


function jdBuildFortuneQueue() {
  const bag = ["CHERRY", "CHERRY", "SUGAR", "SUGAR", "STRAWBERRY"];
  jdShuffleArray(bag);
  JD.queue = bag.map((name) => jdCloneFoodDef(JD.foodCatalog[name]));
}

function jdCloneFoodDef(src) {
  return { ...src };
}

function jdShuffleArray(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
}

function jdStartPlay() {
  const previousState =
    JD.state;

  jdResetShift();

  JD.state =
    STATE_PLAY;

  trackJunkissaDiveEvent(
    previousState === STATE_RECEIPT
      ? "Replay Start"
      : "Game Start",
    {
      language:
        JD.lang === "en"
          ? "en"
          : "jp"
    }
  );

  jdSetGamePhase(
    JD.openingMonologueSeen
      ? PHASE_SHIFT_START
      : PHASE_OPENING_MONOLOGUE
  );

  // ==================================================
  // 純喫茶ダイヴ共通の「呼吸」
  //
  // quick  : 文字のフェード
  // card   : 小さな札の動き
  // read   : 内容を読ませる時間
  // scene  : カメラ・紙・画面の移動
  // ==================================================

  JD.motion = {
    quick: 0.16,
    card: 0.24,
    read: 0.96,
    scene: 0.60,

    // 既存の紙・導入演出で使う時間。役割は変えず、段階的に整理する。
    short: 0.46,
    medium: 0.60,
    hold: 1.10,

    titleFade: 0.62,
    shiftFade: 0.68,
    shiftDuration: 7.40,

    fortuneSpin: 1.15,
    fortuneEnter: 0.46,
    fortuneExit: 0.46,
    fortuneHold: 1.10,

    itemTicketEnter: 0.46,
    resultNextBeat: 0.96,
    resultCardEnter: 0.16,
    resultCardExit: 0.16,

    hitNormal: 0.74,
    hitPerfect: 0.90,
    hitResultNormal: 1.04,
    hitResultPerfect: 1.20,

    receiptBackdrop: 0.78,
    receiptDropDelay: 0.08,
    receiptDrop: 0.62,
    receiptPrintDelay: 0.16,
    receiptButtonDelay: 0.78
  };

  // 同じ役割の文字は、画面が違っても同じ大きさから始める。
  // 長い商品名だけは各描画箇所で描画幅に合わせて縮小する。
  JD.typeScale = {
    hero: 36,
    result: 25,
    cardMain: 16,
    cardSub: 10,
    receiptShop: 13.5,
    receiptBrand: 9.5,
    receiptItem: 9.5,
    receiptMeta: 9.5,
    receiptTotal: 15,
    receiptFooter: 7.5
  };

  // 開店導入
  JD.shiftStartDuration =
    JD.motion.shiftDuration;

  JD.shiftStartTimer =
    JD.shiftStartDuration;

  JD.shiftFadeInDuration =
    JD.motion.shiftFade;

  JD.shiftFadeInTimer =
    JD.shiftFadeInDuration;

  // 前回のタイトル・導入演出を初期化
  JD.titleExitTimer = 0;
  JD.titleExitDuration = 0;

  // 前回の素材札演出を初期化
  JD.itemTicketTimer = 0;

  // 着地結果から次のFortuneへ渡す、短いテンポ用の中継演出。
  JD.resultBeatTimer = 0;
  JD.resultBeatDuration = 0;
  JD.resultBeatRemaining = 0;

  // 前回のFortune表示状態を初期化
  JD.fortuneSpinning = false;
  JD.fortuneTimer = 0;
  JD.fortuneDuration = 0;
  JD.fortunePickedTimer = 0;
  JD.fortuneDisplayName = null;
  JD.fortuneSelected = null;
  JD.pendingFood = null;

  // 前回の結果画面演出を初期化
  JD.receiptTimer = 0;
  JD.posterTimer = 0;
  JD.posterVisualTimer = 0;
  JD.posterTransitionTimer = 0;
  JD.posterRevealTimer = 0;
  JD.posterDismissTimer = 0;
  JD.posterDismissDuration = 1.26;
  JD.posterItem = null;

  // 店内を静めながら代表商品へ寄り、ポスター組み立てへつなぐ。
  // 急な切り替えにせず、一呼吸置いてから印刷工程へつなぐ。
  JD.posterTransitionDuration = 0.82;
  JD.posterRevealDuration = 1.48;
  JD.posterHoldInputDelay = 0.14;
  // 撤収直後の近景から、レシート背景の遠景へカメラを引く時間。
  JD.posterCafeHoldDuration = 0.56;
  JD.posterCafeHoldStartCamera = null;
  JD.posterPhaseName = "NONE";

  // 店内全景から開始
  JD.cam.x = 515;
  JD.cam.y = 285;
  JD.cam.zoom = 0.42;

  JD.cam.tx = 515;
  JD.cam.ty = 285;
  JD.cam.tz = 0.42;
}





function jdSetGamePhase(phase) {
  JD.gamePhase = phase;
}

function jdGetOpeningMonologuePages() {
  // BUDDYテーマ：
  // 長い付き合いの相手が始めた深夜喫茶を、主人公が静かに手伝っている。
  // 日本語と英語は直訳で揃えず、それぞれ自然に読める長さとリズムを優先する。
  if (jdIsEnglish()) {
    return [
      {
        lines: [
          "We've known each other a long time.",
          "",
          "We've done all sorts of things together.",
          "I just never expected a café to be one of them."
        ],
        size: 13.2,
        lineGap: 24,
        weight: "regular"
      },
      {
        lines: [
          "A little café that opens after midnight.",
          "",
          "I've only been helping out for a few days.",
          "There's just one rule I was taught."
        ],
        size: 13.2,
        lineGap: 24,
        weight: "regular"
      },
      {
        lines: [
          "“Launch the toppings. Make them land.”"
        ],
        size: 16,
        lineGap: 26,
        weight: "bold"
      },
      {
        lines: [
          "...I don't really get it.",
          "But if they land right,",
          "apparently we can serve them."
        ],
        size: 13.2,
        lineGap: 24,
        weight: "regular"
      },
      {
        lines: [
          "Well, time to get started."
        ],
        size: 16,
        lineGap: 26,
        weight: "regular"
      }
    ];
  }

  return [
    {
      lines: [
        "あの人とは、ずいぶん長い付き合いになる。",
        "",
        "いろんなことを一緒にやってきたけど、",
        "まさか喫茶店まで始めるとは思わなかった。"
      ],
      size: 14.5,
      lineGap: 26,
      weight: "regular"
    },
    {
      lines: [
        "深夜だけ開く、小さな喫茶店。",
        "",
        "ここで手伝いを始めて、まだ数日。",
        "最初に教えられた仕事はひとつだけ。"
      ],
      size: 14.5,
      lineGap: 26,
      weight: "regular"
    },
    {
      lines: [
        "「トッピングは飛ばして乗せて」"
      ],
      size: 18,
      lineGap: 28,
      weight: "bold"
    },
    {
      lines: [
        "……なんだかよく分からないけど、",
        "うまく乗れば商品になるらしい。"
      ],
      size: 14.5,
      lineGap: 28,
      weight: "regular"
    },
    {
      lines: [
        "まぁ、今日もはじめますか。"
      ],
      size: 17,
      lineGap: 28,
      weight: "regular"
    }
  ];
}

function jdOpeningMonologueDuration(pageIndex) {
  return JD_OPENING_MONOLOGUE_DURATIONS[pageIndex] || 2.8;
}

function jdAdvanceOpeningMonologuePage() {
  const pages = jdGetOpeningMonologuePages();

  const pageIndex =
    Number.isInteger(JD.openingMonologuePage)
      ? JD.openingMonologuePage
      : 0;

  if (
    pageIndex >=
    pages.length - 1
  ) {
    JD.openingMonologueSeen = true;
    JD.openingMonologuePage = 0;
    JD.openingMonologueTimer = 0;

    jdSetGamePhase(
      PHASE_SHIFT_START
    );

    JD.shiftStartTimer =
      Number.isFinite(
        JD.shiftStartDuration
      )
        ? JD.shiftStartDuration
        : 7.4;

    JD.shiftFadeInTimer =
      Number.isFinite(
        JD.shiftFadeInDuration
      )
        ? JD.shiftFadeInDuration
        : 0.68;

    return;
  }

  JD.openingMonologuePage =
    pageIndex + 1;

  JD.openingMonologueTimer = 0;
}

function jdUpdateOpeningMonologue(dt) {
  const pageIndex =
    Number.isInteger(JD.openingMonologuePage)
      ? JD.openingMonologuePage
      : 0;

  const duration =
    jdOpeningMonologueDuration(
      pageIndex
    );

  JD.openingMonologueTimer =
    (
      Number.isFinite(
        JD.openingMonologueTimer
      )
        ? JD.openingMonologueTimer
        : 0
    ) +
    dt;

  if (
    JD.openingMonologueTimer >=
    duration
  ) {
    jdAdvanceOpeningMonologuePage();
  }
}


function jdSkipOpeningMonologue() {
  JD.openingMonologueSeen = true;
  JD.openingMonologuePage = 0;
  JD.openingMonologueTimer = 0;

  jdSetGamePhase(
    PHASE_SHIFT_START
  );

  JD.shiftStartTimer =
    Number.isFinite(
      JD.shiftStartDuration
    )
      ? JD.shiftStartDuration
      : 7.4;

  JD.shiftFadeInTimer =
    Number.isFinite(
      JD.shiftFadeInDuration
    )
      ? JD.shiftFadeInDuration
      : 0.68;
}

function jdTapOpeningMonologue() {
  const pageIndex =
    Number.isInteger(JD.openingMonologuePage)
      ? JD.openingMonologuePage
      : 0;

  const duration =
    jdOpeningMonologueDuration(
      pageIndex
    );

  const fadeOutStart =
    Math.max(
      JD_OPENING_MONOLOGUE_FADE_IN,
      duration -
        JD_OPENING_MONOLOGUE_FADE_OUT
    );

  const timer =
    Number.isFinite(
      JD.openingMonologueTimer
    )
      ? JD.openingMonologueTimer
      : 0;

  // フェードイン中の最初のタップは、文章を完全表示する。
  if (
    timer <
    JD_OPENING_MONOLOGUE_FADE_IN
  ) {
    JD.openingMonologueTimer =
      JD_OPENING_MONOLOGUE_FADE_IN;

    return;
  }

  // 完全表示中のタップは、急に切らずフェードアウトへ送る。
  if (
    timer <
    fadeOutStart
  ) {
    JD.openingMonologueTimer =
      fadeOutStart;

    return;
  }

  // すでに消え始めている時は、次のページへすぐ進める。
  jdAdvanceOpeningMonologuePage();
}

function jdDrawOpeningMonologue() {
  const W = JD.LOGICAL_W;
  const H = JD.LOGICAL_H;

  const pages =
    jdGetOpeningMonologuePages();

  const pageIndex =
    jdClamp(
      Number.isInteger(
        JD.openingMonologuePage
      )
        ? JD.openingMonologuePage
        : 0,
      0,
      pages.length - 1
    );

  const page =
    pages[pageIndex];

  const duration =
    jdOpeningMonologueDuration(
      pageIndex
    );

  const timer =
    jdClamp(
      Number.isFinite(
        JD.openingMonologueTimer
      )
        ? JD.openingMonologueTimer
        : 0,
      0,
      duration
    );

  const fadeInRaw =
    jdClamp(
      timer /
        JD_OPENING_MONOLOGUE_FADE_IN,
      0,
      1
    );

  const fadeOutRaw =
    jdClamp(
      (
        duration -
        timer
      ) /
        JD_OPENING_MONOLOGUE_FADE_OUT,
      0,
      1
    );

  const fadeIn =
    fadeInRaw *
    fadeInRaw *
    (
      3 -
      2 * fadeInRaw
    );

  const fadeOut =
    fadeOutRaw *
    fadeOutRaw *
    (
      3 -
      2 * fadeOutRaw
    );

  const textAlpha =
    Math.min(
      fadeIn,
      fadeOut
    );

  rectMode(CORNER);
  noStroke();

  // 店内はかすかに残し、文字だけが静かに入れ替わる暗幕。
  fill(
    18,
    13,
    13,
    242
  );

  rect(
    -40,
    -40,
    W + 80,
    H + 80
  );

  textAlign(CENTER);

  jdFontForLanguage(
    page.weight ||
    "regular"
  );

  fontSize(
    page.size ||
    15
  );

  const lines =
    Array.isArray(page.lines)
      ? page.lines
      : [];

  const lineGap =
    Number.isFinite(
      page.lineGap
    )
      ? page.lineGap
      : 27;

  const centerY = 344;

  const startY =
    centerY +
    Math.max(
      0,
      lines.length - 1
    ) *
    lineGap /
    2;

  fill(
    244,
    229,
    198,
    255 * textAlpha
  );

  for (
    let i = 0;
    i < lines.length;
    i += 1
  ) {
    if (!lines[i]) continue;

    const lineY =
      startY -
      i *
      lineGap;

    text(
      lines[i],
      W / 2,
      lineY
    );

  }

  // 初回導入は読ませつつ、再プレイや急いでいる時には静かに飛ばせる。
  // 右下へ小さく置き、本文より目立たせない。
  textAlign(RIGHT);
  jdReceiptFont();
  fontSize(9.5);

  fill(
    244,
    229,
    198,
    118
  );

  text(
    "SKIP",
    W - 22,
    44
  );

  rectMode(CORNER);
  textAlign(CENTER);
  noStroke();
}


function jdExpectedGamePhase() {
  if (JD.state !== STATE_PLAY) return "-";
  if (JD.gamePhase === PHASE_FORTUNE || JD.fortuneSpinning || JD.pendingFood) return PHASE_FORTUNE;
  if (JD.food && JD.food.resolved) return PHASE_RESULT;
  if (JD.food && JD.food.launched) return PHASE_FLYING;
  if (JD.dragging) return PHASE_AIMING;
  if (JD.food) return PHASE_AIM;
  return JD.gamePhase || PHASE_SHIFT_START;
}

function jdSyncGamePhase() {
  if (JD.state === STATE_PLAY) JD.gamePhase = jdExpectedGamePhase();
}

function jdNextFood() {
  JD.resultBeatTimer = 0;
  JD.resultBeatDuration = 0;
  JD.resultBeatRemaining = 0;

  JD.throwIndex += 1;
  JD.dragging = false;
  JD.dragScreenStart = null;
  JD.dragScreenNow = null;
  JD.hitZoomTimer = 0;
  JD.perfectZoomActive = false;
  JD.hitEffectTimer = 0;
  JD.pendingCakeSasari = false;

  if (JD.throwIndex > JD.queue.length) {
    JD.food = null;

    // 全投球の確定後に、その日の代表候補を一度だけ選ぶ。
    JD.posterBestResult =
      jdSelectBestPosterResult(
        JD.results
      );

    JD.receiptLines = jdMakeReceiptLines();
    JD.receiptTimer = 0;

    // ポスター準備：代表候補から表示データを先に確定する。
    // 全投失敗時は空皿ポスター、結果自体がない場合だけ固定プレビューを使う。
    // 商品名・店内のフォーカス先・ヒーロー描画を同じデータで共有する。
    JD.posterItem = jdBuildPosterItem(
      JD.posterBestResult
    );
    JD.posterPhaseName = "FOCUS";
    JD.posterTimer = 0;
    JD.posterVisualTimer = 0;
    JD.posterTransitionTimer = 0;
    JD.posterTransitionDuration = 0.78;
    JD.posterRevealDuration = 1.08;
    JD.posterRevealTimer = 0;
    JD.posterFocusKind =
      JD.posterItem && JD.posterItem.targetType
        ? JD.posterItem.targetType
        : "melon";

    const successfulOrders =
      Array.isArray(JD.results)
        ? JD.results.filter(
            (result) =>
              result &&
              Number(result.price) > 0
          ).length
        : 0;

    trackJunkissaDiveEvent(
      "Shift Complete",
      {
        language:
          JD.lang === "en"
            ? "en"
            : "jp",
        total_sales: String(
          Math.round(JD.totalSales || 0)
        ),
        successful_orders: String(
          successfulOrders
        ),
        poster_type: String(
          JD.posterFocusKind || "failure"
        )
      }
    );

    // 最後の投球位置ではなく、選出した代表商品の店内位置へ
    // 既存の成功ズームと同じ商品別倍率で穏やかに寄せる。
    jdSetCameraPosterFocus(
      JD.posterItem,
      JD.posterFocusKind
    );

    JD.state = STATE_POSTER_TRANSITION;
    return;
  }

  JD.food = null;
  jdStartFortuneSpin(JD.queue[JD.throwIndex - 1]);
}

function jdStartNextThrowBeat() {
  const remaining = Math.max(
    0,
    JD.queue.length - JD.throwIndex
  );

  if (remaining <= 0) {
    jdNextFood();
    return;
  }

  const duration =
    JD.motion &&
    Number.isFinite(
      JD.motion.resultNextBeat
    )
      ? JD.motion.resultNextBeat
      : 0.96;

  JD.resultBeatDuration = duration;
  JD.resultBeatTimer = duration;
  JD.resultBeatRemaining = remaining;

  // 新しい音を増やさず、既存の素材札と同じ短い紙の音で区切る。
  jdPlaySound("ticket");
}



function jdNowMs() {
  if (typeof performance !== "undefined" && performance && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function jdStartFortuneSpin(selectedFood) {
  JD.pendingFood =
    selectedFood
      ? jdCloneFoodDef(
          selectedFood
        )
      : null;

  JD.food = null;
  JD.dragging = false;
  JD.dragScreenStart = null;
  JD.dragScreenNow = null;

  const spinDuration =
    JD.motion &&
    Number.isFinite(
      JD.motion.fortuneSpin
    )
      ? JD.motion.fortuneSpin
      : 1.15;

  JD.fortuneSpinning = true;
  JD.fortuneTimer =
    spinDuration;

  JD.fortuneDuration =
    spinDuration;

  JD.fortuneSelected =
    JD.pendingFood;

  JD.fortuneDisplayName =
    JD.pendingFood
      ? JD.pendingFood.name
      : "CHERRY";

  JD.fortunePickedTimer = 0;
  JD.fortuneLastTickIndex = -1;

  jdPlaySound(
    "fortune_in"
  );

  jdSetGamePhase(
    PHASE_FORTUNE
  );

  jdSetCameraClose(false);
}


function jdCompleteFortuneSpin() {
  const src =
    JD.pendingFood ||
    JD.fortuneSelected ||
    JD.queue[
      Math.max(
        0,
        JD.throwIndex - 1
      )
    ] ||
    null;

  JD.fortuneSpinning = false;
  JD.fortuneTimer = 0;

  // 確定結果を一呼吸見せてから退場
  JD.fortunePickedTimer =
    JD.motion &&
    Number.isFinite(
      JD.motion.fortuneHold
    )
      ? JD.motion.fortuneHold
      : 1.10;

  JD.fortuneSelected = src;

  jdPlaySound(
    "fortune_pick"
  );

  if (!src) {
    JD.pendingFood = null;

    jdSetGamePhase(
      PHASE_AIM
    );

    jdSetCameraClose(false);
    return;
  }

  JD.food = {
    ...jdCloneFoodDef(src),
    x: JD.launcher.x,
    y: JD.launcher.y,
    vx: 0,
    vy: 0,
    launched: false,
    resolved: false,
    resultTimer: 0,
    stillTimer: 0,
    label: "",
    resultLabel: "",
    resultType: "",
    hideAfterResolve: false,
    placedAt: 0,
    idleRippleStartedAt: Number.isFinite(ElapsedTime)
      ? ElapsedTime
      : 0,

    // 得点計算に使う有効バウンドだけを、
    // 物理の連続反射判定とは別に記録する。
    scoringBounceCount: 0,
    scoringBounceTags: [],
    scoringBounceLast: null,

    // メロンソーダは、見た目のグラス側面ではなく
    // 上部の開口を下降して通過した時だけ成功にする。
    melonEntryConfirmed: false
  };

  JD.pendingFood = null;

  jdSetGamePhase(
    PHASE_AIM
  );

  jdSetCameraClose(false);

  // チュートリアルはここでは開始しない。
  // Fortuneの退場完了後に開始する。
}


function jdUpdateFortune(dt) {
  const previousPickedTimer =
    JD.fortunePickedTimer || 0;

  if (
    JD.fortunePickedTimer > 0
  ) {
    JD.fortunePickedTimer =
      Math.max(
        0,
        JD.fortunePickedTimer - dt
      );
  }

  // Fortuneが画面から完全に退場した瞬間に開始
  if (
    previousPickedTimer > 0 &&
    JD.fortunePickedTimer <= 0 &&
    JD.gamePhase === PHASE_AIM &&
    JD.food &&
    !JD.tutorialSeen &&
    !JD.tutorialActive
  ) {
    jdStartAimTutorial();
  }

  if (
    JD.gamePhase !==
    PHASE_FORTUNE
  ) {
    return false;
  }

  if (!JD.pendingFood && !JD.fortuneSelected) {
    jdSetGamePhase(PHASE_AIM);
    return false;
  }

  if (!JD.fortuneSpinning) {
    jdCompleteFortuneSpin();
    return true;
  }

  if (
    !Number.isFinite(
      JD.fortuneTimer
    )
  ) {
    JD.fortuneTimer =
      JD.motion &&
      Number.isFinite(
        JD.motion.fortuneSpin
      )
        ? JD.motion.fortuneSpin
        : 1.15;
  }
  JD.fortuneTimer -= dt;

  const names = JD.fortuneNames;
  if (JD.fortuneTimer > 0.24) {
    const spinRate = 20;
    const index = Math.floor((JD.fortuneDuration - JD.fortuneTimer) * spinRate) % names.length;

    if (
      index !== JD.fortuneLastTickIndex &&
      JD.fortuneLastTickIndex >= 0
    ) {
      jdPlaySound("fortune_tick");
    }

    JD.fortuneLastTickIndex = index;
    JD.fortuneDisplayName = names[index];
  } else if (JD.pendingFood) {
    JD.fortuneDisplayName = JD.pendingFood.name;
    JD.fortuneLastTickIndex = -1;
  }

  if (JD.fortuneTimer <= 0) {
    jdCompleteFortuneSpin();
  }
  return true;
}


function jdPlayShiftStartCueIfCrossed(previousElapsed, currentElapsed, moment, soundId) {
  if (
    previousElapsed < moment &&
    currentElapsed >= moment
  ) {
    jdPlaySound(soundId);
  }
}


function jdAppUpdate(dt) {
  jdUpdateCafeAudioBed();

  if (
    JD.state ===
    STATE_TITLE
  ) {
    if (
      JD.titleExitTimer > 0
    ) {
      JD.titleExitTimer -=
        dt;

      if (
        JD.titleExitTimer <=
        0
      ) {
        JD.titleExitTimer =
          0;

        jdStartPlay();
      }
    }

    return;
  }

  if (
    JD.state ===
    STATE_PLAY
  ) {
    if (
      JD.gamePhase ===
      PHASE_OPENING_MONOLOGUE
    ) {
      jdUpdateOpeningMonologue(dt);

      return;
    }

    if (
      JD.gamePhase ===
      PHASE_SHIFT_START
    ) {
      if (
        !Number.isFinite(
          JD.shiftStartDuration
        )
      ) {
        JD.shiftStartDuration =
          7.4;
      }

      if (
        !Number.isFinite(
          JD.shiftStartTimer
        )
      ) {
        JD.shiftStartTimer =
          JD.shiftStartDuration;
      }

      const previousShiftElapsed =
        JD.shiftStartDuration -
        JD.shiftStartTimer;

      JD.shiftStartTimer -=
        dt;

      const currentShiftElapsed =
        JD.shiftStartDuration -
        Math.max(
          0,
          JD.shiftStartTimer
        );

      // 開店導入の紙ものに、ごく小さな節目音を置く。
      // 表示の主役はあくまで紙札なので、音は薄く短くする。
      jdPlayShiftStartCueIfCrossed(
        previousShiftElapsed,
        currentShiftElapsed,
        0.14,
        "intro_open_card"
      );

      jdPlayShiftStartCueIfCrossed(
        previousShiftElapsed,
        currentShiftElapsed,
        1.45,
        "intro_order_sheet"
      );

      jdPlayShiftStartCueIfCrossed(
        previousShiftElapsed,
        currentShiftElapsed,
        1.92,
        "intro_count_stamp"
      );

      if (
        JD.shiftStartTimer <=
        0
      ) {
        JD.shiftStartTimer =
          0;

        jdNextFood();
      }

      return;
    }

    jdUpdatePlay(dt);
    jdSyncGamePhase();

  } else if (
    JD.state ===
    STATE_POSTER_TRANSITION
  ) {
    JD.posterTransitionTimer =
      (JD.posterTransitionTimer || 0) + dt;

    const focusDuration =
      Number.isFinite(JD.posterTransitionDuration)
        ? Math.max(0.001, JD.posterTransitionDuration)
        : 0.78;

    if (
      JD.posterTransitionTimer >=
      focusDuration
    ) {
      JD.posterTransitionTimer = focusDuration;
      JD.posterRevealTimer = 0;
      JD.posterPhaseName = "POSTER_ASSEMBLY";
      JD.state = STATE_POSTER_REVEAL;
    }

  } else if (
    JD.state ===
    STATE_POSTER_REVEAL
  ) {
    JD.posterRevealTimer =
      (JD.posterRevealTimer || 0) + dt;

    const revealDuration =
      Number.isFinite(JD.posterRevealDuration)
        ? Math.max(0.001, JD.posterRevealDuration)
        : 0.58;

    if (
      JD.posterRevealTimer >=
      revealDuration
    ) {
      JD.posterRevealTimer = revealDuration;
      JD.posterPhaseName = "HOLD";
      JD.posterTimer = 0;
      JD.posterVisualTimer = 0;

      // ポスターが完全に開き、完成状態へ入った瞬間に一度だけ鳴らす。
      jdPlaySound("poster_ready");

      JD.state = STATE_POSTER_HOLD;
    }

  } else if (
    JD.state ===
    STATE_POSTER_HOLD
  ) {
    JD.posterTimer =
      (JD.posterTimer || 0) + dt;

  } else if (
    JD.state ===
    STATE_POSTER_PEEL
  ) {
    JD.posterDismissTimer =
      (JD.posterDismissTimer || 0) + dt;

    const dismissDuration =
      Number.isFinite(JD.posterDismissDuration)
        ? Math.max(0.001, JD.posterDismissDuration)
        : 1.26;

    if (
      JD.posterDismissTimer >=
      dismissDuration
    ) {
      JD.posterDismissTimer =
        dismissDuration;

      // ポスターが完全に退いた直後は、通常の喫茶店を
      // 短く見せてからレシートへ進む。
      JD.posterPhaseName =
        "CAFE_HOLD";

      JD.posterCafeHoldTimer = 0;

      // ポスター撤収直後の近景を記録する。
      // この実際のカメラ位置から、レシート背景の遠景へ連続して引く。
      JD.posterCafeHoldStartCamera = {
        x: Number.isFinite(JD.cam.x) ? JD.cam.x : 515,
        y: Number.isFinite(JD.cam.y) ? JD.cam.y : 285,
        zoom: Number.isFinite(JD.cam.zoom) ? JD.cam.zoom : 0.445,
        screenX: Number.isFinite(JD.camScreenX)
          ? JD.camScreenX
          : JD.LOGICAL_W / 2,
        screenY: Number.isFinite(JD.camScreenY)
          ? JD.camScreenY
          : 284
      };

      // 店内の余韻へ入る時点で、ポスター用の補助タイマーを
      // 通常状態へ戻す。次の描画でフォーカスが再発しないようにする。
      JD.posterTransitionTimer = 0;
      JD.posterVisualTimer = 0;
      JD.posterTimer = 0;

      JD.state =
        STATE_POSTER_CAFE_HOLD;
    }

  } else if (
    JD.state ===
    STATE_POSTER_CAFE_HOLD
  ) {
    JD.posterCafeHoldTimer =
      (JD.posterCafeHoldTimer || 0) + dt;

    const cafeHoldDuration =
      Number.isFinite(JD.posterCafeHoldDuration)
        ? Math.max(0.001, JD.posterCafeHoldDuration)
        : 0.30;

    if (
      JD.posterCafeHoldTimer >=
      cafeHoldDuration
    ) {
      JD.posterCafeHoldTimer =
        cafeHoldDuration;

      JD.posterPhaseName =
        "NONE";

      // レシート画面の最初の背景カメラと完全に同じ位置へ固定する。
      // 状態切り替えの瞬間に、近景・遠景のジャンプを起こさない。
      JD.cam.x = 515;
      JD.cam.y = 285;
      JD.cam.zoom = 0.445;
      JD.cam.tx = 515;
      JD.cam.ty = 285;
      JD.cam.tz = 0.445;
      JD.camScreenX = JD.LOGICAL_W / 2;
      JD.camScreenY = 284;

      // 撤収用の状態を完全に閉じてから、既存のレシート演出へ渡す。
      JD.posterDismissTimer = 0;
      JD.posterCafeHoldTimer = 0;
      JD.posterCafeHoldStartCamera = null;
      JD.posterDismissSoundPlayed = false;

      JD.state =
        STATE_RECEIPT;

      JD.receiptTimer = 0;

      // 着地音はレシートが実際に定位置へ着く瞬間にだけ鳴らす。
      // 状態切り替え直後には鳴らさず、二重発火を防ぐ。
    }

  } else if (
    JD.state ===
    STATE_RECEIPT
  ) {
    jdUpdateReceipt(dt);
  }
}



function jdUpdatePlay(dt) {
  // 命中直後だけ世界を短く止める。
  // UIやレシートでは使わず、成功時だけの手応えに限定。
  if (
    JD.hitStopTimer > 0
  ) {
    JD.hitStopTimer =
      Math.max(
        0,
        JD.hitStopTimer -
        dt
      );

    return;
  }

  jdUpdateAimTutorial(dt);

  jdUpdateParticles(dt);
  jdUpdateFloatTexts(dt);

  if (
    jdUpdateFortune(dt)
  ) {
    return;
  }

  if (!JD.food) return;

  if (JD.food.resolved) {
    if (JD.resultBeatTimer > 0) {
      JD.resultBeatTimer = Math.max(
        0,
        JD.resultBeatTimer - dt
      );

      if (JD.resultBeatTimer <= 0) {
        jdNextFood();
      }

      return;
    }

    JD.food.resultTimer -= dt;
    if (JD.food.resultTimer <= 0) {
      jdStartNextThrowBeat();
    }
    return;
  }

  if (!JD.food.launched) return;

  const f = JD.food;
  const r = jdFoodRadius(f);
  const prevX = f.x;
  const prevY = f.y;

  f.vy -= JD.gravity * (f.gravityScale || 1) * dt;
  f.x += f.vx * dt;
  f.y += f.vy * dt;

  // 移動速度に応じて見た目の回転角を蓄積する
  // 着地後も visualAngle を消さない
  const spinSpeed = Math.hypot(f.vx, f.vy);
  const spinDirection = f.vx <= 0 ? 1 : -1;

  if (!Number.isFinite(f.visualAngle)) {
    f.visualAngle = 0;
  }

  f.visualAngle =
    (f.visualAngle + spinDirection * spinSpeed * dt * 0.18) % 360;

  f.vx *= f.airDrag || 0.998;
  f.vy *= f.airDrag || 0.998;

  JD.trailTick = (JD.trailTick || 0) + dt;
  if (JD.trailTick > 0.035) {
    JD.trailTick = 0;
    jdRecordTrailPoint(f.x, f.y, false);
  }

  if (jdCheckSweptMelon(prevX, prevY, f.x, f.y)) return;
  if (jdCheckSweptCake(prevX, prevY, f.x, f.y)) return;
  if (jdCheckTargets()) return;

  jdCheckTargetBodies();
  if (jdCheckTargets()) return;

  jdCheckObstacles();
  if (jdCheckTargets()) return;

  if (jdCheckStuckBounce(dt)) return;

  if (f.x < -40 || f.x > JD.worldW + 40 || f.y < 24) {
    jdResolve(null, "OUT");
    return;
  }

  if (f.y < JD.tableY + r) {
    f.y = JD.tableY + r;
    const vxBefore = f.vx;
    const vyBefore = f.vy;
    if (Math.abs(f.vy) > 95) f.vy = Math.abs(f.vy) * f.bounce * 0.42;
    else f.vy = 0;
    f.vx *= f.groundFriction;
    jdNoteBounce(
      "TABLE",
      f.x,
      f.y,
      f.vx,
      f.vy,
      vxBefore,
      vyBefore
    );
    if (jdCheckTargets()) return;
  }

  const speed = jdShotSpeed(f);
  const nearTableOrObjects =
    f.y <= JD.tableY + r + 112 ||
    jdIsFoodNearMelonRim(f);
  f.stillTimer = speed < 42 && nearTableOrObjects ? (f.stillTimer || 0) + dt : 0;

  if (f.stillTimer > 0.42) {
    if (jdCheckTargets()) return;
    jdResolve(null, "FLOOR");
    return;
  }

  if (Math.abs(f.vx) < 18 && Math.abs(f.vy) < 18 && f.y <= JD.tableY + r + 2) {
    jdResolve(null, "FLOOR");
  }
}

function jdCheckTargets() {
  if (!JD.food || JD.food.resolved) return false;
  for (const t of JD.targets) {
    if (jdTargetHit(JD.food, t)) {
      jdResolve(t, null);
      return true;
    }
  }
  return false;
}

function jdTargetHit(f, t) {
  const info = jdTargetDebugInfo(f, t);
  return info.ok;
}

function jdTargetDebugInfo(f, t) {
  const r = jdFoodRadius(f);
  const pad = jdTargetBonusPad(f.name, t.id);
  let inZone = false;

  if (t.kind === "coffee") {
    const cx = t.x;

    // 見た目のコーヒー液面に合わせて下へ移動
    const cy = JD.tableY + 43;

    const rx = 30 + pad.x * 0.25 + r * 0.75;
    const ry = 10 + pad.y * 0.20 + r * 0.55;

    const dx = f.x - cx;
    const dy = f.y - cy;

    inZone =
      (dx * dx) / (rx * rx) +
      (dy * dy) / (ry * ry) <= 1;

  } else if (t.kind === "cake") {
    const left = t.x - 44 - pad.x * 0.25;
    const right = t.x + 44 + pad.x * 0.25;

    // 下げたケーキ本体の高さに合わせる
    const bottom = JD.tableY + 7;
    const top = JD.tableY + 74 + pad.y * 0.15;

    inZone =
      f.x + r * 0.80 > left &&
      f.x - r * 0.80 < right &&
      f.y + r * 0.90 > bottom &&
      f.y - r * 0.35 < top;

  } else if (t.kind === "melon") {
    const left = t.x - 25 - pad.x * 0.12;
    const right = t.x + 25 + pad.x * 0.12;
    const bottom = JD.tableY + 24;
    const top = JD.tableY + 146 + pad.y * 0.12;

    inZone =
      f.melonEntryConfirmed === true &&
      f.x + r * 0.55 > left &&
      f.x - r * 0.55 < right &&
      f.y + r * 0.55 > bottom &&
      f.y - r * 0.55 < top;
  }

  let entryOK = false;
  let reason = "ZONE OUT";

  if (inZone) {
    const entry = jdEntryDebugReason(f, t.kind);
    entryOK = entry.ok;
    reason = entry.reason;
  }

  return {
    target: t,
    inZone,
    entryOK,
    ok: inZone && entryOK,
    reason,
    speed: jdShotSpeed(f),
    vx: f.vx,
    vy: f.vy
  };
}


function jdEntryDebugReason(f, targetKind) {
  const vx = f.vx || 0;
  const vy = f.vy || 0;
  const speed = jdShotSpeed(f);

  if (targetKind === "coffee") {
    if (Math.abs(vx) >= 520) return { ok: false, reason: "SIDE FAST" };
    if (speed >= 760) return { ok: false, reason: "TOO FAST" };
    if (vy >= 240) return { ok: false, reason: "UPWARD" };
    return { ok: true, reason: "OK" };
  }

  if (targetKind === "cake") {
    if (Math.abs(vx) >= 680) return { ok: false, reason: "SIDE FAST" };
    if (speed >= 980) return { ok: false, reason: "TOO FAST" };
    if (vy >= 300) return { ok: false, reason: "UPWARD" };
    return { ok: true, reason: "OK" };
  }

  if (targetKind === "melon") return { ok: true, reason: "OK" };
  return { ok: true, reason: "OK" };
}

function jdTargetBonusPad(foodName, targetId) {
  let x = 0;
  let y = 0;
  if (foodName === "SUGAR") { x += 5; y += 3; }
  if (foodName === "STRAWBERRY") { x += 3; y += 5; }
  if (targetId === "MELON SODA") { x += 3; y += 3; }
  return { x, y };
}

// 表示言語やターゲット名の空白に左右されない、組み合わせ固有の識別子。
// 既存のpriceBook参照キーは変更せず、結果データにだけ併記する。
function jdMakeRecipeKey(foodName, targetId) {
  return `${
    String(foodName || "").trim().toUpperCase()
  }_${
    String(targetId || "").trim().toUpperCase()
  }`.replace(/\s+/g, "_");
}

function jdGetRecipeEntry(result) {
  if (!result) return null;

  const key = result.recipeKey || jdMakeRecipeKey(
    result.item,
    result.target
  );

  const recipeBook = JD.recipeBook || {};
  return recipeBook[key] || null;
}

function jdGetRecipeText(result, field, fallback = "") {
  return jdGetRecipeTextForLanguage(
    result,
    field,
    JD.lang,
    fallback
  );
}

function jdGetRecipeTextForLanguage(
  result,
  field,
  language,
  fallback = ""
) {
  const recipe = jdGetRecipeEntry(result);
  const value = recipe && recipe[field];
  const lang = jdNormalizeLanguage(language);

  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    if (typeof value[lang] === "string") return value[lang];
    if (typeof value.jp === "string") return value.jp;
    if (typeof value.en === "string") return value.en;
  }

  return fallback;
}


function jdGetRecipeMenuName(result, fallback = "") {
  return jdGetRecipeText(
    result,
    "menuName",
    fallback
  );
}

function jdIsScoredCompletion(result) {
  return !!result && (
    result.type === "DIVE" ||
    result.type === "LAND" ||
    result.type === "STAB"
  );
}

// 同じ器へ入った成功結果を、一つの完成商品として扱うための安定キー。
// 表示言語ではなく内部のtarget idを優先し、復元データだけkindで補完する。
function jdGetCompletedProductKey(result) {
  if (!result) return "";

  const target = String(result.target || "")
    .trim()
    .toUpperCase();

  if (target && target !== "TABLE") {
    return `TARGET:${target}`;
  }

  const targetKind = String(result.targetKind || "")
    .trim()
    .toLowerCase();

  return targetKind ? `KIND:${targetKind}` : "";
}

function jdHasCompletedProductAtTarget(
  result,
  results = JD.results
) {
  const key = jdGetCompletedProductKey(result);
  if (!key || !Array.isArray(results)) return false;

  return results.some(
    (candidate) =>
      jdIsScoredCompletion(candidate) &&
      jdGetCompletedProductKey(candidate) === key
  );
}

// 一投ごとの結果は物理ログとして残し、表示と代表商品選出だけを
// ターゲット単位へ集約する。これにより失敗回数や投球順を壊さない。
function jdBuildCompletedProducts(results = JD.results) {
  const source = Array.isArray(results) ? results : [];
  const products = [];
  const byKey = Object.create(null);

  for (let i = 0; i < source.length; i += 1) {
    const result = source[i];
    if (!jdIsScoredCompletion(result)) continue;

    const key = jdGetCompletedProductKey(result) || `RESULT:${i}`;
    let product = byKey[key];

    if (!product) {
      product = {
        ...result,
        productKey: key,
        price: 0,
        basePrice: 0,
        targetBasePrice: Number.isFinite(result.targetBasePrice)
          ? result.targetBasePrice
          : 0,
        toppingBonus: 0,
        centerBonus: 0,
        stabBonus: 0,
        bounceBonus: 0,
        bounceCount: 0,
        scoredBounceCount: 0,
        perfect: false,
        toppings: [],
        resultIndices: [],
        firstResultIndex: i,
        lastResultIndex: i,
        resultIndex: i
      };

      byKey[key] = product;
      products.push(product);
    }

    for (const field of [
      "price",
      "basePrice",
      "toppingBonus",
      "centerBonus",
      "stabBonus",
      "bounceBonus",
      "bounceCount",
      "scoredBounceCount"
    ]) {
      if (Number.isFinite(result[field])) {
        product[field] += result[field];
      }
    }

    product.perfect = product.perfect || result.perfect === true;
    product.type = result.type;
    product.lastResultIndex = i;
    product.resultIndex = i;
    product.resultIndices.push(i);
    product.toppings.push({
      item: result.item,
      itemJp: result.itemJp,
      toppingPose: result.posterToppingPose,
      posterToppingPose: result.posterToppingPose,
      posterToppingOffsetX: result.posterToppingOffsetX,
      posterToppingOffsetY: result.posterToppingOffsetY,
      resultIndex: i,
      type: result.type,
      price: Number.isFinite(result.price) ? result.price : 0
    });
  }

  return products;
}

function jdGetProductToppings(product) {
  if (
    product &&
    Array.isArray(product.toppings) &&
    product.toppings.length > 0
  ) {
    return product.toppings
      .filter((topping) => topping && topping.item)
      .map((topping) => ({
        ...topping,
        item: String(topping.item).trim().toUpperCase(),
        toppingPose: jdNormalizePosterToppingPose(
          topping.toppingPose || topping.posterToppingPose
        ),
        posterToppingOffsetX: jdNormalizePosterToppingOffset(
          topping.posterToppingOffsetX
        ),
        posterToppingOffsetY: jdNormalizePosterToppingOffset(
          topping.posterToppingOffsetY
        )
      }));
  }

  if (product && product.item) {
    return [{
      item: String(product.item).trim().toUpperCase(),
      itemJp: product.itemJp,
      toppingPose: jdNormalizePosterToppingPose(
        product.toppingPose || product.posterToppingPose
      ),
      posterToppingOffsetX: jdNormalizePosterToppingOffset(
        product.posterToppingOffsetX
      ),
      posterToppingOffsetY: jdNormalizePosterToppingOffset(
        product.posterToppingOffsetY
      ),
      resultIndex: Number.isInteger(product.resultIndex)
        ? product.resultIndex
        : -1
    }];
  }

  return [];
}

function jdGetProductBaseName(targetKind) {
  const kind = String(targetKind || "").trim().toLowerCase();

  const names = jdIsEnglish()
    ? {
        melon: "Melon Soda",
        cake: "Shortcake",
        coffee: "Coffee"
      }
    : {
        melon: "メロンソーダ",
        cake: "ショートケーキ",
        coffee: "コーヒー"
      };

  return names[kind] || "";
}

function jdGetIngredientMenuName(item) {
  return jdGetIngredientMenuNameForLanguage(
    item,
    JD.lang
  );
}

function jdGetIngredientMenuNameForLanguage(
  item,
  language
) {
  const code = String(item || "").trim().toUpperCase();
  const isEnglish = jdNormalizeLanguage(language) === "en";
  const names = isEnglish
    ? {
        CHERRY: "Cherry",
        SUGAR: "Sugar",
        STRAWBERRY: "Strawberry"
      }
    : {
        CHERRY: "チェリー",
        SUGAR: "シュガー",
        STRAWBERRY: "いちご"
      };

  return names[code] || code;
}


function jdGetCompletedProductMenuName(product, fallback = "") {
  const toppings = jdGetProductToppings(product);

  if (toppings.length <= 1) {
    return jdGetRecipeMenuName(product, fallback);
  }

  const uniqueItems = Array.from(
    new Set(toppings.map((topping) => topping.item))
  );
  const baseName = jdGetProductBaseName(product && product.targetKind);

  if (uniqueItems.length === 1) {
    const ingredient = jdGetIngredientMenuName(uniqueItems[0]);
    const count = toppings.length;

    if (jdIsEnglish()) {
      const countName = count === 2
        ? "Double"
        : count === 3
          ? "Triple"
          : `${count}×`;
      return `${countName} ${ingredient} ${baseName}`.trim();
    }

    const countName = count === 2
      ? "ダブル"
      : count === 3
        ? "トリプル"
        : `${count}連`;
    return `${countName}${ingredient}${baseName}`;
  }

  return jdIsEnglish()
    ? `Mixed ${baseName}`.trim()
    : `ミックス${baseName}`;
}

function jdGetCompletedProductDescription(product, fallback = "") {
  const toppings = jdGetProductToppings(product);

  if (toppings.length <= 1) {
    return jdGetRecipeText(product, "description", fallback);
  }

  const uniqueCount = new Set(
    toppings.map((topping) => topping.item)
  ).size;

  if (uniqueCount === 1) {
    return jdIsEnglish()
      ? "A generous café favorite layered with extra helpings."
      : "同じトッピングを重ねた、ぜいたくな一品。";
  }

  return jdIsEnglish()
    ? "A one-night special layered with several toppings."
    : "いくつものトッピングを重ねた、その日だけの一品。";
}

function jdBuildScoreBreakdown(result) {
  const rules = JD.scoreRules || {};
  const targetKind = String(result && result.targetKind || "");
  const item = String(result && result.item || "").trim().toUpperCase();
  const targetBase = rules.targetBase || {};
  const toppingTable = rules.toppingBonus || {};
  const targetBasePrice = targetBase[targetKind];
  const toppingBonus = toppingTable[item] && toppingTable[item][targetKind];

  // 未確認の食材・ターゲットで現在の売上を壊さないため、
  // ルール表にない組み合わせは既存価格をそのまま残す。
  if (!Number.isFinite(targetBasePrice) || !Number.isFinite(toppingBonus)) {
    return null;
  }

  // 同じ器の2投目以降はトッピングと技術点だけを加算し、
  // 商品本体の基本点を重複させない。
  const basePrice = result && result.isAdditionalTopping
    ? 0
    : targetBasePrice;

  const centerBonus = result.perfect
    ? (Number.isFinite(rules.perfectBonus) ? rules.perfectBonus : 0)
    : 0;

  // 現行のSTABはPERFECT CENTERと同時に成立しない。
  const stabBonus = result.type === "STAB"
    ? (Number.isFinite(rules.stabBonus) ? rules.stabBonus : 0)
    : 0;

  const rawBounceCount = Number.isFinite(result.bounceCount)
    ? Math.max(0, Math.floor(result.bounceCount))
    : 0;

  const bounceBonuses = Array.isArray(rules.bounceBonuses)
    ? rules.bounceBonuses
    : [];

  const scoredBounceCount = Math.min(
    rawBounceCount,
    bounceBonuses.length
  );

  let bounceBonus = 0;
  for (let i = 0; i < scoredBounceCount; i += 1) {
    const bonus = bounceBonuses[i];
    if (Number.isFinite(bonus)) bounceBonus += bonus;
  }

  return {
    targetBasePrice,
    basePrice,
    toppingBonus,
    centerBonus,
    stabBonus,
    bounceBonus,
    scoredBounceCount,
    price:
      basePrice +
      toppingBonus +
      centerBonus +
      stabBonus +
      bounceBonus
  };
}

function jdApplyScoreBreakdown(result) {
  const breakdown = jdBuildScoreBreakdown(result);
  if (!breakdown) return false;

  result.basePrice = breakdown.basePrice;
  result.targetBasePrice = breakdown.targetBasePrice;
  result.toppingBonus = breakdown.toppingBonus;
  result.centerBonus = breakdown.centerBonus;
  result.stabBonus = breakdown.stabBonus;
  result.bounceBonus = breakdown.bounceBonus;
  result.scoredBounceCount = breakdown.scoredBounceCount;
  result.price = breakdown.price;
  return true;
}

function jdScoreRankThreshold(rank, fallback) {
  const rules = JD.scoreRules || {};
  const thresholds = rules.rankThresholds || {};
  const value = thresholds[rank];
  return Number.isFinite(value) ? value : fallback;
}

function jdResolve(t, missType) {
  if (!JD.food || JD.food.resolved) return;
  const f = JD.food;
  f.resolved = true;
  f.launched = false;
  f.vx = 0;
  f.vy = 0;
  f.resultTimer =
    JD.motion &&
    Number.isFinite(JD.motion.hitResultNormal)
      ? JD.motion.hitResultNormal
      : 1.04;

  let res = {
    item: f.name,
    itemJp: f.jp,
    target: "TABLE",
    targetLabel: "テーブル",
    targetKind: null,
    type: "FLOOR",
    recipeKey: null,
    productKey: null,
    isAdditionalTopping: false,
    price: 0,
    targetBasePrice: 0,
    basePrice: 0,
    toppingBonus: 0,
    centerBonus: 0,
    stabBonus: 0,
    bounceBonus: 0,
    scoredBounceCount: 0,
    name: "ユカニ キエタ",
    comment: "ソウイウヒモ アル",
    perfect: false,
    bounceCount: 0,
    bounceTags: []
  };

  if (missType === "OUT") {
    res.type = "OUT";
    res.name = "キッチン ユキ";
    res.comment = "オキャクサマニハ ダセナイ";
    f.label = "";
    f.resultLabel = jdT("result.out", "TOBIDASHI");

    // 場外へ出た位置はカメラ外になるため、解決した瞬間の画面座標を
    // 読める範囲へ丸めて保存する。札ではなく、NOKKARIと同じ系統の
    // ポップ文字を「飛び出した方向」に残すためのアンカー。
    const hasCamera =
      JD.cam &&
      Number.isFinite(JD.cam.x) &&
      Number.isFinite(JD.cam.y) &&
      Number.isFinite(JD.cam.zoom) &&
      Number.isFinite(JD.camScreenX) &&
      Number.isFinite(JD.camScreenY);
    const outScreen = hasCamera
      ? jdWorldToScreen(f.x, f.y)
      : null;
    const outScreenX = outScreen && Number.isFinite(outScreen.x)
      ? outScreen.x
      : JD.LOGICAL_W / 2;
    const outScreenY = outScreen && Number.isFinite(outScreen.y)
      ? outScreen.y
      : 260;
    f.outEffectScreenX = jdClamp(
      outScreenX,
      88,
      JD.LOGICAL_W - 88
    );
    f.outEffectScreenY = jdClamp(
      outScreenY,
      76,
      JD.LOGICAL_H - 132
    );
    f.hideAfterResolve = false;
    jdFinishShotTrail("OUT");
    jdFreezeCamera();
  } else if (missType === "FLOOR") {
    res.type = "FLOOR";
    res.price = 0;
    res.name = "テーブル ドロップ";
    res.comment = "ショウヒンニハ ナラナイ";
    // テーブル落ちは食材が残ることで伝わるため、結果名は出さない。
    f.label = "";
    f.hideAfterResolve = false;
    jdFinishShotTrail("FLOOR");
    jdFreezeCamera();
  } else if (t) {
    jdSnapFood(t);
    jdRecordTrailPoint(f.x, f.y, true);

    const cakeSasari = t.kind === "cake" && JD.pendingCakeSasari;
    res.target = t.id;
    res.targetLabel = t.label;
    res.targetKind = t.kind;
    res.type = cakeSasari ? "STAB" : (t.isLiquid ? "DIVE" : "LAND");
    res.productKey = jdGetCompletedProductKey(res);
    res.isAdditionalTopping = jdHasCompletedProductAtTarget(
      res,
      JD.results
    );

    const key = `${f.name}_${t.id}`;
    res.recipeKey = jdMakeRecipeKey(f.name, t.id);
    const p = JD.priceBook[key];
    const recipe = jdGetRecipeEntry(res);
    if (recipe) {
      res.name = jdGetRecipeMenuName(res);
      res.comment = jdGetRecipeText(res, "description");
    } else if (p) {
      res.price = p.price;
      res.name = p.name;
      res.comment = p.comment;
    } else {
      res.price = 300;
      res.name = "キマグレ メニュー";
      res.comment = "ナゼカ ウレタ";
    }

    if (cakeSasari) f.label = jdT("result.stab", "KANTSU");
    else f.label = t.isLiquid
      ? jdT("result.dive", "DIVE")
      : jdT("result.land", "NOKKARI");

    // 完成時の位置を器内の -1〜+1 へ正規化して保存する。
    // ポスターでは商品ごとの構図へ縮めて反映し、実際に入った側と
    // おおよその高さを保つ。三段階のposeは旧データ互換で残す。
    const posterPlacement = jdCapturePosterToppingPlacement(f, t);
    res.posterToppingPose = posterPlacement.pose;
    res.posterToppingOffsetX = posterPlacement.offsetX;
    res.posterToppingOffsetY = posterPlacement.offsetY;

    f.hideAfterResolve = true;
    jdRegisterPlacedFood(f, t);
    jdFinishShotTrail(res.type);
    res.perfect = jdStartHitZoom(f.x, f.y, t);
    jdSpawnSplash(
      f.x,
      f.y,
      t.isLiquid
        ? t.col
        : color(
            255,
            235,
            220
          ),
      t.kind,
      cakeSasari
    );

    // 成功した瞬間だけ、
    // 白いインクが数粒ふわっと弾ける。
    jdSpawnPostcardSuccessInk(
      f.x,
      f.y,
      t.kind
    );

    if (
      cakeSasari
    ) {
      // 刺さった瞬間は短く鋭い
      JD.shake = 0.085;
      JD.shakeDuration = 0.085;
      JD.shakeStrength = 5.2;

    } else if (
      JD.hitEffectPerfect
    ) {
      // PERFECTは強いが長引かせない
      JD.shake = 0.095;
      JD.shakeDuration = 0.095;
      JD.shakeStrength = 5.8;

    } else if (
      t.kind === "melon"
    ) {
      JD.shake = 0.075;
      JD.shakeDuration = 0.075;
      JD.shakeStrength = 4.0;

    } else if (
      t.kind === "coffee"
    ) {
      JD.shake = 0.070;
      JD.shakeDuration = 0.070;
      JD.shakeStrength = 3.4;

    } else {
      // ケーキへの通常着地
      JD.shake = 0.060;
      JD.shakeDuration = 0.060;
      JD.shakeStrength = 2.8;
    }
  }

  // 価格計算に必要な一投分の事実情報を、結果へ確定してから使う。
  res.bounceCount = Number.isFinite(f.scoringBounceCount)
    ? f.scoringBounceCount
    : 0;
  res.bounceTags = Array.isArray(f.scoringBounceTags)
    ? f.scoringBounceTags.slice()
    : [];

  // 成功商品のみ、商品難度・トッピング・着地技術を売上へ反映する。
  // FLOOR / OUT は商品として売上に加えず、どちらも0円にする。
  if (jdIsScoredCompletion(res)) {
    jdApplyScoreBreakdown(res);
  }

  if (
    res.type === "OUT"
  ) {
    jdPlaySound("out");

  } else if (
    res.type === "FLOOR"
  ) {
    jdPlaySound("drop");

  } else if (
    res.type === "STAB"
  ) {
    jdPlaySound("hit_stab");

  } else if (
    t &&
    t.kind === "coffee"
  ) {
    jdPlaySound("hit_coffee");

  } else if (
    t &&
    t.kind === "cake"
  ) {
    jdPlaySound("hit_cake");

  } else if (
    t &&
    t.kind === "melon"
  ) {
    jdPlaySound("hit_melon");
  }

  // 器ごとの命中音に加えて、結果タイプの短いアクセントを重ねる。
  // DIVE / NOKKARI / KANTSU の違いを、結果文字と同じ手触りで伝える。
  jdPlayResultTypeAccent(res.type);

  // PERFECT CENTERだけ、通常成功のあとに小さな高音を足す。
  if (res.perfect === true) {
    jdPlaySound("perfect_center");
  }

  JD.results.push(res);
  f.resultType = res.type;
  JD.totalSales += res.price;
  jdSetGamePhase(PHASE_RESULT);
}

function jdSnapFood(t) {
  const f = JD.food;
  if (!f) return;

  if (t.kind === "coffee") {
    f.x = jdClamp(
      f.x,
      t.x - 22,
      t.x + 22
    );

    // コーヒー液面付近へ配置
    f.y = jdClamp(
      f.y,
      JD.tableY + 39,
      JD.tableY + 48
    );

  } else if (t.kind === "cake") {
    if (JD.pendingCakeSasari) {
      f.x = jdClamp(
        f.x,
        t.x - 32,
        t.x + 32
      );

      f.y = jdClamp(
        f.y,
        JD.tableY + 51,
        JD.tableY + 65
      );

    } else {
      f.x = jdClamp(
        f.x,
        t.x - 36,
        t.x + 36
      );

      // 下げたケーキ上面に自然に乗せる
      f.y = jdClamp(
        f.y,
        JD.tableY + 57,
        JD.tableY + 73
      );
    }

  } else if (t.kind === "melon") {
    f.x = jdClamp(
      f.x,
      t.x - 18,
      t.x + 18
    );

    f.y = jdClamp(
      f.y,
      JD.tableY + 46,
      JD.tableY + 126
    );
  }
}



function jdPlayResultTypeAccent(resultType) {
  if (resultType === "DIVE") {
    jdPlaySound("result_dive");
    return;
  }

  if (resultType === "LAND") {
    jdPlaySound("result_nokkari");
    return;
  }

  if (resultType === "STAB") {
    jdPlaySound("result_kantsu");
  }
}


function jdRegisterPlacedFood(f, target) {
  JD.placedFoods.push({
    name: f.name,
    jp: f.jp,
    shape: f.shape,
    r: f.r,
    w: f.w,
    h: f.h,
    col: f.col,

    x: f.x,
    y: f.y,

    // 飛行中に蓄積した角度を、設置後のコピーにも引き継ぐ
    visualAngle: Number.isFinite(f.visualAngle)
      ? f.visualAngle
      : 0,

    alpha: 230,
    targetKind: target ? target.kind : "",
    placedAt: ElapsedTime
  });
}


function jdStartHitZoom(x, y, target) {
  let label =
    JD.food &&
    JD.food.label
      ? JD.food.label
      : "GOOD!";

  const perfect =
    jdShouldPerfectCenterHit(
      target,
      x,
      y,
      label
    );

  // 通常成功は約2〜3フレーム、
  // PERFECTは約4フレームだけ止める
  JD.hitStopTimer =
    perfect
      ? 0.064
      : 0.042;

  const normalDuration =
    JD.motion &&
    Number.isFinite(
      JD.motion.hitNormal
    )
      ? JD.motion.hitNormal
      : 0.74;

  const perfectDuration =
    JD.motion &&
    Number.isFinite(
      JD.motion.hitPerfect
    )
      ? JD.motion.hitPerfect
      : 0.90;

  JD.hitEffectTimer =
    perfect
      ? perfectDuration
      : normalDuration;

  JD.hitEffectDuration =
    JD.hitEffectTimer;

  JD.hitEffectX = x;
  JD.hitEffectY = y;
  JD.hitEffectLabel = label;

  JD.hitEffectKind =
    target
      ? target.kind
      : "hit";

  JD.hitEffectPerfect =
    perfect;

  if (JD.food) {
    JD.food.resultLabel =
      label;

    JD.food.label = "";

    const normalResult =
      JD.motion &&
    Number.isFinite(
      JD.motion.hitResultNormal
    )
      ? JD.motion.hitResultNormal
      : 1.04;

    const perfectResult =
      JD.motion &&
      Number.isFinite(
        JD.motion.hitResultPerfect
      )
        ? JD.motion.hitResultPerfect
        : 1.20;

    JD.food.resultTimer =
      Math.max(
        JD.food.resultTimer || 0,
        perfect
          ? perfectResult
          : normalResult
      );
  }

  if (perfect) {
    JD.perfectZoomActive = true;

    JD.hitZoomTimer =
      JD.motion &&
      Number.isFinite(
        JD.motion.medium
      )
        ? JD.motion.medium
        : 0.68;

    JD.hitZoomX = x;
    JD.hitZoomY = y;

    JD.hitZoomLevel =
      jdPerfectZoomLevel(
        target
      );

    jdSetCameraHitZoom();

  } else {
    JD.perfectZoomActive = false;
    JD.hitZoomTimer = 0;
    jdFreezeCamera();
  }

  return perfect;
}


function jdShouldPerfectCenterHit(target, x, y, label) {
  if (!target || label === "KANTSU") return false;

  const dx = Math.abs(x - target.x);

  if (target.kind === "coffee") {
    return (
      dx <= 6 &&
      Math.abs(
        y - (JD.tableY + 43)
      ) <= 5
    );
  }

  if (target.kind === "cake") {
    return (
      dx <= 8 &&
      Math.abs(
        y - (JD.tableY + 68)
      ) <= 7
    );
  }

  if (target.kind === "melon") {
    return (
      dx <= 6 &&
      y >= JD.tableY + 72 &&
      y <= JD.tableY + 124
    );
  }

  return false;
}


function jdPerfectZoomLevel(target) {
  if (!target) return 1.48;
  if (target.kind === "cake") return 1.60;
  if (target.kind === "coffee") return 1.52;
  if (target.kind === "melon") return 1.46;
  return 1.48;
}

function jdCheckTargetBodies() {
  const f = JD.food;
  if (!f || f.resolved) return;

  const r = jdFoodRadius(f);

  for (const t of JD.targets) {
    if (t.kind === "coffee") {
      // 下げたカップ形状に合わせて壁・底も下へ
      jdCollideRect(
        t.x - 39,
        JD.tableY + 7,
        8,
        38,
        r,
        0.52,
        "COFFEE_WALL_L"
      );

      jdCollideRect(
        t.x + 31,
        JD.tableY + 7,
        8,
        38,
        r,
        0.52,
        "COFFEE_WALL_R"
      );

      jdCollideRect(
        t.x - 31,
        JD.tableY + 7,
        62,
        7,
        r,
        0.40,
        "COFFEE_BOTTOM"
      );

      jdCollideRect(
        t.x - 44,
        JD.tableY + 1,
        88,
        9,
        r,
        0.38,
        "COFFEE_SAUCER"
      );

    } else if (t.kind === "cake") {
      // ケーキの側面全体に合うよう、高さと位置を再調整
      jdCollideRect(
        t.x - 54,
        JD.tableY + 7,
        10,
        62,
        r,
        0.48,
        "CAKE_SIDE_L"
      );

      jdCollideRect(
        t.x + 44,
        JD.tableY + 7,
        10,
        62,
        r,
        0.48,
        "CAKE_SIDE_R"
      );

    } else if (t.kind === "melon") {
      jdCollideRect(
        t.x - 35,
        JD.tableY + 18,
        7,
        120,
        r,
        0.46,
        "MELON_WALL_L"
      );

      jdCollideRect(
        t.x + 28,
        JD.tableY + 18,
        7,
        120,
        r,
        0.46,
        "MELON_WALL_R"
      );

      jdCollideRect(
        t.x - 30,
        JD.tableY + 8,
        60,
        10,
        r,
        0.32,
        "MELON_BOTTOM"
      );
    }
  }
}


function jdCheckObstacles() {
  const f = JD.food;
  if (!f || f.resolved) return;
  const r = jdFoodRadius(f);
  for (const o of JD.obstacles) {
    if (o.kind === "spoon") jdCollideSegment(o.x - 32, o.y, o.x + 30, o.y + 3, r + 5, 0.72, "OBSTACLE_SPOON");
    else if (o.kind === "ticket") jdCollideRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, r, 0.64, "OBSTACLE_BILL");
    else if (o.kind === "coaster") jdCollideCircle(o.x, o.y, o.r + r, 0.58, "OBSTACLE_COASTER");
  }
}

function jdCollideCircle(cx, cy, hitR, bounce, tag) {
  const f = JD.food;
  const dx = f.x - cx;
  const dy = f.y - cy;
  const d = Math.hypot(dx, dy);
  if (d > 0 && d < hitR) {
    const nx = dx / d;
    const ny = dy / d;
    const vxBefore = f.vx;
    const vyBefore = f.vy;
    f.x = cx + nx * hitR;
    f.y = cy + ny * hitR;
    const dot = f.vx * nx + f.vy * ny;
    if (dot < 0) {
      f.vx = (f.vx - 2 * dot * nx) * bounce;
      f.vy = (f.vy - 2 * dot * ny) * bounce;
      jdNoteBounce(tag, f.x, f.y, f.vx, f.vy, vxBefore, vyBefore);
    }
  }
}

function jdCollideRect(rx, ry, rw, rh, radius, bounce, tag) {
  const f = JD.food;
  const nx = jdClamp(f.x, rx, rx + rw);
  const ny = jdClamp(f.y, ry, ry + rh);
  const dx = f.x - nx;
  const dy = f.y - ny;
  const d = Math.hypot(dx, dy);
  if (d > 0 && d < radius) {
    const ux = dx / d;
    const uy = dy / d;
    const vxBefore = f.vx;
    const vyBefore = f.vy;
    f.x = nx + ux * radius;
    f.y = ny + uy * radius;
    const dot = f.vx * ux + f.vy * uy;
    if (dot < 0) {
      f.vx = (f.vx - 2 * dot * ux) * bounce;
      f.vy = (f.vy - 2 * dot * uy) * bounce;
      jdNoteBounce(tag, f.x, f.y, f.vx, f.vy, vxBefore, vyBefore);
    }
  }
}

function jdCollideSegment(ax, ay, bx, by, radius, bounce, tag) {
  const f = JD.food;
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 <= 0) return;
  const t = jdClamp(((f.x - ax) * abx + (f.y - ay) * aby) / len2, 0, 1);
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  const dx = f.x - cx;
  const dy = f.y - cy;
  const d = Math.hypot(dx, dy);
  if (d > 0 && d < radius) {
    const nx = dx / d;
    const ny = dy / d;
    const vxBefore = f.vx;
    const vyBefore = f.vy;
    f.x = cx + nx * radius;
    f.y = cy + ny * radius;
    const dot = f.vx * nx + f.vy * ny;
    if (dot < 0) {
      f.vx = (f.vx - 2 * dot * nx) * bounce;
      f.vy = (f.vy - 2 * dot * ny) * bounce;
      jdNoteBounce(tag, f.x, f.y, f.vx, f.vy, vxBefore, vyBefore);
    }
  }
}

function jdNoteBounce(tag, x, y, vx, vy, vxBefore = 0, vyBefore = 0) {
  const last = JD.lastBounceInfo;
  if (last && Math.hypot(x - last.x, y - last.y) < 18 && ElapsedTime - last.time < 0.28) JD.bounceChain = (JD.bounceChain || 0) + 1;
  else JD.bounceChain = 0;

  JD.lastBounceInfo = { tag, x, y, vx, vy, vxBefore, vyBefore, time: ElapsedTime };

  // メロンソーダのグラス側面・底へ実際に反射した瞬間だけ、
  // 成功音とは別の小さなガラス音を鳴らす。止まり際の微振動は除外する。
  const isMelonGlassContact =
    tag === "MELON_WALL_L" ||
    tag === "MELON_WALL_R" ||
    tag === "MELON_BOTTOM";

  if (isMelonGlassContact) {
    const glassImpactSpeed = Math.hypot(vxBefore || 0, vyBefore || 0);
    if (glassImpactSpeed >= 90) {
      jdPlaySound("hit_glass");
    }
  }

  jdNoteScoringBounce(tag, x, y, vxBefore, vyBefore);
}

// 物理の連続反射防止とは別系統の、得点確認用バウンド記録。
// ターゲット本体の細かな反射や、止まり際の揺れを得点候補に混ぜない。
function jdNoteScoringBounce(tag, x, y, vxBefore = 0, vyBefore = 0) {
  const f = JD.food;
  if (!f || f.resolved || !f.launched) return;

  const isScoringSurface =
    tag === "TABLE" ||
    String(tag || "").indexOf("OBSTACLE_") === 0;

  if (!isScoringSurface) return;

  const incomingSpeed = Math.hypot(vxBefore || 0, vyBefore || 0);
  if (incomingSpeed < 150) return;

  const last = f.scoringBounceLast;
  if (
    last &&
    Math.hypot(x - last.x, y - last.y) < 20 &&
    ElapsedTime - last.time < 0.18
  ) {
    return;
  }

  f.scoringBounceCount =
    (Number.isFinite(f.scoringBounceCount)
      ? f.scoringBounceCount
      : 0) + 1;

  // 得点対象として認識したバウンドの瞬間に鳴らし、物理挙動と音を同期させる。
  jdPlaySound("bounce_bonus");

  if (!Array.isArray(f.scoringBounceTags)) {
    f.scoringBounceTags = [];
  }

  // 診断用の履歴は必要十分な長さで止め、極端な反射でも結果を肥大化させない。
  if (f.scoringBounceTags.length < 12) {
    f.scoringBounceTags.push(tag);
  }

  f.scoringBounceLast = {
    tag,
    x,
    y,
    time: ElapsedTime
  };
}

function jdCheckStuckBounce(dt) {
  const f = JD.food;
  if (!f || f.resolved) return false;
  const chain = JD.bounceChain || 0;
  const speed = jdShotSpeed(f);
  const near =
    f.y <= JD.tableY + jdFoodRadius(f) + 125 ||
    jdIsFoodNearMelonRim(f);
  if (chain >= 8 && speed < 90 && near) JD.stuckBounceTimer = (JD.stuckBounceTimer || 0) + dt;
  else JD.stuckBounceTimer = 0;
  if ((JD.stuckBounceTimer || 0) > 0.35 || (chain >= 18 && speed < 130 && near)) {
    if (jdCheckTargets()) return true;
    jdResolve(null, "FLOOR");
    return true;
  }
  return false;
}

// メロンソーダの縁は、通常のテーブル停止監視より高い。
// グラス上端で静止した食材も0.42秒後に失敗確定できるよう、
// 横位置と高さの両方がグラス周辺にある時だけ監視範囲を広げる。
function jdIsFoodNearMelonRim(f) {
  if (!f || !Array.isArray(JD.targets)) return false;

  const r = jdFoodRadius(f);
  const melon = JD.targets.find(
    (target) => target && target.kind === "melon"
  );

  if (!melon) return false;

  return (
    Math.abs(f.x - melon.x) <= 44 + r &&
    f.y <= JD.tableY + 164 + r
  );
}

function jdCheckSweptCake(prevX, prevY, nowX, nowY) {
  const f = JD.food;

  if (!f || f.resolved || nowY >= prevY) return false;

  const t = JD.targets.find(
    target => target.kind === "cake"
  );

  if (!t) return false;

  // 下げたケーキ上面に合わせる
  const catchY = JD.tableY + 74;

  const crossed =
    prevY >= catchY &&
    nowY <= catchY;

  if (!crossed) return false;

  const q =
    (prevY - catchY) /
    Math.max(0.0001, prevY - nowY);

  const hitX =
    prevX +
    (nowX - prevX) * q;

  if (
    hitX < t.x - 44 ||
    hitX > t.x + 44
  ) {
    return false;
  }

  f.x = hitX;
  f.y = catchY;

  JD.pendingCakeSasari =
    jdShouldCakeSasari(f);

  jdResolve(t, null);

  return true;
}


function jdShouldCakeSasari(f) {
  const speed = jdShotSpeed(f);
  const vx = Math.abs(f.vx || 0);
  const vy = f.vy || 0;
  if (vy < -650 && speed > 760) return true;
  if (speed > 1000 && vy < -560 && vx < 420) return true;
  return false;
}

function jdCheckSweptMelon(prevX, prevY, nowX, nowY) {
  const f = JD.food;
  if (!f || f.resolved || nowY >= prevY) return false;
  const t = JD.targets.find((target) => target.kind === "melon");
  if (!t) return false;

  // グラスの飲み口を表す水平面。前フレームが上、現在フレームが下の
  // 場合だけ交点を求めるため、側面を横切っただけでは成功しない。
  const openingY = JD.tableY + 146;
  const crossedOpening =
    prevY >= openingY &&
    nowY <= openingY;

  if (!crossedOpening) return false;

  const q =
    (prevY - openingY) /
    Math.max(0.0001, prevY - nowY);

  const hitX =
    prevX +
    (nowX - prevX) * q;

  // ソーダ面とアイスの見た目に合わせ、中心が開口内を通った時だけ採用。
  if (
    hitX < t.x - 22 ||
    hitX > t.x + 22
  ) {
    return false;
  }

  f.melonEntryConfirmed = true;
  f.x = jdClamp(hitX, t.x - 18, t.x + 18);
  f.y = JD.tableY + 126;
  JD.pendingCakeSasari = false;
  jdResolve(t, null);
  return true;
}

function jdMelonNoPassRect(t) {
  const r = jdFoodRadius(JD.food);
  const pad = jdTargetBonusPad(JD.food ? JD.food.name : "", t.id);
  return {
    left: t.x - 25 - pad.x * 0.12 - r * 0.35,
    right: t.x + 25 + pad.x * 0.12 + r * 0.35,
    bottom: JD.tableY + 24 - r * 0.25,
    top: JD.tableY + 146 + pad.y * 0.12 + r * 0.25
  };
}

function jdSegmentRectFirstHit(x1, y1, x2, y2, left, bottom, right, top) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const clip = (p, q) => {
    if (Math.abs(p) < 0.000001) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  if (!clip(-dx, x1 - left)) return { ok: false, t: null };
  if (!clip(dx, right - x1)) return { ok: false, t: null };
  if (!clip(-dy, y1 - bottom)) return { ok: false, t: null };
  if (!clip(dy, top - y1)) return { ok: false, t: null };
  return { ok: true, t: jdClamp(t0, 0, 1) };
}

function jdBeginAimTouch(p) {
  const f = JD.food;
  if (!f) return;
  const foodScreen = jdWorldToScreen(f.x, f.y);
  const d = Math.hypot(p.x - foodScreen.x, p.y - foodScreen.y);
  if (d < 64) {
    JD.dragging = true;
    JD.dragScreenStart = jdWorldToScreen(JD.launcher.x, JD.launcher.y);
    JD.dragScreenNow = { x: p.x, y: p.y };
    jdSetGamePhase(PHASE_AIMING);
    jdSetCameraOverview();
  }
}

function jdUpdateAimTouch(p) {
  if (!JD.dragging) return;
  JD.dragScreenNow = { x: p.x, y: p.y };
  jdSetCameraOverview();
}

function jdReleaseAimTouch(p, cancelled) {
  if (!JD.dragging) return;
  JD.dragging = false;
  JD.dragScreenNow = { x: p.x, y: p.y };
  if (cancelled) {
    JD.dragScreenStart = null;
    JD.dragScreenNow = null;
    jdSetGamePhase(PHASE_AIM);
    jdSetCameraClose(false);
    return;
  }

  const pull = jdGetScreenPull();
  const dist = Math.hypot(pull.x, pull.y);
  if (dist < 8) {
    JD.dragScreenStart = null;
    JD.dragScreenNow = null;
    jdSetGamePhase(PHASE_AIM);
    jdSetCameraClose(false);
    return;
  }

  const f = JD.food;

  // Fortuneで作られた一品を再利用する場合にも、採点用の一投履歴だけは
  // 必ず空から始める。既存の反射・軌跡・カメラ処理には触れない。
  f.scoringBounceCount = 0;
  f.scoringBounceTags = [];
  f.scoringBounceLast = null;
  f.melonEntryConfirmed = false;

  f.x = JD.launcher.x;
  f.y = JD.launcher.y;
  f.vx = pull.x * JD.shotPower;
  f.vy = pull.y * JD.shotPower;
  f.launched = true;
  f.stillTimer = 0;

  JD.currentTrail = [];
  JD.trailTick = 0;
  jdRecordTrailPoint(f.x, f.y, true);
  JD.lastPowerRatio = jdClamp(dist / JD.maxPull, 0, 1);
  JD.lastAngleName = jdAngleName(pull);
  JD.shake = 0.055;
  JD.shakeDuration = 0.055;
  JD.shakeStrength =
    1.6 +
    JD.lastPowerRatio *
    1.5;

  jdPlaySound(
    "launch"
  );

  jdSetGamePhase(PHASE_FLYING);
  jdSetCameraFollowFood();
}

function jdCanAcceptAimTouch() {
  return JD.state === STATE_PLAY
    && JD.food
    && !JD.food.launched
    && !JD.food.resolved
    && !JD.fortuneSpinning
    && !(JD.fortunePickedTimer > 0)
    && (JD.gamePhase === PHASE_AIM || JD.gamePhase === PHASE_AIMING);
}


function jdGetScreenPull() {
  if (!JD.dragScreenStart || !JD.dragScreenNow) return { x: 0, y: 0 };
  let x = JD.dragScreenStart.x - JD.dragScreenNow.x;
  let y = JD.dragScreenStart.y - JD.dragScreenNow.y;
  const len = Math.hypot(x, y);
  if (len > JD.maxPull) {
    x = (x / len) * JD.maxPull;
    y = (y / len) * JD.maxPull;
  }
  return { x, y };
}

function jdRecordTrailPoint(x, y, forced) {
  if (!JD.currentTrail) JD.currentTrail = [];
  if (!forced && JD.currentTrail.length > 0) {
    const last = JD.currentTrail[JD.currentTrail.length - 1];
    if (Math.hypot(x - last.x, y - last.y) < 2) return;
  }
  JD.currentTrail.push({ x, y });
  if (JD.currentTrail.length > 30) JD.currentTrail.shift();
}

function jdFinishShotTrail(result) {
  JD.lastTrail = JD.currentTrail ? JD.currentTrail.slice() : null;
  JD.currentTrail = null;
  JD.lastTrailResult = result || "-";
}

function jdAppDraw() {
  if (JD.state === STATE_TITLE) jdDrawTitle();
  else if (JD.state === STATE_PLAY) jdDrawPlay();
  else if (JD.state === STATE_POSTER_TRANSITION) jdDrawPosterFocusIntro();
  else if (JD.state === STATE_POSTER_REVEAL) jdDrawPosterBackgroundWipe();
  else if (JD.state === STATE_POSTER_HOLD) jdDrawCompletionPosterStatic();
  else if (JD.state === STATE_POSTER_PEEL) jdDrawCompletionPosterDismiss();
  else if (JD.state === STATE_POSTER_CAFE_HOLD) jdDrawPosterCafeHold();
  else if (JD.state === STATE_RECEIPT) jdDrawReceipt();

}

// 紙札の登場を、少し膨らむ→わずかに縮む→定位置へ戻る
// 三段階の「ポヨン」に統一する。移動量は増やさず視線を固定する。
function jdCardPopScale(progress) {
  const t = jdClamp(progress, 0, 1);

  if (t < 0.56) {
    const growT = jdClamp(t / 0.56, 0, 1);
    const growEase = 1 - Math.pow(1 - growT, 3);
    return 0.92 + (1.055 - 0.92) * growEase;
  }

  if (t < 0.82) {
    const shrinkT = jdClamp((t - 0.56) / 0.26, 0, 1);
    const shrinkEase = shrinkT * shrinkT * (3 - 2 * shrinkT);
    return 1.055 + (0.985 - 1.055) * shrinkEase;
  }

  const settleT = jdClamp((t - 0.82) / 0.18, 0, 1);
  const settleEase = settleT * settleT * (3 - 2 * settleT);
  return 0.985 + (1 - 0.985) * settleEase;
}

function jdDrawNextThrowBeat() {
  if (!(JD.resultBeatTimer > 0)) return;

  const duration =
    Number.isFinite(JD.resultBeatDuration) &&
    JD.resultBeatDuration > 0
      ? JD.resultBeatDuration
      : 0.92;

  const t = jdClamp(
    1 - JD.resultBeatTimer / duration,
    0,
    1
  );
  const enterDuration =
    JD.motion &&
    Number.isFinite(JD.motion.resultCardEnter)
      ? JD.motion.resultCardEnter
      : 0.16;
  const exitDuration =
    JD.motion &&
    Number.isFinite(JD.motion.resultCardExit)
      ? JD.motion.resultCardExit
      : 0.16;
  const elapsed = t * duration;
  const enterT = jdClamp(elapsed / enterDuration, 0, 1);
  const exitT = jdClamp(
    (elapsed - (duration - exitDuration)) / exitDuration,
    0,
    1
  );
  const enterEase = 1 - Math.pow(1 - enterT, 3);
  const exitEase = exitT * exitT * (3 - 2 * exitT);
  const alpha = 255 * Math.min(enterEase, 1 - exitEase);

  if (alpha <= 0.5) return;

  const cx = JD.LOGICAL_W / 2;
  // 結果を見ている視線を動かさないよう、札自体は上下させず
  // 透明度と小さなポヨンだけで入場させる。
  // Kaisei Decolへ変えた文字の重心に合わせ、札全体を8px上へ置く。
  // 結果位置から大きく跳ばず、上部伝票との余白も残す。
  const y = 511;
  const remaining = Math.max(
    0,
    Math.floor(JD.resultBeatRemaining || 0)
  );
  const remainingText = jdIsEnglish()
    ? `${remaining} ORDER${remaining === 1 ? "" : "S"} LEFT`
    : `あと ${remaining} 件`;
  const typeScale = JD.typeScale || {
    cardMain: 16,
    cardSub: 10
  };
  const popDuration =
    JD.motion && Number.isFinite(JD.motion.card)
      ? JD.motion.card
      : 0.24;
  const cardScale = jdCardPopScale(
    jdClamp(elapsed / popDuration, 0, 1)
  );

  rectMode(CENTER);
  ellipseMode(CENTER);
  textAlign(CENTER);
  noStroke();

  pushMatrix();
  translate(cx, y);
  scale(cardScale);
  translate(-cx, -y);

  jdFill("shadow", 42 * alpha / 255);
  rect(cx + 3, y - 3, 156, 54, 7);

  jdFill("paper", 246 * alpha / 255);
  rect(cx, y, 156, 54, 7);

  jdFill("redDeep", 220 * alpha / 255);
  // 喫茶フォーチュンの結果札と同じく、紙上端から5pxに揃える。
  rect(cx, y + 22, 112, 2.4, 1.2);

  jdFill("ink", 160 * alpha / 255);
  jdFontForLanguage();
  fontSize(typeScale.cardSub);
  // 主見出しとの間に3pxだけ余白を足し、二行を読み分けやすくする。
  text(remainingText, cx, y - 13);

  jdFill("redDeep", 242 * alpha / 255);
  jdFontForLanguage("bold");
  fontSize(typeScale.cardMain);
  text(jdT("beat.next", "NEXT!"), cx, y + 4);

  popMatrix();

  noStroke();
  rectMode(CORNER);
  textAlign(CENTER);
}

// 判定語はゲームの「決まった瞬間」そのものなので、移動で追わせず、
// 一度押し込む→少し大きく跳ねる→定位置へ吸い付く活字の動きにする。
function jdResultImpactStampScale(progress) {
  const t = jdClamp(progress, 0, 1);

  if (t < 0.43) {
    const growT = jdClamp(t / 0.43, 0, 1);
    const growEase = 1 - Math.pow(1 - growT, 3);
    return 0.78 + (1.15 - 0.78) * growEase;
  }

  if (t < 0.73) {
    const pressT = jdClamp((t - 0.43) / 0.30, 0, 1);
    const pressEase = pressT * pressT * (3 - 2 * pressT);
    return 1.15 + (0.975 - 1.15) * pressEase;
  }

  const settleT = jdClamp((t - 0.73) / 0.27, 0, 1);
  const settleEase = settleT * settleT * (3 - 2 * settleT);
  return 0.975 + (1 - 0.975) * settleEase;
}

function jdDrawResultImpactLabel(
  value,
  x,
  y,
  progress,
  perfect = false
) {
  const t = jdClamp(progress, 0, 1);
  const label = String(value || "GOOD!");
  const resultBaseSize =
    JD.typeScale && Number.isFinite(JD.typeScale.result)
      ? JD.typeScale.result
      : 25;
  const lengthScale = label.length >= 10
    ? 0.94
    : 1;
  const labelSize =
    (resultBaseSize + (perfect ? 2 : 0)) *
    1.08 *
    lengthScale;
  const fadeT = jdClamp((t - 0.80) / 0.20, 0, 1);
  const fadeEase = fadeT * fadeT * (3 - 2 * fadeT);
  const alpha = 248 * (1 - fadeEase);

  if (alpha <= 0.5) return 0;

  textAlign(CENTER);
  noStroke();
  jdReceiptFont("bold");
  fontSize(labelSize);

  // 最初の約0.16秒だけ、赤い版が外へ抜ける残像を置く。
  // 円形エフェクトを使わず、TOBIDASHIにも同じ気持ちよさを渡す。
  const echoT = jdClamp(t / 0.22, 0, 1);
  const echoEase = 1 - Math.pow(1 - echoT, 3);
  const echoAlpha =
    (perfect ? 132 : 106) *
    (1 - echoT);

  if (echoAlpha > 0.5) {
    pushMatrix();
    translate(x, y);
    scale(
      0.94 + echoEase * 0.16,
      0.90 + echoEase * 0.12
    );
    fill(151, 48, 42, echoAlpha);
    text(label, 0, 0);
    popMatrix();
  }

  const stampT = jdClamp(t / 0.36, 0, 1);
  const stampScale = jdResultImpactStampScale(stampT);
  const squashT = jdClamp(t / 0.14, 0, 1);
  const squashEase = 1 - Math.pow(1 - squashT, 3);
  const scaleX = stampScale * (0.86 + squashEase * 0.14);
  const scaleY = stampScale * (1.12 - squashEase * 0.12);
  const freshInk = 1 - jdClamp(t / 0.32, 0, 1);

  pushMatrix();
  translate(x, y);
  scale(scaleX, scaleY);

  // 濃茶と赤茶の二版をわずかにずらし、背景を選ばず読める厚みを作る。
  fill(70, 42, 36, alpha * 0.66);
  text(label, 1.35, -1.15);

  fill(
    151,
    48,
    42,
    alpha * (0.20 + freshInk * 0.24)
  );
  text(label, -0.8, 0.55);

  fill(255, 252, 235, alpha);
  text(label, 0, 0);

  popMatrix();
  return alpha;
}

// 場外へ出た方向の画面端で、NOKKARIと同系統の判定語を描く。
// 紙札や輪っかは使わず、共通の押印ポヨンだけを適用する。
function jdDrawOutResultEffect() {
  const food = JD.food;
  if (
    !food ||
    !food.resolved ||
    food.resultType !== "OUT" ||
    !(food.resultTimer > 0)
  ) return;

  const resultDuration =
    JD.motion &&
    Number.isFinite(JD.motion.hitResultNormal)
      ? JD.motion.hitResultNormal
      : 1.04;
  const effectDuration =
    JD.motion &&
    Number.isFinite(JD.motion.hitNormal)
      ? JD.motion.hitNormal
      : 0.74;
  const elapsed = resultDuration - food.resultTimer;

  // NOKKARIと同じ長さだけ見せ、残りの結果待機時間は次の一投へ
  // 呼吸を置く。結果全体のテンポは変更しない。
  if (elapsed < 0 || elapsed > effectDuration) return;

  const t = jdClamp(elapsed / effectDuration, 0, 1);
  const x = Number.isFinite(food.outEffectScreenX)
    ? food.outEffectScreenX
    : JD.LOGICAL_W / 2;
  const y = Number.isFinite(food.outEffectScreenY)
    ? food.outEffectScreenY
    : 260;

  textAlign(CENTER);
  noStroke();

  const label = food.resultLabel || jdT("result.out", "TOBIDASHI");
  const labelY = y + 44;

  jdDrawResultImpactLabel(
    label,
    x,
    labelY,
    t,
    false
  );

  noStroke();
  textAlign(CENTER);
}

// 支給された daivu_text.svg（viewBox 247 x 106）の輪郭を、
// 1px単位の矩形へ変換してコード内へ保持する。
// 外部画像の読み込みを使わないため、sketch.js 単体で同じロゴを描ける。
// 配列は x, y, width, height の繰り返し。
const JD_TITLE_DIVE_LOGO_RECTS = [
  71, 3, 8, 1, 84, 3, 9, 1, 70, 4, 10, 2, 83, 4, 10, 2, 70, 6, 9, 3, 83, 6, 9, 5, 222, 6, 9, 3, 235, 6, 9, 2,
  234, 8, 10, 1, 69, 9, 10, 1, 221, 9, 9, 4, 234, 9, 9, 5, 69, 10, 9, 4, 82, 11, 9, 3, 24, 12, 22, 3, 220, 13, 10, 2,
  68, 14, 10, 1, 80, 14, 11, 3, 137, 14, 20, 1, 193, 14, 19, 1, 233, 14, 10, 1, 23, 15, 23, 1, 66, 15, 12, 1, 136, 15, 21, 3,
  193, 15, 20, 1, 220, 15, 9, 1, 233, 15, 9, 2, 24, 16, 21, 5, 66, 16, 11, 1, 192, 16, 21, 1, 219, 16, 10, 2, 67, 17, 10, 1,
  80, 17, 10, 1, 193, 17, 19, 2, 232, 17, 10, 3, 136, 18, 20, 2, 218, 18, 11, 2, 192, 19, 20, 1, 135, 20, 21, 3, 193, 20, 19, 7,
  219, 20, 9, 1, 232, 20, 9, 1, 23, 21, 21, 1, 23, 22, 22, 1, 23, 23, 57, 1, 134, 23, 21, 2, 23, 24, 59, 1, 22, 25, 60, 2,
  133, 25, 22, 1, 133, 26, 21, 1, 22, 27, 59, 3, 132, 27, 22, 2, 192, 27, 20, 2, 224, 28, 2, 1, 131, 29, 22, 2, 170, 29, 66, 1,
  21, 30, 60, 2, 169, 30, 67, 8, 130, 31, 23, 1, 21, 32, 21, 2, 58, 32, 23, 1, 130, 32, 22, 1, 58, 33, 22, 5, 129, 33, 23, 1,
  20, 34, 22, 2, 129, 34, 22, 1, 128, 35, 23, 1, 20, 36, 21, 2, 127, 36, 23, 2, 19, 38, 22, 2, 58, 38, 21, 1, 126, 38, 23, 1,
  169, 38, 20, 4, 215, 38, 21, 1, 57, 39, 22, 4, 125, 39, 24, 1, 215, 39, 20, 5, 19, 40, 21, 2, 124, 40, 24, 1, 124, 41, 23, 1,
  18, 42, 22, 1, 123, 42, 24, 1, 170, 42, 19, 7, 18, 43, 21, 2, 56, 43, 22, 5, 122, 43, 24, 1, 121, 44, 24, 1, 214, 44, 21, 3,
  17, 45, 22, 1, 120, 45, 24, 1, 16, 46, 22, 3, 118, 46, 24, 1, 117, 47, 24, 1, 215, 47, 20, 3, 55, 48, 22, 3, 116, 48, 25, 1,
  15, 49, 22, 1, 115, 49, 26, 1, 169, 49, 20, 12, 14, 50, 22, 1, 113, 50, 28, 1, 214, 50, 21, 3, 13, 51, 23, 1, 54, 51, 23, 2,
  112, 51, 29, 1, 7, 52, 29, 1, 110, 52, 31, 1, 7, 53, 28, 1, 38, 53, 7, 1, 54, 53, 22, 2, 108, 53, 33, 1, 214, 53, 20, 6,
  6, 54, 28, 2, 37, 54, 14, 1, 106, 54, 34, 1, 37, 55, 39, 2, 103, 55, 37, 1, 6, 56, 27, 1, 98, 56, 42, 1, 6, 57, 25, 1,
  36, 57, 39, 2, 93, 57, 47, 1, 5, 58, 25, 1, 92, 58, 48, 5, 5, 59, 23, 1, 35, 59, 40, 1, 213, 59, 21, 1, 5, 60, 20, 1,
  35, 60, 39, 2, 213, 60, 20, 3, 6, 61, 13, 1, 168, 61, 21, 2, 41, 62, 33, 1, 47, 63, 26, 1, 91, 63, 25, 1, 120, 63, 20, 9,
  168, 63, 20, 1, 212, 63, 21, 3, 51, 64, 22, 2, 91, 64, 22, 1, 91, 65, 14, 1, 50, 66, 23, 1, 212, 66, 20, 2, 50, 67, 22, 2,
  211, 68, 21, 2, 49, 69, 23, 1, 49, 70, 22, 2, 211, 70, 20, 2, 48, 72, 22, 1, 120, 72, 19, 6, 210, 72, 21, 1, 48, 73, 21, 1,
  210, 73, 20, 2, 47, 74, 22, 2, 209, 75, 21, 1, 46, 76, 23, 2, 209, 76, 20, 2, 45, 78, 23, 2, 119, 78, 20, 15, 208, 78, 21, 1,
  208, 79, 20, 1, 44, 80, 23, 2, 207, 80, 21, 2, 43, 82, 23, 2, 206, 82, 21, 2, 42, 84, 23, 1, 205, 84, 21, 1, 41, 85, 24, 1,
  204, 85, 22, 1, 40, 86, 24, 1, 204, 86, 21, 1, 39, 87, 23, 2, 203, 87, 21, 1, 202, 88, 22, 1, 38, 89, 23, 1, 201, 89, 21, 1,
  37, 90, 24, 1, 199, 90, 22, 1, 35, 91, 26, 1, 198, 91, 23, 1, 34, 92, 26, 1, 197, 92, 23, 1, 33, 93, 26, 1, 118, 93, 21, 6,
  195, 93, 24, 1, 31, 94, 27, 1, 193, 94, 25, 1, 29, 95, 27, 1, 191, 95, 26, 1, 27, 96, 29, 1, 186, 96, 30, 1, 24, 97, 29, 1,
  176, 97, 39, 1, 5, 98, 4, 1, 19, 98, 34, 1, 175, 98, 37, 1, 5, 99, 47, 1, 117, 99, 22, 2, 175, 99, 36, 1, 4, 100, 45, 1,
  176, 100, 33, 1, 4, 101, 44, 1, 117, 101, 21, 1, 175, 101, 32, 1, 4, 102, 42, 1, 175, 102, 27, 1, 4, 103, 40, 1, 174, 103, 27, 1,
  4, 104, 37, 1, 174, 104, 24, 1, 3, 105, 36, 1, 174, 105, 19, 1,
];

function jdDrawTitleDiveLogoMask(
  signX,
  signY,
  red,
  green,
  blue,
  alpha
) {
  const logoScale = 0.43;
  const logoCenterX = 123.5;
  const logoCenterY = 53;
  const logoCenterScreenY =
    signY - 23;
  const overlap = 0.035;

  rectMode(CORNER);
  noStroke();
  fill(
    red,
    green,
    blue,
    alpha
  );

  for (
    let i = 0;
    i < JD_TITLE_DIVE_LOGO_RECTS.length;
    i += 4
  ) {
    const x =
      JD_TITLE_DIVE_LOGO_RECTS[i];
    const y =
      JD_TITLE_DIVE_LOGO_RECTS[i + 1];
    const w =
      JD_TITLE_DIVE_LOGO_RECTS[i + 2];
    const h =
      JD_TITLE_DIVE_LOGO_RECTS[i + 3];

    // 分割境界に極細の隙間が出ないよう、同色同士をわずかに重ねる。
    rect(
      signX +
        (x - logoCenterX) *
          logoScale -
        overlap,
      logoCenterScreenY +
        (logoCenterY - y - h) *
          logoScale -
        overlap,
      w * logoScale +
        overlap * 2,
      h * logoScale +
        overlap * 2
    );
  }

  rectMode(CENTER);
}

function jdDrawTitleDiveLogo(
  signX,
  signY,
  signGlow,
  titleAlpha = 1
) {
  // ==================================================
  // 支給ロゴを看板ローカル座標で描く。
  // 推奨領域：x = -54 ～ +54 / y = -57 ～ +43
  // ==================================================

  textAlign(CENTER);
  rectMode(CENTER);
  noStroke();

  const alpha =
    jdClamp(
      titleAlpha,
      0,
      1
    );

  // 店種表示。
  jdTitleFont("bold");
  fontSize(jdIsEnglish() ? 16 : 18);

  fill(
    142,
    63,
    43,
    255 * alpha
  );

  text(
    jdT("title.brandTop", "JUNKISSA"),
    signX,
    signY + 31
  );

  // 上段と店名をつなぐ、最小限の印刷飾り。
  fill(
    151,
    68,
    44,
    205 * alpha
  );

  rect(
    signX,
    signY + 11,
    67,
    1.2,
    0.6
  );

  ellipse(
    signX,
    signY + 11,
    4,
    4
  );

  if (jdIsEnglish()) {
    // 英語表示は、言語切り替え後も意味がすぐ伝わる DIVE を維持する。
    jdTitleFont("bold");
    fontSize(31);

    fill(
      122,
      49,
      35,
      255 * alpha
    );

    const diveTitle =
      jdT("title.brandBottom", "DIVE");

    // 現在の太字へごく薄い横方向の重ね描きを加え、
    // サイズや中央位置を変えずにDIVEだけ一段太く見せる。
    text(
      diveTitle,
      signX - 0.35,
      signY - 23
    );

    text(
      diveTitle,
      signX + 0.35,
      signY - 23
    );

    text(
      diveTitle,
      signX,
      signY - 23
    );

    fill(
      198,
      99,
      57,
      (4 + signGlow * 5) * alpha
    );

    text(
      jdT("title.brandBottom", "DIVE"),
      signX + 0.5,
      signY - 22.5
    );

  } else {
    // 日本語表示は、支給された「ダイヴ」の字形をそのまま使う。
    // 点灯時だけ、ごく薄い暖色の版ずれを下へ重ねる。
    jdDrawTitleDiveLogoMask(
      signX + 0.5,
      signY + 0.5,
      198,
      99,
      57,
      (4 + signGlow * 5) * alpha
    );

    jdDrawTitleDiveLogoMask(
      signX,
      signY,
      124,
      56,
      38,
      255 * alpha
    );
  }

  rectMode(CENTER);
  textAlign(CENTER);
  noStroke();
}

function jdDrawPosterDiveLogo(
  x,
  y,
  alpha = 1
) {
  const safeAlpha =
    jdClamp(alpha, 0, 1);

  const posterScale = 0.42;

  pushMatrix();

  translate(x, y);

  scale(
    posterScale,
    posterScale
  );

  // タイトル看板全体ではなく、
  // 支給された「ダイヴ」の字形だけを描く。
  jdDrawTitleDiveLogoMask(
    0,
    0,
    124,
    56,
    38,
    255 * safeAlpha
  );

  popMatrix();

  rectMode(CORNER);
  textAlign(LEFT);
  noStroke();
}




function jdDrawTitle() {
  rectMode(CORNER);
  ellipseMode(CENTER);
  textAlign(CENTER);
  noStroke();

  const W = JD.LOGICAL_W;
  const H = JD.LOGICAL_H;

  // ==================================================
  // タイトル画面の最終構成
  // 「夜道で喫茶店を見つけた瞬間」の最終仕上げ。
  //
  // ・看板の構図と垂直姿勢は維持
  // ・壁の光漏れを弱め、円形の図形感を抑える
  // ・路面反射を細く途切れた形へ整理
  // ・開店時だけ看板と帯が静かに反応
  // ・自作ロゴの差し替え口を独立
  // ==================================================

  const exitActive =
    JD.titleExitTimer > 0;

  const exitDuration =
    Math.max(
      0.001,
      JD.titleExitDuration || 1.18
    );

  const exitProgress =
    exitActive
      ? jdClamp(
          1 -
          JD.titleExitTimer /
            exitDuration,
          0,
          1
        )
      : 0;

  const signFlash =
    exitActive
      ? Math.sin(
          Math.min(
            1,
            exitProgress / 0.38
          ) * Math.PI
        )
      : 0;

  const breathe =
    0.5 +
    0.5 *
    Math.sin(
      ElapsedTime *
      Math.PI *
      2 / 4.8
    );

  // 待機中は閉店前の暗さを保ち、タップ後に看板から点灯を始める。
  const ambientGlow =
    jdClamp(
      0.18 +
      breathe * 0.06,
      0,
      1
    );

  const signLightRaw =
    exitActive
      ? jdClamp(
          exitProgress / 0.26,
          0,
          1
        )
      : 0;

  const signLight =
    signLightRaw *
    signLightRaw *
    (3 - 2 * signLightRaw);

  // 看板が光ったあと、少し遅れて店内の電気が灯る。
  const interiorLightRaw =
    exitActive
      ? jdClamp(
          (exitProgress - 0.10) / 0.24,
          0,
          1
        )
      : 0;

  const interiorLight =
    interiorLightRaw *
    interiorLightRaw *
    (3 - 2 * interiorLightRaw);

  const lampFlash =
    jdClamp(
      signFlash * 0.70 +
      interiorLight * 0.86,
      0,
      1
    );

  const glow =
    jdClamp(
      ambientGlow +
      signLight * 0.72 +
      signFlash * 0.18,
      0,
      1
    );

  const signAura =
    jdClamp(
      signFlash * 0.92 +
      signLight * 0.34,
      0,
      1
    );

  // ==================================================
  // 1. 夜の壁と大きな余白
  // ==================================================

  fill(
    8,
    20,
    22,
    255
  );

  rect(
    0,
    0,
    W,
    H
  );

  fill(
    13,
    28,
    29,
    255
  );

  rect(
    0,
    150,
    W,
    H - 150
  );

  // 待機中は右側を暗く保ち、点灯後だけ壁へ暖色が戻る。
  fill(
    32 + interiorLight * 17,
    29 + interiorLight * 11,
    25 + interiorLight * 6,
    88 + interiorLight * 30
  );

  rect(
    267,
    150,
    93,
    H - 150
  );

  fill(
    50 + interiorLight * 30,
    38 + interiorLight * 16,
    28 + interiorLight * 6,
    28 + interiorLight * 38
  );

  rect(
    286,
    150,
    74,
    H - 150
  );

  fill(
    74 + interiorLight * 34,
    52 + interiorLight * 21,
    37 + interiorLight * 10,
    24 + interiorLight * 28
  );

  rect(
    276,
    150,
    2,
    H - 150
  );

  // ==================================================
  // 2. 右端の喫茶店の気配
  // ==================================================

  fill(
    27,
    24,
    21,
    255
  );

  rect(
    299,
    150,
    61,
    490
  );

  fill(
    49 + interiorLight * 21,
    35 + interiorLight * 10,
    27 + interiorLight * 2,
    255
  );

  rect(
    308,
    164,
    52,
    464
  );

  fill(
    92 + interiorLight * 84,
    57 + interiorLight * 46,
    36 + interiorLight * 11,
    238
  );

  rect(
    316,
    176,
    44,
    440
  );

  fill(
    239,
    170,
    83,
    10 +
    ambientGlow * 6 +
    interiorLight * 108 +
    signFlash * 14
  );

  rect(
    321,
    184,
    39,
    424
  );

  fill(
    45,
    33,
    26,
    235
  );

  rect(
    331,
    176,
    4,
    440
  );

  // 吊り下げランプ。
  stroke(
    65,
    44,
    30,
    235
  );
  strokeWidth(2);

  line(
    341,
    617,
    341,
    523
  );

  noStroke();

  // 光を一枚の大きな円にせず、
  // 小さな芯から周囲へほどける三層で描く。
  fill(
    247,
    190,
    99,
    2 +
    ambientGlow * 3 +
    interiorLight * 16
  );

  ellipse(
    341,
    505,
    58,
    62
  );

  fill(
    255,
    207,
    119,
    4 +
    ambientGlow * 4 +
    interiorLight * 28 +
    signFlash * 6
  );

  ellipse(
    341,
    507,
    36,
    38
  );

  fill(
    255,
    224,
    151,
    6 +
    ambientGlow * 5 +
    interiorLight * 40 +
    signFlash * 10
  );

  ellipse(
    341,
    508,
    22,
    22
  );

  fill(
    237,
    176,
    86,
    255
  );

  rectMode(CENTER);

  rect(
    341,
    511,
    29,
    4,
    2
  );

  rect(
    341,
    516,
    23,
    5,
    2
  );

  rect(
    341,
    521,
    15,
    5,
    2
  );

  rectMode(CORNER);

  fill(
    255,
    229 + lampFlash * 8,
    155 + lampFlash * 18,
    245
  );

  ellipse(
    341,
    508,
    23,
    8
  );

  // 電球の中心だけ、タップ時に白く灯る。
  fill(
    255,
    248,
    220,
    jdClamp(
      70 +
      ambientGlow * 35 +
      interiorLight * 150 +
      signFlash * 25,
      0,
      255
    )
  );

  ellipse(
    341,
    508,
    10 + lampFlash * 2,
    4 + lampFlash * 1.2
  );

  // ガラスと木枠へ落ちる細い反射光。
  fill(
    255,
    210,
    126,
    4 +
    ambientGlow * 3 +
    interiorLight * 40 +
    signFlash * 10
  );

  rect(
    319,
    188,
    2.2,
    302,
    1.1
  );

  fill(
    255,
    191,
    103,
    3 +
    interiorLight * 28 +
    signFlash * 8
  );

  rect(
    309,
    224,
    1.5,
    226,
    0.75
  );

  // 植物は輪郭ではなく、葉のシルエットだけ。
  // 開店時は、一本の弱い風が通ったように茎がそよぎ、
  // 葉はそれぞれ少し遅れて角度を変える。
  // 待機中は静止し、タイトルの主役を奪わない。
  const plantWind =
    exitActive
      ? Math.sin(
          exitProgress * Math.PI
        ) * 2.15
      : 0;

  // 風が通過したあと、葉だけにごく小さな余韻を残す。
  // 外側のsinで開始と終了を静かに0へ戻す。
  const leafFlutter =
    exitActive
      ? Math.sin(
          exitProgress * Math.PI
        ) *
        Math.sin(
          exitProgress * Math.PI * 2.25
        ) * 2.4
      : 0;

  fill(
    30,
    53,
    38,
    238
  );

  stroke(
    30,
    53,
    38,
    238
  );
  strokeWidth(3);

  line(
    340,
    194,
    340 + plantWind,
    320
  );

  noStroke();

  // 下の葉は重く、ほとんど動かさない。
  pushMatrix();
  translate(
    329 + plantWind * 0.34,
    248 + leafFlutter * 0.05
  );
  rotate(
    -leafFlutter * 0.34
  );
  ellipse(
    0,
    0,
    20,
    10
  );
  popMatrix();

  pushMatrix();
  translate(
    348 + plantWind * 0.54,
    274 - leafFlutter * 0.07
  );
  rotate(
    leafFlutter * 0.52
  );
  ellipse(
    0,
    0,
    22,
    11
  );
  popMatrix();

  // 上へ行くほど、風を少し大きく受ける。
  pushMatrix();
  translate(
    330 + plantWind * 0.77,
    299 + leafFlutter * 0.10
  );
  rotate(
    -leafFlutter * 0.78
  );
  ellipse(
    0,
    0,
    18,
    9
  );
  popMatrix();

  pushMatrix();
  translate(
    350 + plantWind,
    322 - leafFlutter * 0.13
  );
  rotate(
    leafFlutter
  );
  ellipse(
    0,
    0,
    20,
    10
  );
  popMatrix();

  fill(
    61,
    42,
    30,
    255
  );

  rect(
    325,
    176,
    34,
    19,
    3
  );

  // ==================================================
  // 3. 地面
  // ==================================================

  fill(
    14,
    26,
    25,
    255
  );

  rect(
    0,
    0,
    W,
    150
  );

  fill(
    75,
    55,
    39,
    96
  );

  rect(
    0,
    143,
    W,
    7
  );

  // 路面線は長く引かず、暗闇へ消える短い線にする。
  stroke(
    125,
    88,
    53,
    48
  );
  strokeWidth(1.1);

  line(
    72,
    82,
    142,
    90
  );

  line(
    204,
    57,
    276,
    65
  );

  line(
    277,
    120,
    348,
    115
  );

  noStroke();

  // ==================================================
  // 4. 不規則な光漏れと路面反射
  // ==================================================

  // 壁への光は看板の輪郭を囲わない。
  // 店側と足元へ偏った、弱い三つの光だけを置く。
  fill(
    239,
    172,
    82,
    3 + glow * 5
  );

  ellipse(
    206,
    255,
    124,
    180
  );

  fill(
    255,
    200,
    108,
    3 + glow * 4
  );

  ellipse(
    159,
    313,
    82,
    105
  );

  fill(
    255,
    220,
    141,
    2 + glow * 3
  );

  ellipse(
    229,
    218,
    62,
    112
  );

  // 看板直下だけ、短く明るい。
  fill(
    244,
    184,
    94,
    8 + glow * 9
  );

  ellipse(
    170,
    88,
    126,
    36
  );

  // 下へ進むほど細くなり、左右へ少しずれる。
  fill(
    255,
    210,
    130,
    9 + glow * 10
  );

  ellipse(
    164,
    108,
    65,
    53
  );

  fill(
    255,
    226,
    154,
    7 + glow * 8
  );

  ellipse(
    175,
    129,
    29,
    65
  );

  // 反射の端に残る小さな切れ端。
  fill(
    255,
    205,
    124,
    8 + glow * 6
  );

  ellipse(
    142,
    79,
    23,
    5
  );

  ellipse(
    194,
    101,
    18,
    4
  );

  // 濡れた路面へ残る、短い横方向の光。
  fill(
    255,
    221,
    150,
    31 + glow * 16
  );

  rect(
    148,
    67,
    44,
    1.7,
    0.85
  );

  rect(
    160,
    91,
    27,
    1.5,
    0.75
  );

  rect(
    168,
    116,
    13,
    1.3,
    0.65
  );

  // タップ時は光の面を膨らませず、
  // 濡れた路面の短い反射だけが少し浮かび上がる。
  fill(
    255,
    232,
    174,
    lampFlash * 52
  );

  rect(
    145,
    73,
    51,
    1.4,
    0.7
  );

  rect(
    158,
    99,
    31,
    1.2,
    0.6
  );

  rect(
    330,
    133,
    22,
    1.2,
    0.6
  );

  // ==================================================
  // 5. 自立看板
  // ==================================================

  const signX = 171;
  const signY = 278;
  const signAngle = 0;
  const signW = 142;
  const signH = 202;

  // タップ直後は看板の外側へ二層のグロウを放ち、
  // その光を合図に右側の店内が点灯する。
  fill(
    244,
    174,
    88,
    22 * signAura
  );

  ellipse(
    signX,
    signY - 4,
    signW + 84,
    signH + 104
  );

  fill(
    255,
    220,
    151,
    15 * signAura
  );

  ellipse(
    signX,
    signY - 2,
    signW + 40,
    signH + 54
  );

  fill(
    3,
    9,
    10,
    172
  );

  ellipse(
    signX + 3,
    90,
    151,
    29
  );

  // 脚。
  stroke(
    49,
    39,
    31,
    255
  );
  strokeWidth(8);

  line(
    143,
    190,
    132,
    92
  );

  line(
    199,
    190,
    210,
    92
  );

  stroke(
    113,
    83,
    55,
    190
  );
  strokeWidth(2.2);

  line(
    134,
    109,
    208,
    109
  );

  noStroke();

  pushMatrix();

  translate(
    signX,
    signY - signFlash * 1.4
  );

  rotate(
    signAngle
  );

  const pressScale =
    1 - signFlash * 0.006;

  scale(
    pressScale,
    pressScale
  );

  rectMode(CENTER);
  noStroke();

  // 右側へ見える厚み。
  fill(
    43,
    36,
    30,
    255
  );

  rect(
    9,
    -4,
    signW + 5,
    signH + 5,
    17
  );

  fill(
    91,
    71,
    50,
    255
  );

  rect(
    5,
    -1,
    signW + 3,
    signH + 3,
    17
  );

  // 樹脂フレーム。
  fill(
    208 + glow * 8,
    188 + glow * 7,
    144 + glow * 5,
    255
  );

  rect(
    0,
    0,
    signW,
    signH,
    17
  );

  fill(
    86,
    63,
    44,
    238
  );

  rect(
    0,
    0,
    signW - 11,
    signH - 11,
    13
  );

  // 発光面。
  fill(
    247 + glow * 4,
    224 + glow * 7,
    173 + glow * 8,
    255
  );

  rect(
    0,
    0,
    signW - 19,
    signH - 19,
    10
  );

  // 店側の縁だけに暖かな光を置き、厚みを静かに見せる。
  fill(
    255,
    218,
    145,
    15 + ambientGlow * 13
  );

  rect(
    signW / 2 - 13,
    -2,
    2.2,
    signH - 38,
    1.1
  );

  // 点灯時の返り光は、看板全面ではなく縁だけに置く。
  fill(
    255,
    235,
    185,
    lampFlash * 54
  );

  rect(
    signW / 2 - 16,
    7,
    1.8,
    signH - 64,
    0.9
  );

  rect(
    7,
    signH / 2 - 16,
    signW - 62,
    1.6,
    0.8
  );

  // 面の発光ムラは、ごく薄い二面だけ。
  fill(
    255,
    242,
    205,
    8 + glow * 12
  );

  ellipse(
    -26,
    42,
    82,
    66
  );

  fill(
    255,
    231,
    182,
    6 + glow * 10
  );

  ellipse(
    30,
    -47,
    72,
    58
  );

  noFill();

  stroke(
    130,
    69,
    47,
    160
  );
  strokeWidth(1.4);

  rect(
    0,
    0,
    signW - 34,
    signH - 34,
    7
  );

  noStroke();

  // --------------------------------------------------
  // 看板文字。
  // 支給ロゴも看板と同じ変形・フェードへ追従させる。
  // --------------------------------------------------

  // 看板文字は場面が切り替わる最後まで残す。
  // 文字だけが先に消える演出は行わず、画面全体のフェードへ委ねる。
  jdDrawTitleDiveLogo(
    0,
    0,
    jdClamp(
      glow +
      signAura * 0.58,
      0,
      1
    ),
    1
  );

  popMatrix();

  // ==================================================
  // 6. 「開店する」の帯
  // 独立ボタンではなく、画面下端を横切るポスターの色帯。
  // 待機時は静止し、開店時だけごく小さく沈んで明るくなる。
  // ==================================================

  rectMode(CORNER);
  textAlign(CENTER);
  noStroke();

  const bandPress =
    signFlash;

  const bandX = 0;
  const bandY =
    18 - bandPress * 1.2;
  const bandW = W;
  const bandH = 40;

  fill(
    101 + bandPress * 13,
    42 + bandPress * 8,
    32 + bandPress * 5,
    255
  );

  rect(
    bandX,
    bandY,
    bandW,
    bandH
  );

  fill(
    235 + bandPress * 12,
    207 + bandPress * 10,
    157 + bandPress * 8,
    215
  );

  rect(
    bandX,
    bandY + bandH - 4,
    bandW,
    1.3
  );

  rect(
    bandX,
    bandY + 3,
    bandW,
    1.3
  );

  fill(
    247,
    222,
    177,
    255
  );

  jdFontForLanguage("bold");
  fontSize(jdIsEnglish() ? 12 : 17);

  text(
    jdT("title.open", "OPEN THE CAFE"),
    W / 2,
    bandY + 18
  );

  // 言語切り替えはタイトル専用。退場時には下の暗転レイヤーへ
  // 含めるため、タイトル本体の描画順で置く。
  jdDrawLanguageToggle();

  // ==================================================
  // 7. 退場演出
  // ==================================================

  if (
    exitActive
  ) {
    rectMode(CORNER);
    noStroke();

    const warmWash =
      Math.sin(
        jdClamp(
          exitProgress / 0.72,
          0,
          1
        ) * Math.PI
      );

    fill(
      241,
      170,
      82,
      warmWash * 11
    );

    rect(
      0,
      0,
      W,
      H
    );

    const fade =
      jdClamp(
        (exitProgress - 0.66) / 0.34,
        0,
        1
      );

    fill(
      8,
      14,
      15,
      255 * fade
    );

    rect(
      0,
      0,
      W,
      H
    );
  }

  noStroke();
  rectMode(CORNER);
}



function jdDrawPlay() {
  jdUpdateCamera(
    DeltaTime
  );

  rectMode(CORNER);
  ellipseMode(CENTER);
  noStroke();

  fill(
    31,
    23,
    20
  );

  rect(
    -60,
    -60,
    JD.LOGICAL_W + 120,
    JD.LOGICAL_H + 120
  );

  pushMatrix();

  jdApplyCamera();
  jdDrawCafeWideBackdrop();
  jdDrawWorld();

  popMatrix();

  // 店内全体へ印刷物の質感を重ねる。
  // UI文字の可読性は落とさないよう、UIより先に描く。
  jdDrawPosterPrintFinish();

  if (
    JD.gamePhase ===
    PHASE_OPENING_MONOLOGUE
  ) {
    jdDrawOpeningMonologue();

    return;
  }

  jdDrawPlayUI();
  jdDrawShotMeter();
  jdDrawDebugScreen();
  jdDrawFortuneMachine();
  jdDrawOutResultEffect();
  jdDrawNextThrowBeat();

  if (
    JD.gamePhase !==
    PHASE_SHIFT_START
  ) {
    return;
  }

  const duration =
    Number.isFinite(
      JD.shiftStartDuration
    )
      ? JD.shiftStartDuration
      : 7.4;

  const timer =
    Number.isFinite(
      JD.shiftStartTimer
    )
      ? JD.shiftStartTimer
      : duration;

  const elapsed =
    duration - timer;

  rectMode(CENTER);
  ellipseMode(CENTER);
  noStroke();
  textAlign(CENTER);

  // タイトルから喫茶店へのフェードイン
  if (
    JD.shiftFadeInTimer > 0
  ) {
    JD.shiftFadeInTimer =
      Math.max(
        0,
        JD.shiftFadeInTimer -
          DeltaTime
      );
  }

  const fadeDuration =
    Number.isFinite(
      JD.shiftFadeInDuration
    )
      ? JD.shiftFadeInDuration
      : 0.72;

  const fadeAlpha =
    JD.shiftFadeInTimer > 0
      ? 255 *
        jdClamp(
          JD.shiftFadeInTimer /
            fadeDuration,
          0,
          1
        )
      : 0;

  // 導入中の暖色暗幕
  let veilAlpha = 50;

  if (
    elapsed < 0.45
  ) {
    veilAlpha =
      50 *
      (
        elapsed /
        0.45
      );

  } else if (
    elapsed > 6.45
  ) {
    veilAlpha =
      50 *
      jdClamp(
        (
          7.25 -
          elapsed
        ) / 0.8,
        0,
        1
      );
  }

  fill(
    39,
    27,
    22,
    veilAlpha
  );

  rect(
    JD.LOGICAL_W / 2,
    JD.LOGICAL_H / 2,
    JD.LOGICAL_W + 180,
    JD.LOGICAL_H + 180
  );

  if (
    fadeAlpha > 0
  ) {
    fill(
      24,
      17,
      15,
      fadeAlpha
    );

    rect(
      JD.LOGICAL_W / 2,
      JD.LOGICAL_H / 2,
      JD.LOGICAL_W + 200,
      JD.LOGICAL_H + 200
    );
  }

  // -----------------------------------------------
  // 開店
  // -----------------------------------------------

  if (
    elapsed < 1.85
  ) {
    const enterT =
      jdClamp(
        elapsed / 0.42,
        0,
        1
      );

    const lifeT =
      jdClamp(
        elapsed / 1.85,
        0,
        1
      );

    const alpha =
      245 *
      Math.sin(
        lifeT *
        Math.PI
      );

    const scaleIn =
      jdCardPopScale(enterT);

    pushMatrix();

    translate(
      JD.LOGICAL_W / 2,
      348
    );

    scale(
      scaleIn
    );

    jdFill(
      "shadow",
      34 * enterT
    );

    rect(
      4,
      -4,
      154,
      58,
      6
    );

    jdFill(
      "paper",
      240 * enterT
    );

    rect(
      0,
      0,
      154,
      58,
      6
    );

    jdFill(
      "redDeep",
      alpha
    );

    jdFontForLanguage("bold");

    fontSize(jdIsEnglish() ? 21 : 25);

    text(
      jdT("intro.open", "OPEN"),
      0,
      7
    );

    jdFill(
      "ink",
      alpha * 0.72
    );

    jdFontForLanguage();
    fontSize(jdIsEnglish() ? 7.2 : 8);

    text(
      jdT("intro.startShift", "YOUR SHIFT STARTS NOW"),
      0,
      -16
    );

    popMatrix();
  }

  // -----------------------------------------------
  // 本日の注文票
  // -----------------------------------------------

  if (
    elapsed >= 1.45 &&
    elapsed < 5.45
  ) {
    const enterT =
      jdClamp(
        (
          elapsed -
          1.45
        ) / 0.42,
        0,
        1
      );

    const leaveT =
      jdClamp(
        (
          5.45 -
          elapsed
        ) / 0.48,
        0,
        1
      );

    const alpha =
      Math.min(
        enterT,
        leaveT
      );

    const cardY =
      342 +
      (
        1 -
        enterT
      ) * 16;

    // 高さと情報量は変えず、左右の余白だけを詰めて
    // 注文票らしい引き締まった比率にする。
    const cardW = 200;
    const cardH = 184;
    const cardScale =
      jdCardPopScale(enterT);

    pushMatrix();
    translate(
      JD.LOGICAL_W / 2,
      cardY
    );
    scale(cardScale);
    translate(
      -JD.LOGICAL_W / 2,
      -cardY
    );

    jdFill(
      "shadow",
      40 * alpha
    );

    rect(
      JD.LOGICAL_W / 2 + 4,
      cardY - 4,
      cardW,
      cardH,
      6
    );

    jdFill(
      "paper",
      255 * alpha
    );

    rect(
      JD.LOGICAL_W / 2,
      cardY,
      cardW,
      cardH,
      6
    );

    jdFill(
      "redDeep",
      255 * alpha
    );

    rect(
      JD.LOGICAL_W / 2,
      cardY + 70,
      cardW - 18,
      3,
      1.5
    );

    jdFill(
      "ink",
      235 * alpha
    );

    jdFontForLanguage("bold");

    fontSize(jdIsEnglish() ? 14 : 17);

    text(
      jdT("intro.todayOrder", "TODAY'S ORDERS"),
      JD.LOGICAL_W / 2,
      cardY + 48
    );

    jdFill(
      "ink",
      160 * alpha
    );

    jdFontForLanguage();
    fontSize(9);

    text(
      jdT("intro.mondayShift", "MONDAY SHIFT"),
      JD.LOGICAL_W / 2,
      cardY + 29
    );

    jdFill(
      "ink",
      62 * alpha
    );

    for (
      let x =
        JD.LOGICAL_W / 2 - 88;
      x <=
        JD.LOGICAL_W / 2 + 88;
      x += 8
    ) {
      rect(
        x,
        cardY + 15,
        4,
        1
      );
    }

    textAlign(LEFT);

    jdFill(
      "ink",
      225 * alpha
    );

    jdFontForLanguage("bold");
    fontSize(jdIsEnglish() ? 11 : 12);

    // 食品名は注文票の中央軸へ寄せ、三品を一つのまとまりにする。
    const orderListX =
      JD.LOGICAL_W / 2 - 42;

    text(
      `・${jdT("target.coffee", "COFFEE")}`,
      orderListX,
      cardY - 7
    );

    text(
      `・${jdT("target.cake", "CAKE")}`,
      orderListX,
      cardY - 30
    );

    text(
      `・${jdT("target.melon", "MELON SODA")}`,
      orderListX,
      cardY - 53
    );

    textAlign(RIGHT);

    jdFill(
      "redDeep",
      220 * alpha
    );

    fontSize(12);

    text(
      jdT("intro.fiveThrows", "5 ORDERS"),
      JD.LOGICAL_W / 2 + 76,
      cardY - 76
    );

    textAlign(CENTER);
    popMatrix();
  }

  // 「カウンターへどうぞ」は表示しない
  rectMode(CORNER);
}




function jdGetCafeTimeParts() {
  let minute = 0;
  let second = 0;
  let millisecond = 0;

  try {
    const now = new Date();

    minute =
      now.getMinutes();

    second =
      now.getSeconds();

    millisecond =
      now.getMilliseconds();

  } catch (_error) {
    // 取得できない場合は00分にフォールバック
  }

  return {
    hour: 1,
    minute,
    second,
    millisecond
  };
}


function jdDrawCafeWideBackdrop() {
  rectMode(CORNER);
  ellipseMode(CENTER);
  noStroke();

  const left = -180;
  const width = JD.worldW + 360;

  // ==================================================
  // 店全体の基礎背景
  // ==================================================

  // カウンター下まで続く店内
  jdFill("tableFront");
  rect(
    left,
    -520,
    width,
    JD.tableY + 40
  );

  // 高い店内壁
  jdFill("wall");

  rect(
    left,
    JD.tableY,
    width,
    960
  );

  if (
    jdIsPosterStyle()
  ) {
    // カウンターに近い下側は、
    // 紙に近い明るい面として見せる。
    jdFill(
      "creamWarm",
      13
    );

    rect(
      left,
      JD.tableY,
      width,
      390
    );

    // 上側はわずかに赤みのある面。
    // 影ではなく色の切り替えで奥行きを作る。
    jdFill(
      "wallShade",
      12
    );

    rect(
      left,
      540,
      width,
      420
    );
  }

  // 壁上部をわずかに暗くし、
  // 照明が落ちる場所との明暗差を作る
  jdFill(
    "wallShade",
    jdPosterAlpha(
      24,
      9
    )
  );
  rect(
    left,
    640,
    width,
    470
  );

  // 天井付近だけをもう一段暗くする。
  // 下側の広い余白は明るく残し、料理と軌道を見やすくする。
  jdFill(
    "woodDark",
    jdPosterAlpha(
      12,
      6
    )
  );
  rect(
    left,
    900,
    width,
    210
  );

  // 壁の見切り
  jdFill("redDeep", 135);
  rect(
    left,
    540,
    width,
    6
  );

  jdFill("wallLine", 42);
  rect(
    left,
    531,
    width,
    2
  );

  // ==================================================
  // 左上：静かな遠い夜景
  // ==================================================

  const windowX = 88;
  const windowY = 690;
  const windowW = 300;
  const windowH = 250;

  // 窓の影
  jdFill("shadow", 60);
  rect(
    windowX + 7,
    windowY - 7,
    windowW,
    windowH,
    8
  );

  // 木枠
  jdFill("woodDark");
  rect(
    windowX,
    windowY,
    windowW,
    windowH,
    7
  );

  // 夜空
  fill(29, 36, 52);
  rect(
    windowX + 14,
    windowY + 14,
    windowW - 28,
    windowH - 28,
    3
  );

  // 夜空の淡い層
  fill(42, 46, 60, 150);
  rect(
    windowX + 14,
    windowY + 94,
    windowW - 28,
    55
  );

  fill(53, 51, 59, 105);
  rect(
    windowX + 14,
    windowY + 48,
    windowW - 28,
    47
  );

  // 遠くの建物群
  fill(23, 26, 34, 245);

  rect(
    windowX + 20,
    windowY + 20,
    48,
    76
  );

  rect(
    windowX + 65,
    windowY + 20,
    66,
    105
  );

  rect(
    windowX + 126,
    windowY + 20,
    42,
    68
  );

  rect(
    windowX + 164,
    windowY + 20,
    72,
    118
  );

  rect(
    windowX + 231,
    windowY + 20,
    37,
    84
  );

  // 遠くの灯りを少数だけ置く。
  // 同時に点滅させず、長い周期でごく小さく呼吸させる。
  const warmWindowPulse =
    142 +
    Math.sin(
      ElapsedTime * 0.43
    ) * 10 +
    Math.sin(
      ElapsedTime * 0.17 + 1.8
    ) * 5;

  fill(
    235,
    198,
    120,
    warmWindowPulse
  );

  rect(
    windowX + 82,
    windowY + 78,
    10,
    13,
    1
  );

  rect(
    windowX + 109,
    windowY + 52,
    9,
    12,
    1
  );

  rect(
    windowX + 182,
    windowY + 92,
    10,
    14,
    1
  );

  rect(
    windowX + 215,
    windowY + 58,
    9,
    12,
    1
  );

  const coolWindowPulse =
    90 +
    Math.sin(
      ElapsedTime * 0.31 + 2.4
    ) * 8 +
    Math.sin(
      ElapsedTime * 0.12
    ) * 4;

  fill(
    178,
    211,
    199,
    coolWindowPulse
  );

  rect(
    windowX + 41,
    windowY + 53,
    8,
    11,
    1
  );

  rect(
    windowX + 247,
    windowY + 68,
    8,
    12,
    1
  );

  // 遠い町の水平線
  fill(18, 22, 29, 230);
  rect(
    windowX + 14,
    windowY + 20,
    windowW - 28,
    15
  );

  // 窓桟
  jdFill("wood");
  rect(
    windowX + windowW / 2 - 5,
    windowY + 8,
    10,
    windowH - 16
  );

  rect(
    windowX + 8,
    windowY + 121,
    windowW - 16,
    10
  );

  // ガラスの反射は控えめに
  jdFill("highlight", 18);

  rect(
    windowX + 35,
    windowY + 155,
    4,
    55,
    3
  );

  rect(
    windowX + 181,
    windowY + 160,
    3,
    43,
    3
  );

  // ==================================================
  // 中央：古い壁時計
  // ==================================================

  const clockX = 510;
  const clockY = 795;

  // 時計本体と同じ輪郭の切り絵影
  jdFill("shadow", 42);
  ellipse(
    clockX + 4,
    clockY - 4,
    92,
    92
  );

  jdFill("woodDark");
  ellipse(
    clockX,
    clockY,
    92,
    92
  );

  jdFill("creamWarm");
  ellipse(
    clockX,
    clockY,
    74,
    74
  );

  // 純喫茶ダイヴは深夜営業。
  // 時だけ01時に固定し、分・秒だけ現実の時計と同期する。
  const cafeTime =
    jdGetCafeTimeParts();

  const clockHour =
    cafeTime.hour;

  const clockMinute =
    cafeTime.minute;

  const clockSecond =
    cafeTime.second;

  const clockMillis =
    cafeTime.millisecond;

  const smoothSecond =
    clockSecond +
    clockMillis / 1000;

  const smoothMinute =
    clockMinute +
    smoothSecond / 60;

  const smoothHour =
    clockHour +
    smoothMinute / 60;

  const hourAngle =
    Math.PI / 2 -
    (
      smoothHour / 12
    ) *
    Math.PI *
    2;

  const minuteAngle =
    Math.PI / 2 -
    (
      smoothMinute / 60
    ) *
    Math.PI *
    2;

  const secondAngle =
    Math.PI / 2 -
    (
      smoothSecond / 60
    ) *
    Math.PI *
    2;

  // 時針
  jdStroke(
    "ink",
    205
  );

  strokeWidth(4);

  line(
    clockX,
    clockY,
    clockX +
    Math.cos(
      hourAngle
    ) * 18,
    clockY +
    Math.sin(
      hourAngle
    ) * 18
  );

  // 分針
  jdStroke(
    "ink",
    190
  );

  strokeWidth(2.8);

  line(
    clockX,
    clockY,
    clockX +
    Math.cos(
      minuteAngle
    ) * 27,
    clockY +
    Math.sin(
      minuteAngle
    ) * 27
  );

  // 秒針は主張しすぎない細い赤茶色
  jdStroke(
    "redDeep",
    145
  );

  strokeWidth(1.2);

  line(
    clockX -
    Math.cos(
      secondAngle
    ) * 5,
    clockY -
    Math.sin(
      secondAngle
    ) * 5,
    clockX +
    Math.cos(
      secondAngle
    ) * 29,
    clockY +
    Math.sin(
      secondAngle
    ) * 29
  );

  strokeWidth(2);

  line(
    clockX,
    clockY + 31,
    clockX,
    clockY + 25
  );

  line(
    clockX + 31,
    clockY,
    clockX + 25,
    clockY
  );

  line(
    clockX,
    clockY - 31,
    clockX,
    clockY - 25
  );

  line(
    clockX - 31,
    clockY,
    clockX - 25,
    clockY
  );

  noStroke();

  jdFill("redDeep");
  ellipse(
    clockX,
    clockY,
    7
  );

  // ==================================================
  // 右上：メニューボード
  // ==================================================

  const menuX = 650;
  const menuY = 690;
  const menuW = 245;
  const menuH = 220;

  // 黒板本体と同じ輪郭の切り絵影
  jdFill("shadow", 44);
  rect(
    menuX + 4,
    menuY - 4,
    menuW,
    menuH,
    7
  );

  jdFill("woodDark");
  rect(
    menuX,
    menuY,
    menuW,
    menuH,
    7
  );

  fill(44, 55, 48);
  rect(
    menuX + 12,
    menuY + 12,
    menuW - 24,
    menuH - 24,
    3
  );

  textAlign(CENTER);

  jdFill("creamWarm", 220);
  jdReceiptFont("bold");
  fontSize(18);

  text(
    "TODAY'S MENU",
    menuX + menuW / 2,
    menuY + 176
  );

  jdFill("creamWarm", 165);
  jdReceiptFont();
  fontSize(12);

  text(
    "COFFEE ........ 500",
    menuX + menuW / 2,
    menuY + 138
  );

  text(
    "MELON SODA .... 600",
    menuX + menuW / 2,
    menuY + 108
  );

  text(
    "CAKE .......... 650",
    menuX + menuW / 2,
    menuY + 78
  );

  jdFill("red", 190);
  jdReceiptFont("bold");
  fontSize(11);

  text(
    "SPECIAL : DIVE",
    menuX + menuW / 2,
    menuY + 42
  );

  // ==================================================
  // 天井とペンダントライト
  // ==================================================

  jdFill("woodDark");
  rect(
    left,
    1015,
    width,
    34
  );

  jdFill("wood", 110);
  rect(
    left,
    1011,
    width,
    5
  );

  const lightXs = [
    245,
    600,
    855
  ];

  for (const lx of lightXs) {
    jdStroke("woodDark", 210);
    strokeWidth(4);

    line(
      lx,
      1018,
      lx,
      930
    );

    noStroke();

    // 壁へ落ちる暖かな光。
    // 輪郭の強い円ではなく、下へ広がる層として描く。
    fill(
      255,
      229,
      184,
      jdPosterAlpha(
        9,
        11
      )
    );
    ellipse(
      lx,
      770,
      270,
      330
    );

    fill(
      255,
      231,
      188,
      jdPosterAlpha(
        13,
        16
      )
    );
    ellipse(
      lx,
      820,
      220,
      250
    );

    fill(
      255,
      234,
      196,
      jdPosterAlpha(
        18,
        22
      )
    );
    ellipse(
      lx,
      865,
      148,
      142
    );

    fill(
      255,
      239,
      207,
      jdPosterAlpha(
        23,
        28
      )
    );
    ellipse(
      lx,
      894,
      86,
      70
    );

    // シェードの下だけを少し明るくして、
    // 電球が灯っていることを伝える
    fill(
      255,
      240,
      211,
      jdPosterAlpha(
        26,
        34
      )
    );
    ellipse(
      lx,
      902,
      54,
      34
    );

    // 赤茶色のシェード
    jdFill("redDeep");
    ellipse(
      lx,
      920,
      69,
      31
    );

    // シェード上部の金具
    jdFill("woodDark", 230);
    rect(
      lx - 6,
      919,
      12,
      19,
      4
    );

    // 暖色の電球
    jdFill("creamWarm", 245);
    ellipse(
      lx,
      906,
      26,
      13
    );

    // 電球中心の小さなハイライト
    jdFill("highlight", 135);
    ellipse(
      lx - 3,
      909,
      9,
      5
    );
  }

  // ==================================================
  // 下側：カウンター収納
  // ==================================================

  const cabinetTop = 118;
  const cabinetBottom = -250;
  const cabinetH =
    cabinetTop -
    cabinetBottom;

  jdFill("tableFront");
  rect(
    left,
    cabinetBottom,
    width,
    cabinetH
  );

  jdFill("tableLip");
  rect(
    left,
    cabinetTop - 12,
    width,
    13
  );

  jdFill("tableStripe", 48);
  rect(
    left,
    cabinetTop - 18,
    width,
    4
  );

  // 収納扉だけを整然と並べる
  for (
    let x = -95;
    x < JD.worldW + 90;
    x += 165
  ) {
    jdFill("tableLip", 110);
    rect(
      x + 8,
      cabinetBottom + 22,
      141,
      cabinetH - 54,
      7
    );

    jdFill("tableTop", 165);
    rect(
      x + 15,
      cabinetBottom + 29,
      127,
      cabinetH - 68,
      5
    );

    noFill();
    jdStroke("tableStripe", 36);
    strokeWidth(3);

    rect(
      x + 28,
      cabinetBottom + 47,
      101,
      cabinetH - 104,
      4
    );

    noStroke();

    jdFill("gold", 190);
    ellipse(
      x + 78,
      cabinetBottom + cabinetH - 63,
      16,
      8
    );
  }

  // ==================================================
  // 足元の床
  // ==================================================

  const floorTop =
    cabinetBottom;

  fill(46, 37, 34);
  rect(
    left,
    -520,
    width,
    floorTop + 520
  );

  const tile = 72;

  for (
    let row = 0;
    row < 4;
    row++
  ) {
    for (
      let col = -3;
      col < 18;
      col++
    ) {
      const tx =
        col * tile;

      const ty =
        -520 +
        row * tile;

      if (
        (row + col) % 2 === 0
      ) {
        fill(67, 55, 49);
      } else {
        fill(39, 46, 43);
      }

      rect(
        tx,
        ty,
        tile,
        tile
      );
    }
  }

  stroke(
    236,
    218,
    184,
    24
  );

  strokeWidth(2);

  for (
    let x = -216;
    x <= JD.worldW + 216;
    x += tile
  ) {
    line(
      x,
      -520,
      x,
      floorTop
    );
  }

  for (
    let y = -520;
    y <= floorTop;
    y += tile
  ) {
    line(
      left,
      y,
      left + width,
      y
    );
  }

  noStroke();

  // ==================================================
  // 中央下：丸椅子
  // ==================================================

  // 床との接地影。
  // 椅子の脚より先に描き、空間に置かれている感覚を出す。
  jdFill("shadow", 42);
  ellipse(
    494,
    -307,
    178,
    25
  );

  jdFill("shadow", 22);
  ellipse(
    494,
    -302,
    112,
    13
  );

  jdStroke("woodDark", 235);
  strokeWidth(9);

  line(
    466,
    -40,
    425,
    -298
  );

  line(
    522,
    -40,
    560,
    -298
  );

  jdStroke("gold", 115);
  strokeWidth(4);

  line(
    438,
    -224,
    548,
    -224
  );

  noStroke();

  jdFill("redDeep");
  ellipse(
    494,
    -21,
    142,
    36
  );

  jdFill("woodDark", 215);
  ellipse(
    494,
    -17,
    118,
    24
  );
}




function jdDrawWorld() {
  rectMode(CORNER);
  ellipseMode(CENTER);
  noStroke();

  // 端末比率やズームアウト量が変わっても、
  // 背景とテーブルの端が画面内へ出ないよう左右に延長する
  const visualLeft = -360;
  const visualRight = JD.worldW + 360;
  const visualWidth =
    visualRight -
    visualLeft;

  // Poster-like cafe wall
  jdFill("wall");
  rect(
    visualLeft,
    0,
    visualWidth,
    JD.LOGICAL_H
  );

  jdFill("wallShade", 32);
  rect(
    visualLeft,
    372,
    visualWidth,
    112
  );

  jdFill("redDeep", 150);
  rect(
    visualLeft,
    374,
    visualWidth,
    5
  );

  jdFill("wallLine", 55);
  rect(
    visualLeft,
    304,
    visualWidth,
    2
  );

  rect(
    visualLeft,
    446,
    visualWidth,
    2
  );

  // quiet poster grain / cafe panels
  jdFill("highlight", 18);

  for (
    let x = visualLeft + 30;
    x <= visualRight;
    x += 120
  ) {
    rect(
      x,
      JD.tableY + 84,
      54,
      126,
      18
    );
  }

  // table front and top
  jdFill("tableFront");
  rect(
    visualLeft,
    0,
    visualWidth,
    JD.tableY - 30
  );

  jdFill("tableTop");
  rect(
    visualLeft,
    JD.tableY - 16,
    visualWidth,
    32
  );

  jdFill("tableLip");
  rect(
    visualLeft,
    JD.tableY - 18,
    visualWidth,
    5
  );

  rect(
    visualLeft,
    JD.tableY + 11,
    visualWidth,
    6
  );

  jdFill("tableStripe", 20);

  for (
    let x = visualLeft + 40;
    x <= visualRight;
    x += 118
  ) {
    rect(
      x,
      0,
      4,
      JD.tableY - 32
    );
  }

  // 軌道の装飾描画は結果種別によって末端表現が変わるため、
  // 端末側の描画API差異で例外が出てもゲーム全体を停止させない。
  // 本体の軌道線は例外発生前まで描画される。
  try {
    jdDrawLastShotGhost();
  } catch (error) {
    if (!JD.lastShotGhostErrorLogged) {
      JD.lastShotGhostErrorLogged = true;
      console.warn("jdDrawLastShotGhost skipped:", error);
    }
    noStroke();
  }
  for (const t of JD.targets) {
    jdDrawHitZone(t);
    jdDrawTarget(t);
  }
  for (const o of JD.obstacles) jdDrawObstacle(o);
  jdDrawPlacedFoods();
  jdDrawLauncher();
  jdDrawLauncherItemTicket();

  let fx =
    JD.food
      ? JD.food.x
      : JD.launcher.x;

  let fy =
    JD.food
      ? JD.food.y
      : JD.launcher.y;

  // チュートリアルでは実際の食材座標を変更せず、
  // 描画位置だけを仮想的に動かす。
  if (
    JD.tutorialActive &&
    JD.food &&
    !JD.food.launched &&
    !JD.food.resolved &&
    !JD.dragging
  ) {
    const tutorialPose =
      jdAimTutorialPose();

    fx =
      tutorialPose.x;

    fy =
      tutorialPose.y;
  }

  // 仮想素材へ向けたゴム・案内を先に描画
  if (
    JD.tutorialActive &&
    JD.food &&
    !JD.dragging
  ) {
    jdDrawAimTutorialWorld(
      fx,
      fy
    );
  }

  if (JD.dragging && JD.food && !JD.food.launched && !JD.food.resolved) {
    const pull = jdGetScreenPull();
    const dragWorld = jdScreenToWorldPoint(
      JD.dragScreenNow.x,
      JD.dragScreenNow.y
    );

    fx = dragWorld.x;
    fy = dragWorld.y;

    const anchorX =
      JD.launcher.x + 20;

    const upperAnchorY =
      JD.launcher.y + 18;

    const lowerAnchorY =
      JD.launcher.y - 18;

    // 二本の赤茶色のゴム紐
    jdStroke("redDeep", 245);
    strokeWidth(5);

    line(
      anchorX,
      upperAnchorY,
      fx + 3,
      fy + 5
    );

    line(
      anchorX,
      lowerAnchorY,
      fx + 3,
      fy - 5
    );

    // ゴム表面の細いハイライト
    jdStroke("red", 145);
    strokeWidth(1.5);

    line(
      anchorX,
      upperAnchorY + 1,
      fx + 3,
      fy + 6
    );

    line(
      anchorX,
      lowerAnchorY + 1,
      fx + 3,
      fy - 4
    );

    noStroke();

    // 引っ張った食材の後ろに小さな受け布
    jdFill("woodDark", 205);
    rect(
      fx + 5,
      fy,
      13,
      24,
      5
    );

    jdFill("wood", 135);
    rect(
      fx + 3,
      fy,
      6,
      18,
      3
    );

    jdDrawTrajectory(pull);
  }

  if (
    JD.food
  ) {
    if (
      !(
        JD.food.resolved &&
        JD.food.hideAfterResolve
      )
    ) {
      let foodAlpha =
        255;

      let foodScale =
        1;

      // Fortune退場後、発射台へ現れる素材だけを
      // フェード＋小さなオーバーシュートで表示する。
      if (
        !JD.food.launched &&
        !JD.food.resolved &&
        !JD.dragging
      ) {
        const enterDuration =
          JD.motion &&
          Number.isFinite(
            JD.motion.itemTicketEnter
          )
            ? JD.motion.itemTicketEnter
            : 0.46;

        const appearT =
          jdClamp(
            (
              JD.itemTicketTimer ||
              0
            ) /
            enterDuration,
            0,
            1
          );

        const fadeEase =
          1 -
          Math.pow(
            1 -
            appearT,
            3
          );

        // 0.70 → 1.12 → 1.00
        // 前半で少し大きく膨らみ、
        // 後半で柔らかく通常サイズへ戻る。
        let popScale;

        if (
          appearT <
          0.68
        ) {
          const growT =
            jdClamp(
              appearT /
              0.68,
              0,
              1
            );

          const growEase =
            1 -
            Math.pow(
              1 -
              growT,
              3
            );

          popScale =
            0.70 +
            (
              1.12 -
              0.70
            ) *
            growEase;

        } else {
          const settleT =
            jdClamp(
              (
                appearT -
                0.68
              ) /
              0.32,
              0,
              1
            );

          const settleEase =
            settleT *
            settleT *
            (
              3 -
              2 *
              settleT
            );

          popScale =
            1.12 +
            (
              1.00 -
              1.12
            ) *
            settleEase;
        }

        foodAlpha =
          255 *
          fadeEase;

        foodScale =
          popScale;
      }

      jdDrawFood(
        JD.food,
        fx,
        fy,
        foodAlpha,
        foodScale
      );
    }

    if (
      JD.food.resolved &&
      JD.food.label
    ) {
      const isFloor =
        JD.food.label ===
        jdT(
          "result.floor",
          "FLOOR"
        );

      jdReceiptFont("bold");

      fontSize(23);
      textAlign(CENTER);

      // FLOORは食材や皿と重なりやすいため、
      // カウンター前面の緑色部分へ表示する。
      const resultLabelY =
        isFloor
          ? JD.tableY - 12
          : JD.food.y + 34;

      if (
        isFloor
      ) {
        // 薄い影ではなく、印刷の版ずれとして濃茶を添える。
        fill(
          74,
          45,
          38,
          165
        );

        text(
          JD.food.label,
          JD.food.x + 1.2,
          resultLabelY - 1
        );

        // ポスター版のhighlight補正を通さない、
        // 完全不透明の明るいクリーム色。
        fill(
          255,
          247,
          220,
          255
        );

      } else {
        jdFill(
          "highlight",
          230
        );
      }

      text(
        JD.food.label,
        JD.food.x,
        resultLabelY
      );
    }
  }

  jdDrawParticles();
  jdDrawFloatTexts();
  jdDrawDebugWorld();
}


function jdDrawPlate(
  x,
  y,
  w,
  h,
  alpha = 235
) {
  ellipseMode(CENTER);
  noStroke();

  // ポスター版では落ち影をほぼ使わないが、
  // ごく薄い接地面だけ残して皿を背景から分離する。
  jdFill(
    "shadow",
    24
  );

  ellipse(
    x + 4,
    y - 2,
    w,
    h * 0.62
  );

  // 皿本体
  jdFill(
    "plate",
    alpha
  );

  ellipse(
    x,
    y,
    w,
    h
  );

  // 左上の乳白色反射。
  // 立体感ではなく、印刷面の明るい差として控えめに残す。
  jdFill(
    "highlight",
    42
  );

  ellipse(
    x - w * 0.14,
    y + h * 0.12,
    w * 0.42,
    h * 0.25
  );

  noStroke();
}




function jdDrawCoffeeTarget(t) {
  // ソーサー
  jdDrawPlate(
    t.x,
    JD.tableY + 7,
    94,
    19,
    245
  );

  // カップ本体
  jdFill(
    "creamWarm",
    255
  );

  rect(
    t.x,
    JD.tableY + 29,
    60,
    36,
    11
  );

  // 左上の縦ハイライト
  jdFill(
    "highlight",
    jdPosterAlpha(
      62,
      28
    )
  );

  rect(
    t.x - 18,
    JD.tableY + 31,
    6,
    22,
    3
  );

  // 取っ手
  jdFill(
    "creamWarm",
    240
  );

  ellipse(
    t.x + 35,
    JD.tableY + 28,
    18,
    25
  );

  jdFill(
    "wall",
    255
  );

  ellipse(
    t.x + 35,
    JD.tableY + 28,
    9,
    16
  );

  // 飲み口とコーヒー
  jdFill(
    "creamWarm",
    255
  );

  ellipse(
    t.x,
    JD.tableY + 43,
    66,
    15
  );

  jdFill(
    "coffee",
    255
  );

  ellipse(
    t.x,
    JD.tableY + 43,
    54,
    10.5
  );

  // コーヒー面の反射
  jdFill(
    "coffeeLight",
    jdPosterAlpha(
      42,
      22
    )
  );

  ellipse(
    t.x - 9,
    JD.tableY + 44,
    20,
    3.5
  );

  // ==================================================
  // 柔らかなスチーム
  //
  // 線ではなく、薄い楕円を重ねる。
  // 一見すると空気の霞に見え、
  // 数秒眺めると上へ流れていることが分かる。
  // ==================================================

  noStroke();
  ellipseMode(CENTER);

  for (
    let i = 0;
    i < 5;
    i++
  ) {
    const cycle =
      3.8 +
      i * 0.43;

    const phase =
      (
        ElapsedTime *
        (
          0.34 +
          i * 0.018
        ) +
        i * 0.73
      ) %
      cycle;

    const progress =
      phase /
      cycle;

    const rise =
      progress *
      34;

    const sway =
      Math.sin(
        progress *
        Math.PI *
        2 +
        i * 1.4
      ) *
      (
        3 +
        progress * 4
      );

    // 最初と最後はゆっくり透明になる
    const fadeIn =
      jdClamp(
        progress / 0.18,
        0,
        1
      );

    const fadeOut =
      jdClamp(
        (
          1 -
          progress
        ) /
        0.30,
        0,
        1
      );

    const alpha =
      28 *
      fadeIn *
      fadeOut;

    const steamX =
      t.x -
      9 +
      i * 4.5 +
      sway *
      0.72;

    const steamY =
      JD.tableY +
      47 +
      rise *
      0.84;

    jdFill(
      "creamWarm",
      alpha
    );

    ellipse(
      steamX,
      steamY,
      8 +
      progress * 10,
      5 +
      progress * 7
    );

    // 中心にもう一層だけ淡い霞を重ねる
    jdFill(
      "highlight",
      alpha * 0.42
    );

    ellipse(
      steamX - 1,
      steamY + 1,
      6 +
      progress * 7,
      4 +
      progress * 5
    );
  }

  noStroke();
}



function jdDrawCakeTarget(t) {
  jdDrawPlate(
    t.x,
    JD.tableY + 7,
    102,
    20,
    242
  );

  // 下段スポンジ
  jdFill("cakeSponge", 250);
  rect(
    t.x,
    JD.tableY + 20,
    68,
    28,
    5
  );

  // 苺クリームの細い層
  jdFill("cakePink", 215);
  rect(
    t.x,
    JD.tableY + 29,
    68,
    7,
    3
  );

  // 中央クリーム
  jdFill("cakeCream", 255);
  rect(
    t.x,
    JD.tableY + 34,
    68,
    8,
    4
  );

  // 上段スポンジ
  jdFill("cakeSponge", 245);
  rect(
    t.x,
    JD.tableY + 45,
    68,
    15,
    5
  );

  // 上部クリーム
  jdFill("cakeCream", 255);
  rect(
    t.x,
    JD.tableY + 57,
    68,
    9,
    5
  );

  // ケーキ側面にも左上の反射を一本だけ
  jdFill(
    "highlight",
    jdPosterAlpha(
      48,
      22
    )
  );
  rect(
    t.x - 27,
    JD.tableY + 34,
    5,
    44,
    3
  );

  // クリーム飾りは3個に統一
  for (const dx of [-22, 0, 22]) {
    jdFill("cakeCream", 250);
    ellipse(
      t.x + dx,
      JD.tableY + 67,
      16,
      13
    );

    jdFill(
      "highlight",
      jdPosterAlpha(
        66,
        25
      )
    );
    ellipse(
      t.x + dx - 4,
      JD.tableY + 70,
      4.5,
      3
    );
  }
}


function jdDrawSmallStrawberry(
  x,
  y,
  sc = 1,
  alpha = 255
) {
  pushMatrix();
  translate(x, y);
  scale(sc);
  noStroke();

  // smaller, simpler, and a little cuter
  jdFill("red", alpha);
  ellipse(-3.5, 3, 10.5, 11.5);
  ellipse(3.5, 3, 10.5, 11.5);
  ellipse(0, -2.5, 14, 16);
  jdFill("redDeep", 82 * alpha / 255);
  ellipse(0, -6.5, 8, 6.5);

  jdFill("tableTop", 225 * alpha / 255);
  ellipse(-4, 10, 5.5, 2.8);
  ellipse(0, 11, 5.5, 2.8);
  ellipse(4, 10, 5.5, 2.8);

  // fewer seeds
  jdFill("cream", 180 * alpha / 255);
  ellipse(-3.5, 3.5, 1.8, 2.2);
  ellipse(2.5, 4.5, 1.8, 2.2);
  ellipse(-1.0, -1.0, 1.8, 2.2);
  ellipse(3.5, -2.5, 1.8, 2.2);

  jdFill("highlight", 115 * alpha / 255);
  ellipse(-4, 6, 2.8, 2.8);
  popMatrix();
}

function jdDrawMelonTarget(t) {
  // グラスの脚と台
  jdFill("shadow", 32);
  ellipse(
    t.x + 5,
    JD.tableY + 1,
    72,
    12
  );

  jdFill("glass", 145);
  ellipse(
    t.x,
    JD.tableY + 5,
    56,
    14
  );

  jdFill("glass", 112);
  rect(
    t.x,
    JD.tableY + 25,
    13,
    40,
    6
  );

  jdFill("glass", 160);
  ellipse(
    t.x,
    JD.tableY + 30,
    34,
    11
  );

  // グラス本体
  jdFill(
    "glass",
    jdPosterAlpha(
      68,
      48
    )
  );
  rect(
    t.x,
    JD.tableY + 80,
    66,
    126,
    15
  );

  // ガラス線は左右両方ではなく、
  // 左上側の反射を主役にする
  jdFill(
    "glassEdge",
    jdPosterAlpha(
      112,
      58
    )
  );
  rect(
    t.x - 29,
    JD.tableY + 82,
    5,
    114,
    3
  );

  jdFill(
    "glassEdge",
    jdPosterAlpha(
      72,
      24
    )
  );
  rect(
    t.x + 29,
    JD.tableY + 80,
    4,
    110,
    3
  );

  jdFill("glassEdge", 135);
  ellipse(
    t.x,
    JD.tableY + 143,
    62,
    19
  );

  // ソーダ
  jdFill("soda", 210);
  rect(
    t.x,
    JD.tableY + 76,
    42,
    92,
    9
  );

  // 左側だけに明るい色面を置く
  jdFill(
    "sodaLight",
    jdPosterAlpha(
      72,
      38
    )
  );
  rect(
    t.x - 11,
    JD.tableY + 78,
    11,
    78,
    6
  );

  jdFill("sodaLight", 145);
  ellipse(
    t.x,
    JD.tableY + 122,
    41,
    12
  );

  jdFill("highlight", 64);
  ellipse(
    t.x - 10,
    JD.tableY + 116,
    13,
    5
  );

  // 氷は3個から2個へ整理
  jdDrawIceCube(
    t.x - 11,
    JD.tableY + 91,
    16,
    -16,
    96
  );

  jdDrawIceCube(
    t.x + 8,
    JD.tableY + 69,
    17,
    11,
    78
  );

  // 気泡も4個から2個へ
  jdFill("highlight", 170);
  ellipse(
    t.x - 13,
    JD.tableY + 62,
    3.5,
    3.5
  );

  ellipse(
    t.x + 12,
    JD.tableY + 94,
    3,
    3
  );

  // アイス
  jdFill("creamWarm", 252);
  ellipse(
    t.x,
    JD.tableY + 123,
    46,
    33
  );

  jdFill("highlight", 112);
  ellipse(
    t.x - 10,
    JD.tableY + 130,
    16,
    7
  );

  // ストローはソーダの内部から外へ
  jdStroke("redDeep", 210);
  strokeWidth(2.2);

  line(
    t.x + 5,
    JD.tableY + 86,
    t.x + 30,
    JD.tableY + 204
  );

  noStroke();
}


function jdDrawIceCube(x, y, size, deg, alpha) {
  pushMatrix();
  translate(x, y);
  rotate(deg);
  rectMode(CENTER);
  noStroke();
  jdFill("ice", alpha);
  rect(0, 0, size, size * 1.08, 4);
  jdFill("highlight", alpha * 0.45);
  rect(-size * 0.18, size * 0.18, size * 0.42, size * 0.25, 3);
  popMatrix();
}

function jdDrawCherryGarnish(
  x,
  y,
  sc = 1,
  alpha = 255
) {
  pushMatrix();
  translate(x, y);
  scale(sc);
  noStroke();
  jdFill("red", alpha);
  ellipse(0, 0, 12, 12);
  jdFill("highlight", 140 * alpha / 255);
  ellipse(-3, 3, 3, 3);
  jdStroke("tableTop", 220 * alpha / 255);
  strokeWidth(2);
  line(1, 6, -2, 16);
  noStroke();
  popMatrix();
}













function jdDrawTarget(t) {
  rectMode(CENTER);
  ellipseMode(CENTER);
  noStroke();

  if (
    t.kind === "coffee"
  ) {
    jdDrawCoffeeTarget(t);

  } else if (
    t.kind === "cake"
  ) {
    jdDrawCakeTarget(t);

  } else if (
    t.kind === "melon"
  ) {
    jdDrawMelonTarget(t);
  }

}



function jdDrawFood(
  f,
  x,
  y,
  alpha = 255,
  scaleValue = 1
) {
  pushMatrix();

  translate(x, y);

  // 飛行中に蓄積した角度を、状態に関係なく描画へ反映する
  // 発射前の食材は visualAngle が未設定なので 0 度のまま
  const visualAngle = Number.isFinite(f.visualAngle)
    ? f.visualAngle
    : 0;

  rotate(visualAngle);

  scale(scaleValue);

  rectMode(CENTER);
  ellipseMode(CENTER);
  noStroke();

  const posterStyle =
    jdIsPosterStyle();

  if (f.shape === "circle") {
    // チェリー
    jdFill("red", alpha);
    ellipse(
      -1,
      -1,
      f.r * 1.85,
      f.r * 1.75
    );

    jdFill(
      "redDeep",
      alpha *
      (
        posterStyle
          ? 0
          : 0.22
      )
    );

    ellipse(
      2,
      -5,
      f.r * 1.05,
      f.r * 0.60
    );

    jdFill(
      "highlight",
      Math.floor(
        alpha *
        (
          posterStyle
            ? 0
            : 0.44
        )
      )
    );

    ellipse(
      -4,
      4,
      4.2,
      4
    );

    jdFill(
      "redDeep",
      Math.floor(alpha * 0.50)
    );

    ellipse(
      1,
      7,
      4,
      2.2
    );

    jdStroke(
      "tableTop",
      Math.floor(alpha * 0.92)
    );

    strokeWidth(1.7);

    line(
      2,
      8,
      10,
      21
    );

    noStroke();

  } else if (f.shape === "rect") {
    // 角砂糖
    jdFill("cream", alpha);

    rect(
      0,
      0,
      f.w,
      f.h,
      3.5
    );

    jdFill(
      "highlight",
      Math.floor(
        alpha *
        (
          posterStyle
            ? 0
            : 0.50
        )
      )
    );

    rect(
      -3.5,
      4,
      f.w * 0.44,
      f.h * 0.30,
      2.5
    );

    jdFill(
      "wallShade",
      Math.floor(
        alpha *
        (
          posterStyle
            ? 0.12
            : 0.22
        )
      )
    );

    rect(
      3.5,
      -3.5,
      f.w * 0.30,
      f.h * 0.35,
      2.5
    );

    jdFill(
      "creamWarm",
      Math.floor(alpha * 0.55)
    );

    ellipse(
      -4,
      -4,
      2.5,
      2.5
    );

  } else if (f.shape === "oval") {
    // いちご
    jdFill("red", alpha);

    ellipse(
      -3.5,
      3,
      f.w * 0.42,
      f.h * 0.40
    );

    ellipse(
      3.5,
      3,
      f.w * 0.42,
      f.h * 0.40
    );

    ellipse(
      0,
      -3,
      f.w * 0.62,
      f.h * 0.60
    );

    jdFill(
      "redDeep",
      alpha *
      (
        posterStyle
          ? 0
          : 0.18
      )
    );

    ellipse(
      1,
      -7,
      f.w * 0.36,
      f.h * 0.24
    );

    jdFill(
      "tableTop",
      Math.floor(alpha * 0.88)
    );

    ellipse(
      -4.5,
      8.5,
      5.5,
      2.8
    );

    ellipse(
      0,
      9.5,
      5.5,
      2.8
    );

    ellipse(
      4.5,
      8.5,
      5.5,
      2.8
    );

    jdFill(
      "cream",
      Math.floor(alpha * 0.76)
    );

    ellipse(
      -4,
      3.5,
      2,
      2.5
    );

    ellipse(
      2.5,
      4,
      2,
      2.5
    );

    ellipse(
      -1.5,
      -1,
      2,
      2.5
    );

    ellipse(
      3.5,
      -2.5,
      2,
      2.5
    );

    jdFill(
      "highlight",
      Math.floor(alpha * 0.34)
    );

    ellipse(
      -4,
      5.5,
      3.5,
      3.5
    );
  }

  popMatrix();
}



function jdDrawObstacle(o) {
  rectMode(CENTER);
  ellipseMode(CENTER);
  noStroke();

  if (o.kind === "spoon") {
    // 接地影だけでカウンターとの位置関係を示す。
    // スプーン本体には輪郭線を付けない。
    jdFill(
      "shadow",
      20
    );

    ellipse(
      o.x + 5,
      o.y - 4,
      75,
      5
    );

    // 柄の本体。
    // ほかの食器と同じ、不透明なクリーム色の面で描く。
    stroke(
      255,
      247,
      220,
      255
    );

    strokeWidth(5);

    line(
      o.x - 32,
      o.y,
      o.x + 28,
      o.y + 3
    );

    // 柄の上側に、ごく薄い色差だけを添える。
    stroke(
      255,
      252,
      235,
      205
    );

    strokeWidth(1.4);

    line(
      o.x - 30,
      o.y + 1,
      o.x + 26,
      o.y + 4
    );

    noStroke();

    // 先端も輪郭なしの一枚の色面。
    fill(
      255,
      247,
      220,
      255
    );

    ellipse(
      o.x + 36,
      o.y + 5,
      24,
      10
    );

    // 印刷面のわずかな明るさの差。
    fill(
      255,
      253,
      238,
      210
    );

    ellipse(
      o.x + 31,
      o.y + 7,
      9,
      2.5
    );

    noStroke();

  } else if (o.kind === "ticket") {
    jdFill("shadow", 30);
    rect(
      o.x + 3,
      o.y - 3,
      o.w,
      o.h,
      3
    );

    jdFill("paper");
    rect(
      o.x,
      o.y,
      o.w,
      o.h,
      3
    );

    jdFill("red", 60);
    rect(
      o.x,
      o.y + 15,
      o.w - 5,
      4,
      2
    );

  } else if (o.kind === "coaster") {
    jdFill("shadow", 30);
    ellipse(
      o.x + 4,
      o.y - 3,
      o.r * 2.05,
      o.r * 0.62
    );

    jdFill("wood", 230);
    ellipse(
      o.x,
      o.y,
      o.r * 2.05,
      o.r * 0.62
    );

    jdFill("woodDark", 115);
    ellipse(
      o.x,
      o.y + 1,
      o.r * 1.42,
      o.r * 0.34
    );

    jdFill("highlight", 42);
    ellipse(
      o.x - 4,
      o.y + 3,
      o.r * 0.92,
      o.r * 0.15
    );
  }
}


// 食材を触らずにいる時の操作ヒント。
// 二つの波紋を短く「ピョ・ピョン」と出し、その後は長めに休む。
function jdDrawLauncherIdleRipples(
  x,
  y,
  ready,
  firstThrow
) {
  if (
    !ready ||
    JD.tutorialActive ||
    !JD.food
  ) {
    return;
  }

  const now = Number.isFinite(ElapsedTime)
    ? ElapsedTime
    : 0;

  if (!Number.isFinite(JD.food.idleRippleStartedAt)) {
    JD.food.idleRippleStartedAt = now;
  }

  const elapsed = Math.max(
    0,
    now - JD.food.idleRippleStartedAt
  );
  const initialDelay = 0.42;

  if (elapsed < initialDelay) return;

  const cycleDuration = 2.40;
  const rippleDuration = 0.62;
  const rippleStarts = [0, 0.30];
  const phase =
    (elapsed - initialDelay) % cycleDuration;

  ellipseMode(CENTER);
  noFill();

  for (const start of rippleStarts) {
    const age = phase - start;

    if (age < 0 || age > rippleDuration) continue;

    const t = jdClamp(age / rippleDuration, 0, 1);
    const expandEase = 1 - Math.pow(1 - t, 2);
    const hop = Math.sin(t * Math.PI) * 1.8;
    const alpha =
      (firstThrow ? 152 : 108) *
      Math.sin(t * Math.PI);

    jdStroke("creamWarm", alpha);
    strokeWidth(2.2 - t * 0.9);
    ellipse(
      x,
      y - 1 + hop,
      24 + expandEase * 56,
      8 + expandEase * 17
    );
  }

  noStroke();
}

function jdDrawLauncher() {
  const x = JD.launcher.x;
  const y = JD.launcher.y;

  const ready =
    JD.food &&
    !JD.food.launched &&
    !JD.food.resolved &&
    !JD.dragging &&
    !JD.fortuneSpinning &&
    !(JD.fortunePickedTimer > 0);

  const firstThrow =
    JD.throwIndex <= 1 &&
    JD.results.length === 0;

  const pulse =
    0.5 +
    0.5 * Math.sin(
      ElapsedTime * 3.2
    );

  rectMode(CENTER);
  ellipseMode(CENTER);
  noStroke();

  // ==================================================
  // 喫茶店の木製スタンド
  // 発射台が空中に浮いて見えないよう、
  // 小さな丸天板・一本脚・丸いベースで支える。
  // 当たり判定には使わず、描画だけを追加する。
  // ==================================================

  // 支えを少し低めに落として、
  // コーヒー皿などの接地感に寄せる。
  const standBaseY =
    JD.tableY + 9;

  const standTopY =
    y - 31;

  // テーブルへ落ちる小さな接地影
  jdFill("shadow", 34);

  ellipse(
    x + 3,
    standBaseY - 2,
    52,
    14
  );

  // 丸い足元ベース
  jdFill("woodDark", 255);

  ellipse(
    x,
    standBaseY,
    52,
    14
  );

  jdFill("wood", 255);

  ellipse(
    x - 1,
    standBaseY + 2,
    45,
    9
  );

  jdFill("highlight", 34);

  ellipse(
    x - 5,
    standBaseY + 4,
    25,
    3
  );

  // 一本脚。影・濃色・木色を重ねて、
  // 細いながらも家具らしい厚みを出す。
  jdStroke("shadow", 38);
  strokeWidth(12);

  line(
    x + 3,
    standBaseY + 3,
    x + 3,
    standTopY - 2
  );

  jdStroke("woodDark", 255);
  strokeWidth(9);

  line(
    x,
    standBaseY + 3,
    x,
    standTopY
  );

  jdStroke("wood", 255);
  strokeWidth(5);

  line(
    x - 1,
    standBaseY + 4,
    x - 1,
    standTopY
  );

  jdStroke("highlight", 38);
  strokeWidth(1.5);

  line(
    x - 3,
    standBaseY + 7,
    x - 3,
    standTopY - 3
  );

  noStroke();

  // 発射台を受ける小さな丸天板
  jdFill("shadow", 34);

  ellipse(
    x + 2,
    standTopY - 2,
    42,
    14
  );

  jdFill("woodDark", 255);

  ellipse(
    x,
    standTopY,
    42,
    14
  );

  jdFill("wood", 255);

  ellipse(
    x - 1,
    standTopY + 2,
    36,
    9
  );

  jdFill("highlight", 38);

  ellipse(
    x - 5,
    standTopY + 4,
    18,
    3
  );

  // ここから上は、木製スタンドより前面のレイヤー。
  // 発射台本体を前に出して、支えが後ろに回る見え方にする。
  // 台座と同じ輪郭を右下へずらした切り絵影
  jdFill("shadow", 42);

  ellipse(
    x + 4,
    y - 11,
    72,
    36
  );

  // 木製の台座
  jdFill("woodDark", 255);

  ellipse(
    x,
    y - 7,
    72,
    36
  );

  jdFill("wood", 255);

  ellipse(
    x - 2,
    y - 3,
    66,
    31
  );

  // 木目
  jdStroke("woodDark", 105);
  strokeWidth(2);

  line(
    x - 25,
    y - 1,
    x + 21,
    y - 7
  );

  line(
    x - 17,
    y + 5,
    x + 16,
    y + 1
  );

  noStroke();

  // 食材を受ける白い皿
  // 食器なので、ここだけ接地影を残す
  jdFill("shadow", 32);

  ellipse(
    x + 2,
    y - 1,
    34,
    14
  );

  jdFill("plate", 250);

  ellipse(
    x,
    y + 2,
    32,
    14
  );

  jdFill("highlight", 90);

  ellipse(
    x - 3,
    y + 4,
    19,
    6
  );

  // 上下の真鍮クリップ
  jdFill("woodDark", 225);

  rect(
    x + 20,
    y + 15,
    9,
    24,
    4
  );

  rect(
    x + 20,
    y - 15,
    9,
    24,
    4
  );

  jdFill("gold", 255);

  ellipse(
    x + 20,
    y + 18,
    13,
    13
  );

  ellipse(
    x + 20,
    y - 18,
    13,
    13
  );

  jdFill("highlight", 125);

  ellipse(
    x + 17,
    y + 20,
    4,
    4
  );

  ellipse(
    x + 17,
    y - 16,
    4,
    4
  );

  // 待機中のゴム
  // チュートリアル中は専用の案内ゴムを描くため、
  // 通常の待機ゴムは非表示にする。
  if (
    !JD.dragging &&
    !JD.tutorialActive
  ) {
    const breathe =
      ready && firstThrow
        ? pulse * 3
        : 0;

    jdStroke("redDeep", 235);

    strokeWidth(
      ready && firstThrow
        ? 4.8
        : 4
    );

    line(
      x + 20,
      y + 18,
      x + 5 - breathe,
      y + 6
    );

    line(
      x + 20,
      y - 18,
      x + 5 - breathe,
      y - 6
    );

    jdStroke("red", 92);
    strokeWidth(1.5);

    line(
      x + 20,
      y + 19,
      x + 5 - breathe,
      y + 7
    );

    line(
      x + 20,
      y - 17,
      x + 5 - breathe,
      y - 5
    );

    noStroke();
  }

  // 従来の薄い塗り丸は使わず、食材の後ろで二連波紋だけを見せる。
  jdDrawLauncherIdleRipples(
    x,
    y,
    ready,
    firstThrow
  );

  // 発射台から伸びる操作ガイドは、最初のチュートリアル中だけ表示する。
  // 通常プレイでは右端へ矢印が残らず、二連波紋だけで操作を促す。
  if (
    ready &&
    JD.tutorialActive
  ) {
    const guideAlpha =
      firstThrow
        ? 92 + pulse * 92
        : 42 + pulse * 46;

    const guideLength =
      firstThrow
        ? 88
        : 66;

    jdFill(
      "highlight",
      guideAlpha
    );

    for (let i = 0; i < 5; i++) {
      const t =
        (i + 1) / 5;

      ellipse(
        x + 30 + guideLength * t,
        y - 2 - 25 * t,
        firstThrow
          ? 4.4 + pulse * 1.4
          : 3.2 + pulse * 0.8
      );
    }

    const arrowX =
      x + 36 + guideLength;

    const arrowY =
      y - 30;

    jdStroke(
      "redDeep",
      guideAlpha
    );

    strokeWidth(
      firstThrow
        ? 3
        : 2
    );

    line(
      arrowX - 10,
      arrowY + 2,
      arrowX,
      arrowY
    );

    line(
      arrowX,
      arrowY,
      arrowX - 4,
      arrowY + 9
    );

    line(
      arrowX,
      arrowY,
      arrowX - 10,
      arrowY - 2
    );

    noStroke();
  }
}

// 線画比較用の発射台ラッパーは廃止。
// 正式版では元のjdDrawLauncherをそのまま使用する。






function jdDrawPlacedFoods() {
  for (const f of JD.placedFoods) {
    const age =
      ElapsedTime -
      (f.placedAt || 0);

    let sc = 1;

    if (
      age >= 0 &&
      age < 0.24
    ) {
      const breatheT =
        age /
        0.24;

      // 1.00 → 1.035 → 1.00
      sc =
        1 +
        Math.sin(
          breatheT *
          Math.PI
        ) *
        0.035;
    }

    // 古い設置データでも安全に描画できるよう補完
    if (!Number.isFinite(f.visualAngle)) {
      f.visualAngle = 0;
    }

    jdDrawFood(
      f,
      f.x,
      f.y,
      f.alpha || 230,
      sc
    );
  }

  jdDrawHitEffectWorld();
}


function jdDrawHitEffectWorld() {
  if (
    !JD.hitEffectTimer ||
    JD.hitEffectTimer <= 0
  ) {
    return;
  }

  if (
    !JD.food ||
    !JD.food.resolved
  ) {
    return;
  }

  // ヒットストップ中は演出時計も止める。
  // 衝突した一枚絵を一瞬だけ見せる。
  if (
    !(JD.hitStopTimer > 0)
  ) {
    JD.hitEffectTimer -=
      DeltaTime ||
      0.016;
  }

  const duration =
    JD.hitEffectDuration ||
    0.74;

  const t =
    1 -
    jdClamp(
      JD.hitEffectTimer /
      duration,
      0,
      1
    );

  const x =
    JD.hitEffectX;

  const y =
    JD.hitEffectY;

  const perfect =
    JD.hitEffectPerfect;

  ellipseMode(CENTER);
  rectMode(CENTER);
  textAlign(CENTER);

  // ==================================================
  // 衝突直後の白い圧縮フラッシュ
  // 約0.1秒以内に消える
  // ==================================================

  const flashT =
    jdClamp(
      t / 0.16,
      0,
      1
    );

  const flashAlpha =
    (
      perfect
        ? 205
        : 145
    ) *
    (
      1 -
      flashT
    );

  noStroke();

  fill(
    255,
    250,
    222,
    flashAlpha
  );

  ellipse(
    x,
    y,
    46 +
    flashT * 30,
    25 +
    flashT * 17
  );

  // ==================================================
  // 短い放射線
  // PERFECTは8本、通常は6本
  // ==================================================

  if (
    flashT < 1
  ) {
    noFill();

    stroke(
      255,
      246,
      210,
      flashAlpha *
      0.88
    );

    strokeWidth(
      perfect
        ? 3
        : 2
    );

    const rayCount =
      perfect
        ? 8
        : 6;

    const inner =
      20 +
      flashT * 6;

    const outer =
      34 +
      flashT * 20;

    for (
      let i = 0;
      i < rayCount;
      i++
    ) {
      const angle =
        (
          i /
          rayCount
        ) *
        Math.PI *
        2;

      line(
        x +
        Math.cos(angle) *
        inner,
        y +
        Math.sin(angle) *
        inner *
        0.62,
        x +
        Math.cos(angle) *
        outer,
        y +
        Math.sin(angle) *
        outer *
        0.62
      );
    }
  }

  // ==================================================
  // 従来の柔らかい光輪
  // ==================================================

  noStroke();

  const spotAlpha =
    (
      perfect
        ? 112
        : 78
    ) *
    (
      1 -
      t
    );

  fill(
    255,
    245,
    205,
    Math.max(
      0,
      spotAlpha
    )
  );

  ellipse(
    x,
    y,
    78 +
    24 * t,
    40 +
    14 * t
  );

  noFill();

  strokeWidth(
    perfect
      ? 4
      : 3
  );

  stroke(
    255,
    245,
    215,
    (
      perfect
        ? 220
        : 165
    ) *
    (
      1 -
      t
    )
  );

  ellipse(
    x,
    y,
    26 +
    (
      perfect
        ? 74
        : 58
    ) *
    t,
    16 +
    (
      perfect
        ? 46
        : 36
    ) *
    t
  );

  strokeWidth(2);

  stroke(
    255,
    255,
    255,
    (
      perfect
        ? 165
        : 105
    ) *
    (
      1 -
      t
    )
  );

  ellipse(
    x,
    y,
    16 +
    (
      perfect
        ? 52
        : 40
    ) *
    t,
    10 +
    (
      perfect
        ? 34
        : 26
    ) *
    t
  );

  // ==================================================
  // 成功テキスト
  // 衝突位置から動かさず、押印→ポヨン→定着の活字演出に統一する。
  // ==================================================

  const labelY = y + 44;
  const alpha = jdDrawResultImpactLabel(
    JD.hitEffectLabel || "GOOD!",
    x,
    labelY,
    t,
    perfect
  );

  if (
    perfect &&
    alpha > 0
  ) {
    const perfectEnter = jdClamp(
      (t - 0.12) / 0.18,
      0,
      1
    );

    jdReceiptFont("bold");
    fontSize(10.5);

    fill(
      255,
      251,
      231,
      alpha *
      0.90 *
      perfectEnter
    );

    text(
      jdT(
        "result.perfect",
        "PERFECT CENTER"
      ),
      x,
      y + 68
    );
  }

  noStroke();
  rectMode(CORNER);
}


function jdDrawTrajectory(pull) {
  const vx =
    pull.x * JD.shotPower;

  const vy =
    pull.y * JD.shotPower;

  const g =
    JD.gravity *
    (
      (
        JD.food &&
        JD.food.gravityScale
      ) ||
      1
    );

  const pullRatio =
    jdClamp(
      Math.hypot(
        pull.x,
        pull.y
      ) / JD.maxPull,
      0,
      1
    );

  // 弱いショットでも軌道を読みやすくしつつ、
  // 強いショットでは少し遠くまで見せる
  const pointCount =
    9 +
    Math.round(
      pullRatio * 3
    );

  for (
    let i = 1;
    i <= pointCount;
    i++
  ) {
    const t =
      i * 0.052;

    const px =
      JD.launcher.x +
      vx * t;

    const py =
      JD.launcher.y +
      vy * t -
      0.5 * g * t * t;

    if (
      px > -40 &&
      px < JD.worldW + 40 &&
      py > -20 &&
      py < JD.worldH + 40
    ) {
      // 発射台に近い点ほど強く、
      // 遠くなるにつれて静かに消える
      const progress =
        i / pointCount;

      const alpha =
        178 -
        progress * 126;

      const size =
        4.4 -
        progress * 1.7;

      jdFill(
        "creamWarm",
        Math.max(
          38,
          alpha
        )
      );

      ellipse(
        px,
        py,
        Math.max(
          2.6,
          size
        )
      );
    }
  }
}


function jdDrawLastShotGhost() {
  const trail =
    JD.lastTrail;

  if (
    !trail ||
    trail.length < 2
  ) {
    return;
  }

  const count =
    trail.length;

  const result =
    JD.lastTrailResult ||
    "-";

  const isSuccess =
    result === "LAND" ||
    result === "DIVE" ||
    result === "STAB";

  noFill();

  // ==================================================
  // 1. 薄い赤茶の版ずれ
  // ==================================================

  for (
    let i = 1;
    i < count;
    i++
  ) {
    const a =
      trail[i - 1];

    const b =
      trail[i];

    const t =
      i /
      Math.max(
        1,
        count - 1
      );

    // FLOORは終盤を擦れたように欠けさせる
    if (
      result === "FLOOR" &&
      t > 0.72 &&
      i % 2 === 0
    ) {
      continue;
    }

    // 通常の印刷欠け
    if (
      i > 2 &&
      i < count - 2 &&
      i % 8 === 0
    ) {
      continue;
    }

    const centerWeight =
      Math.sin(
        t *
        Math.PI
      );

    // 発射直後を少し濃くする
    const startWeight =
      Math.max(
        0,
        1 -
        t / 0.25
      );

    stroke(
      118,
      58,
      50,
      54 +
      centerWeight * 28 +
      startWeight * 28
    );

    // 印刷時のインク圧の揺れ。
    // 規則的な点線には見えない程度に、ごく小さく変化させる。
    const underprintPressure =
      Math.sin(
        i * 1.47
      ) * 0.14 +
      Math.sin(
        i * 0.63
      ) * 0.08;

    strokeWidth(
      Math.max(
        1.7,
        2.0 +
        centerWeight * 0.8 +
        startWeight * 0.5 +
        underprintPressure
      )
    );

    line(
      a.x + 1.4,
      a.y - 1.2,
      b.x + 1.4,
      b.y - 1.2
    );
  }

  // ==================================================
  // 2. 紙白の主線
  // ==================================================

  for (
    let i = 1;
    i < count;
    i++
  ) {
    const a =
      trail[i - 1];

    const b =
      trail[i];

    const t =
      i /
      Math.max(
        1,
        count - 1
      );

    if (
      result === "FLOOR" &&
      t > 0.72 &&
      i % 2 === 0
    ) {
      continue;
    }

    if (
      i > 2 &&
      i < count - 2 &&
      i % 8 === 0
    ) {
      continue;
    }

    const centerWeight =
      Math.sin(
        t *
        Math.PI
      );

    const startWeight =
      Math.max(
        0,
        1 -
        t / 0.24
      );

    // FLOORだけ終盤を薄く擦れさせる
    const floorFade =
      result === "FLOOR" &&
      t > 0.65
        ? jdClamp(
            1 -
            (
              t -
              0.65
            ) /
            0.35,
            0.28,
            1
          )
        : 1;

    stroke(
      255,
      248,
      222,
      (
        188 +
        centerWeight * 45 +
        startWeight * 22
      ) *
      floorFade
    );

    // 均一なベクター線ではなく、
// 一筆で描いたような小さな筆圧差を加える。
    const handPressure =
      Math.sin(
        i * 1.63
      ) * 0.20 +
      Math.sin(
        i * 0.71
      ) * 0.10;

    strokeWidth(
      Math.max(
        1.85,
        2.15 +
        centerWeight * 1.55 +
        startWeight * 0.65 +
        handPressure
      )
    );

    line(
      a.x,
      a.y,
      b.x,
      b.y
    );
  }

  noStroke();
  ellipseMode(CENTER);

  // ==================================================
  // 3. 後半の印刷粒
  // ==================================================

  const particleStart =
    result === "DIVE"
      ? 0.48
      : 0.60;

  const particleStep =
    result === "DIVE"
      ? 2
      : 3;

  for (
    let i = Math.floor(
      count *
      particleStart
    );
    i < count - 1;
    i += particleStep
  ) {
    const p =
      trail[i];

    const t =
      i /
      Math.max(
        1,
        count - 1
      );

    // FLOORは終盤ほど粒も欠けさせる
    if (
      result === "FLOOR" &&
      t > 0.78 &&
      i % 4 !== 0
    ) {
      continue;
    }

    const seed =
      (
        i * 17 +
        count * 7
      ) % 11;

    const offsetX =
      (
        seed - 5
      ) * 0.42;

    const offsetY =
      (
        (
          i * 13
        ) % 9 -
        4
      ) * 0.48;

    const particleSize =
      result === "DIVE"
        ? 2.6 + t * 2.1
        : 2.1 + t * 1.6;

    fill(
      118,
      58,
      50,
      result === "FLOOR"
        ? 48
        : 68
    );

    ellipse(
      p.x +
      offsetX +
      1.1,
      p.y +
      offsetY -
      1,
      particleSize +
      0.7,
      particleSize *
      0.68
    );

    fill(
      255,
      249,
      225,
      result === "FLOOR"
        ? 150
        : 220
    );

    ellipse(
      p.x +
      offsetX,
      p.y +
      offsetY,
      particleSize,
      result === "DIVE"
        ? particleSize * 1.18
        : particleSize * 0.72
    );
  }

  // ==================================================
  // 4. 始点の「描き始め」
  // ==================================================

  const start =
    trail[0];

  const next =
    trail[
      Math.min(
        1,
        count - 1
      )
    ];

  const startDx =
    next.x -
    start.x;

  const startDy =
    next.y -
    start.y;

  const startLength =
    Math.max(
      0.001,
      Math.hypot(
        startDx,
        startDy
      )
    );

  const startNx =
    startDx /
    startLength;

  const startNy =
    startDy /
    startLength;

  stroke(
    118,
    58,
    50,
    90
  );

  strokeWidth(3.4);

  line(
    start.x + 1.2,
    start.y - 1,
    start.x +
    startNx * 14 +
    1.2,
    start.y +
    startNy * 14 -
    1
  );

  stroke(
    255,
    249,
    225,
    245
  );

  strokeWidth(2.6);

  line(
    start.x,
    start.y,
    start.x +
    startNx * 14,
    start.y +
    startNy * 14
  );

  noStroke();

  fill(
    255,
    251,
    232,
    245
  );

  ellipse(
    start.x,
    start.y,
    4.2,
    4.2
  );

  // ==================================================
  // 5. 終点の結果別表現
  // ==================================================

  const end =
    trail[count - 1];

  const beforeEnd =
    trail[
      Math.max(
        0,
        count - 2
      )
    ];

  const dx =
    end.x -
    beforeEnd.x;

  const dy =
    end.y -
    beforeEnd.y;

  const length =
    Math.max(
      0.001,
      Math.hypot(
        dx,
        dy
      )
    );

  const nx =
    dx /
    length;

  const ny =
    dy /
    length;

  // 進行方向に対する垂直方向
  const px =
    -ny;

  const py =
    nx;

  if (
    result === "FLOOR"
  ) {
    // 擦れて消えたような横長のインク跡
    fill(
      118,
      58,
      50,
      82
    );

    ellipse(
      end.x + 1.5,
      end.y - 1,
      18,
      5
    );

    fill(
      255,
      248,
      222,
      210
    );

    ellipse(
      end.x,
      end.y,
      14,
      3.5
    );

    fill(
      255,
      250,
      228,
      165
    );

    ellipse(
      end.x -
      8,
      end.y +
      1,
      3,
      2
    );

    ellipse(
      end.x +
      9,
      end.y -
      1,
      2.2,
      1.5
    );

  } else if (
    result === "OUT"
  ) {
    // 画面外へ抜けていく二重線
    stroke(
      118,
      58,
      50,
      88
    );

    strokeWidth(2.5);

    line(
      end.x + 1,
      end.y - 1,
      end.x +
      nx * 15 +
      1,
      end.y +
      ny * 15 -
      1
    );

    stroke(
      255,
      248,
      222,
      225
    );

    strokeWidth(2.2);

    line(
      end.x,
      end.y,
      end.x +
      nx * 15,
      end.y +
      ny * 15
    );

    noStroke();

  } else if (
    result === "STAB"
  ) {
    // 刺さった方向を示す鋭い三角印
    fill(
      118,
      58,
      50,
      105
    );

    triangle(
      end.x +
      nx * 7 +
      1,
      end.y +
      ny * 7 -
      1,

      end.x -
      nx * 5 +
      px * 5 +
      1,
      end.y -
      ny * 5 +
      py * 5 -
      1,

      end.x -
      nx * 5 -
      px * 5 +
      1,
      end.y -
      ny * 5 -
      py * 5 -
      1
    );

    fill(
      255,
      249,
      226,
      245
    );

    triangle(
      end.x +
      nx * 6,
      end.y +
      ny * 6,

      end.x -
      nx * 4 +
      px * 4,
      end.y -
      ny * 4 +
      py * 4,

      end.x -
      nx * 4 -
      px * 4,
      end.y -
      ny * 4 -
      py * 4
    );

  } else if (
    result === "DIVE"
  ) {
    // 液面へ入ったような縦長の水滴リング
    noFill();

    stroke(
      118,
      58,
      50,
      100
    );

    strokeWidth(3);

    ellipse(
      end.x + 1.2,
      end.y - 1,
      12,
      15
    );

    stroke(
      255,
      249,
      226,
      245
    );

    strokeWidth(2.1);

    ellipse(
      end.x,
      end.y,
      11,
      14
    );

    noStroke();

    fill(
      255,
      252,
      236,
      245
    );

    ellipse(
      end.x,
      end.y,
      3.4,
      4.8
    );

    // 水滴の余韻
    for (
      let i = 0;
      i < 3;
      i++
    ) {
      const distance =
        8 +
        i * 5;

      const side =
        i % 2 === 0
          ? 1
          : -1;

      fill(
        255,
        249,
        226,
        220 -
        i * 38
      );

      ellipse(
        end.x +
        px *
        distance *
        side,

        end.y +
        py *
        distance *
        side +
        2,

        3.4 -
        i * 0.5,

        4.2 -
        i * 0.5
      );
    }

  } else if (
    isSuccess
  ) {
    // LANDなど通常成功：印刷リング
    noFill();

    stroke(
      118,
      58,
      50,
      105
    );

    strokeWidth(3.2);

    ellipse(
      end.x + 1.3,
      end.y - 1.1,
      12,
      12
    );

    stroke(
      255,
      249,
      226,
      245
    );

    strokeWidth(2.2);

    ellipse(
      end.x,
      end.y,
      11,
      11
    );

    noStroke();

    fill(
      255,
      252,
      236,
      245
    );

    ellipse(
      end.x,
      end.y,
      3.5,
      3.5
    );

    // 着地後の小さな余韻
    for (
      let i = 0;
      i < 3;
      i++
    ) {
      const distance =
        9 +
        i * 5;

      const side =
        i % 2 === 0
          ? 1
          : -1;

      fill(
        255,
        249,
        226,
        220 -
        i * 42
      );

      ellipse(
        end.x +
        px *
        distance *
        side,

        end.y +
        py *
        distance *
        side,

        3.2 -
        i * 0.55,

        2.4 -
        i * 0.35
      );
    }
  }

  noStroke();
}



function jdDrawParticles() {
  ellipseMode(CENTER);
  rectMode(CENTER);

  for (
    const p of
    JD.particles
  ) {
    const life =
      jdClamp(
        p.life || 0,
        0,
        1
      );

    const alpha =
      230 *
      life;

    const c =
      p.col || {
        r: 255,
        g: 245,
        b: 220
      };

    pushMatrix();

    translate(
      p.x,
      p.y
    );

    if (
      Number.isFinite(
        p.rotation
      )
    ) {
      rotate(
        p.rotation
      );
    }

    noStroke();

    // --------------------------------
    // メロンソーダの泡
    // --------------------------------

    if (
      p.kind ===
      "bubble"
    ) {
      noFill();

      stroke(
        c.r,
        c.g,
        c.b,
        alpha * 0.82
      );

      strokeWidth(
        Math.max(
          1,
          p.size * 0.18
        )
      );

      const bubbleSize =
        p.size *
        (
          0.70 +
          0.30 *
          (
            1 -
            life
          )
        );

      ellipse(
        0,
        0,
        bubbleSize,
        bubbleSize
      );

      noStroke();

      fill(
        255,
        255,
        235,
        alpha * 0.48
      );

      ellipse(
        -bubbleSize * 0.18,
        bubbleSize * 0.18,
        Math.max(
          1.2,
          bubbleSize * 0.18
        ),
        Math.max(
          1.2,
          bubbleSize * 0.18
        )
      );

    // --------------------------------
    // コーヒーの湯気
    // --------------------------------

    } else if (
      p.kind ===
      "steam"
    ) {
      // 線ではなく、薄い楕円を重ねたスチーム。
      // カップの口元では密度があり、
      // 上へ行くほど広がって透明になる。
      noStroke();

      const age =
        p.age ||
        0;

      const sway =
        Math.sin(
          age *
          4.2 +
          (
            p.seed ||
            0
          )
        ) *
        (
          1.5 +
          (
            1 -
            life
          ) *
          3.5
        );

      const spread =
        1 -
        life;

      fill(
        c.r,
        c.g,
        c.b,
        alpha *
        0.32
      );

      ellipse(
        sway,
        0,
        p.size *
        (
          0.58 +
          spread *
          0.70
        ),
        p.size *
        (
          0.34 +
          spread *
          0.45
        )
      );

      fill(
        255,
        248,
        229,
        alpha *
        0.16
      );

      ellipse(
        sway - 1.5,
        1,
        p.size *
        (
          0.34 +
          spread *
          0.44
        ),
        p.size *
        (
          0.20 +
          spread *
          0.28
        )
      );

    // --------------------------------
    // ケーキの粉糖
    // --------------------------------

    } else if (
      p.kind ===
      "sugar"
    ) {
      fill(
        c.r,
        c.g,
        c.b,
        alpha * 0.92
      );

      const size =
        Math.max(
          1.5,
          p.size *
          life
        );

      rect(
        0,
        0,
        size,
        size,
        0.8
      );

    // --------------------------------
    // ケーキ片
    // --------------------------------

    } else if (
      p.kind ===
      "crumb"
    ) {
      fill(
        c.r,
        c.g,
        c.b,
        alpha
      );

      rect(
        0,
        0,
        p.size * life,
        p.size * 0.62 * life,
        1
      );

    // --------------------------------
    // 成功時の白いインク粒
    // --------------------------------

    } else if (
      p.kind ===
      "postcardInk"
    ) {
      const size =
        p.size *
        (
          0.55 +
          life * 0.45
        );

      // 外側の紙白
      fill(
        255,
        250,
        232,
        alpha * 0.96
      );

      ellipse(
        0,
        0,
        size * 1.18,
        size * 0.82
      );

      // 一点だけ明るい芯を残す
      fill(
        255,
        255,
        246,
        alpha * 0.70
      );

      ellipse(
        -size * 0.16,
        size * 0.10,
        Math.max(
          1,
          size * 0.34
        ),
        Math.max(
          1,
          size * 0.26
        )
      );

    // --------------------------------
    // 通常の小さな飛沫
    // --------------------------------

    } else {
      fill(
        c.r,
        c.g,
        c.b,
        alpha
      );

      const size =
        p.size *
        life;

      ellipse(
        0,
        0,
        size,
        size
      );
    }

    popMatrix();
  }

  noStroke();
  rectMode(CORNER);
}


function jdSpawnSplash(
  x,
  y,
  c,
  kind = "splash",
  isStab = false
) {
  if (
    !Array.isArray(
      JD.particles
    )
  ) {
    JD.particles = [];
  }

  // --------------------------------
  // メロンソーダ
  // 泡が液面から静かに上がる
  // --------------------------------

  if (
    kind === "melon"
  ) {
    const bubbleColor = {
      r: 226,
      g: 255,
      b: 204
    };

    for (
      let i = 0;
      i < 11;
      i++
    ) {
      JD.particles.push({
        kind: "bubble",

        x:
          x -
          18 +
          Math.random() *
          36,

        y:
          y -
          5 +
          Math.random() *
          14,

        vx:
          -13 +
          Math.random() *
          26,

        vy:
          42 +
          Math.random() *
          62,

        gravity:
          -8,

        drag:
          0.985,

        life:
          0.72 +
          Math.random() *
          0.28,

        decay:
          0.82 +
          Math.random() *
          0.24,

        size:
          4 +
          Math.random() *
          7,

        age: 0,
        seed:
          Math.random() *
          Math.PI *
          2,

        col:
          bubbleColor
      });
    }

    return;
  }

  // --------------------------------
  // コーヒー
  // 短い湯気が数本ほどける
  // --------------------------------

  if (
    kind === "coffee"
  ) {
    const steamColor = {
      r: 247,
      g: 226,
      b: 194
    };

    for (
      let i = 0;
      i < 9;
      i++
    ) {
      JD.particles.push({
        kind: "steam",

        // カップの飲み口付近へ集中させる
        x:
          x -
          9 +
          Math.random() *
          18,

        y:
          y +
          1 +
          Math.random() *
          4,

        vx:
          -4 +
          Math.random() *
          8,

        vy:
          22 +
          Math.random() *
          27,

        gravity:
          0,

        drag:
          0.986,

        life:
          0.72 +
          Math.random() *
          0.23,

        decay:
          0.64 +
          Math.random() *
          0.18,

        size:
          10 +
          Math.random() *
          8,

        age: 0,

        seed:
          Math.random() *
          Math.PI *
          2,

        col:
          steamColor
      });
    }

    return;
  }

  // --------------------------------
  // ケーキ
  // 粉糖と小さなパンくず
  // --------------------------------

  if (
    kind === "cake"
  ) {
    const sugarColor = {
      r: 255,
      g: 248,
      b: 229
    };

    const crumbColor = {
      r: 197,
      g: 130,
      b: 88
    };

    const sugarCount =
      isStab
        ? 9
        : 13;

    for (
      let i = 0;
      i < sugarCount;
      i++
    ) {
      JD.particles.push({
        kind: "sugar",

        x:
          x -
          10 +
          Math.random() *
          20,

        y:
          y +
          Math.random() *
          8,

        vx:
          -42 +
          Math.random() *
          84,

        vy:
          28 +
          Math.random() *
          78,

        gravity:
          155,

        drag:
          0.976,

        life:
          0.72 +
          Math.random() *
          0.24,

        decay:
          1.05 +
          Math.random() *
          0.30,

        size:
          2 +
          Math.random() *
          2.8,

        rotation:
          Math.random() *
          Math.PI,

        spin:
          -5 +
          Math.random() *
          10,

        age: 0,

        col:
          sugarColor
      });
    }

    const crumbCount =
      isStab
        ? 7
        : 3;

    for (
      let i = 0;
      i < crumbCount;
      i++
    ) {
      JD.particles.push({
        kind: "crumb",

        x:
          x -
          7 +
          Math.random() *
          14,

        y:
          y +
          Math.random() *
          6,

        vx:
          -58 +
          Math.random() *
          116,

        vy:
          38 +
          Math.random() *
          82,

        gravity:
          250,

        drag:
          0.972,

        life:
          0.78 +
          Math.random() *
          0.18,

        decay:
          1.18 +
          Math.random() *
          0.26,

        size:
          3 +
          Math.random() *
          3.5,

        rotation:
          Math.random() *
          Math.PI,

        spin:
          -7 +
          Math.random() *
          14,

        age: 0,

        col:
          crumbColor
      });
    }

    return;
  }

  // --------------------------------
  // その他
  // 以前より粒数を抑えた飛沫
  // --------------------------------

  for (
    let i = 0;
    i < 12;
    i++
  ) {
    JD.particles.push({
      kind: "splash",
      x,
      y,

      vx:
        -70 +
        Math.random() *
        140,

      vy:
        30 +
        Math.random() *
        105,

      gravity:
        420,

      drag:
        0.98,

      life:
        0.74 +
        Math.random() *
        0.20,

      decay:
        1.45 +
        Math.random() *
        0.25,

      size:
        2.5 +
        Math.random() *
        4,

      age: 0,

      col:
        c || {
          r: 255,
          g: 235,
          b: 220
        }
    });
  }
}

function jdSpawnPostcardSuccessInk(
  x,
  y,
  targetKind
) {
  if (
    !Array.isArray(
      JD.particles
    )
  ) {
    JD.particles = [];
  }

  const whiteInk = {
    r: 255,
    g: 250,
    b: 232
  };

  const count =
    targetKind === "melon"
      ? 6
      : 5;

  for (
    let i = 0;
    i < count;
    i++
  ) {
    const angle =
      Math.PI * 0.18 +
      (
        i /
        Math.max(
          1,
          count - 1
        )
      ) *
      Math.PI *
      0.64;

    const speed =
      34 +
      Math.random() *
      30;

    JD.particles.push({
      kind: "postcardInk",

      x:
        x -
        4 +
        Math.random() *
        8,

      y:
        y +
        Math.random() *
        4,

      vx:
        Math.cos(angle) *
        speed,

      vy:
        Math.sin(angle) *
        speed,

      // 少し浮いたあと、静かに落ちる
      gravity:
        105,

      drag:
        0.972,

      life:
        0.48 +
        Math.random() *
        0.16,

      decay:
        1.55 +
        Math.random() *
        0.22,

      size:
        2.4 +
        Math.random() *
        2.3,

      age: 0,

      col:
        whiteInk
    });
  }
}



function jdUpdateParticles(dt) {
  if (
    !Array.isArray(
      JD.particles
    )
  ) {
    JD.particles = [];
    return;
  }

  for (
    let i =
      JD.particles.length - 1;
    i >= 0;
    i--
  ) {
    const p =
      JD.particles[i];

    p.age =
      (
        p.age ||
        0
      ) +
      dt;

    const decay =
      Number.isFinite(
        p.decay
      )
        ? p.decay
        : 1.75;

    p.life -=
      dt *
      decay;

    const gravity =
      Number.isFinite(
        p.gravity
      )
        ? p.gravity
        : 520;

    p.vy -=
      gravity *
      dt;

    const drag =
      Number.isFinite(
        p.drag
      )
        ? p.drag
        : 0.98;

    const dragFactor =
      Math.pow(
        drag,
        dt * 60
      );

    p.vx *=
      dragFactor;

    p.vy *=
      dragFactor;

    // 泡と湯気にはわずかな横揺れを入れる
    if (
      p.kind === "bubble" ||
      p.kind === "steam"
    ) {
      p.vx +=
        Math.sin(
          p.age *
          (
            p.kind ===
            "bubble"
              ? 7
              : 5
          ) +
          (
            p.seed || 0
          )
        ) *
        dt *
        (
          p.kind ===
          "bubble"
            ? 18
            : 10
        );
    }

    p.x +=
      p.vx *
      dt;

    p.y +=
      p.vy *
      dt;

    if (
      Number.isFinite(
        p.spin
      )
    ) {
      p.rotation =
        (
          p.rotation ||
          0
        ) +
        p.spin *
        dt;
    }

    if (
      p.life <= 0
    ) {
      JD.particles.splice(
        i,
        1
      );
    }
  }
}


function jdDrawFloatTexts() {}

function jdDrawLauncherItemTicket() {
  const f =
    JD.food;

  if (
    !f ||
    f.launched ||
    f.resolved ||
    JD.dragging ||
    JD.fortuneSpinning ||
    JD.fortunePickedTimer > 0
  ) {
    JD.itemTicketTimer = 0;
    JD.itemTicketSoundPlayed = false;
    return;
  }

  if (
    !Number.isFinite(
      JD.itemTicketTimer
    )
  ) {
    JD.itemTicketTimer = 0;
  }

  const ticketEnterDuration =
    JD.motion &&
    Number.isFinite(
      JD.motion.itemTicketEnter
    )
      ? JD.motion.itemTicketEnter
      : 0.46;

  // Fortuneの退場後、同じテンポで静かに現れる
  JD.itemTicketTimer =
    Math.min(
      ticketEnterDuration,
      JD.itemTicketTimer +
      DeltaTime
    );

  const appearT =
    jdClamp(
      JD.itemTicketTimer /
      ticketEnterDuration,
      0,
      1
    );

  if (
    !JD.itemTicketSoundPlayed &&
    appearT >= 0.08
  ) {
    JD.itemTicketSoundPlayed = true;
    jdPlaySound("ticket");
  }

  const appearEase =
    1 -
    Math.pow(
      1 -
      appearT,
      3
    );

  const alpha =
    255 *
    appearEase;

  // Closeカメラ時の画面中央付近
  const x =
    JD.launcher.x -
    105;

  const baseY =
    JD.launcher.y +
    50;

  // 少し上から降りてくる
  const y =
    baseY +
    (
      1 -
      appearEase
    ) * 12;

  const name =
    f.name ||
    "-";

  const ticketW =
    jdClamp(
      62 +
      name.length *
      7.8,
      108,
      150
    );

  const ticketH =
    40;

  const targetX =
    JD.launcher.x -
    18;

  const targetY =
    JD.launcher.y +
    4;

  const lineStartX =
    x +
    ticketW / 2 -
    12;

  const lineStartY =
    y -
    ticketH / 2 +
    6;

  rectMode(CENTER);
  ellipseMode(CENTER);
  textAlign(CENTER);

  // --------------------------------
  // 素材へつながる説明線
  // --------------------------------

  noFill();

  jdStroke(
    "paper",
    215 *
    appearEase
  );

  strokeWidth(2);

  line(
    lineStartX,
    lineStartY,
    targetX,
    targetY
  );

  noStroke();

  // 先端の丸
  jdFill(
    "paper",
    225 *
    appearEase
  );

  ellipse(
    targetX,
    targetY,
    9,
    9
  );

  jdFill(
    "redDeep",
    165 *
    appearEase
  );

  ellipse(
    targetX,
    targetY,
    3,
    3
  );

  // --------------------------------
  // 素材札
  // 素材本体と同じタイミングで、
  // わずかに拡大しながら現れる。
  // --------------------------------

  const ticketPop =
    jdCardPopScale(appearT);

  pushMatrix();

  translate(
    x,
    y
  );

  scale(
    ticketPop
  );

  translate(
    -x,
    -y
  );

  jdFill(
    "shadow",
    34 *
    appearEase
  );

  rect(
    x + 4,
    y - 4,
    ticketW,
    ticketH,
    6
  );

  // 注文票と同じ、完全不透明の生成り紙
  jdFill(
    "paper",
    255 *
    appearEase
  );

  rect(
    x,
    y,
    ticketW,
    ticketH,
    7
  );

  // 上端の赤線
  jdFill(
    "redDeep",
    255 *
    appearEase
  );

  rect(
    x,
    y +
    ticketH / 2 -
    5,
    ticketW -
    22,
    3,
    1.5
  );

  // 素材名だけを大きく表示
  jdFill(
    "ink",
    255 *
    appearEase
  );

  jdReceiptFont("bold");

  let nameSize = 13;

  if (
    name.length >= 10
  ) {
    nameSize = 10.5;

  } else if (
    name.length >= 8
  ) {
    nameSize = 11.5;
  }

  fontSize(
    nameSize
  );

  text(
    name,
    x,
    y - 2
  );

  popMatrix();

  noStroke();
}

function jdStartAimTutorial() {
  if (
    JD.tutorialSeen ||
    !JD.food ||
    JD.food.launched ||
    JD.food.resolved
  ) {
    return;
  }

  JD.tutorialActive = true;
  JD.tutorialTimer = 0;
  JD.tutorialDuration = 2.85;
}

function jdStopAimTutorial(markSeen = true) {
  JD.tutorialActive = false;
  JD.tutorialTimer = 0;

  if (
    markSeen
  ) {
    JD.tutorialSeen = true;
  }
}

function jdUpdateAimTutorial(dt) {
  if (
    !JD.tutorialActive
  ) {
    return;
  }

  if (
    !JD.food ||
    JD.food.launched ||
    JD.food.resolved ||
    JD.dragging ||
    JD.gamePhase !== PHASE_AIM
  ) {
    jdStopAimTutorial(true);
    return;
  }

  JD.tutorialTimer +=
    dt;

  const duration =
    Number.isFinite(
      JD.tutorialDuration
    )
      ? JD.tutorialDuration
      : 2.85;

  if (
    JD.tutorialTimer >=
    duration
  ) {
    jdStopAimTutorial(true);
  }
}

function jdAimTutorialPose() {
  const timer =
    JD.tutorialTimer || 0;

  const anchorX =
    JD.launcher.x;

  const anchorY =
    JD.launcher.y;

  let x =
    anchorX;

  let y =
    anchorY;

  let pullProgress = 0;
  let returnProgress = 0;
  let stage = "tap";

  // --------------------------------
  // 0.00〜0.62秒
  // タップ
  // --------------------------------

  if (
    timer < 0.62
  ) {
    stage = "tap";

  // --------------------------------
  // 0.62〜1.55秒
  // 左下へ引っ張る
  // --------------------------------

  } else if (
    timer < 1.55
  ) {
    stage = "pull";

    const t =
      jdClamp(
        (
          timer -
          0.62
        ) /
        0.93,
        0,
        1
      );

    pullProgress =
      t *
      t *
      (
        3 -
        2 * t
      );

  // --------------------------------
  // 1.55〜1.92秒
  // 引いた状態で「はなす」
  // --------------------------------

  } else if (
    timer < 1.92
  ) {
    stage = "release";
    pullProgress = 1;

  // --------------------------------
  // 1.92〜2.65秒
  // 元の位置へ戻る
  // --------------------------------

  } else {
    stage = "return";

    const t =
      jdClamp(
        (
          timer -
          1.92
        ) /
        0.73,
        0,
        1
      );

    returnProgress =
      1 -
      Math.pow(
        1 - t,
        3
      );

    pullProgress =
      1 -
      returnProgress;
  }

  // 実際の操作に合わせて、
  // 小さな右下方向へ引っ張る
  x =
    anchorX +
    32 *
    pullProgress;

  y =
    anchorY -
    25 *
    pullProgress;

  return {
    x,
    y,
    stage,
    pullProgress,
    returnProgress
  };
}

function jdDrawAimTutorialWorld(
  foodX,
  foodY
) {
  if (
    !JD.tutorialActive ||
    !JD.food ||
    JD.dragging
  ) {
    return;
  }

  const pose =
    jdAimTutorialPose();

  const timer =
    JD.tutorialTimer || 0;
  const tutorialCardEnterDuration =
    JD.motion && Number.isFinite(JD.motion.card)
      ? JD.motion.card
      : 0.24;
  const tutorialCardScaleAt = (startTime) =>
    jdCardPopScale(
      jdClamp(
        (timer - startTime) / tutorialCardEnterDuration,
        0,
        1
      )
    );

  const anchorX =
    JD.launcher.x + 20;

  const upperAnchorY =
    JD.launcher.y + 18;

  const lowerAnchorY =
    JD.launcher.y - 18;

  // 待機ゴムと引っ張りゴムの接続点を同じ補間値でつなぐ。
  // pullProgress=0では通常待機ゴムと完全に一致し、
  // pullProgress=1では従来のチュートリアル終端へ一致する。
  const rubberPull = jdClamp(
    pose.pullProgress || 0,
    0,
    1
  );
  const rubberEndX =
    foodX + 5 - rubberPull * 2;
  const rubberUpperEndY =
    foodY + 6 - rubberPull;
  const rubberLowerEndY =
    foodY - 6 + rubberPull;

  rectMode(CENTER);
  ellipseMode(CENTER);
  textAlign(CENTER);

  // ==================================================
  // タップ波紋
  // ==================================================

  if (
    pose.stage === "tap"
  ) {
    const tapT =
      jdClamp(
        timer / 0.62,
        0,
        1
      );

    const ringT =
      (
        tapT * 1.45
      ) % 1;

    noFill();

    jdStroke(
      "creamWarm",
      175 *
      (
        1 -
        ringT
      )
    );

    strokeWidth(2);

    ellipse(
      foodX,
      foodY,
      24 +
      ringT * 30,
      24 +
      ringT * 30
    );

    noStroke();

    const tapCardY = foodY + 45;
    pushMatrix();
    translate(foodX, tapCardY);
    scale(tutorialCardScaleAt(0));
    translate(-foodX, -tapCardY);

    jdFill(
      "paper",
      225 *
      Math.sin(
        tapT *
        Math.PI
      )
    );

    rect(
      foodX,
      tapCardY,
      68,
      25,
      13
    );

    jdFill(
      "ink",
      235 *
      Math.sin(
        tapT *
        Math.PI
      )
    );

    jdFontForLanguage("bold");

    fontSize(11);

    text(
      jdT("tutorial.tap", "TAP"),
      foodX,
      tapCardY
    );

    popMatrix();
  }

  // ==================================================
  // ゴム
  // チュートリアル開始から通常操作へ戻る瞬間まで常時表示する。
  // 表示条件で切り替えず、接続点だけを滑らかに補間する。
  // ==================================================

  jdStroke(
    "redDeep",
    215
  );

  strokeWidth(5);

  line(
    anchorX,
    upperAnchorY,
    rubberEndX,
    rubberUpperEndY
  );

  line(
    anchorX,
    lowerAnchorY,
    rubberEndX,
    rubberLowerEndY
  );

  jdStroke(
    "red",
    125
  );

  strokeWidth(1.4);

  line(
    anchorX,
    upperAnchorY + 1,
    rubberEndX,
    rubberUpperEndY + 1
  );

  line(
    anchorX,
    lowerAnchorY + 1,
    rubberEndX,
    rubberLowerEndY + 1
  );

  noStroke();

  // ==================================================
  // ひっぱる
  // ==================================================

  if (
    pose.stage === "pull"
  ) {
    const alpha =
      Math.sin(
        jdClamp(
          (
            timer -
            0.62
          ) /
          0.93,
          0,
          1
        ) *
        Math.PI
      );

    const pullCardX = foodX - 3;
    const pullCardY = foodY + 47;
    pushMatrix();
    translate(pullCardX, pullCardY);
    scale(tutorialCardScaleAt(0.62));
    translate(-pullCardX, -pullCardY);

    jdFill(
      "paper",
      225 * alpha
    );

    rect(
      pullCardX,
      pullCardY,
      82,
      25,
      13
    );

    jdFill(
      "ink",
      235 * alpha
    );

    jdFontForLanguage("bold");

    fontSize(11);

    text(
      jdT("tutorial.pull", "PULL"),
      pullCardX,
      pullCardY
    );

    popMatrix();

    // 動かす方向を示す短い点線
    for (
      let i = 0;
      i < 3;
      i++
    ) {
      const p =
        (
          i + 1
        ) / 4;

      jdFill(
        "creamWarm",
        135 *
        (
          1 -
          p * 0.45
        )
      );

      ellipse(
        JD.launcher.x +
        32 *
        p,
        JD.launcher.y -
        25 *
        p,
        4 -
        p
      );
    }
  }

  // ==================================================
  // はなす
  // ==================================================

  if (
    pose.stage === "release"
  ) {
    const releaseT =
      jdClamp(
        (
          timer -
          1.55
        ) /
        0.37,
        0,
        1
      );

    const pulse =
      Math.sin(
        releaseT *
        Math.PI
      );

    noFill();

    jdStroke(
      "creamWarm",
      190 *
      pulse
    );

    strokeWidth(2.5);

    ellipse(
      foodX,
      foodY,
      30 +
      releaseT * 18,
      30 +
      releaseT * 18
    );

    noStroke();

    const releaseCardY = foodY + 48;
    pushMatrix();
    translate(foodX, releaseCardY);
    scale(tutorialCardScaleAt(1.55));
    translate(-foodX, -releaseCardY);

    jdFill(
      "paper",
      235 *
      pulse
    );

    rect(
      foodX,
      releaseCardY,
      72,
      26,
      13
    );

    jdFill(
      "redDeep",
      240 *
      pulse
    );

    jdFontForLanguage("bold");

    fontSize(11);

    text(
      jdT("tutorial.release", "RELEASE"),
      foodX,
      releaseCardY
    );

    popMatrix();
  }

  noStroke();
  rectMode(CORNER);
}







function jdUpdateFloatTexts(_dt) { JD.floatTexts.length = 0; }

function jdDrawPlayUI() {
  rectMode(CENTER);
  ellipseMode(CENTER);
  noStroke();
  textAlign(CENTER);

  const currentThrowActive =
    JD.throwIndex > 0 &&
    JD.throwIndex <= JD.queue.length &&
    (
      JD.gamePhase === PHASE_FORTUNE ||
      JD.pendingFood ||
      (
        JD.food &&
        !JD.food.resolved
      )
    );

  let rest =
    JD.throwIndex <= 0
      ? JD.queue.length
      : JD.queue.length -
        JD.throwIndex +
        (
          currentThrowActive
            ? 1
            : 0
        );

  if (rest < 0) {
    rest = 0;
  }

  // 着地時に明度が変わると、結果よりUIへ視線が移るため、
  // 常に通常時と同じ濃度で表示する。
  const resultMode =
    false;

  const cx =
    JD.LOGICAL_W / 2;

  const cy =
    JD.LOGICAL_H - 31;

  const w =
    JD.LOGICAL_W - 32;

  const h = 40;

  const panelAlpha =
    255;

  const textAlpha =
    245;

  if (
    jdIsPosterStyle()
  ) {
    // ポスター版は落ち影を使わず、
    // 一回り大きな色面で紙を切り抜く。
    jdFill(
      "wallLine",
      44
    );

    rect(
      cx,
      cy,
      w + 2,
      h + 2,
      8
    );

  } else {
    // オリジナル版は従来の落ち影
    jdFill(
      "shadow",
      resultMode
        ? 24
        : 42
    );

    rect(
      cx + 3,
      cy - 4,
      w,
      h,
      7
    );
  }

  // 勤務伝票
  jdFill(
    "paper",
    panelAlpha
  );

  rect(
    cx,
    cy,
    w,
    h,
    7
  );

  // パンチ穴
  jdFill(
    "woodDark",
    resultMode
      ? 42
      : 88
  );

  ellipse(
    42,
    cy,
    5,
    5
  );

  // 情報の区切り
  jdFill(
    "ink",
    resultMode
      ? 28
      : 50
  );

  rect(
    129,
    cy,
    1,
    20
  );

  rect(
    246,
    cy,
    1,
    20
  );

  // --------------------------------
  // WORK TICKET
  // --------------------------------

  jdFill(
    "ink",
    textAlpha
  );

  jdFontForLanguage();
  fontSize(jdIsEnglish() ? 8 : 8.5);

  text(
    jdT("ui.workTicket", "WORK TICKET"),
    82,
    cy + 5
  );

  jdFontForLanguage("bold");
  fontSize(jdIsEnglish() ? 9 : 9.5);

  text(
    jdT(
      "ui.shift",
      "MONDAY SHIFT"
    ),
    82,
    cy - 8
  );

  // --------------------------------
  // SALES
  // --------------------------------

  jdFontForLanguage();
  fontSize(jdIsEnglish() ? 8 : 8.5);

  text(
    jdT(
      "ui.sales",
      "SALES"
    ),
    187,
    cy + 5
  );

  jdFontForLanguage("bold");
  fontSize(12);

  text(
    `${JD.totalSales} ${jdT(
      "ui.yen",
      "YEN"
    )}`,
    187,
    cy - 8
  );

  // --------------------------------
  // REST
  // --------------------------------

  jdFontForLanguage();
  fontSize(jdIsEnglish() ? 8 : 8.5);

  text(
    jdT(
      "ui.rest",
      "REST"
    ),
    292,
    cy + 5
  );

  jdFontForLanguage("bold");
  fontSize(13);

  text(
    jdIsEnglish() ? String(rest) : `${rest}件`,
    292,
    cy - 8
  );

  // --------------------------------
  // 注文票と共通の上端赤線
  // --------------------------------

  jdFill(
    "redDeep",
    255
  );

  const topLineY =
    cy +
    h / 2 -
    5;

  rect(
    cx,
    topLineY,
    w - 18,
    2.5,
    1.5
  );

  jdDrawDebugButton();
}




function jdDrawShotMeter() {
  // 下部のPOWER / ANGLEゲージは廃止。
  // 引っ張り量と角度は、ゴム・軌道予測・
  // カメラのズームアウトから体感できる構成にする。
  return;
}



function jdDrawFortuneMachine() {
  if (
    !JD.fortuneSpinning &&
    !(JD.fortunePickedTimer > 0)
  ) {
    return;
  }

  rectMode(CENTER);
  ellipseMode(CENTER);
  textAlign(CENTER);
  noStroke();

  const cx =
    JD.LOGICAL_W / 2;

  const baseCy =
    328;

  const active =
    JD.fortuneSpinning;

  const duration =
    JD.fortuneDuration ||
    0.9;

  const timer =
    JD.fortuneTimer ||
    0;

  // 紙UIと同じ約0.46秒で、上から落ち着いて登場
  const enterDuration =
    JD.motion &&
    Number.isFinite(
      JD.motion.fortuneEnter
    )
      ? JD.motion.fortuneEnter
      : 0.46;

  const enterT =
    active
      ? jdClamp(
          (
            duration -
            timer
          ) /
          enterDuration,
          0,
          1
        )
      : 1;

  const enterEase =
    1 -
    Math.pow(
      1 -
      enterT,
      3
    );

  // 確定表示の最後に下方向へ退場
  const exitDuration =
    JD.motion &&
    Number.isFinite(
      JD.motion.fortuneExit
    )
      ? JD.motion.fortuneExit
      : 0.46;

  const exitT =
    !active &&
    JD.fortunePickedTimer > 0
      ? jdClamp(
          (
            exitDuration -
            JD.fortunePickedTimer
          ) /
          exitDuration,
          0,
          1
        )
      : 0;

  const exitEase =
    exitT *
    exitT *
    (
      3 -
      2 * exitT
    );

  const visibility =
    jdClamp(
      Math.min(
        enterEase,
        1 -
        exitEase
      ),
      0,
      1
    );

  // y軸は上方向が正。
  // 上から登場：開始時はbaseCyより上
  // 下へ退場：終了時はbaseCyより下
  const cy =
    baseCy +
    (
      1 -
      enterEase
    ) * 18 -
    exitEase * 22;

  pushMatrix();

  translate(
    cx,
    cy
  );

  scale(
    0.965 +
    visibility *
    0.035
  );

  translate(
    -cx,
    -cy
  );

  const p =
    1 -
    jdClamp(
      timer /
      duration,
      0,
      1
    );

  const pickedP =
    JD.fortunePickedTimer > 0
      ? jdClamp(
          JD.fortunePickedTimer /
          (
            JD.motion &&
            Number.isFinite(
              JD.motion.fortuneHold
            )
              ? JD.motion.fortuneHold
              : 1.10
          ),
          0,
          1
        )
      : 0;

  const bodyPop =
    active
      ? Math.sin(
          Math.min(
            1,
            p *
            1.8
          ) *
          Math.PI
        ) *
        1.3
      : pickedP;

  const wheelRot =
    active
      ? (
          JD.fortuneDuration -
          timer
        ) *
        900
      : 0;

  const blink =
    active
      ? 0.84 +
        0.16 *
        Math.sin(
          ElapsedTime *
          12
        )
      : 1;

  const bodyW =
    156;

  const bodyH =
    226 +
    bodyPop;

  // --------------------------------
  // 木製本体
  // --------------------------------

  jdFill(
    "shadow",
    (
      active
        ? 78
        : 62
    ) *
    visibility
  );

  rect(
    cx + 4,
    cy - 8,
    bodyW + 8,
    bodyH + 8,
    24
  );

  jdFill(
    "woodDark",
    210 *
    visibility
  );

  rect(
    cx + 3,
    cy - 3,
    bodyW,
    bodyH,
    22
  );

  jdFill(
    "wood",
    252 *
    visibility
  );

  rect(
    cx,
    cy,
    bodyW - 8,
    bodyH - 8,
    20
  );

  jdFill(
    "wallShade",
    34 *
    visibility
  );

  rect(
    cx - 36,
    cy,
    7,
    bodyH - 44,
    4
  );

  jdFill(
    "highlight",
    28 *
    visibility
  );

  rect(
    cx + 36,
    cy,
    5,
    bodyH - 48,
    4
  );

  // --------------------------------
  // KISSA FORTUNE札
  // --------------------------------

  const signY =
    cy + 72;

  jdFill(
    "redDeep",
    242 *
    visibility
  );

  rect(
    cx,
    signY,
    118,
    26,
    10
  );

  jdFill(
    "gold",
    (
      220 +
      20 *
      blink
    ) *
    visibility
  );

  ellipse(
    cx - 46,
    signY,
    6,
    6
  );

  ellipse(
    cx + 46,
    signY,
    6,
    6
  );

  jdFill(
    "paper",
    250 *
    visibility
  );

  jdTitleFont("bold");

  fontSize(10);

  text(
    jdT(
      "fortune.title",
      "KISSA FORTUNE"
    ),
    cx,
    signY + 1
  );

  // --------------------------------
  // ルーレット
  // --------------------------------

  const wheelCy =
    cy - 4;

  jdFill(
    "uiPanel",
    255 *
    visibility
  );

  ellipse(
    cx,
    wheelCy,
    96,
    96
  );

  jdFill(
    "gold",
    248 *
    visibility
  );

  ellipse(
    cx,
    wheelCy,
    82,
    82
  );

  jdFill(
    "cream",
    248 *
    visibility
  );

  ellipse(
    cx,
    wheelCy,
    68,
    68
  );

  jdFill(
    "paper",
    36 *
    visibility
  );

  ellipse(
    cx - 7,
    wheelCy + 9,
    17,
    44
  );

  pushMatrix();

  translate(
    cx,
    wheelCy
  );

  rotate(
    wheelRot
  );

  jdStroke(
    "woodDark",
    112 *
    visibility
  );

  strokeWidth(1.8);

  for (
    let i = 0;
    i < 6;
    i++
  ) {
    const a =
      (
        i *
        60 -
        90
      ) *
      Math.PI /
      180;

    line(
      0,
      0,
      Math.cos(a) *
      34,
      Math.sin(a) *
      34
    );
  }

  noStroke();

  jdFill(
    "ink",
    218 *
    visibility
  );

  jdReceiptFont("bold");

  fontSize(5.8);

  const labels = [
    "CHERRY",
    "SUGAR",
    "BERRY",
    "CHERRY",
    "SUGAR",
    "LUCK"
  ];

  for (
    let i = 0;
    i < labels.length;
    i++
  ) {
    const a =
      (
        i *
        60 -
        60
      ) *
      Math.PI /
      180;

    text(
      labels[i],
      Math.cos(a) *
      22,
      Math.sin(a) *
      22 -
      1
    );
  }

  popMatrix();

  // 固定ポインタ
  jdStroke(
    "red",
    250 *
    visibility
  );

  strokeWidth(4);

  line(
    cx,
    wheelCy + 44,
    cx,
    wheelCy + 34
  );

  noStroke();

  jdFill(
    "red",
    250 *
    visibility
  );

  ellipse(
    cx,
    wheelCy + 43,
    7,
    7
  );

  jdFill(
    "woodDark",
    255 *
    visibility
  );

  ellipse(
    cx,
    wheelCy,
    9,
    9
  );

  // 回転中は結果札を出さない
  if (
    active
  ) {
    popMatrix();
    return;
  }

  // --------------------------------
  // 確定素材名
  // --------------------------------

  const showNameCode =
    JD.fortuneDisplayName ||
    (
      JD.food
        ? JD.food.name
        : "CHERRY"
    );

  const showName =
    String(
      showNameCode ||
      "CHERRY"
    )
      .trim()
      .toUpperCase();

  const nameLength =
    showName.length;

  const paperW =
    jdClamp(
      42 +
      nameLength *
      6.4,
      94,
      bodyW - 18
    );

  const paperH =
    32;

  const paperY =
    cy - 72;

  let nameSize =
    12.5;

  if (
    nameLength >= 10
  ) {
    nameSize = 10.5;

  } else if (
    nameLength >= 8
  ) {
    nameSize = 11.5;
  }

  const resultHoldDuration =
    JD.motion && Number.isFinite(JD.motion.fortuneHold)
      ? JD.motion.fortuneHold
      : 1.10;
  const resultCardEnterDuration =
    JD.motion && Number.isFinite(JD.motion.card)
      ? JD.motion.card
      : 0.24;
  const resultCardElapsed =
    resultHoldDuration - (JD.fortunePickedTimer || 0);
  const resultCardScale = jdCardPopScale(
    jdClamp(
      resultCardElapsed / resultCardEnterDuration,
      0,
      1
    )
  );

  pushMatrix();
  translate(cx, paperY);
  scale(resultCardScale);
  translate(-cx, -paperY);

  // 注文票と同じ、完全不透明の生成り紙
  jdFill(
    "paper",
    255 *
    visibility
  );

  rect(
    cx,
    paperY,
    paperW,
    paperH,
    7
  );

  // 上端の赤線
  jdFill(
    "redDeep",
    255 *
    visibility
  );

  rect(
    cx,
    paperY +
    paperH / 2 -
    5,
    paperW - 16,
    3,
    1.5
  );

  // 確定した素材名
  jdFill(
    "redDeep",
    255 *
    visibility
  );

  jdReceiptFont("bold");

  fontSize(
    nameSize
  );

  text(
    showName,
    cx,
    paperY - 3
  );

  popMatrix();
  popMatrix();
}








// =====================================================
// 店内フォーカス
// 店内のまま、代表商品へ光と軽いズームだけを加える。
// 背景色・枠・文字などのポスター要素はまだ描かない。
// =====================================================

function jdDrawPosterFocusIntro() {
  jdDrawPlay();

  const duration =
    Number.isFinite(JD.posterTransitionDuration)
      ? Math.max(0.001, JD.posterTransitionDuration)
      : 0.78;

  const raw = jdClamp(
    (JD.posterTransitionTimer || 0) / duration,
    0,
    1
  );

  // 穏やかなイーズ。最後に跳ねさせず、視線だけを集める。
  const t = raw * raw * (3 - 2 * raw);

  const item = jdGetPosterItem();
  const heroSpec = jdGetPosterHeroSpec(item);
  const focusKind =
    JD.posterFocusKind ||
    item.targetType ||
    "melon";
  const focusTarget = jdFindPosterFocusTarget(item, focusKind);

  rectMode(CORNER);
  ellipseMode(CENTER);
  noStroke();

  // 黒ではなく店内の茶色を薄く重ね、空気だけを静める。
  // 端末側の補間で1pxの地肌が残らないよう、少し外へはみ出して塗る。
  const focusBleed = JD_SCREEN_BLEED;
  fill(47, 34, 29, 54 * t);
  rect(
    -focusBleed,
    -focusBleed,
    JD.LOGICAL_W + focusBleed * 2,
    JD.LOGICAL_H + focusBleed * 2
  );

  const lightPoint = focusTarget
    ? jdWorldToScreen(
        focusTarget.x,
        JD.tableY + heroSpec.focusWorldYOffset
      )
    : (
        jdIsFailurePosterItem(item)
          ? jdWorldToScreen(
              Number.isFinite(heroSpec.focusWorldX)
                ? heroSpec.focusWorldX
                : 405,
              JD.tableY + heroSpec.focusWorldYOffset
            )
          : null
      );

  if (!lightPoint) return;

  // 輪郭のある円に見えないよう、二枚の低濃度楕円で光を作る。
  fill(252, 231, 184, 12 * t);
  ellipse(
    lightPoint.x,
    lightPoint.y + 4,
    heroSpec.focusLightW + 12 * t,
    heroSpec.focusLightH + 16 * t
  );

  fill(255, 239, 199, 17 * t);
  ellipse(
    lightPoint.x,
    lightPoint.y + 2,
    heroSpec.focusLightW * 0.66 + 8 * t,
    heroSpec.focusLightH * 0.70 + 10 * t
  );

  // 全投失敗時は、商品を描き足さず、空いたテーブル面の光だけを残す。
  if (!focusTarget) {
    rectMode(CORNER);
    noStroke();
    return;
  }

  // 元の店内商品を下地に残したまま、同じ商品をわずかに拡大して
  // 描き直す。最大でも約1.055倍に抑える。
  const zoom = 1 + 0.055 * t;

  pushMatrix();
  jdApplyCamera();
  translate(focusTarget.x, focusTarget.y);
  scale(zoom, zoom);
  translate(-focusTarget.x, -focusTarget.y);

  jdDrawTarget(focusTarget);

  for (const food of JD.placedFoods) {
    if (food.targetKind !== focusTarget.kind) continue;

    jdDrawFood(
      food,
      food.x,
      food.y,
      food.alpha || 230,
      1
    );
  }

  popMatrix();

  rectMode(CORNER);
  noStroke();
}

// =====================================================
// ポスター組み立て
//
// 単純な横ワイプではなく、ポスターを構成する各要素が
// 画面外や左下から集まり、一枚の版面へ落ち着く演出。
//
// ・朱色背景：左下を起点に拡大
// ・生成り情報面：右からスライド
// ・下部の朱色帯：左からスライド
// ・外枠：完成サイズより大きい状態から縮小
// ・商品：店内位置からポスター位置へ移動・拡大
// ・文字：最後に短くフェードイン
// =====================================================

function jdDrawPosterDoubleFrame(
  W,
  H,
  alpha,
  outerWeight = JD_POSTER_FRAME_OUTER_WEIGHT,
  innerWeight = JD_POSTER_FRAME_INNER_WEIGHT
) {
  const frameAlpha = jdClamp(alpha, 0, 255);

  noFill();

  // 外側は輪郭として効く太線。
  stroke(248, 232, 197, frameAlpha);
  strokeWidth(outerWeight);
  rect(12, 66, W - 24, H - 78, 1);

  // 4px内側へ、少し淡い細線を重ねる。
  // 下部情報面では同系色に溶け、商品面では二重罫として見える。
  stroke(248, 232, 197, frameAlpha * 0.72);
  strokeWidth(innerWeight);
  rect(16, 70, W - 32, H - 86, 1);

  noStroke();
}

function jdDrawPosterReceiptCut(
  y,
  alpha = 255
) {
  const left =
    -JD_SCREEN_BLEED;

  const width =
    JD.LOGICAL_W +
    JD_SCREEN_BLEED * 2;

  const right =
    left + width;

  const toothW = 10;
  const diamondSize = 7.2;
  const safeAlpha =
    jdClamp(alpha, 0, 255);

  noStroke();

  fill(
    JD_POSTER_INFO_PAPER[0],
    JD_POSTER_INFO_PAPER[1],
    JD_POSTER_INFO_PAPER[2],
    safeAlpha
  );

  rectMode(CENTER);

  for (
    let px = left + toothW / 2;
    px < right;
    px += toothW
  ) {
    pushMatrix();

    translate(
      px,
      y - 0.2
    );

    rotate(
      Math.PI / 4
    );

    rect(
      0,
      0,
      diamondSize,
      diamondSize
    );

    popMatrix();
  }

  rectMode(CORNER);
}

function jdDrawPosterBackgroundWipe() {
  const W = JD.LOGICAL_W;
  const H = JD.LOGICAL_H;

  // フォーカス演出の最終フレームを固定し、
  // ポスターの部品が集まる下地として使う。
  const savedTimer = JD.posterTransitionTimer;
  JD.posterTransitionTimer =
    Number.isFinite(JD.posterTransitionDuration)
      ? JD.posterTransitionDuration
      : 0.78;

  jdDrawPosterFocusIntro();
  JD.posterTransitionTimer = savedTimer;

  const duration =
    Number.isFinite(JD.posterRevealDuration)
      ? Math.max(0.001, JD.posterRevealDuration)
      : 1.08;

  const raw = jdClamp(
    (JD.posterRevealTimer || 0) / duration,
    0,
    1
  );

  const easeOutCubic = (value) => {
    const x = jdClamp(value, 0, 1);
    return 1 - Math.pow(1 - x, 3);
  };

  const smoothStep = (value) => {
    const x = jdClamp(value, 0, 1);
    return x * x * (3 - 2 * x);
  };

  // 各部品の開始を少しずつずらし、
  // ばらばらに動くのではなく、一方向へ収束するリズムを作る。
  const bgT = easeOutCubic(raw / 0.58);
  const heroT = smoothStep((raw - 0.12) / 0.68);
  const infoT = easeOutCubic((raw - 0.22) / 0.46);
  const bandT = easeOutCubic((raw - 0.29) / 0.38);
  const frameT = jdPosterEaseOutBack((raw - 0.31) / 0.48);
  const decorT = smoothStep((raw - 0.48) / 0.30);
  const textT = smoothStep((raw - 0.80) / 0.18);

  rectMode(CORNER);
  ellipseMode(CENTER);
  noStroke();

  const posterPalette = jdGetPosterPalette(jdGetPosterItem());

  // --------------------------------------------------
  // 1. 朱色の版面
  // 左下を支点に、横と縦でわずかに異なる速度で拡大する。
  // 円形の発光ではなく、角を持つ印刷面として見せる。
  // --------------------------------------------------

  // scale()で画面ぴったりの矩形を拡大すると、端末側の補間で
  // 1px未満の隙間が出ることがある。ここでは変形行列を使わず、
  // 左下を固定した実座標の矩形を整数化して広げる。
  const edgeBleed = JD_SCREEN_BLEED;
  // 完成直前に1pxだけ店内が残らないよう、少し早めに100%へ吸着させる。
  const snappedBgT = bgT >= 0.965 ? 1 : bgT;
  const bgW = Math.ceil((W + edgeBleed * 2) * (0.06 + 0.94 * snappedBgT)) + 2;
  const bgH = Math.ceil((H + edgeBleed * 2) * (0.035 + 0.965 * snappedBgT)) + 2;

  fill(
    posterPalette.bg[0],
    posterPalette.bg[1],
    posterPalette.bg[2],
    255
  );
  rect(
    -edgeBleed - 1,
    -edgeBleed - 1,
    bgW,
    bgH
  );

  // 完成直前に、静止画と同じ淡い印刷面を重ねる。
  fill(
    posterPalette.decorLight[0],
    posterPalette.decorLight[1],
    posterPalette.decorLight[2],
    11 * decorT
  );
  ellipse(302, 497, 202, 178);

  fill(
    posterPalette.decorDark[0],
    posterPalette.decorDark[1],
    posterPalette.decorDark[2],
    8 * decorT
  );
  ellipse(57, 294, 164, 214);

  // --------------------------------------------------
  // 2. 下部情報面と操作帯
  // 生成り面は右から、朱色帯は左から入り、中央で版面が揃う。
  // 最終座標は静止ポスターと完全に共通化する。
  // --------------------------------------------------

  const infoY = 54;
  const infoH = 96;
  const bandY = 0;
  const bandH = 54;

  // 静止ポスターと同じ面構造を保ちつつ、移動中の端だけを
  // 整数化して4px余分に描く。完成直前は0へスナップさせる。
  const snappedInfoT = infoT >= 0.972 ? 1 : infoT;
  const snappedBandT = bandT >= 0.972 ? 1 : bandT;

  // 待機位置では、余白を含む矩形の左端そのものを画面外へ置く。
  // 以前は幅に加えたbleed分だけ、右端に細い生成り面が見えていた。
  const infoStartX = W + edgeBleed + 2;
  const infoEndX = -edgeBleed;
  const infoX = Math.floor(
    jdPosterLerp(infoStartX, infoEndX, snappedInfoT)
  );

  fill(
    JD_POSTER_INFO_PAPER[0],
    JD_POSTER_INFO_PAPER[1],
    JD_POSTER_INFO_PAPER[2],
    255
  );
  rect(
    infoX,
    -edgeBleed,
    W + edgeBleed * 2,
    infoY + infoH + edgeBleed
  );

  // 帯も矩形全体を左外へ逃がす。
  // 待機中に左下へ赤いブロックや境界線が残らない。
  const bandStartX = -W - edgeBleed * 2 - 2;
  const bandEndX = -edgeBleed;
  const bandX = Math.ceil(
    jdPosterLerp(bandStartX, bandEndX, snappedBandT)
  );

  fill(
    posterPalette.bg[0],
    posterPalette.bg[1],
    posterPalette.bg[2],
    255
  );
  rect(
    bandX,
    bandY - edgeBleed,
    W + edgeBleed * 2,
    bandH + edgeBleed
  );

  // 境界線も情報面と同じ紙色でそろえ、
  // 下の帯だけが別の素材に見えないようにする。
  fill(
    JD_POSTER_INFO_PAPER[0],
    JD_POSTER_INFO_PAPER[1],
    JD_POSTER_INFO_PAPER[2],
    218 * snappedBandT
  );
  rect(
    bandX,
    Math.round(bandH - 2),
    W + edgeBleed * 2,
    2
  );

  jdDrawPosterReceiptCut(
    bandH,
    232 * snappedBandT
  );

  // --------------------------------------------------
  // 3. 外枠
  // 画面外より大きい状態から縮小し、わずかに行き過ぎて収まる。
  // --------------------------------------------------

  if (frameT > 0) {
    // 下辺を含む四辺が完全に画面外にある大きさから開始する。
    const frameScale = jdPosterLerp(1.34, 1, frameT);
    const frameAlpha = 205 * jdClamp(frameT, 0, 1);
    const frameProgress = jdClamp(frameT, 0, 1);
    const outerFrameWeight = jdPosterLerp(
      4,
      JD_POSTER_FRAME_OUTER_WEIGHT,
      frameProgress
    );
    const innerFrameWeight = jdPosterLerp(
      1.5,
      JD_POSTER_FRAME_INNER_WEIGHT,
      frameProgress
    );

    pushMatrix();
    translate(W / 2, H / 2);
    scale(frameScale, frameScale);
    translate(-W / 2, -H / 2);

    jdDrawPosterDoubleFrame(
      W,
      H,
      frameAlpha,
      outerFrameWeight,
      innerFrameWeight
    );

    popMatrix();
  }

  // --------------------------------------------------
  // 4. 代表商品
  // 商品別の座標・縮尺・視覚中心を共通設定から取得する。
  // --------------------------------------------------

  const item = jdGetPosterItem();
  const heroSpec = jdGetPosterHeroSpec(item);
  const focusTarget = jdFindPosterFocusTarget(
    item,
    JD.posterFocusKind
  );

  const focusPoint = focusTarget
    ? jdWorldToScreen(
        focusTarget.x,
        JD.tableY + heroSpec.focusWorldYOffset
      )
    : (
        jdIsFailurePosterItem(item)
          ? jdWorldToScreen(
              Number.isFinite(heroSpec.focusWorldX)
                ? heroSpec.focusWorldX
                : 405,
              JD.tableY + heroSpec.focusWorldYOffset
            )
          : { x: 180, y: 300 }
      );

  const startScale = heroSpec.cafeScale;
  const startX = focusPoint.x;
  const startY =
    focusPoint.y -
    heroSpec.visualCenterY * startScale;

  const heroEase = jdPosterEaseOutBack(heroT);
  const heroX = jdPosterLerp(
    startX,
    heroSpec.posterX,
    heroEase
  );
  const heroY = jdPosterLerp(
    startY,
    heroSpec.posterY,
    heroEase
  );
  const heroScale = jdPosterLerp(
    startScale,
    heroSpec.posterScale,
    heroEase
  );
  const heroAlpha = jdClamp(heroT / 0.22, 0, 1);

  if (heroAlpha > 0) {
    pushMatrix();
    translate(heroX, heroY);
    scale(heroScale, heroScale);
    jdDrawPosterHero(
      item,
      heroAlpha,
      JD.posterRevealTimer || 0
    );
    popMatrix();
  }

  rectMode(CORNER);
  noStroke();

  // --------------------------------------------------
  // 5. 文字情報
  // 複雑な印字演出にせず、組み上がりの最後に短く現す。
  // --------------------------------------------------

  if (textT > 0) {
    textAlign(LEFT);
    jdFontForLanguage("bold");
    fontSize(
      jdIsEnglish()
        ? JD_POSTER_SPECIAL_SIZE_EN
        : JD_POSTER_SPECIAL_SIZE_JP
    );
    fill(248, 232, 197, JD_POSTER_SPECIAL_ALPHA * textT);
    text(jdT("poster.special", "TODAY'S SPECIAL"), 24, 611);

    jdDrawPosterProductTitles(
      item,
      255 * textT
    );

    textAlign(LEFT);
    jdFontForLanguage();
    fontSize(jdFitPosterDescriptionSize(item.description));
    fill(70, 40, 31, 225 * textT);
    text(item.description, 24, 104);

    jdDrawPosterDiveLogo(
      46,
      88,
      textT
    );

    textAlign(RIGHT);
    jdReceiptFont("bold");
    fontSize(25);
    fill(151, 48, 42, 255 * textT);
    text(`¥${item.price}`, 336, 74);

    jdDrawPosterReceiptHint(
      W / 2,
      bandY + 27,
      textT
    );
  }

  noStroke();
  rectMode(CORNER);
  textAlign(CENTER);
}

// =====================================================
// 完成ポスター静止画
//
// ・演出は一切なし
// ・上下左右を必ず塗り切る
// ・帯、線、文字は固定座標
// ・選出済みの商品とトッピングを表示する
// =====================================================

function jdDrawCompletionPosterStatic() {
  jdDrawCompletionPosterLayout();
}


// =====================================================
// ポスター撤収
// 完成した見た目を保ちながら、紙を外す音、
// 店内復帰時の状態整理、レシートへの安全な引き渡しを加える。
// 撤収完了後は通常の喫茶店を短く静止させ、レシートへ接続する。
// =====================================================

function jdPosterDismissProgress() {
  const duration =
    Number.isFinite(JD.posterDismissDuration)
      ? Math.max(0.001, JD.posterDismissDuration)
      : 1.26;

  return jdClamp(
    (JD.posterDismissTimer || 0) / duration,
    0,
    1
  );
}


function jdDrawCompletionPosterDismiss() {
  const raw = jdPosterDismissProgress();

  const smoothStep = (value) => {
    const x = jdClamp(value, 0, 1);
    return x * x * (3 - 2 * x);
  };

  const easeInCubic = (value) => {
    const x = jdClamp(value, 0, 1);
    return x * x * x;
  };

  // タップ直後は完成画面を短く保ち、
  // 文字 → 枠・帯 → 商品・情報面 → 朱色面の順に戻す。
  const textOutT =
    smoothStep((raw - 0.05) / 0.19);

  const frameOutT =
    smoothStep((raw - 0.13) / 0.28);

  const bandOutT =
    easeInCubic((raw - 0.16) / 0.32);

  const decorOutT =
    smoothStep((raw - 0.30) / 0.16);

  const heroReturnT =
    smoothStep((raw - 0.32) / 0.34);

  const infoOutT =
    smoothStep((raw - 0.37) / 0.31);

  const backgroundOutT =
    smoothStep((raw - 0.52) / 0.42);

  // 朱色面が十分に退いたあと、店内を静めていた暗い幕と
  // スポットライトを逆向きに解除して通常画面へ戻す。
  const cafeFocusReturnT =
    smoothStep((raw - 0.66) / 0.28);

  // 店内側の商品が見えるタイミングで重なるよう、
  // ポスター商品の描画だけ最後に短く薄める。
  const heroBlendOutT =
    smoothStep((raw - 0.66) / 0.12);

  const bandTravel =
    54 + JD_SCREEN_BLEED + 12;

  const infoTravel =
    JD.LOGICAL_W +
    JD_SCREEN_BLEED * 2 +
    18;

  jdDrawCompletionPosterLayout({
    drawCafeUnderlay: true,
    textAlpha: 1 - textOutT,
    bandTextAlpha: 1 - textOutT,
    bandOffsetY: -bandTravel * bandOutT,
    frameScale: 1 + 0.34 * frameOutT,
    frameAlpha: 1 - frameOutT,
    decorAlpha: 1 - decorOutT,
    infoOffsetX: infoTravel * infoOutT,
    backgroundRetreat: backgroundOutT,
    cafeFocusReturn: cafeFocusReturnT,
    heroReturn: heroReturnT,
    heroAlpha: 1 - heroBlendOutT
  });
}


// 完成時と撤収中で同じ面構造を共有する。
// 撤収側は文字・帯・枠に加え、背景面・情報面・商品の値を変える。

function jdDrawPosterReceiptHint(centerX, y, alpha = 1) {
  if (JD_POSTER_CAPTURE_CLEAN) return;

  const label =
    jdT(
      "poster.viewReceipt",
      "VIEW RECEIPT"
    );

  const baseAlpha =
    jdClamp(
      Number.isFinite(alpha)
        ? alpha
        : 1,
      0,
      1
    );

  if (baseAlpha <= 0.001) {
    return;
  }

  const size =
    jdIsEnglish()
      ? JD_POSTER_VIEW_RECEIPT_SIZE_EN
      : JD_POSTER_VIEW_RECEIPT_SIZE_JP;

  textAlign(CENTER);
  jdFontForLanguage("bold");
  fontSize(size);

  const holdAge =
    JD.state === STATE_POSTER_HOLD &&
    Number.isFinite(JD.posterTimer)
      ? Math.max(0, JD.posterTimer)
      : 0;

  const activeT =
    jdClamp(
      (holdAge - 0.80) / 0.48,
      0,
      1
    );

  // 点滅ではなく、呼吸くらいの弱い明滅。
  const breath =
    0.5 -
    0.5 *
    Math.cos(
      ElapsedTime *
      Math.PI *
      2 /
      1.62
    );

  const labelAlpha =
    baseAlpha *
    (
      0.86 +
      0.14 *
      breath *
      activeT
    );

  const arrowAlpha =
    baseAlpha *
    (
      0.72 +
      0.28 *
      breath *
      activeT
    );

  const labelW =
    typeof textWidth === "function"
      ? textWidth(label)
      : label.length * size * 0.72;

  const baseGap =
    Math.max(
      jdIsEnglish() ? 25 : 27,
      size * 1.55
    );

  const baseArrowOffset =
    labelW / 2 +
    baseGap;

  // 左右の矢印だけが、文字へ少し寄って戻る。
  // 最大4pxに抑え、催促感を出しすぎない。
  const inward =
    activeT *
    breath *
    4.0;

  fill(
    248,
    232,
    197,
    255 * labelAlpha
  );

  text(
    label,
    centerX,
    y
  );

  fill(
    248,
    232,
    197,
    255 * arrowAlpha
  );

  text(
    "▶",
    centerX -
      baseArrowOffset +
      inward,
    y
  );

  text(
    "◀",
    centerX +
      baseArrowOffset -
      inward,
    y
  );
}

function jdDrawCompletionPosterLayout(options = {}) {
  const W = JD.LOGICAL_W;
  const H = JD.LOGICAL_H;

  const textAlpha =
    options.textAlpha === undefined
      ? 1
      : jdClamp(options.textAlpha, 0, 1);

  const bandTextAlpha =
    options.bandTextAlpha === undefined
      ? textAlpha
      : jdClamp(options.bandTextAlpha, 0, 1);

  const bandOffsetY =
    Number.isFinite(options.bandOffsetY)
      ? options.bandOffsetY
      : 0;

  const frameScale =
    Number.isFinite(options.frameScale)
      ? options.frameScale
      : 1;

  const frameAlpha =
    options.frameAlpha === undefined
      ? 1
      : jdClamp(options.frameAlpha, 0, 1);

  const decorAlpha =
    options.decorAlpha === undefined
      ? 1
      : jdClamp(options.decorAlpha, 0, 1);

  const infoOffsetX =
    Number.isFinite(options.infoOffsetX)
      ? options.infoOffsetX
      : 0;

  const backgroundRetreat =
    options.backgroundRetreat === undefined
      ? 0
      : jdClamp(options.backgroundRetreat, 0, 1);

  const cafeFocusReturn =
    options.cafeFocusReturn === undefined
      ? 0
      : jdClamp(options.cafeFocusReturn, 0, 1);

  const heroReturn =
    options.heroReturn === undefined
      ? 0
      : jdClamp(options.heroReturn, 0, 1);

  const heroAlpha =
    options.heroAlpha === undefined
      ? 1
      : jdClamp(options.heroAlpha, 0, 1);

  const drawCafeUnderlay =
    options.drawCafeUnderlay === true;

  const item = jdGetPosterItem();
  const posterPalette = jdGetPosterPalette(item);

  rectMode(CORNER);
  ellipseMode(CENTER);
  textAlign(CENTER);
  noStroke();

  const infoY = 54;
  const infoH = 96;
  const bandY = bandOffsetY;
  const bandH = 54;
  const posterBleed = JD_SCREEN_BLEED;

  // 撤収中は、完成ポスターの下へフォーカス済みの喫茶店を置く。
  // 朱色面が右へ退くほど、同じ一杯が店内へ戻って見える。
  if (drawCafeUnderlay) {
    const savedTimer = JD.posterTransitionTimer;

    const focusDuration =
      Number.isFinite(JD.posterTransitionDuration)
        ? Math.max(0.001, JD.posterTransitionDuration)
        : 0.78;

    // 0ではフォーカス済み、1では通常の喫茶店。
    // 撤収の終盤で店内の暗さと商品ズームを自然に戻す。
    JD.posterTransitionTimer =
      focusDuration *
      (1 - cafeFocusReturn);

    jdDrawPosterFocusIntro();
    JD.posterTransitionTimer = savedTimer;

    rectMode(CORNER);
    ellipseMode(CENTER);
    noStroke();
  }

  // --------------------------------------------------
  // 1. 全面背景
  // 完成時と撤収時のどちらも同じオーバースキャンを維持する。
  // --------------------------------------------------

  const posterFullX = -posterBleed;
  const posterFullW = W + posterBleed * 2;
  const posterBgX =
    posterFullX +
    posterFullW * backgroundRetreat;

  const posterBgW =
    posterFullW *
    (1 - backgroundRetreat);

  if (posterBgW > 0.25) {
    fill(
      posterPalette.bg[0],
      posterPalette.bg[1],
      posterPalette.bg[2],
      255
    );
    rect(
      posterBgX,
      -posterBleed,
      posterBgW + 1,
      H + posterBleed * 2
    );
  }

  if (decorAlpha > 0.001) {
    fill(
      posterPalette.decorLight[0],
      posterPalette.decorLight[1],
      posterPalette.decorLight[2],
      11 * decorAlpha
    );
    ellipse(302, 497, 202, 178);

    fill(
      posterPalette.decorDark[0],
      posterPalette.decorDark[1],
      posterPalette.decorDark[2],
      8 * decorAlpha
    );
    ellipse(57, 294, 164, 214);
  }

  // --------------------------------------------------
  // 2. 生成り情報面
  // 撤収前半では固定し、下部朱色帯だけを画面下へ戻す。
  // --------------------------------------------------

  fill(
    JD_POSTER_INFO_PAPER[0],
    JD_POSTER_INFO_PAPER[1],
    JD_POSTER_INFO_PAPER[2],
    255
  );
  rect(
    -posterBleed + infoOffsetX,
    -posterBleed,
    W + posterBleed * 2,
    infoY + infoH + posterBleed
  );

  // --------------------------------------------------
  // 3. 下部朱色帯
  // 帯・境界線・文字を同じbandYで移動し、分離を防ぐ。
  // --------------------------------------------------

  fill(
    posterPalette.bg[0],
    posterPalette.bg[1],
    posterPalette.bg[2],
    255
  );
  rect(
    -posterBleed,
    bandY - posterBleed,
    W + posterBleed * 2,
    bandH + posterBleed
  );

  fill(
    JD_POSTER_INFO_PAPER[0],
    JD_POSTER_INFO_PAPER[1],
    JD_POSTER_INFO_PAPER[2],
    218
  );
  rect(
    -posterBleed,
    bandY + bandH - 2,
    W + posterBleed * 2,
    2
  );

  jdDrawPosterReceiptCut(
    bandY + bandH,
    232
  );

  // --------------------------------------------------
  // 4. ポスター内部の細い枠
  // 中央基準で拡大し、入ってきた外側へ戻す。
  // --------------------------------------------------

  if (frameAlpha > 0.001) {
    pushMatrix();
    translate(W / 2, H / 2);
    scale(frameScale, frameScale);
    translate(-W / 2, -H / 2);

    jdDrawPosterDoubleFrame(W, H, 205 * frameAlpha);

    popMatrix();
  }

  // --------------------------------------------------
  // 5. 見出しと商品名
  // --------------------------------------------------

  if (textAlpha > 0.001) {
    textAlign(LEFT);
    jdFontForLanguage("bold");
    fontSize(
      jdIsEnglish()
        ? JD_POSTER_SPECIAL_SIZE_EN
        : JD_POSTER_SPECIAL_SIZE_JP
    );
    fill(
      248,
      232,
      197,
      JD_POSTER_SPECIAL_ALPHA * textAlpha
    );
    text(jdT("poster.special", "TODAY'S SPECIAL"), 24, 611);

    jdDrawPosterProductTitles(
      item,
      255 * textAlpha
    );
  }

  // --------------------------------------------------
  // 6. 商品アップ
  // ポスター中央から、商品ごとの店内位置へ戻す。
  // 店内側の商品はすでに通常サイズで描かれるため、
  // 撤収用ヒーローは縮小せず、位置だけを合わせてから薄める。
  // --------------------------------------------------

  if (heroAlpha > 0.001) {
    const heroSpec = jdGetPosterHeroSpec(item);
    const focusTarget = jdFindPosterFocusTarget(
      item,
      JD.posterFocusKind
    );

    const focusPoint =
      focusTarget
        ? jdWorldToScreen(
            focusTarget.x,
            JD.tableY + heroSpec.focusWorldYOffset
          )
        : (
            jdIsFailurePosterItem(item)
              ? jdWorldToScreen(
                  Number.isFinite(heroSpec.focusWorldX)
                    ? heroSpec.focusWorldX
                    : 405,
                  JD.tableY + heroSpec.focusWorldYOffset
                )
              : {
                  x: 180,
                  y: 306
                }
          );

    const heroScale =
      heroSpec.posterScale;

    const cafeX = focusPoint.x;
    const cafeY =
      focusPoint.y -
      heroSpec.visualCenterY *
      heroScale;

    const heroX =
      jdPosterLerp(
        heroSpec.posterX,
        cafeX,
        heroReturn
      );

    const heroY =
      jdPosterLerp(
        heroSpec.posterY,
        cafeY,
        heroReturn
      );

    pushMatrix();
    translate(heroX, heroY);
    scale(heroScale, heroScale);
    jdDrawPosterHero(item, heroAlpha, 2);
    popMatrix();
  }

  // --------------------------------------------------
  // 7. 説明文、店名、価格
  // --------------------------------------------------

  if (textAlpha > 0.001) {
    textAlign(LEFT);
    jdFontForLanguage();
    fontSize(jdFitPosterDescriptionSize(item.description));
    fill(70, 40, 31, 225 * textAlpha);
    text(item.description, 24, 104);

    jdDrawPosterDiveLogo(
      46,
      88,
      textAlpha
    );

    textAlign(RIGHT);
    jdReceiptFont("bold");
    fontSize(25);
    fill(151, 48, 42, 255 * textAlpha);
    text(`¥${item.price}`, 336, 74);
  }

  // --------------------------------------------------
  // 8. 帯の文字
  // --------------------------------------------------

  if (bandTextAlpha > 0.001) {
    jdDrawPosterReceiptHint(
      W / 2,
      bandY + 27,
      bandTextAlpha
    );
  }

  noStroke();
  rectMode(CORNER);
  textAlign(CENTER);
}




// =====================================================
// 完成ポスター画面
// スクショ待ちの余韻と、レシートへの紙送り
// 代表成功結果から表示データを生成し、固定データは代替表示にだけ使う。
//
// 役割：
// ・暗いタイトル → 抑えめのゲーム画面 → ポップな完成画面
// ・レシートの前に、その回の一品を作品として見せる
// ・選出済みの代表商品を、店内フォーカスから撤収まで共有する
// =====================================================

function jdIsPosterSuccessResult(result) {
  if (!result) return false;

  return (
    result.type === "DIVE" ||
    result.type === "LAND" ||
    result.type === "STAB"
  );
}


function jdSelectBestPosterResult(results = JD.results) {
  const source = jdBuildCompletedProducts(results);

  let bestResult = null;
  let bestPrice = -Infinity;
  let bestLastIndex = -1;

  for (
    let i = 0;
    i < source.length;
    i += 1
  ) {
    const result = source[i];

    const price =
      Number.isFinite(
        result.price
      )
        ? result.price
        : 0;

    const lastIndex = Number.isInteger(result.lastResultIndex)
      ? result.lastResultIndex
      : i;

    // 商品単位の合計価格が高いものを優先する。
    // 同額なら、最後のトッピングがより後だった商品を残す。
    if (
      bestResult === null ||
      price > bestPrice ||
      (
        price === bestPrice &&
        lastIndex >= bestLastIndex
      )
    ) {
      bestResult = result;
      bestPrice = price;
      bestLastIndex = lastIndex;
    }
  }

  if (!bestResult) return null;

  // 元のレシート結果を変更せず、ポスター用の安全なスナップショットにする。
  return {
    ...bestResult,
    resultIndex: bestLastIndex,
    resultIndices: Array.isArray(bestResult.resultIndices)
      ? bestResult.resultIndices.slice()
      : [bestLastIndex]
  };
}


function jdGetPosterTargetTypeFromResult(result) {
  if (!result) return null;

  // 保存済み結果の target と、既存ターゲット定義の kind を結び付ける。
  // これにより店内フォーカス、ヒーロー、配色が同じ商品種別を共有する。
  const target =
    Array.isArray(JD.targets)
      ? JD.targets.find(
          (candidate) =>
            candidate &&
            (
              candidate.id === result.target ||
              candidate.label === result.targetLabel
            )
        )
      : null;

  if (
    target &&
    (
      target.kind === "melon" ||
      target.kind === "cake" ||
      target.kind === "coffee"
    )
  ) {
    return target.kind;
  }

  // 結果スナップショットだけを渡すテストや復元時にも扱えるよう、
  // 現在コードで確認済みの id / label だけを明示的に補完する。
  const targetName = String(
    result.target ||
    result.targetLabel ||
    ""
  ).trim().toUpperCase();

  if (targetName === "COFFEE") return "coffee";
  if (targetName === "CAKE") return "cake";
  if (
    targetName === "MELON SODA" ||
    targetName === "MELON"
  ) {
    return "melon";
  }

  return null;
}


function jdGetPosterIngredientTitle(result) {
  return jdGetPosterIngredientTitleForLanguage(
    result,
    JD.lang
  );
}

function jdGetPosterIngredientTitleForLanguage(
  result,
  language
) {
  const lang = jdNormalizeLanguage(language);
  const isEnglish = lang === "en";
  const toppings = jdGetProductToppings(result);

  if (toppings.length > 1) {
    const uniqueItems = Array.from(
      new Set(toppings.map((topping) => topping.item))
    );

    if (uniqueItems.length > 1) {
      return isEnglish ? "MIXED" : "ミックス";
    }

    const ingredient = jdGetIngredientMenuNameForLanguage(
      uniqueItems[0],
      lang
    );
    const count = toppings.length;

    if (isEnglish) {
      const countName = count === 2
        ? "DOUBLE"
        : count === 3
          ? "TRIPLE"
          : `${count}×`;
      return `${countName} ${ingredient.toUpperCase()}`;
    }

    const countName = count === 2
      ? "ダブル"
      : count === 3
        ? "トリプル"
        : `${count}連`;

    return `${countName}${ingredient}`;
  }

  const recipeTitle = jdGetRecipeTextForLanguage(
    result,
    "posterTop",
    lang
  );

  if (recipeTitle) return recipeTitle;

  const itemName = String(
    result && result.item
      ? result.item
      : ""
  ).trim().toUpperCase();

  return jdGetIngredientMenuNameForLanguage(
    itemName,
    lang
  );
}



function jdGetPosterProductTitle(result, targetType) {
  return jdGetPosterProductTitleForLanguage(
    result,
    targetType,
    JD.lang
  );
}

function jdGetPosterProductTitleForLanguage(
  result,
  targetType,
  language
) {
  const lang = jdNormalizeLanguage(language);

  const recipeTitle = jdGetRecipeTextForLanguage(
    result,
    "posterMain",
    lang
  );

  if (recipeTitle) return recipeTitle;

  const titles = lang === "en"
    ? {
        melon: "MELON SODA",
        cake: "SHORTCAKE",
        coffee: "COFFEE"
      }
    : {
        melon: "メロンソーダ",
        cake: "ショートケーキ",
        coffee: "コーヒー"
      };

  return titles[targetType] || "";
}



// Zen Kaku Gothic Newの英字幅を、未確認のtextWidth APIへ依存せず
// 文字種別から概算する。現在の説明文は同じ最大幅でそろえる。
function jdMeasurePosterBodyWidth(value, size) {
  const safeSize = Number.isFinite(size)
    ? Math.max(0, size)
    : 0;

  let units = 0;

  for (const char of Array.from(String(value || ""))) {
    if (/\s/.test(char)) {
      units += 0.30;
    } else if (/[ilI1|.,'`:;!]/.test(char)) {
      units += 0.28;
    } else if (/[MW@%&]/.test(char)) {
      units += 0.86;
    } else if (/[A-Z0-9]/.test(char)) {
      units += 0.62;
    } else if (char.charCodeAt(0) > 0x02ff) {
      units += 0.95;
    } else {
      units += 0.52;
    }
  }

  return units * safeSize;
}


function jdFitPosterDescriptionSize(value) {
  if (!jdIsEnglish()) {
    return JD_POSTER_DESCRIPTION_SIZE_JP;
  }

  let size = JD_POSTER_DESCRIPTION_SIZE_EN_MAX;

  while (
    size > JD_POSTER_DESCRIPTION_SIZE_EN_MIN &&
    jdMeasurePosterBodyWidth(value, size) >
      JD_POSTER_DESCRIPTION_MAX_WIDTH
  ) {
    size = Math.max(
      JD_POSTER_DESCRIPTION_SIZE_EN_MIN,
      size - 0.25
    );
  }

  return size;
}


function jdMeasurePosterRetroJapaneseWidth(
  value,
  size,
  language = null
) {
  const chars = Array.from(
    String(value || "")
  );

  if (chars.length === 0) return 0;

  const safeSize =
    Number.isFinite(size)
      ? Math.max(0, size)
      : 0;

  const isEnglishText = language === null
    ? jdIsEnglish()
    : jdNormalizeLanguage(language) === "en";

  const glyphWidth = isEnglishText
    ? safeSize * 0.58
    : safeSize;

  const scaleX = isEnglishText
    ? 1
    : JD_POSTER_TITLE_SCALE_X;

  return (
    (
      chars.length * glyphWidth +
      Math.max(0, chars.length - 1) *
        JD_POSTER_TITLE_TRACKING
    ) * scaleX
  );
}



function jdFitPosterTitleSize(
  value,
  language = null
) {
  const maxSize = 35.5;
  const minSize = 12;
  const sizeStep = 0.5;
  const maxWidth = 273;

  let size = maxSize;

  while (
    size > minSize &&
    jdMeasurePosterRetroJapaneseWidth(
      value,
      size,
      language
    ) > maxWidth
  ) {
    size = Math.max(
      minSize,
      size - sizeStep
    );
  }

  return size;
}

function jdFitPosterSubtitleSize(value) {
  let size = JD_POSTER_SUBTITLE_SIZE_MAX;

  while (
    size > JD_POSTER_SUBTITLE_SIZE_MIN &&
    jdMeasurePosterBodyWidth(value, size) >
      JD_POSTER_SUBTITLE_MAX_WIDTH
  ) {
    size = Math.max(
      JD_POSTER_SUBTITLE_SIZE_MIN,
      size - 0.25
    );
  }

  return size;
}


function jdNormalizePosterToppingOffset(value) {
  return Number.isFinite(value)
    ? jdClamp(value, -1, 1)
    : null;
}

// 店内での最終位置を器内の -1〜+1 へ変換する。
// ポスター側ではこの値を構図に合わせて小さく使うため、物理座標を
// そのまま持ち込まず、商品ごとの違いも吸収できる。
function jdCapturePosterToppingPlacement(food, target) {
  if (!food || !target) {
    return { pose: "center", offsetX: 0, offsetY: 0 };
  }

  const isCakeStab =
    target.kind === "cake" && JD.pendingCakeSasari;
  const ranges = {
    coffee: {
      x: 22,
      yMin: JD.tableY + 39,
      yMax: JD.tableY + 48
    },
    cake: {
      x: isCakeStab ? 32 : 36,
      yMin: JD.tableY + (isCakeStab ? 51 : 57),
      yMax: JD.tableY + (isCakeStab ? 65 : 73)
    },
    melon: {
      x: 18,
      yMin: JD.tableY + 46,
      yMax: JD.tableY + 126
    }
  };
  const range = ranges[target.kind];

  if (!range || !Number.isFinite(range.x) || range.x <= 0) {
    return { pose: "center", offsetX: 0, offsetY: 0 };
  }

  const offsetX = jdClamp(
    (food.x - target.x) / range.x,
    -1,
    1
  );
  const yCenter = (range.yMin + range.yMax) / 2;
  const yHalf = Math.max(1, (range.yMax - range.yMin) / 2);
  const offsetY = jdClamp(
    (food.y - yCenter) / yHalf,
    -1,
    1
  );
  const pose = offsetX <= -0.28
    ? "left"
    : offsetX >= 0.28
      ? "right"
      : "center";

  return { pose, offsetX, offsetY };
}

// 旧コード／復元データ向けの三段階APIは残しておく。
function jdCapturePosterToppingPose(food, target) {
  return jdCapturePosterToppingPlacement(food, target).pose;
}

function jdNormalizePosterToppingPose(pose) {
  return pose === "left" || pose === "right"
    ? pose
    : "center";
}


function jdIsFailurePosterItem(item) {
  return !!item && (
    item.isFailurePoster === true ||
    item.heroType === "failure" ||
    item.targetType === "failure"
  );
}


function jdIsPosterFailureResult(result) {
  return !!result && (
    result.type === "FLOOR" ||
    result.type === "OUT"
  );
}


function jdBuildFailurePosterItem(results = JD.results) {
  const source = Array.isArray(results)
    ? results
    : [];

  if (
    source.length === 0 ||
    !source.every((result) => jdIsPosterFailureResult(result))
  ) {
    return null;
  }

  const lastFailureIndex = source.length - 1;
  const lastFailure = source[lastFailureIndex];

  const titleTopJp = "からっぽ";
  const titleMainJp = "プレート";
  const titleTopEn = "EMPTY";
  const titleMainEn = "PLATE";
  const titleEnglish =
    `${titleTopEn} ${titleMainEn}`;

  return {
    targetType: "failure",
    heroType: "failure",
    isFailurePoster: true,
    item: lastFailure.item || "CHERRY",
    toppingPose: "center",
    resultType: lastFailure.type,
    resultIndex: lastFailureIndex,

    titleTop:
      jdIsEnglish()
        ? titleTopEn
        : titleTopJp,

    titleMain:
      jdIsEnglish()
        ? titleMainEn
        : titleMainJp,

    titleTopJp,
    titleMainJp,
    titleTopEn,
    titleMainEn,
    titleEnglish,

    titleTopSize:
      jdFitPosterTitleSize(
        titleTopJp,
        "jp"
      ),

    titleMainSize:
      jdFitPosterTitleSize(
        titleMainJp,
        "jp"
      ),

    titleEnglishSize:
      jdFitPosterSubtitleSize(
        titleEnglish
      ),

    description: jdT(
      "poster.failureDescription",
      "AT LEAST THE PLATE WAS READY."
    ),

    price: 0
  };
}



function jdBuildPosterItem(bestResult, results = JD.results) {
  if (!jdIsPosterSuccessResult(bestResult)) {
    return (
      jdBuildFailurePosterItem(results) ||
      jdMakePosterMockItem()
    );
  }

  const targetType =
    jdGetPosterTargetTypeFromResult(
      bestResult
    );

  const titleTopJp =
    jdGetPosterIngredientTitleForLanguage(
      bestResult,
      "jp"
    );

  const titleMainJp =
    jdGetPosterProductTitleForLanguage(
      bestResult,
      targetType,
      "jp"
    );

  const titleTopEn =
    jdGetPosterIngredientTitleForLanguage(
      bestResult,
      "en"
    );

  const titleMainEn =
    jdGetPosterProductTitleForLanguage(
      bestResult,
      targetType,
      "en"
    );

  if (
    !targetType ||
    !titleTopJp ||
    !titleMainJp ||
    !titleTopEn ||
    !titleMainEn
  ) {
    return jdMakePosterMockItem();
  }

  const toppings =
    jdGetProductToppings(bestResult);

  const firstTopping = toppings[0] || {
    item: bestResult.item,
    toppingPose: bestResult.posterToppingPose
  };

  const titleEnglish =
    `${titleTopEn} ${titleMainEn}`;

  return {
    targetType,
    heroType: targetType,
    productKey:
      jdGetCompletedProductKey(bestResult),

    item:
      firstTopping.item ||
      bestResult.item,

    toppings,

    toppingPose:
      jdNormalizePosterToppingPose(
        firstTopping.toppingPose ||
        bestResult.posterToppingPose
      ),

    posterToppingOffsetX:
      jdNormalizePosterToppingOffset(
        firstTopping.posterToppingOffsetX
      ),

    posterToppingOffsetY:
      jdNormalizePosterToppingOffset(
        firstTopping.posterToppingOffsetY
      ),

    resultIndices:
      Array.isArray(bestResult.resultIndices)
        ? bestResult.resultIndices.slice()
        : Number.isInteger(bestResult.resultIndex)
          ? [bestResult.resultIndex]
          : [],

    resultIndex:
      Number.isInteger(
        bestResult.resultIndex
      )
        ? bestResult.resultIndex
        : -1,

    titleTop:
      jdIsEnglish()
        ? titleTopEn
        : titleTopJp,

    titleMain:
      jdIsEnglish()
        ? titleMainEn
        : titleMainJp,

    titleTopJp,
    titleMainJp,
    titleTopEn,
    titleMainEn,
    titleEnglish,

    titleTopSize:
      jdFitPosterTitleSize(
        titleTopJp,
        "jp"
      ),

    titleMainSize:
      jdFitPosterTitleSize(
        titleMainJp,
        "jp"
      ),

    titleEnglishSize:
      jdFitPosterSubtitleSize(
        titleEnglish
      ),

    description:
      jdGetCompletedProductDescription(
        bestResult,
        String(
          bestResult.comment ||
          bestResult.name ||
          ""
        )
      ),

    price:
      Number.isFinite(bestResult.price)
        ? bestResult.price
        : 0
  };
}



function jdMakePosterMockItem() {
  const isEnglish = jdIsEnglish();

  const makeItem = (spec) => {
    const titleEnglish =
      `${spec.titleTopEn} ${spec.titleMainEn}`;

    return {
      targetType: spec.targetType,
      heroType: spec.targetType,
      item: spec.item,
      toppingPose: "center",
      resultIndex: -1,

      titleTop:
        isEnglish
          ? spec.titleTopEn
          : spec.titleTopJp,

      titleMain:
        isEnglish
          ? spec.titleMainEn
          : spec.titleMainJp,

      titleTopJp: spec.titleTopJp,
      titleMainJp: spec.titleMainJp,
      titleTopEn: spec.titleTopEn,
      titleMainEn: spec.titleMainEn,
      titleEnglish,

      titleTopSize:
        jdFitPosterTitleSize(
          spec.titleTopJp,
          "jp"
        ),

      titleMainSize:
        jdFitPosterTitleSize(
          spec.titleMainJp,
          "jp"
        ),

      titleEnglishSize:
        jdFitPosterSubtitleSize(
          titleEnglish
        ),

      description:
        isEnglish
          ? spec.descriptionEn
          : spec.descriptionJp,

      price: spec.price
    };
  };

  const items = {
    melon: makeItem({
      targetType: "melon",
      item: "CHERRY",
      titleTopJp: "チェリー",
      titleMainJp: "メロンソーダ",
      titleTopEn: "CHERRY",
      titleMainEn: "MELON SODA",
      descriptionJp:
        "きょうだけの色を添えた、静かな夜のごほうび。",
      descriptionEn:
        "A quiet reward in tonight's special color.",
      price: 600
    }),

    cake: makeItem({
      targetType: "cake",
      item: "STRAWBERRY",
      titleTopJp: "いちご",
      titleMainJp: "ショートケーキ",
      titleTopEn: "STRAWBERRY",
      titleMainEn: "SHORTCAKE",
      descriptionJp:
        "赤い実を添えた、夜更けの小さなごほうび。",
      descriptionEn:
        "A small late-night reward with a red berry.",
      price: 650
    }),

    coffee: makeItem({
      targetType: "coffee",
      item: "SUGAR",
      titleTopJp: "シュガー",
      titleMainJp: "コーヒー",
      titleTopEn: "SUGAR",
      titleMainEn: "COFFEE",
      descriptionJp:
        "ひとさじの甘さを落とした、夜の深い一杯。",
      descriptionEn:
        "A deep cup softened by one spoonful of sugar.",
      price: 500
    })
  };

  return (
    items[JD_POSTER_PREVIEW_KIND] ||
    items.melon
  );
}



function jdGetPosterItem() {
  return (
    JD.posterItem ||
    jdMakePosterMockItem()
  );
}






// レシートは物理ログではなく、その日に出せたメニューだけを並べる。
// 成功結果の正式名はポスターと共通の recipeBook から取得する。
function jdGetReceiptMenuEntries() {
  return jdBuildCompletedProducts(JD.results).filter(
    (product) =>
      !!jdGetCompletedProductMenuName(product)
  );
}

// テーブル落ちと場外は商品行に混ぜず、合計直後の小さな記録へまとめる。
function jdGetReceiptLossLines() {
  const results = Array.isArray(JD.results)
    ? JD.results
    : [];

  let floorCount = 0;
  let outCount = 0;

  for (const result of results) {
    if (result && result.type === "FLOOR") floorCount += 1;
    if (result && result.type === "OUT") outCount += 1;
  }

  const lines = [];

  if (floorCount > 0) {
    lines.push(
      jdIsEnglish()
        ? `TABLE DROPS ×${floorCount}`
        : `テーブル落ち ${floorCount}件`
    );
  }

  if (outCount > 0) {
    lines.push(
      jdIsEnglish()
        ? `OUT ×${outCount}`
        : `とび出し ${outCount}件`
    );
  }

  return lines;
}

// 紙の移動・着地音・印字開始がずれないよう、共通の時刻を返す。
function jdGetReceiptMotionTiming() {
  const motion = JD.motion || {};

  const dropDelay = Number.isFinite(motion.receiptDropDelay)
    ? Math.max(0, motion.receiptDropDelay)
    : 0.08;

  const dropDuration = Number.isFinite(motion.receiptDrop)
    ? Math.max(0.001, motion.receiptDrop)
    : 0.62;

  const printDelay = Number.isFinite(motion.receiptPrintDelay)
    ? Math.max(0, motion.receiptPrintDelay)
    : 0.16;

  const dropAt = dropDelay + dropDuration;

  return {
    dropDelay,
    dropDuration,
    dropAt,
    printDelay,
    printStartAt: dropAt + printDelay
  };
}


// 表示・印字音・操作可能になるタイミングを、同じ明細構造から算出する。
function jdGetReceiptLayout() {
  const menuEntries = jdGetReceiptMenuEntries();
  const lossLines = jdGetReceiptLossLines();
  const receiptMotion = jdGetReceiptMotionTiming();
  const resultDelay = receiptMotion.printStartAt;
  const resultInterval = 0.27;
  const resultEnd =
    resultDelay +
    menuEntries.length * resultInterval;
  // 商品行がない全失敗レシートは、印字開始時刻から合計を出す。
  // 存在しない商品行のために余分な間を作らない。
  const totalAt = menuEntries.length > 0
    ? resultEnd + 0.18
    : resultDelay;
  const lossDelay = totalAt + 0.18;
  const lossInterval = 0.20;
  const lossEnd = lossLines.length > 0
    ? lossDelay + lossLines.length * lossInterval
    : totalAt;
  const rankAt = lossEnd + 0.38;
  const memoAt = rankAt + 0.38;
  const readyAt = memoAt + 0.42;

  return {
    menuEntries,
    lossLines,
    resultDelay,
    resultInterval,
    resultEnd,
    totalAt,
    lossDelay,
    lossInterval,
    lossEnd,
    rankAt,
    memoAt,
    readyAt
  };
}

function jdResolvePosterKind(itemOrKind) {
  if (typeof itemOrKind === "string") return itemOrKind;

  if (itemOrKind && itemOrKind.heroType) {
    return itemOrKind.heroType;
  }

  if (itemOrKind && itemOrKind.targetType) {
    return itemOrKind.targetType;
  }

  return JD_POSTER_PREVIEW_KIND || "melon";
}

function jdGetPosterPalette(itemOrKind) {
  const kind = jdResolvePosterKind(itemOrKind);

  const palettes = {
    // モック画像の抽出色を基準にした、柔らかなコーラルレッド。
    melon: {
      bg: [213, 89, 90],
      accent: [232, 125, 123],
      decorLight: [224, 112, 110],
      decorDark: [145, 56, 58]
    },

    // 黄色みを強め、赤い果実と対比する明るいピスタチオグリーン。
    cake: {
      bg: [158, 190, 109],
      accent: [198, 219, 154],
      decorLight: [181, 204, 132],
      decorDark: [111, 136, 71]
    },

    // 現行より暗く、赤みを抑えたビターな焦げ茶色。
    coffee: {
      bg: [74, 53, 45],
      accent: [116, 89, 77],
      decorLight: [97, 72, 62],
      decorDark: [43, 29, 24]
    },

    // 青みを強めた、閉店後の黒板を思わせる深い青緑。
    failure: {
      bg: [42, 85, 74],
      accent: [84, 128, 116],
      decorLight: [67, 108, 97],
      decorDark: [24, 49, 42]
    }
  };

  return palettes[kind] || palettes.melon;
}



function jdGetPosterHeroSpec(item) {
  const kind =
    item && item.heroType
      ? item.heroType
      : (
          item && item.targetType
            ? item.targetType
            : "melon"
        );

  if (kind === "failure") {
    return {
      kind: "failure",
      posterX: 180,
      posterY: 248,
      posterScale: 1.34,
      cafeScale: 0.68,
      visualCenterY: 10,
      focusWorldX: 405,
      focusWorldYOffset: 42,
      focusZoom: 0.66,
      focusLightW: 188,
      focusLightH: 98
    };
  }

  if (kind === "cake") {
    return {
      kind: "cake",
      posterX: 192,
      posterY: 182,
      posterScale: 1.62,
      cafeScale: 0.68,
      visualCenterY: 56,
      focusWorldYOffset: 42,
      focusLightW: 168,
      focusLightH: 118
    };
  }

  if (kind === "coffee") {
    return {
      kind: "coffee",
      posterX: 190,
      posterY: 192,
      posterScale: 1.58,
      cafeScale: 0.80,
      visualCenterY: 38,
      focusWorldYOffset: 38,
      focusLightW: 148,
      focusLightH: 116
    };
  }

  return {
    kind: "melon",
    posterX: 192,
    posterY: 140,
    posterScale: 1.332,
    cafeScale: 0.70,
    visualCenterY: 95,
    focusWorldYOffset: 84,
    focusLightW: 126,
    focusLightH: 156
  };
}


function jdFindPosterFocusTarget(item, preferredKind = null) {
  if (jdIsFailurePosterItem(item)) return null;

  const kind =
    preferredKind ||
    (item && item.targetType) ||
    "melon";

  return (
    JD.targets.find(
      (target) => target.kind === kind
    ) ||
    JD.targets.find(
      (target) => target.kind === "melon"
    ) ||
    JD.targets[0] ||
    null
  );
}


function jdSetCameraPosterFocus(
  item,
  preferredKind = null
) {
  if (jdIsFailurePosterItem(item)) {
    const spec = jdGetPosterHeroSpec(item);
    const focusX = Number.isFinite(spec.focusWorldX)
      ? spec.focusWorldX
      : 405;
    const focusY = JD.tableY + spec.focusWorldYOffset;
    const zoom = Number.isFinite(spec.focusZoom)
      ? spec.focusZoom
      : 0.66;

    // 成功商品がない日は、商品を捏造せず、ケーキとコーヒーの間の
    // 空いたテーブル面へ穏やかに視線を集める。
    JD.cam.tz = zoom;
    JD.cam.tx = jdClampCameraX(focusX, zoom);
    JD.cam.ty = jdClamp(focusY, 175, 365);
    return true;
  }

  const focusTarget =
    jdFindPosterFocusTarget(
      item,
      preferredKind
    );

  if (!focusTarget) return false;

  // 成功時にすでに使っている商品別ズーム倍率とカメラ制限を再利用する。
  // 現在位置は直接書き換えず、tx / ty / tzだけを更新して補間を保つ。
  const zoom =
    jdPerfectZoomLevel(
      focusTarget
    );

  // camScreenX / camScreenY は現在値を保ち、画面基準点の瞬間移動を防ぐ。
  JD.cam.tz = zoom;
  JD.cam.tx = jdClampCameraX(
    focusTarget.x,
    zoom
  );
  JD.cam.ty = jdClamp(
    focusTarget.y + 8,
    175,
    365
  );

  return true;
}


function jdGetPosterToppingKind(item) {
  const ingredient = String(
    item && item.item
      ? item.item
      : ""
  )
    .trim()
    .toUpperCase();

  if (
    ingredient === "CHERRY" ||
    ingredient === "SUGAR" ||
    ingredient === "STRAWBERRY"
  ) {
    return ingredient;
  }

  // デバッグ用プレビューや旧セーブデータは、完成済みの各商品に
  // 使っていた代表素材で安全に補完する。
  const kind = jdGetPosterHeroSpec(item).kind;
  if (kind === "cake") return "STRAWBERRY";
  if (kind === "coffee") return "SUGAR";
  return "CHERRY";
}

function jdDrawPosterSugarCube(
  x,
  y,
  sc = 1,
  alpha = 255
) {
  pushMatrix();
  translate(x, y);
  scale(sc);
  noStroke();

  fill(72, 47, 38, 20 * alpha / 255);
  rect(1, -2, 20, 18, 4);

  fill(246, 233, 207, 246 * alpha / 255);
  rect(0, 0, 19, 17, 4);

  fill(255, 246, 222, 34 * alpha / 255);
  rect(-4, 3, 5, 11, 2);
  popMatrix();
}

function jdDrawPosterTopping(
  item,
  x,
  y,
  sc = 1,
  alpha = 255
) {
  const topping = jdGetPosterToppingKind(item);
  const pose = jdNormalizePosterToppingPose(
    item && item.toppingPose
  );
  const preciseOffsetX = jdNormalizePosterToppingOffset(
    item && item.posterToppingOffsetX
  );
  const legacyPoseTransform = {
    left: { x: -4, y: 0, rotation: -12 },
    center: { x: 0, y: 0, rotation: 0 },
    right: { x: 4, y: 0, rotation: 12 }
  }[pose];
  const poseTransform = Number.isFinite(preciseOffsetX)
    ? {
        // 連続位置はcollection側で反映済み。ここでは向きだけを
        // ゆるく合わせ、同じ補正を二重に足さない。
        x: 0,
        y: 0,
        rotation: preciseOffsetX * 12
      }
    : legacyPoseTransform;

  pushMatrix();
  translate(
    x + poseTransform.x * sc,
    y + poseTransform.y * sc
  );
  rotate(poseTransform.rotation);

  if (topping === "SUGAR") {
    jdDrawPosterSugarCube(0, 0, sc, alpha);
    popMatrix();
    return;
  }

  if (topping === "STRAWBERRY") {
    jdDrawSmallStrawberry(0, 0, sc, alpha);
    popMatrix();
    return;
  }

  jdDrawCherryGarnish(0, 0, sc, alpha);
  popMatrix();
}

// 同じ商品へ入ったトッピングを、商品ごとの静物構図へ収める。
// 1個の時は実際の着地点を広めに反映し、複数時は左右順を合わせてから
// 整った間隔へ縮める。旧データは従来のposeだけで安全に描画する。
function jdGetPosterToppingLayout(kind, count) {
  const safeCount = jdClamp(Math.floor(count || 1), 1, 5);

  const layouts = {
    cake: [
      [{ x: 0, y: 98, sc: 1.18 }],
      [
        { x: -22, y: 97, sc: 0.98 },
        { x: 22, y: 100, sc: 0.98 }
      ],
      [
        { x: -30, y: 96, sc: 0.85 },
        { x: 0, y: 102, sc: 0.90 },
        { x: 30, y: 96, sc: 0.85 }
      ],
      [
        { x: -32, y: 95, sc: 0.78 },
        { x: -11, y: 102, sc: 0.80 },
        { x: 11, y: 102, sc: 0.80 },
        { x: 32, y: 95, sc: 0.78 }
      ],
      [
        { x: -34, y: 95, sc: 0.72 },
        { x: -17, y: 102, sc: 0.74 },
        { x: 0, y: 96, sc: 0.74 },
        { x: 17, y: 102, sc: 0.74 },
        { x: 34, y: 95, sc: 0.72 }
      ]
    ],
    coffee: [
      [{ x: 0, y: 52, sc: 0.92 }],
      [
        { x: -17, y: 51, sc: 0.76 },
        { x: 17, y: 53, sc: 0.76 }
      ],
      [
        { x: -24, y: 50, sc: 0.68 },
        { x: 0, y: 54, sc: 0.70 },
        { x: 24, y: 50, sc: 0.68 }
      ],
      [
        { x: -27, y: 49, sc: 0.60 },
        { x: -9, y: 54, sc: 0.62 },
        { x: 9, y: 54, sc: 0.62 },
        { x: 27, y: 49, sc: 0.60 }
      ],
      [
        { x: -28, y: 49, sc: 0.54 },
        { x: -14, y: 54, sc: 0.56 },
        { x: 0, y: 51, sc: 0.56 },
        { x: 14, y: 54, sc: 0.56 },
        { x: 28, y: 49, sc: 0.54 }
      ]
    ],
    melon: [
      [{ x: 0, y: 147, sc: 1.18 }],
      [
        { x: -20, y: 146, sc: 1.00 },
        { x: 10, y: 151, sc: 1.00 }
      ],
      [
        { x: -23, y: 144, sc: 0.86 },
        { x: 0, y: 151, sc: 0.92 },
        { x: 23, y: 144, sc: 0.86 }
      ],
      [
        { x: -25, y: 143, sc: 0.78 },
        { x: -8, y: 151, sc: 0.82 },
        { x: 9, y: 151, sc: 0.82 },
        { x: 25, y: 143, sc: 0.78 }
      ],
      [
        { x: -27, y: 143, sc: 0.72 },
        { x: -14, y: 151, sc: 0.76 },
        { x: 0, y: 145, sc: 0.76 },
        { x: 14, y: 151, sc: 0.76 },
        { x: 27, y: 143, sc: 0.72 }
      ]
    ]
  };

  const variants = layouts[kind] || layouts.melon;
  return variants[safeCount - 1];
}

function jdGetPosterToppingLandingShift(item, kind, count) {
  const offsetX = jdNormalizePosterToppingOffset(
    item && item.posterToppingOffsetX
  );
  const offsetY = jdNormalizePosterToppingOffset(
    item && item.posterToppingOffsetY
  );

  if (!Number.isFinite(offsetX) && !Number.isFinite(offsetY)) {
    return { x: 0, y: 0 };
  }

  const singleX = {
    cake: 26,
    coffee: 24,
    melon: 22
  }[kind] || 22;
  const vertical = {
    cake: 5,
    coffee: 3,
    melon: 9
  }[kind] || 4;

  return {
    // 複数時はlayoutで左右順を確保済みなので、微調整だけに留める。
    x: (Number.isFinite(offsetX) ? offsetX : 0) *
      (count === 1 ? singleX : 3),
    y: (Number.isFinite(offsetY) ? offsetY : 0) * vertical
  };
}

function jdDrawPosterToppingCollection(
  item,
  kind,
  alpha,
  offsetY = 0
) {
  const toppings = jdGetProductToppings(item).slice(0, 5);
  if (toppings.length === 0) return;

  // 新しいプレイ結果は全件に連続X位置があるため、左から右へ並べ直す。
  // 同値ならresultIndexで元の投入順を保つ。旧データは並べ替えない。
  const orderedToppings = toppings.slice();
  if (
    orderedToppings.length > 1 &&
    orderedToppings.every((topping) =>
      Number.isFinite(topping.posterToppingOffsetX)
    )
  ) {
    orderedToppings.sort((a, b) => {
      const difference =
        a.posterToppingOffsetX - b.posterToppingOffsetX;
      if (Math.abs(difference) > 0.0001) return difference;
      return (a.resultIndex || 0) - (b.resultIndex || 0);
    });
  }

  const layout = jdGetPosterToppingLayout(kind, toppings.length);

  for (let i = 0; i < orderedToppings.length; i += 1) {
    const position = layout[i];
    const landingShift = jdGetPosterToppingLandingShift(
      orderedToppings[i],
      kind,
      orderedToppings.length
    );
    jdDrawPosterTopping(
      orderedToppings[i],
      position.x + landingShift.x,
      position.y + landingShift.y + offsetY,
      position.sc,
      alpha
    );
  }
}

function jdDrawPosterHero(item, reveal, timer) {
  const spec = jdGetPosterHeroSpec(item);

  if (spec.kind === "failure") {
    jdDrawPosterFailureHero(item, reveal, timer);
    return;
  }

  if (spec.kind === "cake") {
    jdDrawPosterCakeHero(item, reveal, timer);
    return;
  }

  if (spec.kind === "coffee") {
    jdDrawPosterCoffeeHero(item, reveal, timer);
    return;
  }

  jdDrawPosterMelonSodaHero(item, reveal, timer);
}


function jdPosterEaseOutBack(t) {
  const x = jdClamp(t, 0, 1);
  const c1 = 1.18;
  const c3 = c1 + 1;

  return (
    1 +
    c3 * Math.pow(x - 1, 3) +
    c1 * Math.pow(x - 1, 2)
  );
}


// フォントを差し替えず、
// 字間・横幅・印刷の重なりでレトロな文字組みに寄せる。
function jdDrawPosterRetroJapanese(
  value,
  x,
  y,
  size,
  r,
  g,
  b,
  alpha = 255,
  language = null
) {
  const chars =
    Array.from(String(value || ""));

  const tracking =
    JD_POSTER_TITLE_TRACKING;

  const isEnglishText =
    language === null
      ? jdIsEnglish()
      : jdNormalizeLanguage(language) === "en";

  const glyphSize =
    isEnglishText
      ? size * 0.76
      : size;

  const advance =
    (
      isEnglishText
        ? glyphSize * 0.76
        : glyphSize
    ) +
    tracking;

  const scaleX =
    isEnglishText
      ? 1
      : JD_POSTER_TITLE_SCALE_X;

  pushMatrix();
  translate(x, y);
  scale(scaleX, 1);

  textAlign(LEFT);
  jdTitleFont("bold");
  fontSize(glyphSize);

  for (
    let i = 0;
    i < chars.length;
    i += 1
  ) {
    const cx =
      i * advance;

    if (isEnglishText) {
      fill(r, g, b, alpha);
      text(chars[i], cx, 0);

    } else {
      fill(
        r,
        g,
        b,
        alpha * 0.34
      );

      text(chars[i], cx - 1.15, 0);
      text(chars[i], cx + 1.15, 0);
      text(chars[i], cx, -0.45);
      text(chars[i], cx, 0.45);

      fill(r, g, b, alpha);
      text(chars[i], cx, 0);
    }
  }

  popMatrix();
}

function jdDrawPosterProductTitles(
  item,
  alpha = 255
) {
  const titleTopJp = String(
    item.titleTopJp ||
    item.titleTop ||
    ""
  );

  const titleMainJp = String(
    item.titleMainJp ||
    item.titleMain ||
    ""
  );

  const titleEnglish = String(
    item.titleEnglish ||
    [
      item.titleTopEn,
      item.titleMainEn
    ]
      .filter(Boolean)
      .join(" ")
  ).toUpperCase();

  jdDrawPosterRetroJapanese(
    titleTopJp,
    24,
    568,
    item.titleTopSize ||
      jdFitPosterTitleSize(
        titleTopJp,
        "jp"
      ),
    248,
    232,
    197,
    alpha,
    "jp"
  );

  jdDrawPosterRetroJapanese(
    titleMainJp,
    24,
    529,
    item.titleMainSize ||
      jdFitPosterTitleSize(
        titleMainJp,
        "jp"
      ),
    248,
    232,
    197,
    alpha,
    "jp"
  );

  if (titleEnglish) {
    textAlign(LEFT);
    jdPrimaryFont("bold");

    fontSize(
      item.titleEnglishSize ||
      jdFitPosterSubtitleSize(
        titleEnglish
      )
    );

    fill(
      248,
      232,
      197,
      alpha * 0.90
    );

    text(
      titleEnglish,
      28,
      JD_POSTER_SUBTITLE_Y
    );
  }
}



function jdPosterLerp(
  from,
  to,
  amount
) {
  return (
    from +
    (to - from) *
    jdClamp(amount, 0, 1)
  );
}


// =====================================================
// 全投失敗用ポスターヒーロー
// 商品を作り足さず、空皿・カトラリー・最後のトッピングだけを描く。
// FLOOR / OUT は同じ「皿の外」の構図で統一する。
// =====================================================

function jdDrawPosterFailureHero(
  item,
  reveal,
  timer
) {
  rectMode(CENTER);
  ellipseMode(CENTER);
  noStroke();

  const alpha = jdClamp(reveal, 0, 1);

  // 完成後も大きく揺らさない。印刷物のように静止させ、
  // 通常商品のポスターより少し乾いた余韻を残す。
  const stillY =
    JD.state === STATE_POSTER_HOLD
      ? Math.sin((timer || 0) * 0.42) * 0.16
      : 0;

  // 空皿の接地影。
  fill(34, 45, 41, 44 * alpha);
  ellipse(3, -8 + stillY, 180, 41);

  // 生成りの皿。中央には料理を置かず、二重の色面だけで
  // 「用意されたままの一皿」に見せる。
  fill(248, 232, 197, 247 * alpha);
  ellipse(0, 10 + stillY, 166, 58);

  fill(220, 202, 170, 92 * alpha);
  ellipse(0, 11 + stillY, 126, 38);

  fill(255, 246, 222, 74 * alpha);
  ellipse(-27, 23 + stillY, 69, 10);

  // 左のフォーク。皿の外側へ縦に添え、歯だけを上へ向ける。
  pushMatrix();
  translate(-104, 3 + stillY);
  rotate(-4);

  fill(34, 45, 41, 46 * alpha);
  rect(2, -6, 8, 74, 4);
  rect(2, 31, 24, 7, 3);

  fill(238, 224, 196, 244 * alpha);
  rect(0, -5, 5, 73, 3);
  rect(0, 31, 22, 5, 2);

  for (const dx of [-8, -3, 3, 8]) {
    rect(dx, 40, 2.3, 18, 1);
  }

  fill(255, 246, 222, 52 * alpha);
  rect(-1, -9, 1.4, 50, 1);
  popMatrix();

  // 右のスプーン。フォークと高さを揃え、視線を上下させない。
  pushMatrix();
  translate(104, 1 + stillY);
  rotate(5);

  fill(34, 45, 41, 46 * alpha);
  rect(2, -9, 8, 67, 4);
  ellipse(2, 31, 25, 31);

  fill(238, 224, 196, 244 * alpha);
  rect(0, -8, 5, 66, 3);
  ellipse(0, 31, 23, 29);

  fill(205, 188, 158, 82 * alpha);
  ellipse(0, 32, 14, 19);

  fill(255, 246, 222, 48 * alpha);
  rect(-1, -11, 1.4, 43, 1);
  popMatrix();

  // 最後に投げた素材を一つだけ皿の外へ残す。
  // 件数や失敗種別はレシートへ任せ、ポスターは静物として簡潔にする。
  jdDrawPosterTopping(
    item,
    78,
    -34 + stillY * 0.25,
    1.08,
    255 * alpha
  );

  noStroke();
  rectMode(CENTER);
}

// =====================================================
// ケーキ用ポスターヒーロー
// 皿・フォーク・ケーキを一つの静物としてまとめる。
// 線画を増やさず、スポンジ・クリーム・苺の色面で見せる。
// =====================================================

function jdDrawPosterCakeHero(
  item,
  reveal,
  timer
) {
  rectMode(CENTER);
  ellipseMode(CENTER);
  noStroke();

  const alpha =
    jdClamp(reveal, 0, 1);

  // ケーキ本体を少しだけ下げ、皿にちゃんと載っている印象へ寄せる。
  // Codea Lite 側では Y 正方向が上なので、値を少しマイナスする。
  const cakeOffsetY = -16;

  // 皿の下に、ごく薄い接地の色面を置く。
  fill(
    72,
    47,
    38,
    24 * alpha
  );
  ellipse(5, -4, 158, 25);

  fill(
    248,
    232,
    197,
    242 * alpha
  );
  ellipse(0, 1, 150, 30);

  fill(
    255,
    246,
    222,
    65 * alpha
  );
  ellipse(-23, 7, 73, 10);

  // フォークは皿の右側に置きつつ、先端だけをケーキ側へ向ける。
  // 外側へ向いていた歯を反転し、視線が中央へ戻るようにする。
  pushMatrix();
  translate(55, -14);
  rotate(-17);
  scale(-1, 1);

  fill(
    72,
    47,
    38,
    38 * alpha
  );
  rect(-4, -2, 73, 6, 3);
  ellipse(32, -2, 19, 12);

  fill(
    238,
    224,
    196,
    244 * alpha
  );
  rect(-5, 0, 72, 4, 2);
  ellipse(32, 0, 18, 11);

  // 歯は細い線ではなく、短い色面で揃える。
  for (const dx of [-5, 0, 5]) {
    rect(39 + dx, 5, 2.2, 10, 1);
  }
  popMatrix();

  // ケーキの接地影。
  fill(
    72,
    47,
    38,
    24 * alpha
  );
  ellipse(0, 18 + cakeOffsetY, 104, 15);

  // 下段スポンジ。
  fill(
    205,
    151,
    78,
    250 * alpha
  );
  rect(0, 39 + cakeOffsetY, 94, 37, 7);

  // 苺クリームの細い層。
  fill(
    205,
    83,
    101,
    224 * alpha
  );
  rect(0, 50 + cakeOffsetY, 94, 8, 3);

  // 中央クリーム。
  fill(
    246,
    229,
    199,
    255 * alpha
  );
  rect(0, 57 + cakeOffsetY, 94, 11, 4);

  // 上段スポンジ。
  fill(
    205,
    151,
    78,
    248 * alpha
  );
  rect(0, 72 + cakeOffsetY, 94, 23, 6);

  // 上部クリーム。
  fill(
    246,
    229,
    199,
    255 * alpha
  );
  rect(0, 88 + cakeOffsetY, 94, 12, 6);

  // 左上の返り光を一面だけ残す。
  fill(
    255,
    246,
    222,
    34 * alpha
  );
  rect(-38, 58 + cakeOffsetY, 7, 62, 4);

  // クリーム飾り。
  for (const dx of [-31, 0, 31]) {
    fill(
      246,
      229,
      199,
      255 * alpha
    );
    ellipse(dx, 99 + cakeOffsetY, 23, 18);

    fill(
      255,
      246,
      222,
      48 * alpha
    );
    ellipse(dx - 5, 103 + cakeOffsetY, 7, 4);
  }

  // 実際に投げ入れたトッピング。完成後だけごくわずかに呼吸させる。
  const toppingLift =
    JD.state === STATE_POSTER_HOLD
      ? Math.sin(timer * 0.66) * 0.45
      : 0;

  jdDrawPosterToppingCollection(
    item,
    "cake",
    255 * alpha,
    toppingLift
  );

  noStroke();
  rectMode(CENTER);
}


// =====================================================
// コーヒー用ポスターヒーロー
// ソーサー・カップ・スプーンを静かな静物としてまとめる。
// 砂糖は小さな立方体で添え、タイトルの「シュガー」を控えめに示す。
// =====================================================

function jdDrawPosterCoffeeHero(
  item,
  reveal,
  timer
) {
  rectMode(CENTER);
  ellipseMode(CENTER);
  noStroke();

  const alpha =
    jdClamp(reveal, 0, 1);

  const coffeeBob =
    JD.state === STATE_POSTER_HOLD
      ? Math.sin(timer * 0.54) * 0.32
      : 0;

  // 下げすぎではなく、カップ自体を少し縦長にして
  // 皿にきちんと載っている見え方を優先する。
  const cupOffsetY = -15;
  const cupBodyCenterY = 43 + cupOffsetY + coffeeBob;
  const cupBodyHeight = 50;
  const cupRimY = 64 + cupOffsetY + coffeeBob;
  const cupHandleY = 47 + cupOffsetY + coffeeBob;
  const cupContactShadowY = 14 + cupOffsetY;

  // ソーサーの落ち影。
  fill(
    45,
    31,
    25,
    24 * alpha
  );
  ellipse(6, -4, 148, 24);

  // ソーサー本体。
  fill(
    248,
    232,
    197,
    242 * alpha
  );
  ellipse(0, 1, 138, 28);

  fill(
    255,
    246,
    222,
    60 * alpha
  );
  ellipse(-20, 6, 64, 9);

  // カップが皿に落とす接地影。ソーサーの上、カップの下に描く。
  fill(
    52,
    35,
    28,
    20 * alpha
  );
  ellipse(2, cupContactShadowY, 88, 12);

  // カップ本体。上端位置は保ちつつ、下方向へ少しだけ伸ばす。
  fill(
    244,
    229,
    198,
    248 * alpha
  );
  rect(0, cupBodyCenterY, 82, cupBodyHeight, 12);

  fill(
    255,
    246,
    222,
    36 * alpha
  );
  rect(-25, cupBodyCenterY + 2, 8, 28, 3);

  // 取っ手。
  fill(
    244,
    229,
    198,
    244 * alpha
  );
  ellipse(47, cupHandleY, 21, 27);

  fill(
    97,
    69,
    58,
    228 * alpha
  );
  ellipse(47, cupHandleY, 10, 15);

  // 飲み口。
  fill(
    244,
    229,
    198,
    250 * alpha
  );
  ellipse(0, cupRimY, 88, 18);

  fill(
    60,
    34,
    23,
    252 * alpha
  );
  ellipse(0, cupRimY, 70, 11);

  fill(
    120,
    82,
    58,
    38 * alpha
  );
  ellipse(-12, cupRimY + 1, 24, 4);

  // 実際に入った左右位置を、コーヒーの液面幅へ縮めて反映する。
  // 飲み口より後に描き、中央へ入った素材もカップに隠れないようにする。
  jdDrawPosterToppingCollection(
    item,
    "coffee",
    255 * alpha,
    coffeeBob
  );

  // やわらかなスチーム。コーヒーの中央から上へ立ち上げる。
  for (let i = 0; i < 4; i += 1) {
    const sway =
      Math.sin(timer * 0.78 + i * 0.92) * (1.6 + i * 0.3);

    const rise = i * 13;
    const steamX = sway * 0.55;
    const steamY = 84 + cupOffsetY + rise + coffeeBob;

    fill(
      248,
      232,
      197,
      (24 - i * 4) * alpha
    );
    ellipse(
      steamX,
      steamY,
      16 + i * 4,
      8 + i * 3
    );

    fill(
      255,
      246,
      222,
      (9 - i) * alpha
    );
    ellipse(
      steamX - 1,
      steamY + 1,
      10 + i * 3,
      5 + i * 2
    );
  }


  // スプーンは小さめにし、凹みが皿側を向くよう配置する。
  // 最前面に置きたいため、全体の最後で描く。
  pushMatrix();
  translate(54, -8);
  rotate(-19);

  fill(
    72,
    47,
    38,
    32 * alpha
  );
  rect(0, -2, 58, 5, 3);
  ellipse(-25, -2, 16, 10);

  fill(
    238,
    224,
    196,
    240 * alpha
  );
  rect(0, 0, 57, 3.5, 2);
  ellipse(-26, 0, 15, 9);

  fill(
    255,
    246,
    222,
    54 * alpha
  );
  ellipse(-29, 1.5, 5.5, 2.5);
  popMatrix();

  noStroke();
  rectMode(CENTER);
}


function jdDrawPosterMelonSodaHero(
  item,
  reveal,
  timer
) {
  rectMode(CENTER);
  ellipseMode(CENTER);
  noStroke();

  // 大きなガラス皿。
  fill(
    72,
    47,
    38,
    27 * reveal
  );

  ellipse(
    4,
    -2,
    132,
    26
  );

  fill(
    248,
    232,
    197,
    236 * reveal
  );

  ellipse(
    0,
    3,
    124,
    27
  );

  fill(
    255,
    246,
    222,
    62 * reveal
  );

  ellipse(
    -18,
    8,
    62,
    9
  );

  // スプーン。枠線を使わず色面だけで描く。
  pushMatrix();
  translate(-38, -12);
  rotate(-17);

  fill(
    72,
    47,
    38,
    46 * reveal
  );
  rect(15, -2, 73, 6, 3);
  ellipse(-22, -2, 29, 14);

  fill(
    238,
    224,
    196,
    245 * reveal
  );
  rect(13, 0, 72, 4, 2);
  ellipse(-24, 0, 28, 13);

  fill(
    255,
    246,
    222,
    70 * reveal
  );
  ellipse(-28, 3, 12, 4);
  popMatrix();

  // グラスの足元と脚。
  fill(
    59,
    39,
    32,
    34 * reveal
  );
  ellipse(4, 9, 69, 12);

  fill(
    225,
    236,
    217,
    150 * reveal
  );
  ellipse(0, 13, 58, 14);
  rect(0, 34, 14, 43, 6);
  ellipse(0, 37, 36, 11);

  // グラス本体。
  fill(
    224,
    241,
    220,
    76 * reveal
  );
  rect(0, 91, 72, 122, 16);

  // メロンソーダ。
  fill(
    46,
    180,
    105,
    238 * reveal
  );
  rect(0, 87, 49, 91, 10);

  fill(
    105,
    219,
    145,
    96 * reveal
  );
  rect(-13, 89, 12, 76, 6);

  fill(
    111,
    225,
    151,
    170 * reveal
  );
  ellipse(0, 129, 48, 13);

  // ガラス面の明るい縁。
  fill(
    245,
    247,
    220,
    110 * reveal
  );
  rect(-32, 92, 5, 109, 3);

  fill(
    245,
    247,
    220,
    48 * reveal
  );
  rect(32, 92, 4, 105, 3);

  ellipse(
    0,
    150,
    68,
    19
  );

  // 氷。
  jdDrawIceCube(
    -12,
    103,
    18,
    -14,
    105 * reveal
  );

  jdDrawIceCube(
    9,
    79,
    18,
    12,
    92 * reveal
  );

  // 泡。完全静止にせず、スクショを邪魔しない程度に漂わせる。
  const bubbleLift =
    Math.sin(timer * 1.5) * 1.2;

  fill(
    248,
    244,
    208,
    184 * reveal
  );

  ellipse(
    -14,
    70 + bubbleLift,
    4,
    4
  );

  ellipse(
    13,
    101 - bubbleLift,
    3.5,
    3.5
  );

  ellipse(
    4,
    57 + bubbleLift * 0.5,
    2.8,
    2.8
  );

  // 完成後だけ、ガラスの返り光がほんの少し呼吸する。
  // 商品名や価格は動かさず、スクショの構図を崩さない。
  const holdGlow =
    JD.state === STATE_POSTER_HOLD
      ? 0.5 + 0.5 * Math.sin(timer * 0.72)
      : 0;

  fill(
    255,
    249,
    219,
    (12 + 12 * holdGlow) * reveal
  );

  rect(
    -26,
    98,
    3.2,
    66,
    2
  );

  // アイス。
  fill(
    255,
    242,
    203,
    255 * reveal
  );

  ellipse(
    0,
    132,
    51,
    36
  );

  fill(
    255,
    252,
    230,
    112 * reveal
  );

  ellipse(
    -11,
    140,
    18,
    8
  );

  // ストロー。
  stroke(
    122,
    43,
    38,
    230 * reveal
  );
  strokeWidth(2.4);

  line(
    6,
    98,
    31,
    206
  );

  noStroke();

  // 実際に投げ入れたトッピング。静止画として見える範囲を守りながら、
  // 完成後だけごく小さく揺らす。
  const toppingSway =
    JD.state === STATE_POSTER_HOLD
      ? Math.sin(timer * 0.58) * 0.45
      : 0;

  jdDrawPosterToppingCollection(
    item,
    "melon",
    255 * reveal,
    toppingSway
  );

  noStroke();
  rectMode(CENTER);
}


// =====================================================
// 完成ポスター → 喫茶店 → レシート
//
// ポスター撤収直後の近景から、レシートで使う遠景へ
// 同じ店内背景を保ったままカメラを引く。
// =====================================================

function jdDrawReceiptCafeBackdrop(camera, shadeT = 1) {
  const W = JD.LOGICAL_W;
  const H = JD.LOGICAL_H;
  const shade = jdClamp(shadeT, 0, 1);

  const cameraX =
    camera && Number.isFinite(camera.x)
      ? camera.x
      : 515;

  const cameraY =
    camera && Number.isFinite(camera.y)
      ? camera.y
      : 285;

  const cameraZoom =
    camera && Number.isFinite(camera.zoom)
      ? camera.zoom
      : 0.445;

  const cameraScreenX =
    camera && Number.isFinite(camera.screenX)
      ? camera.screenX
      : W / 2;

  const cameraScreenY =
    camera && Number.isFinite(camera.screenY)
      ? camera.screenY
      : 284;

  rectMode(CORNER);
  ellipseMode(CENTER);
  noStroke();

  // カメラ外周も余分に塗り、ズーム中の端欠けを防ぐ。
  fill(31, 23, 20);
  rect(-80, -80, W + 160, H + 160);

  pushMatrix();

  translate(
    cameraScreenX,
    cameraScreenY
  );

  scale(cameraZoom);

  translate(
    -cameraX,
    -cameraY
  );

  jdDrawCafeWideBackdrop();
  jdDrawWorld();

  popMatrix();

  // レシート画面で使う暗幕と淡い照明を、カメラ移動の終盤で先に重ねる。
  // レシート状態へ切り替わった最初のフレームと完全に一致する。
  fill(
    55,
    37,
    28,
    70 * shade
  );

  rect(
    -80,
    -80,
    W + 160,
    H + 160
  );

  jdFill(
    "creamWarm",
    15 * shade
  );

  ellipse(
    W / 2,
    360,
    286,
    450
  );
}


function jdDrawPosterCafeHold() {
  const duration =
    Number.isFinite(JD.posterCafeHoldDuration)
      ? Math.max(0.001, JD.posterCafeHoldDuration)
      : 0.56;

  const raw = jdClamp(
    (JD.posterCafeHoldTimer || 0) / duration,
    0,
    1
  );

  // 始点と終点の速度を落とし、近景から遠景へ穏やかに引く。
  const t = raw * raw * (3 - 2 * raw);

  const start =
    JD.posterCafeHoldStartCamera || {
      x: Number.isFinite(JD.cam.x) ? JD.cam.x : 515,
      y: Number.isFinite(JD.cam.y) ? JD.cam.y : 285,
      zoom: Number.isFinite(JD.cam.zoom) ? JD.cam.zoom : 0.445,
      screenX: Number.isFinite(JD.camScreenX)
        ? JD.camScreenX
        : JD.LOGICAL_W / 2,
      screenY: Number.isFinite(JD.camScreenY)
        ? JD.camScreenY
        : 284
    };

  // レシート画面のbackdropT=0と同じカメラ。
  const target = {
    x: 515,
    y: 285,
    zoom: 0.445,
    screenX: JD.LOGICAL_W / 2,
    screenY: 284
  };

  const camera = {
    x: jdPosterLerp(start.x, target.x, t),
    y: jdPosterLerp(start.y, target.y, t),
    zoom: jdPosterLerp(start.zoom, target.zoom, t),
    screenX: jdPosterLerp(start.screenX, target.screenX, t),
    screenY: jdPosterLerp(start.screenY, target.screenY, t)
  };

  // 暗幕はカメラ移動の後半だけで立ち上げる。
  const shadeRaw = jdClamp((raw - 0.52) / 0.48, 0, 1);
  const shadeT = shadeRaw * shadeRaw * (3 - 2 * shadeRaw);

  jdDrawReceiptCafeBackdrop(
    camera,
    shadeT
  );
}



function jdSplitReceiptMemoText(text) {
  const memo =
    String(text || "");

  // 以前より少し広めに取り、句点だけが二行目に残るのを避ける。
  const maxChars =
    jdIsEnglish()
      ? 34
      : 20;

  if (
    memo.length <= maxChars
  ) {
    return [
      memo,
      ""
    ];
  }

  let breakAt =
    maxChars;

  const lineStartAvoid =
    "。、，．！？!?）」』】》〉）]";

  while (
    breakAt < memo.length &&
    breakAt < maxChars + 4 &&
    lineStartAvoid.indexOf(
      memo.charAt(breakAt)
    ) >= 0
  ) {
    breakAt += 1;
  }

  const restLength =
    memo.length -
    breakAt;

  if (
    restLength > 0 &&
    restLength <= 2 &&
    memo.length <= maxChars + 4
  ) {
    return [
      memo,
      ""
    ];
  }

  const line1 =
    memo.slice(
      0,
      breakAt
    );

  const line2 =
    memo.slice(
      breakAt
    );

  if (
    /^[。、，．！？!?]+$/.test(line2)
  ) {
    return [
      memo,
      ""
    ];
  }

  return [
    line1,
    line2
  ];
}


// 商品数・失敗記録・店長メモの行数から、レシートの下端を決める。
// 上端を固定することで、落下演出とヘッダーの視線位置は変えない。
function jdGetReceiptPaperMetrics(
  receiptLayout = jdGetReceiptLayout()
) {
  const menuEntries = Array.isArray(receiptLayout.menuEntries)
    ? receiptLayout.menuEntries
    : [];

  const lossLines = Array.isArray(receiptLayout.lossLines)
    ? receiptLayout.lossLines
    : [];

  const paperTop = 520;
  const resultStartY = paperTop - 108;
  const resultGap = 14.5;

  const listBottomY =
    resultStartY -
    menuEntries.length * resultGap +
    4;

  const lossStartY = listBottomY - 29;

  const rankLineY = lossLines.length > 0
    ? lossStartY - lossLines.length * 12 - 10
    : listBottomY - 28;

  const memoLineY = rankLineY - 25;
  const memoLines =
    jdSplitReceiptMemoText(
      jdManagerCommentShort() || "-"
    );
  const memoLine1 =
    memoLines[0] || "";
  const memoLine2 =
    memoLines[1] || "";

  // 二行メモの時だけ一行分を追加し、余白だけが残らないようにする。
  const footerDashY =
    memoLineY -
    (memoLine2 ? 56 : 43);

  const footerBrandY = footerDashY - 28;
  const desiredPaperBottom = footerBrandY - 15;

  // 現在の最大3商品＋2種類の失敗記録を収めつつ、
  // 将来行が増えても再プレイボタンへ重ならない範囲に制限する。
  const paperH = Math.max(
    260,
    Math.min(
      370,
      paperTop - desiredPaperBottom
    )
  );

  return {
    paperTop,
    paperH,
    paperY: paperTop - paperH,
    resultStartY,
    resultGap,
    listBottomY,
    lossStartY,
    rankLineY,
    memoLineY,
    footerDashY,
    memoLine1,
    memoLine2
  };
}


function jdDrawReceipt() {
  rectMode(CORNER);
  ellipseMode(CENTER);
  noStroke();

  const cx =
    JD.LOGICAL_W / 2;

  // ==================================================
  // 結果画面の演出時間
  // ==================================================

  // 背景がわずかに引いて、静止画の構図へ収まる
  const backdropT =
    jdClamp(
      JD.receiptTimer /
      (
        JD.motion &&
        Number.isFinite(
          JD.motion.receiptBackdrop
        )
          ? JD.motion.receiptBackdrop
          : 0.78
      ),
      0,
      1
    );

  const backdropEase =
    1 -
    Math.pow(
      1 - backdropT,
      3
    );

  const receiptMotion =
    jdGetReceiptMotionTiming();

  // レシートは上から置かれる
  const receiptT =
    jdClamp(
      (
        JD.receiptTimer -
        receiptMotion.dropDelay
      ) /
      receiptMotion.dropDuration,
      0,
      1
    );

  // 少しだけ行き過ぎて戻る、控えめな着地
  const receiptEase =
    1 +
    2.7 *
    Math.pow(
      receiptT - 1,
      3
    ) +
    1.7 *
    Math.pow(
      receiptT - 1,
      2
    );

  const receiptOffsetY =
    34 *
    (
      1 -
      receiptEase
    );

  // レシートは上から置かれたあとは動かさない。
  // 印字中も紙本体は完全に静止させる。

  // ==================================================
  // ローカル関数：レシートの破線
  // ==================================================

  function drawReceiptDash(
    paperX,
    paperW,
    y,
    alpha = 88
  ) {
    jdFill(
      "ink",
      alpha
    );

    for (
      let x = paperX + 9;
      x < paperX + paperW - 9;
      x += 7
    ) {
      rect(
        x,
        y,
        4,
        1
      );
    }
  }

  // ==================================================
  // ローカル関数：上下がギザギザの感熱紙
  // ==================================================

  function drawZigzagPaper(
    x,
    y,
    w,
    h,
    fillKey,
    alpha = 255,
    offsetX = 0,
    offsetY = 0
  ) {
    const toothW = 10;
    const diamondSize = 7.2;

    const left =
      x + offsetX;

    const bottom =
      y + offsetY;

    const right =
      left + w;

    const top =
      bottom + h;

    noStroke();
    jdFill(
      fillKey,
      alpha
    );

    // 紙の中央部分
    rect(
      left,
      bottom + 4,
      w,
      h - 8
    );

    // ギザギザとの接続帯
    rect(
      left,
      bottom + 3,
      w,
      5
    );

    rect(
      left,
      top - 8,
      w,
      5
    );

    rectMode(CENTER);

    // 下端：
    // triangleを使わず、45度回転した小さな正方形で
    // 感熱紙の切り口を作る
    for (
      let px = left + toothW / 2;
      px < right;
      px += toothW
    ) {
      pushMatrix();

      translate(
        px,
        bottom + 3.5
      );

      rotate(
        Math.PI / 4
      );

      rect(
        0,
        0,
        diamondSize,
        diamondSize
      );

      popMatrix();
    }

    // 上端
    for (
      let px = left + toothW / 2;
      px < right;
      px += toothW
    ) {
      pushMatrix();

      translate(
        px,
        top - 3.5
      );

      rotate(
        Math.PI / 4
      );

      rect(
        0,
        0,
        diamondSize,
        diamondSize
      );

      popMatrix();
    }

    rectMode(CORNER);
  }

  // ==================================================
  // 背景：ゲーム中の純喫茶
  // ==================================================

  // 撤収後のカメラ移動が到着した位置から、
  // さらにごくわずかに引いてレシート用の静かな全景へ収める。
  const receiptBackdropZoom =
    0.445 +
    (
      0.42 -
      0.445
    ) * backdropEase;

  const receiptBackdropY =
    284 +
    (
      292 -
      284
    ) * backdropEase;

  jdDrawReceiptCafeBackdrop(
    {
      x: 515,
      y: 285,
      zoom: receiptBackdropZoom,
      screenX: JD.LOGICAL_W / 2,
      screenY: receiptBackdropY
    },
    1
  );

  // ==================================================
  // レシート本体
  // 上からすっと置かれるレイヤー
  // ==================================================

  pushMatrix();

  translate(
    0,
    receiptOffsetY
  );

  const receiptLayout = jdGetReceiptLayout();
  const menuEntries = receiptLayout.menuEntries;
  const lossLines = receiptLayout.lossLines;
  const resultDelay = receiptLayout.resultDelay;
  const resultInterval = receiptLayout.resultInterval;
  const totalAt = receiptLayout.totalAt;
  const lossDelay = receiptLayout.lossDelay;
  const lossInterval = receiptLayout.lossInterval;
  const rankAt = receiptLayout.rankAt;
  const memoAt = receiptLayout.memoAt;
  const readyAt = receiptLayout.readyAt;

  const receiptPaper =
    jdGetReceiptPaperMetrics(receiptLayout);

  const paperW = 210;
  const paperH = receiptPaper.paperH;

  const paperX =
    cx - paperW / 2;

  const paperY = receiptPaper.paperY;

  const paperTop = receiptPaper.paperTop;
  const resultStartY = receiptPaper.resultStartY;
  const resultGap = receiptPaper.resultGap;
  const listBottomY = receiptPaper.listBottomY;
  const lossStartY = receiptPaper.lossStartY;
  const rankLineY = receiptPaper.rankLineY;
  const memoLineY = receiptPaper.memoLineY;
  const footerDashY = receiptPaper.footerDashY;
  const memoLine1 = receiptPaper.memoLine1;
  const memoLine2 = receiptPaper.memoLine2;

  // 同じギザギザ形状の影
  drawZigzagPaper(
    paperX,
    paperY,
    paperW,
    paperH,
    "shadow",
    48,
    5,
    -5
  );

  // 感熱紙
  drawZigzagPaper(
    paperX,
    paperY,
    paperW,
    paperH,
    "paper",
    255
  );

  // 紙端のわずかな陰
  jdFill(
    "wallShade",
    24
  );

  rect(
    paperX + paperW - 3,
    paperY + 8,
    3,
    paperH - 16
  );

  jdFill(
    "highlight",
    26
  );

  rect(
    paperX + 3,
    paperY + 8,
    2,
    paperH - 16
  );

  // ==================================================
  // 日付
  // ==================================================

  let dateText =
    "20XX/XX/XX 00:00";

  try {
    const now =
      new Date();

    const yyyy =
      String(
        now.getFullYear()
      );

    const mm =
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const dd =
      String(
        now.getDate()
      ).padStart(
        2,
        "0"
      );

    const cafeTime =
      jdGetCafeTimeParts();

    const hh =
      String(
        cafeTime.hour
      ).padStart(
        2,
        "0"
      );

    const min =
      String(
        cafeTime.minute
      ).padStart(
        2,
        "0"
      );

    dateText =
      `${yyyy}/${mm}/${dd} ${hh}:${min}`;

  } catch (_error) {
    // 日付取得に失敗した場合は初期値
  }

  const receiptNo =
    String(
      Math.max(
        1,
        JD.results.length
      )
    ).padStart(
      3,
      "0"
    );

  // ==================================================
  // ヘッダー
  // ==================================================

  const receiptType = JD.typeScale || {
    receiptShop: 13.5,
    receiptBrand: 9.5,
    receiptItem: 9.5,
    receiptMeta: 9.5,
    receiptTotal: 15,
    receiptFooter: 7.5
  };

  textAlign(CENTER);

  jdFill(
    "ink",
    245
  );

  jdTitleFont("bold");

  fontSize(receiptType.receiptShop);

  text(
    jdT(
      "receipt.shop",
      "JUNKISSA DIVE"
    ),
    cx,
    paperTop - 17
  );

  // 日本語版だけ、店名の下へ英字ロゴを添える。
  // 英語版は同じ文字を重ねず、一行の店名として見せる。
  if (!jdIsEnglish()) {
    jdReceiptFont("bold");
    fontSize(receiptType.receiptBrand);
    text("JUNKISSA DIVE", cx, paperTop - 33);
  }

  drawReceiptDash(
    paperX,
    paperW,
    paperTop - 47
  );

  // 日付はレシート右端へ。下段のシフト名と伝票番号は
  // 同じ文字サイズで左右にそろえる。
  textAlign(RIGHT);

  jdFill(
    "ink",
    215
  );

  jdReceiptFont();

  fontSize(receiptType.receiptMeta);

  text(
    dateText,
    paperX + paperW - 9,
    paperTop - 69
  );

  textAlign(LEFT);
  jdReceiptLocalizedFont();
  fontSize(receiptType.receiptMeta);

  text(
    jdT("receipt.shift", "MONDAY SHIFT"),
    paperX + 9,
    paperTop - 83
  );

  textAlign(RIGHT);

  jdReceiptFont();
  fontSize(receiptType.receiptMeta);

  text(
    `No.${receiptNo}`,
    paperX + paperW - 9,
    paperTop - 83
  );

  drawReceiptDash(
    paperX,
    paperW,
    paperTop - 92
  );

  // ==================================================
  // 商品一覧
  // ==================================================

  for (
    let i = 0;
    i < menuEntries.length;
    i++
  ) {
    const appearAt =
      resultDelay +
      i * resultInterval;

    if (
      JD.receiptTimer <
      appearAt
    ) {
      continue;
    }

    const r = menuEntries[i];

    const y =
      resultStartY -
      i * resultGap;

    const menuName =
      jdGetCompletedProductMenuName(
        r
      );

    const itemText = menuName;

    // 長い正式名を縮める場合も、番号・品名・金額を同じ大きさにする。
    const rowFontSize =
      itemText.length > 18
        ? receiptType.receiptItem - 1
        : receiptType.receiptItem;

    // 番号
    textAlign(LEFT);

    jdFill(
      "ink",
      182
    );

    jdReceiptFont();

    fontSize(rowFontSize);

    text(
      String(
        i + 1
      ).padStart(
        2,
        "0"
      ),
      paperX + 9,
      y
    );

    // ポスターと同じ正式な商品名だけを、レシートの品目として並べる。
    jdFill(
      "ink",
      240
    );

    jdFontForLanguage("bold");
    fontSize(rowFontSize);

    text(
      itemText,
      paperX + 26,
      y
    );

    // 金額
    textAlign(RIGHT);

    jdReceiptFont("bold");

    fontSize(rowFontSize);

    text(
      String(
        r.price || 0
      ),
      paperX + paperW - 9,
      y
    );
  }

  // ==================================================
  // 合計
  // ==================================================

  if (
    JD.receiptTimer >=
    totalAt
  ) {
    drawReceiptDash(
      paperX,
      paperW,
      listBottomY,
      100
    );

    const totalText =
      String(
        JD.totalSales
      ).replace(
        /\B(?=(\d{3})+(?!\d))/g,
        ","
      );

    const totalY =
      listBottomY - 16;

    textAlign(LEFT);

    jdFill(
      "ink",
      242
    );

    jdReceiptLocalizedFont("bold");

    fontSize(receiptType.receiptTotal);

    text(
      jdT(
        "receipt.total",
        "TOTAL"
      ),
      paperX + 9,
      totalY
    );

    textAlign(RIGHT);

    jdFill(
      "redDeep",
      248
    );

    jdReceiptFont("bold");

    fontSize(receiptType.receiptTotal);

    text(
      `¥${totalText}`,
      paperX + paperW - 9,
      totalY
    );
  }

  // ==================================================
  // 合計直後の小さな失敗記録
  // ==================================================

  for (
    let i = 0;
    i < lossLines.length;
    i++
  ) {
    const appearAt =
      lossDelay +
      i * lossInterval;

    if (JD.receiptTimer < appearAt) continue;

    textAlign(LEFT);
    jdFill("ink", 160);
    jdFontForLanguage();
    fontSize(receiptType.receiptMeta);
    text(
      lossLines[i],
      paperX + 9,
      lossStartY - i * 12
    );
  }

  // ==================================================
  // ランク
  // ==================================================

  if (
    JD.receiptTimer >=
    rankAt
  ) {
    drawReceiptDash(
      paperX,
      paperW,
      rankLineY,
      84
    );

    textAlign(LEFT);

    jdFill(
      "ink",
      180
    );

    jdReceiptLocalizedFont();

    fontSize(receiptType.receiptMeta);

    text(
      jdT(
        "receipt.rank",
        "RANK"
      ),
      paperX + 9,
      rankLineY - 12
    );

    textAlign(RIGHT);

    jdFill(
      "redDeep",
      228
    );

    jdReceiptLocalizedFont("bold");

    fontSize(receiptType.receiptMeta);

    text(
      jdRankName(),
      paperX + paperW - 9,
      rankLineY - 12
    );
  }

  // ==================================================
  // 店長メモ
  // ==================================================

  if (
    JD.receiptTimer >=
    memoAt
  ) {
    drawReceiptDash(
      paperX,
      paperW,
      memoLineY,
      78
    );

    textAlign(LEFT);

    jdFill(
      "ink",
      180
    );

    jdFontForLanguage();

    fontSize(receiptType.receiptMeta);

    text(
      jdT("receipt.memo", "MANAGER MEMO"),
      paperX + 9,
      memoLineY - 11
    );

    jdFill(
      "ink",
      220
    );

    jdFontForLanguage();

    fontSize(receiptType.receiptMeta);

    text(
      memoLine1,
      paperX + 9,
      memoLineY - 25
    );

    if (
      memoLine2
    ) {
      text(
        memoLine2,
        paperX + 9,
        memoLineY - 38
      );
    }
  }

  // ==================================================
  // フッター
  // ==================================================

  if (
    JD.receiptTimer >=
    readyAt
  ) {
    drawReceiptDash(
      paperX,
      paperW,
      footerDashY,
      70
    );

    textAlign(CENTER);

    jdFill(
      "ink",
      175
    );

    jdFontForLanguage();

    fontSize(receiptType.receiptMeta);

    text(
      jdT("receipt.thanks", "THANK YOU"),
      cx,
      footerDashY - 15
    );

    jdReceiptFont();
    fontSize(receiptType.receiptFooter);

    text(
      "JUNKISSA DIVE",
      cx,
      footerDashY - 28
    );
  }

  // ==================================================
  // 感熱プリンターの印字走査線
  // 現在表示された行だけを一瞬なぞる
  // ==================================================

  let printLineY =
    null;

  let printLineAge =
    1;

  // 商品行
  for (
    let i = 0;
    i < menuEntries.length;
    i++
  ) {
    const lineAt =
      resultDelay +
      i *
      resultInterval;

    const age =
      JD.receiptTimer -
      lineAt;

    if (
      age >= 0 &&
      age < 0.13
    ) {
      printLineY =
        resultStartY -
        i *
        resultGap -
        2;

      printLineAge =
        age /
        0.13;
    }
  }

  // 合計直後の失敗記録
  for (
    let i = 0;
    i < lossLines.length;
    i++
  ) {
    const lineAt =
      lossDelay +
      i * lossInterval;
    const age =
      JD.receiptTimer -
      lineAt;

    if (age >= 0 && age < 0.13) {
      printLineY =
        lossStartY -
        i * 12 -
        2;
      printLineAge = age / 0.13;
    }
  }

  // 合計
  if (
    JD.receiptTimer >=
      totalAt &&
    JD.receiptTimer <
      totalAt +
      0.13
  ) {
    printLineY =
      listBottomY -
      18;

    printLineAge =
      (
        JD.receiptTimer -
        totalAt
      ) /
      0.13;
  }

  // ランク
  if (
    JD.receiptTimer >=
      rankAt &&
    JD.receiptTimer <
      rankAt +
      0.13
  ) {
    printLineY =
      rankLineY -
      14;

    printLineAge =
      (
        JD.receiptTimer -
        rankAt
      ) /
      0.13;
  }

  // 店長メモ
  if (
    JD.receiptTimer >=
      memoAt &&
    JD.receiptTimer <
      memoAt +
      0.13
  ) {
    printLineY =
      memoLineY -
      27;

    printLineAge =
      (
        JD.receiptTimer -
        memoAt
      ) /
      0.13;
  }

  // THANK YOU
  if (
    JD.receiptTimer >=
      readyAt &&
    JD.receiptTimer <
      readyAt +
      0.15
  ) {
    printLineY =
      footerDashY -
      16;

    printLineAge =
      (
        JD.receiptTimer -
        readyAt
      ) /
      0.15;
  }

  if (
    Number.isFinite(
      printLineY
    )
  ) {
    const lineAlpha =
      1 -
      jdClamp(
        printLineAge,
        0,
        1
      );

    rectMode(CORNER);
    noStroke();

    // 印字直下の薄い影
    jdFill(
      "ink",
      42 *
      lineAlpha
    );

    rect(
      paperX + 8,
      printLineY - 1,
      paperW - 16,
      2
    );

    // 感熱ヘッドの反射
    jdFill(
      "highlight",
      54 *
      lineAlpha
    );

    rect(
      paperX + 12,
      printLineY + 1,
      paperW - 24,
      1
    );
  }

  // レシート本体の移動レイヤーを終了
  popMatrix();

  // ==================================================
  // 再プレイボタン
  // 印字が終わったあと、少し遅れて現れる
  // ==================================================

  if (
    jdReceiptReady()
  ) {
    const bx = cx;
    const by = 91;
    const bw = 214;
    const bh = 38;

    // 印字完了後、0.28秒かけて控えめに現れる
    const buttonT =
      jdClamp(
        (
          JD.receiptTimer -
          (
            readyAt +
            (
              JD.motion &&
              Number.isFinite(
                JD.motion.receiptButtonDelay
              )
                ? JD.motion.receiptButtonDelay
                : 0.78
            )
          )
        ) /
        (
          JD.motion &&
          Number.isFinite(
            JD.motion.short
          )
            ? JD.motion.short
            : 0.46
        ),
        0,
        1
      );

    const buttonEase =
      1 -
      Math.pow(
        1 - buttonT,
        3
      );

    const buttonScale =
      0.90 +
      0.10 *
      buttonEase;

    const buttonAlpha =
      40 +
      202 *
      buttonEase;

    rectMode(CENTER);

    pushMatrix();

    translate(
      bx,
      by
    );

    scale(
      buttonScale
    );

    const pulse =
      buttonAlpha +
      Math.sin(
        ElapsedTime * 4.2
      ) *
      18 *
      buttonEase;

    // 影
    jdFill(
      "shadow",
      34 * buttonEase
    );

    rect(
      4,
      -4,
      bw,
      bh,
      6
    );

    // 紙
    jdFill(
      "paper",
      242 * buttonEase
    );

    rect(
      0,
      0,
      bw,
      bh,
      6
    );

    // 外枠
    noFill();

    jdStroke(
      "redDeep",
      pulse
    );

    strokeWidth(2);

    rect(
      0,
      0,
      bw - 8,
      bh - 8,
      4
    );

    noStroke();

    // テキスト
    jdFill(
      "redDeep",
      pulse
    );

    textAlign(CENTER);

    jdFontForLanguage("bold");

    fontSize(12);

    text(
      jdT(
        "receipt.oneMore",
        "ONE MORE SHIFT"
      ),
      0,
      1
    );

    popMatrix();

    rectMode(CORNER);
  }
}








function jdUpdateReceipt(dt) {
  const previous =
    JD.receiptTimer || 0;

  JD.receiptTimer =
    previous + dt;

  const receiptLayout = jdGetReceiptLayout();
  const resultDelay = receiptLayout.resultDelay;
  const resultInterval = receiptLayout.resultInterval;
  const resultCount = receiptLayout.menuEntries.length;
  const receiptMotion = jdGetReceiptMotionTiming();

  // レシートが出始める瞬間。
  // ポスターめくり音とは別に、紙が送られる気配だけを薄く足す。
  const feedStartAt = 0.055;

  if (
    previous < feedStartAt &&
    JD.receiptTimer >= feedStartAt
  ) {
    jdPlaySound(
      "receipt_feed_start"
    );
  }

  // レシートが着地する瞬間
  const dropAt = receiptMotion.dropAt;

  if (
    previous < dropAt &&
    JD.receiptTimer >= dropAt
  ) {
    jdPlaySound(
      "receipt_drop"
    );
  }

  // レシートが定位置に収まる余韻。
  // drop音と重ねすぎないよう、少しだけ後ろに置く。
  const settleAt =
    dropAt +
    0.13;

  if (
    previous < settleAt &&
    JD.receiptTimer >= settleAt
  ) {
    jdPlaySound(
      "receipt_settle"
    );
  }

  // 各商品行
  for (
    let i = 0;
    i < resultCount;
    i++
  ) {
    const lineAt =
      resultDelay +
      i *
      resultInterval;

    if (
      previous < lineAt &&
      JD.receiptTimer >= lineAt
    ) {
      jdPlaySound(
        "receipt_print"
      );
    }
  }

  const totalAt = receiptLayout.totalAt;
  const lossDelay = receiptLayout.lossDelay;
  const lossInterval = receiptLayout.lossInterval;
  const lossCount = receiptLayout.lossLines.length;
  const rankAt = receiptLayout.rankAt;
  const memoAt = receiptLayout.memoAt;
  const thankYouAt = receiptLayout.readyAt;

  for (let i = 0; i < lossCount; i++) {
    const lineAt = lossDelay + i * lossInterval;
    if (previous < lineAt && JD.receiptTimer >= lineAt) {
      jdPlaySound("receipt_print");
    }
  }

  const buttonDelay =
    JD.motion &&
    Number.isFinite(
      JD.motion.receiptButtonDelay
    )
      ? JD.motion.receiptButtonDelay
      : 0.78;

  const buttonAt =
    thankYouAt +
    buttonDelay;

  // 合計は通常印字、ランクと店長メモは少しだけ音色を分ける。
  if (
    previous < totalAt &&
    JD.receiptTimer >= totalAt
  ) {
    jdPlaySound(
      "receipt_print"
    );
  }

  if (
    previous < rankAt &&
    JD.receiptTimer >= rankAt
  ) {
    jdPlaySound(
      "receipt_rank"
    );
  }

  const rankBadgeAt =
    rankAt +
    0.13;

  if (
    previous < rankBadgeAt &&
    JD.receiptTimer >= rankBadgeAt
  ) {
    jdPlaySound(
      "receipt_rank_badge"
    );
  }

  if (
    previous < memoAt &&
    JD.receiptTimer >= memoAt
  ) {
    jdPlaySound(
      "manager_memo"
    );
  }

  if (
    previous < thankYouAt &&
    JD.receiptTimer >= thankYouAt
  ) {
    jdPlaySound(
      "receipt_finish"
    );
  }

  if (
    previous < buttonAt &&
    JD.receiptTimer >= buttonAt
  ) {
    jdPlaySound(
      "button_ready"
    );
  }
}

function jdReceiptReady() {
  const receiptLayout = jdGetReceiptLayout();
  const thankYouAt = receiptLayout.readyAt;

  const buttonDelay =
    JD.motion &&
    Number.isFinite(
      JD.motion.receiptButtonDelay
    )
      ? JD.motion.receiptButtonDelay
      : 0.78;

  return (
    JD.receiptTimer >=
    thankYouAt +
    buttonDelay
  );
}




function jdMakeReceiptLines() {
  const lines = [];
  const menuEntries = jdGetReceiptMenuEntries();
  const lossLines = jdGetReceiptLossLines();
  lines.push(jdT("receipt.shop"));
  lines.push(jdT("receipt.title"));
  lines.push("------------------------");
  for (let i = 0; i < menuEntries.length; i++) {
    const r = menuEntries[i];
    const menuName = jdGetCompletedProductMenuName(
      r,
      r.name || "KIMAGURE MENU"
    );
    lines.push(`${i + 1} ${menuName}  ${r.price || 0}Y`);
  }
  lines.push("------------------------");
  lines.push(`${jdT("receipt.total")}        ${JD.totalSales}Y`);
  for (const lossLine of lossLines) {
    lines.push(lossLine);
  }
  lines.push("");
  lines.push(jdT("receipt.rank"));
  lines.push(jdRankName());
  lines.push("");
  lines.push(jdT("receipt.tencho"));
  lines.push(jdManagerCommentShort());
  return lines;
}

function jdRankName() {
  let successCount = 0;

  for (const r of JD.results) {
    if (jdIsScoredCompletion(r)) {
      successCount += 1;
    }
  }

  if (successCount >= 5) {
    return jdT("rank.legendary");
  }

  if (successCount === 4) {
    return jdT("rank.excellent");
  }

  if (successCount === 3) {
    return jdT("rank.good");
  }

  if (successCount === 2) {
    return jdT("rank.fair");
  }

  if (successCount === 1) {
    return jdT("rank.oneJob");
  }

  return jdT("rank.tomorrow");
}

const JD_MANAGER_MEMO_POOLS = {
  perfect: [
    { jp: "今日は完全にブレない日だな。", en: "Nothing wavered today." },
    { jp: "迷いがない。そんな日はだいたい強い。", en: "No hesitation. Days like that are strong." },
    { jp: "ど真ん中に来る日ってあるんだな。", en: "Some days land right in the middle." },
    { jp: "今日は狙ったところに届く日だな。", en: "Today reached where it aimed." },
    { jp: "今日はバシッと決まってるな。", en: "That locked in nicely today." },
    { jp: "今日は芯を食ってたな。", en: "Today hit the core." }
  ],

  bounce: [
    { jp: "一度跳ねたものが、あとで効いてくる。", en: "One bounce can matter later." },
    { jp: "まっすぐじゃなくても、届く時は届くんだな。", en: "Straight is not the only way to land." },
    { jp: "遠回りしたわりに、いい場所へ行ったな。", en: "That detour found a good spot." },
    { jp: "跳ねた分だけ、味が出たってことにしとくか。", en: "Let’s call that bounce extra flavor." },
    { jp: "予定外のほうが、案外良い日もある。", en: "Unplanned can turn out fine." },
    { jp: "一回ぶつかってからが本番だったな。", en: "It really started after the bump." }
  ],

  dive: [
    { jp: "飛び込んでみるってのも、いいもんだな。", en: "Diving in is not so bad." },
    { jp: "深く入ったな。今日はそれで正解だった。", en: "It went deep. Today, that was right." },
    { jp: "迷う前に飛び込む日もある。", en: "Some days, you dive before thinking." },
    { jp: "沈んだように見えて、良い感じだな。", en: "Looked like it sank. Worked out fine." },
    { jp: "飛び込んだ先に、案外いいもんがあるんだな。", en: "There was something good where it dove." },
    { jp: "今日は浅く考えない方が良さそうだな。", en: "Better not stay shallow today." }
  ],

  nokkari: [
    { jp: "今日は乗っかったもの勝ちだったな。", en: "Today belonged to what stayed on." },
    { jp: "しがみついたやつが残る日だ。", en: "The one that held on remained." },
    { jp: "うまく乗ったな。", en: "That settled on nicely." },
    { jp: "派手じゃないが、ちゃんとそこにいる。", en: "Not flashy, but it is there." },
    { jp: "今日は流れに乗るくらいで良いな。", en: "Today, riding the flow is enough." },
    { jp: "無理に決めなくても残る日がある。", en: "Some days stay without forcing it." }
  ],

  kantsu: [
    { jp: "まっすぐ刺さるものがある日だな。", en: "Some things go straight in today." },
    { jp: "遠慮なく刺さったな。その勢い、嫌いじゃない。", en: "That did not hold back. I like that." },
    { jp: "今日は言葉もトッピングも、まっすぐ刺さる日だな。", en: "Words and toppings land sharp today." },
    { jp: "変に曲げない方が届く日だ。", en: "Today, straight reaches better." },
    { jp: "刺さる時は、あっさり刺さるもんだな。", en: "When it sticks, it sticks fast." },
    { jp: "今日は一点突破でいい。そういう日だ。", en: "One clean push is enough today." }
  ],

  success5: [
    { jp: "……全部売れたな。こんな夜もあるんだな。", en: "...Everything sold. Nights like this really happen." },
    { jp: "全部いったのか。ちょっと出来すぎじゃないか？", en: "All five? That went almost too well." },
    { jp: "今日は何やってもうまくいく日だったな。", en: "Today, everything seemed to work." },
    { jp: "五つ全部か。しばらく自慢していいぞ。", en: "All five. You can brag about that for a while." },
    { jp: "完売だな。こんな日は覚えておいた方がいい。", en: "Sold out. Remember a night like this." },
    { jp: "参ったな。今日は俺よりうまいんじゃないか？", en: "You got me. Maybe you were better than me tonight." },
    { jp: "これはもう、明日も同じように頼むわ。", en: "At this point, do the same again tomorrow." },
    { jp: "全部売れた。今日は文句なしだな。", en: "Everything sold. No complaints tonight." }
  ],

  success4: [
    { jp: "やるじゃん。今日はかなり助かった。", en: "Nice. You really helped tonight." },
    { jp: "四つか。もう十分すぎるくらいだな。", en: "Four. That is more than enough." },
    { jp: "今日はずいぶん店が回ったな。", en: "The café really moved tonight." },
    { jp: "いい夜だったな。こういう日が増えると助かる。", en: "Good night. More of these would help." },
    { jp: "ほとんど売れたな。大したもんだ。", en: "Almost everything sold. That is something." },
    { jp: "この調子なら、安心して任せられそうだな。", en: "At this rate, I can leave it to you." },
    { jp: "今日は胸張って帰っていいぞ。", en: "You can head home proud tonight." },
    { jp: "ここまで来ると、もう慣れたもんだな。", en: "At this point, you are getting used to it." }
  ],

  success3: [
    { jp: "いいじゃん。今日はだいぶ店が回ったな。", en: "Nice. The café really got moving tonight." },
    { jp: "三つ売れたか。上出来じゃないか。", en: "Three sold. That is a solid night." },
    { jp: "今日はちゃんと仕事したって感じだな。", en: "Feels like we really worked tonight." },
    { jp: "半分以上いったな。十分すごいぞ。", en: "More than half. That is plenty good." },
    { jp: "いい調子だな。忙しい夜ほど助かる。", en: "Good rhythm. Busy nights need that." },
    { jp: "だいぶ店の感じが分かってきたんじゃないか。", en: "You are getting the feel of the place." },
    { jp: "三つ並ぶと、ちゃんと店っぽくなるな。", en: "Three on the board makes this feel like a real café." },
    { jp: "今日はなかなか良い夜だったな。", en: "That was a pretty good night." }
  ],

  success2: [
    { jp: "ちゃんと売れてる。悪くない夜だ。", en: "It sold. Not a bad night." },
    { jp: "二つ出たな。十分十分。", en: "Two made it. Plenty." },
    { jp: "まあ、店は回ったな。そういう日も大事だ。", en: "The café ran. Days like that matter." },
    { jp: "派手じゃないけど、ちゃんと売れた。悪くない。", en: "Not flashy, but it sold. Not bad." },
    { jp: "二つあれば、今日の店としては上出来だ。", en: "Two is a good night for this place." },
    { jp: "なんだかんだで、ちゃんと形になったな。", en: "Somehow, it came together." },
    { jp: "今日はこれくらいがちょうど良かったのかもな。", en: "Maybe this was just the right amount tonight." },
    { jp: "売れたものが二つある。それで十分だ。", en: "Two things sold. That is enough." }
  ],

  success1: [
    { jp: "ひとつ決まったな。十分十分。", en: "One landed. Plenty." },
    { jp: "一個出たじゃん。悪くないぞ。", en: "One made it. Not bad at all." },
    { jp: "ひとつ売れれば、ちゃんと店だ。", en: "If one sells, it is still a café." },
    { jp: "今日はこれが看板商品ってことにしとくか。", en: "Let’s call this today’s signature item." },
    { jp: "一個でも決まると、ちょっと嬉しいもんだな。", en: "Even one good landing feels nice." },
    { jp: "ちゃんとひとつ残ったな。それでいい。", en: "One stayed. That is enough." },
    { jp: "ひとつ売れた。今日はそれを覚えとこう。", en: "One sold. Let’s remember that tonight." },
    { jp: "ゼロじゃない。それって結構大事だぞ。", en: "Not zero. That matters more than you think." }
  ],

  success0: [
    { jp: "こういう日もあるな。さあ、片づけるか。", en: "Days like this happen. Let’s clean up." },
    { jp: "今日は片づけの練習ということだ。", en: "Today was cleanup practice." },
    { jp: "まあ、店が壊れなかっただけ良しとするか。", en: "At least the café is still standing." },
    { jp: "今日は仕込み直しだな。コーヒーでも飲むか？", en: "We prep again. Want coffee?" },
    { jp: "何もない夜もある。明かりは消すなよ。", en: "Some nights give nothing. Keep the lights on." },
    { jp: "まあ、飛ばしただけでも今日は前進だ。", en: "Hey, launching it was progress today." },
    { jp: "店を開けた。今日はそれでいい。", en: "We opened the café. That is enough today." },
    { jp: "売れない日も、そりゃあるよな。", en: "Some days just do not sell." }
  ]
};

function jdManagerMemoAddPool(candidates, poolName) {
  const pool =
    JD_MANAGER_MEMO_POOLS[poolName];

  if (!Array.isArray(pool)) {
    return;
  }

  for (const memo of pool) {
    candidates.push(memo);
  }
}

function jdManagerMemoStringScore(value) {
  const text =
    String(value || "");

  let score = 0;

  for (
    let i = 0;
    i < text.length;
    i += 1
  ) {
    score +=
      text.charCodeAt(i) *
      (i + 3);
  }

  return score;
}

function jdManagerMemoSeed(results, successCount) {
  let seed =
    1741 +
    successCount * 97 +
    Math.floor(
      Number.isFinite(JD.totalSales)
        ? JD.totalSales
        : 0
    ) * 5;

  for (
    let i = 0;
    i < results.length;
    i += 1
  ) {
    const r =
      results[i] || {};

    seed +=
      (i + 1) *
      (
        31 +
        jdManagerMemoStringScore(r.type) +
        jdManagerMemoStringScore(r.item) +
        jdManagerMemoStringScore(r.targetKind) +
        Math.floor(
          Number.isFinite(r.price)
            ? r.price
            : 0
        ) +
        (
          r.perfect === true
            ? 271
            : 0
        ) +
        (
          Number.isFinite(r.scoredBounceCount)
            ? r.scoredBounceCount * 113
            : 0
        )
      );
  }

  return Math.abs(
    Math.floor(seed)
  );
}

function jdChooseManagerMemo(candidates, seed) {
  if (
    !Array.isArray(candidates) ||
    candidates.length <= 0
  ) {
    return null;
  }

  const index =
    seed %
    candidates.length;

  return candidates[index];
}

function jdManagerMemoText(memo) {
  if (!memo) {
    return "";
  }

  if (jdIsEnglish()) {
    return memo.en || memo.jp || "";
  }

  return memo.jp || memo.en || "";
}

function jdManagerCommentShort() {
  const results =
    Array.isArray(JD.results)
      ? JD.results
      : [];

  let successCount = 0;
  let hasPerfect = false;
  let hasBounceBonus = false;
  let hasDive = false;
  let hasNokkari = false;
  let hasKantsu = false;

  for (const r of results) {
    if (!jdIsScoredCompletion(r)) {
      continue;
    }

    successCount += 1;

    if (r.perfect === true) {
      hasPerfect = true;
    }

    if (
      Number.isFinite(r.scoredBounceCount) &&
      r.scoredBounceCount > 0
    ) {
      hasBounceBonus = true;
    }

    if (r.type === "DIVE") {
      hasDive = true;

    } else if (r.type === "LAND") {
      hasNokkari = true;

    } else if (r.type === "STAB") {
      hasKantsu = true;
    }
  }

  const seed =
    jdManagerMemoSeed(
      results,
      successCount
    );

  // 5/5は奇跡枠。
  // 4回に3回は専用コメントを出し、残りだけ特殊結果コメントへ回す。
  if (successCount >= 5) {
    const miraclePool =
      JD_MANAGER_MEMO_POOLS.success5;

    const specialCandidates = [];

    if (hasPerfect) {
      jdManagerMemoAddPool(
        specialCandidates,
        "perfect"
      );
    }

    if (hasBounceBonus) {
      jdManagerMemoAddPool(
        specialCandidates,
        "bounce"
      );
    }

    if (hasDive) {
      jdManagerMemoAddPool(
        specialCandidates,
        "dive"
      );
    }

    if (hasNokkari) {
      jdManagerMemoAddPool(
        specialCandidates,
        "nokkari"
      );
    }

    if (hasKantsu) {
      jdManagerMemoAddPool(
        specialCandidates,
        "kantsu"
      );
    }

    const useMiracle =
      seed % 4 !== 0 ||
      specialCandidates.length <= 0;

    const memo =
      useMiracle
        ? jdChooseManagerMemo(
            miraclePool,
            seed
          )
        : jdChooseManagerMemo(
            specialCandidates,
            seed
          );

    return (
      jdManagerMemoText(memo) ||
      jdT("manager.default")
    );
  }

  const candidates = [];

  if (hasPerfect) {
    jdManagerMemoAddPool(
      candidates,
      "perfect"
    );
  }

  if (hasBounceBonus) {
    jdManagerMemoAddPool(
      candidates,
      "bounce"
    );
  }

  if (hasDive) {
    jdManagerMemoAddPool(
      candidates,
      "dive"
    );
  }

  if (hasNokkari) {
    jdManagerMemoAddPool(
      candidates,
      "nokkari"
    );
  }

  if (hasKantsu) {
    jdManagerMemoAddPool(
      candidates,
      "kantsu"
    );
  }

  jdManagerMemoAddPool(
    candidates,
    `success${successCount}`
  );

  const memo =
    jdChooseManagerMemo(
      candidates,
      seed
    );

  return (
    jdManagerMemoText(memo) ||
    jdT("manager.default")
  );
}

function jdDrawHitZone(t) {
  if (!JD.debugMode) return;
  rectMode(CORNER); ellipseMode(CENTER);
  noFill(); strokeWidth(2); stroke(255, 90, 70, 120);
  if (t.kind === "coffee") {
    rect(t.x - 39, JD.tableY + 14, 8, 42); rect(t.x + 31, JD.tableY + 14, 8, 42); rect(t.x - 31, JD.tableY + 12, 62, 8); rect(t.x - 44, JD.tableY + 2, 88, 10);
    noStroke(); fill(80, 255, 150, 75); ellipse(t.x, JD.tableY + 58, 82, 34);
  } else if (t.kind === "cake") {
    rect(t.x - 54, JD.tableY + 18, 10, 44); rect(t.x + 44, JD.tableY + 18, 10, 44);
    noStroke(); fill(80, 255, 150, 75); rect(t.x - 48, JD.tableY + 18, 96, 70);
  } else if (t.kind === "melon") {
    rect(t.x - 35, JD.tableY + 18, 7, 120); rect(t.x + 28, JD.tableY + 18, 7, 120); rect(t.x - 30, JD.tableY + 8, 60, 10);
    // 成功判定と同じ、上部開口の下降通過面だけを表示する。
    noStroke(); fill(90, 190, 255, 72); rect(t.x - 22, JD.tableY + 143, 44, 6);
  }
}

function jdDrawDebugButton() {
  // 公開版では非表示
  return;
}


function jdDebugButtonHit(_x, _y) {
  // 非表示ボタンの見えないタップ判定も無効化
  return false;
}


function jdDrawDebugWorld() {
  if (!JD.debugMode) return;
  fill(255, 245, 224, 180); jdReceiptFont("bold"); fontSize(9); textAlign(CENTER);
  text(`PHASE ${JD.gamePhase}`, JD.cam.x, JD.cam.y + 210);
}

function jdDrawDebugScreen() {
  if (!JD.debugMode) return;
  rectMode(CORNER); noStroke(); fill(28, 18, 14, 175); rect(16, 144, 328, 92);
  fill(255, 245, 224, 220); jdReceiptFont("bold"); fontSize(10); textAlign(LEFT);
  text(`SCENE PLAY  PHASE ${JD.gamePhase}`, 26, 216);
  text(`${JD.webPortVersion || "WEB"}`, 26, 154);
  if (JD.food) {
    text(`FOOD ${JD.food.name}  vx ${Math.round(JD.food.vx || 0)}  vy ${Math.round(JD.food.vy || 0)}`, 26, 194);
    const best = jdBestTargetDebugInfo();
    if (best) text(`NEAR ${best.target.label}  ${best.inZone ? "IN" : "OUT"}  ${best.reason}`, 26, 172);
  }
}

function jdBestTargetDebugInfo() {
  if (!JD.food) return null;
  let best = null;
  let bestD = Infinity;
  for (const t of JD.targets) {
    const info = jdTargetDebugInfo(JD.food, t);
    const d = Math.hypot(JD.food.x - t.x, JD.food.y - t.y);
    if (d < bestD) { bestD = d; best = info; }
  }
  return best;
}

function jdUpdateCamera(dt) {
  if (
    JD.state ===
    STATE_PLAY
  ) {
    if (
      JD.gamePhase ===
      PHASE_SHIFT_START
    ) {
      const duration =
        Number.isFinite(
          JD.shiftStartDuration
        )
          ? JD.shiftStartDuration
          : 7.4;

      const timer =
        Number.isFinite(
          JD.shiftStartTimer
        )
          ? JD.shiftStartTimer
          : duration;

      const elapsed =
        duration - timer;

      const moveT =
        jdClamp(
          (
            elapsed -
            5.10
          ) / 2.05,
          0,
          1
        );

      const ease =
        moveT *
        moveT *
        (
          3 -
          2 * moveT
        );

      JD.cam.tx =
        515 +
        (
          JD.launcher.x -
          105 -
          515
        ) * ease;

      JD.cam.ty =
        285 +
        (
          252 -
          285
        ) * ease;

      JD.cam.tz =
        0.42 +
        (
          1 -
          0.42
        ) * ease;

    } else if (
      JD.fortuneSpinning ||
      JD.fortunePickedTimer > 0
    ) {
      // 結果から次の素材を決める間は、命中地点のカメラを保つ。
      // Fortune機械の上下動とカメラ移動を重ねず、視線を一度休ませる。
      jdFreezeCamera();

    } else if (
      JD.dragging
    ) {
      jdSetCameraOverview();

    } else if (
      JD.perfectZoomActive &&
      JD.hitZoomTimer > 0
    ) {
      JD.hitZoomTimer -= dt;
      jdSetCameraHitZoom();

    } else if (
      JD.food &&
      JD.food.launched
    ) {
      jdSetCameraFollowFood();

    } else if (
      JD.food &&
      JD.food.resolved
    ) {
      jdFreezeCamera();

    } else {
      jdSetCameraClose(false);
    }
  }

  let k = 7.5;

  if (
    JD.gamePhase ===
    PHASE_SHIFT_START
  ) {
    k = 4.8;

  } else if (
    JD.dragging
  ) {
    k = 11;

  } else if (
    JD.perfectZoomActive &&
    JD.hitZoomTimer > 0
  ) {
    k = 12.5;
  }

  const a =
    Math.min(
      1,
      dt * k
    );

  JD.cam.x +=
    (
      JD.cam.tx -
      JD.cam.x
    ) * a;

  JD.cam.y +=
    (
      JD.cam.ty -
      JD.cam.y
    ) * a;

  JD.cam.zoom +=
    (
      JD.cam.tz -
      JD.cam.zoom
    ) * a;
}




function jdSetCameraClose(instant) {
  JD.cam.tx = JD.launcher.x - 105;
  JD.cam.ty = 252;
  JD.cam.tz = 1;
  if (instant) { JD.cam.x = JD.cam.tx; JD.cam.y = JD.cam.ty; JD.cam.zoom = JD.cam.tz; }
}

function jdSetCameraOverview() {
  const pull =
    jdGetScreenPull();

  const powerRatio =
    jdClamp(
      Math.hypot(
        pull.x,
        pull.y
      ) / JD.maxPull,
      0,
      1
    );

  // 40％で全景へ到達
  const overviewRatio =
    jdClamp(
      powerRatio / 0.40,
      0,
      1
    );

  const t =
    overviewRatio *
    overviewRatio *
    (
      3 -
      2 * overviewRatio
    );

  const startZoom =
    1.02;

  const endZoom =
    0.42;

  const zoom =
    startZoom +
    (
      endZoom -
      startZoom
    ) * t;

  // 発射台を右側に保ちつつ、
  // 左端のメロンソーダにも十分な余白を確保
  const launcherScreenX =
    296;

  JD.cam.tx =
    JD.launcher.x -
    (
      launcherScreenX -
      JD.camScreenX
    ) / zoom;

  // 全景時に下側へ寄りすぎないよう、
  // 店内上部とカウンターの余白を均等化
  JD.cam.ty =
    252 +
    (
      280 -
      252
    ) * t;

  JD.cam.tz =
    zoom;
}






function jdSetCameraFollowFood() {
  if (!JD.food) return jdSetCameraOverview();
  let lead = 0;
  if (JD.food.vx < -30) lead = -72;
  else if (JD.food.vx > 30) lead = 40;
  JD.cam.tz = 0.86;
  JD.cam.tx = jdClampCameraX(JD.food.x + lead, JD.cam.tz);
  JD.cam.ty = jdClamp(JD.food.y, 215, 355);
}

function jdSetCameraHitZoom() {
  const x = JD.hitZoomX || (JD.food && JD.food.x) || JD.cam.x;
  const y = JD.hitZoomY || (JD.food && JD.food.y) || JD.cam.y;
  const z = JD.hitZoomLevel || 1.48;
  JD.camScreenX = JD.LOGICAL_W / 2;
  JD.camScreenY = 292;
  JD.cam.tz = z;
  JD.cam.tx = jdClampCameraX(x, z);
  JD.cam.ty = jdClamp(y + 8, 175, 365);
}

function jdFreezeCamera() { JD.cam.tx = JD.cam.x; JD.cam.ty = JD.cam.y; JD.cam.tz = JD.cam.zoom; }
function jdClampCameraX(x, zoom) {
  const viewW = JD.LOGICAL_W / zoom;
  if (viewW >= JD.worldW) return JD.worldW / 2;
  return jdClamp(x, viewW / 2, JD.worldW - viewW / 2);
}
function jdApplyCamera() { translate(JD.camScreenX, JD.camScreenY); scale(JD.cam.zoom); translate(-JD.cam.x, -JD.cam.y); }
function jdWorldToScreen(x, y) { return { x: (x - JD.cam.x) * JD.cam.zoom + JD.camScreenX, y: (y - JD.cam.y) * JD.cam.zoom + JD.camScreenY }; }
function jdScreenToWorldPoint(x, y) { return { x: (x - JD.camScreenX) / JD.cam.zoom + JD.cam.x, y: (y - JD.camScreenY) / JD.cam.zoom + JD.cam.y }; }

function jdUpdateScale() {
  const sx = WIDTH / JD.LOGICAL_W;
  const sy = HEIGHT / JD.LOGICAL_H;
  JD.scale = Math.min(sx, sy);
  JD.offsetX = (WIDTH - JD.LOGICAL_W * JD.scale) / 2;
  JD.offsetY = (HEIGHT - JD.LOGICAL_H * JD.scale) / 2;
}

function jdToLogical(touch) { return { x: (touch.x - JD.offsetX) / JD.scale, y: (touch.y - JD.offsetY) / JD.scale }; }
function jdFoodRadius(f) { if (!f) return 10; return f.r || Math.max(f.w || 18, f.h || 18) / 2; }
function jdShotSpeed(f) { return Math.hypot(f.vx || 0, f.vy || 0); }
function jdClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function jdAngleName(pull) { const a = Math.atan2(pull.y, Math.abs(pull.x)) * 180 / Math.PI; if (a < 22) return jdT("shot.low"); if (a < 48) return jdT("shot.naname"); return jdT("shot.high"); }


// Web-only stability hooks. They are no-ops in the Codea mental model, but useful in browsers.
if (typeof window !== "undefined") {
  window.addEventListener("blur", jdCancelActiveTouch);
  window.addEventListener("pagehide", jdCancelActiveTouch);
}
