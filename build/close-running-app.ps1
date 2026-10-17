$n = 'Tweaker', 'UND.CC Tweaker'
if (Get-Process -Name $n -ErrorAction SilentlyContinue) {
  Stop-Process -Name $n -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 800
  if (Get-Process -Name $n -ErrorAction SilentlyContinue) {
    try {
      Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\taskkill.exe') -ArgumentList '/F /T /IM Tweaker.exe /IM "UND.CC Tweaker.exe"' -Verb RunAs -WindowStyle Hidden -Wait
    } catch {}
  }
}
exit 0
