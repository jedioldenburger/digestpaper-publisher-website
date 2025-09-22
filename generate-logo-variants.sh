#!/usr/bin/env bash
# generate-logo-variants.sh - Produce multi-size PNG + WebP + AVIF logo variants.
# Requires: ImageMagick (magick OR convert), cwebp, avifenc (libavif)
# Env overrides: SRC, OUT_DIR, SIZES, WEBP_Q, AVIF_CQ
# Sizes default: 48 96 160 330 512
# Usage: ./scripts/generate-logo-variants.sh

set -euo pipefail
SRC=${SRC:-public/assets/digestpaper-media-logo.png}
OUT_DIR=${OUT_DIR:-public/assets}
SIZES=${SIZES:-"48 96 160 330 512"}
WEBP_Q=${WEBP_Q:-74}
AVIF_CQ=${AVIF_CQ:-32}

# Pick ImageMagick binary (IM7 prefers 'magick', older IM6 uses 'convert')
if command -v magick >/dev/null 2>&1; then
  IM_BIN="magick"
elif command -v convert >/dev/null 2>&1; then
  IM_BIN="convert" # will emit deprecation warning on IM7, safe to ignore
else
  echo "Missing dependency: ImageMagick (magick/convert)" >&2; exit 1
fi

for tool in cwebp avifenc; do
  if ! command -v $tool >/dev/null 2>&1; then
    echo "Missing dependency: $tool" >&2; exit 1
  fi
done

if [[ ! -f $SRC ]]; then
  echo "Source not found: $SRC" >&2; exit 1
fi

echo "Source: $SRC"

base=$(basename "$SRC")
name_no_ext=${base%.*}

size_bytes() { stat -f %z "$1" 2>/dev/null || stat -c %s "$1" 2>/dev/null || echo -n 0; }

for sz in $SIZES; do
  png_out="$OUT_DIR/${name_no_ext}-${sz}.png"
  webp_out="$OUT_DIR/${name_no_ext}-${sz}.webp"
  avif_out="$OUT_DIR/${name_no_ext}-${sz}.avif"

  echo -e "\n[SIZE $sz]"

  # PNG (idempotent rebuild)
  if [[ ! -f $png_out || $SRC -nt $png_out ]]; then
    $IM_BIN "$SRC" -resize ${sz}x${sz} "$png_out"
    echo "  PNG  → $(size_bytes "$png_out") bytes"
  else
    echo "  (keep existing PNG)"
  fi

  # WebP
  if [[ ! -f $webp_out || $png_out -nt $webp_out ]]; then
    cwebp -quiet -q "$WEBP_Q" "$png_out" -o "$webp_out"
    echo "  WebP → $(size_bytes "$webp_out") bytes (q=$WEBP_Q)"
  else
    echo "  (keep existing WebP)"
  fi

  # AVIF (attempt both flag syntaxes for broader avifenc compatibility)
  if [[ ! -f $avif_out || $png_out -nt $avif_out ]]; then
    avif_success=false
    if avifenc --cq-level "$AVIF_CQ" --jobs 4 --min 0 --max 63 "$png_out" "$avif_out" >/dev/null 2>&1; then
      avif_success=true
      echo "  AVIF → $(size_bytes "$avif_out") bytes (cq=$AVIF_CQ)"
    elif avifenc -q "$AVIF_CQ" --jobs 4 "$png_out" "$avif_out" >/dev/null 2>&1; then
      avif_success=true
      echo "  AVIF → $(size_bytes "$avif_out") bytes (q=$AVIF_CQ alt)"
    else
      echo "  (AVIF generation failed - skipping this size)"
    fi

    # Optional adaptive second pass if AVIF unexpectedly large (> PNG)
    if $avif_success && [[ -f $avif_out ]]; then
      png_sz=$(size_bytes "$png_out")
      avif_sz=$(size_bytes "$avif_out")
      if (( avif_sz > png_sz )); then
        # Try a slightly higher quality number (lower quality) to reduce size; bounds cap at 63
        alt=$(( AVIF_CQ + 6 ))
        if (( alt > 63 )); then alt=63; fi
        if avifenc --cq-level "$alt" --jobs 4 --min 0 --max 63 "$png_out" "${avif_out}.tmp" >/dev/null 2>&1 || \
           avifenc -q "$alt" --jobs 4 "$png_out" "${avif_out}.tmp" >/dev/null 2>&1; then
          tmp_sz=$(size_bytes "${avif_out}.tmp")
          if (( tmp_sz < avif_sz )); then
            mv "${avif_out}.tmp" "$avif_out"
            echo "    (adaptive recompress → $(size_bytes "$avif_out") bytes, cq=$alt)"
          else
            rm -f "${avif_out}.tmp"
          fi
        else
          rm -f "${avif_out}.tmp" 2>/dev/null || true
        fi
      fi
    fi
  else
    echo "  (keep existing AVIF)"
  fi
done

echo -e "\nAll variants generated. HTML references -48/-96/-160/-330/-512."
