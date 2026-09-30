// # main.js - YAKITORI WARS: Pixel Art Consistency Update
// ==========================================
// 1. game/state.js - ゲームの状態管理
// ==========================================
let state = {};
function initGameState() {
    const currentTransition = (state && state.transition && state.transition.active) 
        ? state.transition 
        : { active: false, type: null, timer: 0, duration: 20, targetMode: null };
    state = {
        screen: "title", gameMode: "pvp", currentStage: 1, enemyName: "KENTA",
        aiLevel: 2, aiProfile: "master", round: 1, maxRounds: 13, 
        currentPlayer: 1, firstPlayer: 1, nextFirstPlayer: 1,
        gameOver: false, winnerText: "", winReason: "",
        isBusy: false, isAIThinking: false, transition: currentTransition,
        introSequenceActive: false, introSequenceDone: false, introPhase: null, 
        introVsTimer: 0, fightSplashTimer: 0, introOrderTimer: 0, 
        introPauseTimer: 0, orderIntroDone: false, todaysOrder: null, 
        
        extraOrder: null, extraOrderActive: false, extraOrderClaimed: false, 
        extraOrderWinner: null, extraOrderIntroActive: false, extraOrderIntroTimer: 0, 
        extraOrderSpawnRound: 7, 

        gameEndWaitTimer: 0, endSplashTimer: 0, endSplashText: "", endSplashColor: "#fff",
        resultScreenTimer: 0, resultPause: 0, resultPauseDone: false, hitStopTimer: 0,
        cookPreviewActive: false, 
        cookPreviewEvents: [], cookPreviewIndex: 0,
        cookPreviewPhase: null, cookPreviewPhaseTimer: 0,
        roundEndPauseTimer: 0,
        startRouletteActive: false, startRouletteInterval: 4, startRouletteTickTimer: 4,    
        startRouletteCount: 0, startRouletteMaxCount: 16, startRouletteIndex: 1,
        startRouletteFinalPlayer: null, startRouletteBlinkActive: false,
        startRouletteBlinkTimer: 0, startRouletteBlinkCount: 0,
        turnSplashTimer: 0, pendingTurnSplash: false, pendingAiBreath: false,
        pendingPlayer: null, aiBreathTimer: 0, 
        buildMode: null,
        buildModeStartTime: 0, pendingBox: null, uiHint: "tap",
        players: [
            { id: 1, score: 0, servedScore: 0, resources: 0, workersRemaining: 1, stats: { perfect: 0, burnt: 0, steal: 0 } },
            { id: 2, score: 0, servedScore: 0, resources: 0, workersRemaining: 1, stats: { perfect: 0, burnt: 0, steal: 0 } }
        ],
     
        lanes: [
            { id: "s1", fire: 1, type: "weak", owner: null, cookState: 0, uchiwaBoost: 0, justPlaced: false, built: false },
            { id: "s2", fire: 2, type: "medium", owner: null, cookState: 0, uchiwaBoost: 0, justPlaced: false, built: false },
            { id: "s3", fire: 3, type: "strong", owner: null, cookState: 0, uchiwaBoost: 0, justPlaced: false, built: false }
        ],
 
        visuals: {
            buttonClicks: {}, buttonErrors: {}, laneErrors: {}, laneFlashes: {}, placedAt: {}, 
            peakFlashes: {}, ghosts: [], floaters: [], statusMessages: [], particles: [], 
            cancelClick: 0, titleClick: null, perfectFlash: { timer: 0 }, resultComment: null,
            aiTargetLane: null, traces: [], uchiwaGusts: {}, pendingButtonAction: null 
        }
    };
}

initGameState();

function getPixelFont(size) { return `${size}px 'Press Start 2P', monospace`; }

// ==========================================
// 1.5. game/audio.js - 音声システム
// ==========================================

const SoundManager = {
    enabled: localStorage.getItem("yakitoriSoundEnabled") !== "false",
    unlocked: false,
    sounds: {},
    pools: {},
    poolSize: 4,
    loadFailed: {},

    files: {
        place: "place.wav",
        sizzle: "sizzle.wav",
        harvest: "harvest.wav",
        perfect: "perfect.wav",
        burnt: "burnt.wav",
        perfectServe: "harvest_perfect.wav",
        uchiwa: "uchiwa.wav",
        undercooked: "undercooked.wav"
    },

volumes: {
    place: 0.05,
    sizzle: 0.06,
    harvest: 0.07,
    perfect: 0.07,
    burnt: 0.06,
    perfectServe: 0.08,
    uchiwa: 0.07,
    undercooked: 0.07
},

    cooldowns: {
        place: 100,
        sizzle: 120,
        harvest: 100,
        perfect: 100,
        burnt: 100,
        perfectServe: 100,
        uchiwa: 100,
        undercooked: 100
    },

    lastPlayed: {},

    init: function() {
        const self = this;

        for (const key in this.files) {
            this.pools[key] = [];

            const orig = new Audio(this.files[key]);
            orig.addEventListener("error", function() {
                self.loadFailed[key] = true;
                console.warn("Sound file failed to load: " + key + " -> " + self.files[key]);
            });

            orig.addEventListener("canplaythrough", function() {
                if (self.loadFailed[key]) {
                    self.loadFailed[key] = false;
                }
            });
            this.sounds[key] = orig;

            for (let i = 0; i < this.poolSize; i++) {
                const audio = new Audio(this.files[key]);
                audio.volume = this.volumes[key] !== undefined ? this.volumes[key] : 0.25;
                audio.preload = "auto";
                audio.load();
                this.pools[key].push(audio);
            }
        }
    },

    unlock: function() {
        if (this.unlocked) return;

        this.unlocked = true;

        for (const key in this.pools) {
            const pool = this.pools[key];

            for (let i = 0; i < pool.length; i++) {
                const audio = pool[i];

                try {
                    audio.muted = true;
                    audio.currentTime = 0;

                    const p = audio.play();

                    if (p && p.then) {
                        p.then(function() {
                            audio.pause();
                            audio.currentTime = 0;
                            audio.muted = false;
                        }).catch(function() {
                            audio.muted = false;
                        });
                    } else {
                        audio.muted = false;
                    }
                } catch (e) {
                    audio.muted = false;
                }
            }
        }
    },

    play: function(name, options) {
        if (!this.enabled) return;

        if (!this.pools[name]) {
            console.warn("Unknown sound name: " + name);
            return;
        }

        if (this.loadFailed[name]) {
            console.warn("Sound was not loaded: " + name + " -> " + this.files[name]);
            return;
        }

        if (!this.unlocked) {
            this.unlock();
        }

        const now = Date.now();
        const cooldown = this.cooldowns && this.cooldowns[name] !== undefined ? this.cooldowns[name] : 100;
        
        options = options || {};
        const force = !!options.force;

        if (!force && this.lastPlayed[name] && now - this.lastPlayed[name] < cooldown) return;
        this.lastPlayed[name] = now;

        const pool = this.pools[name];
        let audio = null;

        for (let i = 0; i < pool.length; i++) {
            if (pool[i].paused || pool[i].ended) {
                audio = pool[i];
                break;
            }
        }

        if (!audio) {
            audio = pool[0];
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (e) {}
        }

        try {
            audio.volume = this.volumes[name] !== undefined ? this.volumes[name] : 0.25;
            audio.currentTime = 0;

            const p = audio.play();

            if (p && p.catch) {
                p.catch(function(e) {
                    console.warn("Sound play failed: " + name, e);
                });
            }
        } catch (e) {
            console.warn("Sound play error: " + name, e);
        }
    },

    setEnabled: function(value) {
        this.enabled = value;
        localStorage.setItem("yakitoriSoundEnabled", value ? "true" : "false");
    }
};





const SynthSfx = {
    ctx: null,
    masterGain: null,
    unlocked: false,
    enabled: true,
    warmed: false,
    lastPlayed: {},

    init: function() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext || this.ctx) return;

        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.70;
        this.masterGain.connect(this.ctx.destination);
    },

    unlock: function() {
        this.init();
        if (!this.ctx) return;

        this.unlocked = true;

        if (this.ctx.state === "suspended") {
            this.ctx.resume().catch(function(e) {
                console.warn("Synth resume failed", e);
            });
        }

        if (!this.warmed) {
            this.warmed = true;
            this.warmup();
        }
    },

    warmup: function() {
        if (!this.ctx || !this.masterGain) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(440, t);
        gain.gain.setValueAtTime(0.001, t);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.02);
    },

    play: function(name) {
        if (!this.enabled) return;

        this.unlock();

        if (!this.ctx || !this.masterGain) return;

        const now = Date.now();
        const cooldowns = {
            tap: 80,
            title: 150,
            roulette: 35,
            order: 150,
            meat: 120
        };
        const cooldown = cooldowns[name] || 80;

        if (this.lastPlayed[name] && now - this.lastPlayed[name] < cooldown) return;
        this.lastPlayed[name] = now;

        const self = this;

        switch (name) {
            case "tap":
                this.tone(520, 0.04, "square", 0.12);
                break;

            case "title":
                this.tone(420, 0.08, "square", 0.24);
                setTimeout(function() {
                    self.tone(720, 0.11, "square", 0.20);
                }, 45);
                break;

            case "roulette":
                this.tone(880, 0.025, "square", 0.08);
                break;

            case "order":
                this.noise(0.08, 0.11, 2500);
                setTimeout(function() {
                    self.tone(980, 0.05, "triangle", 0.09);
                }, 20);
                break;

            case "meat":
                this.tone(260, 0.07, "triangle", 0.26);
                setTimeout(function() {
                    self.tone(420, 0.07, "triangle", 0.22);
                }, 45);
                break;

            default:
                console.warn("Unknown synth sound name: " + name);
                break;
        }
    },

    tone: function(freq, duration, type, vol) {
        if (!this.ctx || !this.masterGain) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type || "sine";
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + duration);
    },

    noise: function(duration, vol, filterFreq) {
        if (!this.ctx || !this.masterGain) return;

        const t = this.ctx.currentTime;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = filterFreq || 1800;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(t);
        noise.stop(t + duration);
    }
};

SoundManager.init();
SynthSfx.init();

const unlockAllSoundOnce = function() {
    SoundManager.unlock();
    SynthSfx.unlock();

    window.removeEventListener("pointerdown", unlockAllSoundOnce, true);
    window.removeEventListener("touchstart", unlockAllSoundOnce, true);
    window.removeEventListener("click", unlockAllSoundOnce, true);
};

window.addEventListener("pointerdown", unlockAllSoundOnce, true);
window.addEventListener("touchstart", unlockAllSoundOnce, true);
window.addEventListener("click", unlockAllSoundOnce, true);

window.addEventListener("pointerdown", unlockAllSoundOnce);
window.addEventListener("touchstart", unlockAllSoundOnce);
window.addEventListener("click", unlockAllSoundOnce);

// ==========================================
// 2. render/layout.js - 定数とレイアウト設定 (メリハリ強化版)
// ==========================================
let LAYOUT = {
    CANVAS_WIDTH: window.innerWidth, CANVAS_HEIGHT: window.innerHeight,
    COLORS: {
        BG: "#0F0B0A",            
        TEXT_MAIN: "#E8DDC8",     // メイン文字
        TEXT_DIM: "#BFAE94",      // 弱い文字
        TEXT_STRONG: "#F3E6CC",   // 強調文字 (新設)
        TEXT_DARK: "#2A1A14",     // 濃い文字 (新設)
        P1: "#6EA6D8",            // P1:少し明るい青
        P2: "#D66A70",            // P2:少し明るい赤
        NEUTRAL: "#2A2A2E",       
        PANEL_BG: "#18110F",      
        OVERLAY_BG: "rgba(15, 11, 10, 0.8)", 
        STICK: "#B79C7A",         
        FIRE_BASE: "#E85F24",     // 中間炎
        FIRE_BOOST: "#FF9F2E",    // 明るい橙
        DOT_OFF: "#2B1D18",       
        HIGHLIGHT: "rgba(243, 230, 204, 0.2)"
    },
    BUTTONS: [
        { id: "meat", color: "#8B826B", icon: "meat" },           
        { id: "put", color: "#6F7480", icon: "put_skewer" },      
        { id: "harvest", color: "#8A675F", icon: "serve_plate" }, 
        { id: "uchiwa", color: "#9A7B5D", icon: "uchiwa" }        
    ]
};

