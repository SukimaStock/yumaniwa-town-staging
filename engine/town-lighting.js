(function (root) {
    'use strict';

    const outdoor = new Set([
        'station_plaza', 'tomogushi_alley_map', 'yumado_street_map',
        'recreation_road_map', 'onsen_slope_map'
    ]);
    const renderer = root.SukimaStockLighting;
    const materials = root.YUMANIWA_TOWN_LIGHTING_MATERIALS;
    const ready = !!(materials?.objects && renderer?.PERIODS &&
        typeof renderer.render === 'function' && typeof renderer.paint === 'function' &&
        typeof renderer.footprints === 'function');
    // The alley ground JPEG already contains deep painted shadows at noon.
    const night = ready ? {...renderer.PERIODS.night, ambient: 0.42} : null;
    const alleyNight = ready ? {...night, ambient: 0.62} : null;
    // Keep the painted paths dark while retaining the colors that distinguish
    // a street sign, a shop exterior and the player's dark walking poses.
    const objectNight = ready ? {...night, ambient: 0.78} : null;
    const playerNight = ready ? {...night, ambient: 0.88} : null;
    const highSun = ready ? {...renderer.PERIODS.noon, altitude: 0.93, azimuth: 0.22, sun: 0.18} : null;
    const maxEntries = 96;
    const maxPixels = 4 * 1024 * 1024;
    const cache = new Map();
    const ambientTables = new Map();
    let period = 'off';
    let pixels = 0;
    let stamp = 0;
    let hits = 0;
    let renders = 0;
    let failures = 0;
    let evictions = 0;

    function setPeriod(value) {
        period = ready && typeof value === 'string' && Object.prototype.hasOwnProperty.call(renderer.PERIODS, value)
            ? value : 'off';
        return period;
    }

    function periodForTokyoTime(hour, minute) {
        const total = hour * 60 + minute;
        if (!Number.isInteger(hour) || hour < 0 || hour > 23 ||
            !Number.isInteger(minute) || minute < 0 || minute > 59) return 'noon';
        if (total >= 20 * 60 || total < 5 * 60) return 'night';
        if (total >= 17 * 60) return 'evening';
        if (total >= 8 * 60) return 'noon';
        return 'morning';
    }

    try {
        const query = new URLSearchParams(root.location.search);
        const override = query.has('lighting') && query.get('lighting') !== 'auto';
        if (override) {
            setPeriod(query.get('lighting'));
        } else {
            const clock = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
            });
            function updateFromClock() {
                try {
                    const parts = Object.fromEntries(clock.formatToParts(new Date()).map(part => [part.type, part.value]));
                    setPeriod(periodForTokyoTime(Number(parts.hour), Number(parts.minute)));
                } catch (_) {
                    setPeriod('noon');
                }
            }
            function scheduleClockUpdate() {
                updateFromClock();
                const delay = 60000 - (Date.now() % 60000) + 20;
                root.setTimeout(scheduleClockUpdate, delay);
            }
            scheduleClockUpdate();
            root.document.addEventListener('visibilitychange', function () {
                if (!root.document.hidden) updateFromClock();
            });
        }
    } catch (_) {
        setPeriod('noon');
    }

    function softNoon() {
        return period === 'noon' && !!materials?.noonContacts;
    }

    function active(sceneId) {
        return (period !== 'off' && outdoor.has(sceneId)) ||
            (softNoon() && sceneId === 'leisure_center_map');
    }

    function lightingState(objectId) {
        if (period !== 'night') return period;
        if (objectId === '@player') return playerNight;
        return objectId ? objectNight : night;
    }

    function makeCanvas(width, height) {
        if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
            width <= 0 || height <= 0 || width * height > 1048576) {
            throw new RangeError('Unsupported lighting canvas size');
        }
        const canvas = root.document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    // For an ambient-only material each output channel depends only on the same
    // input channel. Sample the canonical renderer once for all 256 byte values.
    function applyAmbient(data, source, objectId) {
        let state = lightingState(objectId);
        if (period === 'night' && !objectId) {
            const path = '/' + String(source.currentSrc || source.src).split(/[?#]/, 1)[0];
            if (path.endsWith('/assets/maps/grounds/tomogushi-alley-ground.jpg')) state = alleyNight;
        }
        let table = ambientTables.get(state);
        if (!table) {
            const ramp = new Uint8ClampedArray(256 * 4);
            for (let i = 0; i < 256; i++) {
                ramp.fill(i, i * 4, i * 4 + 3);
                ramp[i * 4 + 3] = 255;
            }
            table = renderer.render({width: 256, height: 1, data: ramp}, {}, state).data;
            ambientTables.set(state, table);
        }
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3]) {
                data[i] = table[data[i] * 4];
                data[i + 1] = table[data[i + 1] * 4 + 1];
                data[i + 2] = table[data[i + 2] * 4 + 2];
            } else {
                data[i] = data[i + 1] = data[i + 2] = 0;
            }
        }
    }

    // A fixture's mask supplies its luminous pixels. Use their original
    // luminance range to retain the painted variation in each pane or lantern.
    // Only opaque, nearby artwork can receive reflected light from that fixture.
    function lightFixtures(original, lit, map, fixtures) {
        const {width, height, data} = original;
        function brightness(index) {
            return (data[index] * 2 + data[index + 1] * 5 + data[index + 2]) / 8;
        }
        for (const fixture of fixtures || []) {
            const {x, y, w, h, reach, spill, color} = fixture;
            let peak = 0;
            for (let row = y; row < y + h; row++) {
                for (let col = x; col < x + w; col++) {
                    const pixel = row * width + col;
                    if (map.emission[pixel] && data[pixel * 4 + 3]) {
                        peak = Math.max(peak, brightness(pixel * 4));
                    }
                }
            }
            if (!peak) continue;
            for (let row = Math.max(0, y - reach); row < Math.min(height, y + h + reach); row++) {
                for (let col = Math.max(0, x - reach); col < Math.min(width, x + w + reach); col++) {
                    const pixel = row * width + col, index = pixel * 4;
                    if (!data[index + 3]) continue;
                    const dx = Math.max(x - col, col - (x + w - 1), 0);
                    const dy = Math.max(y - row, row - (y + h - 1), 0);
                    const value = brightness(index);
                    let mix, intensity;
                    if (map.emission[pixel]) {
                        if (dx || dy) continue; // Another fixture owns this light.
                        mix = 0.72 + 0.28 * map.emission[pixel] / 255;
                        intensity = 0.72 + 0.28 * value / peak;
                    } else {
                        const falloff = Math.max(0, 1 - Math.hypot(dx, dy) / reach);
                        mix = spill * Math.round(falloff * 8) / 8 * (0.20 + 0.8 * value / 255);
                        intensity = 1;
                    }
                    for (let channel = 0; channel < 3; channel++) {
                        lit[index + channel] += (color[channel] * intensity - lit[index + channel]) * mix;
                    }
                }
            }
        }
    }

    // Rasterize only integer logical pixels. Retain the tight ground bitmap
    // separately so a cast or pool may extend outside the original PNG.
    function groundBitmap(map, pools, contactMode = '') {
        const rows = [];
        let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;

        function span(y, x0, x1, color) {
            const start = Math.ceil(x0 - 0.5);
            const end = Math.ceil(x1 - 0.5);
            if (end <= start) return;
            rows.push({x: start, y, w: end - start, color});
            left = Math.min(left, start);
            right = Math.max(right, end);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y + 1);
        }
        function ellipse(shape, color, scale, offsetY = 0) {
            const {cx} = shape;
            const cy = shape.cy + offsetY;
            const rx = shape.rx * scale, ry = shape.ry * scale;
            for (let y = Math.ceil(cy - ry - 0.5); y < cy + ry - 0.5; y++) {
                const half = rx * Math.sqrt(Math.max(0, 1 - ((y + 0.5 - cy) / ry) ** 2));
                span(y, cx - half, cx + half, color);
            }
        }
        const sun = contactMode === 'outdoor' ? highSun : lightingState();
        for (const foot of renderer.footprints(map, sun)) {
            const color = 'rgba(26,20,21,' + foot.opacity + ')';
            if (foot.kind === 'cast') {
                // footprints() returns the left/right base and the offset tip.
                const [a, b, c, d] = foot.points;
                for (let y = Math.ceil(a[1] - 0.5); y < d[1] - 0.5; y++) {
                    const t = (y + 0.5 - a[1]) / (d[1] - a[1]);
                    const shade = contactMode
                        ? 'rgba(0,0,0,' + foot.opacity * (0.72 - 0.55 * t) + ')'
                        : color;
                    span(y, a[0] + (d[0] - a[0]) * t, b[0] + (c[0] - b[0]) * t, shade);
                }
            } else if (contactMode) {
                // A narrow contact edge against each actual foot or plinth.
                ellipse(foot.shape, 'rgba(0,0,0,0.055)', 1);
                ellipse(foot.shape, 'rgba(0,0,0,0.085)', 0.72);
            } else {
                ellipse(foot.shape, color, 1);
            }
        }
        if (period === 'night') {
            for (const pool of pools || []) {
                // Wider and fainter toward the open pavement. Composite narrow
                // bands front-to-back in logical pixels, keeping ground detail.
                const tint = pool.color || [239, 170, 86];
                const bands = 16;
                let previous = 0;
                for (let band = 1; band <= bands; band++) {
                    const t = band / bands;
                    const opacity = pool.opacity * t * t * (3 - 2 * t);
                    const alpha = (opacity - previous) / (1 - previous);
                    const scale = 1 - (band - 1) / bands;
                    const color = 'rgba(' + tint.join(',') + ',' + alpha + ')';
                    ellipse(pool, color, scale, -(1 - scale) * pool.ry * 0.25);
                    previous = opacity;
                }
            }
        }
        if (!rows.length) return null;
        const canvas = makeCanvas(right - left, bottom - top);
        const ctx = canvas.getContext('2d');
        for (const row of rows) {
            ctx.fillStyle = row.color;
            ctx.fillRect(row.x - left, row.y - top, row.w, 1);
        }
        return {canvas, left, top};
    }

    function discard(key, entry) {
        cache.delete(key);
        pixels -= entry.pixels;
        if (entry.canvas) entry.canvas.width = 0;
        if (entry.ground) entry.ground.canvas.width = 0;
    }

    function retain(key, entry) {
        while (cache.size >= maxEntries || pixels + entry.pixels > maxPixels) {
            let oldest;
            for (const candidate of cache.values()) {
                if (!oldest || candidate.stamp < oldest.stamp) oldest = candidate;
            }
            discard(oldest.key, oldest);
            evictions++;
        }
        entry.key = key;
        entry.stamp = ++stamp;
        cache.set(key, entry);
        pixels += entry.pixels;
        return entry;
    }

    function prepare(source, objectId, material, indoor = false) {
        const contact = softNoon() && materials.noonContacts[objectId];
        const contactMode = contact ? (indoor ? 'indoor' : 'outdoor') : '';
        const width = source.naturalWidth, height = source.naturalHeight;
        if (!width || !height || source.complete === false) return null; // Existing loader retries.
        const key = [renderer.VERSION, materials.version, period, objectId, contactMode,
            source.currentSrc || source.src, width, height].join('|');
        const old = cache.get(key);
        if (old) {
            if (old.source === source) {
                hits++;
                old.stamp = ++stamp;
                return old;
            }
            discard(key, old); // A reloaded source may recover from a prior readback error.
        }

        const entry = {source, canvas: null, ground: null, pixels: 0};
        try {
            const grid = material || contact;
            const w = grid ? grid.width : width;
            const h = grid ? grid.height : height;
            if (grid && (width % w || height % h || width / w !== height / h ||
                (contact && (contact.width !== w || contact.height !== h)))) {
                throw new RangeError('Lighting logical grid does not match source');
            }
            if (contact && !material) {
                // Flat noon props (including room furniture) keep the original
                // source image. Only their small, tightly bounded shadow is cached.
                entry.ground = groundBitmap(contact, null, contactMode);
            } else {
                const canvas = makeCanvas(w, h);
                entry.canvas = canvas;
                const ctx = canvas.getContext('2d', {willReadFrequently: true});
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(source, 0, 0, w, h);
                const rgba = ctx.getImageData(0, 0, w, h);
                if (material) {
                    const map = renderer.paint(w, h, material.shapes);
                    const lit = renderer.render(rgba, map, lightingState(objectId)).data;
                    if (period === 'night') lightFixtures(rgba, lit, map, material.fixtures);
                    rgba.data.set(lit);
                    entry.ground = groundBitmap(contact || map, material.pools, contactMode);
                } else {
                    applyAmbient(rgba.data, source, objectId);
                }
                ctx.putImageData(rgba, 0, 0);
                if (ctx.isContextLost?.()) throw new Error('Lighting canvas was lost');
                entry.pixels = w * h;
            }
            if (entry.ground) entry.pixels += entry.ground.canvas.width * entry.ground.canvas.height;
            renders++;
        } catch (_) {
            // Negative entries use the same LRU bound; retry only with a new
            // image, version or period. Never show a shadow for a missing sprite.
            if (entry.canvas) entry.canvas.width = 0;
            if (entry.ground) entry.ground.canvas.width = 0;
            entry.canvas = entry.ground = null;
            failures++;
        }
        return retain(key, entry);
    }

    function image(sceneId, source, objectId = '') {
        if (!source || period === 'off' || !outdoor.has(sceneId) || objectId === 'station_ghost_npc_01') return source;
        const material = materials.objects[objectId];
        // The shared noon ambient transform is identity for unmapped surfaces.
        if (!material && period === 'noon') return source;
        return prepare(source, objectId, material)?.canvas || source;
    }

    function drawImage(ctx, sceneId, source, objectId, x, y, w, h) {
        const lit = image(sceneId, source, objectId);
        if (lit !== source) {
            try {
                ctx.drawImage(lit, x, y, w, h);
                return;
            } catch (_) {
                failures++;
                setPeriod('off');
            }
        }
        ctx.drawImage(source, x, y, w, h);
    }

    function drawGround(ctx, sceneId, source, objectId, x, y, w, h) {
        if (!source || !active(sceneId)) return;
        const indoor = sceneId === 'leisure_center_map';
        const material = indoor ? null : materials.objects[objectId];
        const grid = (softNoon() && materials.noonContacts[objectId]) || material;
        if (!grid) return;
        const entry = prepare(source, objectId, material, indoor);
        if (!entry?.ground) return;
        const ground = entry.ground;

        const sx = w / grid.width, sy = h / grid.height;
        const x1 = Math.round(x + ground.left * sx);
        const y1 = Math.round(y + ground.top * sy);
        const x2 = Math.round(x + (ground.left + ground.canvas.width) * sx);
        const y2 = Math.round(y + (ground.top + ground.canvas.height) * sy);
        ctx.save();
        try {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(ground.canvas, x1, y1, x2 - x1, y2 - y1);
        } catch (_) {
            // A lost backing store must not interrupt the town frame or leave a
            // detached light visible. The regular sprite path gets its original.
            pixels -= entry.pixels;
            if (entry.canvas) entry.canvas.width = 0;
            entry.ground.canvas.width = 0;
            entry.canvas = entry.ground = null;
            entry.pixels = 0;
            failures++;
        } finally {
            ctx.restore();
        }
    }

    root.YUMANIWA_TOWN_LIGHTING = Object.freeze({
        active, image, drawImage, drawGround, setPeriod, periodForTokyoTime,
        get period() { return period; },
        get softNoon() { return softNoon(); },
        stats() {
            return {entries: cache.size, pixels, maxEntries, maxPixels, hits, renders, failures, evictions};
        }
    });
})(window);
