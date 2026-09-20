#!/usr/bin/env bash
# Capture one site as a 3-frame strip: top, a third down, two thirds down.
#   study.sh <url> <name>
export USERNAME='AJ\AJ'
B="$HOME/.claude/skills/gstack/browse/dist/browse"
R="/c/Users/aswin/AppData/Local/Temp/claude/C--Web-UI-Nexora/e7c072ca-79ed-45e2-931c-923e72be638c/scratchpad/aw"
URL="$1"; NAME="$2"
mkdir -p "$R"; cd "$R" || exit 1
rm -f f?.png
$B viewport 1440x900 >/dev/null 2>&1
$B goto "$URL" >/dev/null 2>&1
sleep 5
$B js "document.documentElement.style.scrollBehavior='auto'; 0" >/dev/null 2>&1
$B screenshot --viewport "$R/f0.png" >/dev/null 2>&1
for k in 1 2; do
  # Many of these use virtual scroll, so drive both the native scroll and a wheel burst.
  $B js "window.scrollTo(0, document.body.scrollHeight*0.$((k*3))); for(let i=0;i<14;i++) window.dispatchEvent(new WheelEvent('wheel',{deltaY:600,bubbles:true,cancelable:true})); 0" >/dev/null 2>&1
  sleep 2.5
  $B screenshot --viewport "$R/f$k.png" >/dev/null 2>&1
done
ffmpeg -y -loglevel error -i "$R/f%d.png" -vf "scale=520:-1,tile=3x1:padding=4:color=0x444444" -frames:v 1 -q:v 5 "$R/$NAME.jpg"
echo "$R/$NAME.jpg"
