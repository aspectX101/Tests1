#requires -Version 5.1
# FiveM Mod Manager: importiert Mods aus eigenen Dateien (ZIP, RPF, Ordner) in eine Bibliothek und
# aktiviert/deaktiviert sie umkehrbar im FiveM-Ordner. Dazu Auflösung/Fenstermodus in den Spieleinstellungen.
# Bibliothek, Sicherungen und Zustand: %LOCALAPPDATA%\Tweaker\Mods (pro Windows-Benutzer).
#
# Zuordnung je Datei (relativer Pfad im Mod):
#   - enthält einen Ordner "citizen", "mods" oder "plugins"  -> ab dort unter FiveM.app (z. B. Soundpacks)
#   - .rpf ohne solche Struktur                                -> FiveM.app\mods\<Datei>.rpf (Grafik, Waffen, Minimap)
#   - enthält "platform" oder "common"                         -> FiveM.app\citizen\<ab dort>
#   - alles andere (Readme, Bilder, …) wird nicht installiert
# Ausführbarer Code (.exe, .dll, .asi, Skripte) wird nie installiert – Sicherheit und Anticheat.

$script:ModStore = Join-Path $env:LOCALAPPDATA 'Tweaker\Mods'
$script:ModCategories = @('graphics', 'sound', 'weapons', 'minimap', 'other')
$script:ModBlockedExt = @('.exe', '.dll', '.asi', '.sys', '.bat', '.cmd', '.ps1', '.psm1', '.vbs', '.js', '.jse', '.wsf', '.msi', '.scr', '.com', '.lnk', '.reg', '.hta', '.jar')
$script:ModAssetExt = @('.rpf', '.ytd', '.ydr', '.ydd', '.yft', '.ybn', '.ymap', '.ytyp', '.ymt', '.ycd', '.awc', '.rel', '.oac', '.dat', '.meta', '.xml', '.gfx', '.gxt2', '.fx', '.fxh', '.ini', '.png', '.dds', '.cfg', '.ttf', '.otf')
$script:ModMaxBytes = 16GB
$script:ModMaxFiles = 20000

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