const VISUAL_STATES = {
    RAW: { meat: "#E69A8A", negi: "#CFEA8A", dot: "#E8DDC8" },     // 肉ハイライト, ネギ明部
    OKAY: { meat: "#C86F62", negi: "#8FBF5F", dot: "#FF9F2E" },    // 肉中間, ネギ中間
    PERFECT: { meat: "#8F443C", negi: "#506B3A", dot: "#FFD15A" }, // 肉影, ネギ影
    BURNT: { meat: "#6A2F22", negi: "#312522", dot: "#A93A22" }    // 焼き目, 赤熱
};
const ICON_PALETTE = { 1:"#ffffff", 2:"#d95763", 3:"#8c3f5d", 4:"#df7126", 5:"#fbf236", 6:"#5fcde4", 7:"#8f563b", 8:"#ac3232", 9:"#e8ede7", 10:"#99e550", 11:"#ffcc66", 12:"#1a100c" };
const ICON_DATA = {
    meat:[0,0,0,0,0,0,0,0,0,0,2,2,2,2,0,0,0,2,3,2,2,2,2,0,1,3,3,3,2,2,2,1,1,3,3,3,2,2,2,1,0,2,3,2,2,2,2,0,0,0,2,2,2,2,0,0,0,0,0,0,0,0,0,0],
    uchiwa:[0,8,8,8,8,8,0,6,8,8,8,8,8,8,8,0,8,8,8,8,8,8,8,6,8,8,9,9,9,8,8,0,0,8,9,7,9,8,0,0,0,0,0,7,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,7,0,0,0,0],
    diamond:[0,0,0,1,6,0,0,0,0,0,1,6,6,6,0,0,0,1,6,6,6,6,6,0,1,6,6,6,6,6,6,6,0,6,6,6,6,6,6,0,0,0,6,6,6,6,0,0,0,0,0,6,6,0,0,0,0,0,0,0,0,0,0,0],
    fire:[0,0,0,4,0,0,0,0,0,0,4,5,4,0,0,0,0,4,4,5,4,4,0,0,0,4,5,5,5,4,0,0,4,5,5,5,5,5,4,0,4,4,5,5,5,4,4,0,0,4,4,4,4,4,0,0,0,0,0,0,0,0,0,0],
    put_skewer:[0,0,11,0,0,0,0,0,0,2,2,2,0,0,0,0,0,2,2,2,0,0,0,0,0,0,11,0,0,0,0,0,0,2,2,2,0,0,0,0,0,2,2,2,0,0,0,0,0,0,11,0,0,0,0,0,0,0,11,0,0,0,0,0],
    burnt_skewer:[0,0,11,0,0,0,0,0,0,12,12,12,0,0,0,0,0,12,12,12,0,0,0,0,0,0,11,0,0,0,0,0,0,12,12,12,0,0,0,0,0,12,12,12,0,0,0,0,0,0,11,0,0,0,0,0,0,0,11,0,0,0,0,0],
    serve_plate:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,10,7,7,0,0,11,7,7,10,7,7,11,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,0],
    clock:[0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,1,0,1,0,0,1,0,0,1,0,1,1,0,1,0,0,1,0,0,0,0,1,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    warning:[0,0,0,8,8,0,0,0,0,0,8,11,11,8,0,0,0,0,8,11,11,8,0,0,0,0,8,11,11,8,0,0,0,0,8,11,11,8,0,0,0,0,0,8,8,0,0,0,0,0,8,11,11,8,0,0,0,0,0,8,8,0,0,0],
    trash:[0,0,0,0,0,0,0,0,0,8,8,0,0,8,8,0,0,0,8,8,8,8,0,0,0,0,0,8,8,0,0,0,0,0,8,8,8,8,0,0,0,8,8,0,0,8,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    up_arrow:[0,0,0,1,1,0,0,0,0,0,1,1,1,1,0,0,0,1,1,1,1,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    cross:[0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,1,0,0,1,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,1,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0],
    customer:[0,0,0,1,1,0,0,0,0,0,1,1,1,1,0,0,0,1,11,1,11,1,0,0,0,1,1,1,1,1,0,0,0,0,1,11,11,1,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
};

function getVisualPalette(status) { return VISUAL_STATES[status] || VISUAL_STATES.RAW; }
function getLaneBounds(index) {
    const laneW = Math.min(90, LAYOUT.CANVAS_WIDTH * 0.28), laneH = Math.min(180, LAYOUT.CANVAS_HEIGHT * 0.3), gap = 15;
    const totalW = (laneW * 3) + (gap * 2), startX = (LAYOUT.CANVAS_WIDTH - totalW) / 2, y = LAYOUT.CANVAS_HEIGHT / 2 - laneH / 2 - 40;
    return { x: startX + index * (laneW + gap), y, w: laneW, h: laneH };
}
function getButtonBounds(index) {
    const positionMap = [0, 1, 3, 2], displayIndex = positionMap[index], col = displayIndex % 2, row = Math.floor(displayIndex / 2);
    const btnW = Math.min(150, LAYOUT.CANVAS_WIDTH * 0.42), btnH = Math.min(80, LAYOUT.CANVAS_HEIGHT * 0.12), gapX = 15, gapY = 15;
    const totalW = (btnW * 2) + gapX, startX = (LAYOUT.CANVAS_WIDTH - totalW) / 2, totalH = (btnH * 2) + gapY;
    const y = LAYOUT.CANVAS_HEIGHT - totalH - Math.max(30, LAYOUT.CANVAS_HEIGHT * 0.05);
    return { x: startX + col * (btnW + gapX), y: y + row * (btnH + gapY), w: btnW, h: btnH };
}
function getCancelButtonBounds() {
    const btnW = Math.min(315, LAYOUT.CANVAS_WIDTH * 0.85 + 15), btnH = Math.min(60, LAYOUT.CANVAS_HEIGHT * 0.1);
    const startX = (LAYOUT.CANVAS_WIDTH - btnW) / 2, y = LAYOUT.CANVAS_HEIGHT - btnH - Math.max(10, LAYOUT.CANVAS_HEIGHT * 0.02);
    return { x: startX, y, w: btnW, h: btnH };
}
const getTime = () => performance.now();

// ==========================================
// 3. game/flow.js - ゲーム進行とスコア
// ==========================================
const COOK_PREVIEW_DUR = 75;
const STAGE_CONFIG = {
    1: { profile: "gambler", level: 1, enemyName: "KENTA" }, 2: { profile: "thief", level: 2, enemyName: "HIDEKI" },
    3: { profile: "reader", level: 3, enemyName: "TETSUYA" }, 4: { profile: "master", level: 4, enemyName: "MAKOTO" },
    5: { profile: "master", level: 5, enemyName: "BOSS" }
};
const TODAYS_ORDERS = [
    { id: "strong", label: "HOT", icon: "fire", bonus: "+2", color: "#fa3" },
    { id: "burnt", label: "BURNT OK", icon: "burnt_skewer", bonus: "+1", color: "#3c2a23" },
    { id: "steal", label: "STEAL OK", icon: "meat", bonus: "+3", color: "#f33" }
];
function isTutorialStage() { return false; }
function canUseExtraOrder() { return state.gameMode === "ai" && state.currentStage >= 4; }
function getRandomOrder() { return TODAYS_ORDERS[Math.floor(Math.random() * TODAYS_ORDERS.length)]; }

function assignOrderForCurrentStage() {
    if (state.gameMode === "ai") {
        if (state.currentStage === 1) state.todaysOrder = TODAYS_ORDERS.find(o => o.id === "burnt");
        else if (state.currentStage === 2) state.todaysOrder = TODAYS_ORDERS.find(o => o.id === "strong");
        else if (state.currentStage === 3) state.todaysOrder = TODAYS_ORDERS.find(o => o.id === "steal");
        else state.todaysOrder = getRandomOrder();
    } else {
        state.todaysOrder = getRandomOrder();
    }
}

function updateTransition() {
    if (state.transition && state.transition.active) {
        state.transition.timer++;
        if (state.transition.timer === state.transition.duration) {
            if (state.transition.type === "titleToGame") startGame(state.transition.targetMode);
        }
        if (state.transition.timer >= state.transition.duration * 2) state.transition.active = false;
    }
}

function updateIntroSequence() {
    if (!state.introSequenceActive) return;
    if (state.introPhase === "vs") {
        state.introVsTimer--;
        if (state.introVsTimer <= 0) { state.introPhase = "fight"; state.fightSplashTimer = 25;
        }
    } else if (state.introPhase === "fight") {
        state.fightSplashTimer--;
        if (state.fightSplashTimer <= 0) { 
            if (!state.todaysOrder) {
                state.orderIntroDone = true;
                state.introPhase = "pause"; 
                state.introPauseTimer = 15;
            } else {
                state.introPhase = "order";
                state.introOrderTimer = 120;
                SynthSfx.play("order");
            }
        }
    } else if (state.introPhase === "order") {
        state.introOrderTimer--;
        if (state.introOrderTimer <= 0) { 
            state.orderIntroDone = true;
            state.introPhase = "pause"; 
            state.introPauseTimer = 15;
        }
    } else if (state.introPhase === "pause") {
        state.introPauseTimer--;
        if (state.introPauseTimer <= 0) { 
            state.introSequenceActive = false;
            state.introSequenceDone = true; 
            state.pendingTurnSplash = true;
        }
    }
}

function updateGameEndWait() {
    if (state.gameOver && state.gameEndWaitTimer > 0) {
        if (state.endSplashTimer > 0) state.endSplashTimer--;
        state.gameEndWaitTimer--;
        if (state.gameEndWaitTimer <= 0) {
            state.resultScreenTimer = 0;
            const p1 = state.players[0].finalScore || state.players[0].score, p2 = state.players[1].finalScore || state.players[1].score;
            if (p1 > p2) {
                if (state.gameMode === "ai") {
                    if (state.currentStage >= 5) { state.screen = "clear";
                        state.winnerText = "SURVIVAL CLEAR"; }
                    else { state.screen = "stage_clear";
                        state.winnerText = "STAGE CLEAR"; }
                } else { state.screen = "gameover";
                        state.winnerText = "P1 WIN"; }
            } else if (p2 > p1) { 
                const winnerName = state.gameMode === "ai" ?
                    state.enemyName : "P2";
                state.screen = "gameover"; state.winnerText = `${winnerName} WIN`;
            } else { 
                if (state.gameMode === "ai") { retryStage();
                    return; } 
                else { state.screen = "gameover";
                    state.winnerText = "DRAW"; }
            }
        }
    }
}

function setupAIForStage(stageNumber) {
    const conf = STAGE_CONFIG[stageNumber];
    if (!conf) return false;
    state.currentStage = stageNumber; state.enemyName = conf.enemyName; state.aiLevel = conf.level; state.aiProfile = conf.profile; return true;
}

function startGame(mode) {
    initGameState(); 
    state.gameMode = mode;
    state.screen = "game";
    if (mode === "ai") setupAIForStage(1);
    
    assignOrderForCurrentStage();
    state.startRouletteActive = true; state.startRouletteInterval = 4; state.startRouletteTickTimer = 4; state.startRouletteCount = 0;
    state.startRouletteIndex = 1;
    state.startRouletteMaxCount = 15 + Math.floor(Math.random() * 2); state.startRouletteBlinkActive = false; state.startRouletteFinalPlayer = null;
}

function retryStage() {
    const stg = state.currentStage, prevMode = state.gameMode;
    initGameState(); 
    state.gameMode = prevMode;
    state.screen = "game";
    setupAIForStage(stg);
    
    assignOrderForCurrentStage();
    state.startRouletteActive = true; state.startRouletteInterval = 4;
    state.startRouletteTickTimer = 4; state.startRouletteCount = 0; state.startRouletteIndex = 1;
    state.startRouletteMaxCount = 15 + Math.floor(Math.random() * 2); state.startRouletteBlinkActive = false;
    state.startRouletteFinalPlayer = null;
}

function nextStage() {
    const nextStg = state.currentStage + 1; if (nextStg > 5) return;
    const prevMode = state.gameMode; 
    initGameState(); 
    state.gameMode = prevMode; state.screen = "game"; setupAIForStage(nextStg);
    
    assignOrderForCurrentStage();
    state.startRouletteActive = true;
    state.startRouletteInterval = 4;
    state.startRouletteTickTimer = 4; state.startRouletteCount = 0; state.startRouletteIndex = 1;
    state.startRouletteMaxCount = 15 + Math.floor(Math.random() * 2);
    state.startRouletteBlinkActive = false;
    state.startRouletteFinalPlayer = null;
}

function updateAllScores() { state.players.forEach(p => p.score = p.servedScore || 0); }
function getBaseHeat(type) { if (type === "weak") return 1; if (type === "medium") return 2;
    if (type === "strong") return 3; return 1; }

function spawnSmokeEffect(laneIndex, amount, status) {
    const b = getLaneBounds(laneIndex);
    const laneCx = b.x + b.w / 2;
    const stickTop = b.y + b.h * 0.1;
    const meatY = stickTop + (b.h * 0.7) * 0.4;
    
    if (status === "burnt") {
        // BURNTの場合:大粒の黒煙をやめ、小さな焦げカスを少しだけ飛ばす
        const numParticles = 2 + Math.floor(amount / 2);
        for (let i = 0; i < numParticles; i++) {
            state.visuals.particles.push({
                x: laneCx + (Math.random() - 0.5) * 16, 
                y: meatY + (Math.random() - 0.5) * 16,  
                vx: (Math.random() - 0.5) * 0.1, // 横方向への移動をほぼなくす
                vy: -0.3 - Math.random() * 0.4,  // 上昇も控えめに
                life: 0, maxLife: 15 + Math.random() * 10, 
                size: 1 + Math.random() * 1,     // サイズを極小(1〜2)に
                color: Math.random() > 0.5 ? "#3c2a23" : "#2a1c18", // 真っ黒ではなく暗い焦げ茶
                isSmoke: true
            });
        }
    } else {
        // 通常の焼き進行:美味しそうな湯気・油・香りのみにする
        
        // 1. 白〜クリーム色の小さな湯気
        const numSteam = 2 + Math.floor(amount / 2);
        for (let i = 0; i < numSteam; i++) {
            state.visuals.particles.push({
                x: laneCx + (Math.random() - 0.5) * 16, 
                y: meatY + (Math.random() - 0.5) * 10,  
                vx: (Math.random() - 0.5) * 0.1, // 横揺れを抑える
                vy: -0.4 - Math.random() * 0.4,             
                life: 0, maxLife: 20 + Math.random() * 15, size: 2 + Math.random() * 2, 
                color: Math.random() > 0.5 ? "#f4f0e6" : "#ffffff",
                isSteam: true
            });
        }
        
        // 2. 小さな黄色〜橙色の油はぜ
        const numSizzle = 1 + amount;
        for (let i = 0; i < numSizzle; i++) {
            state.visuals.particles.push({
                x: laneCx + (Math.random() - 0.5) * 12, 
                y: meatY + (Math.random() - 0.5) * 16,  
                vx: (Math.random() - 0.5) * 0.4, 
                vy: -0.8 - Math.random() * 0.8,             
                life: 0, maxLife: 10 + Math.random() * 6, size: 1.5 + Math.random() * 1.5, 
                color: Math.random() > 0.5 ? "#ffaa33" : "#ffcc55",
                isSizzle: true
            });
        }
        
        // 3. 薄ベージュの香り粒子(目立たない程度に)
        const numAroma = 1 + Math.floor(amount / 2);
        for (let i = 0; i < numAroma; i++) {
            state.visuals.particles.push({
                x: laneCx + (Math.random() - 0.5) * 16, 
                y: meatY + (Math.random() - 0.5) * 16,  
                vx: (Math.random() - 0.5) * 0.1, 
                vy: -0.2 - Math.random() * 0.2,             
                life: 0, maxLife: 15 + Math.random() * 10, size: 1 + Math.random() * 1, 
                color: "#e6c8a0",
                isAroma: true
            });
        }
    }
}

function spawnJuwaSmoke(laneIndex, amount, status) {
    const b = getLaneBounds(laneIndex);
    const laneCx = b.x + b.w / 2;
    const stickTop = b.y + b.h * 0.1;
    const meatCenterY = stickTop + (b.h * 0.7) * 0.3;
    if (status === "burnt") {
        const numCrumbs = 2 + Math.floor(amount / 2);
        for (let i = 0; i < numCrumbs; i++) {
            state.visuals.particles.push({
                x: laneCx + (Math.random() - 0.5) * 20, 
                y: meatCenterY + (Math.random() - 0.5) * 20,  
                vx: (Math.random() - 0.5) * 0.05, 
                vy: -0.2 - Math.random() * 0.3,
                life: 0, maxLife: 15 + Math.random() * 10, 
                size: 1 + Math.random() * 1.5,
                color: Math.random() > 0.5 ? "#3c2a23" : "#2a1c18", 
                baseAlpha: 1.0,
                isSmoke: true
            });
        }
        return;
    }

    const steamSources = [
        { x: laneCx, y: meatCenterY - 18 },
        { x: laneCx, y: meatCenterY + 16 }
    ];
    const spawnBurst = function(burstIndex) {
        const numLargeSteam = 6 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numLargeSteam; i++) {
            const src = steamSources[Math.floor(Math.random() * steamSources.length)];
            state.visuals.particles.push({
                x: src.x + (Math.random() - 0.5) * 35, 
                y: src.y + (Math.random() - 0.5) * 16,  
                vx: (Math.random() - 0.5) * 0.4, 
                vy: -0.4 - Math.random() * 0.4, 
                life: 0, maxLife: 45 + Math.random() * 25, 
                size: 8 + Math.random() * 6, 
                color: Math.random() > 0.5 ? "#f4f0e6" : "#ebe5d8", 
                baseAlpha: 0.45 + Math.random() * 0.2, 
                isSteam: true,
                isLargeSteam: true 
            });
        }

        const numSteam = 4 + Math.floor(amount);
        for (let i = 0; i < numSteam; i++) {
            const src = steamSources[Math.floor(Math.random() * steamSources.length)];
            state.visuals.particles.push({
                x: src.x + (Math.random() - 0.5) * 25, 
                y: src.y + (Math.random() - 0.5) * 16,  
                vx: (Math.random() - 0.5) * 0.2, 
                vy: -0.6 - Math.random() * 0.5,        
                life: 0, maxLife: 20 + Math.random() * 15, 
                size: 3 + Math.random() * 2, 
                color: "#e8e4d8",
                baseAlpha: 0.75,
                isSteam: true
            });
        }
        
        if (burstIndex === 0) {
            const sizzleCount = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < sizzleCount; i++) {
                const src = steamSources[Math.floor(Math.random() * steamSources.length)];
                state.visuals.particles.push({
                    x: src.x + (Math.random() - 0.5) * 20, 
                    y: src.y + (Math.random() - 0.5) * 16,  
                    vx: (Math.random() - 0.5) * 0.6, 
                    vy: -1.2 - Math.random() * 0.8,             
                    life: 0, maxLife: 12 + Math.random() * 8, 
                    size: 1.5 + Math.random() * 1.5, 
                    color: Math.random() > 0.5 ? "#ffcc55" : "#ffaa33", 
                    baseAlpha: 1.0,
                    isSizzle: true
                });
            }
        }
    };

    spawnBurst(0);
    setTimeout(function() { spawnBurst(1); }, 100);
    setTimeout(function() { spawnBurst(2); }, 200);
}

function spawnPerfectPopEffect(laneIndex) {
    const b = getLaneBounds(laneIndex);
    const laneCx = b.x + b.w / 2;
    const stickTop = b.y + b.h * 0.2;
    for (let i = 0; i < 8; i++) {
        state.visuals.particles.push({
            x: laneCx + (Math.random() - 0.5) * 30, 
            y: stickTop + (Math.random() - 0.5) * 40 + 20,
            vx: (Math.random() - 0.5) * 2.0, 
            vy: -1.0 - Math.random() * 2.5,
            life: 0, maxLife: 15 + Math.random() * 10, 
            size: 3 + Math.random() * 4,
            color: Math.random() > 0.5 ? "#ffffff" : "#ffeb3b",
            isSparkle: true
        });
    }
}

function spawnPerfectHarvestEffect(laneIndex) {
    const b = getLaneBounds(laneIndex), laneCx = b.x + b.w / 2, meatY = b.y + b.h * 0.4, colors = ["#fff7b0", "#ffdf6b", "#ffffff"];
    for (let i = 0; i < 24; i++) {
        state.visuals.particles.push({
            x: laneCx + (Math.random() - 0.5) * 50, y: meatY + (Math.random() - 0.5) * 30,  
            vx: (Math.random() - 0.5) * 2.5, vy: -1.5 - Math.random() * 3.5, 
            life: 0, maxLife: 30 + Math.random() * 30, size: 4 + Math.random() * 6,
            color: colors[Math.floor(Math.random() * colors.length)], isSparkle: true 
        });
    }
}

function advanceAllSkewersAtRoundEnd() {
    state.cookPreviewEvents = [];
    state.lanes.forEach((n, index) => {
        if (n.built) {
            if (n.justPlaced) n.justPlaced = false;
            else {
                const baseHeat = getBaseHeat(n.type), boost = n.uchiwaBoost || 0;
                const prevCookState = n.cookState, prevStatus = getCookLabel(n.type, prevCookState);
                n.cookState = Math.min(8, n.cookState + baseHeat + boost);
                const newStatus = getCookLabel(n.type, n.cookState);
                if (n.cookState > prevCookState) {
                    state.cookPreviewEvents.push({ laneIndex: index, prevCookState: prevCookState, newCookState: n.cookState, prevStatus: prevStatus, newStatus: newStatus });
                    if (newStatus === "burnt" && prevStatus !== "burnt" && n.owner) state.players[n.owner - 1].stats.burnt++;
                }
            }
        }
        n.uchiwaBoost = 0;
    });
}

function updateCookPreview() {
    if (!state.cookPreviewActive) return;
    if (!state.cookPreviewEvents || state.cookPreviewEvents.length === 0) { finishEndRound(); return;
    }
    if (state.cookPreviewIndex >= state.cookPreviewEvents.length) { finishEndRound(); return; }
    const CHANGE_TIME = 50;
    if (state.cookPreviewPhase === "show" && state.cookPreviewPhaseTimer === CHANGE_TIME) {
        const event = state.cookPreviewEvents[state.cookPreviewIndex];
        if (event) {
            let smokeAmount = event.newCookState - event.prevCookState;
            spawnJuwaSmoke(event.laneIndex, smokeAmount, event.newStatus); 
            SoundManager.play("sizzle");
            if (event.prevStatus !== "perfect" && event.newStatus === "perfect") {
                SoundManager.play("perfect");
                spawnPerfectPopEffect(event.laneIndex);
                state.visuals.peakFlashes[state.lanes[event.laneIndex].id] = performance.now();
                state.visuals.perfectFlash = { timer: 15 };
            } else if (event.prevStatus !== "burnt" && event.newStatus === "burnt") {
                SoundManager.play("burnt");
            }
        }
    }
    state.cookPreviewPhaseTimer--;
    if (state.cookPreviewPhaseTimer <= 0) {
        state.cookPreviewIndex++;
        if (state.cookPreviewIndex >= state.cookPreviewEvents.length) { finishEndRound();
        } 
        else { state.cookPreviewPhase = "show"; state.cookPreviewPhaseTimer = COOK_PREVIEW_DUR;
        }
    }
}

function tryEndRound() {
    advanceAllSkewersAtRoundEnd();
    if (state.cookPreviewEvents.length > 0) {
        state.cookPreviewActive = true; state.cookPreviewIndex = 0;
        state.cookPreviewPhase = "show"; state.cookPreviewPhaseTimer = COOK_PREVIEW_DUR; 
    } else { finishEndRound(); }
}

function finishEndRound() {
    state.cookPreviewActive = false;
    state.cookPreviewEvents = [];
    if (state.round >= state.maxRounds) {
        state.gameOver = true; updateAllScores();
        state.players.forEach(p => { p.finalScore = (p.servedScore || 0) + (p.resources || 0); });
        const p1 = state.players[0].finalScore, p2 = state.players[1].finalScore;
        if (p1 > p2) {
            if (state.gameMode === "ai") {
                if (state.currentStage >= 5) { state.endSplashText = "SURVIVAL CLEAR";
                    state.endSplashColor = "#ffeb3b"; } 
                else { state.endSplashText = "STAGE CLEAR";
                    state.endSplashColor = "#ffeb3b"; }
            } else { state.endSplashText = "P1 WIN";
                state.endSplashColor = LAYOUT.COLORS.P1; }
        } else if (p2 > p1) {
            const winnerName = state.gameMode === "ai" ? state.enemyName : "P2";
            state.endSplashText = `${winnerName} WIN`; state.endSplashColor = LAYOUT.COLORS.P2;
        } else { state.endSplashText = "DRAW"; state.endSplashColor = "#aaa"; }
        state.endSplashTimer = 55; state.gameEndWaitTimer = 55; return;
    }
    state.roundEndPauseTimer = 60; 
}

function updateRoundEndPause() {
    if (state.roundEndPauseTimer > 0) {
        state.roundEndPauseTimer--;
        if (state.roundEndPauseTimer <= 0) { startNewRound(); }
    }
}

function isAIPlayer(playerIndex) { return state.gameMode === "ai" && playerIndex === 2; }
function consumeWorker() {
    const p = state.players[state.currentPlayer - 1]; p.workersRemaining -= 1;
    state.buildMode = null;
    state.pendingBox = null; updateAllScores(); switchTurn();
}
function switchTurn() {
    state.isBusy = true;
    setTimeout(() => {
        const nextP = 3 - state.currentPlayer;
        if (state.players[nextP - 1].workersRemaining > 0) {
            state.pendingPlayer = nextP; state.pendingTurnSplash = true; 
            if (isAIPlayer(nextP)) state.pendingAiBreath = true;
        } else if (state.players[state.currentPlayer - 1].workersRemaining <= 0) { tryEndRound(); }
        state.isBusy = false;
    }, 800);
}

function startNewRound() {
    state.round++; state.players.forEach(p => p.workersRemaining = 1);
    state.buildMode = null; state.pendingBox = null;
    state.currentPlayer = state.firstPlayer;
    state.pendingPlayer = state.firstPlayer; state.pendingTurnSplash = true; state.pendingAiBreath = false;
}

function updateRoulette() {
    if (state.startRouletteActive) {
        state.startRouletteTickTimer--;
        if (state.startRouletteTickTimer <= 0) {
            state.startRouletteIndex = 3 - state.startRouletteIndex;
            state.startRouletteCount++;
            SynthSfx.play("roulette");
            state.startRouletteInterval *= 1.12; state.startRouletteTickTimer = Math.floor(state.startRouletteInterval);
            if (state.startRouletteCount >= state.startRouletteMaxCount) {
                state.startRouletteActive = false;
                state.startRouletteBlinkActive = true;
                state.startRouletteBlinkTimer = 6; state.startRouletteBlinkCount = 0; state.startRouletteFinalPlayer = state.startRouletteIndex;
            }
        }
    } else if (state.startRouletteBlinkActive) {
        state.startRouletteBlinkTimer--;
        if (state.startRouletteBlinkTimer <= 0) {
            state.startRouletteBlinkCount++; state.startRouletteBlinkTimer = 6;
            if (state.startRouletteBlinkCount >= 7) { 
                state.startRouletteBlinkActive = false;
                state.firstPlayer = state.startRouletteFinalPlayer;
                state.currentPlayer = state.startRouletteFinalPlayer; state.pendingPlayer = state.startRouletteFinalPlayer;
                state.introSequenceActive = true; state.introPhase = "vs"; state.introVsTimer = 60;
            }
        }
    }
}

function hasActiveImportantMessage() {
    const now = performance.now();
    return state.visuals.statusMessages.some(m =>
        (m.type === "score" || m.isPerfect || m.isBonus || m.type === "result") && (now - m.startTime < (m.duration || 1000) - 200)
    );
}

function resolvePendingTurnFlow() {
    if (state.cookPreviewActive || state.introSequenceActive || state.roundEndPauseTimer > 0) return;
    if (state.extraOrderIntroActive) {
        state.extraOrderIntroTimer--;
        if (state.extraOrderIntroTimer <= 0) { state.extraOrderIntroActive = false; }
        return; 
    }

    if (state.pendingTurnSplash) { 
        if (hasActiveImportantMessage()) return;
        state.turnSplashTimer = 45; 
        state.pendingTurnSplash = false;
    }
    
    if (state.turnSplashTimer > 0) state.turnSplashTimer--;
    else if (state.pendingPlayer !== null) {
        if (state.pendingAiBreath) { state.aiBreathTimer = 15;
            state.pendingAiBreath = false; }
        else if (state.aiBreathTimer <= 0) { state.currentPlayer = state.pendingPlayer;
            state.pendingPlayer = null; }
    }
    if (state.aiBreathTimer > 0) state.aiBreathTimer--;
}

// ==========================================
// 4. game/rules.js - 調理ルールとアクション
// ==========================================
function getCookLabel(laneType, cv) {
    if (laneType === "weak") { 
        if (cv >= 8) return "burnt";
        if (cv >= 6) return "perfect"; 
        if (cv === 5) return "okay";
    } 
    else if (laneType === "strong") {
        if (cv >= 7) return "burnt";
        if (cv === 6) return "perfect";
        if (cv >= 4) return "okay";
    }
    else { 
        if (cv >= 7) return "burnt"; 
        if (cv === 6) return "perfect";
        if (cv === 5) return "okay"; 
    }
    return "early";
}

function hasPerfectHarvestTarget(playerIndex) {
    const p = state.players[playerIndex - 1];
    for (let n of state.lanes) {
        if (n.built) { const status = getCookLabel(n.type, n.cookState);
            if (status === "perfect" && (n.owner === playerIndex || p.resources >= 1)) return true;
        }
    }
    return false;
}
function brightenColor(hex, ratio) {
    hex = hex.replace(/^#/, ''); if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
    let r = parseInt(hex.substring(0,2), 16), g = parseInt(hex.substring(2,4), 16), b = parseInt(hex.substring(4,6), 16);
    r = Math.min(255, Math.floor(r + (255 - r) * ratio)); g = Math.min(255, Math.floor(g + (255 - g) * ratio));
    b = Math.min(255, Math.floor(b + (255 - b) * ratio));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function mixColor(color1, color2, weight) {
    let c1 = color1.replace(/^#/, ''); let c2 = color2.replace(/^#/, '');
    if (c1.length === 3) c1 = c1.split('').map(c => c+c).join('');
    if (c2.length === 3) c2 = c2.split('').map(c => c+c).join('');
    const r1 = parseInt(c1.substring(0,2), 16), g1 = parseInt(c1.substring(2,4), 16), b1 = parseInt(c1.substring(4,6), 16);
    const r2 = parseInt(c2.substring(0,2), 16), g2 = parseInt(c2.substring(2,4), 16), b2 = parseInt(c2.substring(4,6), 16);
    const r = Math.round(r1 * (1 - weight) + r2 * weight), g = Math.round(g1 * (1 - weight) + g2 * weight), b = Math.round(b1 * (1 - weight) + b2 * weight);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function getHarvestScore(node, isSteal, status) {
    let score = 0;
    const heat = getBaseHeat(node.type);
    const order = state.todaysOrder ? state.todaysOrder.id : null;

    if (status === "early") return -5;
    if (status === "burnt") {
        score = isSteal ? 0 : -2;
        if (order === "burnt") score = 1;
    } else {
        if (heat === 1) score = (status === "perfect") ? 12 : 3;
        else if (heat === 3) score = (status === "perfect") ? 6 : 2;
        else score = (status === "perfect") ? 8 : 2;
    }

    if (order === "strong" && node.type === "strong" && score > 0) score += 2;
    if (order === "steal" && isSteal && score > 0) score += 3;

    return score;
}
function canUseMeat(playerIndex) { return true; }
function canUseSkewer(playerIndex) { return state.players[playerIndex - 1].resources >= 1 && state.lanes.some(l => !l.built); }
function canUseServe(playerIndex) {
    const p = state.players[playerIndex - 1];
    for (let n of state.lanes) {
        if (n.built) { const status = getCookLabel(n.type, n.cookState);
            if (status === "burnt" || n.owner === playerIndex || (p.resources >= 1 && (status === "okay" || status === "perfect"))) return true;
        }
    }
    return false;
}
function canUseUchiwa(playerIndex) { return state.lanes.some(l => l.built); }

function placeWorker(boxId) {
    const p = state.players[state.currentPlayer - 1];
    if (boxId === 1) { 
        p.resources += 1;
        SynthSfx.play("meat");
        const panelW = Math.min(100, LAYOUT.CANVAS_WIDTH * 0.25);
        const px = state.currentPlayer === 1 ?
        10 + panelW / 2 : LAYOUT.CANVAS_WIDTH - panelW - 10 + panelW / 2;
        const py = 15 + 95 + 10;
        state.visuals.statusMessages.push({ type: "meat", amount: 1, player: state.currentPlayer, x: px, y: py, startTime: performance.now(), duration: 800 });
        consumeWorker();
    } else {
        state.isBusy = true;
        setTimeout(function() {
            if (boxId === 2 && p.resources >= 1) { state.buildMode = "sapling"; state.pendingBox = boxId; state.buildModeStartTime = performance.now(); }
            else if (boxId === 3) { state.buildMode = "harvest"; state.pendingBox = boxId; state.buildModeStartTime = performance.now(); }
            else if (boxId === 4) { state.buildMode = "uchiwa"; state.pendingBox = boxId; state.buildModeStartTime = performance.now(); }
            state.isBusy = false;
        }, 80);
    }
}


function tryBuildNode(node) {
    const p = state.players[state.currentPlayer - 1];
    if (p.resources >= 1 && !node.built) {
        p.resources -= 1;
        const b = getLaneBounds(state.lanes.indexOf(node));
        state.visuals.statusMessages.push({ type: "meat", amount: -1, player: state.currentPlayer, x: b.x + b.w / 2, y: b.y + b.h / 2, startTime: performance.now(), duration: 800 });
        node.built = true; node.owner = state.currentPlayer;
        SoundManager.play("place");
        node.cookState = 0; node.justPlaced = true;
        state.visuals.placedAt[node.id] = performance.now(); consumeWorker();
    }
}

function tryHarvestNode(node) {
    const p = state.players[state.currentPlayer - 1]; if (!node.built) return;
    const stolenFrom = node.owner, isSteal = (stolenFrom !== null && stolenFrom !== state.currentPlayer), status = getCookLabel(node.type, node.cookState);
    const laneIndex = state.lanes.indexOf(node);
    const b = getLaneBounds(laneIndex);
    const msgX = b.x + b.w / 2;
    const msgY = b.y + b.h * 0.2;
    const scoreMsgY = msgY - 15;
    const meatMsgY = msgY + 20;
    if (isSteal) {
        if (status === "early") return;
        if (status !== "burnt") {
            if (p.resources < 1) return;
            p.resources -= 1;
            state.visuals.statusMessages.push({ type: "meat", amount: -1, player: state.currentPlayer, x: msgX, y: meatMsgY, startTime: performance.now(), duration: 800, isSteal: true });
            if (stolenFrom !== null && state.players[stolenFrom - 1]) {
                state.players[stolenFrom - 1].resources += 1;
                const panelW = Math.min(100, LAYOUT.CANVAS_WIDTH * 0.25);
                const stolenPx = stolenFrom === 1 ? 10 + panelW / 2 : LAYOUT.CANVAS_WIDTH - panelW - 10 + panelW / 2;
                state.visuals.statusMessages.push({ type: "meat", amount: 1, player: stolenFrom, x: stolenPx, y: 15 + 95 + 10, startTime: performance.now() + 150, duration: 800, isSteal: true });
            }
            state.hitStopTimer = 4;
        }
    }
    const scoreGained = getHarvestScore(node, isSteal, status); p.servedScore += scoreGained;
    
    if (status === "perfect") {
        SoundManager.play("perfectServe", { force: true });
    } else if (status === "burnt") {
        SoundManager.play("burnt", { force: true });
    } else {
        SoundManager.play("harvest", { force: true });
    }
    
    if (status === "perfect") p.stats.perfect++; if (status === "burnt") p.stats.burnt++; if (isSteal && scoreGained > 0) p.stats.steal++;
    let isBonus = false; let bonusText = "";
    const order = state.todaysOrder ? state.todaysOrder.id : null;
    if (order === "strong" && node.type === "strong" && scoreGained > 0 && status !== "early") { isBonus = true;
bonusText = "ORDER!"; }
    if (order === "steal" && isSteal && scoreGained > 0) { isBonus = true;
bonusText = "ORDER!"; }
    if (order === "burnt" && status === "burnt") { isBonus = true;
bonusText = "ORDER!"; }

    if (scoreGained !== 0 || status === "burnt" || status === "early") { 
        let duration = 1000;
        if (status === "perfect") duration = 1500;
        else if (isBonus) duration = 1300;
        state.visuals.statusMessages.push({ 
            type: "score", amount: scoreGained, player: state.currentPlayer, 
            startTime: performance.now(), duration: duration, isPerfect: status === "perfect",
            status: status,
            isBonus: isBonus, bonusText: bonusText, x: msgX, y: scoreMsgY
        });
    }

    if (status === "perfect") { 
        spawnPerfectHarvestEffect(laneIndex);
        state.hitStopTimer = 8;
        state.visuals.traces.push({ laneIndex: laneIndex, type: "perfect", time: performance.now() });
    } else if (status === "burnt") {
        spawnSmokeEffect(laneIndex, 2, "burnt");
        state.visuals.traces.push({ laneIndex: laneIndex, type: "burnt", time: performance.now() });
    } else if (status === "okay") {
        state.visuals.traces.push({ laneIndex: laneIndex, type: "okay", time: performance.now() });
    }
    
    state.visuals.ghosts.push({ laneIndex: laneIndex, status: status.toUpperCase(), startTime: performance.now(), cookState: node.cookState, owner: node.owner });
    node.built = false; node.owner = null; node.cookState = 0; node.justPlaced = false; consumeWorker();
}




function tryUchiwaNode(node) {
    if (node.built) { 
        node.uchiwaBoost += 1;
        SoundManager.play("uchiwa");

        const laneIndex = state.lanes.indexOf(node);
        const b = getLaneBounds(laneIndex);
        state.visuals.statusMessages.push({ type: 'fire', amount: 1, player: state.currentPlayer, startTime: performance.now(), duration: 800, x: b.x + b.w/2, y: b.y + b.h*0.2 });
        state.visuals.uchiwaGusts[node.id] = performance.now();
        consumeWorker();
    }
}


function isNodeValidForMode(node, mode) {
    if (!node) return false;
    if (mode === "sapling") return !node.built;
    if (mode === "harvest") { if (!node.built) return false;
        if (node.owner === state.currentPlayer) return true; return getCookLabel(node.type, node.cookState) !== "early";
    }
    if (mode === "uchiwa") return node.built; return false;
}

// ==========================================
// 5. game/input.js - 入力処理
// ==========================================
function isInputLocked() {
    if (state.startRouletteActive || state.startRouletteBlinkActive || state.introSequenceActive || state.cookPreviewActive || state.roundEndPauseTimer > 0 || state.extraOrderIntroActive) return true;
    const cp = state.currentPlayer;
    return state.screen !== "game" || state.isBusy || state.isAIThinking || state.pendingPlayer !== null ||
        state.turnSplashTimer > 0 || state.aiBreathTimer > 0 || state.gameOver || state.players[cp - 1].workersRemaining <= 0 || isAIPlayer(cp);
}
function handleCanvasClick(event, canvas) {
    const rect = canvas.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
    if (state.screen === "title") {
        if (state.isBusy || (state.transition && state.transition.active)) return;
        const cx = LAYOUT.CANVAS_WIDTH / 2, cy = LAYOUT.CANVAS_HEIGHT / 2;
        const btnW = 240, btnH = 56, gapY = 76, btnStartY = cy + 90;
        const btnAi = { x: cx - btnW/2, y: btnStartY, w: btnW, h: btnH };
        const btnPvp = { x: cx - btnW/2, y: btnStartY + gapY, w: btnW, h: btnH };
        if (x >= btnAi.x && x <= btnAi.x + btnAi.w && y >= btnAi.y && y <= btnAi.y + btnAi.h) { 
            state.visuals.titleClick = "ai";
            SynthSfx.play("title");
            state.transition = { active: true, type: "titleToGame", timer: 0, duration: 20, targetMode: "ai" };
        } 
        else if (x >= btnPvp.x && x <= btnPvp.x + btnPvp.w && y >= btnPvp.y && y <= btnPvp.y + btnPvp.h) { 
            state.visuals.titleClick = "pvp";
            SynthSfx.play("title");
            state.transition = { active: true, type: "titleToGame", timer: 0, duration: 20, targetMode: "pvp" };
        }
        return;
    } else if (state.screen === "clear") {
        if (state.resultScreenTimer < 300) return;
        SynthSfx.play("tap");
        initGameState(); return;
    } else if (state.screen === "gameover" || state.screen === "stage_clear") {
        if (state.resultScreenTimer < 55) return;
        const cy = LAYOUT.CANVAS_HEIGHT / 2;
        SynthSfx.play("tap");
        if (state.screen === "stage_clear") {
            const retryY = cy + 135 + 30;
            if (y >= retryY - 15 && y <= retryY + 15) retryStage(); else nextStage();
        } else { if (state.gameMode === "ai") retryStage(); else startGame("pvp"); }
        return;
    }
    
    if (state.introSequenceActive && state.introPhase === "order") {
        state.introOrderTimer = 0;
        return;
    }
    
    if (isInputLocked()) return;
    if (state.buildMode) {
        const cb = getCancelButtonBounds();
        if (x >= cb.x && x <= cb.x + cb.w && y >= cb.y && y <= cb.y + cb.h) {
            state.visuals.cancelClick = performance.now();
            SynthSfx.play("tap");
            state.isBusy = true;
            setTimeout(function() { state.buildMode = null; state.pendingBox = null; state.isBusy = false; }, 150); return;
        }
        for (let i = 0; i < state.lanes.length; i++) {
            const l = getLaneBounds(i), padding = 15, node = state.lanes[i];
            if (x >= l.x - padding && x <= l.x + l.w + padding && y >= l.y - padding && y <= l.y + l.h + padding) {
                if (isNodeValidForMode(node, state.buildMode) || (state.buildMode === "harvest" && node.built && node.owner === state.currentPlayer && getCookLabel(node.type, node.cookState) === "early")) {
                    if (state.buildMode === "sapling") tryBuildNode(node);
                    else if (state.buildMode === "harvest") tryHarvestNode(node); else if (state.buildMode === "uchiwa") tryUchiwaNode(node);
                }
                return;
            }
        }
        return;
    }
    for (let i = 0; i < LAYOUT.BUTTONS.length; i++) {
        const b = getButtonBounds(i);
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
            const boxId = i + 1;
            let canUse = false;
            if (boxId === 1) canUse = canUseMeat(state.currentPlayer); if (boxId === 2) canUse = canUseSkewer(state.currentPlayer);
            if (boxId === 3) canUse = canUseServe(state.currentPlayer); if (boxId === 4) canUse = canUseUchiwa(state.currentPlayer);
            if (canUse) { 
                state.visuals.buttonClicks[i] = performance.now();
                if (boxId !== 1) {
                    SynthSfx.play("tap");
                }
                
                state.visuals.pendingButtonAction = {
                    index: i,
                    boxId: boxId,
                    startTime: performance.now(),
                    duration: 140
                };
                state.isBusy = true;
                
                setTimeout(function() {
                    if (state.visuals) state.visuals.pendingButtonAction = null;
                    placeWorker(boxId);
                }, 140);
                
            } 
            else if (!isInputLocked()) {
                let reason = "";
                if (boxId === 2) reason = state.players[state.currentPlayer - 1].resources < 1 ? "NO MEAT" : "FULL";
                if (boxId === 3) reason = "NO TARGET"; if (boxId === 4) reason = "NO TARGET";
                if (reason) { 
                    state.visuals.statusMessages.push({ type: "hint", text: reason, startTime: performance.now(), duration: 800, x: b.x + b.w/2, y: b.y - 15 });
                    state.visuals.buttonErrors[i] = performance.now(); 
                }
            }
            return;
        }
    }
}


// ==========================================
// 6. game/ai.js - AIロジック
// ==========================================
const AI_LEVEL_CONFIG = {
    1: { rand: 0.40, mistake: 0.30, futWt: 0.10, allowUchiwa: false, topCandRange: 3, scoreNoise: 10, closeThresh: 8, closeRate: 0.35 },
    2: { rand: 0.20, mistake: 0.15, futWt: 0.20, allowUchiwa: true,  topCandRange: 3, scoreNoise: 6,  closeThresh: 6, closeRate: 0.25 },
    3: { rand: 0.10, mistake: 0.05, futWt: 0.30, allowUchiwa: true,  topCandRange: 2, scoreNoise: 3,  closeThresh: 5, closeRate: 0.20 },
    4: { rand: 0.03, mistake: 0.01, futWt: 0.50, allowUchiwa: true,  topCandRange: 2, scoreNoise: 1.5, closeThresh: 4, closeRate: 0.10 },
    5: { rand: 0.15, mistake: 0.20, futWt: 0.40, allowUchiwa: true,  topCandRange: 3, scoreNoise: 4,  closeThresh: 6, closeRate: 0.25 }
};
function buildActionCandidates(currentState, playerIndex) {
    const actions = []; const p = currentState.players[playerIndex - 1];
    actions.push({ type: "meat" });
    if (p.resources >= 1) { currentState.lanes.forEach(n => { if (!n.built) actions.push({ type: "put", nodeId: n.id }); }); }
    currentState.lanes.forEach(n => { if (n.built) { actions.push({ type: "serve", nodeId: n.id }); actions.push({ type: "uchiwa", nodeId: n.id }); } });
    return actions;
}
function isActionValidForAI(currentState, action, playerIndex, profileName, levelConf) {
    const p = currentState.players[playerIndex - 1];
    const node = currentState.lanes.find(l => l.id === action.nodeId);
    if (action.type === "meat" && p.resources >= 2) return false;
    if (action.type === "put") return true;
    if (action.type === "serve") {
        if (!node) return false;
        const isOwn = node.owner === playerIndex, lbl = getCookLabel(node.type, node.cookState);
        if (isOwn) { if (lbl === "early") return false; } 
        else { if (lbl === "early") return false;
            if (lbl !== "burnt" && p.resources < 1) return false; }
        return true;
    }
    if (action.type === "uchiwa") {
        if (!levelConf.allowUchiwa || !node || !node.built) return false;
        const isOwn = node.owner === playerIndex, cv = node.cookState, heat = getBaseHeat(node.type);
        const boosted_lbl = getCookLabel(node.type, cv + heat + 1), curr_lbl = getCookLabel(node.type, cv);
        if (isOwn) { if (boosted_lbl === "burnt") return false; if (curr_lbl === "perfect") return false;
            if (boosted_lbl === "early" && profileName !== "reader") return false;
        } else { if (boosted_lbl === "burnt" && curr_lbl !== "burnt") return true;
            if (profileName === "thief" && (boosted_lbl==="okay"||boosted_lbl==="perfect") && curr_lbl==="early") return true; return false;
        }
        return true;
    }
    return true;
}
function scoreAIAction(currentState, action, playerIndex, profileName) {
    let score = 0; const p = currentState.players[playerIndex - 1];
    const node = currentState.lanes.find(l => l.id === action.nodeId);
    const order = currentState.todaysOrder ? currentState.todaysOrder.id : null;
    if (action.type === "meat") { 
        if (p.resources === 0) score += 15;
        else if (p.resources === 1) score -= 1; else score -= 15;
    }
    else if (action.type === "put") { 
        score += 10;
        if (profileName === "gambler" && node.type === "strong") score += 40;
        if (profileName === "master" && node.type === "weak") score += 15;
        if (order === "strong" && node.type === "strong") score += 15;
    }
    else if (action.type === "serve") {
        const lbl = getCookLabel(node.type, node.cookState), isOwn = node.owner === playerIndex;
        const isSteal = !isOwn;
        
        const actualScore = getHarvestScore(node, isSteal, lbl);
        score += actualScore * 10;
        if (lbl === "burnt") { 
            score += 25;
            if (profileName === "master") score += 20;
            if (profileName === "gambler") score -= 10;
            if (order === "burnt") score += 15;
        }
        else if (!isOwn) { 
            if (lbl === "perfect") score += (profileName === "thief" ? 80 : 30);
            if (lbl === "okay") score += (profileName === "thief" ? 50 : 10);
            if (order === "steal") score += 25;
        } else { 
            if (lbl === "perfect") score += 100;
            if (lbl === "okay") { score += (profileName === "gambler" ? 45 : 15);
            }
        }
    } else if (action.type === "uchiwa") {
        const isOwn = node.owner === playerIndex, boosted_lbl = getCookLabel(node.type, node.cookState + getBaseHeat(node.type) + 1);
        if (isOwn) { 
            if (boosted_lbl === "perfect") score += 75;
            if (boosted_lbl === "okay") score += 15;
        } else { 
            if (boosted_lbl === "burnt") score += 85;
        }
    }
    return score;
}

function playAITurn() {
    if (!isAIPlayer(state.currentPlayer)) return;
    if (state.screen !== "game" || state.isBusy || state.isAIThinking || state.gameOver || state.introSequenceActive) return;
    if (state.pendingPlayer !== null || state.turnSplashTimer > 0 || state.aiBreathTimer > 0 || state.cookPreviewActive || state.startRouletteActive || state.startRouletteBlinkActive) return;
    if (state.players[state.currentPlayer - 1].workersRemaining <= 0) return;
    
    state.isAIThinking = true;
    const levelConf = AI_LEVEL_CONFIG[state.aiLevel] || AI_LEVEL_CONFIG[2], profile = state.aiProfile;
    let cands = buildActionCandidates(state, state.currentPlayer).filter(a => isActionValidForAI(state, a, state.currentPlayer, profile, levelConf));
    if (cands.length === 0) cands.push({ type: "meat" });
    let scored = cands.map(a => ({ action: a, score: scoreAIAction(state, a, state.currentPlayer, profile) + (Math.random() * 2 - 1) * levelConf.scoreNoise }));
    scored.sort((a, b) => b.score - a.score); let best = scored[0].action;
    if (scored.length > 1) {
        if (Math.random() < levelConf.mistake) { let pool = scored.filter((s, i) => i >= 1 && i <= 2 && (scored[0].score - s.score) <= 15);
            if (pool.length > 0) best = pool[Math.floor(Math.random() * pool.length)].action; }
        else if (Math.random() < levelConf.rand) { let pool = scored.slice(0, levelConf.topCandRange).filter(s => (scored[0].score - s.score) <= 12);
            if (pool.length > 1) best = pool[Math.floor(Math.random() * pool.length)].action; }
        else { let second = scored[1];
            if ((scored[0].score - second.score) <= levelConf.closeThresh && Math.random() < levelConf.closeRate) best = second.action;
        }
    }

    let delay = 450;
    if (best.type === "meat") delay = 250 + Math.random() * 100;
    else if (best.type === "put") delay = 400 + Math.random() * 150;
    else if (best.type === "serve") delay = 500 + Math.random() * 200;
    else if (best.type === "uchiwa") delay = 650 + Math.random() * 250;
    if (best.nodeId) {
        state.visuals.aiTargetLane = {
            laneId: best.nodeId,
            startTime: performance.now(),
            duration: Math.min(delay, 500)
        };
    }

    setTimeout(() => {
        try {
            if (best.type === "meat") placeWorker(1);
            else if (best.type === "put") { state.buildMode="sapling"; state.buildModeStartTime=performance.now(); tryBuildNode(state.lanes.find(l=>l.id===best.nodeId)); }
            else if (best.type === "serve") { state.buildMode="harvest"; state.buildModeStartTime=performance.now(); tryHarvestNode(state.lanes.find(l=>l.id===best.nodeId)); }
            else if (best.type === "uchiwa") { state.buildMode="uchiwa"; state.buildModeStartTime=performance.now(); tryUchiwaNode(state.lanes.find(l=>l.id===best.nodeId)); }
        } finally { state.isAIThinking = false; }
    }, delay);
}

// ==========================================
// 7. render/render.js - 描画処理
// ==========================================

// ==========================================
// YAKITORI PIXEL ART SPRITES & PALETTE
// ==========================================
const YAKITORI_PIXEL_UNIT = 4;

const YAKITORI_PALETTE = {
    ".": null,      
    "O": "#0b0a0a", "S": "#161313", "1": "#2b2d35", "2": "#454854", "3": "#747887",
    "k": "#111111", "d": "#26211f", "a": "#3a302b", "r": "#8a2f18", "o": "#d75a20", "y": "#f0a13a",
    "5": "#bba888", "6": "#886655", "W": "#2a2a2a", "w": "#1f1f1f", 
    "P": "#e8b4b4", "p": "#d69898", "q": "#c27c7c", "Q": "#b06666", 
    "E": "#ebf5df", "e": "#a3c97b", "f": "#719e48",
    "H": "#ffffff", "L": "#fadd78", "M": "#cf6825", "D": "#782208", "C": "#380d02", 
    "V": "#fcffe6", "N": "#acbf34", "B": "#4c5e15", "J": "#fcdb4e", 
    "x": "#422620", "z": "#1c0d0a", "j": "#806640", "b": "#4f5c3c",  
    "U": "#6b544b", "I": "#5c4033"
};

const YAKITORI_GRILL_PARTS = {
    base: [
        "11111111111111111111111111111111", "22222222222222222222222222222222", "11111111111111111111111111111111", "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
        "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO",
        "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO",
        "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO",
        "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO",
        "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO",
        "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO",
        "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO",
        "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO",
        "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "SSOOOOOOOOOOOOOOOOOOOOOOOOOOOOSS",
        "11SSSSSSSSSSSSSSSSSSSSSSSSSSSS11", "33333333333333333333333333333333", "22222222222222222222222222222222", "11111111111111111111111111111111",
        "11111111111111111111111111111111", "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO"
    ],
    net: [
        "................................", "................................", "................................", "................................",
        "................................", "................................", "................................", "................................",
        "................................", "................................", "................................", "................................",
        "...1.1111..11.1.1.11.11...111...", "........1..........1............", "........1..........1............", "........1..........1............",
        "........1..........1............", "...................1............", "........1.......................", "........1..........1............",
        "........1..........1............", "........1..........1............", "........1..........1............", "................................",
        "...111111O1111111111O1.111111...", "........1..........1............", "........1..........1............", "........1..........1............",
        "........1..........1............", "................................", "........1..........1............", "........1..........1............",
        "........1..........1............", "........1..........1............", "................................", "...2222222222O222222222222O22...",
        "...1111111111O111111111111O11...", "........2..........2............", "........2..........2............", "........1..........1............",
        "........1..........1............", "................................", "................................", "................................",
        "................................", "................................", "................................", "................................"
    ]
};

// [ADD_AFTER: YAKITORI_COAL_PATTERN]
const YAKITORI_COAL_PATTERNS = {
    weak: [
        "....ddaddddddddddadddd..........",
        "..ddadddkkkkkkkddadddddd........",
        ".ddddkkkkkakkkkkkkddadddd.......",
        ".ddkkkkkkkkkkkkkkkkakkddd.......",
        "..ddkkkkrkkkdddkkkkkkkddd.......",
        "...dddkkkkkkadddkkkkkdddd.......",
        "....dddkkkrkkddddddkkddddd......",
        "....ddkkkkkkdddkkkkaddddd.......", 
        "....ddadddddddkkkkkkddddd.......",
        ".....ddddaddddkkkkkddddd........",
        "......ddddkddddddadddd..........",
        ".......ddkkkkddddddd............",
        "........ddadddddddd.............",
        "..........dddddd................",
        "................................"
    ],
    medium: [
        "....dddddddddddddddddd..........",
        "..ddddddkkkkkkkddddddddd........",
        ".ddddkkkkkkkkkkkkkddddddd.......",
        ".ddkkkkkkrkkkkkkkrrrkkddd.......",
        "..ddkkkrrrrkdddkkrrrkkddd.......",
        "...dddkkkkkkddddkkkkkdddd.......",
        "....dddkkkkkkddddddkkddddd......",
        "....ddkkkrrkdddkkkkdddddd.......", 
        "....ddddddddddkkrrkkddddd.......",
        ".....dddddddddkkkkkddddd........",
        "......ddddkddddddddddd..........",
        ".......ddkkkkddddddd............",
        "........ddddddddddd.............",
        "..........dddddd................",
        "................................"
    ],
    strong: [
        "....dddddddddddddddddd..........",
        "..ddddrrkkkkrrkddddddddd........",
        ".ddrrkkrrrrkkkkrrrddddddd.......",
        ".ddkrrrroorrrrrrrorrrkddd.......",
        "..ddkrooyyyorrkrooyrrkddd.......",
        "...ddrroooorrddrrooorrddd.......",
        "....ddrrooookddrdrrrkddddd......",
        "....ddkrroordddkrrrkddddd.......", 
        "....ddddrrddddkkroorkdddd.......",
        ".....dddddddddkkrrrrdddd........",
        "......ddddkddddddrdddd..........",
        ".......ddkkrrddddddd............",
        "........ddddddddddd.............",
        "..........dddddd................",
        "................................"
    ]
};
// [END_PATCH]
const YAKITORI_SKEWER_SPRITES = {
raw: [
    ".....55.....", ".....55.....", ".....55.....", ".....55.....",

    // 上の肉(少し小さめ)
// 上の肉:少し小さめだが、削れ感を減らす版
    "..Ppppppp...",
    ".Pppqqqqqq..",
    "pqqqqqqqqqQ.",
    "pqqqqqqqqqqQ",
    ".qqqqqqqqqQQ",
    ".qqqqqqQQQQ.",
    "..qqqQQQQQ..",
    "...qQQQQ....",

    // ねぎ
    "...Eeeeff...",
    "..EEEeeeff..",
    "..eEEeeeff..",
    "..eeEeeeff..",
    "...eeffff...",

    // 下の肉(今の大きめ感を維持)
    "..Ppppppp...",
    ".Pppqqqqqqq.",
    "pqqqqqqqqqQ.",
    "pqqqqqqqqqqQ",
    ".qqqqqqqqqQQ",
    ".qqqqqqQQQQ.",
    "..qqqQQQQQ..",
    "...qQQQQ....",

    ".....55.....", ".....55.....", ".....55.....", ".....55.....",
    ".....55.....", ".....55.....", ".....55.....", ".....66.....", ".....66....."
],
    cooked: [
        ".....55.....", "....W55.....", "...w.55.w...", ".....55.....", 
        "...HHLLMM...", ".HHLMMMMDC..", "LHLMMMMDDC..", "LLMMMMMDDDC.", "MMMMMMMDDDC.", 
        ".MMMMMDDDC..", ".CMMMDDCCC..", "..CMDDCC....", 
        "...VJNNB....", "..VVJNNNBB..", ".JJVVNNNBB..", ".JJJNNNBBC..", "..JNNBBC....", 
        "...HHLLMM...", ".HHLMMMMDC..", "LLLMMMMDDC..", "LMMMMMMDDDC.", ".MMMMMDDDC..", 
        ".CMMMMDDCC..", "..CMMDDCC...", "...MDDCC....", 
        ".....55.....", ".....55.....", ".....55.....", ".....55.....", ".....55.....", 
        ".....55.....", ".....55.....", ".....66.....", ".....66....."  
    ],
    burnt: [
        "..w..55..w..", ".W...55...W.", "..w..55..w..", ".....55.....", 
        "...UIxxz....", "..jIxxzzzz..", ".UIxxzzzzx..", "jIIxxzzzzzI.", "IIxxzzzzzzI.",
        ".IxxxzzzxI..", ".IxxzzCCzz..", "..xCzzzI....", 
        "...Ubbbk....", "..jIbbbbkk..", ".jIIbbbbkk..", ".jIxbbkkzz..", "..Ixbkkz....", 
        "...UIxxz....", "..jIxxzzzz..", "UIIxxzzzzx..", "IIxxzzzzzzI.", ".IxxxzzzxI..", 
        ".IxxzzCCzz..", "..xCzzzI....", "...CzzI.....", 
        ".....55.....", ".....55.....", ".....55.....", ".....55.....", ".....55.....", 
        ".....55.....", ".....55.....", ".....66.....", ".....66....."  
    ]
};
const TITLE_LOGO_PALETTE = {
    ".": null, "A": "#000000", "B": "#ffda00", "C": "rgba(13,3,0,0.86)", 
    "D": "#ff6f00", "E": "#d44600", "F": "#380400", "G": "#ffa100", "H": "#f81b00"
};

const TITLE_LOGO_DATA = [
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    ".....................................................................................................A..........................",
    "....................................................................................................ABA.........................",
    "....................................................................................................ABA.........................",
    "..........................AAAA....CCCC..............................................................ADA.........................",
    ".........................CBBEFA..CBBDFC.CCCCC....CCCFC..CCCC.CFFFFCA.FFFFFFFC...CCCCCA..CFCCFCC...CCFFFCC.......................",
    ".........................CBBBCCCABBBBFCCFBBBBC..CFBBBA.CFBBCCCBGBBBAFBBBBBBBBF.CFBBBBFCCFBBBBBBF.CGGEDEECA......................",
    ".........................CBGBBFCBBGBBFCCBBGGGCC.CFBGGCCFBGGFACBGBBBAFDBGBGGBBFCFBBBBBBFAFGGBGGBBFCFGGEEFFA......................",
    ".........................CFGGGGCBBGBFFCFBGBGDDCCCFBBBFFBGBFFACBDDGBCFBBBGGBBBFFBGGGBBBFCFGGBFBGBBAFFEFEFCC......................",
    "..........................CGGGBFBBGGFFCBBGGBGBFAAFGGGCBBGEFAAAFBGGACFFFEGGCFFCFGGBFGGGGCCGBFCFBBBAFFFFFFCC......................",
    "..........................CFGGGGBBBAFCFBBBFBGBFCCFBGDGGBEFAACAFDGGACCFCBBDFCCCBGBFCFGGBFABDFFFGGGACCCCCCCC......................",
    "...........................CGEGBBDDFCCFGDDFBDGDCAFGGDDDECCCCCAFBGGACCCCBGDCCCCGGDCCCGDGFABGGFBBGGACCFGFFC.......................",
    "...........................CCGDDDGFFCCFGGFCCDGGCCFDDDGDACCAACAFEDBCCCCCBEDCCCCGGDFCCGGDFABDDDGDECCCFCFCC........................",
    "............................CDDDDDFCCFDDGFCFDDGFCFDGGDGDCCCAAAFDDDCCCCCBDDCCCCGGDFCCDDGFADEDDDDFCCFFBEBEF.......................",
    "............................CEDDDGCAFFEDDDDEDDEFCFDEGFGDDCCCCAFDDDACCFCBDDCCAAEEEGCFDDBFAEDDGEDFCCFBEFFCFC......................",
    "............................ADDDEDCCCEEEEEEDEEEDFFDDGFCGDECCCCFEEEAACACBEEACCADDEDDDEEDFADDDCEDDCCCFBEBECA......................",
    "............................ADEEGGCCFEEECFFFEDDEFFDEEECDEEEECFEEEEGAFCEEEEEFAAFEDEEEDDFCFEEDCFEEFCFEFFFFFC......................",
    "............................FEEEEECCEEEEACACEEEEFCDEEECDDEEEFFEEEEEACCEEEEEFCCCEEEEEEEFCFEEDDFEEDCFEEDDFFC......................",
    "............................CEEEEECAEEEEECAEEEEEFCEEEDAEEEEDFFEEEEEACCEEEEEFCCCFEEEEEFCAFEEDDFEEECFGEFFEFC......................",
    "............................CEEEEECCCCCCCCAFFFCFCCFFFFCCFFFFFFFFFFFACCFFFFFCAFFCFFFFFCAAFFFFFCCFFCCFFFFFFC......................",
    "............................CCCCCCCCFFFFFFAACCCCCCCCCCACACCCCCCCCACACCCCCCCCACCCCCCCCACAACCCCACFFFFCCEACC.......................",
    "............................CFFFFFFCCCCFFCCCDDDCCCDCCFDDDCCGDDDDGCCCHDDDDDDFCCCEDDDDDDCACCCCCACFFCCAADC.........................",
    ".............................ACCAACCA.....CCHHEFCCHFCFHHECCEHHHHECCCHHHEDDHHECEHHDDHHHEC......AAAAA.CDC.........................",
    "..........................................ACHHHHCHHHCHHHCCCHHDDHHHCCCHHACCHHHCHHHCCFHHHA............ADA.........................",
    "...........................................CFHHHFHHHCHHHFCHHHCCHHHACCHHACFHHHCHHHHDCCCCA.............A..........................",
    "...........................................CFHHHHHEHHHHHCCHHHCCHHHHCCHHHHHHHCCCHHHHHHHFA........................................",
    "............................................FHHHHHFHHHHFCCHHHHHHHHHCCHHHHHHFCCCCCCCHHHHAA.......................................",
    "........................................AAAACCHHHHFHHHHACHHHHHHHHHHCCHHACFHHCCHHHHCFHHHCCCCCAA..................................",
    "...................................AAAAACCCCCCHHHCCFHHHAFHHHHCCHHHHCHHHHCHHHHCHHHHHHHHHAFFFFCCAAA...............................",
    "................................AAACCFCFFFFFFCHHHFCCHEHCCHEHHCCHHHECHHHEFHEHHCCHHHHEEHCCFFFFFFCCCA..............................",
    "...............................AACCCFFFFFFFFFCCCCCCCCCCCCCFCCCCCFFFFFFFFCCFCCCCCCCCCCCCAFFFFFFFCCAA.............................",
    "................................AAAACFFFFFFFFFFCCFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFCFFFFFFCCAA..............................",
    ".....................................AACCFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFCCAAA................................",
    "...........................................AAAAACCCFFFFFFFFFFFFFFCFFFFFFFFFFFFFCFCCCCAAAAAA.....................................",
    ".....................................................AAAACAACAAAAACAAAAAAAAAA...................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................",
    "................................................................................................................................"
];

function drawYakitoriSpriteMap(ctx, x, y, spriteArray, offsetX = 0, offsetY = 0) {
    for (let row = 0; row < spriteArray.length; row++) {
        const line = spriteArray[row];
        for (let col = 0; col < line.length; col++) {
            const char = line[col];
            if (char !== ".") {
                const color = YAKITORI_PALETTE[char];
                if (!color) continue;
                ctx.fillStyle = color;
                ctx.fillRect(Math.floor(x) + (col + offsetX) * YAKITORI_PIXEL_UNIT, Math.floor(y) + (row + offsetY) * YAKITORI_PIXEL_UNIT, YAKITORI_PIXEL_UNIT, YAKITORI_PIXEL_UNIT);
            }
        }
    }
}

function drawYakitoriSolidShadow(ctx, x, y, spriteArray, offsetX, offsetY) {
    for (let row = 0; row < spriteArray.length; row++) {
        const line = spriteArray[row];
        for (let col = 0; col < line.length; col++) {
            const c = line[col];
            if (c !== "." && c !== "W" && c !== "w" && YAKITORI_PALETTE[c]) {
                ctx.fillStyle = ((col + row) % 2 === 0) ? YAKITORI_PALETTE["O"] : YAKITORI_PALETTE["S"];
                ctx.fillRect(Math.floor(x) + (col + offsetX) * YAKITORI_PIXEL_UNIT, Math.floor(y) + (row + offsetY) * YAKITORI_PIXEL_UNIT, YAKITORI_PIXEL_UNIT, YAKITORI_PIXEL_UNIT);
            }
        }
    }
}

function drawYakitoriOutline(ctx, x, y, spriteArray, offsetX, offsetY, color) {
    ctx.fillStyle = "rgba(26, 12, 8, 0.85)";
    const u = 4;
    for (let row = 0; row < spriteArray.length; row++) {
        const line = spriteArray[row];
        for (let col = 0; col < line.length; col++) {
            const c = line[col];
            if (c !== "." && c !== "W" && c !== "w" && c !== "5" && c !== "6" && YAKITORI_PALETTE[c]) {
                const px = Math.floor(x) + (col + offsetX) * u;
                const py = Math.floor(y) + (row + offsetY) * u;
                ctx.fillRect(px - u, py, u, u);
                ctx.fillRect(px + u, py, u, u);
                ctx.fillRect(px, py - u, u, u);
                ctx.fillRect(px, py + u, u, u);
            }
        }
    }
}


function drawYakitoriSilhouette(ctx, x, y, spriteArray, offsetX, offsetY, color) {
    ctx.fillStyle = color;
    const u = 4;
    for (let row = 0; row < spriteArray.length; row++) {
        const line = spriteArray[row];
        for (let col = 0; col < line.length; col++) {
            const c = line[col];
            if (c !== "." && c !== "W" && c !== "w" && YAKITORI_PALETTE[c]) {
                ctx.fillRect(Math.floor(x) + (col + offsetX) * u, Math.floor(y) + (row + offsetY) * u, u, u);
            }
        }
    }
}



function getFadeAlpha(currentTimer, maxTimer, fadeFrames = 10) {
    if (currentTimer > maxTimer - fadeFrames) return Math.max(0, (maxTimer - currentTimer) / fadeFrames);
    if (currentTimer < fadeFrames) return Math.max(0, currentTimer / fadeFrames); return 1.0;
}

// 【完全ドット絵化】半透明を廃止し、ソリッドなピクセル枠を描画する
function drawBevelRect(ctx, x, y, w, h, baseColor, isPressed = false) {
    // ピクセルグリッドにスナップ(小数点座標によるアンチエイリアスを防ぐ)
    const px = Math.round(x);
    const py = Math.round(y);
    const pw = Math.round(w);
    const ph = Math.round(h);
    const scale = 4; // ドットの粗さ(仮想ピクセルサイズ)

    // ソリッドなハイライトとシャドウの色を計算(rgbaの重ねがけは禁止)
    const lightColor = brightenColor(baseColor, 0.4);
    const darkColor = mixColor(baseColor, "#000000", 0.6);
    const darkestColor = mixColor(baseColor, "#000000", 0.85);
    // 1. 背景の塗りつぶし
    ctx.fillStyle = baseColor;
    ctx.fillRect(px, py, pw, ph);
    // 2. ドット絵らしいソリッドな枠線(上が明るく、下が暗い)
    if (isPressed) {
        // 押下時:全体が沈み、上部が一番暗くなる
        ctx.fillStyle = darkestColor;
        ctx.fillRect(px, py, pw, scale * 2); // 上の深い影
        ctx.fillRect(px, py, scale * 2, ph); // 左の深い影
        
        ctx.fillStyle = darkColor;
        ctx.fillRect(px + pw - scale, py, scale, ph); // 右
        ctx.fillRect(px, py + ph - scale, pw, scale); // 下
    } else {
        // 通常時:上と左にハイライト、下と右にシャドウ
        ctx.fillStyle = lightColor;
        ctx.fillRect(px, py, pw, scale); // 上
        ctx.fillRect(px, py, scale, ph); // 左

        ctx.fillStyle = darkColor;
        ctx.fillRect(px, py + ph - scale, pw, scale); // 下
        ctx.fillRect(px + pw - scale, py, scale, ph); // 右
        
        // ピクセルアート特有の角の処理(カドを落とす)
        ctx.fillStyle = darkestColor;
        ctx.fillRect(px, py + ph - scale, scale, scale); // 左下
        ctx.fillRect(px + pw - scale, py, scale, scale); // 右上
        ctx.fillRect(px + pw - scale, py + ph - scale, scale, scale); // 右下
    }
}

function drawSkewerCloth(ctx, x, y, player) {
    if (!player) return;
    const isP1 = player === 1;
    const baseColor = isP1 ? LAYOUT.COLORS.P1 : LAYOUT.COLORS.P2;
    const darkColor = isP1 ? "#1e4b80" : "#80283c";
    
    const cx = Math.round(x + 6 * YAKITORI_PIXEL_UNIT); 
    const cy = Math.round(y + 29 * YAKITORI_PIXEL_UNIT);

    ctx.fillStyle = baseColor;
    ctx.fillRect(cx - 5, cy, 10, 4);
    ctx.fillStyle = darkColor;
    ctx.fillRect(cx - 5, cy + 4, 10, 2);

    if (isP1) {
        ctx.fillStyle = baseColor;
        ctx.fillRect(cx - 8, cy + 1, 3, 3);
        ctx.fillStyle = darkColor;
        ctx.fillRect(cx - 8, cy + 4, 3, 2);
    } else {
        ctx.fillStyle = baseColor;
        ctx.fillRect(cx + 5, cy + 1, 3, 3);
        ctx.fillStyle = darkColor;
        ctx.fillRect(cx + 5, cy + 4, 3, 2);
    }
}




function drawTitleButton(ctx, x, y, w, h, label, accentColor, isPressed = false) {
    const offset = isPressed ? 2 : 0;
    const baseColor = isPressed ? "#4a3525" : "#38271a";
    const borderColor = "#1b1009";
    if (!isPressed) {
        ctx.fillStyle = "#080503";
        ctx.fillRect(x + 2, y + 4, w, h);
    }

    ctx.fillStyle = borderColor;
    ctx.fillRect(x, y + offset, w, h);
    ctx.fillStyle = baseColor;
    ctx.fillRect(x + 2, y + 2 + offset, w - 4, h - 4);
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.fillRect(x + 2, y + 2 + offset, w - 4, 2);
    ctx.font = getPixelFont(14);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillText(label, x + w / 2 + 2, y + h / 2 + 2 + offset);
    ctx.fillStyle = isPressed ? "#e4d9c5" : "#c4b69e"; 
    ctx.fillText(label, x + w / 2, y + h / 2 + offset);
    return { x, y, w, h };
}


function drawPixelLogo(ctx, logoData, x, y, scale) {
    const rows = logoData.length;
    const cols = logoData[0].length;
    const startX = Math.floor(x - (cols * scale) / 2);
    const startY = Math.floor(y - (rows * scale) / 2);

    for (let r = 0; r < rows; r++) {
        const rowStr = logoData[r];
        for (let c = 0; c < cols; c++) {
            const val = rowStr[c];
            if (val !== "." && TITLE_LOGO_PALETTE[val]) {
                ctx.fillStyle = TITLE_LOGO_PALETTE[val];
                ctx.fillRect(startX + c * scale, startY + r * scale, scale, scale);
            }
        }
    }
}

function drawQuietCharcoal(ctx, cx, cy) {
    const w = 240;
    const h = 26; 
    const startX = Math.round(cx - w / 2);
    const startY = Math.round(cy - h / 2);
    
    ctx.fillStyle = "rgba(12, 8, 6, 0.45)";
    ctx.fillRect(startX - 8, startY - 6, w + 16, h + 12);
    const now = performance.now();

    for (let i = 0; i < 14; i++) {
        const pr1 = Math.abs(Math.sin(i * 13));
        const pr2 = Math.abs(Math.cos(i * 17));
        
        const cw = 12 + pr1 * 16;
        const ch = 6 + pr2 * 10;
        const x = startX + (i / 14) * (w - 20) + Math.sin(i) * 10;
        const y = startY + pr1 * (h - ch);
        
        ctx.fillStyle = pr2 > 0.5 ? "#110a08" : "#0a0504";
        ctx.fillRect(x, y, cw, ch);

        if (pr1 < 0.6) {
            const heat = (Math.sin(now / 800 + i * 2) * 0.5 + 0.5);
            const emberW = cw - 4;
            const emberH = ch - 4;
            if (emberW > 0 && emberH > 0) {
                ctx.fillStyle = "rgba(140, 20, 0, " + (heat * 0.9) + ")";
                ctx.fillRect(x + 2, y + 2, emberW, emberH);
                
                if (heat > 0.7 && pr2 < 0.4) {
                    ctx.fillStyle = "rgba(200, 60, 0, " + (heat * 0.7) + ")";
                    ctx.fillRect(x + 4, y + 4, emberW - 4, emberH - 4);
                }
            }
        }
    }

    if (Math.random() < 0.05) {
        state.visuals.particles.push({
            x: cx + (Math.random() - 0.5) * w * 0.8,
            y: startY + 10 + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -0.3 - Math.random() * 0.5,
            life: 0,
            maxLife: 30 + Math.random() * 20,
            size: 1.5 + Math.random() * 1.5,
            isTitleSpark: true
        });
    }
}




function drawDeliciousYakitori(ctx, x, y, w, h, baseColor, isNegi, dangerOverlay = false, status = "RAW", laneType = "medium", now = 0, isPreBurnt = false, isPrePerfect = false) {
    let finalBaseColor = baseColor;
    if (isPreBurnt) {
        finalBaseColor = brightenColor(finalBaseColor, 0.05);
        finalBaseColor = mixColor(finalBaseColor, "#aa5533", 0.08);
    } else if (isPrePerfect) {
        finalBaseColor = brightenColor(finalBaseColor, 0.05);
    }

    ctx.fillStyle = finalBaseColor;
    if (isNegi) { 
        const nx = x + 4;
        const nw = w - 8; ctx.fillRect(nx, y, nw, h);
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fillRect(nx + 2, y + 2, nw - 4, 4);
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fillRect(nx, y + h - 6, nw, 6); ctx.fillRect(nx + nw - 4, y, 4, h);
        if (status === "PERFECT" || isPreBurnt) {
            ctx.fillStyle = isPreBurnt ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.15)";
            ctx.fillRect(nx + 2, y + h/2, 2, 2);
        }
    } else { 
        ctx.fillRect(x + 4, y, w - 8, h);
        ctx.fillRect(x, y + 4, w, h - 8); ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fillRect(x + 6, y + 4, w - 16, 4); ctx.fillRect(x + 4, y + 8, 4, 6);
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)"; ctx.fillRect(x + 4, y + h - 8, w - 8, 8);
        ctx.fillRect(x + w - 6, y + 6, 4, h - 14);
        if (status === "OKAY" || status === "PERFECT" || isPreBurnt) {
            let shineAlpha = 0;
            const flicker = Math.sin(now / 150 + x) * 0.5 + 0.5;
            if (isPreBurnt) { shineAlpha = 0.25 + flicker * 0.1;
            } 
            else if (status === "OKAY") { shineAlpha = 0.2 + flicker * 0.2;
            } 
            else if (status === "PERFECT") { shineAlpha = 0.5 + flicker * 0.4;
                if (laneType === "medium") shineAlpha += 0.2; 
            }
            if (shineAlpha > 0) {
                ctx.fillStyle = `rgba(255, 255, 220, ${Math.min(1, shineAlpha)})`;
                ctx.fillRect(x + 8, y + 8, 2, 2);
                if ((status === "PERFECT" || isPreBurnt) && flicker > 0.5) ctx.fillRect(x + w - 10, y + h/2, 1, 1);
            }
        }
    }
    if (dangerOverlay && !isPreBurnt) { 
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(x + 4, y + h - 6, w - 8, 6);
        ctx.fillRect(x + w - 8, y + 4, 4, h - 8);
    }
}

function drawDotIcon(ctx, iconId, cx, cy, color, scale) {
    if (scale === undefined) scale = 4;
    const data = ICON_DATA[iconId]; if (!data) return;
    
    const isDisabled = (color === "disabled" || color === "#888" || color === "#666" || color === "#777777"); 
    
    let offsetX = 0;
    if (iconId === "put_skewer" || iconId === "serve_plate" || iconId === "burnt_skewer") offsetX = 3;
    
    // 非活性時用のグレースケールパレット(明度を調整し、立体感を残しつつ色を抜く)
    const grayPalette = {
        1: "#999999", 2: "#666666", 3: "#444444", 4: "#777777", 
        5: "#888888", 6: "#777777", 7: "#555555", 8: "#444444", 
        9: "#888888", 10: "#777777", 11: "#888888", 12: "#333333"
    };

    for (let i = 0; i < 64; i++) {
        const val = data[i];
        if (val !== 0) { 
            if (isDisabled) {
                ctx.fillStyle = grayPalette[val] || "#777777";
            } else {
                ctx.fillStyle = ICON_PALETTE[val] || color;
            }
            ctx.fillRect(cx + offsetX - (4 * scale) + (i % 8) * scale, cy - (4 * scale) + Math.floor(i / 8) * scale, scale, scale);
        }
    }
}

function getBuildModeIcon(mode) { if (mode === "sapling") return "put_skewer"; if (mode === "harvest") return "serve_plate";
    if (mode === "uchiwa") return "uchiwa"; return null; }
function drawLaneHint(ctx, lane, laneIndex, mode, activePlayer, pResources) {
    if (!lane.built) return;
    if (mode !== "harvest" && mode !== "uchiwa" && mode !== null) return;
    
    const now = getTime();
    
    if (mode === null) {
        const canShowIdleHint = state.screen === "game"
            && !state.buildMode
            && !state.cookPreviewActive
            && state.turnSplashTimer <= 0
            && !state.pendingTurnSplash
            && state.pendingPlayer === null
            && !state.introSequenceActive
            && !state.startRouletteActive
            && !state.startRouletteBlinkActive
            && !state.gameOver
            && !state.isBusy;
            
        if (!canShowIdleHint) return;

        const currentStatus = getCookLabel(lane.type, lane.cookState);
        const baseHeat = getBaseHeat(lane.type);
        const predictedCookState = Math.min(8, lane.cookState + baseHeat + (lane.uchiwaBoost || 0));
        const predictedStatus = getCookLabel(lane.type, predictedCookState);

        let hintType = null;
        if (predictedStatus === "burnt" && currentStatus !== "burnt") {
            hintType = "danger";
        } else if (currentStatus === "perfect") {
            hintType = "perfect";
        }

        if (hintType) {
            const b = getLaneBounds(laneIndex);
            const laneCx = b.x + b.w / 2;
            const gaugeY = b.y + b.h + 12; // 焼きメーターのY座標

            if (hintType === "danger") {
                // 最低0.45を残し、ゆっくり脈打つ
                const pulse = 0.45 + 0.55 * (Math.sin(now / 150) * 0.5 + 0.5);
                ctx.globalAlpha = pulse;
                // 焼きメーターの右端に小さく危険アイコンを置く
                drawDotIcon(ctx, "warning", laneCx + 40, gaugeY + 4, "#ff5555", 1.4);
            } else if (hintType === "perfect") {
                const pulse = 0.5 + 0.5 * (Math.sin(now / 200) * 0.5 + 0.5);
                ctx.globalAlpha = pulse;
                // 焼きメーターの左端に小さくキラキラを置く
                drawDotIcon(ctx, "diamond", laneCx - 40, gaugeY + 4, "#ffeb3b", 1.4);
            }
            ctx.globalAlpha = 1.0;
        }
        return;
    }

    let modeAlpha = 1.0;
    const elapsedMode = now - (state.buildModeStartTime || now);
    modeAlpha = Math.min(1, Math.max(0, elapsedMode / 200));
    
    if (modeAlpha <= 0) return;

    const b = getLaneBounds(laneIndex);
    const laneCx = b.x + b.w / 2;
    const floatDist = 10 * (1 - modeAlpha);
    const hintY = b.y - 20 - floatDist;

    ctx.save();
    ctx.globalAlpha = modeAlpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (mode === "harvest") {
        const status = getCookLabel(lane.type, lane.cookState);
        const isOwn = lane.owner === activePlayer;
        const isSteal = !isOwn;
        
        let canHarvest = false;
        if (isOwn) {
            canHarvest = true;
        } else {
            if (status === "early") canHarvest = false;
            else if (status !== "burnt" && pResources < 1) canHarvest = false;
            else canHarvest = true;
        }

        if (!canHarvest) {
            drawBevelRect(ctx, laneCx - 14, hintY - 12, 28, 24, "#241f1c");
            ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
            ctx.fillRect(laneCx - 12, hintY - 10, 24, 2);
            
            ctx.fillStyle = "#000000";
            ctx.font = getPixelFont(14);
            ctx.fillText("x", laneCx + 2, hintY + 2);
            ctx.fillStyle = "#aaaaaa";
            ctx.fillText("x", laneCx, hintY);
        } else {
            const score = getHarvestScore(lane, isSteal, status);
            let scoreText = score > 0 ? "+" + score : "" + score;
            let textColor = score > 0 ? "#ffeb3b" : (score < 0 ? "#ff5555" : "#aaaaaa");
            if (score === 0) textColor = "#aaaaaa";

            let isStealIcon = (isSteal && status !== "burnt");
            let plateW = 40;
            if (isStealIcon) plateW = 54;
            
            const px = Math.round(laneCx - plateW / 2);
            const py = Math.round(hintY - 12);
            
            drawBevelRect(ctx, px, py, plateW, 24, "#241f1c");
            ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
            ctx.fillRect(px + 2, py + 2, plateW - 4, 2);

            let textX = laneCx;
            if (isStealIcon) {
                drawDotIcon(ctx, "meat", px + 12, hintY, "#f33", 1.5);
                textX = px + 36;
            }

            ctx.font = getPixelFont(12);
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillText(scoreText, textX + 2, hintY + 2);
            ctx.fillStyle = textColor;
            ctx.fillText(scoreText, textX, hintY);
        }
    } else if (mode === "uchiwa") {
        const baseHeat = getBaseHeat(lane.type);
        const predictedCookState = Math.min(8, lane.cookState + baseHeat + 1);
        const predictedStatus = getCookLabel(lane.type, predictedCookState);

        let labelText = "";
        let textColor = "#fff";
        let plateW = 64;

        if (predictedStatus === "perfect") {
            labelText = "PERFECT";
            textColor = "#ffeb3b";
            plateW = 72;
        } else if (predictedStatus === "okay") {
            labelText = "OK";
            textColor = "#dddddd";
            plateW = 40;
        } else if (predictedStatus === "burnt") {
            labelText = "BURN";
            textColor = "#ff5555";
            plateW = 48;
        } else {
            labelText = "EARLY";
            textColor = "#aaaaaa";
            plateW = 56;
        }

        const px = Math.round(laneCx - plateW / 2);
        const py = Math.round(hintY - 12);

        drawBevelRect(ctx, px, py, plateW, 24, "#241f1c");
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        ctx.fillRect(px + 2, py + 2, plateW - 4, 2);

        ctx.font = getPixelFont(10);
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillText(labelText, laneCx + 2, hintY + 2);
        
        let currentTextColor = textColor;
        if (predictedStatus === "burnt") {
            const pulse = 0.6 + 0.4 * Math.sin(now / 80);
            ctx.globalAlpha = modeAlpha * pulse;
        } else if (predictedStatus === "perfect") {
            const pulse = 0.8 + 0.2 * Math.sin(now / 150);
            ctx.globalAlpha = modeAlpha * pulse;
        }

        ctx.fillStyle = currentTextColor;
        ctx.fillText(labelText, laneCx, hintY);
        ctx.globalAlpha = modeAlpha;
    }

    ctx.restore();
}






function drawSparkles(ctx, cx, y, isHarvestMode, isPreview, extraAlpha = 0, scale = 1) {
    // 全体的に控えめなアルファ値に調整
    const baseAlpha = isPreview ? 0.2 : (isHarvestMode ? 0.6 : 0.4);
    ctx.globalAlpha = Math.min(1.0, baseAlpha + extraAlpha); 
    ctx.fillStyle = "rgba(255, 255, 200, 0.7)";
    
    // キラキラの数を4→3に減らし、位置を焼き台寄り(下寄り)に配置
    const positions = [{ dx: -20, dy: 30 }, { dx: 18, dy: 55 }, { dx: -12, dy: 75 }];
    // サイズを小さくする
    const w1 = 2 * scale, h1 = 6 * scale, w2 = 6 * scale, h2 = 2 * scale;
    
    positions.forEach((pos) => { 
        ctx.fillRect(cx + pos.dx - w1/2, y + pos.dy - h1/2, w1, h1); 
        ctx.fillRect(cx + pos.dx - w2/2, y + pos.dy - h2/2, w2, h2); 
    });
    ctx.globalAlpha = 1.0;
}

function drawEndSplash(ctx) {
    if (!state.endSplashTimer || state.endSplashTimer <= 0) return;
    const cx = LAYOUT.CANVAS_WIDTH / 2;
    const cy = LAYOUT.CANVAS_HEIGHT / 2; const t = state.endSplashTimer;
    const alpha = t > 40 ? (55 - t) / 15 : Math.min(1, t / 12);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)"; ctx.fillRect(0, 0, LAYOUT.CANVAS_WIDTH, LAYOUT.CANVAS_HEIGHT);
    ctx.font = getPixelFont(24);
    ctx.textAlign = "center"; 
    // ドロップシャドウ
    ctx.fillStyle = "#000"; ctx.fillText(state.endSplashText, cx + 2, cy + 2);
    ctx.fillStyle = state.endSplashColor || "#fff"; ctx.fillText(state.endSplashText, cx, cy);
    ctx.font = getPixelFont(10); ctx.fillStyle = "#aaa"; ctx.fillText("MATCH END", cx, cy + 35);
    ctx.restore();
}

function drawIntroOrderSlip(ctx, cx, y, orderObj) {
    const scale = 1.5;
    const titleFontSize = 10 * scale;
    const textFontSize = 14 * scale;
    const iconScale = 2.5 * scale;
    
    const cardW = Math.round(235 * scale);
    const cardH = Math.round(50 * scale);
    const cardX = Math.round(cx - cardW / 2);
    const cardY = Math.round(y);
    drawBevelRect(ctx, cardX, cardY, cardW, cardH, "#e0d6c8");
    
    ctx.fillStyle = "#5a4a3a";
    ctx.fillRect(cardX, cardY, cardW, Math.round(3 * scale));
    const splitX = cardX + Math.round(cardW * 0.65);

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#4a4a4a";
    const leftCenterX = cardX + (splitX - cardX) / 2;
    ctx.font = getPixelFont(titleFontSize);
    ctx.fillText("TODAY'S ORDER", leftCenterX, cardY + 16 * scale);
    
    ctx.fillStyle = "#c85a4a";
    ctx.font = getPixelFont(textFontSize);
    ctx.fillText(orderObj.label, leftCenterX, cardY + 38 * scale);

    ctx.fillStyle = "rgba(90, 74, 58, 0.2)";
    ctx.fillRect(splitX, cardY + 5 * scale, 2, cardH - 10 * scale);
    if (orderObj.icon && orderObj.bonus) {
        const rewardX = splitX + (cardX + cardW - splitX) / 2;
        const centerY = cardY + cardH / 2;
        const offset = 6 * scale;
        drawDotIcon(ctx, orderObj.icon, rewardX - offset, centerY, orderObj.color || "#4a4a4a", iconScale);
        
        ctx.fillStyle = "#4a4a4a";
        ctx.font = getPixelFont(titleFontSize);
        ctx.textAlign = "left";
        ctx.fillText(orderObj.bonus, rewardX + offset, centerY);
    }
    ctx.restore();
}

// ==========================================
// YAKITORI WARS - UI Polish (注文札・NEXT表示・選択枠)
// ==========================================

function drawCompactOrderCard(ctx, cx, y, orderObj) {
    const cardW = 160;
    const cardH = 32;
    const cardX = Math.round(cx - cardW / 2);
    const cardY = Math.round(y);
    // 彩度と主張を下げた、落ち着いた木札/紙色に変更
    drawBevelRect(ctx, cardX, cardY, cardW, cardH, "#8a8076");
    
    ctx.save();
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    // テキストも真っ黒を避け、背景に馴染む濃い茶色
    ctx.fillStyle = "#2a221c"; 
    ctx.font = getPixelFont(9);
    ctx.fillText(orderObj.label, cardX + 10, cardY + cardH / 2);
    const splitX = cardX + cardW * 0.55;
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.fillRect(splitX, cardY + 6, 2, cardH - 12);
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(splitX + 2, cardY + 6, 2, cardH - 12);
    if (orderObj.icon && orderObj.bonus) {
        const iconScale = 2.2;
        drawDotIcon(ctx, orderObj.icon, splitX + 18, cardY + cardH / 2, orderObj.color || "#2a221c", iconScale);
        
        ctx.textAlign = "left";
        ctx.font = getPixelFont(12);
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillText(orderObj.bonus, splitX + 38 + 1, cardY + cardH / 2 + 1);
        // ボーナスの色も彩度を落とした赤茶色に
        ctx.fillStyle = "#b84a38";
        ctx.fillText(orderObj.bonus, splitX + 38, cardY + cardH / 2);
    }
    ctx.restore();
}


function drawRouletteBanner(ctx, cx, cy, state) {
    let isVisible = state.startRouletteBlinkActive ? state.startRouletteBlinkCount % 2 === 0 : true;
    if (!isVisible) return;
    const idx = state.startRouletteBlinkActive ? state.startRouletteFinalPlayer : state.startRouletteIndex;
    const color = idx === 1 ? LAYOUT.COLORS.P1 : LAYOUT.COLORS.P2;
    const text = "P" + idx;
    const bannerW = 100;
    const bannerH = 56;
    const bx = Math.round(cx - bannerW / 2);
    const by = Math.round(cy - bannerH / 2) - 15;
    const isFinalBlink = state.startRouletteBlinkActive;
    const offset = isFinalBlink ? 2 : 0;
    ctx.save();
    ctx.globalAlpha = 0.9;
    drawBevelRect(ctx, bx, by + offset, bannerW, bannerH, "#241e1a", isFinalBlink);
    ctx.font = getPixelFont(24);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillText(text, cx + 2, by + bannerH / 2 + 2 + offset);
    ctx.fillStyle = color;
    ctx.fillText(text, cx, by + bannerH / 2 + offset);
    ctx.restore();
}

function drawTurnBanner(ctx, cx, cy, state, activePlayer) {
    const fadeAlpha = getFadeAlpha(state.turnSplashTimer, 45, 10);
    if (fadeAlpha <= 0) return;
    const bannerW = 200;
    const bannerH = 48;
    const bx = Math.round(cx - bannerW / 2);
    const by = Math.round(cy - bannerH / 2) - 15;
    ctx.save();
    ctx.globalAlpha = fadeAlpha * 0.95;
    drawBevelRect(ctx, bx, by, bannerW, bannerH, "#241e1a", false);
    const color = activePlayer === 1 ? LAYOUT.COLORS.P1 : LAYOUT.COLORS.P2;
    const text = "P" + activePlayer + " TURN";
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(bx + 8, by + 8, bannerW - 16, 2);
    ctx.fillRect(bx + 8, by + bannerH - 10, bannerW - 16, 2);
    ctx.font = getPixelFont(16);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillText(text, cx + 2, by + bannerH / 2 + 2);
    ctx.fillStyle = color;
    ctx.fillText(text, cx, by + bannerH / 2);
    ctx.restore();
}



function drawGameScreen(ctx) {
    const cx = LAYOUT.CANVAS_WIDTH / 2, cy = LAYOUT.CANVAS_HEIGHT / 2, safeTop = 15, panelW = Math.min(100, LAYOUT.CANVAS_WIDTH * 0.25), now = getTime();
    const activePlayer = (state.startRouletteActive || state.startRouletteBlinkActive) ? (state.startRouletteBlinkActive ? state.startRouletteFinalPlayer : state.startRouletteIndex) : (state.pendingPlayer !== null ? state.pendingPlayer : state.currentPlayer);
    const pResources = state.players[activePlayer - 1].resources;
    const panelH = 95;
    
    drawPlayerPanel(ctx, state.players[0], 10, safeTop, panelW, panelH, 1, activePlayer);
    drawPlayerPanel(ctx, state.players[1], LAYOUT.CANVAS_WIDTH - panelW - 10, safeTop, panelW, panelH, 2, activePlayer);
    
    const p1Right = 10 + panelW;
    const p2Left = LAYOUT.CANVAS_WIDTH - panelW - 10;
    const centerSpace = p2Left - p1Right;
    ctx.font = getPixelFont(14);
    const roundText = "ROUND " + state.round + "/" + state.maxRounds;
    const tw = ctx.measureText(roundText).width;
    const hudW = Math.min(tw + 48, centerSpace - 20, 340);
    const hudX = Math.round(cx - hudW / 2);
    const hudY = safeTop + 2;
    drawBevelRect(ctx, hudX, hudY, hudW, 32, "#1c1410");
    
    let stageHudH = 0;
    if (state.gameMode === "ai") {
        stageHudH = 20;
        const stageW = Math.round(hudW * 0.7);
        drawBevelRect(ctx, Math.round(cx - stageW / 2), hudY + 30, stageW, stageHudH, "#120c08");
    }
    
    ctx.textAlign = "center";
    ctx.font = getPixelFont(14);
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillText(roundText, cx + 2, hudY + 22 + 2);
    ctx.fillStyle = "#d0c6b8";
    ctx.fillText(roundText, cx, hudY + 22);
    if (state.gameMode === "ai") {
        ctx.font = getPixelFont(10);
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillText("STAGE " + state.currentStage, cx + 2, hudY + 44 + 2);
        ctx.fillStyle = "#988f81";
        ctx.fillText("STAGE " + state.currentStage, cx, hudY + 44);
    }
    
    let orderYOffset = hudY + 32 + stageHudH + 12;
    if (state.todaysOrder && state.orderIntroDone) {
        drawCompactOrderCard(ctx, cx, orderYOffset, state.todaysOrder);
    }

    const laneInfos = state.lanes.map((lane, i) => {
        const b = getLaneBounds(i);
        const laneCx = b.x + b.w / 2;
        const spriteW = 32 * YAKITORI_PIXEL_UNIT;
        const spriteH = 48 * YAKITORI_PIXEL_UNIT;
        const gx = Math.round(b.x + b.w / 2 - spriteW / 2);
        const gy = Math.round(b.y + b.h / 2 - spriteH / 2) + 15;

        let effectiveCookState = lane.cookState, displayCookState = lane.cookState, gaugeCookState = lane.cookState;
        let isCurrentPreviewLane = false, previewEventForThisLane = null, previewProg = 0;
        if (state.cookPreviewActive) {
            previewEventForThisLane = state.cookPreviewEvents.find(e => e.laneIndex === i);
            const activeEvent = state.cookPreviewEvents[state.cookPreviewIndex];
            if (activeEvent && activeEvent.laneIndex === i) {
                isCurrentPreviewLane = true; 
                previewProg = 1.0 - (state.cookPreviewPhaseTimer / COOK_PREVIEW_DUR);
                if (previewProg < 0.35) { displayCookState = activeEvent.prevCookState;
                    gaugeCookState = activeEvent.prevCookState; }
                else { displayCookState = activeEvent.newCookState;
                    gaugeCookState = activeEvent.newCookState; }
                effectiveCookState = displayCookState;
            } else if (previewEventForThisLane) {
                const eventIndex = state.cookPreviewEvents.indexOf(previewEventForThisLane);
                if (eventIndex > state.cookPreviewIndex) { 
                    effectiveCookState = previewEventForThisLane.prevCookState;
                    displayCookState = previewEventForThisLane.prevCookState; gaugeCookState = previewEventForThisLane.prevCookState;
                } else { 
                    effectiveCookState = previewEventForThisLane.newCookState;
                    displayCookState = previewEventForThisLane.newCookState; gaugeCookState = previewEventForThisLane.newCookState; 
                }
            }
        }
        
        const heat = getBaseHeat(lane.type), boost = lane.uchiwaBoost || 0;
        const baseEndState = effectiveCookState + heat + boost;
        const baseEndStatus = getCookLabel(lane.type, baseEndState);
        const currentStatus = getCookLabel(lane.type, effectiveCookState);
        let isFlashable = false;
        let uchiwaTargetStatus = baseEndStatus;
        let isPerfectTarget = false;
        if (state.buildMode) {
            isFlashable = isNodeValidForMode(lane, state.buildMode);
            if (state.buildMode === "harvest" && lane.built && lane.owner === activePlayer && currentStatus === "early") isFlashable = true;
            if (state.buildMode === "harvest" && lane.built && lane.owner !== activePlayer) { 
                if (currentStatus !== "burnt" && pResources < 1) isFlashable = false;
            }
            if (state.buildMode === "harvest" && isFlashable && lane.built) {
                if (currentStatus === "perfect") isPerfectTarget = true;
            }
            if (state.buildMode === "uchiwa" && isFlashable && lane.built) {
                uchiwaTargetStatus = getCookLabel(lane.type, baseEndState + 1);
            }
        }

        return { b, laneCx, gx, gy, effectiveCookState, displayCookState, gaugeCookState, isCurrentPreviewLane, previewEventForThisLane, previewProg, baseEndState, baseEndStatus, currentStatus, isFlashable, uchiwaTargetStatus, isPerfectTarget };
    });

    laneInfos.forEach((info, i) => {
        const lane = state.lanes[i];
        drawYakitoriSpriteMap(ctx, info.gx, info.gy, YAKITORI_GRILL_PARTS.base);
        const coalPattern = YAKITORI_COAL_PATTERNS[lane.type] || YAKITORI_COAL_PATTERNS.medium;
        drawYakitoriSpriteMap(ctx, info.gx, info.gy, coalPattern, 0, 22);

        let cookFlashAlpha = 0;
        if (info.isCurrentPreviewLane && info.previewProg >= 0.2 && info.previewProg <= 0.5) {
            let p = 1.0 - (Math.abs(info.previewProg - 0.35) / 0.15);
            cookFlashAlpha = Math.sin(Math.max(0, Math.min(1, p)) * Math.PI / 2);
        }
        let hoverGlow = 0;
        if (info.isFlashable) {
            hoverGlow = 0.20 + 0.20 * Math.sin(now / 220 + i * 11);
        }

        const heat = getBaseHeat(lane.type);
        const breathPhase = now / (1000 - heat * 100) + i; 
        const breathGlow = (Math.sin(breathPhase) * 0.5 + 0.5) * 0.25; 
        const heatFactor = lane.type === "strong" ? 1.0 : (lane.type === "medium" ? 0.7 : 0.4);
        
        const totalEmberAlpha = Math.min(1.0, cookFlashAlpha + hoverGlow + breathGlow);
        if (totalEmberAlpha > 0) {
            ctx.fillStyle = "rgba(255, 90, 20, " + (totalEmberAlpha * heatFactor * 0.8) + ")";
            const u = YAKITORI_PIXEL_UNIT;
            ctx.fillRect(info.gx + 12 * u, info.gy + 25 * u, 3 * u, 2 * u);
            ctx.fillRect(info.gx + 18 * u, info.gy + 27 * u, 4 * u, 2 * u);
            ctx.fillRect(info.gx + 15 * u, info.gy + 29 * u, 2 * u, 2 * u);
            if (lane.type === "strong" || lane.type === "medium") {
                ctx.fillRect(info.gx + 22 * u, info.gy + 25 * u, 2 * u, 2 * u);
                ctx.fillRect(info.gx + 9 * u, info.gy + 28 * u, 2 * u, 2 * u);
            }
        }

        drawYakitoriSpriteMap(ctx, info.gx, info.gy, YAKITORI_GRILL_PARTS.net);

        let sparkChance = 0.02 * heat;
        if (cookFlashAlpha > 0) sparkChance += 0.08 * heat * cookFlashAlpha;
        const uchiwaSparkTime = state.visuals.uchiwaGusts[lane.id];
        if (uchiwaSparkTime && now - uchiwaSparkTime < 500) sparkChance += 0.3;

        if (Math.random() < sparkChance) { 
            state.visuals.particles.push({
                x: info.laneCx + (Math.random() - 0.5) * 30,
                y: info.gy + 28 * YAKITORI_PIXEL_UNIT + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 0.5,
                vy: -0.6 - Math.random() * 1.2,
                life: 0,
                maxLife: 20 + Math.random() * 20,
                size: 1.5 + Math.random() * 1.5,
                color: Math.random() > 0.5 ? "#ffaa33" : "#ff5511",
                isEmber: true
            });
        }

        let cv = 0, uchiwaDotIndex = -1, uchiwaPreviewNextCv = 0, baseEndHeatCv = Math.min(6, info.baseEndState);
        if (lane.built) {
            cv = Math.min(info.gaugeCookState || 0, 6);
            uchiwaPreviewNextCv = baseEndHeatCv;
            if (state.buildMode === "uchiwa" && info.isFlashable) { uchiwaDotIndex = Math.min(5, info.baseEndState); uchiwaPreviewNextCv = Math.min(6, info.baseEndState + 1);
            }
        }
        const dotStartY = info.b.y + info.b.h + 12;
        drawCookGauge(ctx, info.laneCx, dotStartY, cv, uchiwaPreviewNextCv, uchiwaDotIndex, info.uchiwaTargetStatus, info.baseEndStatus, info.isCurrentPreviewLane, info.previewProg, info.previewEventForThisLane);
        
        const uchiwaTime = state.visuals.uchiwaGusts[lane.id];
        let fireSwayX = 0;
        if (uchiwaTime && now - uchiwaTime < 800) fireSwayX = Math.sin(now / 40) * 2 * (1 - ((now - uchiwaTime) / 800));
        const fireScale = 2.5, fireSize = 8 * fireScale, totalFireW = (fireSize * lane.fire) + (4 * (lane.fire - 1)), startFireX = info.laneCx - totalFireW / 2 + fireSize / 2;
        
        for (let f = 0; f < lane.fire; f++) {
            const phase = now / (800 + f * 150 + i * 100);
            const flicker = Math.sin(phase) * 0.5 + Math.sin(phase * 1.5 + f) * 0.5;
            let fireColor = "#ffaa33";
            if (flicker > 0.4) fireColor = "#ffcc66"; 
            else if (flicker < -0.4) fireColor = "#dd6622"; 
            
            if (cookFlashAlpha > 0) {
                fireColor = (flicker > 0) ? "#ffeb3b" : "#ffcc66";
            }
            
            drawDotIcon(ctx, "fire", startFireX + f * (fireSize + 4) + fireSwayX, info.b.y + info.b.h + 40, fireColor, fireScale);
        }
        
        if (lane.uchiwaBoost > 0) { ctx.globalAlpha = 0.6; drawDotIcon(ctx, "fire", info.b.x + info.b.w - 18, info.b.y + info.b.h - 18, "#f85", 2);
        ctx.globalAlpha = 1.0; }
    });

    ctx.save();
    state.visuals.particles.forEach(p => {
        if (p.isEmber) {
            const ratio = p.life / p.maxLife;
            ctx.globalAlpha = Math.max(0, 1 - ratio);
            ctx.fillStyle = p.color;
            const s = Math.max(1, Math.floor(p.size));
            ctx.fillRect(Math.floor(p.x - s/2), Math.floor(p.y - s/2), s, s);
        }
    });
    ctx.restore();

    laneInfos.forEach((info, i) => {
        const lane = state.lanes[i];
        if (lane.built) {
            const isUchiwaPreviewActive = (state.buildMode === "uchiwa" && info.isFlashable);
            const targetCookState = isUchiwaPreviewActive ? info.baseEndState + 1 : info.displayCookState;
            let targetAlpha = lane.justPlaced ? 0.6 : 1.0;
            
            let fallYOffset = 0;
            let currentAlpha = targetAlpha;
            const pTime = state.visuals.placedAt[lane.id];
            if (pTime && now - pTime < 220) {
                const t = (now - pTime) / 220;
                const easeOut = 1 - Math.pow(1 - t, 3);
                fallYOffset = -18 * (1 - easeOut);
                currentAlpha = 0.1 + (targetAlpha - 0.1) * easeOut;
            }
            
            const displayStatusUpperForBreathe = getCookLabel(lane.type, targetCookState).toUpperCase();
            let breatheY = 0;
            if (displayStatusUpperForBreathe === "PERFECT" && !lane.justPlaced) breatheY = Math.sin(now / 420) * 0.6;
            const isPrePerfect = (info.currentStatus !== "perfect" && info.currentStatus !== "burnt" && info.baseEndStatus === "perfect");
            if (isPrePerfect && !lane.justPlaced) breatheY = Math.sin(now / 300) * 0.3;
            
            const uchiwaTime = state.visuals.uchiwaGusts[lane.id];
            let gustWobble = 0;
            if (uchiwaTime && now - uchiwaTime < 800) {
                const gustP = 1 - ((now - uchiwaTime) / 800);
                gustWobble = Math.sin(now / 30) * 0.5 * gustP;
                
                if (now - uchiwaTime < 350) {
                    const windP = (now - uchiwaTime) / 350;
                    ctx.save();
                    ctx.globalAlpha = 1 - Math.pow(windP, 2);
                    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
                    const wx1 = info.gx + 20 * YAKITORI_PIXEL_UNIT - windP * 60;
                    const wx2 = info.gx + 25 * YAKITORI_PIXEL_UNIT - windP * 80;
                    ctx.fillRect(wx1, info.gy + 8 * YAKITORI_PIXEL_UNIT, 20, 2);
                    ctx.fillRect(wx2, info.gy + 18 * YAKITORI_PIXEL_UNIT, 16, 2);
                    ctx.fillRect(wx1 + 10, info.gy + 28 * YAKITORI_PIXEL_UNIT, 24, 2);
                    ctx.restore();
                }
            }

            const stickTop = info.b.y + info.b.h * 0.1 + fallYOffset + breatheY;
            
            const displayStatusUpper = getCookLabel(lane.type, targetCookState).toUpperCase();
            let spriteStage = "raw";
            if (displayStatusUpper === "OKAY" || displayStatusUpper === "PERFECT") spriteStage = "cooked";
            else if (displayStatusUpper === "BURNT") spriteStage = "burnt";
            const skewerSprite = YAKITORI_SKEWER_SPRITES[spriteStage];
            
            let popY = 0;
            let popFlashAlpha = 0;
            if (info.isCurrentPreviewLane && info.previewProg >= 0.2 && info.previewProg <= 0.6) {
                let p = 1.0 - (Math.abs(info.previewProg - 0.4) / 0.2);
                p = Math.max(0, Math.min(1, p));
                popFlashAlpha = Math.sin(p * Math.PI / 2);
                popY = -Math.sin(p * Math.PI) * 1.0; 
            }

            if (uchiwaTime && now - uchiwaTime < 250) {
                const flashP = 1 - ((now - uchiwaTime) / 250);
                popFlashAlpha = Math.max(popFlashAlpha, flashP * 0.7);
            }

            const skewerOffsetX = 10 + Math.round(gustWobble / YAKITORI_PIXEL_UNIT);
            const skewerOffsetY = 8 + Math.round((fallYOffset + breatheY + popY) / YAKITORI_PIXEL_UNIT);
            
            ctx.globalAlpha = currentAlpha;
            
            ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
            ctx.fillRect(info.gx + 10 * YAKITORI_PIXEL_UNIT, info.gy + 4 * YAKITORI_PIXEL_UNIT, 12 * YAKITORI_PIXEL_UNIT, 32 * YAKITORI_PIXEL_UNIT);

            drawYakitoriSolidShadow(ctx, info.gx, info.gy, skewerSprite, skewerOffsetX + 1, skewerOffsetY + 2);
            drawYakitoriOutline(ctx, info.gx, info.gy, skewerSprite, skewerOffsetX, skewerOffsetY, "rgba(26, 12, 8, 0.85)");
            drawYakitoriSpriteMap(ctx, info.gx, info.gy, skewerSprite, skewerOffsetX, skewerOffsetY);
            
            if (popFlashAlpha > 0 && displayStatusUpper !== "BURNT") {
                drawYakitoriSilhouette(ctx, info.gx, info.gy, skewerSprite, skewerOffsetX, skewerOffsetY, "rgba(255, 255, 230, " + (popFlashAlpha * 0.5) + ")");
            }
            
            ctx.globalAlpha = 1.0;

            if (displayStatusUpper === "PERFECT") {
                const seedVal = pTime || 0;
                const charColors = ["#6b2c12", "#5c240c", "#4a1906"];
                const parts = [
                    { r: 6, c: 4, w: 4, h: 4, isNegi: false }, 
                    { r: 13, c: 4, w: 3, h: 3, isNegi: true }, 
                    { r: 19, c: 4, w: 4, h: 4, isNegi: false } 
                ];
                parts.forEach((p, pIdx) => {
                    const s1 = Math.abs(Math.sin(seedVal + pIdx * 10));
                    const s2 = Math.abs(Math.sin(seedVal + pIdx * 20));
                    const numChars = p.isNegi ? Math.floor(s1 * 2) : 1 + Math.floor(s1 * 3);
                    for (let c = 0; c < numChars; c++) {
                        const rs = Math.abs(Math.sin(seedVal + pIdx * 30 + c * 10));
                        const cs = Math.abs(Math.cos(seedVal + pIdx * 40 + c * 10));
                        const dr = p.r + Math.floor(rs * p.h);
                        const dc = p.c + Math.floor(cs * p.w);
                        ctx.fillStyle = charColors[Math.floor(rs * charColors.length)];
                        ctx.fillRect(
                            info.gx + (dc + skewerOffsetX) * YAKITORI_PIXEL_UNIT,
                            info.gy + (dr + skewerOffsetY) * YAKITORI_PIXEL_UNIT,
                            YAKITORI_PIXEL_UNIT, YAKITORI_PIXEL_UNIT
                        );
                    }
                    const numGloss = p.isNegi ? 1 : 1 + Math.floor(s2 * 2);
                    for (let g = 0; g < numGloss; g++) {
                        const rs = Math.abs(Math.cos(seedVal + pIdx * 50 + g * 10));
                        const cs = Math.abs(Math.sin(seedVal + pIdx * 60 + g * 10));
                        const dr = p.r - 1 + Math.floor(rs * (p.h * 0.6));
                        const dc = p.c - 1 + Math.floor(cs * (p.w * 0.6));
                        const shimmer = 0.5 + 0.5 * Math.sin(now / 200 + pIdx * 5 + g * 3);
                        ctx.fillStyle = "rgba(255, 250, 235, " + (shimmer * 0.75) + ")";
                        ctx.fillRect(
                            info.gx + (dc + skewerOffsetX) * YAKITORI_PIXEL_UNIT,
                            info.gy + (dr + skewerOffsetY) * YAKITORI_PIXEL_UNIT,
                            YAKITORI_PIXEL_UNIT, Math.max(1, Math.floor(YAKITORI_PIXEL_UNIT * 0.6)) 
                        );
                    }
                });
            }

            drawSkewerCloth(ctx, info.gx + skewerOffsetX * YAKITORI_PIXEL_UNIT, info.gy + skewerOffsetY * YAKITORI_PIXEL_UNIT, lane.owner);
            const isOwn = lane.owner === activePlayer;
            const realCanSteal = !isOwn && info.currentStatus !== "early" && info.currentStatus !== "burnt" && pResources >= 1;
            if (!lane.justPlaced) {
                const peakTime = state.visuals.peakFlashes[lane.id];
                let peakAlpha = 0, peakScale = 1;
                if (peakTime && now - peakTime < 450) {
                    const elapsed = now - peakTime, progress = elapsed / 450;
                    if (elapsed < 200) {
                        ctx.save();
                        ctx.globalAlpha = (1 - (elapsed / 200)) * 0.15;
                        ctx.fillStyle = "rgba(255, 255, 200, 1.0)"; ctx.fillRect(info.b.x, info.b.y, info.b.w, info.b.h); ctx.restore();
                    }
                    peakAlpha = (1 - progress) * 0.3;
                    peakScale = 1 + (1 - progress) * 0.15;
                }
                if (info.currentStatus === "perfect" && (isOwn || realCanSteal)) drawSparkles(ctx, info.laneCx, stickTop, state.buildMode === "harvest", false, peakAlpha, peakScale);
                else if (isUchiwaPreviewActive && info.uchiwaTargetStatus === "perfect" && info.baseEndStatus !== "perfect") drawSparkles(ctx, info.laneCx, stickTop, false, true, 0, 0.7);
            }

            if (info.currentStatus === "perfect" && Math.random() < 0.06) {
                state.visuals.particles.push({
                    x: info.laneCx + (Math.random() - 0.5) * 24, 
                    y: stickTop + (info.b.h * 0.7) * 0.3 + (Math.random() - 0.5) * 16,  
                    vx: (Math.random() - 0.5) * 0.2, vy: -0.15 - Math.random() * 0.2,             
                    life: 0, maxLife: 40 + Math.random() * 20, size: 6 + Math.random() * 6, 
                    color: Math.random() > 0.5 ? "#f0ebe1" : "#e6e0d3", baseAlpha: 0.15 + Math.random() * 0.1,
                    isSteam: true, isLargeSteam: true
                });
            }
        }
    });
    laneInfos.forEach((info, i) => {
        if (state.cookPreviewActive && !info.isCurrentPreviewLane) {
            ctx.fillStyle = "rgba(15, 10, 8, 0.55)";
            ctx.fillRect(info.b.x - 8, info.b.y - 8, info.b.w + 16, info.b.h + 80);
        }
    });
    if (state.startRouletteActive || state.startRouletteBlinkActive) {
        drawRouletteBanner(ctx, cx, cy, state);
    } else if (state.introSequenceActive && state.introPhase !== "pause") {
        ctx.fillStyle = "rgba(22, 22, 32, 0.85)";
        ctx.fillRect(0, 0, LAYOUT.CANVAS_WIDTH, LAYOUT.CANVAS_HEIGHT); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        if (state.introPhase === "vs") {
            const p_vs = state.introVsTimer / 60;
            ctx.fillStyle = LAYOUT.COLORS.P1; ctx.font = getPixelFont(36); ctx.fillText("P1", cx - 80 + (p_vs * 30), cy - 60);
            ctx.fillStyle = "#fff";
            ctx.font = getPixelFont(28); ctx.fillText("VS", cx, cy); const p2Name = state.gameMode === "ai" ? state.enemyName : "P2"; ctx.fillStyle = LAYOUT.COLORS.P2;
            ctx.font = getPixelFont(36); ctx.fillText(p2Name, cx + 80 - (p_vs * 30), cy + 60);
            if (state.gameMode === "ai") { ctx.fillStyle = "#aaa"; ctx.font = getPixelFont(11); ctx.fillText("STAGE " + state.currentStage, cx, cy + 120);
            }
        } else if (state.introPhase === "fight") {
            const p_fight = state.fightSplashTimer / 25, elapsedP = 1 - p_fight, scale = 1.0 + elapsedP * 0.08, alpha = p_fight < 0.2 ?
            p_fight * 5 : 1.0;
            ctx.globalAlpha = alpha; ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.font = getPixelFont(32);
            ctx.fillStyle = "#000";
            ctx.fillText("FIGHT!!", 3, 3); ctx.fillStyle = "#ffeb3b"; ctx.fillText("FIGHT!!", 0, 0); ctx.restore(); ctx.globalAlpha = 1.0;
        } else if (state.introPhase === "order" && state.todaysOrder) {
            const maxTime = 120;
            const t = maxTime - state.introOrderTimer;
            let yOffset = cy - 30;
            if (t < 25) {
                const easeOut = 1 - Math.pow(1 - (t / 25), 3);
                yOffset = (cy - 30) - 120 * (1 - easeOut);
            }
            drawIntroOrderSlip(ctx, cx, yOffset, state.todaysOrder);
        }
        ctx.textBaseline = "alphabetic";
    } else if (state.turnSplashTimer > 0 && !state.cookPreviewActive) {
        drawTurnBanner(ctx, cx, cy, state, activePlayer);
    }
    
    ctx.globalAlpha = 1.0;
    state.visuals.ghosts.forEach(g => {
        const elapsed = now - g.startTime, progress = Math.min(1, elapsed / 800);
        let moveDist = -150; let alphaProg = progress;
        if (g.status === "BURNT") { moveDist = -40; alphaProg = Math.min(1, elapsed / 500); }
        const yOffset = moveDist * (1 - Math.pow(1 - progress, 3)); ctx.globalAlpha = Math.max(0, 1 - alphaProg);
        const b = getLaneBounds(g.laneIndex), laneCx = b.x + b.w / 2;
        if (g.cookState !== undefined) {
            const ghostStatusUpper = g.status.toUpperCase();
            let spriteStage = "raw";
            if (ghostStatusUpper === "OKAY" || ghostStatusUpper === "PERFECT") spriteStage = "cooked";
            else if (ghostStatusUpper === "BURNT") spriteStage = "burnt";
            const skewerSprite = YAKITORI_SKEWER_SPRITES[spriteStage];
            
            const spriteW = 32 * YAKITORI_PIXEL_UNIT;
            const spriteH = 48 * YAKITORI_PIXEL_UNIT;
            const gx = Math.round(b.x + b.w / 2 - spriteW / 2);
            const gy = Math.round(b.y + b.h / 2 - spriteH / 2) + 15;
            const ghostOffsetY = 8 + Math.round(yOffset / YAKITORI_PIXEL_UNIT);
            drawYakitoriSpriteMap(ctx, gx, gy, skewerSprite, 10, ghostOffsetY);
            drawSkewerCloth(ctx, gx + 10 * YAKITORI_PIXEL_UNIT, gy + ghostOffsetY * YAKITORI_PIXEL_UNIT, g.owner);
        }
    });

    renderParticlesAndOverlay(ctx, now, activePlayer);
    laneInfos.forEach((info, i) => {
        const lane = state.lanes[i];
        
        if (state.buildMode && info.isFlashable) {
            const elapsedMode = now - (state.buildModeStartTime || now);
            const modeAlpha = Math.min(1, Math.max(0, elapsedMode / 200));

            if (state.buildMode === "sapling") {
                const tagFloatY = Math.sin(now / 200) * 3;
                const ty = info.b.y - 10 + tagFloatY;
                const baseColor = "#a07b5a"; 
                const markColor = "#4a2818"; 
                
                ctx.globalAlpha = modeAlpha;
                ctx.fillStyle = "#1a1a1a";
                ctx.fillRect(info.laneCx - 1, ty - 32, 2, 10); 
                
                drawBevelRect(ctx, info.laneCx - 12, ty - 22, 24, 28, baseColor);
                
                ctx.fillStyle = markColor;
                ctx.fillRect(info.laneCx - 1, ty - 18, 2, 18); 
                ctx.fillRect(info.laneCx - 4, ty - 14, 8, 4); 
                ctx.fillRect(info.laneCx - 4, ty - 8, 8, 4);  
                ctx.globalAlpha = 1.0;
            }
        }

        if (info.isCurrentPreviewLane && info.previewEventForThisLane && info.previewProg >= 0.25) {
            const p_prog = Math.min(1, (info.previewProg - 0.25) / 0.75);
            let textAlpha = 1;
            if (p_prog < 0.2) textAlpha = p_prog / 0.2;
            else if (p_prog > 0.8) textAlpha = 1 - ((p_prog - 0.8) / 0.2);
            const easeOut = 1 - Math.pow(1 - p_prog, 2);
            const textY = info.b.y + info.b.h * 0.1 - 5 - 15 * easeOut;
            ctx.textAlign = "center"; ctx.globalAlpha = textAlpha;
            if (info.previewEventForThisLane.prevStatus !== "perfect" && info.previewEventForThisLane.newStatus === "perfect") {
                const msgW = ctx.measureText("READY!").width + 24;
                drawBevelRect(ctx, info.laneCx - msgW/2, textY - 18, msgW, 26, "#e6d555");
                ctx.font = getPixelFont(14); ctx.fillStyle = "#000";
                ctx.fillText("READY!", info.laneCx + 2, textY + 2); ctx.fillStyle = "#fff"; ctx.fillText("READY!", info.laneCx, textY);
            } else if (info.previewEventForThisLane.prevStatus !== "burnt" && info.previewEventForThisLane.newStatus === "burnt") {
                const msgW = ctx.measureText("BURNT!").width + 24;
                drawBevelRect(ctx, info.laneCx - msgW/2, textY - 20, msgW, 30, "#8a3a3a");
                ctx.font = getPixelFont(16); ctx.fillStyle = "#000";
                ctx.fillText("BURNT!", info.laneCx + 2, textY + 2); ctx.fillStyle = "#ffaa88"; ctx.fillText("BURNT!", info.laneCx, textY);
            }
            ctx.globalAlpha = 1.0;
        }

        drawLaneHint(ctx, lane, i, state.buildMode, activePlayer, pResources);
    });
    
    ctx.textBaseline = "alphabetic";
    state.visuals.statusMessages.forEach((msg, idx) => {
        const elapsed = now - msg.startTime;
        const duration = msg.duration || 1000;
        if (elapsed > duration) return;
        
        const p = Math.max(0, Math.min(1, elapsed / duration));
        
        let alpha = 1;
        if (p < 0.15) alpha = p / 0.15;
        else if (p > 0.8) alpha = 1 - ((p - 0.8) / 0.2);
        
        let floatDist = -25;
        if (msg.type === "hint") floatDist = -10; 
        
        const easeOut = 1 - Math.pow(1 - p, 2);
        const yAnimOffset = floatDist * easeOut;
        
        const fx = Math.round(msg.x || cx);
        const fy = Math.round((msg.y || cy) + yAnimOffset);
        
        ctx.globalAlpha = alpha;
        ctx.textAlign = "center";
        
        if (msg.type === "hint") {
            ctx.font = getPixelFont(10);
            const txtW = Math.round(ctx.measureText(msg.text).width + 24);
            ctx.fillStyle = "rgba(20, 15, 10, 0.85)";
            ctx.fillRect(Math.round(fx - txtW/2), Math.round(fy - 14), txtW, 22);
            ctx.fillStyle = "#ff5555";
            ctx.fillText(msg.text, fx, fy);
        } else {
            let mainText = "";
            let subText = "";
            let mainColor = "#fff";
            let icon = null;
            let isStrong = false;
            if (msg.type === "meat") {
                mainText = msg.amount > 0 ? "+" + msg.amount : "" + msg.amount;
                mainColor = msg.amount > 0 ? "#ffaaaa" : "#cccccc";
                icon = "meat";
            } else if (msg.type === "fire") {
                mainText = "+" + msg.amount;
                mainColor = "#ffaa33";
                icon = "fire";
            } else if (msg.type === "score") {
                mainText = msg.amount > 0 ? "+" + msg.amount : "" + msg.amount;
                mainColor = msg.amount > 0 ? "#ffeb3b" : (msg.amount < 0 ? "#ff5555" : "#aaaaaa");
                if (msg.amount !== 0) icon = "diamond";
                if (msg.isPerfect) {
                    subText = "PERFECT!";
                    mainColor = "#ffeb3b";
                    isStrong = true;
                } else if (msg.status === "burnt") {
                    subText = "BURNT";
                    mainColor = "#ff7755";
                    isStrong = true;
                } else if (msg.status === "early") {
                    subText = "EARLY";
                    mainColor = "#ff5555";
                }
                
                if (msg.isBonus) {
                    subText = msg.bonusText || "ORDER!";
                    isStrong = true;
                }
                
                if (msg.amount <= -5) {
                    isStrong = true;
                }
            } else if (msg.type === "result") {
                mainText = msg.text || "";
                mainColor = "#ffeb3b";
                isStrong = true;
            }
            
            ctx.font = getPixelFont(isStrong ? 16 : 14);
            let textX = fx;
            
            if (icon) {
                textX = fx + 8;
                drawDotIcon(ctx, icon, fx - 16, fy - 8, mainColor, 2.5);
            }
            
            ctx.fillStyle = "#000";
            ctx.fillText(mainText, textX + 2, fy + 2);
            ctx.fillStyle = mainColor;
            ctx.fillText(mainText, textX, fy);
            if (subText) {
                const subY = fy - 18;
                ctx.font = getPixelFont(12);
                ctx.fillStyle = "#000";
                ctx.fillText(subText, fx + 2, subY + 2);
                
                if (subText === "PERFECT!") ctx.fillStyle = "#ffeb3b";
                else if (subText === "BURNT") ctx.fillStyle = "#ff7755";
                else if (subText === "EARLY") ctx.fillStyle = "#ff5555";
                else if (subText === "ORDER!") ctx.fillStyle = "#66ccff";
                else ctx.fillStyle = "#fff";
                
                ctx.fillText(subText, fx, subY);
            }
        }
    });
    ctx.globalAlpha = 1.0;
    if (state.gameOver && state.gameEndWaitTimer > 0) {
        const alpha = Math.min(1, 1 - (state.gameEndWaitTimer / 55));
        ctx.fillStyle = "rgba(0, 0, 0, " + (alpha * 0.8) + ")"; ctx.fillRect(0, 0, LAYOUT.CANVAS_WIDTH, LAYOUT.CANVAS_HEIGHT);
    }
}



function shouldShowActionButtons() {
    if (state.screen !== "game") return false;
    if (state.gameOver) return false;
    if (state.startRouletteActive || state.startRouletteBlinkActive) return false;
    if (state.introSequenceActive || state.extraOrderIntroActive) return false;
    if (state.cookPreviewActive || state.roundEndPauseTimer > 0) return false;
    if (state.turnSplashTimer > 0 || state.pendingTurnSplash) return false;
    if (state.pendingPlayer !== null || state.aiBreathTimer > 0) return false;

    const isPending = !!(state.visuals && state.visuals.pendingButtonAction);
    if (!isPending && (state.isBusy || state.isAIThinking)) return false;

    const cp = state.currentPlayer;
    if (!state.players || !state.players[cp - 1]) return false;
    if (state.players[cp - 1].workersRemaining <= 0 && !isPending) return false;
    if (isAIPlayer(cp)) return false;

    return true;
}


function drawActionHintTag(ctx, boxId, cx, cy, canUse, isLocked) {
    const tagW = 48;
    const tagH = 16;
    const tx = Math.round(cx - tagW / 2);
    const ty = Math.round(cy - tagH / 2);
    const isActive = (canUse && !isLocked);

    const baseColor = isActive ? "#3a2d24" : "#241f1c";
    const lightColor = isActive ? "#5c4a3d" : "#352e2a";
    const darkColor = isActive ? "#1a120e" : "#14110f";

    ctx.save();
    
    ctx.fillStyle = baseColor;
    ctx.fillRect(tx + 1, ty + 1, tagW - 2, tagH - 2);
    ctx.fillStyle = lightColor;
    ctx.fillRect(tx + 1, ty, tagW - 2, 1);
    ctx.fillRect(tx, ty + 1, 1, tagH - 2);
    ctx.fillStyle = darkColor;
    ctx.fillRect(tx + 1, ty + tagH - 1, tagW - 2, 1);
    ctx.fillRect(tx + tagW - 1, ty + 1, 1, tagH - 2);
    ctx.fillRect(tx + 2, ty + 2, 1, 1);
    ctx.fillRect(tx + tagW - 3, ty + 2, 1, 1);
    ctx.fillRect(tx + 2, ty + tagH - 3, 1, 1);
    ctx.fillRect(tx + tagW - 3, ty + tagH - 3, 1, 1);
    const textY = ty + tagH / 2 + 1;
    const iconY = ty + tagH / 2;
    ctx.font = getPixelFont(9);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let iconName = "";
    let iconColor = "";
    let labelText = "";
    let textColor = isActive ? LAYOUT.COLORS.TEXT_STRONG : "#777777";
    
    if (boxId === 1) {
        iconName = "meat";
        iconColor = isActive ? "#D66A70" : "disabled"; 
        labelText = "+1";
    } else if (boxId === 2) {
        iconName = "meat";
        iconColor = isActive ? "#8F443C" : "disabled"; 
        labelText = "-1";
    } else if (boxId === 3) {
        iconName = "put_skewer";
        iconColor = isActive ? "#E8DDC8" : "disabled"; 
        labelText = "↑";
    } else if (boxId === 4) {
        iconName = "fire";
        iconColor = isActive ? "#FF9F2E" : "disabled"; 
        labelText = "+1";
    }

    ctx.fillStyle = textColor;
    drawDotIcon(ctx, iconName, cx - 10, iconY, iconColor, 1.5);
    ctx.fillText(labelText, cx + 10, textY);
    ctx.restore();
}


function renderParticlesAndOverlay(ctx, now, activePlayer) {
    const cx = LAYOUT.CANVAS_WIDTH / 2, cy = LAYOUT.CANVAS_HEIGHT / 2;
    for (let i = state.visuals.particles.length - 1; i >= 0; i--) {
        let p = state.visuals.particles[i];
        p.life++; if (p.life >= p.maxLife) { state.visuals.particles.splice(i, 1); continue; }
        
        if (p.isSizzle) {
            p.vy += 0.15;
        }
        if (p.isTitleSpark) {
            p.vx += (Math.random() - 0.5) * 0.2;
        }
        
        p.x += p.vx;
        p.y += p.vy; const ratio = p.life / p.maxLife; 
        
        if (p.isText) {
            ctx.globalAlpha = 1 - ratio;
            ctx.font = getPixelFont(Math.max(8, Math.floor(p.size * 0.7))); ctx.textAlign = "center";
            ctx.fillStyle = "#000";
            ctx.fillText(p.text, Math.round(p.x) + 2, Math.round(p.y) + 2);
            ctx.fillStyle = p.color;
            ctx.fillText(p.text, Math.round(p.x), Math.round(p.y));
        } else if (p.isSparkle) {
            ctx.globalAlpha = 0.6 * (1 - ratio);
            ctx.fillStyle = p.color;
            const size = p.size * (1 - ratio * 0.5);
            ctx.fillRect(p.x - size/2, p.y - 1, size, 2);
            ctx.fillRect(p.x - 1, p.y - size/2, 2, size);
        } else if (p.isSteam) {
            const baseA = p.baseAlpha !== undefined ?
            p.baseAlpha : 0.5;
            ctx.globalAlpha = baseA * (1 - ratio);
            ctx.fillStyle = p.color;
            if (p.isLargeSteam) {
                const s = Math.floor(p.size * (1 + ratio * 0.4));
                const px = Math.floor(p.x - s/2);
                const py = Math.floor(p.y - s/2);
                ctx.fillRect(px, py, s, s);
                ctx.globalAlpha = baseA * (1 - ratio) * 0.5;
                ctx.fillRect(px - 1, py + 1, 1, s - 2);
                ctx.fillRect(px + s, py + 1, 1, s - 2);
                ctx.fillRect(px + 1, py - 1, s - 2, 1);
                ctx.fillRect(px + 1, py + s, s - 2, 1);
            } else {
                const s = Math.max(2, Math.floor(p.size * (1 + ratio * 0.5)));
                ctx.fillRect(Math.floor(p.x - s/2), Math.floor(p.y - s/2), s, s);
            }
        } else if (p.isAroma) {
            const baseA = p.baseAlpha !== undefined ?
            p.baseAlpha : 0.8;
            ctx.globalAlpha = baseA * (1 - ratio);
            ctx.fillStyle = p.color;
            const s = Math.floor(p.size);
            ctx.fillRect(Math.floor(p.x - s/2), Math.floor(p.y - s/2), s, s);
        } else if (p.isSizzle) {
            const baseA = p.baseAlpha !== undefined ?
            p.baseAlpha : 1.0;
            ctx.globalAlpha = baseA * (1 - ratio);
            ctx.fillStyle = p.color;
            const s = Math.floor(p.size);
            ctx.fillRect(Math.floor(p.x - s/2), Math.floor(p.y - s/2), s, s);
        } else if (p.isSmoke) {
            const baseA = p.baseAlpha !== undefined ?
            p.baseAlpha : 0.5;
            ctx.globalAlpha = baseA * (1 - ratio);
            ctx.fillStyle = p.color;
            const s = Math.floor(p.size);
            ctx.fillRect(Math.floor(p.x - s/2), Math.floor(p.y - s/2), s, s);
        } else if (p.isEmber) {
            // 火花の描画は焼き鳥より後ろ(drawGameScreen 内)で行うため、ここでは何もしません。
            // 座標と寿命の更新のみが行われます。
        } else if (p.isTitleSpark) {
            const alpha = Math.min(1, 1.5 * (1 - ratio));
            ctx.globalAlpha = 1.0; 
            ctx.fillStyle = "rgba(255, 120, 30, " + alpha + ")";
            ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.size), Math.round(p.size));
        } else {
            ctx.globalAlpha = 0.6 * (1 - ratio);
            ctx.fillStyle = p.color || "#e0e0e0";
            const s = Math.max(2, Math.floor((p.size * (1 + ratio)) / 2));
            ctx.fillRect(Math.floor(p.x - s/2), Math.floor(p.y - s/2), s, s);
        }
    }
    ctx.globalAlpha = 1.0;
    if (state.buildMode) {
        const cb = getCancelButtonBounds(), selectedIcon = getBuildModeIcon(state.buildMode);
        if (selectedIcon) { 
            const iconX = cb.x + cb.w / 2;
            const bob = Math.sin(now * 0.004) * 2;
            const iconY = cb.y - 40 + bob;
            
            // 道具トレイのような小さな暗い影
            ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
            ctx.fillRect(iconX - 20, cb.y - 22, 40, 6);
            ctx.fillRect(iconX - 16, cb.y - 24, 32, 2);
            ctx.fillRect(iconX - 16, cb.y - 16, 32, 2);
            
            ctx.globalAlpha = 0.95;
            
            // アイコンサイズを 3 から 4 に拡大
            drawDotIcon(ctx, selectedIcon, iconX, iconY, "#fff", 4);
            
            // モードごとのアクセント演出
            if (state.buildMode === "harvest") {
                // 皿の上に小さな湯気
                const steamY1 = iconY - 14 - (now * 0.015) % 8;
                const steamY2 = iconY - 12 - ((now + 300) * 0.015) % 8;
                ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
                ctx.fillRect(iconX - 8, steamY1, 2, 2);
                ctx.fillRect(iconX + 6, steamY2, 2, 2);
            } else if (state.buildMode === "uchiwa") {
                // 風線
                const windP = (now * 0.04) % 20;
                ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                ctx.fillRect(iconX + 14 + windP, iconY - 4, 6, 2);
                ctx.fillRect(iconX + 10 + windP, iconY + 6, 4, 2);
            }
            
            ctx.globalAlpha = 1.0;
        }
        const isPressed = (now - (state.visuals.cancelClick || 0) < 150);
        drawBevelRect(ctx, cb.x, cb.y, cb.w, cb.h, "#8a3a3a", isPressed);
        const offset = isPressed ? 4 : 0;
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(cb.x + 4, cb.y + 4, 4, 4);
        ctx.fillRect(cb.x + cb.w - 8, cb.y + 4, 4, 4);
        ctx.fillRect(cb.x + 4, cb.y + cb.h - 8, 4, 4);
        ctx.fillRect(cb.x + cb.w - 8, cb.y + cb.h - 8, 4, 4);

        ctx.font = getPixelFont(12); ctx.textAlign="center";
        ctx.fillStyle = "#000";
        ctx.fillText("CANCEL", cb.x + cb.w/2 + offset + 2, cb.y + cb.h/2 + 6 + offset + 2);
        ctx.fillStyle = "#fff";
        ctx.fillText("CANCEL", cb.x + cb.w/2 + offset, cb.y + cb.h/2 + 6 + offset);
    } else {
        if (shouldShowActionButtons()) {
            const tagColors = ["#5c6e58", "#4e627d", "#8e6d4c", "#784b5c"];
            LAYOUT.BUTTONS.forEach((btn, i) => {
                const b = getButtonBounds(i), boxId = i + 1; let canUse = false;
                if (boxId === 1) canUse = canUseMeat(state.currentPlayer);  if (boxId === 2) canUse = canUseSkewer(state.currentPlayer); 
                if (boxId === 3) canUse = canUseServe(state.currentPlayer); if (boxId === 4) canUse = canUseUchiwa(state.currentPlayer); 
        
                const pending = state.visuals.pendingButtonAction;
                const isPendingPressed = pending && pending.index === i;
                const isPressed = isPendingPressed || (now - (state.visuals.buttonClicks[i] || 0) < 180);
                const isLocked = isInputLocked() && !isPressed;
                const isError = (now - (state.visuals.buttonErrors[i] || 0) < 150); 
                
                let baseColor = tagColors[i];
                let wobbleX = 0;
 
                if (isError) {
                    baseColor = "#7a3b3b";
                    wobbleX = Math.sin(now / 20) * 2;
                } else if (!canUse || isLocked) {
                    baseColor = "#4a4642"; 
                }

                if (isPressed) {
                    baseColor = mixColor(baseColor, "#000000", 0.25);
                } else if (pending && pending.index !== i) {
                    baseColor = mixColor(baseColor, "#000000", 0.35);
                }

                let btnAlpha = 1.0; 
                let harvestBreatheAlpha = 0;
        
                if (boxId === 3 && canUse && !isLocked && state.buildMode === null) 
                { 
                    const isPerfect = hasPerfectHarvestTarget(state.currentPlayer);
                    baseColor = brightenColor(baseColor, isPerfect ? 0.2 : 0.0);
                    harvestBreatheAlpha = isPerfect ?
                    0.4 + 0.3 * Math.sin(now / 200) : 0.15 + 0.15 * Math.sin(now / 300);
                }
                
                const pressOffset = isPressed ? 4 : 0;
                const drawX = b.x + wobbleX;
                const drawY = b.y + pressOffset;

                ctx.globalAlpha = btnAlpha;
                drawBevelRect(ctx, drawX, drawY, b.w, b.h, baseColor, isPressed);
                
                if (!isPressed) {
                    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
                    ctx.fillRect(drawX + 8, drawY + 8, b.w - 16, 4);
                    ctx.fillRect(drawX + 8, drawY + 12, 4, b.h - 24);
                    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
                    ctx.fillRect(drawX + 8, drawY + b.h - 12, b.w - 16, 4);
                    ctx.fillRect(drawX + b.w - 12, drawY + 12, 4, b.h - 24);
                    ctx.fillStyle = (canUse && !isLocked) ?
                    "rgba(30, 20, 10, 0.4)" : "rgba(10, 10, 10, 0.6)";
                    ctx.fillRect(drawX + 4, drawY + 4, 4, 4);
                    ctx.fillRect(drawX + b.w - 8, drawY + 4, 4, 4);
                    ctx.fillRect(drawX + 4, drawY + b.h - 8, 4, 4);
                    ctx.fillRect(drawX + b.w - 8, drawY + b.h - 8, 4, 4);
                    if (harvestBreatheAlpha > 0) {
                        ctx.globalAlpha = harvestBreatheAlpha;
                        ctx.fillStyle = "#fff";
                        ctx.fillRect(drawX + 12, drawY + 8, b.w - 24, 4);
                    }
                } else {
                    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
                    ctx.fillRect(drawX + 6, drawY + 6, b.w - 12, b.h - 12);
                }
                
                ctx.globalAlpha = btnAlpha;

                drawDotIcon(ctx, btn.icon, drawX + b.w/2, drawY + b.h/2 - 6, (canUse && !isLocked) ? "#fff" : "disabled", 4);
                let textAlpha = isPressed ? 1.0 : 0.85; 
                ctx.globalAlpha = textAlpha;
                const textY = drawY + b.h - 14; 
                const textX = drawX + b.w/2;
                drawActionHintTag(ctx, boxId, textX, textY, canUse, isLocked);
                
                ctx.globalAlpha = 1.0;
            });
        }
    }
}






