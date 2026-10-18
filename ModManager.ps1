#requires -Version 5.1
# FiveM Mod Manager: importiert Mods aus eigenen Dateien (ZIP, RAR, 7z, RPF, Ordner) in eine Bibliothek und
# aktiviert/deaktiviert sie umkehrbar im FiveM-Ordner. Dazu Auflösung/Fenstermodus in den Spieleinstellungen.
# Bibliothek, Sicherungen und Zustand: %LOCALAPPDATA%\Tweaker\Mods (pro Windows-Benutzer).
#
# Zuordnung je Datei (relativer Pfad im Mod). Ziele mit "gta:" liegen im GTA-V-Ordner, alle anderen unter FiveM.app:
#   - liegt in einem Ordner "xyz.rpf" (Inhalt eines RPF-Archivs)  -> nicht installierbar
#   - enthält "x64\audio\…"                                -> gta:x64\audio\… (Original-Sounds, z. B. Soundpacks)
#   - enthält einen Ordner "citizen", "mods" oder "plugins"  -> ab dort unter FiveM.app
#   - enthält "audio\sfx\…" (ohne x64)                      -> gta:x64\audio\sfx\…
#   - .rpf ohne Struktur in einer Sound-Mod oder mit dem Namen
#     einer GTA-Sounddatei (RESIDENT.rpf, WEAPONS_PLAYER.rpf …) -> gta:x64\audio\sfx\<Datei>.rpf
#   - .rpf unter "update\…" oder "x64\…"                      -> FiveM.app\mods\update\… bzw. mods\x64\… (Struktur bleibt)
#   - andere .rpf ohne Struktur                               -> FiveM.app\mods\<Datei>.rpf (Grafik/NVE, Waffen, Minimap)
#   - enthält "platform" oder "common"                        -> FiveM.app\citizen\<ab dort>
#   - alles andere (Readme, Bilder, …) wird nicht installiert
# Ausführbarer Code (.exe, .dll, .asi, Skripte) wird nie installiert – Sicherheit und Anticheat.

$script:ModStore = Join-Path $env:LOCALAPPDATA 'Tweaker\Mods'
$script:ModCategories = @('graphics', 'sound', 'weapons', 'minimap', 'other')
$script:ModBlockedExt = @('.exe', '.dll', '.asi', '.sys', '.bat', '.cmd', '.ps1', '.psm1', '.vbs', '.js', '.jse', '.wsf', '.msi', '.scr', '.com', '.lnk', '.reg', '.hta', '.jar')
$script:ModAssetExt = @('.rpf', '.ytd', '.ydr', '.ydd', '.yft', '.ybn', '.ymap', '.ytyp', '.ymt', '.ycd', '.awc', '.rel', '.oac', '.dat', '.meta', '.xml', '.gfx', '.gxt2', '.fx', '.fxh', '.ini', '.png', '.dds', '.cfg', '.ttf', '.otf')
$script:ModArchiveExt = @('.zip', '.rar', '.7z')
$script:ModSoundRpf = @('resident.rpf', 'weapons_player.rpf')
$script:ModMaxBytes = 16GB
$script:ModMaxFiles = 20000
$script:ModMaxNested = 20

