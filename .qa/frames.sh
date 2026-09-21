#!/usr/bin/env bash
# Scroll a page in fixed pixel steps and save a viewport screenshot at each, then tile them into numbered sheets.
#   frames.sh <url> <outdir> [step=450] [start=0] [max=60] [viewport=1440x900] [settle-ms=900]
# Uses native window.scrollTo (smooth scrolling libraries sync to it). Sheets are 3x3, labelled by frame index.
export USERNAME='AJ\AJ'
B="$HOME/.claude/skills/gstack/browse/dist/browse"
URL="$1"; OUT="$2"; STEP="${3:-450}"; START="${4:-0}"; MAX="${5:-60}"; VP="${6:-1440x900}"; SETTLE="${7:-900}"
mkdir -p "$OUT"; rm -f "$OUT"/*.png "$OUT"/sheet*.jpg
cd "/c/Web UI/Nexora" || exit 1
$B viewport "$VP" >/dev/null 2>&1
$B goto "$URL" >/dev/null 2>&1
$B js "await new Promise(r=>setTimeout(r,2500)); document.documentElement.style.scrollBehavior='auto'; 1" >/dev/null 2>&1
H=$($B js "String(document.documentElement.scrollHeight)" 2>/dev/null | tail -1 | tr -d '\r')
i=0; y=$START
while [ "$i" -lt "$MAX" ] && [ "$y" -le "$H" ]; do
  $B js "window.scrollTo(0,$y); 1" >/dev/null 2>&1
  $B js "await new Promise(r=>setTimeout(r,$SETTLE)); 1" >/dev/null 2>&1
  $B screenshot --viewport "$OUT/$(printf %03d $i).png" >/dev/null 2>&1
  i=$((i+1)); y=$((y+STEP))
done
n=$(( (i+8)/9 ))
for s in $(seq 0 $((n-1))); do
  ffmpeg -y -loglevel error -start_number $((s*9)) -i "$OUT/%03d.png" -frames:v 1 \
    -vf "scale=560:-1,drawtext=text='%{frame_num}':start_number=$((s*9)):x=6:y=6:fontsize=20:fontcolor=red:box=1,tile=3x3:padding=4" \
    "$OUT/sheet$s.jpg" 2>&1 | grep -v Fontconfig
done
echo "H=$H frames=$i sheets=$n"
