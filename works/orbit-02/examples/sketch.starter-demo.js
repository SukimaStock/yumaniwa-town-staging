// SukimaStock Engine Starter
// ------------------------------------------------------------
// The app only defines its own scenes and game rules.
// setup(), draw(), and touched() are owned by the engine.

(function () {
  "use strict";

  const model = {
    taps: 0,
    lights: [],
  };

  const TEXT = {
    title: {
      brand: { jp: "SukimaStock", en: "SukimaStock" },
      engine: { jp: "ENGINE", en: "ENGINE" },
      sub: { jp: "小さな作品のための制作室", en: "A WORKSHOP FOR SMALL EXPERIENCES" },
      start: { jp: "制作室をひらく", en: "OPEN THE WORKSHOP" },
    },
    play: {
      heading: { jp: "触れて、灯りを置く", en: "TOUCH TO PLACE A LIGHT" },
      guide: { jp: "5つ置くと結果画面へ進みます", en: "PLACE FIVE TO OPEN THE RESULT" },
      count: { jp: "灯り", en: "LIGHTS" },
    },
    result: {
      heading: { jp: "小さな試作ができました", en: "A SMALL PROTOTYPE IS READY" },
      again: { jp: "もう一度", en: "TRY AGAIN" },
      save: { jp: "画像を記録", en: "SAVE IMAGE" },
    },
  };

  const titleScene = {
    opaque: true,
    button: { x: 76, y: 104, w: 208, h: 52 },
    lang: { x: 298, y: 590, w: 42, h: 28 },
    pressed: false,
    time: 0,

    enter() {
      this.time = 0;
      this.pressed = false;
    },

    update(dt) {
      this.time += dt;
    },

    draw() {
      background(SSE.theme.color("night"));
      drawWorkshopBackdrop(this.time);

      fill(SSE.theme.color("cream"));
      SSE.type.apply("hero", { align: CENTER });
      text(SSE.i18n.t("title.brand"), 180, 438);

      fill(SSE.theme.color("amber"));
      SSE.type.apply("title", { align: CENTER });
      text(SSE.i18n.t("title.engine"), 180, 400);

      fill(SSE.theme.color("dim"));
      SSE.type.fit(SSE.i18n.t("title.sub"), "body", 290, {
        minSize: 8,
        align: CENTER,
      });
      text(SSE.i18n.t("title.sub"), 180, 364);

      SSE.ui.button(this.button, SSE.i18n.t("title.start"), {
        pressed: this.pressed,
        accent: true,
      });

      SSE.ui.languageToggle(this.lang);

      fill(SSE.theme.color("dim", 180));
      SSE.type.apply("small", { align: CENTER });
      text("SUKIMASTOCK ENGINE v" + SSE.VERSION, 180, 56);
    },

    touch(touch) {
      if (SSE.ui.hit(touch, this.lang) && touch.state === ENDED) {
        SSE.i18n.toggle("jp", "en");
        SSE.audio.tone({ frequency: 540, endFrequency: 680, duration: 0.08, volume: 0.035 });
        return true;
      }

      if (SSE.ui.hit(touch, this.button)) {
        this.pressed = touch.state === BEGAN || touch.state === MOVING;
        if (touch.state === ENDED) {
          this.pressed = false;
          SSE.audio.tone({ frequency: 360, endFrequency: 520, duration: 0.12, volume: 0.05 });
          SSE.app.replace("play", null, { duration: "scene" });
        }
        return true;
      }

      if (touch.state === ENDED) this.pressed = false;
      return true;
    },
  };

  const playScene = {
    opaque: true,
    time: 0,

    enter() {
      model.taps = 0;
      model.lights = [];
      this.time = 0;
    },

    update(dt) {
      this.time += dt;
      for (const light of model.lights) {
        light.age += dt;
      }
    },

    draw() {
      background(SSE.theme.color("night"));
      drawWorkshopBackdrop(this.time);

      fill(SSE.theme.color("cream"));
      SSE.type.apply("title", { align: CENTER });
      text(SSE.i18n.t("play.heading"), 180, 574);

      fill(SSE.theme.color("dim"));
      SSE.type.fit(SSE.i18n.t("play.guide"), "small", 300, {
        minSize: 7,
        align: CENTER,
      });
      text(SSE.i18n.t("play.guide"), 180, 548);

      drawDesk();
      drawLights();

      const counter = SSE.i18n.t("play.count") + "  " + model.taps + " / 5";
      SSE.ui.paper({ x: 112, y: 76, w: 136, h: 42 });
      fill(SSE.theme.color("ink"));
      SSE.type.apply("mono", { align: CENTER });
      text(counter, 180, 97);
    },

    touch(touch, context) {
      if (touch.state !== ENDED || !touch.inside) return true;
      if (touch.y < 126 || touch.y > 510) return true;

      model.lights.push({
        x: touch.x,
        y: touch.y,
        age: 0,
        size: 8 + Math.random() * 7,
      });
      model.taps += 1;

      SSE.audio.tone({
        frequency: 420 + model.taps * 55,
        endFrequency: 500 + model.taps * 60,
        duration: 0.08,
        volume: 0.035,
      });

      if (model.taps >= 5) {
        context.motion.after("card", () => {
          SSE.app.replace("result", null, { duration: "scene" });
        });
      }
      return true;
    },
  };

  const resultScene = {
    opaque: true,
    again: { x: 54, y: 82, w: 118, h: 48 },
    save: { x: 188, y: 82, w: 118, h: 48 },
    entered: 0,

    enter() {
      this.entered = 0;
      SSE.analytics.track("Result Viewed", { lights: model.taps });
    },

    update(dt) {
      this.entered = Math.min(1, this.entered + dt / SSE.motion.time("card"));
    },

    draw() {
      background(SSE.theme.color("nightDeep"));
      const ease = SSE.motion.easing.backOut(this.entered);

      pushMatrix();
      translate(180, 326);
      scale(0.82 + ease * 0.18);
      translate(-180, -326);

      SSE.ui.paper({ x: 38, y: 164, w: 284, h: 324 }, {
        shadowAlpha: 110,
      });

      fill(SSE.theme.color("redDeep"));
      rect(66, 444, 228, 3);

      fill(SSE.theme.color("ink"));
      SSE.type.fit(SSE.i18n.t("result.heading"), "title", 240, {
        minSize: 14,
        align: CENTER,
      });
      text(SSE.i18n.t("result.heading"), 180, 406);

      drawResultLights();

      fill(SSE.theme.color("ink", 190));
      SSE.type.apply("mono", { align: CENTER });
      text("SUKIMASTOCK / PROTOTYPE 001", 180, 202);

      popMatrix();

      SSE.ui.button(this.again, SSE.i18n.t("result.again"));
      SSE.ui.button(this.save, SSE.i18n.t("result.save"), { accent: true });
    },

    touch(touch) {
      if (touch.state !== ENDED) return true;

      if (SSE.ui.hit(touch, this.again)) {
        SSE.audio.tone({ frequency: 440, endFrequency: 560, duration: 0.09, volume: 0.04 });
        SSE.app.replace("play", null, { duration: "scene" });
        return true;
      }

      if (SSE.ui.hit(touch, this.save)) {
        SSE.audio.tone({ frequency: 680, endFrequency: 920, duration: 0.10, volume: 0.035 });
        SSE.share.image({
          fileName: "sukimastock-engine-prototype.png",
          title: "SukimaStock Engine Prototype",
          pixelRatio: 2,
          smoothing: true,
        });
        return true;
      }

      return true;
    },
  };

  function drawWorkshopBackdrop(time) {
    noStroke();
    fill(SSE.theme.color("woodDark"));
    rect(0, 0, 360, 126);

    fill(SSE.theme.color("panel"));
    rect(24, 182, 312, 300, 12);

    fill(SSE.theme.color("panelSoft"));
    rect(42, 204, 276, 250, 8);

    const pulse = 0.70 + Math.sin(time * 2.1) * 0.08;
    fill(SSE.theme.color("amber", 120 * pulse));
    ellipse(180, 310, 150, 150);

    fill(SSE.theme.color("amber", 22));
    ellipse(180, 310, 230, 230);
  }

  function drawDesk() {
    fill(SSE.theme.color("wood"));
    rect(36, 154, 288, 238, 8);

    fill(SSE.theme.color("woodDark"));
    rect(48, 166, 264, 214, 5);

    fill(SSE.theme.color("panel"));
    rect(60, 178, 240, 190, 4);
  }

  function drawLights() {
    noStroke();
    for (const light of model.lights) {
      const appear = Math.min(1, light.age / 0.18);
      const scaleValue = SSE.motion.easing.backOut(appear);
      fill(SSE.theme.color("amber", 42 * appear));
      ellipse(light.x, light.y, light.size * 5.2 * scaleValue);
      fill(SSE.theme.color("amber", 220 * appear));
      ellipse(light.x, light.y, light.size * scaleValue);
      fill(SSE.theme.color("highlight", 230 * appear));
      ellipse(light.x - 1.5, light.y + 1.5, light.size * 0.34 * scaleValue);
    }
  }

  function drawResultLights() {
    const columns = 5;
    for (let i = 0; i < model.lights.length; i += 1) {
      const x = 94 + (i % columns) * 43;
      const y = 308 - Math.floor(i / columns) * 45;
      fill(SSE.theme.color("amber", 52));
      ellipse(x, y, 34);
      fill(SSE.theme.color("amber"));
      ellipse(x, y, 12);
      fill(SSE.theme.color("highlight"));
      ellipse(x - 2, y + 2, 4);
    }
  }

  SSE.createApp({
    id: "sukimastock-engine-starter",
    logicalWidth: 360,
    logicalHeight: 640,
    initialScene: "title",
    outerBackground: "nightDeep",
    sceneBackground: "night",
    debug: true,

    fonts: {
      id: "sse-starter-fonts",
      href: "https://fonts.googleapis.com/css2?family=Kaisei+Decol:wght@400;500;700&family=Courier+Prime:wght@400;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=block",
      timeoutMs: 3500,
      probes: [
        { css: '700 16px "Kaisei Decol"', text: "小さな制作室" },
        { css: '500 16px "Zen Kaku Gothic New"', text: "触れて灯りを置く" },
        { css: '400 16px "Courier Prime"', text: "SUKIMASTOCK 012345" },
      ],
    },

    i18n: {
      defaultLanguage: "jp",
      text: TEXT,
    },

    analytics: {
      enabled: true,
    },

    // Set workId when embedding the project in Yumaniwa.
    // bridge: { workId: "your-work-id" },

    scenes: {
      title: titleScene,
      play: playScene,
      result: resultScene,
    },
  });
})();
