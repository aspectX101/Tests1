# Read-only smoke tests against real Windows APIs. No valid apply/revert is invoked.
$ErrorActionPreference = 'Stop'
$entry = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../tweaker.ps1'))
if ($entry.Contains('"')) { throw 'Invalid test path' }
$hostExecutable = (Get-Process -Id $PID).Path
function Invoke-JsonCli([string]$Arguments, [int]$ExpectedExit) {
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $hostExecutable
    $start.Arguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + $entry + '" ' + $Arguments
    $start.UseShellExecute = $false
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
    if (-not $result.ok -or @($result.tweaks).Count -ne 5) { throw 'Invalid catalog' }
    foreach ($tweak in $result.tweaks) {
        foreach ($property in @('id','name','description','category','risk','requiresRestart','reversible','applied')) {
            if ($tweak.PSObject.Properties.Name -notcontains $property) { throw "Missing $property" }
        }
        if ($tweak.applied -isnot [bool]) { throw 'applied must be boolean' }
    }
}
foreach ($id in @('keyboard.repeat.fast','keyboard.filterkeys.off','keyboard.stickykeys.off')) {
    $result = Invoke-JsonCli "-Action status -Id $id" 0
    if (-not $result.ok -or $result.id -ne $id -or $result.applied -isnot [bool]) { throw 'Invalid status' }
}
foreach ($case in @(
    @{arguments='-Action apply -Id unknown';error='invalid_tweak_id'},
    @{arguments='-Action invalid';error='invalid_action'},
    @{arguments='-Action list -Lang unknown';error='invalid_language'}
)) {
    $result = Invoke-JsonCli $case.arguments 1
    if ($result.ok -or $result.error -ne $case.error) { throw 'Invalid error contract' }
}
Write-Output 'PASS: JSON/UTF-8 contract, three languages, five catalog entries, live keyboard status and invalid-input errors'
