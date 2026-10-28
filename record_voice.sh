#!/usr/bin/env bash
# Save your voice sample for cloning.
#   bash record_voice.sh                 record 20 seconds from the Mac microphone
#   bash record_voice.sh my-memo.m4a     use an existing recording (Voice Memos, phone, etc.)
set -e
cd "$(dirname "$0")"
mkdir -p voice
if [ -n "$1" ]; then
  ffmpeg -v error -y -i "$1" -ac 1 -ar 24000 -af "silenceremove=1:0:-45dB,loudnorm" -t 30 voice/me.wav
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
  ffmpeg -v error -y -f avfoundation -i ":0" -t 20 -ac 1 -ar 24000 -af "silenceremove=1:0:-45dB,loudnorm" voice/me.wav
fi
echo "Saved voice/me.wav ($(ffprobe -v error -show_entries format=duration -of csv=p=0 voice/me.wav | cut -c1-4)s). Your next reel will use your voice."