// --------------------------------------------------
// ドット絵ルールの背景描画(ellipse廃止)
// --------------------------------------------------
function drawBackgroundProps(ctx, w, h) {
    ctx.save();
    ctx.fillStyle = "#181310"; // ソリッドな暗がり

    // メニュー札
    for(let i = 0; i < 6; i++) {
        ctx.fillRect(w * 0.02 + i * 45, h * 0.05, 35, 90);
    }

    // 提灯のシルエット(四角の組み合わせ)
    const lanternX = w * 0.95;
    const lanternY = h * 0.2;
    ctx.fillRect(lanternX - 40, lanternY - 75, 80, 150); // 本体
    ctx.fillRect(lanternX - 25, lanternY - 85, 50, 10);  // 上枠
    ctx.fillRect(lanternX - 25, lanternY + 75, 50, 10);  // 下枠

    // 焼酎ボトルや徳利
    ctx.fillRect(w * 0.05, h * 0.65, 25, 80);
    ctx.fillRect(w * 0.12, h * 0.72, 20, 73); 
    ctx.fillRect(w * 0.22 - 15, h * 0.82, 30, 35);       // 徳利本体
    ctx.fillRect(w * 0.22 - 8, h * 0.82 - 50, 16, 50);   // 徳利首

    // 箸立てやジョッキ
    ctx.fillRect(w * 0.88, h * 0.75, 40, 60);
    ctx.fillRect(w * 0.82, h * 0.78, 35, 55); 
    ctx.fillRect(w * 0.82 - 10, h * 0.80, 10, 30); 
    
    ctx.restore();
}

