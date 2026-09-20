#!/usr/bin/env bash
# Contact sheet of the six hero stops at one viewport.  usage: worlds-sheet.sh 1440x900 [stops...]
export USERNAME='AJ\AJ'
B="$HOME/.claude/skills/gstack/browse/dist/browse"
S="/c/Users/aswin/AppData/Local/Temp/claude/C--Web-UI-Nexora/e7c072ca-79ed-45e2-931c-923e72be638c/scratchpad/cur"
VP="${1:-1440x900}"; shift
STOPS="${@:-0 1 2 3 4 5}"
cd "/c/Web UI/Nexora" || exit 1
mkdir -p "$S"; rm -f "$S"/w*.png
$B viewport "$VP" >/dev/null 2>&1
i=0
for n in $STOPS; do
  $B goto "http://localhost:4321/?stop=$n&nointro" >/dev/null 2>&1
  sleep 2.8
  $B screenshot --viewport "$S/w$(printf %02d $i).png" >/dev/null 2>&1
  i=$((i+1))
done
W=${VP%x*}; H=${VP#*x}
if [ "$W" -gt "$H" ]; then TILE="3x2"; SC=640; else TILE="6x1"; SC=300; fi
ffmpeg -y -loglevel error -i "$S/w%02d.png" -vf "scale=$SC:-1,tile=$TILE:padding=4:color=0x444444" -frames:v 1 -q:v 4 "$S/worlds-$VP.jpg"
echo "$S/worlds-$VP.jpg"
