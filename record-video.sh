#!/usr/bin/env bash
#
# Render a deck to an mp4 by playing it and recording the screen.
#
#   ./record my-talk
#   ./record my-talk --dwell 4
#
# A slide can override the dwell for itself, in its own frontmatter:
#
#   ---
#   dwell: 14        # hold each step of this slide for 14 seconds
#   ---
#
# which is what a slide playing a twelve-second clip wants. The dwell is time
# spent on a slide that has stopped moving: the recorder waits for the
# animations to finish first, so a figure that takes two seconds to draw
# itself in still gets its full dwell afterwards.
#   DWELL=4 docker compose -f compose.slidev.yml run --rm \
#     --entrypoint /repo/tools/record-video.sh export my-talk
#
# Output lands in build/<deck>.mp4.
#
# Why a recording and not a slideshow of stills: the decks animate. Curves
# draw themselves in, phrases arrive on a click, slides wipe, some slides play
# video. `slidev export --format png --with-clicks` gives you the states but
# none of the motion between them, and motion is most of what a video export
# is for. The cost is that this runs in real time — a forty-slide talk at four
# seconds a step is a few minutes of wall clock.
#
# This runs inside the export image, which already has Chromium, Playwright
# and the Palatino clone; it adds ffmpeg and Google Chrome on top. It starts
# its own dev server, so nothing needs to be running before you call it.

set -uo pipefail

# Re-exec from a private copy.
#
# Bash reads a script incrementally rather than all at once, and this one is
# bind-mounted from a repo whose author may well edit it during the ten
# minutes it runs. An edit mid-run shifts the bytes under the interpreter and
# it dies on whatever it reads next. Copying first costs nothing and makes the
# running job independent of the file on disk. The copy unlinks itself: the
# kernel keeps the open fd, so bash reads on from a file with no name.
if [ -z "${RECORD_REEXEC:-}" ] && [ -f "$0" ]; then
  _self=$(mktemp)
  cat "$0" > "$_self" && chmod +x "$_self" || { echo "cannot copy $0" >&2; exit 2; }
  RECORD_REEXEC=1 exec bash "$_self" "$@"
fi
[ -n "${RECORD_REEXEC:-}" ] && rm -f "$0"

REPO=${REPO:-/repo}
OUT=${OUT:-$REPO/build}
PORT=${PORT:-3050}

# Seconds to hold each click step. Four is about right for a talk somebody is
# going to watch; two reads as a flick-through.
export DWELL=${DWELL:-4}
export FIRST_DWELL=${FIRST_DWELL:-$DWELL}
export TAIL_DWELL=${TAIL_DWELL:-3}
export WIDTH=${WIDTH:-1920}
export HEIGHT=${HEIGHT:-1080}
export MAX_STEPS=${MAX_STEPS:-600}
export SETTLE=${SETTLE:-0.6}
SETTLE_CAP=${MAX_SETTLE:-8}
FPS=${FPS:-30}
CRF=${CRF:-20}

# Flags, so the host wrapper can pass them through without a table of env vars.
deck=""
while [ $# -gt 0 ]; do
  case $1 in
    --dwell) DWELL=$2; FIRST_DWELL=$2; shift 2 ;;
    --fps) FPS=$2; shift 2 ;;
    --crf) CRF=$2; shift 2 ;;
    --width) WIDTH=$2; shift 2 ;;
    --height) HEIGHT=$2; shift 2 ;;
    --max-steps) MAX_STEPS=$2; shift 2 ;;
    --max-settle) SETTLE_CAP=$2; shift 2 ;;
    --out) OUT=$2; shift 2 ;;
    --check) CHECK=1; shift ;;
    --allow-chromium) ALLOW_CHROMIUM=1; shift ;;
    -*) echo "unknown flag: $1" >&2; exit 2 ;;
    *) deck=${1%/}; shift ;;
  esac
