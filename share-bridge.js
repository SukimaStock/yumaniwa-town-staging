/* ==========================================
   湯間庭町 / 作品結果の共有ブリッジ

   外部ゲームのiframeから画像と文章を受け取り、
   最上位の湯間庭町ページで共有・保存を実行する。

   子作品から送るメッセージ:
   {
       type: "yumaniwa:share-result",
       version: 1,
       workId: "midnight-cola",
       title: "作品名",
       text: "共有文",
       fileName: "result.png",
       mimeType: "image/png",
       file: File | Blob
   }
   ========================================== */
(function () {
    "use strict";

    var TYPE_PROBE = "yumaniwa:share-bridge-probe";
    var TYPE_READY = "yumaniwa:share-bridge-ready";
    var TYPE_RESULT = "yumaniwa:share-result";
    var TYPE_STATUS = "yumaniwa:share-result-status";

    var MAX_FILE_BYTES = 12 * 1024 * 1024;
    var MAX_DATA_URL_LENGTH = 20 * 1024 * 1024;

    var playerLayer = document.getElementById("work-player");
    var frame = document.getElementById("work-player-frame");

    if (!playerLayer || !frame) return;

    var pendingShare = null;
    var pendingSource = null;
    var previewUrl = "";

    var ui = createShareUI();

    function createShareUI() {
        var style = document.createElement("style");
        style.id = "yumaniwa-share-bridge-style";
        style.textContent = [
            "#yumaniwa-share-panel[hidden]{display:none!important}",
            "#yumaniwa-share-panel{position:absolute;inset:0;z-index:40;display:flex;align-items:flex-end;justify-content:center;padding:max(14px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));box-sizing:border-box;background:rgba(3,6,9,.68);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);touch-action:none}",
            ".yumaniwa-share-card{width:min(430px,100%);max-height:calc(100dvh - 28px);overflow:auto;box-sizing:border-box;padding:16px;border:1px solid rgba(255,255,255,.18);border-radius:20px;background:rgba(16,22,29,.98);box-shadow:0 18px 52px rgba(0,0,0,.55);color:#fff;text-align:center}",
            ".yumaniwa-share-preview-wrap{display:flex;align-items:center;justify-content:center;min-height:120px;max-height:42dvh;margin-bottom:14px;border-radius:14px;overflow:hidden;background:#080a0d;border:1px solid rgba(255,255,255,.10)}",
            "#yumaniwa-share-preview{display:block;max-width:100%;max-height:42dvh;object-fit:contain}",
            ".yumaniwa-share-title{font-size:16px;font-weight:700;line-height:1.4;letter-spacing:.04em}",
            ".yumaniwa-share-message{margin-top:6px;color:rgba(255,255,255,.70);font-size:12px;line-height:1.6}",
            ".yumaniwa-share-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px}",
            ".yumaniwa-share-action{min-height:48px;padding:10px 12px;border-radius:13px;border:1px solid rgba(255,255,255,.18);font-size:14px;font-weight:700;touch-action:manipulation;-webkit-tap-highlight-color:transparent}",
            "#yumaniwa-share-native{background:#f0b35d;color:#2a160a;border-color:#f3c27f}",
            "#yumaniwa-share-save{background:rgba(255,255,255,.08);color:#fff}",
            "#yumaniwa-share-native[hidden]{display:none!important}",
            "#yumaniwa-share-close{width:100%;margin-top:10px;padding:10px;border:0;background:transparent;color:rgba(255,255,255,.68);font-size:13px;touch-action:manipulation}",
            "@media (min-width:701px){#yumaniwa-share-panel{align-items:center}.yumaniwa-share-card{padding:20px}.yumaniwa-share-preview-wrap{max-height:48dvh}#yumaniwa-share-preview{max-height:48dvh}}"
        ].join("");
        document.head.appendChild(style);

        var panel = document.createElement("div");
        panel.id = "yumaniwa-share-panel";
        panel.hidden = true;
        panel.setAttribute("aria-hidden", "true");
        panel.innerHTML = [
            '<div class="yumaniwa-share-card" role="dialog" aria-modal="true" aria-labelledby="yumaniwa-share-title">',
            '  <div class="yumaniwa-share-preview-wrap"><img id="yumaniwa-share-preview" alt="共有する結果画像"></div>',
            '  <div class="yumaniwa-share-title" id="yumaniwa-share-title">作品の記録</div>',
            '  <div class="yumaniwa-share-message" id="yumaniwa-share-message">画像の準備ができました。</div>',
            '  <div class="yumaniwa-share-actions">',
            '    <button class="yumaniwa-share-action" id="yumaniwa-share-native" type="button">共有する</button>',
            '    <button class="yumaniwa-share-action" id="yumaniwa-share-save" type="button">画像を保存</button>',
            '  </div>',
            '  <button id="yumaniwa-share-close" type="button">ゲームへ戻る</button>',
            '</div>'
        ].join("");
        playerLayer.appendChild(panel);

        var result = {
            panel: panel,
            card: panel.querySelector(".yumaniwa-share-card"),
            preview: document.getElementById("yumaniwa-share-preview"),
            title: document.getElementById("yumaniwa-share-title"),
            message: document.getElementById("yumaniwa-share-message"),
            shareButton: document.getElementById("yumaniwa-share-native"),
            saveButton: document.getElementById("yumaniwa-share-save"),
            closeButton: document.getElementById("yumaniwa-share-close")
        };

        result.card.addEventListener("click", function (event) {
            event.stopPropagation();
        });

        panel.addEventListener("click", function (event) {
            if (event.target === panel) closeSharePanel("closed");
        });

        result.shareButton.addEventListener("click", sharePendingResult);
        result.saveButton.addEventListener("click", savePendingResult);
        result.closeButton.addEventListener("click", function () {
            closeSharePanel("closed");
        });

        return result;
    }

    function isPlayerOpen() {
        return playerLayer.classList.contains("visible");
    }

    function currentWorkMatches(workId) {
        if (!workId) return true;
        if (typeof window.currentWorkId === "undefined") return true;
        return String(window.currentWorkId || "") === String(workId);
    }

    function safePost(target, message) {
        if (!target || typeof target.postMessage !== "function") return;
        try {
            target.postMessage(message, "*");
        } catch (error) {
            // 外部作品がすでに閉じられている場合は何もしない。
        }
    }

    function sendReady(target, workId) {
        safePost(target, {
            type: TYPE_READY,
            version: 1,
            workId: workId || (window.currentWorkId || "")
        });
    }

    function sendStatus(status, detail) {
        safePost(pendingSource, {
            type: TYPE_STATUS,
            version: 1,
            workId: pendingShare ? pendingShare.workId : "",
            status: status,
            detail: detail || ""
        });
    }

    function revokePreviewUrl() {
        if (!previewUrl) return;
        try {
            URL.revokeObjectURL(previewUrl);
        } catch (error) {
            // noop
        }
        previewUrl = "";
    }

    function dataUrlToFile(dataUrl, fileName, mimeType) {
        if (
            typeof dataUrl !== "string" ||
            dataUrl.length <= 0 ||
            dataUrl.length > MAX_DATA_URL_LENGTH
        ) {
            return null;
        }

        var comma = dataUrl.indexOf(",");
        if (comma < 0) return null;

        var header = dataUrl.slice(0, comma);
        var body = dataUrl.slice(comma + 1);
        var detectedType = mimeType || "image/png";
        var match = /^data:([^;,]+)/i.exec(header);
        if (match && match[1]) detectedType = match[1];

        try {
            var binary = header.indexOf(";base64") >= 0
                ? window.atob(body)
                : decodeURIComponent(body);
            var bytes = new Uint8Array(binary.length);
            for (var i = 0; i < binary.length; i += 1) {
                bytes[i] = binary.charCodeAt(i);
            }
            return new File(
                [bytes],
                fileName || "yumaniwa-result.png",
                { type: detectedType }
            );
        } catch (error) {
            return null;
        }
    }

    function normalizeResultMessage(data) {
        if (!data || data.type !== TYPE_RESULT) return null;
        if (!currentWorkMatches(data.workId)) return null;

        var file = null;

        if (
            typeof Blob !== "undefined" &&
            data.file instanceof Blob &&
            data.file.size > 0 &&
            data.file.size <= MAX_FILE_BYTES &&
            /^image\//i.test(data.file.type || data.mimeType || "")
        ) {
            if (data.file instanceof File) {
                file = data.file;
            } else {
                file = new File(
                    [data.file],
                    data.fileName || "yumaniwa-result.png",
                    { type: data.file.type || data.mimeType || "image/png" }
                );
            }
        }

        if (!file && data.dataUrl) {
            file = dataUrlToFile(
                data.dataUrl,
                data.fileName,
                data.mimeType
            );
        }

        if (!file || file.size > MAX_FILE_BYTES) return null;

        return {
            workId: String(data.workId || window.currentWorkId || ""),
            title: String(data.title || "作品の記録").slice(0, 120),
            text: String(data.text || "").slice(0, 4000),
            file: file
        };
    }

    function openSharePanel(result, sourceWindow) {
        clearPending(false);
        pendingShare = result;
        pendingSource = sourceWindow || null;

        previewUrl = URL.createObjectURL(result.file);
        ui.preview.src = previewUrl;
        ui.title.textContent = result.title || "作品の記録";
        ui.message.textContent = "画像の準備ができました。共有先や保存方法を選んでください。";
        ui.shareButton.hidden = !(navigator && typeof navigator.share === "function");
        ui.panel.hidden = false;
        ui.panel.setAttribute("aria-hidden", "false");

        sendStatus("ready");
    }

    function clearPending(hidePanel) {
        revokePreviewUrl();
        pendingShare = null;
        pendingSource = null;
        ui.preview.removeAttribute("src");
        if (hidePanel !== false) {
            ui.panel.hidden = true;
            ui.panel.setAttribute("aria-hidden", "true");
        }
    }

    function closeSharePanel(status) {
        if (pendingShare && status) sendStatus(status);
        clearPending(true);
    }

    function buildShareData(result) {
        var shareData = {
            title: result.title,
            text: result.text
        };

        var canShareFile = false;
        try {
            canShareFile =
                !navigator.canShare ||
                navigator.canShare({ files: [result.file] });
        } catch (error) {
            canShareFile = false;
        }

        if (canShareFile) {
            shareData.files = [result.file];
        }

        return shareData;
    }

    async function sharePendingResult(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!pendingShare || !navigator || typeof navigator.share !== "function") {
            ui.message.textContent = "この端末では共有画面を開けません。画像保存をご利用ください。";
            sendStatus("failed", "share-unavailable");
            return;
        }

        ui.shareButton.disabled = true;
        ui.message.textContent = "共有画面を開いています…";

        try {
            await navigator.share(buildShareData(pendingShare));
            sendStatus("shared");
            clearPending(true);
        } catch (error) {
            if (error && error.name === "AbortError") {
                ui.message.textContent = "共有をキャンセルしました。";
                sendStatus("cancelled");
            } else {
                ui.message.textContent = "共有画面を開けませんでした。画像保存をご利用ください。";
                sendStatus("failed", error && error.name ? error.name : "share-error");
            }
        } finally {
            ui.shareButton.disabled = false;
        }
    }

    function savePendingResult(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!pendingShare || !pendingShare.file) return;

        var url = URL.createObjectURL(pendingShare.file);
        var anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = pendingShare.file.name || "yumaniwa-result.png";
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);

        window.setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1600);

        sendStatus("saved");
        clearPending(true);
    }

    window.addEventListener("message", function (event) {
        var data = event.data;
        if (!data || typeof data !== "object") return;

        if (data.type === TYPE_PROBE) {
            if (isPlayerOpen() && currentWorkMatches(data.workId)) {
                sendReady(event.source, data.workId);
            }
            return;
        }

        if (data.type !== TYPE_RESULT || !isPlayerOpen()) return;

        var result = normalizeResultMessage(data);
        if (!result) {
            safePost(event.source, {
                type: TYPE_STATUS,
                version: 1,
                workId: data.workId || "",
                status: "failed",
                detail: "invalid-payload"
            });
            return;
        }

        openSharePanel(result, event.source);
    });

    frame.addEventListener("load", function () {
        if (!isPlayerOpen() || !frame.contentWindow) return;
        window.setTimeout(function () {
            sendReady(frame.contentWindow, window.currentWorkId || "");
        }, 180);
        window.setTimeout(function () {
            sendReady(frame.contentWindow, window.currentWorkId || "");
        }, 900);
    });

    var playerObserver = new MutationObserver(function () {
        if (!isPlayerOpen()) {
            clearPending(true);
        }
    });

    playerObserver.observe(playerLayer, {
        attributes: true,
        attributeFilter: ["class"]
    });
})();
