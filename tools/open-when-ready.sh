#!/usr/bin/env bash
#
# Wait for a URL to start answering, then open paths under it in a browser.
#
#   tools/open-when-ready.sh http://localhost:3030 / /presenter
#
# This exists because ./present cannot open a browser itself: the server it
# starts runs in the foreground, and a tab opened before Vite has compiled the
# deck shows a connection error rather than a slide. ./present backgrounds this
# script instead, and it waits for the server to be genuinely up.
#
#   OPEN_TIMEOUT   seconds to wait before giving up (default 300 — the first
#                  run builds the image and warms Vite's cache, which is slow)
#   BROWSER        command to open a URL with, if you want a specific browser

set -uo pipefail

BASE=${1:?usage: open-when-ready.sh <base-url> [path...]}
shift
if [ "$#" -eq 0 ]; then
  paths=(/)
else
  paths=("$@")
fi

TIMEOUT=${OPEN_TIMEOUT:-300}

# Opening a browser only makes sense where there is one. Over SSH, or in CI,
# there is not, and the URLs ./present prints are the useful output instead.
have_display() {
  case "$(uname -s)" in
    Darwin) return 0 ;;
    *) [ -n "${DISPLAY:-}" ] || [ -n "${WAYLAND_DISPLAY:-}" ] ;;
  esac
}

open_url() {
  if [ -n "${BROWSER:-}" ]; then
    "$BROWSER" "$1"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$1"
  elif command -v open >/dev/null 2>&1; then
    open "$1"
  else
    return 1
  fi
}

# A plain TCP connect is not enough: Docker's port proxy accepts connections as
# soon as the container starts, well before Slidev answers on them. Ask for the
# page itself, so that "up" means "renders".
responds() {
  if command -v curl >/dev/null 2>&1; then
    curl -sfo /dev/null --max-time 2 "$1"
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O /dev/null --timeout=2 "$1"
  else
    sleep 5
    return 0
  fi
}

have_display || exit 0

deadline=$((SECONDS + TIMEOUT))
until responds "$BASE"; do
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "open-when-ready: $BASE did not answer within ${TIMEOUT}s" >&2
    exit 1
  fi
  sleep 0.5
done

for path in "${paths[@]}"; do
  url="${BASE%/}${path}"
  if ! open_url "$url" >/dev/null 2>&1; then
    echo "open-when-ready: no way to open a browser; visit $url yourself" >&2
    exit 1
  fi
  # Browsers that are not already running need a moment before the second URL,
  # or the two tabs race and one of them is dropped.
  sleep 0.6
done
