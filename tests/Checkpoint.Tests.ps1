# Simulated restore point provider; never creates/deletes real Windows checkpoints.
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot '../Tweaker.psm1') -Force
& (Get-Module Tweaker) {
    function Assert($Condition,[string]$Message) {if (-not $Condition) {throw $Message}}
    $script:points=@(); $script:created=0; $script:failCreate=$false; $script:invisible=$false; $script:frequency=$false
    function Get-ComputerRestorePoint { [CmdletBinding()]param(); $script:points }
    function Checkpoint-Computer {
        [CmdletBinding()]param($Description,$RestorePointType)
        if ($script:failCreate) {throw 'restore_point_not_created'}
        # Windows' own limit: a warning, no new point (text as on an English Windows)
        if ($script:frequency) {Write-Warning "A new system restore point cannot be created because one has already been created within the past 1440 minutes. The frequency of restore point creation can be changed by creating the DWORD value 'SystemRestorePointCreationFrequency' under the registry key 'HKLM\Software\Microsoft\Windows NT\CurrentVersion\SystemRestore'."; return}
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
    # Windows' 24 h limit with a recent restore point of another program: that point already covers the change
    $script:failCreate=$false; $script:frequency=$true
    $script:points=@([pscustomobject]@{Description='Windows Update';CreationTime=[DateTime]::UtcNow.AddHours(-3)})
    $out=@(New-TweakerRestorePoint 3>&1)
    Assert ($out.Count -eq 0) 'The frequency warning is collected, not written to the output'
    # ...but never without any recent point, nor with a future or malformed one
    foreach ($point in @('none', [pscustomobject]@{Description='Windows Update';CreationTime=[DateTime]::UtcNow.AddHours(-30)},
        [pscustomobject]@{Description='Windows Update';CreationTime=[DateTime]::UtcNow.AddDays(1)}, [pscustomobject]@{Description='Windows Update';CreationTime='corrupt'})) {
        $script:points=if ($point -eq 'none') {@()} else {@($point)}; $failed=$false
        try {New-TweakerRestorePoint} catch {$failed=$_.Exception.Message -eq 'restore_point_not_created' -and $_.Exception.Data['detail'] -match '1440'}
        Assert $failed 'Without a recent valid restore point the limit still blocks, with the Windows reason as detail'
    }
    $script:frequency=$false
    $script:points=@(); $script:failCreate=$false; $script:invisible=$true; $failed=$false
    try {New-TweakerRestorePoint} catch {$failed=$_.Exception.Message -eq 'restore_point_not_created'}
    Assert $failed 'Creation must be verified in Windows provider'
    Write-Output 'Checkpoint tests passed'
}
