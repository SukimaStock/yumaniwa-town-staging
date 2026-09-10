// Codea Lite image compatibility smoke test.
// Temporary validation page for SteamClock Step 3.

let gearImage;
let nixieImage;
let angle = 0;

function setup() {
  spriteMode(CENTER);
  gearImage = readImage("assets/gear1.png");
  nixieImage = loadImage("assets/nixie_tube.png");
  noStroke();
}

function draw() {
  background(16, 12, 11);

  // 1) Image loading + native dimensions + centered sprite.
  if (gearImage && gearImage.loaded) {
    angle += 24 * DeltaTime;
    pushMatrix();
    translate(WIDTH * 0.33, HEIGHT * 0.57);
    rotate(angle);
    sprite(gearImage, 0, 0, 150, 150);
    popMatrix();
  }

  // 2) A second sprite verifies independent image loading.
  if (nixieImage && nixieImage.loaded) {
    sprite(nixieImage, WIDTH * 0.70, HEIGHT * 0.57, 82, 180);

    // 3) ADDITIVE / NORMAL compatibility used by SteamClock's Nixie glow.
    textAlign(CENTER);
    font('Avenir Next, Avenir, system-ui, sans-serif');
    blendMode(ADDITIVE);
    fill(255, 110, 20, 100);
    fontSize(92);
    text("8", WIDTH * 0.70, HEIGHT * 0.565);
    fill(255, 185, 110, 235);
    fontSize(82);
    text("8", WIDTH * 0.70, HEIGHT * 0.565);
    blendMode(NORMAL);
  }

  fill(239, 216, 171);
  font('system-ui, -apple-system, sans-serif');
  fontSize(16);
  textAlign(CENTER);
  text("Codea Lite / SteamClock image test", WIDTH / 2, 48);
}
