(function() {
    // 作品プレイヤー左上の「戻る」表示を、実際の戻り先に合わせる。
    // 戻る挙動そのものは main.js の既存処理をそのまま使う。
    var baseGetWorkPlayerReturnLabel = window.getWorkPlayerReturnLabel;

    window.getWorkPlayerReturnLabel = function(work) {
        if (
            workPlayerReturnDestinationId &&
            window.DESTINATIONS &&
            window.DESTINATIONS[workPlayerReturnDestinationId]
        ) {
            var destination = window.DESTINATIONS[workPlayerReturnDestinationId];

            if (destination.title) {
                return destination.title;
            }
        }

        if (typeof baseGetWorkPlayerReturnLabel === "function") {
            return baseGetWorkPlayerReturnLabel(work);
        }

        return (work && work.returnLabel) || "町";
    };
})();