function Get-ModStorePath([string]$Child) {
    $base = $script:ModStore
    if (-not (Test-Path -LiteralPath $base)) { $null = New-Item -ItemType Directory -Path $base -Force }
    if (((Get-Item -LiteralPath $base -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'mod_link_not_allowed' }
    if (-not $Child) { return $base }
    return Join-Path $base $Child
}

function Read-ModState {
    $path = Get-ModStorePath 'state.json'
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return [pscustomobject]@{version=1; mods=@()} }
    $state = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    if ($state.version -ne 1) { throw 'invalid_mod_state' }
    $state.mods = @($state.mods)
    return $state
}

function Save-ModState($State) { Write-AtomicJson $State (Get-ModStorePath 'state.json') }

function Get-ModRelativeParts([string]$Relative) {
    $parts = @($Relative -split '[\\/]+' | Where-Object { $_ -ne '' })
    foreach ($p in $parts) {
        if ($p -in @('.', '..') -or $p -match '[:*?"<>|]' -or $p.TrimEnd(' .') -ne $p) { throw 'mod_archive_unsafe' }
    }
    return ,$parts
}

# Zielpfad relativ zu FiveM.app (mit "\"), "gta:…" für den GTA-Ordner oder $null, wenn die Datei nicht installiert wird.
# $SoundFiles: Dateinamen (klein) der GTA-Sounddateien in x64\audio\sfx.
function Get-ModTarget([string]$Relative, [string]$Category, [hashtable]$SoundFiles) {
    $parts = Get-ModRelativeParts $Relative
    if ($parts.Count -eq 0) { return $null }
    $name = $parts[-1]
    $ext = [IO.Path]::GetExtension($name).ToLowerInvariant()
    if ($ext -in $script:ModBlockedExt) { return $null }
    if ($ext -notin $script:ModAssetExt) { return $null }
    $dirs = @(if ($parts.Count -gt 1) { $parts[0..($parts.Count - 2)] })
    # Ordner "update.rpf\…" beschreiben Dateien, die in ein RPF-Archiv gehören (OpenIV) – das kann FiveM so nicht laden
    if (@($dirs | Where-Object { $_ -like '*.rpf' }).Count -gt 0) { return $null }
    # Original-GTA-Sounds: x64\audio\… bzw. audio\sfx\… im Archiv
    for ($i = 0; $i -lt $dirs.Count - 1; $i++) {
        if ($dirs[$i] -eq 'x64' -and $dirs[$i + 1] -eq 'audio') { return 'gta:' + ($parts[$i..($parts.Count - 1)] -join '\') }
    }
    $citizenAt = -1
    for ($i = 0; $i -lt $dirs.Count; $i++) { if ($dirs[$i] -in @('citizen', 'mods', 'plugins')) { $citizenAt = $i; break } }
    if ($citizenAt -ge 0) {
        if ($dirs[$citizenAt] -eq 'plugins' -and $ext -notin @('.fx', '.fxh', '.ini', '.png', '.dds', '.ttf', '.otf')) { return $null }
        return ($parts[$citizenAt..($parts.Count - 1)] -join '\')
    }
    for ($i = 0; $i -lt $dirs.Count - 1; $i++) {
        if ($dirs[$i] -eq 'audio' -and $dirs[$i + 1] -eq 'sfx') { return 'gta:x64\' + ($parts[$i..($parts.Count - 1)] -join '\') }
    }
    if ($ext -eq '.rpf') {
        if ($Category -eq 'sound' -or ($SoundFiles -and $SoundFiles.ContainsKey($name.ToLowerInvariant()))) { return 'gta:x64\audio\sfx\' + $name }
        # Spielstruktur (update\x64\dlcpacks\…\dlc.rpf) beibehalten – FiveMs mods-Ordner spiegelt den GTA-Ordner
        for ($i = 0; $i -lt $dirs.Count; $i++) {
            if ($dirs[$i] -in @('update', 'x64')) { return 'mods\' + ($parts[$i..($parts.Count - 1)] -join '\') }
        }
        return 'mods\' + $name
    }
    for ($i = 0; $i -lt $dirs.Count; $i++) {
        if ($dirs[$i] -in @('platform', 'common')) { return 'citizen\' + ($parts[$i..($parts.Count - 1)] -join '\') }
    }
    return $null
}

# Prüft einen Ordner in der Bibliothek: keine Verknüpfungen, gültige Namen, Größenlimit.
function Assert-ModTree([string]$Root) {
    $base = (Get-Item -LiteralPath $Root -Force).FullName.TrimEnd('\', '/')
    $count = 0; $bytes = [long]0
    foreach ($item in @(Get-ChildItem -LiteralPath $base -Recurse -Force)) {
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'mod_link_not_allowed' }
        $null = Get-ModRelativeParts $item.FullName.Substring($base.Length + 1)
        if ($item.PSIsContainer) { continue }
        $count++; $bytes += $item.Length
        if ($count -gt $script:ModMaxFiles -or $bytes -gt $script:ModMaxBytes) { throw 'mod_too_large' }
    }
}

function Copy-ModTree([string]$Source, [string]$Destination) {
    $root = (Get-Item -LiteralPath $Source -Force).FullName.TrimEnd('\', '/')
    $count = 0; $bytes = [long]0
    foreach ($item in @(Get-ChildItem -LiteralPath $root -Recurse -Force)) {
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'mod_link_not_allowed' }
        if ($item.PSIsContainer) { continue }
        $count++; $bytes += $item.Length
        if ($count -gt $script:ModMaxFiles -or $bytes -gt $script:ModMaxBytes) { throw 'mod_too_large' }
        $relative = $item.FullName.Substring($root.Length + 1)
        $parts = Get-ModRelativeParts $relative
        $target = Join-Path $Destination ($parts -join [IO.Path]::DirectorySeparatorChar)
        $null = New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($target)) -Force
        Copy-Item -LiteralPath $item.FullName -Destination $target -Force
    }
}

# Entpackt Eintrag für Eintrag mit Pfadprüfung (kein "..", keine absoluten Pfade) und Größenlimit.
function Expand-ModZip([string]$Zip, [string]$Destination) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    try { $archive = [IO.Compression.ZipFile]::OpenRead($Zip) } catch { throw 'mod_archive_failed' }
    try {
        $entries = @($archive.Entries | Where-Object { -not $_.FullName.EndsWith('/') -and -not $_.FullName.EndsWith('\') })
        if ($entries.Count -gt $script:ModMaxFiles) { throw 'mod_too_large' }
        $total = [long]0
        foreach ($e in $entries) { $total += $e.Length }
        if ($total -gt $script:ModMaxBytes) { throw 'mod_too_large' }
        foreach ($e in $entries) {
            if ($e.FullName -match '^[\\/]|^[a-zA-Z]:') { throw 'mod_archive_unsafe' }
            $parts = Get-ModRelativeParts $e.FullName
            $target = Join-Path $Destination ($parts -join [IO.Path]::DirectorySeparatorChar)
            $full = [IO.Path]::GetFullPath($target)
            if (-not $full.StartsWith([IO.Path]::GetFullPath($Destination), [StringComparison]::OrdinalIgnoreCase)) { throw 'mod_archive_unsafe' }
            $null = New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($full)) -Force
            try { [IO.Compression.ZipFileExtensions]::ExtractToFile($e, $full, $true) }
            catch [IO.InvalidDataException] { throw 'mod_archive_failed' }
            catch [NotSupportedException] { throw 'mod_archive_failed' }
        }
    } finally { $archive.Dispose() }
}

# RAR/7z: 7-Zip (falls installiert), dann tar.exe von Windows (libarchive; RAR5 ab Windows 11). Reihenfolge = Versuchsreihenfolge.
function Get-ModArchiveTool {
    $tools = @()
    $paths = @()
    foreach ($key in @('HKLM:\SOFTWARE\7-Zip', 'HKCU:\SOFTWARE\7-Zip')) {
        $props = Get-ItemProperty -LiteralPath $key -ErrorAction SilentlyContinue
        if ($props) { foreach ($n in 'Path64', 'Path') { if ($props.PSObject.Properties[$n] -and $props.$n) { $paths += Join-Path $props.$n '7z.exe' } } }
    }
    foreach ($pf in @($env:ProgramW6432, $env:ProgramFiles, ${env:ProgramFiles(x86)}) | Where-Object { $_ }) { $paths += Join-Path $pf '7-Zip\7z.exe' }
    $seven = @($paths | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1)
    if ($seven.Count) { $tools += [pscustomobject]@{kind='7z'; path=$seven[0]} }
    if ($env:SystemRoot) {
        $tar = Join-Path $env:SystemRoot 'System32\tar.exe'
        if (Test-Path -LiteralPath $tar -PathType Leaf) { $tools += [pscustomobject]@{kind='tar'; path=$tar} }
    }
    return $tools
}

# Startet ein Entpackprogramm ohne Fenster und ohne Eingabe (keine Passwortabfrage); Ausgabe geht nie auf stdout.
function Invoke-ModTool([string]$Exe, [string[]]$Arguments, [Text.Encoding]$Encoding) {
    $psi = New-Object Diagnostics.ProcessStartInfo
    $psi.FileName = $Exe
    $psi.Arguments = (@($Arguments | ForEach-Object { if ($_ -match '[\s"]' -or $_ -eq '') { '"' + $_ + '"' } else { $_ } }) -join ' ')
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    if ($Encoding) { $psi.StandardOutputEncoding = $Encoding; $psi.StandardErrorEncoding = $Encoding }
    $p = [Diagnostics.Process]::Start($psi)
    try {
        $p.StandardInput.Close()
        $out = $p.StandardOutput.ReadToEndAsync()
        $err = $p.StandardError.ReadToEndAsync()
        if (-not $p.WaitForExit(1800000)) { try { $p.Kill() } catch { }; throw 'mod_archive_failed' }
        $p.WaitForExit()
        return [pscustomobject]@{code=$p.ExitCode; out=$out.Result; err=$err.Result}
    } finally { $p.Dispose() }
}

function Assert-ModToolResult($Result) {
    if ($Result.code -eq 0) { return }
    if ("$($Result.out) $($Result.err)" -match '(?i)password|encrypt') { throw 'mod_archive_password' }
    throw 'mod_archive_failed'
}

function Expand-ModExternal([string]$Archive, [string]$Destination) {
    $tools = @(Get-ModArchiveTool | Where-Object { $_ })
    if ($tools.Count -eq 0) { throw 'mod_archive_tool_missing' }
    for ($i = 0; $i -lt $tools.Count; $i++) {
        try { Expand-ModWithTool $tools[$i] $Archive $Destination; return }
        catch {
            # z. B. altes 7-Zip ohne -ba/-scc oder tar.exe ohne RAR5: mit dem nächsten Programm neu versuchen
            if ($_.Exception.Message -ne 'mod_archive_failed' -or $i -eq $tools.Count - 1) { throw }
            if (Test-Path -LiteralPath $Destination) { Get-ChildItem -LiteralPath $Destination -Force | Remove-Item -Recurse -Force }
        }
    }
}

function Expand-ModWithTool($Tool, [string]$Archive, [string]$Destination) {
    $tool = $Tool
    $full = [IO.Path]::GetFullPath($Archive)
    $dest = [IO.Path]::GetFullPath($Destination).TrimEnd('\', '/')
    # Erst auflisten und prüfen, dann entpacken. Ein festes Passwort verhindert, dass 7-Zip auf eine Eingabe wartet.
    $names = @(); $total = [long]0
    if ($tool.kind -eq '7z') {
        $utf8 = [Text.UTF8Encoding]::new($false)
        $list = Invoke-ModTool $tool.path @('l', '-slt', '-ba', '-sccUTF-8', '-pundcc-no-password', '--', $full) $utf8
        Assert-ModToolResult $list
        foreach ($line in ($list.out -split "`r?`n")) {
            if ($line -match '^Path = (.+)$') { $names += $Matches[1] }
            elseif ($line -match '^Size = (\d+)$') { $total += [long]$Matches[1] }
        }
    } else {
        $list = Invoke-ModTool $tool.path @('-t', '-f', $full) $null
        Assert-ModToolResult $list
        $names = @($list.out -split "`r?`n" | Where-Object { $_ })
    }
    $names = @($names | Where-Object { $_ -ne $full })
    if ($names.Count -gt $script:ModMaxFiles -or $total -gt $script:ModMaxBytes) { throw 'mod_too_large' }
    foreach ($n in $names) {
        if ($n -match '^[\\/]|^[a-zA-Z]:' -or @($n -split '[\\/]+') -contains '..') { throw 'mod_archive_unsafe' }
    }
    $null = New-Item -ItemType Directory -Path $dest -Force
    if ($tool.kind -eq '7z') { $r = Invoke-ModTool $tool.path @('x', '-y', '-bd', '-sccUTF-8', '-pundcc-no-password', "-o$dest", '--', $full) $utf8 }
    else { $r = Invoke-ModTool $tool.path @('-x', '-f', $full, '-C', $dest) $null }
    Assert-ModToolResult $r
    Assert-ModTree $dest
}

function Expand-ModArchive([string]$Archive, [string]$Destination) {
    $ext = [IO.Path]::GetExtension($Archive).ToLowerInvariant()
    if ($ext -eq '.zip') { Expand-ModZip $Archive $Destination }
    elseif ($ext -in @('.rar', '.7z')) { Expand-ModExternal $Archive $Destination }
    else { throw 'mod_archive_unsupported' }
}

# Archive im Archiv (z. B. "FiveM-Version.zip" im Download) eine Ebene tief entpacken; danach Archiv entfernen.
function Expand-ModNested([string]$Root) {
    $nested = @(Get-ChildItem -LiteralPath $Root -Recurse -File -Force | Where-Object { $_.Extension.ToLowerInvariant() -in $script:ModArchiveExt })
    if ($nested.Count -gt $script:ModMaxNested) { throw 'mod_too_large' }
    foreach ($a in $nested) {
        $stem = [IO.Path]::GetFileNameWithoutExtension($a.Name).TrimEnd(' .')
        if (-not $stem) { $stem = 'archive' }
        $target = Join-Path $a.DirectoryName $stem
        $n = 1
        while (Test-Path -LiteralPath $target) { $target = Join-Path $a.DirectoryName "$stem ($n)"; $n++ }
        $null = New-Item -ItemType Directory -Path $target -Force
        Expand-ModArchive $a.FullName $target
        Remove-Item -LiteralPath $a.FullName -Force
    }
}

function ConvertTo-ModName([string]$Name) {
    $clean = ($Name -replace '[\x00-\x1f<>:"/\\|?*]', ' ' -replace '\s+', ' ').Trim()
    if ($clean.Length -gt 60) { $clean = $clean.Substring(0, 60).Trim() }
    if (-not $clean) { $clean = 'Mod' }
    return $clean
}

# Größe der Mod-Datei (ab dieser Version im Zustand gespeichert, sonst aus der Bibliothek).
function Get-ModFileBytes($Mod, $Entry) {
    if ($Entry.PSObject.Properties['bytes'] -and $null -ne $Entry.bytes) { return [long]$Entry.bytes }
    try { return (Get-Item -LiteralPath (Get-ModSourceFile $Mod $Entry) -Force).Length } catch { return [long]-1 }
}

function Test-ModTargetCurrent([string]$Path, [long]$Bytes) {
    $item = Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
    return [bool]($item -and -not $item.PSIsContainer -and $item.Length -eq $Bytes)
}

# Anzahl Dateien einer aktiven Mod, die fehlen oder ersetzt wurden (z. B. durch Spiel-Update oder Dateiprüfung).
function Get-ModBrokenCount($Mod, [string]$Root) {
    $broken = 0
    foreach ($e in @($Mod.files)) {
        try {
            $dst = Get-ModTargetPath $Root $e.target
            if (-not (Test-ModTargetCurrent $dst (Get-ModFileBytes $Mod $e))) { $broken++ }
        } catch { $broken++ }
    }
    return $broken
}

function Get-ModPublic($Mod, [string[]]$ConflictsWith = @(), $BrokenCount = $null) {
    $health = $null
    if ($Mod.enabled -and $null -ne $BrokenCount) { $health = if ($BrokenCount -gt 0) { 'broken' } else { 'ok' } }
    [pscustomobject]@{id=$Mod.id; name=$Mod.name; category=$Mod.category; enabled=[bool]$Mod.enabled
        sizeBytes=[long]$Mod.sizeBytes; fileCount=@($Mod.files).Count; skippedCount=[int]$Mod.skippedCount
        importedUtc=$Mod.importedUtc; enabledUtc=$Mod.enabledUtc
        targets=@(@($Mod.files) | Select-Object -First 50 | ForEach-Object { $_.target })
        usesGta=(@(@($Mod.files) | Where-Object { $_.target.StartsWith('gta:') }).Count -gt 0)
        health=$health; brokenCount=$(if ($health) { [int]$BrokenCount } else { 0 }); conflictsWith=@($ConflictsWith)}
}

function Find-Mod($State, [string]$ModId) {
    if ($ModId -notmatch '^[a-f0-9]{12}$') { throw 'invalid_mod_id' }
    $mod = @($State.mods | Where-Object { $_.id -eq $ModId })
    if ($mod.Count -ne 1) { throw 'mod_not_found' }
    return $mod[0]
}

# Dateinamen der GTA-Sounddateien (für lose RPFs ohne Ordnerstruktur in beliebiger Kategorie).
function Get-GtaSoundFiles {
    $names = @{}
    foreach ($n in $script:ModSoundRpf) { $names[$n] = $true }
    try {
        $sfx = Join-Path (Resolve-GtaRoot) (Join-Path 'x64' (Join-Path 'audio' 'sfx'))
        foreach ($f in @(Get-ChildItem -LiteralPath $sfx -File -Filter '*.rpf' -Force)) { $names[$f.Name.ToLowerInvariant()] = $true }
    } catch { }
    return $names
}

function Test-ModSameFile([string]$A, [string]$B) {
    if ((Get-Item -LiteralPath $A -Force).Length -ne (Get-Item -LiteralPath $B -Force).Length) { return $false }
    return (Get-FileHash -LiteralPath $A -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $B -Algorithm SHA256).Hash
}

function Import-TweakerMod([string]$ModPath, [string]$Category, [string]$Name) {
    if ($Category -notin $script:ModCategories) { throw 'invalid_mod_category' }
    if (-not $ModPath -or -not (Test-Path -LiteralPath $ModPath)) { throw 'mod_source_not_found' }
    $source = Get-Item -LiteralPath $ModPath -Force
    if (($source.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'mod_link_not_allowed' }
    $id = [guid]::NewGuid().ToString('N').Substring(0, 12)
    $folder = Get-ModStorePath (Join-Path 'library' $id)
    $files = Join-Path $folder 'files'
    $null = New-Item -ItemType Directory -Path $files -Force
    try {
        if ($source.PSIsContainer) { Copy-ModTree $source.FullName $files }
        else {
            $ext = $source.Extension.ToLowerInvariant()
            if ($ext -in $script:ModArchiveExt) { Expand-ModArchive $source.FullName $files }
            elseif ($ext -in $script:ModAssetExt) {
                if ($source.Length -gt $script:ModMaxBytes) { throw 'mod_too_large' }
                Copy-Item -LiteralPath $source.FullName -Destination (Join-Path $files $source.Name)
            }
            elseif ($ext -in @('.oiv', '.tar', '.gz')) { throw 'mod_archive_unsupported' }
            else { throw 'mod_no_installable_files' }
        }
        Expand-ModNested $files
        Assert-ModTree $files
        $base = (Get-Item -LiteralPath $files).FullName.TrimEnd('\', '/')
        $sound = Get-GtaSoundFiles
        $mapped = @(); $skipped = 0; $loose = 0; $bytes = [long]0; $seen = @{}
        foreach ($f in @(Get-ChildItem -LiteralPath $base -Recurse -File -Force | Sort-Object FullName)) {
            $relative = $f.FullName.Substring($base.Length + 1)
            $target = Get-ModTarget $relative $Category $sound
            if (-not $target) {
                $skipped++
                if ($f.Extension.ToLowerInvariant() -in $script:ModAssetExt) { $loose++ }
                continue
            }
            $key = $target.ToLowerInvariant()
            if ($seen.ContainsKey($key)) {
                # Dieselbe Zieldatei zweimal: identische Kopie überspringen, verschiedene Varianten nicht raten
                if (-not (Test-ModSameFile $seen[$key] $f.FullName)) { throw 'mod_multiple_variants' }
                $skipped++; continue
            }
            $seen[$key] = $f.FullName
            $bytes += $f.Length
            $mapped += [pscustomobject]@{source=($relative -replace '/', '\'); target=$target; bytes=[long]$f.Length}
        }
        if ($mapped.Count -eq 0) { if ($loose -gt 0) { throw 'mod_loose_files' } else { throw 'mod_no_installable_files' } }
        $displayName = if ($Name) { $Name } elseif ($source.PSIsContainer) { $source.Name } else { [IO.Path]::GetFileNameWithoutExtension($source.Name) }
        $mod = [pscustomobject]@{id=$id; name=(ConvertTo-ModName $displayName); category=$Category; enabled=$false
            sizeBytes=$bytes; skippedCount=$skipped; importedUtc=[DateTime]::UtcNow.ToString('o'); enabledUtc=$null
            files=$mapped; backups=@()}
        $state = Read-ModState
        $state.mods = @($state.mods) + $mod
        Save-ModState $state
        return $mod
    } catch {
        if (Test-Path -LiteralPath $folder) { Remove-Item -LiteralPath $folder -Recurse -Force -ErrorAction SilentlyContinue }
        throw
    }
}

function Get-ModSourceFile($Mod, $Entry) {
    $path = Join-Path (Get-ModStorePath (Join-Path 'library' $Mod.id)) (Join-Path 'files' ($Entry.source -replace '\\', [IO.Path]::DirectorySeparatorChar))
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw 'mod_files_missing' }
    return $path
}

# GTA-V-Installationsordner finden (für Soundpacks). Reihenfolge: FiveMs CitizenFX.ini (IVPath), Registry
# (Rockstar, Steam, Epic, Legacy), übliche Pfade. Gültig ist ein Ordner mit x64\audio\sfx.
$script:GtaRootCache = $null
function Test-GtaRoot([string]$Path) {
    if (-not $Path) { return $null }
    foreach ($p in @($Path, [IO.Path]::GetDirectoryName($Path.TrimEnd('\', '/')))) {
        if ($p -and (Test-Path -LiteralPath (Join-Path $p 'x64\audio\sfx') -PathType Container)) { return [IO.Path]::GetFullPath($p).TrimEnd('\', '/') }
    }
    return $null
}

function Resolve-GtaRoot([string]$FiveMPath) {
    if ($script:GtaRootCache) { return $script:GtaRootCache }
    $candidates = @()
    try {
        $ini = Join-Path (Resolve-FiveMRoot $FiveMPath) 'CitizenFX.ini'
        foreach ($line in @(Get-Content -LiteralPath $ini -ErrorAction Stop)) { if ($line -match '^\s*IVPath\s*=\s*(.+?)\s*$') { $candidates += $Matches[1] } }
    } catch { }
    foreach ($key in @('HKLM:\SOFTWARE\WOW6432Node\Rockstar Games\Grand Theft Auto V', 'HKLM:\SOFTWARE\WOW6432Node\Rockstar Games\GTA V Legacy',
            'HKLM:\SOFTWARE\WOW6432Node\Rockstar Games\GTAV', 'HKLM:\SOFTWARE\Rockstar Games\Grand Theft Auto V')) {
        $props = Get-ItemProperty -LiteralPath $key -ErrorAction SilentlyContinue
        if ($props) { foreach ($n in 'InstallFolder', 'InstallFolderSteam', 'InstallFolderEpic') { if ($props.PSObject.Properties[$n]) { $candidates += $props.$n } } }
    }
    foreach ($pf in @($env:ProgramFiles, ${env:ProgramFiles(x86)}) | Where-Object { $_ }) {
        $candidates += (Join-Path $pf 'Rockstar Games\Grand Theft Auto V Legacy'), (Join-Path $pf 'Rockstar Games\Grand Theft Auto V'),
            (Join-Path $pf 'Steam\steamapps\common\Grand Theft Auto V Legacy'), (Join-Path $pf 'Steam\steamapps\common\Grand Theft Auto V'),
            (Join-Path $pf 'Epic Games\GTAV')
    }
    foreach ($c in $candidates) { $root = Test-GtaRoot $c; if ($root) { $script:GtaRootCache = $root; return $root } }
    throw 'gta_not_found'
}

function Get-ModTargetPath([string]$Root, [string]$Target) {
    if ($Target.StartsWith('gta:')) {
        $parts = Get-ModRelativeParts $Target.Substring(4)
        # Im GTA-Ordner nur Audio-Dateien ersetzen
        if ($parts.Count -lt 3 -or $parts[0] -ne 'x64' -or $parts[1] -ne 'audio') { throw 'mod_archive_unsafe' }
        $gta = Resolve-GtaRoot
        return Assert-CachePath (Join-Path $gta ($parts -join [IO.Path]::DirectorySeparatorChar)) $gta
    }
    if (-not $Root) { throw 'fivem_not_found' }
    $parts = Get-ModRelativeParts $Target
    if ($parts[0] -notin @('citizen', 'mods', 'plugins')) { throw 'mod_archive_unsafe' }
    return Assert-CachePath (Join-Path $Root ($parts -join [IO.Path]::DirectorySeparatorChar)) $Root
}

# Sicherungsort einer überschriebenen Originaldatei (GTA-Ziele getrennt unter "gta\")
function Get-ModBackupPath([string]$ModId, [string]$Target) {
    $rel = if ($Target.StartsWith('gta:')) { 'gta\' + $Target.Substring(4) } else { $Target }
    return Join-Path (Get-ModStorePath (Join-Path 'backup' $ModId)) ($rel -replace '\\', [IO.Path]::DirectorySeparatorChar)
}

# Aktivieren. Ist die Mod schon aktiv, werden fehlende oder ersetzte Dateien neu kopiert (Reparieren); was dort
# inzwischen liegt (z. B. eine neuere Spieldatei nach einem Update), wird vorher als Original gesichert.
function Enable-TweakerMod([string]$ModId, [string]$FiveMPath) {
    Assert-FiveMClosed
    $root = Resolve-FiveMRoot $FiveMPath
    $state = Read-ModState
    $mod = Find-Mod $state $ModId
    $repair = [bool]$mod.enabled
    if (-not $repair) {
        # Konflikt: dieselbe Zieldatei gehört schon einer anderen aktiven Mod
        $mine = @{}; foreach ($e in @($mod.files)) { $mine[$e.target.ToLowerInvariant()] = $true }
        foreach ($other in @($state.mods | Where-Object { $_.enabled -and $_.id -ne $mod.id })) {
            foreach ($e in @($other.files)) { if ($mine.ContainsKey($e.target.ToLowerInvariant())) { throw 'mod_conflict' } }
        }
    }
    $backups = @(if ($repair) { @($mod.backups) })
    $done = @()
    try {
        foreach ($e in @($mod.files)) {
            $src = Get-ModSourceFile $mod $e
            $dst = Get-ModTargetPath $root $e.target
            if ($repair -and (Test-ModTargetCurrent $dst (Get-ModFileBytes $mod $e))) { continue }
            $saved = Get-ModBackupPath $mod.id $e.target
            if (Test-Path -LiteralPath $dst -PathType Leaf) {
                # Eine Sicherung aus einem abgebrochenen Aktivieren ist das echte Original – nicht überschreiben
                if ($repair -or -not (Test-Path -LiteralPath $saved -PathType Leaf)) {
                    $null = New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($saved)) -Force
                    Copy-Item -LiteralPath $dst -Destination $saved -Force
                }
                if ($e.target -notin $backups) { $backups += $e.target }
            } elseif (-not $repair -and (Test-Path -LiteralPath $saved -PathType Leaf)) { $backups += $e.target }
            # vor dem Kopieren vormerken: auch eine halb kopierte Datei wird beim Fehler zurückgedreht
            $done += $e.target
            $null = New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($dst)) -Force
            Copy-Item -LiteralPath $src -Destination $dst -Force
        }
    } catch {
        if ($repair) {
            # Reparieren: Mod bleibt aktiv, neue Sicherungen müssen im Zustand bleiben
            $mod.backups = $backups
            Save-ModState $state
        } else {
            # Teilweise aktiviert: alles zurückdrehen, dann den Fehler melden
            $restored = $true
            foreach ($t in $done) { try { Restore-ModTarget $root $mod.id $t ($t -in $backups) } catch { $restored = $false } }
            $backupDir = Get-ModStorePath (Join-Path 'backup' $mod.id)
            if ($restored -and (Test-Path -LiteralPath $backupDir) -and @(Get-ChildItem -LiteralPath $backupDir -Recurse -File -Force).Count -eq 0) {
                Remove-Item -LiteralPath $backupDir -Recurse -Force
            }
        }
        throw
    }
    $mod.enabled = $true
    if (-not $repair) { $mod.enabledUtc = [DateTime]::UtcNow.ToString('o') }
    $mod.backups = $backups
    Save-ModState $state
    return $mod
}

# Eine Zieldatei zurücksetzen. Wiederholbar: ist die Sicherung schon zurückgespielt, bleibt das Original unangetastet.
function Restore-ModTarget([string]$Root, [string]$ModId, [string]$Target, [bool]$HasBackup) {
    $dst = Get-ModTargetPath $Root $Target
    if ($HasBackup) {
        $saved = Get-ModBackupPath $ModId $Target
        if (-not (Test-Path -LiteralPath $saved -PathType Leaf)) { return }
        if (Test-Path -LiteralPath $dst -PathType Leaf) { Remove-Item -LiteralPath $dst -Force }
        $null = New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($dst)) -Force
        Move-Item -LiteralPath $saved -Destination $dst
    } elseif (Test-Path -LiteralPath $dst -PathType Leaf) { Remove-Item -LiteralPath $dst -Force }
}

function Disable-TweakerMod([string]$ModId, [string]$FiveMPath) {
    Assert-FiveMClosed
    $root = Resolve-FiveMRoot $FiveMPath
    $state = Read-ModState
    $mod = Find-Mod $state $ModId
    if (-not $mod.enabled) { return $mod }
    $backups = @($mod.backups)
    $failed = 0
    foreach ($e in @($mod.files)) {
        try { Restore-ModTarget $root $mod.id $e.target ($e.target -in $backups) } catch { $failed++ }
    }
    # Teilfehler (Datei gesperrt, GTA-Ordner fehlt …): Mod bleibt aktiv, erneutes Deaktivieren macht dort weiter
    if ($failed -gt 0) { throw 'mod_disable_partial' }
    $backupDir = Get-ModStorePath (Join-Path 'backup' $mod.id)
    if (Test-Path -LiteralPath $backupDir) { Remove-Item -LiteralPath $backupDir -Recurse -Force }
    $mod.enabled = $false
    $mod.enabledUtc = $null
    $mod.backups = @()
    Save-ModState $state
    return $mod
}

function Remove-TweakerMod([string]$ModId, [string]$FiveMPath) {
    $state = Read-ModState
    $mod = Find-Mod $state $ModId
    if ($mod.enabled) { $null = Disable-TweakerMod $ModId $FiveMPath; $state = Read-ModState }
    $folder = Get-ModStorePath (Join-Path 'library' $ModId)
    if (Test-Path -LiteralPath $folder) { Remove-Item -LiteralPath $folder -Recurse -Force }
    # Leere Reste entfernen; eine Sicherung mit Dateien (abgebrochenes Aktivieren) ist ein Original und bleibt liegen
    $backupDir = Get-ModStorePath (Join-Path 'backup' $ModId)
    if ((Test-Path -LiteralPath $backupDir) -and @(Get-ChildItem -LiteralPath $backupDir -Recurse -File -Force).Count -eq 0) { Remove-Item -LiteralPath $backupDir -Recurse -Force }
    $state.mods = @($state.mods | Where-Object { $_.id -ne $ModId })
    Save-ModState $state
}

# Liste mit Zustand: aktive Mods werden auf fehlende/ersetzte Dateien geprüft, Konflikte über alle Mods gemeldet.
function Get-TweakerModList([string]$FiveMPath) {
    $state = Read-ModState
    $root = $null; $found = $true
    try { $root = Resolve-FiveMRoot $FiveMPath } catch { $found = $false }
    $gta = $null; try { $gta = Resolve-GtaRoot $FiveMPath } catch { }
    $owners = @{}
    foreach ($m in @($state.mods)) {
        foreach ($e in @($m.files)) {
            $k = $e.target.ToLowerInvariant()
            if (-not $owners.ContainsKey($k)) { $owners[$k] = [Collections.Generic.List[string]]::new() }
            if (-not $owners[$k].Contains($m.id)) { $owners[$k].Add($m.id) }
        }
    }
    $mods = @(foreach ($m in @($state.mods)) {
        $with = @{}
        foreach ($e in @($m.files)) { foreach ($o in $owners[$e.target.ToLowerInvariant()]) { if ($o -ne $m.id) { $with[$o] = $true } } }
        $broken = if ($m.enabled) { Get-ModBrokenCount $m $root } else { $null }
        Get-ModPublic $m @($with.Keys | Sort-Object) $broken
    })
    return [pscustomobject]@{ok=$true; fivemFound=$found; root=$root; gtaRoot=$gta; mods=$mods
        enabledCount=@($mods | Where-Object enabled).Count; brokenCount=@($mods | Where-Object { $_.health -eq 'broken' }).Count
        categories=$script:ModCategories}
}


# ---------- Auflösung / Fenstermodus ----------
function Get-GameSettingsPath {
    $candidates = @()
    if ($env:APPDATA) { $candidates += Join-Path $env:APPDATA 'CitizenFX\gta5_settings.xml' }
    $docs = [Environment]::GetFolderPath('MyDocuments')
    if ($docs) { $candidates += Join-Path $docs 'Rockstar Games\GTA V\settings.xml' }
    foreach ($c in $candidates) { if (Test-Path -LiteralPath $c -PathType Leaf) { return $c } }
    throw 'game_settings_not_found'
}

function Read-GameSettings([string]$Path) {
    $xml = New-Object Xml.XmlDocument
    $xml.PreserveWhitespace = $true
    try { $xml.Load($Path) } catch { throw 'game_settings_invalid' }
    foreach ($n in 'ScreenWidth', 'ScreenHeight', 'Windowed') { if (-not $xml.SelectSingleNode("//video/$n")) { throw 'game_settings_invalid' } }
    return $xml
}

function Get-TweakerResolution {
    $path = Get-GameSettingsPath
    $xml = Read-GameSettings $path
    $v = { param($n) $node = $xml.SelectSingleNode("//video/$n"); if ($node) { $node.GetAttribute('value') } else { $null } }
    [pscustomobject]@{ok=$true; file=$path; width=[int](& $v 'ScreenWidth'); height=[int](& $v 'ScreenHeight')
        windowed=[int](& $v 'Windowed'); refreshRate=$(if (& $v 'RefreshRate') { [int](& $v 'RefreshRate') } else { $null })
        hasBackup=(Test-Path -LiteralPath (Get-ModStorePath 'settings-original.xml') -PathType Leaf)}
}

function Set-TweakerResolution([int]$Width, [int]$Height, [int]$Windowed) {
    if ($Width -lt 640 -or $Width -gt 7680 -or $Height -lt 480 -or $Height -gt 4320 -or $Windowed -notin 0, 1, 2) { throw 'invalid_resolution' }
    Assert-FiveMClosed
    $path = Get-GameSettingsPath
    $xml = Read-GameSettings $path
    $backup = Get-ModStorePath 'settings-original.xml'
    if (-not (Test-Path -LiteralPath $backup -PathType Leaf)) {
        Copy-Item -LiteralPath $path -Destination $backup
        Set-Content -LiteralPath (Get-ModStorePath 'settings-original.path') -Value $path -Encoding UTF8
    }
    $xml.SelectSingleNode('//video/ScreenWidth').SetAttribute('value', [string]$Width)
    $xml.SelectSingleNode('//video/ScreenHeight').SetAttribute('value', [string]$Height)
    $xml.SelectSingleNode('//video/Windowed').SetAttribute('value', [string]$Windowed)
    $xml.Save($path)
    return Get-TweakerResolution
}

function Reset-TweakerResolution {
    Assert-FiveMClosed
    $backup = Get-ModStorePath 'settings-original.xml'
    $pathFile = Get-ModStorePath 'settings-original.path'
    if (-not (Test-Path -LiteralPath $backup -PathType Leaf) -or -not (Test-Path -LiteralPath $pathFile -PathType Leaf)) { throw 'resolution_backup_not_found' }
    $path = (Get-Content -LiteralPath $pathFile -Raw).Trim()
    Copy-Item -LiteralPath $backup -Destination $path -Force
    Remove-Item -LiteralPath $backup, $pathFile -Force
    return Get-TweakerResolution
}

function Invoke-TweakerMods {
    param([Parameter(Mandatory)][ValidateSet('mods-list', 'mods-import', 'mods-enable', 'mods-disable', 'mods-remove', 'res-get', 'res-set', 'res-reset')][string]$Action,
        [string]$ModId, [string]$ModPath, [string]$Category, [string]$Name, [string]$FiveMPath, [int]$Width, [int]$Height, [int]$Windowed)
    switch ($Action) {
        'mods-list' { return Get-TweakerModList $FiveMPath }
        'mods-import' { return [pscustomobject]@{ok=$true; mod=(Get-ModPublic (Import-TweakerMod $ModPath $Category $Name))} }
        'mods-enable' { return [pscustomobject]@{ok=$true; mod=(Get-ModPublic (Enable-TweakerMod $ModId $FiveMPath))} }
        'mods-disable' { return [pscustomobject]@{ok=$true; mod=(Get-ModPublic (Disable-TweakerMod $ModId $FiveMPath))} }
        'mods-remove' { Remove-TweakerMod $ModId $FiveMPath; return [pscustomobject]@{ok=$true; id=$ModId} }
        'res-get' { return Get-TweakerResolution }
        'res-set' { return Set-TweakerResolution $Width $Height $Windowed }
        'res-reset' { return Reset-TweakerResolution }
    }
}
