$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $root 'backend\\server.js'
$logDir = Join-Path $root 'backend\\.logs'
$stdoutLog = Join-Path $logDir 'backend.out.log'
$stderrLog = Join-Path $logDir 'backend.err.log'
$backendProcess = $null

try {
  if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
  }

  if (Test-Path $stdoutLog) {
    Remove-Item $stdoutLog -Force
  }

  if (Test-Path $stderrLog) {
    Remove-Item $stderrLog -Force
  }

  Write-Host 'Starting backend on port 3001...'
  $backendProcess = Start-Process `
    -FilePath 'node' `
    -ArgumentList $backendPath `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru
  Start-Sleep -Seconds 2

  if ($backendProcess.HasExited) {
    $errorSummary = if (Test-Path $stderrLog) { (Get-Content $stderrLog -Raw).Trim() } else { '' }
    if (-not $errorSummary -and (Test-Path $stdoutLog)) {
      $errorSummary = (Get-Content $stdoutLog -Raw).Trim()
    }

    if ($errorSummary) {
      throw "Backend failed to start. $errorSummary"
    }

    throw "Backend failed to start. Check $stderrLog for details."
  }

  Write-Host 'Starting Expo...'
  $env:EXPO_NO_DOCTOR = '1'
  & npx.cmd expo start
} finally {
  if ($backendProcess -and -not $backendProcess.HasExited) {
    Stop-Process -Id $backendProcess.Id -Force
  }
}