function drawCharcoal(ctx, lane, bounds, now, laneIndex) {
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.w;
    const h = bounds.h;

    ctx.fillStyle = "#0a0a0c";
    ctx.fillRect(x, y + h * 0.4, w, h * 0.6);

    const startY = y + h * 0.55;
    const endY = y + h * 0.95;

    let numAsh = 8;
    let numCoals = 14;
    let hotRatio = 0.15;
    let coreRatio = 0.05;
    let ashColor = "#333333";
    let coalDark = "#0a0a0a";
    let coalLight = "#151515";
    let hotColorDark = "#550a00";
    let hotColorLight = "#881100";
    let coreColor = "#dd4411";

    if (lane.type === "weak") {
        numAsh = 12;
        numCoals = 12;
        hotRatio = 0.15;
        coreRatio = 0.0;
        ashColor = "#555555";
        coalDark = "#1a1a1a";
        coalLight = "#333333";
        hotColorDark = "#441100";
        hotColorLight = "#661100";
    } else if (lane.type === "medium") {
        numAsh = 8;
        numCoals = 14;
        hotRatio = 0.45;
        coreRatio = 0.15;
        ashColor = "#333333";
        coalDark = "#0f0505";
        coalLight = "#221111";
        hotColorDark = "#661100";
        hotColorLight = "#aa2200";
        coreColor = "#ee5511";
    } else if (lane.type === "strong") {
        numAsh = 4;
        numCoals = 16;
        hotRatio = 0.80;
        coreRatio = 0.45;
        ashColor = "#221111";
        coalDark = "#1a0502";
        coalLight = "#330a05";
        hotColorDark = "#aa2200";
        hotColorLight = "#ee4400";
        coreColor = "#ff8800";
    }

    ctx.save();

    for (let i = 0; i < numAsh; i++) {
        const pr1 = Math.abs(Math.sin(laneIndex * 5 + i * 7));
        const pr2 = Math.abs(Math.cos(laneIndex * 3 + i * 11));

        ctx.fillStyle = ashColor;
        const ashX = x + pr1 * (w - 10);
        const ashY = startY + pr2 * (endY - startY);
        const ashW = 20 + pr1 * 16;
        const ashH = 10 + pr2 * 12;
        ctx.fillRect(ashX, ashY, ashW, ashH);
    }

    for (let i = 0; i < numCoals; i++) {
        const pr1 = Math.abs(Math.sin(laneIndex * 13 + i * 17));
        const pr2 = Math.abs(Math.cos(laneIndex * 19 + i * 23));
        const pr3 = Math.abs(Math.sin(laneIndex * 29 + i * 31));

        const cw = 10 + pr1 * 14;
        const ch = 6 + pr2 * 8;
        const cx = x + pr3 * (w - cw);
        const cy = startY + pr1 * (endY - startY - ch);

        ctx.fillStyle = pr2 > 0.4 ? coalLight : coalDark;
        ctx.fillRect(cx, cy, cw, ch);

        if (pr2 < hotRatio) {
            const flickerSpeed = 600 + pr1 * 400;
            const isBright = Math.sin(now / flickerSpeed) > 0;

            ctx.fillStyle = isBright ? hotColorLight : hotColorDark;
            ctx.fillRect(cx + 2, cy + 2, cw - 4, ch - 4);

            if (isBright && pr2 < coreRatio) {
                let currentCoreColor = coreColor;
                if (lane.type === "strong" && Math.sin(now / 150 + i) > 0.6) {
                    currentCoreColor = "#ffcc44";
                }
                ctx.fillStyle = currentCoreColor;
                ctx.fillRect(cx + 4, cy + 4, cw - 8, ch - 8);
            }
        }
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(x, startY - 10, w, 20);
    ctx.fillRect(x, startY + 10, w, (y + h) - startY - 10);

    ctx.restore();
}

function getCookGaugeSlotColor(index) {
    if (index === 0) return "#e8e0d5";
    if (index === 1) return "#dccab5";
    if (index === 2) return "#dca055";
    if (index === 3) return "#c85525";
    if (index === 4) return "#8a3015";
    if (index === 5) return "#4a180a";
    return "#333333";
}

function drawCookGauge(ctx, cx, y, cv, uchiwaPreviewNextCv, uchiwaDotIndex, uchiwaTargetStatus, baseEndStatus, isCurrentPreviewLane, previewProg, previewEventForThisLane) {
    const dotSize = 8;
    const dotGap = 2;
    const gridW = 6 * dotSize + 5 * dotGap;
    const startX = Math.round(cx - gridW / 2);
    
    const framePadding = 6;
    const frameX = startX - framePadding;
    const frameY = y - framePadding;
    const frameW = gridW + framePadding * 2;
    const frameH = dotSize + framePadding * 2;
    
    drawBevelRect(ctx, frameX, frameY, frameW, frameH, "#2a2724");
    
    ctx.fillStyle = "#0a0908";
    ctx.fillRect(frameX + 2, frameY + 2, 2, 2);
    ctx.fillRect(frameX + frameW - 4, frameY + 2, 2, 2);
    ctx.fillRect(frameX + 2, frameY + frameH - 4, 2, 2);
    ctx.fillRect(frameX + frameW - 4, frameY + frameH - 4, 2, 2);
    
    for (let j = 0; j < 6; j++) {
        const dx = startX + j * (dotSize + dotGap);
        
        ctx.fillStyle = "#151210";
        ctx.fillRect(dx, y, dotSize, dotSize);
        
        ctx.fillStyle = "#050403";
        ctx.fillRect(dx, y, dotSize, 2);
        ctx.fillRect(dx, y, 2, dotSize);
        
        ctx.fillStyle = "#403a35";
        ctx.fillRect(dx, y + dotSize - 1, dotSize, 1);
        ctx.fillRect(dx + dotSize - 1, y, 1, dotSize);

        let isLit = j < cv;
        let isFlashing = false;
        
        if (isLit) {
            if (isCurrentPreviewLane && previewProg < 0.35 && previewEventForThisLane && j >= previewEventForThisLane.prevCookState && j < previewEventForThisLane.newCookState) {
                isFlashing = Math.sin(getTime() / 50) > 0;
            }
        }
        
        if (isLit) {
            if (isFlashing) {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(dx + 2, y + 2, dotSize - 4, dotSize - 4);
            } else {
                const color = getCookGaugeSlotColor(j);
                ctx.fillStyle = color;
                ctx.fillRect(dx + 2, y + 2, dotSize - 4, dotSize - 4);
                
                ctx.fillStyle = brightenColor(color, 0.4);
                ctx.fillRect(dx + 2, y + 2, dotSize - 4, 1);
                ctx.fillRect(dx + 2, y + 2, 1, dotSize - 4);
            }
        } else if (j < uchiwaPreviewNextCv) {
            if (j === uchiwaDotIndex) {
                let strokeStyle = "#aaaaaa";
                if (uchiwaTargetStatus === "perfect" && baseEndStatus !== "perfect") strokeStyle = "#ffcc44";
                else if (uchiwaTargetStatus === "burnt" && baseEndStatus !== "burnt") strokeStyle = "#ff5555";
                
                ctx.fillStyle = strokeStyle;
                ctx.fillRect(dx + 1, y + 1, dotSize - 2, 1);
                ctx.fillRect(dx + 1, y + 1, 1, dotSize - 2);
                ctx.fillRect(dx + 1, y + dotSize - 2, dotSize - 2, 1);
                ctx.fillRect(dx + dotSize - 2, y + 1, 1, dotSize - 2);
            } else {
                ctx.fillStyle = mixColor(getCookGaugeSlotColor(j), "#000000", 0.8);
                ctx.fillRect(dx + 2, y + 2, dotSize - 4, dotSize - 4);
            }
        }
    }
}

function drawGrillDirt(ctx, bounds, laneIndex) {
    const { x, y, w, h } = bounds;
    ctx.save();
    for (let k = 0; k < 6; k++) {
        const pr1 = Math.abs(Math.sin(laneIndex * 8 + k * 17));
        const pr2 = Math.abs(Math.cos(laneIndex * 12 + k * 23));
        const dirtX = x + pr1 * w;
        const dirtY = y + pr2 * h;
        const dirtSize = 4 + Math.floor(pr1 * 3) * 4;
        ctx.fillStyle = pr2 > 0.5 ? "#221100" : "#111111";
        ctx.fillRect(dirtX, dirtY, dirtSize, dirtSize);
    }
    ctx.restore();
}

function drawAmbientSmoke(ctx, w, h) {
    // もし背景の環境煙演出も無効化したい場合は、下の行のコメントアウト(//)を外してreturnを有効にしてください。
    // return;

    const now = getTime();
    ctx.save();
    ctx.fillStyle = "rgba(34, 29, 27, 0.4)";
    for(let i = 0; i < 3; i++) {
        const cx = w * 0.35 + (w * 0.15 * i);
        const cy = h * 0.7;
        const offsetX = Math.sin(now / 2500 + i) * 40;
        const offsetY = ((now / 40) + i * 400) % (h * 0.45);
        const size = 60 + Math.sin(now / 2000 + i) * 15;
        const blockSize = 20;
        const blocks = Math.floor(size / blockSize);
        for (let bx = -blocks; bx <= blocks; bx++) {
            for (let by = -blocks; by <= blocks; by++) {
                if (Math.abs(bx) + Math.abs(by) < blocks * 1.5) {
                    ctx.fillRect(cx + offsetX + bx * blockSize, cy - offsetY + by * blockSize, blockSize, blockSize);
                }
            }
        }
    }
    ctx.restore();
}

function drawTableBackground(ctx) {
    const w = LAYOUT.CANVAS_WIDTH;
    const h = LAYOUT.CANVAS_HEIGHT;
    // 焼き台が主役になるよう、背景を「奥の暗がり」としてさらに落とす
    ctx.fillStyle = "#0c0806";
    ctx.fillRect(0, 0, w, h * 0.3);
    ctx.fillStyle = "#120a08";
    ctx.fillRect(0, h * 0.3, w, h * 0.4);
    ctx.fillStyle = "#1a100c";
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    
    // 木目も控えめにして情報を減らす
    ctx.fillStyle = "#0a0605";
    for (let y = 0; y < h; y += 45) {
        ctx.fillRect(0, y, w, 4);
    }

    drawBackgroundProps(ctx, w, h);
    drawAmbientSmoke(ctx, w, h);
}

function render(ctx) {
    const now = getTime();
    state.visuals.ghosts = state.visuals.ghosts.filter(g => now - g.startTime < 1000);
    state.visuals.statusMessages = state.visuals.statusMessages.filter(m => { 
        const life = m.duration || 1000;
        return now - m.startTime < life; 
    });
    state.visuals.traces = state.visuals.traces.filter(t => now - t.time < 2000);

    if (state.screen === "game") {
        drawTableBackground(ctx);
    } else {
        ctx.fillStyle = LAYOUT.COLORS.BG; 
        ctx.fillRect(0, 0, LAYOUT.CANVAS_WIDTH, LAYOUT.CANVAS_HEIGHT);
    }

    const cx = LAYOUT.CANVAS_WIDTH / 2, cy = LAYOUT.CANVAS_HEIGHT / 2;
    if (state.screen === "title") {
        const logoScale = Math.max(3, Math.floor(LAYOUT.CANVAS_WIDTH / 110));
        const logoY = cy - 130; 
        drawPixelLogo(ctx, TITLE_LOGO_DATA, cx, logoY, logoScale);

        const grillY = logoY + 78; 
        drawQuietCharcoal(ctx, cx, grillY);
        renderParticlesAndOverlay(ctx, now, null);

        const btnW = 240;
        const btnH = 56; 
        const gapY = 76;
        const btnStartY = cy + 90; 

        const btnAi = { x: cx - btnW/2, y: btnStartY, w: btnW, h: btnH };
        const btnPvp = { x: cx - btnW/2, y: btnStartY + gapY, w: btnW, h: btnH };
        drawTitleButton(ctx, btnAi.x, btnAi.y, btnAi.w, btnAi.h, "VS AI", null, state.visuals.titleClick === "ai");
        drawTitleButton(ctx, btnPvp.x, btnPvp.y, btnPvp.w, btnPvp.h, "VS PLAYER", null, state.visuals.titleClick === "pvp");
    } else if (state.screen === "game") { 
        drawGameScreen(ctx); drawEndSplash(ctx);
    } else if (state.screen === "clear") {
        state.resultScreenTimer++; const timer = state.resultScreenTimer;
        const alphaOverlay = Math.min(0.85, timer / 90);
        ctx.fillStyle = "rgba(30, 15, 10, " + alphaOverlay + ")";
        ctx.fillRect(0, 0, LAYOUT.CANVAS_WIDTH, LAYOUT.CANVAS_HEIGHT);
        if (timer % 6 === 0) { 
            state.visuals.floaters.push({ x: Math.random() * LAYOUT.CANVAS_WIDTH, y: LAYOUT.CANVAS_HEIGHT + 10, vx: (Math.random() - 0.5) * 0.4, vy: -0.4 - Math.random() * 0.6, life: 0, maxLife: 200 + Math.random() * 150, size: 2 + Math.random() * 4 });
        }
        for (let i = state.visuals.floaters.length - 1; i >= 0; i--) {
            let f = state.visuals.floaters[i];
            f.life++; if (f.life >= f.maxLife) { state.visuals.floaters.splice(i, 1); continue; }
            f.x += f.vx;
            f.y += f.vy; const ratio = f.life / f.maxLife; ctx.globalAlpha = Math.max(0, 1 - ratio);
            ctx.fillStyle = "rgba(255, " + (100 + Math.random() * 50) + ", 50, 0.8)"; ctx.fillRect(f.x, f.y, f.size, f.size);
        }
        ctx.globalAlpha = 1.0; ctx.textAlign = "center";
        if (timer > 60) { 
            ctx.globalAlpha = Math.min(1, (timer - 60) / 45);
            const bw = 280, bh = 220;
            const bx = Math.round(cx - bw/2), by = Math.round(cy - 120);
            drawBevelRect(ctx, bx, by, bw, bh, "#241e1a", false);
            ctx.fillStyle = "rgba(255,255,255,0.05)";
            ctx.fillRect(bx+8, by+8, bw-16, 2);
            ctx.fillRect(bx+8, by+bh-10, bw-16, 2);
            ctx.font = getPixelFont(20); ctx.fillStyle = "#000";
            ctx.fillText("SURVIVAL CLEAR", cx + 2, cy - 80 + 2); 
            ctx.fillStyle = "#ffeb3b";
            ctx.fillText("SURVIVAL CLEAR", cx, cy - 80); 
        }
        if (timer > 140) { 
            ctx.globalAlpha = Math.min(1, (timer - 140) / 45);
            ctx.font = getPixelFont(12); ctx.fillStyle = "#000"; ctx.fillText("You mastered the grill.", cx + 1, cy - 30 + 1);
            ctx.fillStyle = "#e0e0e0"; ctx.fillText("You mastered the grill.", cx, cy - 30);
        }
        if (timer > 220) { 
            ctx.globalAlpha = Math.min(1, (timer - 220) / 45);
            ctx.font = getPixelFont(12); ctx.fillStyle = "#000"; ctx.fillText("THANK YOU FOR PLAYING", cx + 1, cy + 20 + 1);
            ctx.fillStyle = "#fa3"; ctx.fillText("THANK YOU FOR PLAYING", cx, cy + 20);
        }
        if (timer > 300) { 
            const pulse = 0.85 + 0.15 * Math.sin(getTime() / 600);
            ctx.globalAlpha = Math.min(1, (timer - 300) / 45) * pulse;
            drawBevelRect(ctx, cx - 110, cy + 76, 220, 36, "#3a3a40", false);
            
            ctx.font = getPixelFont(12); ctx.fillStyle = "#000";
            ctx.fillText("▶ BACK TO TITLE", cx + 1, cy + 100 + 1); 
            ctx.fillStyle = "#fff";
            ctx.fillText("▶ BACK TO TITLE", cx, cy + 100); 
        }
        ctx.globalAlpha = 1.0;
    } else if (state.screen === "gameover" || state.screen === "stage_clear") {
        state.resultScreenTimer++;
        const timer = state.resultScreenTimer;
        if (timer >= 10) {
            let titleText = state.winnerText;
            let titleColor = "#fff";
            if (state.screen === "gameover") { 
                if (titleText.includes("P1")) titleColor = LAYOUT.COLORS.P1;
                else if (titleText.includes("DRAW")) titleColor = "#888";
                else titleColor = LAYOUT.COLORS.P2; 
            } else { titleColor = "#ffeb3b";
            }
            
            if (!state.visuals.resultComment) {
                const diff = Math.abs((state.players[0].finalScore || state.players[0].score) - (state.players[1].finalScore || state.players[1].score));
                let comment = "Good game.";
                if (state.screen === "gameover" && !state.winnerText.includes("DRAW") && diff <= 2) comment = "So close.";
                else if (state.players[0].stats.perfect >= 3 || state.players[1].stats.perfect >= 3) comment = "Nice timing.";
                else if (state.players[0].stats.burnt >= 3 || state.players[1].stats.burnt >= 3) comment = "Still counts.";
                else if (state.players[0].stats.steal >= 2 || state.players[1].stats.steal >= 2) comment = "Nice steal.";
                state.visuals.resultComment = comment;
            }
            
            const alpha = Math.min(1, (timer - 10) / 10);
            ctx.globalAlpha = alpha;
            if (timer === 10 || timer === 11) { 
                ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
                ctx.fillRect(0, 0, LAYOUT.CANVAS_WIDTH, LAYOUT.CANVAS_HEIGHT); 
            }
            
            ctx.fillStyle = "rgba(20, 16, 14, 0.85)";
            ctx.fillRect(0, 0, LAYOUT.CANVAS_WIDTH, LAYOUT.CANVAS_HEIGHT);

            const bw = 260, bh = 270;
            const bx = Math.round(cx - bw/2), by = Math.round(cy - 145);
            drawBevelRect(ctx, bx, by, bw, bh, "#2a221c", false);
            ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
            ctx.fillRect(bx + 6, by + 6, bw - 12, 2);
            ctx.fillRect(bx + 6, by + bh - 8, bw - 12, 2);

            ctx.font = getPixelFont(22);
            ctx.textAlign = "center";
            ctx.fillStyle = "#000"; ctx.fillText(titleText, cx + 2, cy - 110 + 2);
            ctx.fillStyle = titleColor; ctx.fillText(titleText, cx, cy - 110);
            ctx.font = getPixelFont(10); 
            ctx.fillStyle = "#000"; ctx.fillText(state.visuals.resultComment, cx + 1, cy - 80 + 1);
            ctx.fillStyle = "#a89f91";
            ctx.fillText(state.visuals.resultComment, cx, cy - 80); 
            ctx.globalAlpha = 1.0;
        }
        if (timer >= 30) {
            const alpha = Math.min(1, (timer - 30) / 10);
            const p1Score = state.players[0].finalScore || state.players[0].score;
            const p2Score = state.players[1].finalScore || state.players[1].score;
            const p2Name = state.gameMode === "ai" ?
            state.enemyName : "P2";
            let p1Color = LAYOUT.COLORS.P1, p2Color = LAYOUT.COLORS.P2, p1Alpha = 1.0, p2Alpha = 1.0;
            if (p1Score > p2Score) { p2Color = "#555"; p2Alpha = 0.5;
            } 
            else if (p2Score > p1Score) { p1Color = "#555";
            p1Alpha = 0.5; } 
            
            ctx.globalAlpha = alpha;
            drawBevelRect(ctx, cx - 110, cy - 50, 220, 70, "#1c1410", false);

            ctx.globalAlpha = alpha * p1Alpha;
            ctx.textAlign = "left";
            ctx.fillStyle = p1Color; ctx.font = getPixelFont(16); ctx.fillText("P1", cx - 90, cy - 25);
            ctx.textAlign = "right";
            ctx.fillText("" + p1Score, cx + 90, cy - 25);
            
            ctx.globalAlpha = alpha * p2Alpha; ctx.textAlign = "left"; ctx.fillStyle = p2Color;
            ctx.fillText(p2Name, cx - 90, cy + 5);
            ctx.textAlign = "right"; ctx.fillText("" + p2Score, cx + 90, cy + 5);
        }
        if (timer >= 55) {
            const alpha = Math.min(1, (timer - 55) / 10);
            const p1Score = state.players[0].finalScore || state.players[0].score;
            const p2Score = state.players[1].finalScore || state.players[1].score;
            let p1Color = LAYOUT.COLORS.P1, p2Color = LAYOUT.COLORS.P2, p1Alpha = 1.0, p2Alpha = 1.0;
            if (p1Score > p2Score) { p2Color = "#555"; p2Alpha = 0.5;
            } 
            else if (p2Score > p1Score) { p1Color = "#555";
            p1Alpha = 0.5; } 
            
            ctx.font = getPixelFont(10);
            const statsLabels = ["PERFECT", "BURNT", "STEAL"];
            statsLabels.forEach((label, i) => {
                const statKey = label.toLowerCase();
                const y = cy + 45 + i * 18;
                
                ctx.globalAlpha = alpha; ctx.textAlign = "left"; ctx.fillStyle = "#888";
                ctx.fillText(label, cx - 80, y);
           
                ctx.globalAlpha = alpha * p1Alpha; ctx.fillStyle = p1Color; ctx.textAlign = "right";
                ctx.fillText(state.players[0].stats[statKey], cx + 15, y);
         
                ctx.globalAlpha = alpha; ctx.fillStyle = "#555"; ctx.textAlign = "center";
                ctx.fillText("-", cx + 35, y);
     
                ctx.globalAlpha = alpha * p2Alpha; ctx.fillStyle = p2Color; ctx.textAlign = "left";
                ctx.fillText(state.players[1].stats[statKey], cx + 55, y);
            });
            const pulse = 0.88 + 0.12 * Math.sin(getTime() / 500);
            ctx.globalAlpha = alpha; 
            const btnY = cy + 120;
            drawBevelRect(ctx, cx - 90, btnY - 22, 180, 36, "#3a3a40", false);
            
            ctx.save();
            ctx.translate(cx, btnY);
            if (state.screen === "stage_clear") {
                ctx.globalAlpha = alpha * pulse;
                ctx.fillStyle = "#000"; ctx.font = getPixelFont(14); ctx.textAlign = "center"; ctx.fillText("▶ NEXT STAGE", 2, 2);
                ctx.fillStyle = "#fff";
                ctx.fillText("▶ NEXT STAGE", 0, 0);
                
                ctx.globalAlpha = alpha; ctx.fillStyle = "#777";
                ctx.font = getPixelFont(12); ctx.fillText("▶ RETRY", 0, 30);
            } else {
                ctx.globalAlpha = alpha * pulse;
                ctx.font = getPixelFont(14); ctx.textAlign = "center";
                ctx.fillStyle = "#000";
                if (state.gameMode === "ai") { 
                    ctx.fillText("▶ RETRY", 2, 2);
                    ctx.fillStyle = "#fff"; ctx.fillText("▶ RETRY", 0, 0);
                } 
                else { 
                    ctx.fillText("▶ REMATCH", 2, 2);
                    ctx.fillStyle = "#fff"; ctx.fillText("▶ REMATCH", 0, 0);
                }
            }
            ctx.restore();
            ctx.globalAlpha = 1.0;
        }
    }

    if (state.transition && state.transition.active) {
        let t = state.transition.timer, d = state.transition.duration;
        let alpha = (t < d) ? (t / d) : (1 - (t - d) / d);
        alpha = Math.max(0, Math.min(1, alpha)); ctx.fillStyle = "rgba(22, 22, 32, " + alpha + ")"; ctx.fillRect(0, 0, LAYOUT.CANVAS_WIDTH, LAYOUT.CANVAS_HEIGHT);
    }
    if (state.visuals.perfectFlash && state.visuals.perfectFlash.timer > 0) {
        const alpha = (state.visuals.perfectFlash.timer / 15) * 0.15;
        ctx.fillStyle = "rgba(255, 255, 200, " + alpha + ")"; ctx.fillRect(0, 0, LAYOUT.CANVAS_WIDTH, LAYOUT.CANVAS_HEIGHT); state.visuals.perfectFlash.timer--;
    }
}

function drawPlayerPanel(ctx, player, x, y, w, h, idx, activePlayer) {
    const active = activePlayer === idx;
    const offsetAnim = active ? -2 : 0;
    const px = Math.round(x);
    const py = Math.round(y + offsetAnim);
    // 背景・UIが主役にならないよう、静かで暗い色味に
    let baseColor = "#1e1713";
    if (active) {
        baseColor = idx === 1 ? "#28303a" : "#3a2424";
    }

    drawBevelRect(ctx, px, py, w, h, baseColor);

    if (active) { 
        const scale = 2;
        // 枠線の不透明度を下げて主張を和らげる
        ctx.fillStyle = idx === 1 ? "rgba(60, 150, 255, 0.6)" : "rgba(255, 80, 120, 0.6)"; 
        ctx.fillRect(px - scale, py - scale, w + scale*2, scale);
        ctx.fillRect(px - scale, py - scale, scale, h + scale*2);
        ctx.fillRect(px - scale, py + h, w + scale*2, scale);
        ctx.fillRect(px + w, py - scale, scale, h + scale*2);
        const pulse = Math.floor(getTime() / 250) % 2 === 0 ? 0 : 2;
        ctx.fillRect(px + w / 2 - 4, py - 8 - pulse, 8, 2);
        ctx.fillRect(px + w / 2 - 2, py - 6 - pulse, 4, 2);
        ctx.fillRect(px + w / 2 - 1, py - 4 - pulse, 2, 2);
    }

    const primaryColor = idx === 1 ? LAYOUT.COLORS.P1 : LAYOUT.COLORS.P2;
    const drawShadowText = (text, tx, ty, color, font, align = "left", maxWidth = undefined) => {
        ctx.font = font;
        ctx.textAlign = align;
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        if (maxWidth) {
            ctx.fillText(text, tx + 1, ty + 2, maxWidth);
        } else {
            ctx.fillText(text, tx + 1, ty + 2);
        }
        ctx.fillStyle = color;
        if (maxWidth) ctx.fillText(text, tx, ty, maxWidth);
        else ctx.fillText(text, tx, ty);
    };
    drawShadowText("P" + idx, px + 8, py + 22, primaryColor, getPixelFont(12));

    let nameText = "PLAYER";
    if (idx === 2 && state.gameMode === "ai") {
        nameText = state.enemyName || "AI";
    }
    drawShadowText(nameText, px + 8, py + 36, "#908478", getPixelFont(9), "left", w - 16);

    const boxX = px + 6;
    const boxW = w - 12;
    const boxY1 = py + 44;
    const boxY2 = py + 68;
    const boxH = 20;

    const drawInset = (ix, iy, iw, ih) => {
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.fillRect(ix, iy, iw, ih);
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)"; 
        ctx.fillRect(ix, iy, iw, 2);
        ctx.fillRect(ix, iy, 2, ih);
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        ctx.fillRect(ix, iy + ih - 2, iw, 2);
        ctx.fillRect(ix + iw - 2, iy, 2, ih);
    };

    drawInset(boxX, boxY1, boxW, boxH);
    drawInset(boxX, boxY2, boxW, boxH);
    drawDotIcon(ctx, "diamond", boxX + 10, boxY1 + boxH / 2, "#6cf", 1.8);
    drawShadowText("" + player.score, boxX + boxW - 6, boxY1 + 15, "#d0d0d0", getPixelFont(10), "right");
    drawDotIcon(ctx, "meat", boxX + 10, boxY2 + boxH / 2, "#f77", 1.8);
    drawShadowText("" + (player.resources || 0), boxX + boxW - 6, boxY2 + 15, "#d0d0d0", getPixelFont(10), "right");
}

