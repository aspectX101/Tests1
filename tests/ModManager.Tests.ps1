$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../Tweaker.psm1') -Force
$module = Get-Module Tweaker
& $module {
    function Assert($Condition, [string]$Message) { if (-not $Condition) { throw "FAIL: $Message" } else { Write-Output "PASS $Message" } }
    function Expect-Error([scriptblock]$Operation, [string]$Code, [string]$Label) {
        $actual = $null
        try { $null = & $Operation } catch { $actual = $_.Exception.Message }
        Assert ($actual -eq $Code) "$Label -> $Code (got $actual)"
    }
    # Testumgebung: eigene Ordner statt echter FiveM-/Benutzerpfade, plattformneutrale Pfadprüfung.
    $work = Join-Path ([IO.Path]::GetFullPath((Join-Path (Get-Location) 'work'))) ('mods-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
    $fivem = Join-Path $work 'FiveM.app'
    $null = New-Item -ItemType Directory -Path (Join-Path $fivem 'data'), (Join-Path $fivem 'citizen/platform/audio/sfx') -Force
    Set-Content -LiteralPath (Join-Path $fivem 'citizen/platform/audio/sfx/RESIDENT.awc') -Value 'ORIGINAL'
    $script:ModStore = Join-Path $work 'store'
    # nachgebaute GTA-V-Installation mit Original-Sounddateien
    $gta = Join-Path $work 'Grand Theft Auto V Legacy'
    $sfx = Join-Path $gta 'x64/audio/sfx'
    $null = New-Item -ItemType Directory -Path $sfx -Force
    Set-Content -LiteralPath (Join-Path $sfx 'RESIDENT.rpf') -Value 'GTA-ORIGINAL'
    Set-Content -LiteralPath (Join-Path $sfx 'WEAPONS_PLAYER.rpf') -Value 'GTA-WEAPONS'
    $script:GtaRootCache = $gta
    $script:gameRunning = $false
    function Resolve-FiveMRoot([string]$FiveMPath) { return $fivem }
    function Assert-FiveMClosed { if ($script:gameRunning) { throw 'close_fivem_first' } }
    function Assert-CachePath([string]$Path, [string]$Root) {
        $full = [IO.Path]::GetFullPath($Path); $base = [IO.Path]::GetFullPath($Root)
        if (-not $full.StartsWith($base, [StringComparison]::OrdinalIgnoreCase)) { throw 'unsafe_cache_path' }
        return $full
    }
    Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
    function New-TestZip([string]$Path, [hashtable]$Entries) {
        $zip = [IO.Compression.ZipFile]::Open($Path, 'Create')
        try { foreach ($k in $Entries.Keys) { $w = [IO.StreamWriter]::new($zip.CreateEntry($k).Open()); $w.Write($Entries[$k]); $w.Dispose() } }
        finally { $zip.Dispose() }
    }
    try {
        # 1) Soundpack-ZIP mit citizen-Struktur + RPF + Müll
        $sound = Join-Path $work 'soundpack.zip'
        New-TestZip $sound @{ 'Pack/citizen/platform/audio/sfx/RESIDENT.awc' = 'NEWSOUND'; 'Pack/weapons.rpf' = 'RPF'; 'Pack/readme.txt' = 'hi'; 'Pack/evil.dll' = 'MZ' }
        $r = Invoke-TweakerMods -Action mods-import -ModPath $sound -Category sound
        $m1 = $r.mod
        Assert ($m1.fileCount -eq 2 -and $m1.skippedCount -eq 2) 'import zip: 2 Dateien installierbar, dll + txt übersprungen'
        Assert (@($m1.targets) -contains 'citizen\platform\audio\sfx\RESIDENT.awc' -and @($m1.targets) -contains 'gta:x64\audio\sfx\weapons.rpf') 'import zip: citizen bleibt FiveM, lose rpf im Soundpack -> GTA sfx'
        Assert ($m1.usesGta) 'import zip: usesGta gesetzt'
        Assert ($m1.name -eq 'soundpack' -and $m1.category -eq 'sound' -and -not $m1.enabled) 'import zip: Name, Kategorie, inaktiv'

        # 2) ZIP mit Pfad-Trick wird abgelehnt und hinterlässt nichts
        $evil = Join-Path $work 'evil.zip'
        New-TestZip $evil @{ '../../outside.rpf' = 'x' }
        $before = @(Get-ChildItem (Join-Path $script:ModStore 'library')).Count
        Expect-Error { Invoke-TweakerMods -Action mods-import -ModPath $evil -Category graphics } 'mod_archive_unsafe' 'zip mit ../'
        Assert (@(Get-ChildItem (Join-Path $script:ModStore 'library')).Count -eq $before) 'abgelehnter Import räumt auf'

        # 3) Einzelne RPF (Waffen-Skin) und nicht unterstützte Formate
        $rpf = Join-Path $work 'Gold Pistol.rpf'; Set-Content -LiteralPath $rpf -Value 'RPF2'
        $m2 = (Invoke-TweakerMods -Action mods-import -ModPath $rpf -Category weapons).mod
        Assert (@($m2.targets)[0] -eq 'mods\Gold Pistol.rpf') 'einzelne rpf -> mods\'
        $oiv = Join-Path $work 'x.oiv'; Set-Content -LiteralPath $oiv -Value 'r'
        Expect-Error { Invoke-TweakerMods -Action mods-import -ModPath $oiv -Category other } 'mod_archive_unsupported' 'oiv'
        $rar = Join-Path $work 'x.rar'; Set-Content -LiteralPath $rar -Value 'r'
        function Get-ModArchiveTool { return @() }
        Expect-Error { Invoke-TweakerMods -Action mods-import -ModPath $rar -Category other } 'mod_archive_tool_missing' 'rar ohne 7-Zip/tar'
        Remove-Item Function:\Get-ModArchiveTool
        Expect-Error { Invoke-TweakerMods -Action mods-import -ModPath $rpf -Category nope } 'invalid_mod_category' 'falsche Kategorie'

        # 4) Aktivieren: Original gesichert, Dateien kopiert
        $script:gameRunning = $true
        Expect-Error { Invoke-TweakerMods -Action mods-enable -ModId $m1.id } 'close_fivem_first' 'FiveM läuft'
        $script:gameRunning = $false
        $null = Invoke-TweakerMods -Action mods-enable -ModId $m1.id
        $awc = Join-Path $fivem 'citizen/platform/audio/sfx/RESIDENT.awc'
        Assert ((Get-Content $awc -Raw).Trim() -eq 'NEWSOUND') 'aktivieren: Sounddatei ersetzt'
        Assert (Test-Path (Join-Path $sfx 'weapons.rpf')) 'aktivieren: Sound-rpf im GTA-Ordner'
        Assert ((Invoke-TweakerMods -Action mods-list).enabledCount -eq 1) 'liste: 1 aktiv'

        # 5) Konflikt mit gleicher Zieldatei
        $sound2 = Join-Path $work 'other.zip'
        New-TestZip $sound2 @{ 'citizen/platform/audio/sfx/RESIDENT.awc' = 'OTHER' }
        $m3 = (Invoke-TweakerMods -Action mods-import -ModPath $sound2 -Category sound).mod
        Expect-Error { Invoke-TweakerMods -Action mods-enable -ModId $m3.id } 'mod_conflict' 'gleiche Zieldatei'

        # 6) Deaktivieren: Original zurück, eigene Dateien weg
        $null = Invoke-TweakerMods -Action mods-disable -ModId $m1.id
        Assert ((Get-Content $awc -Raw).Trim() -eq 'ORIGINAL') 'deaktivieren: Original wiederhergestellt'
        Assert (-not (Test-Path (Join-Path $sfx 'weapons.rpf'))) 'deaktivieren: neue Datei im GTA-Ordner entfernt'

        # 6b) Typisches Soundpack: RESIDENT.rpf + WEAPONS_PLAYER.rpf lose bzw. als x64\audio\sfx im ZIP
        $res = Join-Path $work 'RESIDENT.rpf'; Set-Content -LiteralPath $res -Value 'PACK-RESIDENT'
        $ms = (Invoke-TweakerMods -Action mods-import -ModPath $res -Category sound).mod
        Assert (@($ms.targets)[0] -eq 'gta:x64\audio\sfx\RESIDENT.rpf') 'sound-rpf -> gta:x64\audio\sfx'
        $zip2 = Join-Path $work 'gunsounds.zip'
        New-TestZip $zip2 @{ 'Gun Sounds/x64/audio/sfx/WEAPONS_PLAYER.rpf' = 'PACK-WEAPONS'; 'Gun Sounds/Install.txt' = 'kopieren nach GTA' }
        $mw = (Invoke-TweakerMods -Action mods-import -ModPath $zip2 -Category weapons).mod
        Assert (@($mw.targets)[0] -eq 'gta:x64\audio\sfx\WEAPONS_PLAYER.rpf') 'x64\audio-Struktur -> GTA, auch in anderer Kategorie'
        $null = Invoke-TweakerMods -Action mods-enable -ModId $ms.id
        $null = Invoke-TweakerMods -Action mods-enable -ModId $mw.id
        Assert ((Get-Content (Join-Path $sfx 'RESIDENT.rpf') -Raw).Trim() -eq 'PACK-RESIDENT' -and (Get-Content (Join-Path $sfx 'WEAPONS_PLAYER.rpf') -Raw).Trim() -eq 'PACK-WEAPONS') 'soundpack aktiv: GTA-Originale ersetzt'
        $null = Invoke-TweakerMods -Action mods-disable -ModId $ms.id
        $null = Invoke-TweakerMods -Action mods-disable -ModId $mw.id
        Assert ((Get-Content (Join-Path $sfx 'RESIDENT.rpf') -Raw).Trim() -eq 'GTA-ORIGINAL' -and (Get-Content (Join-Path $sfx 'WEAPONS_PLAYER.rpf') -Raw).Trim() -eq 'GTA-WEAPONS') 'soundpack aus: GTA-Originale zurück'
        $script:GtaRootCache = $null
        function Resolve-GtaRoot { throw 'gta_not_found' }
        Expect-Error { Invoke-TweakerMods -Action mods-enable -ModId $ms.id } 'gta_not_found' 'GTA-Ordner nicht gefunden'
        Assert ((Get-Content (Join-Path $sfx 'RESIDENT.rpf') -Raw).Trim() -eq 'GTA-ORIGINAL') 'fehlgeschlagenes Aktivieren ändert nichts'
        Remove-Item Function:\Resolve-GtaRoot
        $script:GtaRootCache = $gta

        # 7) Entfernen (auch wenn aktiv)
        $null = Invoke-TweakerMods -Action mods-enable -ModId $m2.id
        $null = Invoke-TweakerMods -Action mods-remove -ModId $m2.id
        Assert (-not (Test-Path (Join-Path $fivem 'mods/Gold Pistol.rpf'))) 'entfernen deaktiviert vorher'
        Assert (@((Invoke-TweakerMods -Action mods-list).mods | Where-Object id -eq $m2.id).Count -eq 0) 'entfernen: aus Liste weg'
        Expect-Error { Invoke-TweakerMods -Action mods-enable -ModId 'zzz' } 'invalid_mod_id' 'ungültige ID'

        # 9) Grafik-Pack mit Spielstruktur: gleiche Dateinamen in verschiedenen Ordnern bleiben getrennt
        $nve = Join-Path $work 'nve.zip'
        New-TestZip $nve @{ 'NVE/update/x64/dlcpacks/patchday1/dlc.rpf' = 'A'; 'NVE/update/x64/dlcpacks/patchday2/dlc.rpf' = 'B'; 'NVE/update/update.rpf' = 'U'; 'NVE/x64v.rpf' = 'V' }
        $g = (Invoke-TweakerMods -Action mods-import -ModPath $nve -Category graphics).mod
        Assert ($g.fileCount -eq 4 -and @($g.targets) -contains 'mods\update\x64\dlcpacks\patchday1\dlc.rpf' -and @($g.targets) -contains 'mods\update\x64\dlcpacks\patchday2\dlc.rpf' -and
            @($g.targets) -contains 'mods\update\update.rpf' -and @($g.targets) -contains 'mods\x64v.rpf') 'grafik: Struktur unter mods\update bleibt, keine Datei geht verloren'
        $null = Invoke-TweakerMods -Action mods-enable -ModId $g.id
        Assert ((Get-Content (Join-Path $fivem 'mods/update/x64/dlcpacks/patchday2/dlc.rpf') -Raw).Trim() -eq 'B') 'grafik aktiv: verschachtelte dlc.rpf an ihrem Platz'
        $null = Invoke-TweakerMods -Action mods-disable -ModId $g.id
        Assert (-not (Test-Path (Join-Path $fivem 'mods/update/update.rpf'))) 'grafik aus: Dateien entfernt'

        # 10) Varianten werden nicht geraten, identische Kopien übersprungen
        $var = Join-Path $work 'variants.zip'
        New-TestZip $var @{ 'Gold/weapons.rpf' = 'GOLD'; 'Silver/weapons.rpf' = 'SILVER' }
        Expect-Error { Invoke-TweakerMods -Action mods-import -ModPath $var -Category weapons } 'mod_multiple_variants' 'zwei Varianten derselben Datei'
        $dup = Join-Path $work 'dup.zip'
        New-TestZip $dup @{ 'a/minimap.rpf' = 'SAME'; 'b/minimap.rpf' = 'SAME' }
        $d = (Invoke-TweakerMods -Action mods-import -ModPath $dup -Category minimap).mod
        Assert ($d.fileCount -eq 1 -and $d.skippedCount -eq 1) 'identische Kopie wird übersprungen'

        # 11) Nur lose Dateien bzw. Inhalt eines RPF-Archivs
        $loose = Join-Path $work 'loose.zip'
        New-TestZip $loose @{ 'w_pi_pistol.ytd' = 'T'; 'update.rpf/common/data/dlclist.xml' = 'X'; 'readme.txt' = 'r' }
        Expect-Error { Invoke-TweakerMods -Action mods-import -ModPath $loose -Category weapons } 'mod_loose_files' 'nur lose Dateien'

        # 12) ZIP im ZIP; GTA-Sounddatei landet auch in anderer Kategorie im GTA-Ordner; Ordnername als Mod-Name
        $inner = Join-Path $work 'inner.zip'
        New-TestZip $inner @{ 'WEAPONS_PLAYER.rpf' = 'NESTED' }
        $outer = Join-Path $work 'outer.zip'
        $z = [IO.Compression.ZipFile]::Open($outer, 'Create')
        try { $null = [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($z, $inner, 'Download/FiveM Version.zip') } finally { $z.Dispose() }
        $n = (Invoke-TweakerMods -Action mods-import -ModPath $outer -Category weapons).mod
        Assert (@($n.targets)[0] -eq 'gta:x64\audio\sfx\WEAPONS_PLAYER.rpf' -and $n.name -eq 'outer') 'zip im zip entpackt, WEAPONS_PLAYER.rpf -> GTA auch als Waffen-Mod'
        $folderMod = Join-Path $work 'My Minimap'
        $null = New-Item -ItemType Directory -Path $folderMod -Force
        Set-Content -LiteralPath (Join-Path $folderMod 'minimap_clean.rpf') -Value 'MAP'
        Assert ((Invoke-TweakerMods -Action mods-import -ModPath $folderMod -Category minimap).mod.name -eq 'My Minimap') 'ordner-import: Ordnername als Name'

        # 13) RAR/7z über 7-Zip bzw. tar (libarchive) – nur wenn die Programme da sind
        $sevenExe = Get-Command 7z -ErrorAction SilentlyContinue
        $tarExe = Get-Command bsdtar -ErrorAction SilentlyContinue
        if ($sevenExe -and $tarExe) {
            $env:LANG = 'C.UTF-8'; $env:LC_ALL = 'C.UTF-8'
            $packDir = Join-Path $work 'src7z'
            $null = New-Item -ItemType Directory -Path (Join-Path $packDir 'Sound Pack Ä/x64/audio/sfx') -Force
            Set-Content -LiteralPath (Join-Path $packDir 'Sound Pack Ä/x64/audio/sfx/RESIDENT.rpf') -Value 'SEVEN'
            $seven = Join-Path $work 'pack.7z'
            $locked = Join-Path $work 'locked.7z'
            Push-Location $packDir
            try { $null = & $sevenExe.Source a -bd $seven 'Sound Pack Ä'; $null = & $sevenExe.Source a -bd -pSECRET -mhe=on $locked 'Sound Pack Ä' } finally { Pop-Location }
            $evilTar = Join-Path $work 'evil.tar'
            Push-Location $packDir
            try { $null = & $tarExe.Source -cf $evilTar -s ',^Sound,../Sound,' 'Sound Pack Ä' 2>&1 } finally { Pop-Location }
            Copy-Item -LiteralPath $evilTar -Destination (Join-Path $work 'evil.7z')
            $broken7z = Join-Path $work 'broken.7z'; Set-Content -LiteralPath $broken7z -Value 'kein archiv'
            foreach ($tool in @([pscustomobject]@{kind='7z'; path=$sevenExe.Source}, [pscustomobject]@{kind='tar'; path=$tarExe.Source})) {
                $script:testTool = $tool
                function Get-ModArchiveTool { return $script:testTool }
                $m7 = (Invoke-TweakerMods -Action mods-import -ModPath $seven -Category other).mod
                Assert (@($m7.targets)[0] -eq 'gta:x64\audio\sfx\RESIDENT.rpf' -and $m7.name -eq 'pack') "7z über $($tool.kind) entpackt (Umlaut-Ordner)"
                $null = Invoke-TweakerMods -Action mods-remove -ModId $m7.id
                Expect-Error { Invoke-TweakerMods -Action mods-import -ModPath $broken7z -Category other } 'mod_archive_failed' "kaputtes Archiv über $($tool.kind)"
                Expect-Error { Invoke-TweakerMods -Action mods-import -ModPath (Join-Path $work 'evil.7z') -Category other } 'mod_archive_unsafe' "../ im Archiv über $($tool.kind)"
            }
            $script:testTool = [pscustomobject]@{kind='7z'; path=$sevenExe.Source}
            Expect-Error { Invoke-TweakerMods -Action mods-import -ModPath $locked -Category sound } 'mod_archive_password' 'passwortgeschütztes 7z'
            # 7-Zip scheitert (z. B. zu alt) -> tar.exe übernimmt
            $script:testTool = @([pscustomobject]@{kind='7z'; path=(Join-Path $work 'missing-7z')}, [pscustomobject]@{kind='tar'; path=$tarExe.Source})
            function Invoke-ModTool([string]$Exe, [string[]]$Arguments, [Text.Encoding]$Encoding) {
                if ($Exe -like '*missing-7z') { return [pscustomobject]@{code=7; out=''; err='Unsupported switch'} }
                $psi = New-Object Diagnostics.ProcessStartInfo $Exe, ((@($Arguments | ForEach-Object { '"' + $_ + '"' })) -join ' ')
                $psi.UseShellExecute = $false; $psi.RedirectStandardOutput = $true; $psi.RedirectStandardError = $true
                $p = [Diagnostics.Process]::Start($psi); $o = $p.StandardOutput.ReadToEnd(); $e = $p.StandardError.ReadToEnd(); $p.WaitForExit()
                return [pscustomobject]@{code=$p.ExitCode; out=$o; err=$e}
            }
            $mf = (Invoke-TweakerMods -Action mods-import -ModPath $seven -Category sound).mod
            Assert (@($mf.targets)[0] -eq 'gta:x64\audio\sfx\RESIDENT.rpf') '7-Zip-Fehler: tar übernimmt'
            Remove-Item Function:\Invoke-ModTool
            $null = Invoke-TweakerMods -Action mods-remove -ModId $mf.id
            Remove-Item Function:\Get-ModArchiveTool
            Assert (@(Get-ChildItem (Join-Path $script:ModStore 'library') | Where-Object { -not (Test-Path (Join-Path $_.FullName 'files')) }).Count -eq 0) 'fehlgeschlagene Archiv-Importe räumen auf'
        } else { Write-Output 'SKIP 7z/bsdtar nicht installiert' }

        # 14) Fehler beim Aktivieren dreht alles zurück
        $two = Join-Path $work 'two.zip'
        New-TestZip $two @{ 'citizen/platform/audio/sfx/RESIDENT.awc' = 'TWO'; 'mods/zz_second.rpf' = 'SECOND' }
        $t2 = (Invoke-TweakerMods -Action mods-import -ModPath $two -Category other).mod
        Remove-Item -LiteralPath (Join-Path $script:ModStore "library/$($t2.id)/files/mods/zz_second.rpf")
        Expect-Error { Invoke-TweakerMods -Action mods-enable -ModId $t2.id } 'mod_files_missing' 'Mod-Datei fehlt in der Bibliothek'
        Assert ((Get-Content $awc -Raw).Trim() -eq 'ORIGINAL' -and -not (Test-Path (Join-Path $fivem 'mods/zz_second.rpf'))) 'fehlgeschlagenes Aktivieren: Original zurück'
        Assert (-not (Test-Path (Join-Path $script:ModStore "backup/$($t2.id)"))) 'fehlgeschlagenes Aktivieren: keine leere Sicherung'

        # 15) Abgebrochenes Aktivieren (Absturz vor dem Speichern) überschreibt die Original-Sicherung nicht
        $ia = Join-Path $work 'interrupt.zip'
        New-TestZip $ia @{ 'citizen/platform/audio/sfx/RESIDENT.awc' = 'INTERRUPTED' }
        $mi = (Invoke-TweakerMods -Action mods-import -ModPath $ia -Category sound).mod
        $null = Invoke-TweakerMods -Action mods-enable -ModId $mi.id
        $st = Read-ModState; ($st.mods | Where-Object id -eq $mi.id).enabled = $false; Save-ModState $st
        $null = Invoke-TweakerMods -Action mods-enable -ModId $mi.id
        $null = Invoke-TweakerMods -Action mods-disable -ModId $mi.id
        Assert ((Get-Content $awc -Raw).Trim() -eq 'ORIGINAL') 'abgebrochenes Aktivieren: Original bleibt erhalten'

        # 16) Deaktivieren mit Teilfehler: Mod bleibt aktiv, Wiederholen löscht keine Originale
        $mix = Join-Path $work 'mix.zip'
        New-TestZip $mix @{ 'citizen/platform/audio/sfx/RESIDENT.awc' = 'MIX'; 'x64/audio/sfx/RESIDENT.rpf' = 'MIX-GTA' }
        $mm = (Invoke-TweakerMods -Action mods-import -ModPath $mix -Category sound).mod
        $null = Invoke-TweakerMods -Action mods-enable -ModId $mm.id
        $script:GtaRootCache = $null
        function Resolve-GtaRoot { throw 'gta_not_found' }
        Expect-Error { Invoke-TweakerMods -Action mods-disable -ModId $mm.id } 'mod_disable_partial' 'GTA-Ordner beim Deaktivieren weg'
        Assert ((Get-Content $awc -Raw).Trim() -eq 'ORIGINAL') 'teilweise deaktiviert: FiveM-Datei schon zurück'
        Remove-Item Function:\Resolve-GtaRoot
        $script:GtaRootCache = $gta
        Assert (@((Invoke-TweakerMods -Action mods-list).mods | Where-Object id -eq $mm.id)[0].enabled) 'teilweise deaktiviert: Mod bleibt aktiv'
        $null = Invoke-TweakerMods -Action mods-disable -ModId $mm.id
        Assert ((Get-Content $awc -Raw).Trim() -eq 'ORIGINAL' -and (Get-Content (Join-Path $sfx 'RESIDENT.rpf') -Raw).Trim() -eq 'GTA-ORIGINAL') 'erneut deaktiviert: alle Originale da, nichts gelöscht'

        # 17) Zustand: fehlende Datei erkennen und reparieren; Spiel-Update ersetzt eine überschriebene Datei
        $hz = Join-Path $work 'health.zip'
        New-TestZip $hz @{ 'mods/health.rpf' = 'HEALTH' }
        $h = (Invoke-TweakerMods -Action mods-import -ModPath $hz -Category other).mod
        $null = Invoke-TweakerMods -Action mods-enable -ModId $h.id
        Assert (@((Invoke-TweakerMods -Action mods-list).mods | Where-Object id -eq $h.id)[0].health -eq 'ok') 'aktive Mod: Zustand ok'
        Remove-Item -LiteralPath (Join-Path $fivem 'mods/health.rpf')
        $l = Invoke-TweakerMods -Action mods-list
        $hm = @($l.mods | Where-Object id -eq $h.id)[0]
        Assert ($hm.health -eq 'broken' -and $hm.brokenCount -eq 1 -and $l.brokenCount -eq 1) 'fehlende Datei erkannt'
        $null = Invoke-TweakerMods -Action mods-enable -ModId $h.id
        Assert ((Get-Content (Join-Path $fivem 'mods/health.rpf') -Raw).Trim() -eq 'HEALTH' -and @((Invoke-TweakerMods -Action mods-list).mods | Where-Object id -eq $h.id)[0].health -eq 'ok') 'reparieren kopiert neu'
        $null = Invoke-TweakerMods -Action mods-enable -ModId $ms.id
        Set-Content -LiteralPath (Join-Path $sfx 'RESIDENT.rpf') -Value 'GTA-UPDATED-ORIGINAL'
        Assert (@((Invoke-TweakerMods -Action mods-list).mods | Where-Object id -eq $ms.id)[0].health -eq 'broken') 'vom Spiel ersetzte Datei erkannt'
        $null = Invoke-TweakerMods -Action mods-enable -ModId $ms.id
        Assert ((Get-Content (Join-Path $sfx 'RESIDENT.rpf') -Raw).Trim() -eq 'PACK-RESIDENT') 'reparieren: Soundpack wieder aktiv'
        $null = Invoke-TweakerMods -Action mods-disable -ModId $ms.id
        Assert ((Get-Content (Join-Path $sfx 'RESIDENT.rpf') -Raw).Trim() -eq 'GTA-UPDATED-ORIGINAL') 'deaktivieren nach Update: neue Spieldatei zurück, nicht die alte'

        # 18) Konflikte werden in der Liste genannt
        $l = Invoke-TweakerMods -Action mods-list
        Assert (@(@($l.mods | Where-Object id -eq $m3.id)[0].conflictsWith) -contains $m1.id -and @(@($l.mods | Where-Object id -eq $h.id)[0].conflictsWith).Count -eq 0) 'liste: Konfliktpartner'

        # 8) Auflösung
        $env:APPDATA = Join-Path $work 'appdata'
        $null = New-Item -ItemType Directory -Path (Join-Path $env:APPDATA 'CitizenFX') -Force
        $settings = Join-Path $env:APPDATA 'CitizenFX/gta5_settings.xml'
        Set-Content -LiteralPath $settings -Value '<?xml version="1.0" encoding="UTF-8"?><Settings><video><ScreenWidth value="1920" /><ScreenHeight value="1080" /><RefreshRate value="144" /><Windowed value="0" /></video></Settings>'
        $g = Invoke-TweakerMods -Action res-get
        Assert ($g.width -eq 1920 -and $g.height -eq 1080 -and $g.windowed -eq 0 -and $g.refreshRate -eq 144 -and -not $g.hasBackup) 'auflösung lesen'
        $s = Invoke-TweakerMods -Action res-set -Width 1440 -Height 1080 -Windowed 2
        Assert ($s.width -eq 1440 -and $s.windowed -eq 2 -and $s.hasBackup) 'auflösung setzen + sicherung'
        Expect-Error { Invoke-TweakerMods -Action res-set -Width 100 -Height 1080 -Windowed 0 } 'invalid_resolution' 'zu kleine auflösung'
        $x = Invoke-TweakerMods -Action res-reset
        Assert ($x.width -eq 1920 -and $x.windowed -eq 0 -and -not $x.hasBackup) 'auflösung zurücksetzen'
    } finally {
        Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
    }
}
