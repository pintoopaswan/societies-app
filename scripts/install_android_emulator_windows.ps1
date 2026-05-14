<#
Installs and configures a Windows Android emulator for the Society mobile app.

What it does:
  - Installs Node.js LTS and JDK 17 with winget if they are missing.
  - Downloads Android SDK command-line tools from Google.
  - Installs platform-tools, emulator, Android 34 platform/build tools, and an AVD image.
  - Accepts Android SDK licenses.
  - Creates an AVD named societies_emulator.
  - Optionally starts the emulator.

Usage:
  .\scripts\install_android_emulator_windows.ps1
  .\scripts\install_android_emulator_windows.ps1 -NoStart
#>

param(
    [string]$SdkRoot = "$env:LOCALAPPDATA\Android\Sdk",
    [string]$AvdName = "societies_emulator",
    [int]$ApiLevel = 34,
    [switch]$NoStart
)

$ErrorActionPreference = "Stop"

function Ensure-Command {
    param(
        [string]$Command,
        [string]$WingetId,
        [string]$DisplayName
    )

    if (Get-Command $Command -ErrorAction SilentlyContinue) {
        Write-Host "$DisplayName is already available."
        return
    }

    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "winget is required to install $DisplayName, but winget was not found."
    }

    Write-Host "Installing $DisplayName with winget..."
    & winget install --id $WingetId -e --accept-package-agreements --accept-source-agreements
}

function Add-ToPath {
    param([string]$PathToAdd)

    if ((Test-Path $PathToAdd) -and ($env:Path -notlike "*$PathToAdd*")) {
        $env:Path = "$PathToAdd;$env:Path"
    }
}

$nodePath = "C:\Program Files\nodejs"
Add-ToPath $nodePath

$jdkRoots = @(
    "C:\Program Files\Eclipse Adoptium",
    "C:\Program Files\Java"
)
$javaHome = $null
foreach ($root in $jdkRoots) {
    if (Test-Path $root) {
        $candidate = Get-ChildItem $root -Directory -ErrorAction SilentlyContinue |
            Where-Object { Test-Path (Join-Path $_.FullName "bin\java.exe") } |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1
        if ($candidate) {
            $javaHome = $candidate.FullName
            break
        }
    }
}
if ($javaHome) {
    $env:JAVA_HOME = $javaHome
    Add-ToPath (Join-Path $javaHome "bin")
}

function Download-FileWithRetry {
    param(
        [string]$Uri,
        [string]$OutFile
    )

    for ($attempt = 1; $attempt -le 3; $attempt++) {
        try {
            Write-Host "Download attempt $attempt of 3..."
            Invoke-WebRequest -Uri $Uri -OutFile $OutFile -UseBasicParsing
            return
        } catch {
            Write-Host "Invoke-WebRequest failed: $($_.Exception.Message)" -ForegroundColor Yellow
            if ($attempt -eq 3) {
                break
            }
            Start-Sleep -Seconds (5 * $attempt)
        }
    }

    if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
        Write-Host "Retrying download with curl..."
        & curl.exe -L --retry 5 --retry-delay 5 --fail -o $OutFile $Uri
        if ($LASTEXITCODE -eq 0) {
            return
        }
    }

    throw "Could not download $Uri"
}

function Assert-LastCommand {
    param([string]$Action)

    if ($LASTEXITCODE -ne 0) {
        throw "$Action failed with exit code $LASTEXITCODE"
    }
}

Ensure-Command -Command "node" -WingetId "OpenJS.NodeJS.LTS" -DisplayName "Node.js LTS"
Ensure-Command -Command "java" -WingetId "EclipseAdoptium.Temurin.17.JDK" -DisplayName "JDK 17"

$cmdlineToolsUrl = "https://dl.google.com/android/repository/commandlinetools-win-14742923_latest.zip"
$downloadDir = Join-Path $env:TEMP "societies-android-sdk"
$zipPath = Join-Path $downloadDir "commandlinetools-win-latest.zip"
$cmdlineToolsLatest = Join-Path $SdkRoot "cmdline-tools\latest"

New-Item -ItemType Directory -Force -Path $downloadDir | Out-Null
New-Item -ItemType Directory -Force -Path $SdkRoot | Out-Null

