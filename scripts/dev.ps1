<#
  Performance Tracker — local dev launcher (Windows / PowerShell)

  Brings up the Docker backing services (Postgres + Mailpit), builds the shared
  package, optionally migrates + seeds the database, then launches the API and
  the web dev servers in two new terminal windows.

  Usage (from anywhere):
    .\scripts\dev.ps1                # docker up + build shared + launch API & web
    .\scripts\dev.ps1 -Migrate       # also run Prisma migrate + seed first
    .\scripts\dev.ps1 -Minio         # also start the optional MinIO service
#>
param(
  [switch]$Migrate,
  [switch]$Minio
)

$ErrorActionPreference = 'Stop'

# Repo root = parent of this script's folder
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Pick a PowerShell host for the child windows (PowerShell 7 if present, else Windows PowerShell)
$psHost = if (Get-Command pwsh -ErrorAction SilentlyContinue) { 'pwsh' } else { 'powershell' }

Write-Host '==> Performance Tracker dev launcher' -ForegroundColor Cyan

# 1. Docker services
Write-Host '==> Starting Docker services (Postgres + Mailpit)...' -ForegroundColor Cyan
if ($Minio) { docker compose --profile minio up -d } else { docker compose up -d }

# 2. Wait for Postgres to report healthy
Write-Host '==> Waiting for Postgres to become healthy...' -ForegroundColor Cyan
$pgId = (docker compose ps -q postgres).Trim()
$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
  $h = docker inspect --format '{{.State.Health.Status}}' $pgId 2>$null
  if ($h -eq 'healthy') { $healthy = $true; break }
  Start-Sleep -Seconds 2
}
if (-not $healthy) { Write-Warning 'Postgres did not report healthy in time; continuing anyway.' }

# 3. Build the shared package (the API imports its built output)
Write-Host '==> Building @perf-tracker/shared...' -ForegroundColor Cyan
pnpm build:shared

# 4. Optional: migrate + seed
if ($Migrate) {
  Write-Host '==> Applying migrations and seeding...' -ForegroundColor Cyan
  pnpm db:migrate
}

# 5. Launch API + web in separate windows
Write-Host '==> Launching API (:3000) and web (:5173)...' -ForegroundColor Green
Start-Process $psHost -WorkingDirectory $root -ArgumentList '-NoExit', '-Command', 'pnpm dev:api'
Start-Process $psHost -WorkingDirectory $root -ArgumentList '-NoExit', '-Command', 'pnpm dev:web'

Write-Host ''
Write-Host 'Running:' -ForegroundColor Green
Write-Host '  API     : http://localhost:3000/api'
Write-Host '  Web     : http://localhost:5173'
Write-Host '  Mailpit : http://localhost:8025'
Write-Host ''
Write-Host 'Sign in with  admin@perf-tracker.local  /  ChangeMe123!'
Write-Host 'Close the two new windows (or Ctrl+C in each) to stop the servers.'
