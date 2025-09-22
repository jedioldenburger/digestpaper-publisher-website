# save as convert-assets.sh, then: chmod +x convert-assets.sh && ./convert-assets.sh
set -euo pipefail

ASSETS_DIR="${1:-.}"
cd "$ASSETS_DIR"

mkdir -p avif webp

shopt -s nocaseglob nullglob

is_lossless() {
  # lossless for brand/UX assets
  local name="${1##*/}"
  if [[ "$name" =~ (logo|icon|wordmark|favicon|sprite) ]]; then
    return 0
  fi
  return 1
}

encode_avif() {
  local src="$1"
  local base="${src%.*}"
  local dst="avif/$(basename "$base").avif"

  # skip if up-to-date
  if [[ -e "$dst" && "$dst" -nt "$src" ]]; then
    echo "AVIF up-to-date: $dst"
    return
  fi

  if is_lossless "$src"; then
    # Pixel-perfect for UI glyphs/logos
    avifenc -l -s 4 -j all --autotiling "$src" "$dst"
  else
    # Photographic/illustrative content
    # q≈60 is a strong default; bump --qalpha for clean edges w/ transparency
    avifenc -q 60 --qalpha 80 -s 6 -j all --autotiling "$src" "$dst"
  fi
  echo "AVIF wrote: $dst"
}

encode_webp() {
  local src="$1"
  local base="${src%.*}"
  local dst="webp/$(basename "$base").webp"

  # skip if up-to-date
  if [[ -e "$dst" && "$dst" -nt "$src" ]]; then
    echo "WebP up-to-date: $dst"
    return
  fi

  if is_lossless "$src"; then
    # Web UI assets: exact
    cwebp -lossless -m 6 -z 9 "$src" -o "$dst" >/dev/null
  else
    # Photographic/illustrative content
    # q≈82 is a sweet spot; sharper YUV helps edges
    cwebp -q 82 -m 4 -mt -sharp_yuv "$src" -o "$dst" >/dev/null
  fi
  echo "WebP wrote: $dst"
}

export -f encode_avif encode_webp is_lossless

# Find PNG/JPEGs (case-insensitive), handle spaces safely
find . -maxdepth 1 -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \) -print0 |
  while IFS= read -r -d '' img; do
    encode_avif "$img"
    encode_webp "$img"
  done

echo "✅ Done. AVIFs in ./avif, WebPs in ./webp"
