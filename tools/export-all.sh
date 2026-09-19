#!/usr/bin/env bash
#
# Render every deck in the repo to a PDF, and fail if any of them fails.
#
#   docker compose -f compose.slidev.yml run --rm export
#   docker compose -f compose.slidev.yml run --rm export my-talk
#   CLICKS=1 docker compose -f compose.slidev.yml run --rm export my-talk
#
# Output lands in build/. With no arguments every deck is rendered; otherwise
# only the deck directories named on the command line.
#
# Each deck is staged into a scratch directory with `common/` and `shared/`
# copied in beside it, because a deck's `theme:` path is resolved relative to
# its own slides.md — the same reason compose bind-mounts them into /app.

set -uo pipefail

REPO=${REPO:-/repo}
OUT=${OUT:-$REPO/build}
CLICKS=${CLICKS:-0}
TIMEOUT=${TIMEOUT:-90000}

cd "$REPO" || { echo "cannot enter $REPO" >&2; exit 2; }

# Find every deck under a path. A "deck" is any directory holding a slides.md.
find_decks() {
  find "$1" -name slides.md \
       -not -path '*/node_modules/*' \
       -not -path './common/*' \
       -not -path './shared/*' \
       -not -path './build/*' \
       -printf '%h\n' | sed 's|^\./||' | sort
}

decks=()
if [ "$#" -eq 0 ]; then
  mapfile -t decks < <(find_decks .)
else
  # An argument may be a single deck (meetings/2026-08-31) or a folder that
  # holds several (meetings) — both do the useful thing.
  for arg in "$@"; do
    arg=${arg%/}
    if [ -f "$arg/slides.md" ]; then
      decks+=("$arg")
    elif [ -d "$arg" ]; then
      mapfile -t found < <(find_decks "$arg")
      if [ "${#found[@]}" -eq 0 ]; then
        echo "no slides.md under $arg" >&2
      else
        decks+=("${found[@]}")
      fi
    else
      echo "no such deck or folder: $arg" >&2
    fi
  done
fi

if [ "${#decks[@]}" -eq 0 ]; then
  echo "no decks found" >&2
  exit 1
fi

mkdir -p "$OUT"
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

ok=(); bad=()
printf '%s\n' "rendering ${#decks[@]} deck(s) -> $OUT" ""

for deck in "${decks[@]}"; do
  deck=${deck%/}
  if [ ! -f "$REPO/$deck/slides.md" ]; then
    printf '  %-34s SKIP  no slides.md\n' "$deck"
    bad+=("$deck (no slides.md)")
    continue
  fi

  name=${deck//\//-}
  work="$STAGE/$name"
  mkdir -p "$work"

  # Stage the deck exactly as the dev server sees it.
  cp -r "$REPO/$deck/." "$work/" 2>/dev/null
  rm -rf "$work/common" "$work/shared" "$work/node_modules" "$work/dist"
  [ -d "$REPO/common" ] && cp -r "$REPO/common" "$work/common"
  [ -d "$REPO/shared" ] && cp -r "$REPO/shared" "$work/shared"

  args=(export slides.md --format pdf --output "$OUT/$name.pdf" --timeout "$TIMEOUT")
  [ "$CLICKS" = "1" ] && args+=(--with-clicks)

  log="$STAGE/$name.log"
  start=$SECONDS
  if (cd "$work" && slidev "${args[@]}") > "$log" 2>&1; then
    pages=$(pdfinfo "$OUT/$name.pdf" 2>/dev/null | awk '/^Pages:/{print $2}')
    printf '  %-34s ok    %3s pages  %3ds\n' "$deck" "${pages:-?}" "$((SECONDS - start))"
    ok+=("$deck")
  else
    printf '  %-34s FAIL  %3ds\n' "$deck" "$((SECONDS - start))"
    bad+=("$deck")
    echo "    ---- last 15 lines ----"
    tail -15 "$log" | sed 's/^/    /'
    cp "$log" "$OUT/$name.error.log"
  fi
done

# One merged file is the fastest way to scan everything: open it and use the
# viewer's thumbnail pane as a contact sheet.
if [ "${#ok[@]}" -gt 1 ] && command -v pdfunite >/dev/null; then
  mapfile -t pdfs < <(for d in "${ok[@]}"; do echo "$OUT/${d//\//-}.pdf"; done)
  if pdfunite "${pdfs[@]}" "$OUT/all-decks.pdf" 2>/dev/null; then
    echo "" && echo "  merged -> build/all-decks.pdf"
  fi
fi

# The container runs as root so that Vite can write its cache inside the global
# Slidev install; hand the results back so build/ is yours on the host.
if [ -n "${HOST_UID:-}" ] && [ "$(id -u)" = "0" ]; then
  chown -R "${HOST_UID}:${HOST_GID:-$HOST_UID}" "$OUT" 2>/dev/null || true
fi

echo ""
echo "  ${#ok[@]} ok, ${#bad[@]} failed"
if [ "${#bad[@]}" -gt 0 ]; then
  printf '    %s\n' "${bad[@]}"
  echo "  logs in build/*.error.log"
  exit 1
fi
