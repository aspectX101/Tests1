; Eigene Prüfung "läuft die App noch?" für Installer und Deinstaller (ersetzt _CHECK_APP_RUNNING).
; Sie läuft im Installer direkt vor dem Entfernen der alten Version.
;
; Installer (ab 0.5.3): build/cleanup-old-install.ps1 räumt eine alte Installation pro Benutzer (bis 0.5.1) selbst
; weg – Prozesse beenden, Ordner, Verknüpfungen und Registry-Einträge mit unserer GUID löschen. Deren altes
; Deinstallationsprogramm brach nach abgebrochenen Updates immer wieder ab ("kann nicht geschlossen werden").
;
; Deinstaller: build/close-running-app.ps1 beendet die laufende App, notfalls per UAC.
;
; Die Skripte werden in den Installer gepackt und aus dessen Temp-Ordner ($PLUGINSDIR) ausgeführt.
!macro customCheckAppRunning
  !ifndef BUILD_UNINSTALLER
    DetailPrint "Alte Version von UND.CC Tweaker entfernen ..."
    File /oname=$PLUGINSDIR\undcc-cleanup.ps1 "${BUILD_RESOURCES_DIR}\cleanup-old-install.ps1"
    nsExec::Exec '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "$PLUGINSDIR\undcc-cleanup.ps1"'
  !else
    DetailPrint "Laufenden UND.CC Tweaker beenden ..."
    File /oname=$PLUGINSDIR\undcc-close.ps1 "${BUILD_RESOURCES_DIR}\close-running-app.ps1"
    nsExec::Exec '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "$PLUGINSDIR\undcc-close.ps1"'
  !endif
  Pop $0
  Sleep 500
!macroend
