#!/usr/bin/env bash
# Save your voice sample for cloning.
#   bash record_voice.sh                 record 20 seconds from the Mac microphone
#   bash record_voice.sh my-memo.m4a     use an existing recording (Voice Memos, phone, etc.)
set -e
cd "$(dirname "$0")"
mkdir -p voice
FF=$(.venv/bin/python -c "import sound; print(sound.ffmpeg())")
duration() { "$FF" -i "$1" 2>&1 | sed -n "s/.*Duration: \([0-9:.]*\).*/\1/p"; }
if [ -n "$1" ]; then
  "$FF" -v error -y -i "$1" -ac 1 -ar 24000 -af "silenceremove=1:0:-45dB,loudnorm" -t 30 voice/me.wav
else
  cat <<'TXT'
Read this out loud in your normal reel voice (energetic, natural):

  "Hey, welcome back. Today we're cracking one of the most asked interview
   questions. Most candidates get this wrong, but once you see how it works,
   you'll never forget it. Let's break it down step by step."

Recording starts in 3 seconds and lasts 20 seconds...
TXT
  /bin/sleep 3
  echo "● RECORDING"
  "$FF" -v error -y -f avfoundation -i ":0" -t 20 -ac 1 -ar 24000 -af "silenceremove=1:0:-45dB,loudnorm" voice/me.wav
fi
echo "Saved voice/me.wav (length $(duration voice/me.wav)). Your next reel will use your voice."
