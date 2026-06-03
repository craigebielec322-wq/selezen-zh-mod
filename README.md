# SeleZen ZH Mod

SeleZen ZH Mod is a Windows mod installer for SeleZen Games Launcher. It patches the installed Electron `app.asar` package to add Simplified Chinese UI text and Chinese translation support for the embedded SeleZen website.

The installer is designed to live outside the official launcher directory, so official updates can overwrite the launcher while the mod manager remains available to reapply the patch.

## Features

- Adds `zh-CN` to the launcher language switcher.
- Adds DeepSeek-powered Chinese translation for embedded website detail pages.
- Keeps detail-page AI translation prioritized for speed.
- Adds local dictionary translation for fixed website modules, buttons, download controls, sidebars, genres, and system requirement labels.
- Supports an external custom dictionary at `%LOCALAPPDATA%\SeleZen-ZH-Mod\custom-dictionary.json`.
- Backs up encrypted translation settings and restores them after official launcher updates.
- Creates update detection and patch failure logs under `%LOCALAPPDATA%\SeleZen-ZH-Mod\logs`.
- Keeps official `torrent-worker-bootstrap.js` unpacked behavior.

## What It Does Not Do

- It does not modify the remote `selezen.games` website.
- It does not include or hard-code any DeepSeek API key.
- It does not upload game files, torrents, launcher packages, backups, caches, or user settings.
- It does not sign the generated EXE, so Windows SmartScreen may warn on first launch.

## Paths

Default launcher path:

```text
%LOCALAPPDATA%\Programs\Selezen-Games-launcher
```

Mod data path:

```text
%LOCALAPPDATA%\SeleZen-ZH-Mod
```

Important files:

```text
%LOCALAPPDATA%\SeleZen-ZH-Mod\SeleZenZHMod.exe
%LOCALAPPDATA%\SeleZen-ZH-Mod\settings-backup.json
%LOCALAPPDATA%\SeleZen-ZH-Mod\custom-dictionary.json
%LOCALAPPDATA%\SeleZen-ZH-Mod\logs\mod.log
```

## Usage

Default behavior:

```powershell
SeleZenZHMod.exe
```

This checks the installed launcher, reapplies the patch if needed, starts the launcher, and backs up encrypted translation settings after the launcher exits.

Install only:

```powershell
SeleZenZHMod.exe --install-only
```

Status:

```powershell
SeleZenZHMod.exe --status
```

Restore latest official backup:

```powershell
SeleZenZHMod.exe --restore
```

Use a custom launcher root:

```powershell
SeleZenZHMod.exe --launcher-root "C:\Path\To\Selezen-Games-launcher"
```

## Custom Dictionary

Create this file:

```text
%LOCALAPPDATA%\SeleZen-ZH-Mod\custom-dictionary.json
```

Example:

```json
{
  "Трейлер": "预告片",
  "Показать старые версии": "显示旧版本"
}
```

The custom dictionary is for fixed short text: navigation, buttons, sidebars, download controls, genre names, and labels. Long game descriptions should still use AI translation.

## Build

The current tested project targets `netcoreapp3.0` and publishes a self-contained Windows x64 single-file executable.

```powershell
dotnet publish . -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:PublishTrimmed=false -o publish
```

Output:

```text
publish\SeleZenZHMod.exe
```

## Safety Notes

- The mod manager backs up `resources\app.asar` before patching a clean official package.
- If patching fails, it restores the original bytes it was modifying.
- `settings-backup.json` stores only Electron-encrypted `siteTranslation` settings; it does not store a plaintext API key.
- Official launcher updates may change package structure. If patch anchors fail, check `%LOCALAPPDATA%\SeleZen-ZH-Mod\logs\patch-failure-*.log`.

## Repository Hygiene

The repository intentionally ignores build outputs, EXE files, `app.asar`, backups, logs, caches, and user dictionaries. Only source files and patch templates should be committed.