done
export DWELL FIRST_DWELL WIDTH HEIGHT MAX_STEPS
export MAX_SETTLE=$SETTLE_CAP

cd "$REPO" || { echo "cannot enter $REPO" >&2; exit 2; }

# `--check` answers the only question this image is ever asked: can it record
# a deck whose slides play .mp4, or will those slides come out black? The last
# of the three is the one that counts, because it launches the browser the
# recorder will actually launch, rather than inferring from what is installed.
if [ "${CHECK:-0}" = "1" ]; then
  echo "record --check"
  if command -v ffmpeg >/dev/null; then
    echo "  ffmpeg      $(ffmpeg -version 2>/dev/null | head -1 | awk '{print $3}')"
  else
    echo "  ffmpeg      MISSING — rebuild the export image"
  fi
  if command -v google-chrome >/dev/null; then
    echo "  chrome      $(google-chrome --version 2>/dev/null)"
  else
    echo "  chrome      MISSING — .mp4 slides would record as black rectangles"
  fi
  hostfonts=$(find /usr/local/share/fonts -maxdepth 2 -type f \
                \( -name '*.ttf' -o -name '*.otf' -o -name '*.ttc' \) 2>/dev/null | wc -l)
  echo "  host fonts  $hostfonts file(s) mounted from the host"
  probe=$(mktemp -d)
  ln -sfn "$(npm root -g)" "$probe/node_modules"
  cat > "$probe/check.mjs" <<'PROBE'
import { chromium } from 'playwright-chromium'
try {
  const b = await chromium.launch({ channel: 'chrome' })
  console.log(`  playwright  launches Chrome ${b.version()} — H.264 will decode`)
  await b.close()
} catch (err) {
  const why = String(err?.message ?? err).split(String.fromCharCode(10))[0]
  console.log(`  playwright  cannot launch Chrome: ${why}`)
  console.log('              recordings fall back to Chromium and .mp4 slides')
  console.log('              will be black. Rebuild the image:')
  console.log('                docker compose -f compose.slidev.yml build export')
  process.exitCode = 1
}
PROBE
  ( cd "$probe" && node check.mjs )
  code=$?
  rm -rf "$probe"
  exit $code
fi

if [ -z "$deck" ]; then
  echo "usage: record <deck> [--dwell 4] [--fps 30] [--width 1920] [--height 1080]" >&2
  echo "       record --check       # can this image decode .mp4 slides?" >&2
  echo "" >&2
  echo "  --allow-chromium   record without Chrome, accepting black .mp4 slides" >&2
  exit 2
fi
if [ ! -f "$REPO/$deck/slides.md" ]; then
  echo "no such deck: $deck (no $deck/slides.md)" >&2
  exit 1
fi
command -v ffmpeg >/dev/null || {
  echo "ffmpeg is not in this image — rebuild it:" >&2
  echo "  docker compose -f compose.slidev.yml build export" >&2
  exit 1
}

# Chrome, before anything expensive happens.
#
# Playwright's bundled Chromium has no H.264 decoder, so a deck with .mp4
# assets records those slides as black rectangles. That is worth ten minutes
# of somebody's time to discover at the end, so it is checked here instead —
# and only complained about when the deck actually has video in it, because
# most do not and it makes no difference to them.
# Pick up any font directories mounted in from the host. fontconfig only sees
# what is in its cache, and a read-only bind mount added after the image was
# built is not in it.
if command -v fc-cache >/dev/null; then
  fc-cache -f >/dev/null 2>&1
fi

