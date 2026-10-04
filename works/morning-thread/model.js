/* Work-local itinerary rules. Integer minutes, never wall-clock time. */
(function (root) {
  "use strict";
  const minute = (h, m) => h * 60 + m;
  const time = (n) =>
    `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  const home = {
    id: "home",
    title: "家の中から",
    subtitle: "出かけるまでの、小さな旅。",
    start: "table",
    startTime: minute(8, 10),
    deadline: minute(8, 20),
    goal: "door",
    goalText: "コーヒーと洗濯を済ませて、8:20までに家を出る。",
    nodes: [
      {
        id: "table",
        name: "朝のテーブル",
        icon: "◌",
        x: 54,
        y: 114,
        note: "今日も、ここから。",
      },
      {
        id: "coffee",
        name: "コーヒー",
        icon: "☕",
        x: 144,
        y: 62,
        open: minute(8, 10),
        service: 2,
        note: "淹れるのに2分。台所まで1分。",
      },
      {
        id: "laundry",
        name: "洗濯もの",
        icon: "≋",
        x: 242,
        y: 114,
        open: minute(8, 14),
        service: 1,
        note: "8:14に洗い上がる。取り出すのに1分。",
      },
      {
        id: "door",
        name: "玄関",
        icon: "↗",
        x: 323,
        y: 62,
        note: "コーヒーと洗濯ものが済んだら、出かけよう。",
      },
    ],
    edges: [
      ["table", "coffee", 1],
      ["table", "laundry", 1],
      ["table", "door", 1],
      ["coffee", "laundry", 1],
      ["coffee", "door", 1],
      ["laundry", "door", 1],
    ],
  };
  const mall = {
    id: "mall",
    title: "開店前のモール",
    subtitle: "焼きたての香りを、屋上へ。",
    start: "entry",
    startTime: minute(8, 32),
    deadline: minute(8, 50),
    goal: "roof",
    goalText: "8:50までに、焼きたてパンを屋上カフェへ届ける。",
    nodes: [
      {
        id: "entry",
        name: "従業員入口",
        icon: "↗",
        x: 48,
        y: 143,
        note: "まだ静かな、朝の入口。",
      },
      {
        id: "bakery",
        name: "ベーカリー",
        icon: "▱",
        x: 122,
        y: 151,
        open: minute(8, 40),
        service: 1,
        note: "8:40に焼き上がり。パンを受け取るのに1分。",
      },
      {
        id: "central",
        name: "中央通路",
        icon: "◌",
        x: 218,
        y: 148,
        note: "ベーカリーから1分。エスカレーターへ2分。",
      },
      {
        id: "food",
        name: "食品売り場",
        icon: "▦",
        x: 78,
        y: 72,
        note: "ベーカリーから2分。搬入リフトへ1分。花屋へ2分。",
      },
      {
        id: "lift",
        name: "搬入リフト",
        icon: "⇧",
        x: 179,
        y: 65,
        note: "8:44発、屋上まで2分。次は8:52発。食品売り場から1分。",
      },
      {
        id: "escalator",
        name: "エスカレーター",
        icon: "⋰",
        x: 304,
        y: 132,
        open: minute(8, 42),
        note: "清掃は8:42まで。中央通路から2分、屋上へ3分。",
      },
      {
        id: "florist",
        name: "花屋",
        icon: "✿",
        x: 279,
        y: 64,
        open: minute(8, 45),
        service: 1,
        note: "8:45に準備完了。小さな花を包むのに1分。食品売り場から2分。",
      },
      {
        id: "roof",
        name: "屋上カフェ",
        icon: "☕",
        x: 326,
        y: 27,
        open: minute(8, 46),
        note: "8:46から受け取り。8:50までにパンを届けよう。",
      },
    ],
    edges: [
      ["entry", "bakery", 2],
      ["entry", "central", 3],
      ["bakery", "central", 1],
      ["bakery", "food", 2],
      ["central", "food", 2],
      ["central", "escalator", 2],
      ["food", "lift", 1],
      ["food", "florist", 2],
      ["lift", "roof", 2],
      ["escalator", "roof", 3],
    ],
  };
  const stages = { home, mall };
  function node(s, id) {
    return stages[s.stage].nodes.find((n) => n.id === id);
  }
  function edge(s, from, to) {
    if (
      s.stage === "mall" &&
      s.event &&
      ((from === "florist" && to === "roof") ||
        (from === "roof" && to === "florist"))
    )
      return 2;
    const e = stages[s.stage].edges.find(
      (e) => (e[0] === from && e[1] === to) || (e[1] === from && e[0] === to),
    );
    return e ? e[2] : null;
  }
  function create(stage = "home") {
    if (!stages[stage]) stage = "home";
    const spec = stages[stage];
    return {
      stage,
      now: spec.startTime,
      at: spec.start,
      route: [],
      discovered: [spec.start],
      done: [],
      phase: "plan",
      active: null,
      event: false,
      record: [{ at: spec.startTime, text: node({ stage }, spec.start).name }],
      message: "",
      accumulator: 0,
      revision: 0,
    };
  }
  function discover(s, id) {
    if (!node(s, id)) return false;
    if (!s.discovered.includes(id)) s.discovered.push(id);
    return true;
  }
  function add(s, id) {
    if (
      !["plan", "event", "failed"].includes(s.phase) ||
      !s.discovered.includes(id) ||
      (s.at === id && !(id === stages[s.stage].goal && s.route.length)) ||
      s.route.includes(id) ||
      !node(s, id)
    )
      return false;
    s.route.push(id);
    s.revision++;
    return true;
  }
  function remove(s, id) {
    if (s.phase === "running") return false;
    const i = s.route.indexOf(id);
    if (i < 0) return false;
    s.route.splice(i, 1);
    s.revision++;
    return true;
  }
  function move(s, id, offset) {
    if (s.phase === "running") return false;
    const i = s.route.indexOf(id),
      j = i + offset;
    if (i < 0 || j < 0 || j >= s.route.length) return false;
    [s.route[i], s.route[j]] = [s.route[j], s.route[i]];
    s.revision++;
    return true;
  }
  function log(s, text) {
    s.record.push({ at: s.now, text });
    s.revision++;
  }
  function fail(s, message) {
    s.phase = "failed";
    s.active = null;
    s.accumulator = 0;
    s.message = message;
    log(s, message);
  }
  function arrive(s) {
    const target = node(s, s.active.to);
    s.at = target.id;
    s.active = null;
    log(s, target.name + "に到着");
    if (s.now < (target.open || 0)) {
      s.active = {
        kind: "wait",
        from: s.at,
        to: s.at,
        remaining: target.open - s.now,
        total: target.open - s.now,
      };
      s.message = `${time(target.open)}まで、ひと休み。`;
      return;
    }
    serve(s);
  }
  function serve(s) {
    const target = node(s, s.at);
    if (target.service && !s.done.includes(s.at)) {
      s.active = {
        kind: "task",
        from: s.at,
        to: s.at,
        remaining: target.service,
        total: target.service,
      };
      s.message =
        s.at === "bakery"
          ? "あたたかいパンを、紙袋へ。"
          : s.at === "florist"
            ? "花屋さんが、一輪を包んでくれる。"
            : target.name + "を済ませる。";
      return;
    }
    complete(s);
  }
  function complete(s) {
    if (s.route[0] === s.at) s.route.shift();
    const firstVisit = !s.done.includes(s.at);
    if (s.at !== stages[s.stage].goal && firstVisit) s.done.push(s.at);
    if (s.at === "bakery" && firstVisit) log(s, "焼きたてパンを受け取った");
    if (s.at === "florist" && firstVisit) log(s, "小さな花を添えた");
    if (s.stage === "mall" && s.at === "bakery" && !s.event) {
      s.event = true;
      s.phase = "event";
      s.accumulator = 0;
      s.message =
        "8:44の搬入リフトはお休み。花屋さんが屋上への通路を開けてくれました。";
      discover(s, "florist");
      log(s, "館内放送：リフト休止／花屋の通路が開いた");
      s.revision++;
      return;
    }
    if (s.at === stages[s.stage].goal) {
      const required = s.stage === "home" ? ["coffee", "laundry"] : ["bakery"];
      if (!required.every((id) => s.done.includes(id))) {
        fail(
          s,
          s.stage === "home"
            ? "まだ、コーヒーか洗濯ものが残っている。"
            : "パンを受け取りに、ベーカリーへ。",
        );
        return;
      }
      if (s.now > stages[s.stage].deadline) {
        fail(s, "少し遅くなった。別のつなぎ方を試そう。");
        return;
      }
      s.phase = "success";
      s.active = null;
      log(
        s,
        s.stage === "home"
          ? "いってきます。"
          : "パンを届けた。屋上に、朝が来た。",
      );
      return;
    }
    next(s);
  }
  function next(s) {
    if (!s.route.length) {
      s.phase = "plan";
      s.message = "ここから先を、つないでみよう。";
      s.active = null;
      s.accumulator = 0;
      s.revision++;
      return;
    }
    const to = s.route[0],
      duration = edge(s, s.at, to);
    if (duration === null) {
      fail(
        s,
        `${node(s, s.at).name}と${node(s, to).name}は直接つながっていない。手帳で通路を調べよう。`,
      );
      return;
    }
    if (s.stage === "mall" && s.at === "lift" && to === "roof") {
      const departures = s.event
        ? [minute(8, 52)]
        : [minute(8, 44), minute(8, 52)];
      const departure = departures.find((t) => t >= s.now);
      if (!departure || departure > stages.mall.deadline) {
        fail(s, "8:44便は出発できない。次の8:52便では間に合わない。");
        return;
      }
      if (s.now < departure) {
        s.active = {
          kind: "departure",
          from: s.at,
          to,
          remaining: departure - s.now,
          total: departure - s.now,
        };
        s.message = time(departure) + "便を待つ。";
        return;
      }
    }
    s.active = {
      kind: "walk",
      from: s.at,
      to,
      remaining: duration,
      total: duration,
    };
    s.message = node(s, to).name + "へ。";
    s.revision++;
  }
  function start(s) {
    if (!["plan", "event", "failed"].includes(s.phase) || !s.route.length)
      return false;
    s.phase = "running";
    s.active = null;
    s.accumulator = 0;
    s.message = "";
    next(s);
    s.revision++;
    return true;
  }
  function tick(s) {
    if (s.phase !== "running" || !s.active) return;
    s.now++;
    s.active.remaining--;
    s.revision++;
    if (s.now > stages[s.stage].deadline) {
      fail(
        s,
        `${time(s.now)}。届ける時間を過ぎてしまった。朝から組み直してみよう。`,
      );
      return;
    }
    if (s.active.remaining > 0) return;
    const kind = s.active.kind;
    if (kind === "walk") arrive(s);
    else if (kind === "wait") {
      s.active = null;
      serve(s);
    } else if (kind === "task") {
      s.active = null;
      complete(s);
    } else if (kind === "departure") {
      const to = s.active.to;
      s.active = {
        kind: "walk",
        from: s.at,
        to,
        remaining: edge(s, s.at, to),
        total: edge(s, s.at, to),
      };
    }
  }
  function update(s, dt) {
    if (s.phase !== "running" || !Number.isFinite(dt) || dt < 0) return;
    s.accumulator += dt;
    while (s.accumulator + 1e-9 >= 0.65 && s.phase === "running") {
      s.accumulator = Math.max(0, s.accumulator - 0.65);
      tick(s);
    }
  }
  const api = {
    stages,
    time,
    create,
    node,
    edge,
    discover,
    add,
    remove,
    move,
    start,
    update,
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MorningThread = api;
})(typeof window !== "undefined" ? window : globalThis);
