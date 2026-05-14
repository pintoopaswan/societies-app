Windows Android emulator setup for this project

Quick summary
- Recommended: install Android Studio (simplest). Alternatively use SDK command-line tools and the PowerShell script in `scripts/setup_android_emulator.ps1`.

1) Prerequisites
- Install Java JDK 11+ if not already installed.
- Install Android Studio (recommended) OR install Android SDK command-line tools.
- Ensure these commands are available in PATH: `sdkmanager`, `avdmanager`, `emulator`, `adb`.

2) Using Android Studio (GUI, easiest)
- Open Android Studio -> Configure -> SDK Manager.
- In "SDK Platforms" install a recent Android SDK (e.g., Android 12 / API 31).
- In "SDK Tools" enable and install: "Android SDK Command-line Tools", "Android Emulator", "Android SDK Platform-Tools".
- Open AVD Manager -> Create Virtual Device -> choose Pixel 4 or similar -> choose a x86_64 system image (Google APIs) -> Finish.
- Start the emulator from AVD Manager.

3) Using the included PowerShell script (command-line)
- Open PowerShell as Administrator.
- Add the Android SDK `tools/bin` and `platform-tools` to PATH if needed. Example (adjust your SDK root):

```powershell
$env:ANDROID_SDK_ROOT = "C:\Users\<you>\AppData\Local\Android\Sdk"
$env:Path += ";$env:ANDROID_SDK_ROOT\tools\bin;$env:ANDROID_SDK_ROOT\emulator;$env:ANDROID_SDK_ROOT\platform-tools"
```

- Run the script to create and start an emulator (example):

```powershell
cd e:\Coding\societies-app
.\scripts\setup_android_emulator.ps1 -AvdName "societies_emulator" -ApiLevel 31 -Force
```

- The script will use `sdkmanager` to ensure `platform-tools`, `emulator` and the requested system image are installed, create the AVD, and start it.

4) Confirm emulator is running
- Run:

```powershell
adb devices
```

- You should see a device listed (emulator-5554).

5) Running the app from this repo
- This project includes an Expo-managed React Native app in `mobile-app/`.
- Start Metro/Expo from the `mobile-app` folder:

```powershell
cd mobile-app
npx expo start
```

- With the emulator running and `adb` on PATH, pressing `a` in the Expo terminal will open the app on the Android emulator. Alternatively use `npx expo run:android` for a dev build (requires Android SDK build tools and gradle).

6) Troubleshooting
- If `sdkmanager`/`avdmanager` are not found, install Android Studio or the command-line tools and update PATH.
- Ensure virtualization (Intel HAXM or WHPX) is enabled in BIOS and in the emulator settings for acceptable performance.
- If emulator is slow, use an x86_64 system image and enable WHPX (Windows) or HAXM if supported.

If you want, I can:
- Help choose a specific API level and AVD configuration for this app.
- Walk through installing Android Studio interactively or generate a PowerShell script to set common PATH variables for your machine.