# Families the deck asks for, against what fontconfig can actually serve.
#
# The image ships URW Palladio, a metric-compatible Palatino clone, so a deck
# that has lost its real Palatino still lays out correctly — and in a PDF that
# is the whole battle. In a video you can see the glyphs, so a substitution
# that is invisible in an export is obvious here, and worth saying out loud.
#
# Only the first family of each stack is checked. The rest of a stack is by
# definition the fallback, and flagging those is noise. KaTeX is skipped: it
# ships its own webfonts with its CSS and never asks fontconfig for anything.
audit_fonts() {
  local dir=$1 fam got bad=0 list=()
  command -v fc-match >/dev/null || return 0
  mapfile -t list < <(
    grep -rhoE "(font-family|--font-[a-z0-9-]+)[[:space:]]*:[^;}]*" "$dir" \
      --include='*.css' --include='*.vue' --include='*.md' \
      --exclude-dir=node_modules 2>/dev/null |
    sed -e 's/^[^:]*:[[:space:]]*//' -e 's/!important//' |
    cut -d, -f1 | tr -d "\"'" |
    sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' |
    grep -viE '^(var\(.*|inherit|initial|unset|revert|serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math|fangsong)$' |
    grep -viE '^KaTeX_' | grep -vE '^$' | sort -u
  )
  [ "${#list[@]}" -eq 0 ] && return 0
  echo "  fonts"
  for fam in "${list[@]}"; do
    got=$(fc-match -f '%{family[0]}' "$fam" 2>/dev/null)
    if [ "${got,,}" = "${fam,,}" ]; then
      printf '    %-30s ok\n' "$fam"
    else
      printf '    %-30s SUBSTITUTED by %s\n' "$fam" "${got:-nothing}"
      bad=1
    fi
  done
  if [ "$bad" = 1 ]; then
    echo ""
    echo "  A substituted family lays out the same but does not look the same," >&2
    echo "  and in a video you can see the difference. ./record mounts" >&2
    echo "  ~/.fonts and ~/.local/share/fonts read-only; put the font there" >&2
    echo "  on the host and run again." >&2
    echo ""
  fi
  return 0
}

videos=$(grep -rhoiIE "[^\"' ]+\.(mp4|m4v|mov)" "$REPO/$deck" \
           --exclude-dir=common --exclude-dir=node_modules 2>/dev/null |
         sort -u | wc -l)

if ! command -v google-chrome >/dev/null; then
  if [ "$videos" -gt 0 ] && [ "${ALLOW_CHROMIUM:-0}" != "1" ]; then
    echo "" >&2
    echo "  Google Chrome is not in this image." >&2
    echo "" >&2
    echo "  Playwright's bundled Chromium carries no H.264 decoder, and this" >&2
    echo "  deck references $videos video file(s). Those slides would record as" >&2
    echo "  black rectangles." >&2
    echo "" >&2
    echo "  Rebuild the image, which is a cheap layer on one you already have:" >&2
    echo "    docker compose -f compose.slidev.yml build export" >&2
    echo "" >&2
    echo "  Or record anyway and accept the black rectangles:" >&2
    echo "    ./record $deck --allow-chromium" >&2
    echo "" >&2
    exit 1
  fi
  echo "  note: no Google Chrome, so H.264 will not decode — this deck"
  if [ "$videos" -gt 0 ]; then
    echo "        references $videos video file(s), which will record black"
  else
    echo "        references no video, so it makes no difference here"
  fi
fi
export ALLOW_CHROMIUM=${ALLOW_CHROMIUM:-0}
export DECK_VIDEOS=$videos

