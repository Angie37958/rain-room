#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/check.mjs
node --test
node scripts/build.mjs
build="$PWD/android/build"
mkdir -p "$build/classes" "$build/dex" "$build/res/drawable" "$build/assets/web"
cp -R dist/. "$build/assets/web/"
cp assets/icon-192.png "$build/res/drawable/icon.png"
# The APK contains its own offline bundle and never registers a web service worker.
python3 - "$build/assets/web/index.html" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1])
p.write_text(p.read_text().replace('<meta name="rain-room-build" content="production">', ''), encoding='utf-8')
PY
tools="$ANDROID_HOME/build-tools/35.0.0"
platform="$ANDROID_HOME/platforms/android-35/android.jar"
"$tools/aapt" package -f -M android/AndroidManifest.xml -S "$build/res" -A "$build/assets" -I "$platform" -F "$build/unsigned.apk"
javac -encoding UTF-8 -source 8 -target 8 -classpath "$platform" -d "$build/classes" android/MainActivity.java
mapfile -t classes < <(find "$build/classes" -name '*.class')
"$tools/d8" --min-api 26 --lib "$platform" --output "$build/dex" "${classes[@]}"
(cd "$build/dex" && "$tools/aapt" add "$build/unsigned.apk" classes.dex)
"$tools/zipalign" -f -p 4 "$build/unsigned.apk" "$build/aligned.apk"
"$tools/apksigner" sign --ks "$ANDROID_SIGNING_KEYSTORE" --ks-key-alias rain-room --ks-pass env:ANDROID_KEYSTORE_PASSWORD --key-pass env:ANDROID_KEYSTORE_PASSWORD --out "$build/rain-room-0.12.1.apk" "$build/aligned.apk"
"$tools/apksigner" verify --verbose "$build/rain-room-0.12.1.apk"
"$tools/aapt" dump badging "$build/rain-room-0.12.1.apk" | sed -n '1,7p'
sha256sum "$build/rain-room-0.12.1.apk" > "$build/rain-room-0.12.1.apk.sha256"
