# Reel Studio installer for Windows. Paste into PowerShell:
#   irm https://raw.githubusercontent.com/AwaisZulfqar/reel-studio/main/install.ps1 | iex
$ErrorActionPreference = 'Stop'
$dir = Join-Path $HOME '.claude\skills\reel'
$repo = 'https://github.com/AwaisZulfqar/reel-studio'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { throw 'Install Git from https://git-scm.com, then run this again.' }
  Write-Host 'Installing Git...'
  winget install -e --id Git.Git --silent --accept-package-agreements --accept-source-agreements | Out-Null
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}

if (Test-Path (Join-Path $dir '.git')) {
  Write-Host "Updating $dir"; git -C $dir pull --ff-only
} else {
  Write-Host "Downloading Reel Studio to $dir"
  New-Item -ItemType Directory -Force -Path (Split-Path $dir) | Out-Null
  git clone $repo $dir
}

powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $dir 'setup.ps1')
