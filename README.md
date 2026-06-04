# SeleZen 中文增强 Mod

这是一个给 **SeleZen Games Launcher** 使用的 Windows Mod 安装器。它会补丁当前已安装客户端里的 Electron `resources/app.asar`，让启动器支持简体中文，并给内嵌的 SeleZen 网站增加中文翻译能力。

这个 Mod 安装器不需要放在官方客户端目录里。官方客户端更新后，如果 `app.asar` 被覆盖，只要再次运行 `SeleZenZHMod.exe`，它会检测当前补丁状态并自动重新安装中文增强补丁。

## 直接下载

普通用户不需要下载源码，直接到 [Releases 页面](https://github.com/craigebielec322-wq/selezen-zh-mod/releases/latest) 下载 `SeleZenZHMod-v0.1.0.exe`，双击打开图形安装器即可。

## 主要功能

- 给启动器语言切换增加 `zh-CN` 简体中文。
- 增加客户端内嵌网站的中文翻译。
- 详情页简介使用 DeepSeek AI 翻译，并优先处理，尽量保证速度。
- 导航、按钮、下载区、侧边栏、类型、系统需求等固定短文本使用本地词典翻译。
- 支持外部自定义词典：`%LOCALAPPDATA%\SeleZen-ZH-Mod\custom-dictionary.json`。
- 自动备份加密后的翻译设置，官方更新后可恢复。
- 记录官方更新检测日志和补丁失败日志，方便后续维护。
- 保留官方 `torrent-worker-bootstrap.js` 的 unpacked 规则。

## 不包含什么

- 不修改远程网站 `selezen.games`。
- 不内置、不硬编码任何 DeepSeek API Key。
- 不上传游戏文件、种子文件、启动器安装包、缓存、备份或用户设置。
- 不签名 EXE，首次运行可能触发 Windows SmartScreen 提醒。

## 默认路径

官方启动器默认安装目录：

```text
%LOCALAPPDATA%\Programs\Selezen-Games-launcher
```

Mod 数据目录：

```text
%LOCALAPPDATA%\SeleZen-ZH-Mod
```

常用文件：

```text
%LOCALAPPDATA%\SeleZen-ZH-Mod\SeleZenZHMod.exe
%LOCALAPPDATA%\SeleZen-ZH-Mod\settings-backup.json
%LOCALAPPDATA%\SeleZen-ZH-Mod\custom-dictionary.json
%LOCALAPPDATA%\SeleZen-ZH-Mod\logs\mod.log
```

## 使用方法

直接双击运行：

```powershell
SeleZenZHMod.exe
```

默认行为：

- 打开图形操作面板，不会立刻打补丁或启动客户端。
- 自动检测默认 SeleZen 客户端目录。
- 可以手动浏览选择客户端位置。
- 可以选择是否安装/更新中文增强补丁。
- 可以选择完成后是否启动客户端。
- 可以检查状态、恢复官方包、保存安装器副本、打开 Mod 数据目录。

高级用户仍可使用命令行参数。

只安装补丁，不启动客户端：

```powershell
SeleZenZHMod.exe --install-only
```

查看状态：

```powershell
SeleZenZHMod.exe --status
```

恢复最近一次官方 `app.asar` 备份：

```powershell
SeleZenZHMod.exe --restore
```

指定启动器安装目录：

```powershell
SeleZenZHMod.exe --launcher-root "C:\Path\To\Selezen-Games-launcher"
```

## DeepSeek 翻译

网站详情页的长简介会通过 DeepSeek API 翻译。API Key 不会写死在程序里，需要在启动器设置页中手动保存。

安全策略：

- API Key 只保存在 Electron 主进程侧设置中。
- 优先使用 Electron `safeStorage` 加密。
- Mod 管理器只备份加密后的配置，不接触明文 Key。

## 自定义词典

如果你发现网站上某些固定短词没有翻译，可以编辑：

```text
%LOCALAPPDATA%\SeleZen-ZH-Mod\custom-dictionary.json
```

示例：

```json
{
  "Трейлер": "预告片",
  "Показать старые версии": "显示旧版本",
  "Скрыть старые версии": "隐藏旧版本",
  "Magnet link": "磁力链接"
}
```

自定义词典适合补：

- 导航栏
- 按钮
- 下载区小字
- 侧边栏标题
- 类型名
- 详情页固定字段
- 简短提示文本

不建议用它翻译很长的游戏简介。长文本仍然交给 DeepSeek AI 翻译更合适。

保存词典后，重新启动客户端，或在设置页点击“翻译当前网站”，即可重新读取词典。

## 构建

当前项目使用 `netcoreapp3.0`，发布为 Windows x64 self-contained 单文件 EXE。

```powershell
dotnet publish . -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:PublishTrimmed=false -o publish
```

输出文件：

```text
publish\SeleZenZHMod.exe
```

## 更新与恢复

官方客户端更新后，通常会覆盖 `resources/app.asar`，导致中文增强补丁失效。

解决方式：

```powershell
SeleZenZHMod.exe
```

或：

```powershell
SeleZenZHMod.exe --install-only
```

如果补丁失败，查看日志：

```text
%LOCALAPPDATA%\SeleZen-ZH-Mod\logs\patch-failure-*.log
```

如果检测到官方更新或补丁缺失，会生成：

```text
%LOCALAPPDATA%\SeleZen-ZH-Mod\logs\update-detected-*.log
```

## 仓库维护规则

本仓库只提交源码和补丁模板。

不要提交：

- `bin/`
- `obj/`
- `publish/`
- `SeleZenZHMod.exe`
- `app.asar`
- `settings-backup.json`
- `site-translation-cache.json`
- `custom-dictionary.json`
- `backups/`
- `logs/`

这些文件要么是构建产物，要么可能包含个人环境信息。

## 免责声明

这个项目是非官方 Mod 工具，只用于本地客户端中文增强。官方客户端结构变化时，补丁可能需要重新适配。
