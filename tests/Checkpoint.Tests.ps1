# Simulated restore point provider; never creates/deletes real Windows checkpoints.
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot '../Tweaker.psm1') -Force
& (Get-Module Tweaker) {
    function Assert($Condition,[string]$Message) {if (-not $Condition) {throw $Message}}
    $script:points=@(); $script:created=0; $script:failCreate=$false; $script:invisible=$false
    function Get-ComputerRestorePoint { [CmdletBinding()]param(); $script:points }
    function Checkpoint-Computer {
        [CmdletBinding()]param($Description,$RestorePointType)
        if ($script:failCreate) {throw 'restore_point_not_created'}
        $script:created++
        if (-not $script:invisible) {$script:points+= [pscustomobject]@{Description=$Description;CreationTime=[DateTime]::UtcNow}}
    }
    New-TweakerRestorePoint
    Assert ($script:created -eq 1) 'Initial checkpoint created and verified'
    New-TweakerRestorePoint
    Assert ($script:created -eq 1) 'Subsequent tweaks reuse recent verified point'
    $script:points=@([pscustomobject]@{Description=('Tweaker-' + 'a'*32);CreationTime=[DateTime]::UtcNow.AddHours(-25)})
    New-TweakerRestorePoint
    Assert ($script:created -eq 2) 'Expired checkpoint not reused'
    foreach ($point in @(
        [pscustomobject]@{Description='Other application';CreationTime=[DateTime]::UtcNow},
        [pscustomobject]@{Description=('Tweaker-' + 'a'*32);CreationTime=[DateTime]::UtcNow.AddDays(1)},
        [pscustomobject]@{Description=('Tweaker-' + 'a'*32);CreationTime='corrupt'}
    )) {
        $script:points=@($point); $script:failCreate=$true; $failed=$false
        try {New-TweakerRestorePoint} catch {$failed=$_.Exception.Message -eq 'restore_point_not_created'}
        Assert $failed 'Do not use foreign, future or malformed checkpoints as fallback'
    }
    $script:points=@(); $script:failCreate=$false; $script:invisible=$true; $failed=$false
    try {New-TweakerRestorePoint} catch {$failed=$_.Exception.Message -eq 'restore_point_not_created'}
    Assert $failed 'Creation must be verified in Windows provider'
    Write-Output 'Checkpoint tests passed'
}
