#!/bin/sh
WK_R4_DIR=/root/.cache/ms-playwright/webkit-2336/minibrowser-wpe
export WEBKIT_EXEC_PATH="$WK_R4_DIR/bin"
export WEBKIT_INJECTED_BUNDLE_PATH="$WK_R4_DIR/lib"
export WEBKIT_INSPECTOR_RESOURCES_PATH="$WK_R4_DIR/share"
export LD_LIBRARY_PATH="$WK_R4_DIR/lib:$WK_R4_DIR/sys/lib:/tmp/r4-webkit-deps/extracted/usr/lib/x86_64-linux-gnu"
export XDG_DATA_DIRS="/tmp/r4-webkit-deps/extracted/usr/share:/usr/local/share:/usr/share"
exec "$WK_R4_DIR/bin/MiniBrowser" "$@"