// ==========================================
// 8. main.js - セットアップとスマホ対応
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("game"); if (!canvas) return; const ctx = canvas.getContext("2d");
    document.body.style.margin = "0"; document.body.style.backgroundColor = "#111"; document.body.style.height = "100vh"; document.body.style.overflow = "hidden"; document.body.style.touchAction = "none";
    function resize() {
        const dpr = window.devicePixelRatio || 1, vw = window.visualViewport ? window.visualViewport.width : window.innerWidth, vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        LAYOUT.CANVAS_WIDTH = vw; LAYOUT.CANVAS_HEIGHT = vh; canvas.width = vw * dpr; canvas.height = vh * dpr; canvas.style.width = 
        vw + "px"; canvas.style.height = vh + "px"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener("resize", resize);
    resize();
    let lastTouchTime = 0;
    canvas.addEventListener("touchstart", (e) => { e.preventDefault(); lastTouchTime = Date.now(); handleCanvasClick({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }, canvas); }, { passive: false });
    canvas.addEventListener("click", (e) => { if (Date.now() - lastTouchTime < 500) return; handleCanvasClick(e, canvas); });
    function loop() {
        try {
            if (state && state.hitStopTimer > 0) { state.hitStopTimer--;
            }
            else { 
                updateTransition();
                updateRoulette(); updateIntroSequence(); updateCookPreview(); 
                updateRoundEndPause();
                resolvePendingTurnFlow(); updateGameEndWait(); render(ctx); playAITurn(); 
            }
        } catch (e) { console.error("GAME LOOP ERROR:", e);
        }
        requestAnimationFrame(loop);
    }
    loop();
});