# Zielpfad relativ zu FiveM.app (mit "\") oder $null, wenn die Datei nicht installiert wird.
function Get-ModTarget([string]$Relative) {
    $parts = Get-ModRelativeParts $Relative
    if ($parts.Count -eq 0) { return $null }
    $ext = [IO.Path]::GetExtension($parts[-1]).ToLowerInvariant()
    if ($ext -in $script:ModBlockedExt) { return $null }
    if ($ext -notin $script:ModAssetExt) { return $null }
    for ($i = 0; $i -lt $parts.Count - 1; $i++) {
        if ($parts[$i] -in @('citizen', 'mods', 'plugins')) {
            if ($parts[$i] -eq 'plugins' -and $ext -notin @('.fx', '.fxh', '.ini', '.png', '.dds', '.ttf', '.otf')) { return $null }
            return ($parts[$i..($parts.Count - 1)] -join '\')
        }
    }
    if ($ext -eq '.rpf') { return 'mods\' + $parts[-1] }
    for ($i = 0; $i -lt $parts.Count - 1; $i++) {
        if ($parts[$i] -in @('platform', 'common')) { return 'citizen\' + ($parts[$i..($parts.Count - 1)] -join '\') }
    }
    return $null
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
    $archive = [IO.Compression.ZipFile]::OpenRead($Zip)
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
            [IO.Compression.ZipFileExtensions]::ExtractToFile($e, $full, $true)
        }
    } finally { $archive.Dispose() }
}

function ConvertTo-ModName([string]$Name) {
    $clean = ($Name -replace '[\x00-\x1f<>:"/\\|?*]', ' ' -replace '\s+', ' ').Trim()
    if ($clean.Length -gt 60) { $clean = $clean.Substring(0, 60).Trim() }
    if (-not $clean) { $clean = 'Mod' }
    return $clean
}

function Get-ModPublic($Mod) {
    [pscustomobject]@{id=$Mod.id; name=$Mod.name; category=$Mod.category; enabled=[bool]$Mod.enabled
        sizeBytes=[long]$Mod.sizeBytes; fileCount=@($Mod.files).Count; skippedCount=[int]$Mod.skippedCount
        importedUtc=$Mod.importedUtc; enabledUtc=$Mod.enabledUtc
        targets=@(@($Mod.files) | Select-Object -First 4 | ForEach-Object { $_.target })}
}

function Find-Mod($State, [string]$ModId) {
    if ($ModId -notmatch '^[a-f0-9]{12}$') { throw 'invalid_mod_id' }
    $mod = @($State.mods | Where-Object { $_.id -eq $ModId })
    if ($mod.Count -ne 1) { throw 'mod_not_found' }
    return $mod[0]
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
            if ($ext -eq '.zip') { Expand-ModZip $source.FullName $files }
            elseif ($ext -in $script:ModAssetExt) {
                if ($source.Length -gt $script:ModMaxBytes) { throw 'mod_too_large' }
                Copy-Item -LiteralPath $source.FullName -Destination (Join-Path $files $source.Name)
            }
            elseif ($ext -in @('.rar', '.7z', '.oiv', '.tar', '.gz')) { throw 'mod_archive_unsupported' }
            else { throw 'mod_no_installable_files' }
        }
        $base = (Get-Item -LiteralPath $files).FullName.TrimEnd('\', '/')
        $mapped = @(); $skipped = 0; $bytes = [long]0; $seen = @{}
        foreach ($f in @(Get-ChildItem -LiteralPath $base -Recurse -File -Force)) {
            $relative = $f.FullName.Substring($base.Length + 1)
            $target = Get-ModTarget $relative
            if (-not $target -or $seen.ContainsKey($target.ToLowerInvariant())) { $skipped++; continue }
            $seen[$target.ToLowerInvariant()] = $true
            $bytes += $f.Length
            $mapped += [pscustomobject]@{source=($relative -replace '/', '\'); target=$target}
        }
        if ($mapped.Count -eq 0) { throw 'mod_no_installable_files' }
        $displayName = if ($Name) { $Name } else { [IO.Path]::GetFileNameWithoutExtension($source.Name) }
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

function Get-ModTargetPath([string]$Root, [string]$Target) {
    $parts = Get-ModRelativeParts $Target
    if ($parts[0] -notin @('citizen', 'mods', 'plugins')) { throw 'mod_archive_unsafe' }
    return Assert-CachePath (Join-Path $Root ($parts -join [IO.Path]::DirectorySeparatorChar)) $Root
}

function Enable-TweakerMod([string]$ModId, [string]$FiveMPath) {
    Assert-FiveMClosed
    $root = Resolve-FiveMRoot $FiveMPath
    $state = Read-ModState
    $mod = Find-Mod $state $ModId
    if ($mod.enabled) { return $mod }
    # Konflikt: dieselbe Zieldatei gehört schon einer anderen aktiven Mod
    $mine = @{}; foreach ($e in @($mod.files)) { $mine[$e.target.ToLowerInvariant()] = $true }
    foreach ($other in @($state.mods | Where-Object { $_.enabled -and $_.id -ne $mod.id })) {
        foreach ($e in @($other.files)) { if ($mine.ContainsKey($e.target.ToLowerInvariant())) { throw 'mod_conflict' } }
    }
    $backupDir = Get-ModStorePath (Join-Path 'backup' $mod.id)
    $done = @(); $backups = @()
    try {
        foreach ($e in @($mod.files)) {
            $src = Get-ModSourceFile $mod $e
            $dst = Get-ModTargetPath $root $e.target
            if (Test-Path -LiteralPath $dst -PathType Leaf) {
                $saved = Join-Path $backupDir ($e.target -replace '\\', [IO.Path]::DirectorySeparatorChar)
                $null = New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($saved)) -Force
                Copy-Item -LiteralPath $dst -Destination $saved -Force
                $backups += $e.target
            }
            $null = New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($dst)) -Force
            Copy-Item -LiteralPath $src -Destination $dst -Force
            $done += $e.target
        }
    } catch {
        # Teilweise aktiviert: alles zurückdrehen, dann den Fehler melden
        foreach ($t in $done) { Restore-ModTarget $root $mod.id $t ($t -in $backups) }
        throw
    }
    $mod.enabled = $true
    $mod.enabledUtc = [DateTime]::UtcNow.ToString('o')
    $mod.backups = $backups
    Save-ModState $state
    return $mod
}

function Restore-ModTarget([string]$Root, [string]$ModId, [string]$Target, [bool]$HasBackup) {
    $dst = Get-ModTargetPath $Root $Target
    if (Test-Path -LiteralPath $dst -PathType Leaf) { Remove-Item -LiteralPath $dst -Force }
    if ($HasBackup) {
        $saved = Join-Path (Get-ModStorePath (Join-Path 'backup' $ModId)) ($Target -replace '\\', [IO.Path]::DirectorySeparatorChar)
        if (Test-Path -LiteralPath $saved -PathType Leaf) {
            $null = New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($dst)) -Force
            Move-Item -LiteralPath $saved -Destination $dst -Force
        }
    }
}

function Disable-TweakerMod([string]$ModId, [string]$FiveMPath) {
    Assert-FiveMClosed
    $root = Resolve-FiveMRoot $FiveMPath
    $state = Read-ModState
    $mod = Find-Mod $state $ModId
    if (-not $mod.enabled) { return $mod }
    $backups = @($mod.backups)
    foreach ($e in @($mod.files)) { Restore-ModTarget $root $mod.id $e.target ($e.target -in $backups) }
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
    $state.mods = @($state.mods | Where-Object { $_.id -ne $ModId })
    Save-ModState $state
}

# ---------- Auflösung / Fenstermodus ----------
function Get-GameSettingsPath {
    $candidates = @(
        (Join-Path $env:APPDATA 'CitizenFX\gta5_settings.xml'),
        (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Rockstar Games\GTA V\settings.xml')
    )
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
        'mods-list' {
            $state = Read-ModState
            $root = $null; $found = $true
            try { $root = Resolve-FiveMRoot $FiveMPath } catch { $found = $false }
            $mods = @($state.mods | ForEach-Object { Get-ModPublic $_ })
            return [pscustomobject]@{ok=$true; fivemFound=$found; root=$root; mods=$mods
                enabledCount=@($mods | Where-Object enabled).Count; categories=$script:ModCategories}
        }
        'mods-import' { return [pscustomobject]@{ok=$true; mod=(Get-ModPublic (Import-TweakerMod $ModPath $Category $Name))} }
        'mods-enable' { return [pscustomobject]@{ok=$true; mod=(Get-ModPublic (Enable-TweakerMod $ModId $FiveMPath))} }
        'mods-disable' { return [pscustomobject]@{ok=$true; mod=(Get-ModPublic (Disable-TweakerMod $ModId $FiveMPath))} }
        'mods-remove' { Remove-TweakerMod $ModId $FiveMPath; return [pscustomobject]@{ok=$true; id=$ModId} }
        'res-get' { return Get-TweakerResolution }
        'res-set' { return Set-TweakerResolution $Width $Height $Windowed }
        'res-reset' { return Reset-TweakerResolution }
    }
}
