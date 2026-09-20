#!/usr/bin/env bash
# Contact sheet of a page, scrolled in viewport steps.
#   page-sheet.sh <url> <viewport> <steps> <tile> [out-name]
export USERNAME='AJ\AJ'
B="$HOME/.claude/skills/gstack/browse/dist/browse"
S="/c/Users/aswin/AppData/Local/Temp/claude/C--Web-UI-Nexora/e7c072ca-79ed-45e2-931c-923e72be638c/scratchpad/sheets"
URL="${1:-http://localhost:4321/?nointro}"
VP="${2:-1440x900}"
STEPS="${3:-12}"
TILE="${4:-4x3}"
NAME="${5:-page}"
mkdir -p "$S"; rm -f "$S"/s*.png
cd "/c/Web UI/Nexora" || exit 1
$B viewport "$VP" >/dev/null 2>&1
$B goto "$URL" >/dev/null 2>&1
sleep 3
H=$($B js "document.body.scrollHeight" 2>/dev/null | tail -1 | tr -d '\r')
VH=${VP#*x}
i=0
while [ "$i" -lt "$STEPS" ]; do
  Y=$(( (H - VH) * i / (STEPS - 1) ))
  $B js "window.scrollTo(0, $Y); 0" >/dev/null 2>&1
  sleep 1.1
  $B screenshot --viewport "$S/s$(printf %02d $i).png" >/dev/null 2>&1
  i=$((i+1))
done
W=${VP%x*}
SC=$(( 1720 / ${TILE%x*} ))
ffmpeg -y -loglevel error -i "$S/s%02d.png" -vf "scale=$SC:-1,tile=$TILE:padding=5:color=0x555555" -frames:v 1 -q:v 5 "$S/$NAME.jpg"
echo "$S/$NAME.jpg"
