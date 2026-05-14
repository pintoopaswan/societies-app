<#
Automates creation and starting of an Android emulator on Windows.

Usage (run in an elevated PowerShell if you need to add PATHs):
  ./scripts/setup_android_emulator.ps1 -AvdName "societies_emulator" -ApiLevel 31 -Force

Notes:
- This script requires the Android SDK command-line tools to be installed and available in PATH:
  - sdkmanager, avdmanager, emulator, adb.
- If you use Android Studio, install "Android SDK Command-line Tools" and a system image.
- The script will attempt to install required SDK packages via sdkmanager if available.
#>

param(
    [string]$AvdName = "societies_emulator",
    [int]$ApiLevel = 31,
    [string]$SystemImage = "system-images;android-$ApiLevel;google_apis;x86_64",
    [switch]$Force
)

function Check-Command($cmd) {
    $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue)
}

if (-not (Check-Command sdkmanager)) {
    Write-Host "sdkmanager not found in PATH. Please install Android SDK command-line tools or Android Studio first." -ForegroundColor Yellow
    exit 1
}

if (-not (Check-Command avdmanager)) {
    Write-Host "avdmanager not found in PATH. Ensure SDK command-line tools are installed and PATH updated." -ForegroundColor Yellow
    exit 1
}

if (-not (Check-Command emulator)) {
    Write-Host "emulator not found in PATH. Ensure Android SDK emulator is installed." -ForegroundColor Yellow
    exit 1
}

if (-not (Check-Command adb)) {
    Write-Host "adb not found in PATH. Ensure platform-tools are installed." -ForegroundColor Yellow
    exit 1
}

Write-Host "Using SDK tools from: $(Get-Command sdkmanager).Path"

Write-Host "Ensuring required packages are installed: platform-tools, emulator, $SystemImage"
& sdkmanager "platform-tools" "emulator" "$SystemImage" --verbose

Write-Host "Checking for existing AVD named $AvdName"
$existing = & avdmanager list avd | Select-String -Pattern "Name: *$AvdName" -Quiet
if ($existing -and -not $Force) {
    Write-Host "AVD '$AvdName' already exists. Use -Force to recreate." -ForegroundColor Yellow
} else {
    if ($existing -and $Force) {
        Write-Host "Deleting existing AVD '$AvdName'"
        & avdmanager delete avd -n $AvdName
    }

    Write-Host "Creating AVD '$AvdName' with image $SystemImage"
    echo no | avdmanager create avd -n $AvdName -k "$SystemImage" -d "pixel"
}

Write-Host "Starting emulator '$AvdName' (this will run in a new window)..."
Start-Process -FilePath emulator -ArgumentList "-avd", $AvdName -NoNewWindow

Write-Host "Waiting for device to become available via adb..."
& adb wait-for-device

Write-Host "Emulator should be running. Use 'adb devices' to confirm."
