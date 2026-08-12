// ==========================================
// 新しい触れるらくがき / 下書き
// Codea 風の setup(), draw(), touched(touch) をここに書きます。
// 座標は全て Codea 式：左下が (0, 0)、Y は上向き。
// ==========================================

// 初回移植時だけ true にして、上下・タッチ位置を確認します。
var COORDINATE_CHECK = false;

var touchPoint = null;
var pulse = 0;

function setup() {
  noStroke();
}

function draw() {
  background(16, 21, 27);

  var cx = WIDTH * 0.5;
  var cy = HEIGHT * 0.5;
  var r = Math.min(WIDTH, HEIGHT) * (0.14 + Math.sin(ElapsedTime * 1.4) * 0.008);

  fill(40, 52, 64, 255);
  ellipse(cx, cy, r * 3.1, r * 3.1);

  fill(188, 207, 205, 230);
  ellipse(cx, cy, r * (1 + pulse * 0.18));

  if (touchPoint) {
    noFill();
    stroke(225, 238, 236, 130);
    strokeWidth(2);
    ellipse(touchPoint.x, touchPoint.y, 38 + pulse * 34);
    noStroke();
  }

  pulse *= 0.94;

  if (COORDINATE_CHECK) {
    CodeaLite.drawCoordinateGuide({
      label: "Codea座標確認：下 = y 0 / 上 = y HEIGHT"
    });
  }
}

function touched(touch) {
  touchPoint = vec2(touch.x, touch.y);
  pulse = 1;
}