name=${deck//\//-}
mkdir -p "$OUT"

STAGE=$(mktemp -d)
cleanup() {
  [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null
  rm -rf "$STAGE"
}
trap cleanup EXIT

# Stage the deck exactly as the dev server sees it: a deck's `theme:` path is
# resolved relative to its own slides.md, which is why common/ is copied in
# beside it rather than referenced where it lives.
work="$STAGE/deck"
mkdir -p "$work"
cp -r "$REPO/$deck/." "$work/" 2>/dev/null
rm -rf "$work/common" "$work/node_modules" "$work/dist"
[ -d "$REPO/common" ] && cp -r "$REPO/common" "$work/common"

# The driver runs from its own directory with node_modules pointed at the
# global install, because Playwright is installed globally and ESM resolution
# does not read NODE_PATH. Keeping it out of the deck directory matters: a
# node_modules symlink in there would change how Slidev resolves the theme.
driver="$STAGE/driver"
mkdir -p "$driver"
cp "$REPO/tools/record-slides.mjs" "$driver/"
ln -sfn "$(npm root -g)" "$driver/node_modules"

audit_fonts "$work"

WALL_START=$SECONDS
echo "recording $deck"
echo "  ${WIDTH}x${HEIGHT} at ${FPS}fps, ${DWELL}s per step"
echo "  starting the dev server; this runs in real time, so a long deck takes"
echo "  about (steps x ${DWELL}s) plus a minute to encode"

# Started without a subshell so that SERVER_PID is the server itself and the
# trap can actually reach it, rather than a shell that has already forked.
pushd "$work" >/dev/null || exit 1
# --remote binds 0.0.0.0 rather than whichever of 127.0.0.1 / ::1 the
# runtime picks for "localhost", which is what the driver then has to guess.
slidev slides.md --port "$PORT" --no-open --remote > "$STAGE/server.log" 2>&1 &
SERVER_PID=$!
popd >/dev/null || exit 1

export BASE="http://127.0.0.1:$PORT"
export RAW_DIR="$STAGE/raw"
mkdir -p "$RAW_DIR"

result=$(cd "$driver" && node record-slides.mjs)
status=$?
if [ "$status" -ne 0 ] || [ -z "$result" ]; then
  echo "  recording failed" >&2
  echo "  ---- last 20 lines of the dev server ----" >&2
  tail -20 "$STAGE/server.log" | sed 's/^/    /' >&2
  cp "$STAGE/server.log" "$OUT/$name.record.error.log" 2>/dev/null
  exit 1
fi

raw=$(printf '%s' "$result" | sed -n 's/.*"raw":"\([^"]*\)".*/\1/p')
steps=$(printf '%s' "$result" | sed -n 's/.*"steps":\([0-9]*\).*/\1/p')
offset=$(printf '%s' "$result" | sed -n 's/.*"readyOffset":\([0-9.]*\).*/\1/p')
engine=$(printf '%s' "$result" | sed -n 's/.*"engine":"\([^"]*\)".*/\1/p')

if [ -z "$raw" ] || [ ! -f "$raw" ]; then
  echo "  the browser produced no video file" >&2
  exit 1
fi

echo "  walked ${steps:-?} step(s) in $engine"
rawsecs=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$raw" 2>/dev/null | cut -d. -f1)
echo "  encoding ${rawsecs:-?}s of video to H.264"

# Playwright writes VP8 in a webm. Re-encode to H.264 so it plays anywhere,
# and trim the head, which is the dev server compiling the first slide.
# -ss after -i is the accurate seek; the fast one lands on a keyframe.
if ! ffmpeg -y -v warning -stats -i "$raw" \
      -ss "${offset:-0}" \
      -c:v libx264 -preset medium -crf "$CRF" \
      -pix_fmt yuv420p -r "$FPS" -movflags +faststart \
      "$OUT/$name.mp4"; then
  echo "  ffmpeg failed; the raw recording is at $OUT/$name.webm" >&2
  cp "$raw" "$OUT/$name.webm"
  exit 1
fi

# The container runs as root so that Vite can write its cache inside the
# global Slidev install; hand the result back so build/ is yours on the host.
if [ -n "${HOST_UID:-}" ] && [ "$(id -u)" = "0" ]; then
  chown -R "${HOST_UID}:${HOST_GID:-$HOST_UID}" "$OUT" 2>/dev/null || true
fi

size=$(du -h "$OUT/$name.mp4" | cut -f1)
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/$name.mp4" 2>/dev/null | cut -d. -f1)
took=$((SECONDS - WALL_START))
echo "  -> build/$name.mp4  (${size}, ${dur:-?}s video, ${took}s to make)"