if (-not (Test-Path (Join-Path $cmdlineToolsLatest "bin\sdkmanager.bat"))) {
    Write-Host "Downloading Android SDK command-line tools..."
    Download-FileWithRetry -Uri $cmdlineToolsUrl -OutFile $zipPath

    $extractRoot = Join-Path $downloadDir "cmdline-tools-extract"
    if (Test-Path $extractRoot) {
        Remove-Item -LiteralPath $extractRoot -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $extractRoot | Out-Null
    Expand-Archive -LiteralPath $zipPath -DestinationPath $extractRoot -Force

    New-Item -ItemType Directory -Force -Path (Split-Path $cmdlineToolsLatest) | Out-Null
    if (Test-Path $cmdlineToolsLatest) {
        Remove-Item -LiteralPath $cmdlineToolsLatest -Recurse -Force
    }
    Move-Item -LiteralPath (Join-Path $extractRoot "cmdline-tools") -Destination $cmdlineToolsLatest
}

$env:ANDROID_SDK_ROOT = $SdkRoot
$env:ANDROID_HOME = $SdkRoot
Add-ToPath (Join-Path $SdkRoot "cmdline-tools\latest\bin")
Add-ToPath (Join-Path $SdkRoot "platform-tools")
Add-ToPath (Join-Path $SdkRoot "emulator")

$sdkManager = Join-Path $cmdlineToolsLatest "bin\sdkmanager.bat"
$avdManager = Join-Path $cmdlineToolsLatest "bin\avdmanager.bat"
$emulatorExe = Join-Path $SdkRoot "emulator\emulator.exe"
$adbExe = Join-Path $SdkRoot "platform-tools\adb.exe"
$systemImage = "system-images;android-$ApiLevel;google_apis;x86_64"

Write-Host "Installing Android SDK packages..."
1..100 | ForEach-Object { "y" } | & $sdkManager --sdk_root=$SdkRoot "platform-tools" "emulator" "platforms;android-34" "build-tools;34.0.0" $systemImage
Assert-LastCommand "Android SDK package installation"

Write-Host "Accepting Android SDK licenses..."
1..100 | ForEach-Object { "y" } | & $sdkManager --sdk_root=$SdkRoot --licenses
Assert-LastCommand "Android SDK license acceptance"

$existingAvds = & $avdManager list avd
if ($existingAvds -match "Name:\s+$([regex]::Escape($AvdName))") {
    Write-Host "AVD '$AvdName' already exists."
} else {
    Write-Host "Creating AVD '$AvdName'..."
    "no" | & $avdManager create avd -n $AvdName -k $systemImage -d "pixel_6"
    Assert-LastCommand "AVD creation"
}

$userPathKey = "HKCU:\Environment"
$pathsToPersist = @(
    (Join-Path $SdkRoot "cmdline-tools\latest\bin"),
    (Join-Path $SdkRoot "platform-tools"),
    (Join-Path $SdkRoot "emulator"),
    $nodePath
) | Where-Object { Test-Path $_ }

$currentUserPath = (Get-ItemProperty -Path $userPathKey -Name Path -ErrorAction SilentlyContinue).Path
if (-not $currentUserPath) {
    $currentUserPath = ""
}

$newUserPath = $currentUserPath
foreach ($pathEntry in $pathsToPersist) {
    if ($newUserPath -notlike "*$pathEntry*") {
        $newUserPath = if ($newUserPath) { "$pathEntry;$newUserPath" } else { $pathEntry }
    }
}
Set-ItemProperty -Path $userPathKey -Name Path -Value $newUserPath
& setx ANDROID_SDK_ROOT "$SdkRoot" | Out-Null
& setx ANDROID_HOME "$SdkRoot" | Out-Null
if ($javaHome) {
    & setx JAVA_HOME "$javaHome" | Out-Null
}

Write-Host "Installing mobile app npm dependencies..."
$npmCmd = if (Test-Path (Join-Path $nodePath "npm.cmd")) { Join-Path $nodePath "npm.cmd" } else { "npm" }
Push-Location (Join-Path (Split-Path $PSScriptRoot -Parent) "mobile-app")
try {
    & $npmCmd install
    Assert-LastCommand "npm install"
} finally {
    Pop-Location
}

if (-not $NoStart) {
    Write-Host "Starting emulator '$AvdName'..."
    Start-Process -WindowStyle Hidden -FilePath $emulatorExe -ArgumentList @("-avd", $AvdName)
    & $adbExe wait-for-device
    & $adbExe devices
    Assert-LastCommand "adb devices"
}

Write-Host ""
Write-Host "Android emulator setup complete."
Write-Host "SDK root: $SdkRoot"
Write-Host "AVD name: $AvdName"
Write-Host "To start later: emulator -avd $AvdName"
Write-Host "To run the app: cd mobile-app; npm run android"
