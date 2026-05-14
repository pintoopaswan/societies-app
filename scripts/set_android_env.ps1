<#
Sets `ANDROID_SDK_ROOT` and adds SDK `tools/bin`, `emulator`, and `platform-tools` to PATH.

Usage examples:
  # Set for current session only
  .\scripts\set_android_env.ps1 -SdkRoot "C:\Users\you\AppData\Local\Android\Sdk"

  # Persist for current user (uses setx) - requires reopening terminals to take effect
  .\scripts\set_android_env.ps1 -SdkRoot "C:\Users\you\AppData\Local\Android\Sdk" -Persist

If no -SdkRoot provided the script will try common locations and the current ANDROID_SDK_ROOT.
#>

param(
    [string]$SdkRoot = $env:ANDROID_SDK_ROOT,
    [switch]$Persist
)

function Resolve-SdkRoot {
    param($candidate)
    if ($null -ne $candidate -and (Test-Path $candidate)) { return $candidate }

    $candidates = @(
        "$env:LOCALAPPDATA\Android\Sdk",
        "$env:USERPROFILE\AppData\Local\Android\Sdk",
        "C:\Android\Sdk"
    )
    foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
    return $null
}

if (-not $SdkRoot) { $SdkRoot = Resolve-SdkRoot }

if (-not $SdkRoot) {
    Write-Host "Android SDK root not found. Pass -SdkRoot with the SDK path." -ForegroundColor Red
    exit 1
}

$toolsBin = Join-Path $SdkRoot "tools\bin"
$emulator = Join-Path $SdkRoot "emulator"
$platformTools = Join-Path $SdkRoot "platform-tools"

if (-not (Test-Path $toolsBin)) { Write-Host "Warning: $toolsBin not found." -ForegroundColor Yellow }
if (-not (Test-Path $emulator)) { Write-Host "Warning: $emulator not found." -ForegroundColor Yellow }
if (-not (Test-Path $platformTools)) { Write-Host "Warning: $platformTools not found." -ForegroundColor Yellow }

# Update current session
$env:ANDROID_SDK_ROOT = $SdkRoot
$paths = @()
if (Test-Path $toolsBin) { $paths += $toolsBin }
if (Test-Path $emulator) { $paths += $emulator }
if (Test-Path $platformTools) { $paths += $platformTools }

# Prepend to PATH for current session if not present
foreach ($p in $paths) {
    if ($env:Path -notlike "*${p}*") { $env:Path = "$p;$env:Path" }
}

Write-Host "Set ANDROID_SDK_ROOT=$SdkRoot for current session. PATH updated for current session."

if ($Persist) {
    # Persist for current user using setx (note: setx truncates PATH if too long; be careful)
    Write-Host "Persisting environment variables for current user (using setx). You may need to reopen terminals."
    & setx ANDROID_SDK_ROOT "$SdkRoot" | Out-Null

    # Append entries to user PATH via PowerShell registry method to avoid truncation risks
    $userPathKey = 'HKCU:\Environment'
    $currentUserPath = (Get-ItemProperty -Path $userPathKey -Name Path -ErrorAction SilentlyContinue).Path
    if (-not $currentUserPath) { $currentUserPath = "" }

    $toAdd = $paths -join ";"
    if ($currentUserPath -notlike "*${toAdd}*") {
        $newUserPath = if ($currentUserPath -eq "") { $toAdd } else { "$toAdd;$currentUserPath" }
        Set-ItemProperty -Path $userPathKey -Name Path -Value $newUserPath
        Write-Host "Persisted PATH entries to user environment. Reopen terminals to pick up changes."
    } else {
        Write-Host "User PATH already contains those entries. No change made."
    }
}
