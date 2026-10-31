# Release step "Prepare H1T.CC branding for Windows" (called by .github/workflows/publish-update.yml).
# The app icon is generated once from the provided logo (build/make-h1t-assets.cjs, committed as build/icon.ico).
# This step no longer redraws it from the old emblem; it only validates the committed icon and copies it for the
# window/taskbar icon, so the exe, window and taskbar all show the same H1T.CC logo.
param(
  [string]$Icon = "build/icon.ico",
  [string]$RuntimeIcon = "app/assets/icon.ico"
)
$ErrorActionPreference = "Stop"
$bytes = [IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $Icon))
if ($bytes.Length -lt 6 -or [BitConverter]::ToUInt16($bytes, 0) -ne 0 -or [BitConverter]::ToUInt16($bytes, 2) -ne 1) { throw "build/icon.ico is not a valid icon." }
$count = [BitConverter]::ToUInt16($bytes, 4)
if ($count -lt 4) { throw "build/icon.ico needs several sizes (found $count)." }
Copy-Item -LiteralPath $Icon -Destination $RuntimeIcon -Force
Write-Output "H1T.CC icon ready: $count sizes, $($bytes.Length) bytes."
