# Copies shiftgraph.html → index.html (GitHub Pages root).
$root = Split-Path $PSScriptRoot -Parent
$src = Join-Path $root 'shiftgraph.html'
$dest = Join-Path $root 'index.html'
if (-not (Test-Path $src)) {
  Write-Error "Missing $src"
  exit 1
}
Copy-Item -LiteralPath $src -Destination $dest -Force
Write-Host "Synced index.html from shiftgraph.html"
