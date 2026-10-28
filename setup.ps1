# One-time setup for Windows. Safe to run again: prints READY when everything is in place.
#   powershell -ExecutionPolicy Bypass -File setup.ps1
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
function Say($m) { Write-Host "`n$m" -ForegroundColor Cyan }
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}
function Need($cmd, $id, $choco, $name) {
  if (Get-Command $cmd -ErrorAction SilentlyContinue) { Write-Host "  ok  $name"; return }
  Write-Host "  installing $name..."
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install -e --id $id --silent --accept-package-agreements --accept-source-agreements | Out-Null
  } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
    choco install -y --no-progress $choco | Out-Null
  } else {
    throw "$name is missing and neither winget nor Chocolatey is available. Install $name manually, then run this again."
  }
  Refresh-Path
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    throw "$name was installed but isn't on PATH yet. Close this window, open a new PowerShell, and run setup again."
  }
}

Say '1/5 Checking tools'
Need ffmpeg 'Gyan.FFmpeg' 'ffmpeg' 'ffmpeg'
Need node 'OpenJS.NodeJS.LTS' 'nodejs-lts' 'Node.js'
Need uv 'astral-sh.uv' 'uv' 'uv (Python manager)'
$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
            "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($chrome) { Write-Host '  ok  Google Chrome' } else {
  Write-Host '  installing Google Chrome (used to render the video)...'
  winget install -e --id Google.Chrome --silent --accept-package-agreements --accept-source-agreements | Out-Null
}

Say '2/5 Python environment (Python 3.12)'
$py = '.venv\Scripts\python.exe'
if (-not (Test-Path $py)) { uv venv -q -p 3.12 .venv }
if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
  Write-Host '  NVIDIA GPU found: installing CUDA build of PyTorch (much faster voice)'
  uv pip install -q -p $py torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124
} else {
  Write-Host '  No NVIDIA GPU: voice runs on the CPU (works, just slower)'
}
uv pip install -q -p $py -r requirements.txt

Say '3/5 Video engine (Remotion)'
Push-Location video; npm install --silent --no-audit --no-fund; Pop-Location

Say '4/5 Settings'
if (-not (Test-Path config.json)) { Copy-Item config.example.json config.json }
& $py -c "import make; make.write_brand(make.load_config())"

Say '5/5 Downloading voice + caption models (~3.5 GB, first time only)'
$env:HF_HUB_DISABLE_XET = '1'; $env:PYTHONWARNINGS = 'ignore'
& $py -c @"
from huggingface_hub import snapshot_download
snapshot_download('ResembleAI/chatterbox', allow_patterns=['ve.safetensors', 't3_cfg.safetensors', 's3gen.safetensors', 'tokenizer.json', 'conds.pt'])
from faster_whisper import WhisperModel
import json; WhisperModel(json.load(open('config.json')).get('whisper', 'small.en'), device='cpu', compute_type='int8')
"@
& $py -W ignore -c 'import chatterbox, faster_whisper, scipy, perth'
if ($LASTEXITCODE -ne 0) { throw 'Python packages failed to import. Run setup again; if it keeps failing, open an issue with the error above.' }

Say 'READY'
if (-not (Test-Path voice\me.wav)) {
  Write-Host 'Next: record your voice on the settings page:'
  Write-Host "  & `"$PSScriptRoot\.venv\Scripts\python.exe`" `"$PSScriptRoot\ui.py`""
}
Write-Host 'Then restart Claude Code and type:  /reel <your topic>'
