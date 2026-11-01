# Displays

Der vorhandene Displays-Tab nutzt die echte Windows-Anbindung; der Browser-/Mock-Modus zeigt ausdrücklich keine ausführbaren Anzeigeaktionen.

- **Hertz to max:** aktive Displays und Modi über EnumDisplayDevices/EnumDisplaySettings lesen; höchste gemeldete Frequenz bei gleicher Auflösung, Orientierung, Farbtiefe und Scanart wählen. Vor jeder Änderung CDS_TEST ausführen. Nicht unterstützte Modi werden abgewiesen.
- **Move monitors:** Monitorgrößen und Positionen aus Windows; Drag-and-drop mit Einrasten, alternativ Tab/Pfeiltasten. Primärmonitor bleibt am Ursprung. Alle Displays müssen zusammenhängend und überlappungsfrei sein. Hotplug, unbekannte IDs, doppelte IDs und ungültige Koordinaten werden geprüft.
- **Übernahme:** bisherige Modi im Backend speichern, Änderungen für alle Displays vorbereiten und gemeinsam anwenden. Bestätigungsdialog für 15 Sekunden; Abbrechen, Zeitablauf und Teilfehler setzen die vorherigen Modi zurück. Fehler bei der Wiederherstellung werden ausdrücklich gemeldet. Ein gewaltsamer Abbruch des Backend-Prozesses oder ein Stromausfall kann diesen Rücksetzvorgang verhindern.
- **HAGS:** gespeicherte HwSchMode-Vorgabe an/aus, Originalwert einschließlich ursprünglich fehlendem Wert gesichert. Verfügbar ab Windows-Build 19041. Dies ist keine Erkennung der Hardwarefähigkeit und kein gemessener Laufzeitstatus; Treiber/GPU müssen HAGS unterstützen.
- **MPO:** OverlayTestMode=5 als abschaltbarer Override mit Originalwertsicherung. Ein bereits außerhalb der App gesetzter Override wird ohne eigene Sicherung nicht als wiederherstellbar dargestellt.
- **Weitere Extras:** Auto HDR und adaptive Helligkeit werden ausdrücklich in die Windows-Einstellungen verwiesen. Exklusives Vollbild ist pro Spiel zu konfigurieren. Es gibt keine simulierten globalen Schalter dafür.

Extras benötigen Administratorrechte und einen Neustart. Die Originalwerte verwenden die vorhandenen Gaming-Journale und den allgemeinen Backup-Katalog. Damit greifen auch die bestehende Wiederherstellung und die Lizenzablauf-Wiederherstellung. Ohne passende, wiederherstellbare Sicherung wird kein erfundener Standardwert gesetzt.

## Prüfung

`node --test tests/*.test.cjs`

Die Displays-Tests prüfen erlaubte IPC-Eingaben, negative Koordinaten, Einrasten, Ressourcen im portablen Paket, Texte für Deutsch/Englisch/Italienisch sowie unter Windows die reale Monitorabfrage und das Abweisen einer überlappenden Anordnung. Dieser Integrationstest ändert keine Anzeigeeinstellungen. Ein nativer CDS_TEST kann zusätzlich die aktuellen und maximalen Modi ohne Übernahme prüfen.

Der Hardware-Integrationstest ist mit `RUN_DISPLAY_INTEGRATION=1` einzuschalten; auf CI-Systemen ohne aktive Monitore bleibt er übersprungen.

Eine tatsächliche Umstellung mit anschließendem Bestätigen/Rücksetzen, Registry-Schreibvorgänge und visuelle Prüfung der laufenden Electron-Oberfläche sind gesonderte manuelle Tests. Erfolgreiche Abfragen oder Unit-Tests belegen diese Abläufe nicht.

## API-Referenzen

- [Microsoft: ChangeDisplaySettingsExW, Mehrmonitor-Übernahme und CDS_TEST](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-changedisplaysettingsexw)
- [NVIDIA: MPO deaktivieren/wiederherstellen und Neustart](https://nvidia.custhelp.com/app/answers/detail/a_id/5157/kw/windows%20freezes/related/1)
