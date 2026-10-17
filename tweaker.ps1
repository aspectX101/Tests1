#requires -Version 5.1
[CmdletBinding()]
param([string]$Action, [string]$Id, [string]$Lang='de')
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding
try {
    if ($Action -notin @('info','list','status','apply','revert')) { throw 'invalid_action' }
    if ($Lang -notin @('de','en','it')) { throw 'invalid_language' }
    Import-Module (Join-Path $PSScriptRoot 'Tweaker.psm1') -Force -WarningAction Stop
    $catalog = @(Get-TweakerCatalog)
    if ($Action -in @('status','apply','revert') -and $Id -notin @($catalog.id)) { throw 'invalid_tweak_id' }
    function Test-Applied([string]$TweakId, $Live) {
        if ($TweakId.StartsWith('keyboard.')) { return Test-TweakerKeyboardApplied $TweakId }
        if ($TweakId -eq 'windows.power.high') { return $Live.powerScheme -eq '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c' }
        return @($Live.fiveMProcesses).Count -gt 0 -and @($Live.fiveMProcesses | Where-Object { $_.priority -ne 'High' }).Count -eq 0
    }
    $result = switch ($Action) {
        'info' { Get-TweakerSystemInfo }
        'list' {
            $live = Get-TweakerStatus
            $items = @($catalog | ForEach-Object {
                [pscustomobject]@{id=$_.id;name=$_.name[$Lang];description=$_.description[$Lang]
                    category=$(if ($_.scope -eq 'system') {'performance'} else {'gaming'})
                    risk='medium';requiresRestart=$false;reversible=$true;requiresAdmin=$_.requiresAdmin
                    applied=(Test-Applied $_.id $live)}
            })
            @{ok=$true;tweaks=$items}
        }
        'status' {
            $live = if ($Id.StartsWith('keyboard.')) { $null } else { Get-TweakerStatus }
            @{ok=$true;id=$Id;applied=(Test-Applied $Id $live)}
        }
        default {
            $operation = if ($Action -eq 'revert') {'restore'} else {'apply'}
            $change = Invoke-TweakerPerformance -Action $operation -Id $Id -Confirm:$false
            $messages = @{
                applied=@{de='Aenderung angewendet.';en='Change applied.';it='Modifica applicata.'}
                restored=@{de='Originalzustand wiederhergestellt.';en='Original state restored.';it='Stato originale ripristinato.'}
                unchanged=@{de='Einstellung bereits aktiv.';en='Setting already active.';it='Impostazione gia attiva.'}
                no_change=@{de='Kein geeigneter laufender FiveM-Spielprozess gefunden.';en='No eligible running FiveM game process found.';it='Nessun processo di gioco FiveM idoneo attivo.'}
            }
            $live = if ($Id.StartsWith('keyboard.')) { $null } else { Get-TweakerStatus }
            @{ok=$true;id=$Id;applied=(Test-Applied $Id $live);restartRequired=$false
                message=$messages[$change.status][$Lang];status=$change.status}
        }
    }
    $result | ConvertTo-Json -Depth 12 -Compress
    exit 0
} catch {
    # Stable error code for localization, technical detail for diagnostics.
    @{ok=$false;error=$_.Exception.Message} | ConvertTo-Json -Depth 4 -Compress
    exit 1
}
