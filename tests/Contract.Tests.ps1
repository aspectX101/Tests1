# Read-only Windows API checks and cache operations on a disposable fixture only.
$ErrorActionPreference = 'Stop'
$script:contractProfile = Join-Path (Join-Path (Get-Location) 'work') ('json-' + [guid]::NewGuid().ToString('N').Substring(0,8))
$entry = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../tweaker.ps1'))
if ($entry.Contains('"')) { throw 'Invalid test path' }
$hostExecutable = (Get-Process -Id $PID).Path
function Invoke-JsonCli([string]$Arguments, [int]$ExpectedExit) {
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $hostExecutable
    $start.Arguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + $entry + '" ' + $Arguments
    $start.UseShellExecute = $false
    $start.EnvironmentVariables['LOCALAPPDATA'] = $script:contractProfile
    $start.CreateNoWindow = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $start.StandardOutputEncoding = [Text.UTF8Encoding]::new($false)
    $start.StandardErrorEncoding = [Text.UTF8Encoding]::new($false)
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $start
    try {
        $null = $process.Start()
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit(30000)) { $process.Kill(); throw 'CLI timeout' }
        $stdout = $stdoutTask.GetAwaiter().GetResult()
        $stderr = $stderrTask.GetAwaiter().GetResult()
        if ($process.ExitCode -ne $ExpectedExit) { throw "Unexpected exit code: $Arguments : $stdout $stderr" }
        if ($stderr.Trim().Length -gt 0) { throw "Unexpected stderr: $stderr" }
        $json = $stdout.Trim() | ConvertFrom-Json
        if ($stdout.Trim() -notmatch '^\{[^\r\n]*\}$') { throw 'Expected exactly one compact JSON object' }
        return $json
    } finally { $process.Dispose() }
}
foreach ($language in @('de','en','it')) {
    $result = Invoke-JsonCli "-Action list -Lang $language" 0
    if (-not $result.ok -or @($result.tweaks).Count -ne 49) { throw 'Invalid catalog' }
    foreach ($tweak in $result.tweaks) {
        foreach ($property in @('id','name','description','category','risk','requiresRestart','reversible','applied')) {
            if ($tweak.PSObject.Properties.Name -notcontains $property) { throw "Missing $property" }
        }
        if ($tweak.available -and $tweak.applied -isnot [bool]) { throw 'Known applied state must be boolean' }
        if (-not $tweak.available -and ($null -ne $tweak.applied -or -not $tweak.stateError)) { throw 'Unknown state must not claim false' }
        if ($tweak.risk -notin @('low','medium','high')) {throw 'Invalid risk'}
        if ($tweak.bulkSafe -and $tweak.risk -ne 'low') {throw 'Unsafe bulk metadata'}
        if ($tweak.id.StartsWith('keyboard.') -and $tweak.category -ne 'keyboard') { throw 'Keyboard category required' }
        if ($tweak.id -in @('keyboard.filterkeys.off','keyboard.stickykeys.off') -and $tweak.bulkSafe) { throw 'Accessibility tweaks require individual choice' }
    }
}
$safeReport = Invoke-JsonCli '-Action safemode-scan -Lang en' 0
if ($safeReport.monitorScope -ne 'while_app_running' -or @($safeReport.services).Count -ne 22 -or $safeReport.health -notin @('green','yellow','red')) { throw 'Invalid SafeMode report contract' }
foreach ($id in @('keyboard.repeat.fast','keyboard.filterkeys.off','keyboard.stickykeys.off')) {
    $result = Invoke-JsonCli "-Action status -Id $id" 0
    if (-not $result.ok -or $result.id -ne $id -or $result.applied -isnot [bool]) { throw 'Invalid status' }
}
foreach ($case in @(
    @{arguments='-Action apply -Id unknown';error='invalid_tweak_id'},
    @{arguments='-Action invalid';error='invalid_action'},
    @{arguments='-Action list -Lang unknown';error='invalid_language'}
    @{arguments='-Action cache-info -FiveMPath relative';error='local_absolute_fivem_path_required'}
)) {
    $result = Invoke-JsonCli $case.arguments 1
    if ($result.ok -or $result.error -ne $case.error) { throw 'Invalid error contract' }
}
$fixtureParent = [IO.Path]::GetFullPath((Join-Path (Get-Location) 'work'))
$fixture = Join-Path $script:contractProfile 'FiveM.app'
try {
    $null = New-Item -ItemType Directory -Path (Join-Path $fixture 'data\server-cache') -Force
    [IO.File]::WriteAllText((Join-Path $fixture 'CitizenFX.ini'), 'fixture')
    [IO.File]::WriteAllText((Join-Path $fixture 'data\server-cache\file.bin'), '12345')
    $pathArgument = ' -FiveMPath "' + $fixture + '"'
    $preview = Invoke-JsonCli ('-Action cache-info' + $pathArgument) 0
    if ($preview.totalBytes -ne 5) { throw 'Invalid cache preview JSON' }
    $cleaned = Invoke-JsonCli ('-Action cache-clean' + $pathArgument) 0
    if ($cleaned.status -ne 'cleaned' -or $cleaned.freedBytes -ne 0 -or -not $cleaned.backupId) { throw 'Invalid clean JSON' }
    $catalog=Invoke-JsonCli ('-Action backup-list' + $pathArgument) 0
    $shared=@($catalog.backups | Where-Object { $_.kind -eq 'cache' -and $_.status -eq 'cleaned' })[0]
    $backupPreview=Invoke-JsonCli ('-Action backup-preview -BackupId ' + $shared.backupId + $pathArgument) 0
    if (-not $backupPreview.backup.canRestore) { throw 'Invalid common recovery preview' }
    $export=Invoke-JsonCli ('-Action backup-export -BackupId ' + $shared.backupId + $pathArgument) 0
    if ($export.importSupported -or $export.record.payload.id -ne $cleaned.backupId) { throw 'Invalid recovery export' }
    $recovery=Invoke-JsonCli ('-Action backup-restore -BackupId ' + $shared.backupId + $pathArgument) 0
    if ($recovery.results[0].status -ne 'restored') { throw 'Invalid common recovery JSON' }
    $restored = Invoke-JsonCli ('-Action cache-restore -BackupId ' + $cleaned.backupId + $pathArgument) 0
    if ($restored.status -ne 'restored') { throw 'Invalid restore JSON' }
    $cleaned = Invoke-JsonCli ('-Action cache-clean -Lang it' + $pathArgument) 0
    $failure = Invoke-JsonCli ('-Action cache-purge -BackupId ' + $cleaned.backupId + $pathArgument) 1
    if ($failure.error -ne 'explicit_purge_confirmation_required') { throw 'Missing purge confirmation check' }
    $purged = Invoke-JsonCli ('-Action cache-purge -ConfirmPurge -BackupId ' + $cleaned.backupId + $pathArgument) 0
    if ($purged.freedBytes -ne 5 -or $purged.status -ne 'purged') { throw 'Invalid purge JSON' }
    $all=Invoke-JsonCli ('-Action backup-restore-all' + $pathArgument) 0
    if (-not $all.ok -or $all.status -ne 'completed') { throw 'Invalid bulk recovery JSON' }
} finally {
    $absolute = [IO.Path]::GetFullPath($script:contractProfile)
    if (-not $absolute.StartsWith($fixtureParent + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe fixture path' }
    if (Test-Path -LiteralPath $absolute) { Remove-Item -LiteralPath $absolute -Recurse -Force }
}
Write-Output 'PASS: JSON/UTF-8 contract, languages, tweak metadata, keyboard/SafeMode reads, fixture cache operations and unified recovery APIs'

