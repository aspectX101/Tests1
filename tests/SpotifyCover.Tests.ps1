# Windows PowerShell 5.1: reads a WinRT stream reference (like the Spotify thumbnail) with the real
# Read-Cover function from app/spotify-session.ps1. Run: powershell -NoProfile -File tests/SpotifyCover.Tests.ps1
$ErrorActionPreference='Stop'
$script=Join-Path $PSScriptRoot '..\app\spotify-session.ps1'
$tokens=$null;$errors=$null
$ast=[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $script).Path,[ref]$tokens,[ref]$errors)
if ($errors.Count) { throw 'spotify-session.ps1 has syntax errors' }
# Setup statements (Add-Type, type variables, $asTask) and the helper functions, without the session loop.
$wanted=@('streamType','readerType','asTask')
$setup=$ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.AssignmentStatementAst] -and $n.Left.VariablePath -and $wanted -contains $n.Left.VariablePath.UserPath },$true)
$functions=$ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and ($n.Name -like 'Read-Cover*' -or $n.Name -eq 'Await') },$true)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
foreach ($node in @($setup)+@($functions)) { . ([scriptblock]::Create($node.Extent.Text)) }
if (-not (Get-Command Read-Cover -ErrorAction SilentlyContinue)) { throw 'Read-Cover not found' }

$png=[Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==')
$jpegHead=[byte[]](0xFF,0xD8,0xFF,0xE0)+[byte[]](1..3000 | ForEach-Object { $_ % 251 })
$failed=0
function Check($name,[scriptblock]$make,[string]$prefix,[string[]]$ways=@('stream','reader'),[switch]$Info) {
    try {
        $reference=& $make
        $sw=[Diagnostics.Stopwatch]::StartNew()
        $uri=Read-Cover ([pscustomobject]@{Thumbnail=$reference}) $ways
        if (-not $uri.StartsWith($prefix)) { throw ('unexpected ' + $uri.Substring(0,[Math]::Min(40,$uri.Length))) }
        Write-Host ('PASS {0} ({1} ms, {2} chars)' -f $name,$sw.ElapsedMilliseconds,$uri.Length)
    } catch { if ($Info) { Write-Host ('INFO {0} failed: {1}' -f $name,$_.Exception.Message) } else { $script:failed++; Write-Host ('FAIL {0}: {1}' -f $name,$_.Exception.Message) } }
}
function MemoryReference([byte[]]$bytes) {
    $memory=New-Object ([Windows.Storage.Streams.InMemoryRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime])
    $writer=New-Object ([Windows.Storage.Streams.DataWriter,Windows.Storage.Streams,ContentType=WindowsRuntime]) -ArgumentList ([Windows.Storage.Streams.IOutputStream]$memory.GetOutputStreamAt(0))
    $writer.WriteBytes($bytes)
    $null=Await ($writer.StoreAsync()) ([uint32])
    $null=$writer.DetachStream()
    return [Windows.Storage.Streams.RandomAccessStreamReference,Windows.Storage.Streams,ContentType=WindowsRuntime]::CreateFromStream($memory)
}
$file=Join-Path $env:TEMP ('undcc-cover-' + [guid]::NewGuid() + '.png')
[IO.File]::WriteAllBytes($file,$png)
$fileType=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
Check 'file png' { [Windows.Storage.Streams.RandomAccessStreamReference,Windows.Storage.Streams,ContentType=WindowsRuntime]::CreateFromFile((Await ($fileType::GetFileFromPathAsync($file)) $fileType)) } 'data:image/png;base64,iVBOR'
Check 'memory png' { MemoryReference $png } 'data:image/png;base64,iVBOR'
Check 'memory png via stream only' { MemoryReference $png } 'data:image/png;base64,iVBOR' @('stream') -Info
Check 'memory png via reader only' { MemoryReference $png } 'data:image/png;base64,iVBOR' @('reader') -Info
Check 'file png via reader only' { [Windows.Storage.Streams.RandomAccessStreamReference,Windows.Storage.Streams,ContentType=WindowsRuntime]::CreateFromFile((Await ($fileType::GetFileFromPathAsync($file)) $fileType)) } 'data:image/png;base64,iVBOR' @('reader') -Info
Check 'memory jpeg' { MemoryReference $jpegHead } 'data:image/jpeg;base64,/9j/'
try { $null=Read-Cover ([pscustomobject]@{Thumbnail=$null}); $failed++; Write-Host 'FAIL null thumbnail accepted' } catch { Write-Host ('PASS null thumbnail -> {0}' -f $_.Exception.Message) }
Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue
Write-Host ('Apartment: ' + [Threading.Thread]::CurrentThread.GetApartmentState() + ', PS ' + $PSVersionTable.PSVersion)
if ($failed) { throw "$failed cover test(s) failed" }
