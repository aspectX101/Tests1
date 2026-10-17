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
        Assert (@($m1.targets) -contains 'citizen\platform\audio\sfx\RESIDENT.awc' -and @($m1.targets) -contains 'mods\weapons.rpf') 'import zip: Zielpfade richtig zugeordnet'
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
        $rar = Join-Path $work 'x.rar'; Set-Content -LiteralPath $rar -Value 'r'
        Expect-Error { Invoke-TweakerMods -Action mods-import -ModPath $rar -Category other } 'mod_archive_unsupported' 'rar'
        Expect-Error { Invoke-TweakerMods -Action mods-import -ModPath $rpf -Category nope } 'invalid_mod_category' 'falsche Kategorie'

        # 4) Aktivieren: Original gesichert, Dateien kopiert
        $script:gameRunning = $true
        Expect-Error { Invoke-TweakerMods -Action mods-enable -ModId $m1.id } 'close_fivem_first' 'FiveM läuft'
        $script:gameRunning = $false
        $null = Invoke-TweakerMods -Action mods-enable -ModId $m1.id
        $awc = Join-Path $fivem 'citizen/platform/audio/sfx/RESIDENT.awc'
        Assert ((Get-Content $awc -Raw).Trim() -eq 'NEWSOUND') 'aktivieren: Sounddatei ersetzt'
        Assert (Test-Path (Join-Path $fivem 'mods/weapons.rpf')) 'aktivieren: rpf in mods\'
        Assert ((Invoke-TweakerMods -Action mods-list).enabledCount -eq 1) 'liste: 1 aktiv'

        # 5) Konflikt mit gleicher Zieldatei
        $sound2 = Join-Path $work 'other.zip'
        New-TestZip $sound2 @{ 'citizen/platform/audio/sfx/RESIDENT.awc' = 'OTHER' }
        $m3 = (Invoke-TweakerMods -Action mods-import -ModPath $sound2 -Category sound).mod
        Expect-Error { Invoke-TweakerMods -Action mods-enable -ModId $m3.id } 'mod_conflict' 'gleiche Zieldatei'

        # 6) Deaktivieren: Original zurück, eigene Dateien weg
        $null = Invoke-TweakerMods -Action mods-disable -ModId $m1.id
        Assert ((Get-Content $awc -Raw).Trim() -eq 'ORIGINAL') 'deaktivieren: Original wiederhergestellt'
        Assert (-not (Test-Path (Join-Path $fivem 'mods/weapons.rpf'))) 'deaktivieren: rpf entfernt'

        # 7) Entfernen (auch wenn aktiv)
        $null = Invoke-TweakerMods -Action mods-enable -ModId $m2.id
        $null = Invoke-TweakerMods -Action mods-remove -ModId $m2.id
        Assert (-not (Test-Path (Join-Path $fivem 'mods/Gold Pistol.rpf'))) 'entfernen deaktiviert vorher'
        Assert (@((Invoke-TweakerMods -Action mods-list).mods | Where-Object id -eq $m2.id).Count -eq 0) 'entfernen: aus Liste weg'
        Expect-Error { Invoke-TweakerMods -Action mods-enable -ModId 'zzz' } 'invalid_mod_id' 'ungültige ID'

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
