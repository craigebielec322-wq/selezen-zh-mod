using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Drawing;
using System.Windows.Forms;

namespace SeleZenZHMod
{
    internal static class Program
    {
        private const string AppName = "SeleZenZHMod";
        private const string LauncherExeName = "SeleZen Games Launcher.exe";
        private static readonly string ModRoot = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "SeleZen-ZH-Mod");
        private static readonly string BackupRoot = Path.Combine(ModRoot, "backups");
        private static readonly string LogRoot = Path.Combine(ModRoot, "logs");
        private static readonly string SettingsBackupFile = Path.Combine(ModRoot, "settings-backup.json");
        private static readonly string CustomDictionaryFile = Path.Combine(ModRoot, "custom-dictionary.json");

        private static bool _verbose;

        [STAThread]
        private static int Main(string[] args)
        {
            try { Console.OutputEncoding = Encoding.UTF8; } catch { }
            EnsureModFolders();

            if (args.Length == 0)
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new MainForm());
                return 0;
            }

            return RunCommandLine(args);
        }

        private static void EnsureModFolders()
        {
            Directory.CreateDirectory(ModRoot);
            Directory.CreateDirectory(BackupRoot);
            Directory.CreateDirectory(LogRoot);
            EnsureCustomDictionaryFile();
        }

        private static int RunCommandLine(string[] args)
        {
            string launcherRootForReport = null;
            string asarPathForReport = null;
            try
            {
                var options = Options.Parse(args);
                _verbose = options.Verbose;
                var launcherRoot = options.LauncherRoot ?? FindLauncherRoot();
                var asarPath = Path.Combine(launcherRoot, "resources", "app.asar");
                var exePath = Path.Combine(launcherRoot, LauncherExeName);
                launcherRootForReport = launcherRoot;
                asarPathForReport = asarPath;

                if (options.Status)
                {
                    PrintStatus(launcherRoot, asarPath);
                    return 0;
                }

                if (options.Restore)
                {
                    StopLauncherProcesses();
                    RestoreLatestOfficialAsar(asarPath);
                    Console.WriteLine("已恢复最近一次官方 app.asar。");
                    return 0;
                }

                var status = GetPatchStatus(asarPath);
                if (!status.IsPatched)
                {
                    WriteUpdateDetectionLog(launcherRoot, asarPath, status);
                    StopLauncherProcesses();
                    if (!status.HasAnyPatch) BackupOfficialAsar(launcherRoot, asarPath);
                    PatchAsar(asarPath);
                    RestoreSettingsBackupOrDefaults();
                    Console.WriteLine("中文增强补丁已安装。");
                }
                else
                {
                    RestoreSettingsBackupOrDefaults();
                    Console.WriteLine("当前 app.asar 已包含中文增强补丁。");
                }

                if (!options.InstallOnly && !options.NoStart)
                {
                    StartLauncherAndBackupSettingsOnExit(exePath);
                }
                else
                {
                    BackupSettingsIfUseful();
                }

                return 0;
            }
            catch (Exception ex)
            {
                Log("ERROR " + ex);
                WritePatchFailureReport(launcherRootForReport, asarPathForReport, ex);
                Console.Error.WriteLine("失败: " + ex.Message);
                return 1;
            }
        }

        private static bool IsValidLauncherRoot(string path)
        {
            if (string.IsNullOrWhiteSpace(path)) return false;
            return File.Exists(Path.Combine(path, LauncherExeName)) &&
                   File.Exists(Path.Combine(path, "resources", "app.asar"));
        }

        private static string TryFindLauncherRoot()
        {
            try { return FindLauncherRoot(); } catch { return null; }
        }

        private static string FindLauncherRoot()
        {
            var local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var candidates = new[]
            {
                Path.Combine(local, "Programs", "Selezen-Games-launcher"),
                Environment.CurrentDirectory
            };
            foreach (var candidate in candidates)
            {
                if (File.Exists(Path.Combine(candidate, LauncherExeName)) &&
                    File.Exists(Path.Combine(candidate, "resources", "app.asar")))
                {
                    return candidate;
                }
            }
            throw new InvalidOperationException("找不到 SeleZen Games Launcher 安装目录，请使用 --launcher-root 指定。");
        }

        private static void PrintStatus(string launcherRoot, string asarPath)
        {
            var status = GetPatchStatus(asarPath);
            var exePath = Path.Combine(launcherRoot, LauncherExeName);
            var version = File.Exists(exePath) ? FileVersionInfo.GetVersionInfo(exePath).ProductVersion : "";
            var settings = ReadJsonObject(SettingsPath);
            var site = settings != null && settings.ContainsKey("siteTranslation") ? settings["siteTranslation"] as Dictionary<string, object> : null;
            var cacheEntries = CountCacheEntries();
            var cacheSize = File.Exists(SiteTranslationCachePath) ? new FileInfo(SiteTranslationCachePath).Length : 0;
            Console.WriteLine("Launcher root : " + launcherRoot);
            Console.WriteLine("Launcher ver  : " + version);
            Console.WriteLine("app.asar      : " + asarPath);
            Console.WriteLine("Patch status  : " + (status.IsPatched ? "OK" : "Needs patch"));
            Console.WriteLine("Patch markers : " + string.Join(", ", status.Markers.Where(kv => kv.Value).Select(kv => kv.Key)));
            Console.WriteLine("Missing       : " + (status.IsPatched ? "-" : string.Join(", ", status.Markers.Where(kv => !kv.Value).Select(kv => kv.Key))));
            Console.WriteLine("Language      : " + (settings != null && settings.ContainsKey("language") ? Convert.ToString(settings["language"]) : "(unknown)"));
            Console.WriteLine("Website AI    : " + (GetBoolValue(site, "enabled", false) ? "enabled" : "disabled"));
            Console.WriteLine("DeepSeek model: " + GetStringValue(site, "model", "(none)"));
            Console.WriteLine("DeepSeek key  : " + (HasEncryptedSiteTranslation(site) ? "saved" : "missing"));
            Console.WriteLine("Cache         : " + cacheEntries + " entries, " + FormatBytes(cacheSize));
            Console.WriteLine("Custom dict   : " + CustomDictionaryFile);
            Console.WriteLine("Custom entries: " + CountCustomDictionaryEntries());
            Console.WriteLine("Mod root      : " + ModRoot);
            Console.WriteLine("Key backup    : " + HasEncryptedKeyBackup());
            Console.WriteLine("Latest backup : " + (GetLatestOfficialBackupDir() ?? "(none)"));
            Console.WriteLine("Log file      : " + Path.Combine(LogRoot, "mod.log"));
        }

        private static PatchStatus GetPatchStatus(string asarPath)
        {
            if (!File.Exists(asarPath)) throw new FileNotFoundException("app.asar 不存在", asarPath);
            var asar = AsarArchive.Read(asarPath);
            var markers = new Dictionary<string, bool>
            {
                ["zh-CN"] = Contains(asar, "localization.js", "zh-CN"),
                ["localization v7"] = Contains(asar, "localization.js", "SELEZEN_ZH_MOD_LOCALIZATION_V7"),
                ["site-translation-translate-batch"] = Contains(asar, "main.js", "site-translation-translate-batch"),
                ["key persistence v7"] = Contains(asar, "main.js", "SELEZEN_ZH_MOD_KEY_PERSISTENCE_V7"),
                ["translation ipc v7"] = Contains(asar, "main.js", "SELEZEN_ZH_MOD_MAIN_TRANSLATION_IPC_V7"),
                ["shell detail speedup"] = Contains(asar, "shell.html", "detailChunkChars = 1500") && Contains(asar, "shell.html", "concurrentRequests = 2"),
                ["fixed modules v7"] = Contains(asar, "shell.html", "SELEZEN_ZH_MOD_FIXED_MODULES_V7"),
                ["settings layout v7.1"] = Contains(asar, "shell.html", "SELEZEN_ZH_MOD_SETTINGS_LAYOUT_V7_1"),
                ["custom dictionary v6"] = Contains(asar, "main.js", "SELEZEN_ZH_MOD_CUSTOM_DICTIONARY_V6") && Contains(asar, "shell.html", "SELEZEN_ZH_MOD_CUSTOM_DICTIONARY_V6"),
                ["site preload marker"] = Contains(asar, "site-preload.js", "DETAIL_AI_TEXT_CONTAINER_SELECTOR")
            };
            return new PatchStatus(markers);
        }

        private static bool Contains(AsarArchive asar, string path, string needle)
        {
            byte[] data;
            if (!asar.Files.TryGetValue(path.Replace('\\', '/'), out data)) return false;
            return Encoding.UTF8.GetString(data).Contains(needle);
        }

        private static void PatchAsar(string asarPath)
        {
            var originalBytes = File.ReadAllBytes(asarPath);
            var asar = AsarArchive.Read(asarPath);

            PatchLocalization(asar);
            PatchMain(asar);
            PatchShellPreload(asar);
            PatchSitePreload(asar);
            PatchShellHtml(asar);

            var tempPath = asarPath + ".zhmod.tmp";
            try
            {
                asar.Write(tempPath);
                var verify = AsarArchive.Read(tempPath);
                var status = new PatchStatus(new Dictionary<string, bool>
                {
                    ["zh-CN"] = Contains(verify, "localization.js", "zh-CN"),
                    ["localization v7"] = Contains(verify, "localization.js", "SELEZEN_ZH_MOD_LOCALIZATION_V7"),
                    ["site-translation-translate-batch"] = Contains(verify, "main.js", "site-translation-translate-batch"),
                    ["key persistence v7"] = Contains(verify, "main.js", "SELEZEN_ZH_MOD_KEY_PERSISTENCE_V7"),
                    ["translation ipc v7"] = Contains(verify, "main.js", "SELEZEN_ZH_MOD_MAIN_TRANSLATION_IPC_V7"),
                    ["shell detail speedup"] = Contains(verify, "shell.html", "detailChunkChars = 1500") && Contains(verify, "shell.html", "concurrentRequests = 2"),
                    ["fixed modules v7"] = Contains(verify, "shell.html", "SELEZEN_ZH_MOD_FIXED_MODULES_V7"),
                    ["settings layout v7.1"] = Contains(verify, "shell.html", "SELEZEN_ZH_MOD_SETTINGS_LAYOUT_V7_1"),
                    ["custom dictionary v6"] = Contains(verify, "main.js", "SELEZEN_ZH_MOD_CUSTOM_DICTIONARY_V6") && Contains(verify, "shell.html", "SELEZEN_ZH_MOD_CUSTOM_DICTIONARY_V6"),
                    ["site preload marker"] = Contains(verify, "site-preload.js", "DETAIL_AI_TEXT_CONTAINER_SELECTOR")
                });
                if (!status.IsPatched)
                {
                    var missing = string.Join(", ", status.Markers.Where(kv => !kv.Value).Select(kv => kv.Key));
                    throw new InvalidOperationException("补丁标记验证失败，缺失: " + missing);
                }
                File.Copy(tempPath, asarPath, true);
            }
            catch
            {
                File.WriteAllBytes(asarPath, originalBytes);
                throw;
            }
            finally
            {
                TryDelete(tempPath);
            }
        }

        private static void PatchLocalization(AsarArchive asar)
        {
            var text = asar.GetText("localization.js");
            if (text.Contains("SELEZEN_ZH_MOD_LOCALIZATION_V7"))
            {
                asar.SetText("localization.js", text);
                return;
            }
            if (text.Contains("SELEZEN_ZH_MOD_LOCALIZATION"))
            {
                var markerIndex = text.IndexOf("SELEZEN_ZH_MOD_LOCALIZATION", StringComparison.Ordinal);
                var start = markerIndex;
                while (start > 0 && text[start - 1] != '\n' && text[start - 1] != '\r') start -= 1;
                var end = text.IndexOf("  function normalizeLanguage(value) {", markerIndex, StringComparison.Ordinal);
                if (end < 0) throw new InvalidOperationException("localization.js 找不到 normalizeLanguage 锚点，无法替换旧中文语言补丁。");
                text = text.Substring(0, start) + ReadPatch("localization-zh.js").TrimEnd() + "\r\n" + text.Substring(end);
                asar.SetText("localization.js", text);
                return;
            }
            text = text.Replace("const SUPPORTED_LANGUAGES = ['ru', 'en'];", "const SUPPORTED_LANGUAGES = ['ru', 'en', 'zh-CN'];");
            text = text.Replace("en: { locale: 'en-US' }\r\n  };", "en: { locale: 'en-US' },\r\n    'zh-CN': { locale: 'zh-CN' }\r\n  };");
            text = text.Replace("en: {}\r\n  };", "en: {},\r\n    'zh-CN': {}\r\n  };");
            text = text.Replace("if (raw.startsWith('en')) return 'en';", "if (raw.startsWith('en')) return 'en';\r\n    if (raw === 'zh' || raw.startsWith('zh-cn') || raw.startsWith('zh_cn') || raw.startsWith('zh-hans') || raw.startsWith('zh_hans')) return 'zh-CN';");
            text = InsertBefore(text, "  function normalizeLanguage(value) {", ReadPatch("localization-zh.js") + "\r\n");
            asar.SetText("localization.js", text);
        }

        private static void PatchMain(AsarArchive asar)
        {
            var text = asar.GetText("main.js");
            if (!text.Contains("safeStorage } = require('electron')"))
            {
                text = text.Replace(
                    "const { app, BrowserWindow, dialog, Menu, shell, session, ipcMain, Notification, Tray, webContents } = require('electron');",
                    "const { app, BrowserWindow, dialog, Menu, shell, session, ipcMain, Notification, Tray, webContents, safeStorage } = require('electron');");
            }
            if (!text.Contains("SITE_TRANSLATION_CACHE_FILE"))
            {
                text = text.Replace(
                    "const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');",
                    "const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');\r\nconst SITE_TRANSLATION_CACHE_FILE = path.join(USER_DATA_DIR, 'site-translation-cache.json');");
            }
            if (!text.Contains("siteTranslation: {"))
            {
                text = text.Replace(
                    "autoLaunch: true,\r\n  language: normalizeLanguage(DEFAULT_LANGUAGE)\r\n};",
                    "autoLaunch: true,\r\n  language: normalizeLanguage(DEFAULT_LANGUAGE),\r\n  siteTranslation: {\r\n    enabled: false,\r\n    model: 'deepseek-v4-flash',\r\n    apiKeyEncrypted: ''\r\n  }\r\n};");
            }
            var mainTranslationPatch = ReadPatch("main-site-translation.js");
            if (text.Contains("SELEZEN_ZH_MOD_MAIN_TRANSLATION") && !text.Contains("SELEZEN_ZH_MOD_KEY_PERSISTENCE_V7"))
            {
                var markerIndex = text.IndexOf("SELEZEN_ZH_MOD_MAIN_TRANSLATION", StringComparison.Ordinal);
                var start = markerIndex;
                while (start > 0 && text[start - 1] != '\n' && text[start - 1] != '\r') start -= 1;
                var end = text.IndexOf("function loadSettings() {", markerIndex, StringComparison.Ordinal);
                if (end < 0) throw new InvalidOperationException("main.js 找不到 loadSettings 锚点，无法替换旧主进程翻译补丁。");
                text = text.Substring(0, start) + mainTranslationPatch.TrimEnd() + "\r\n" + text.Substring(end);
            }
            else if (!text.Contains("SELEZEN_ZH_MOD_MAIN_TRANSLATION"))
            {
                text = InsertBefore(text, "function loadSettings() {", mainTranslationPatch + "\r\n");
            }
            if (!text.Contains("const normalizedSiteTranslation = normalizeSiteTranslationSettings(parsed.siteTranslation);"))
            {
                text = text.Replace(
                    "if (parsed.language !== normalizedLanguage) {\r\n      shouldSave = true;\r\n    }\r\n",
                    "if (parsed.language !== normalizedLanguage) {\r\n      shouldSave = true;\r\n    }\r\n    const normalizedSiteTranslation = normalizeSiteTranslationSettings(parsed.siteTranslation);\r\n    settings.siteTranslation = normalizedSiteTranslation;\r\n    if (!parsed.siteTranslation || JSON.stringify(normalizedSiteTranslation) !== JSON.stringify(parsed.siteTranslation)) {\r\n      shouldSave = true;\r\n    }\r\n");
                text = text.Replace(
                    "settings.language = normalizeLanguage(null);\r\n    shouldSave = true;",
                    "settings.language = normalizeLanguage(null);\r\n    settings.siteTranslation = normalizeSiteTranslationSettings(null);\r\n    shouldSave = true;");
            }
            if (text.Contains("SELEZEN_ZH_MOD_MAIN_TRANSLATION_IPC") && !text.Contains("SELEZEN_ZH_MOD_MAIN_TRANSLATION_IPC_V7"))
            {
                var markerIndex = text.IndexOf("SELEZEN_ZH_MOD_MAIN_TRANSLATION_IPC", StringComparison.Ordinal);
                var start = markerIndex;
                while (start > 0 && text[start - 1] != '\n' && text[start - 1] != '\r') start -= 1;
                var end = text.IndexOf("ipcMain.handle('update-check'", markerIndex, StringComparison.Ordinal);
                if (end < 0) throw new InvalidOperationException("main.js 找不到 update-check 锚点，无法替换旧翻译 IPC 补丁。");
                text = text.Substring(0, start) + ReadPatch("main-site-translation-ipc.js").TrimEnd() + "\r\n" + text.Substring(end);
            }
            else if (!text.Contains("SELEZEN_ZH_MOD_MAIN_TRANSLATION_IPC"))
            {
                text = InsertBefore(text, "ipcMain.handle('update-check'", ReadPatch("main-site-translation-ipc.js") + "\r\n");
            }
            asar.SetText("main.js", text);
        }

        private static void PatchShellPreload(AsarArchive asar)
        {
            var text = asar.GetText("shell-preload.js");
            if (text.Contains("siteTranslationTranslateBatch"))
            {
                asar.SetText("shell-preload.js", text);
                return;
            }
            text = text.Replace(
                "localeSetLanguage: language => ipcRenderer.invoke('locale-set-language', { language }),",
                "localeSetLanguage: language => ipcRenderer.invoke('locale-set-language', { language }),\r\n  siteTranslationGetConfig: () => ipcRenderer.invoke('site-translation-get-config'),\r\n  siteTranslationSetConfig: payload => ipcRenderer.invoke('site-translation-set-config', payload || {}),\r\n  siteTranslationTest: () => ipcRenderer.invoke('site-translation-test'),\r\n  siteTranslationTranslateBatch: payload => ipcRenderer.invoke('site-translation-translate-batch', payload || {}),\r\n  siteTranslationClearCache: () => ipcRenderer.invoke('site-translation-clear-cache'),\r\n  onSiteTranslationStatusChanged: callback => {\r\n    const listener = (_event, payload) => callback(payload);\r\n    ipcRenderer.on('site-translation-status-changed', listener);\r\n    return () => ipcRenderer.removeListener('site-translation-status-changed', listener);\r\n  },");
            asar.SetText("shell-preload.js", text);
        }

        private static void PatchSitePreload(AsarArchive asar)
        {
            var text = asar.GetText("site-preload.js");
            if (!text.Contains("SELEZEN_ZH_MOD_SITE_PRELOAD"))
            {
                var anchor = "let currentLanguage = DEFAULT_LANGUAGE;";
                var idx = text.IndexOf(anchor, StringComparison.Ordinal);
                if (idx < 0) throw new InvalidOperationException("site-preload.js 找不到 currentLanguage 锚点。");
                idx += anchor.Length;
                text = text.Substring(0, idx) + "\r\n" + ReadPatch("site-preload-marker.js") + text.Substring(idx);
            }
            asar.SetText("site-preload.js", text);
        }

        private static void PatchShellHtml(AsarArchive asar)
        {
            var text = asar.GetText("shell.html");
            var patch = ReadPatch("shell-zh-mod.js").TrimEnd();
            if (text.Contains("SELEZEN_ZH_MOD_SETTINGS_LAYOUT_V7_1"))
            {
                asar.SetText("shell.html", text);
                return;
            }
            if (text.Contains("SELEZEN_ZH_MOD_SHELL_TRANSLATION"))
            {
                var markerIndex = text.IndexOf("SELEZEN_ZH_MOD_SHELL_TRANSLATION", StringComparison.Ordinal);
                var start = markerIndex;
                while (start > 0 && text[start - 1] != '\n' && text[start - 1] != '\r') start -= 1;
                var endMarker = "selezenZhMod.init();";
                var end = text.IndexOf(endMarker, markerIndex, StringComparison.Ordinal);
                if (end < 0) throw new InvalidOperationException("shell.html 找不到旧网站翻译补丁结束锚点。");
                end += endMarker.Length;
                while (end < text.Length && (text[end] == '\r' || text[end] == '\n' || text[end] == ' ' || text[end] == '\t')) end += 1;
                text = text.Substring(0, start) + patch + "\r\n" + text.Substring(end);
            }
            else
            {
                var marker = "</script>";
                var idx = text.LastIndexOf(marker, StringComparison.OrdinalIgnoreCase);
                if (idx < 0) throw new InvalidOperationException("shell.html 找不到 </script> 锚点。");
                text = text.Substring(0, idx) + "\r\n" + patch + "\r\n" + text.Substring(idx);
            }
            asar.SetText("shell.html", text);
        }

        private static string InsertBefore(string text, string anchor, string insertion)
        {
            var idx = text.IndexOf(anchor, StringComparison.Ordinal);
            if (idx < 0) throw new InvalidOperationException("找不到补丁锚点: " + anchor);
            return text.Substring(0, idx) + insertion + text.Substring(idx);
        }

        private static string ReadPatch(string name)
        {
            var asm = Assembly.GetExecutingAssembly();
            var resourceName = asm.GetManifestResourceNames().FirstOrDefault(n => n.EndsWith(".Patches." + name, StringComparison.OrdinalIgnoreCase));
            if (resourceName == null) throw new InvalidOperationException("缺少嵌入补丁资源: " + name);
            using (var stream = asm.GetManifestResourceStream(resourceName))
            using (var reader = new StreamReader(stream, Encoding.UTF8))
            {
                return reader.ReadToEnd();
            }
        }

        private static void BackupOfficialAsar(string launcherRoot, string asarPath)
        {
            Directory.CreateDirectory(BackupRoot);
            var sha = Sha256File(asarPath).Substring(0, 12);
            var stamp = DateTime.Now.ToString("yyyyMMdd-HHmmss");
            var destDir = Path.Combine(BackupRoot, "official-" + stamp + "-" + sha);
            Directory.CreateDirectory(destDir);
            var destAsar = Path.Combine(destDir, "app.asar");
            File.Copy(asarPath, destAsar, true);
            var unpacked = Path.Combine(Path.GetDirectoryName(asarPath), "app.asar.unpacked", "torrent-worker-bootstrap.js");
            if (File.Exists(unpacked))
            {
                var unpackedDest = Path.Combine(destDir, "app.asar.unpacked", "torrent-worker-bootstrap.js");
                Directory.CreateDirectory(Path.GetDirectoryName(unpackedDest));
                File.Copy(unpacked, unpackedDest, true);
            }
            File.WriteAllText(Path.Combine(destDir, "manifest.json"),
                "{\n  \"launcherRoot\": " + JsonSerializer.Serialize(launcherRoot) + ",\n  \"sha256\": " + JsonSerializer.Serialize(Sha256File(asarPath)) + ",\n  \"createdAt\": " + JsonSerializer.Serialize(DateTime.Now.ToString("s")) + "\n}\n",
                Encoding.UTF8);
            Log("Backup official asar: " + destAsar);
        }

        private static void RestoreLatestOfficialAsar(string asarPath)
        {
            var latest = Directory.Exists(BackupRoot)
                ? Directory.GetDirectories(BackupRoot, "official-*").OrderByDescending(d => d).FirstOrDefault()
                : null;
            if (latest == null) throw new InvalidOperationException("没有找到官方 app.asar 备份。");
            var source = Path.Combine(latest, "app.asar");
            if (!File.Exists(source)) throw new FileNotFoundException("备份 app.asar 不存在", source);
            File.Copy(source, asarPath, true);
        }

        private static void StopLauncherProcesses()
        {
            var names = new[] { "SeleZen Games Launcher", "SelezenTorrentCore" };
            foreach (var proc in Process.GetProcesses())
            {
                try
                {
                    if (!names.Contains(proc.ProcessName, StringComparer.OrdinalIgnoreCase)) continue;
                    Console.WriteLine("正在关闭进程: " + proc.ProcessName + " (" + proc.Id + ")");
                    proc.Kill();
                    proc.WaitForExit(5000);
                }
                catch { }
            }
        }

        private static void StartLauncherAndBackupSettingsOnExit(string exePath)
        {
            if (!File.Exists(exePath)) throw new FileNotFoundException("启动器 EXE 不存在", exePath);
            Console.WriteLine("正在启动 SeleZen Games Launcher...");
            var proc = Process.Start(new ProcessStartInfo
            {
                FileName = exePath,
                WorkingDirectory = Path.GetDirectoryName(exePath),
                UseShellExecute = true
            });
            if (proc == null) return;
            Console.WriteLine("客户端已启动。关闭客户端后将备份加密翻译设置。");
            try
            {
                proc.WaitForExit();
                System.Threading.Thread.Sleep(500);
            }
            catch { }
            BackupSettingsIfUseful();
        }

        private static void StartLauncherNoWait(string exePath)
        {
            if (!File.Exists(exePath)) throw new FileNotFoundException("启动器 EXE 不存在", exePath);
            Process.Start(new ProcessStartInfo
            {
                FileName = exePath,
                WorkingDirectory = Path.GetDirectoryName(exePath),
                UseShellExecute = true
            });
        }

        private static string SettingsPath
        {
            get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "SelezenGames", "settings.json"); }
        }

        private static string SiteTranslationCachePath
        {
            get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "SelezenGames", "site-translation-cache.json"); }
        }

        private static void EnsureCustomDictionaryFile()
        {
            if (File.Exists(CustomDictionaryFile)) return;
            var template =
                "{\n" +
                "  \"__说明\": \"这里补网站固定短词。左边写网页原文，右边写中文。保存后重新启动或点一次翻译当前网站。\",\n" +
                "  \"__示例\": {\n" +
                "    \"Текст на сайте\": \"中文翻译\",\n" +
                "    \"Magnet link\": \"磁力链接\"\n" +
                "  }\n" +
                "}\n";
            File.WriteAllText(CustomDictionaryFile, template, new UTF8Encoding(false));
        }

        private static void RestoreSettingsBackupOrDefaults()
        {
            var settings = ReadJsonObject(SettingsPath) ?? new Dictionary<string, object>();
            var backup = ReadJsonObject(SettingsBackupFile);
            var currentSiteTranslation = settings.ContainsKey("siteTranslation") ? settings["siteTranslation"] as Dictionary<string, object> : null;
            var backupSiteTranslation = backup != null && backup.ContainsKey("siteTranslation") ? backup["siteTranslation"] as Dictionary<string, object> : null;
            var siteTranslation = MergeSiteTranslationSettings(currentSiteTranslation, backupSiteTranslation);
            if (siteTranslation == null)
            {
                siteTranslation = new Dictionary<string, object>
                {
                    ["enabled"] = false,
                    ["model"] = "deepseek-v4-flash",
                    ["apiKeyEncrypted"] = ""
                };
            }
            settings["language"] = "zh-CN";
            settings["siteTranslation"] = siteTranslation;
            WriteJsonObject(SettingsPath, settings);
        }

        private static Dictionary<string, object> MergeSiteTranslationSettings(Dictionary<string, object> current, Dictionary<string, object> backup)
        {
            if (current == null && backup == null) return null;
            var result = new Dictionary<string, object>
            {
                ["enabled"] = GetBoolValue(current, "enabled", GetBoolValue(backup, "enabled", false)),
                ["model"] = GetStringValue(current, "model", GetStringValue(backup, "model", "deepseek-v4-flash")),
                ["apiKeyEncrypted"] = GetStringValue(current, "apiKeyEncrypted", GetStringValue(backup, "apiKeyEncrypted", ""))
            };
            if (string.IsNullOrWhiteSpace(Convert.ToString(result["apiKeyEncrypted"])) && backup != null)
            {
                result["apiKeyEncrypted"] = GetStringValue(backup, "apiKeyEncrypted", "");
            }
            return result;
        }

        private static bool GetBoolValue(Dictionary<string, object> source, string key, bool fallback)
        {
            if (source == null || !source.ContainsKey(key)) return fallback;
            var value = source[key];
            if (value is bool) return (bool)value;
            bool parsed;
            return bool.TryParse(Convert.ToString(value), out parsed) ? parsed : fallback;
        }

        private static string GetStringValue(Dictionary<string, object> source, string key, string fallback)
        {
            if (source == null || !source.ContainsKey(key)) return fallback;
            var value = Convert.ToString(source[key]);
            return string.IsNullOrWhiteSpace(value) ? fallback : value;
        }

        private static void BackupSettingsIfUseful()
        {
            var settings = ReadJsonObject(SettingsPath);
            if (settings == null || !settings.ContainsKey("siteTranslation")) return;
            if (!HasEncryptedSiteTranslation(settings["siteTranslation"]))
            {
                Log("Skip settings backup without encrypted key.");
                return;
            }
            Directory.CreateDirectory(ModRoot);
            WriteJsonObject(SettingsBackupFile, settings);
            Console.WriteLine("已备份设置到: " + SettingsBackupFile);
        }

        private static bool HasEncryptedKeyBackup()
        {
            var settings = ReadJsonObject(SettingsBackupFile);
            if (settings == null || !settings.ContainsKey("siteTranslation")) return false;
            return HasEncryptedSiteTranslation(settings["siteTranslation"]);
        }

        private static bool HasEncryptedSiteTranslation(object siteTranslation)
        {
            var site = siteTranslation as Dictionary<string, object>;
            if (site == null || !site.ContainsKey("apiKeyEncrypted")) return false;
            return !string.IsNullOrWhiteSpace(Convert.ToString(site["apiKeyEncrypted"]));
        }

        private static int CountCustomDictionaryEntries()
        {
            var dict = ReadJsonObject(CustomDictionaryFile);
            if (dict == null) return 0;
            object source = dict;
            if (dict.ContainsKey("entries")) source = dict["entries"];
            var entries = source as Dictionary<string, object>;
            if (entries == null) return 0;
            return entries.Count(kv =>
                !string.IsNullOrWhiteSpace(kv.Key) &&
                !kv.Key.StartsWith("__", StringComparison.Ordinal) &&
                !string.IsNullOrWhiteSpace(Convert.ToString(kv.Value)));
        }

        private static int CountCacheEntries()
        {
            var cache = ReadJsonObject(SiteTranslationCachePath);
            if (cache == null || !cache.ContainsKey("entries")) return 0;
            var entries = cache["entries"] as Dictionary<string, object>;
            return entries == null ? 0 : entries.Count;
        }

        private static string FormatBytes(long bytes)
        {
            if (bytes < 1024) return bytes + " B";
            if (bytes < 1024 * 1024) return (bytes / 1024.0).ToString("0.0") + " KB";
            return (bytes / 1024.0 / 1024.0).ToString("0.0") + " MB";
        }

        private static string GetLatestOfficialBackupDir()
        {
            return Directory.Exists(BackupRoot)
                ? Directory.GetDirectories(BackupRoot, "official-*").OrderByDescending(d => d).FirstOrDefault()
                : null;
        }

        private static void WriteUpdateDetectionLog(string launcherRoot, string asarPath, PatchStatus status)
        {
            try
            {
                var exePath = Path.Combine(launcherRoot, LauncherExeName);
                var version = File.Exists(exePath) ? FileVersionInfo.GetVersionInfo(exePath).ProductVersion : "";
                var sha = File.Exists(asarPath) ? Sha256File(asarPath) : "";
                var reportPath = Path.Combine(LogRoot, "update-detected-" + DateTime.Now.ToString("yyyyMMdd-HHmmss") + ".log");
                var missing = string.Join(", ", status.Markers.Where(kv => !kv.Value).Select(kv => kv.Key));
                var present = string.Join(", ", status.Markers.Where(kv => kv.Value).Select(kv => kv.Key));
                var text =
                    "SeleZen ZH Mod update detection\n" +
                    "Time          : " + DateTime.Now.ToString("s") + "\n" +
                    "Launcher root : " + launcherRoot + "\n" +
                    "Launcher ver  : " + version + "\n" +
                    "app.asar      : " + asarPath + "\n" +
                    "SHA256        : " + sha + "\n" +
                    "Present       : " + present + "\n" +
                    "Missing       : " + missing + "\n";
                File.WriteAllText(reportPath, text, new UTF8Encoding(false));
                Log("Update/unpatched package detected. Missing: " + missing);
            }
            catch { }
        }

        private static void WritePatchFailureReport(string launcherRoot, string asarPath, Exception ex)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(launcherRoot) && string.IsNullOrWhiteSpace(asarPath)) return;
                var reportPath = Path.Combine(LogRoot, "patch-failure-" + DateTime.Now.ToString("yyyyMMdd-HHmmss") + ".log");
                var exePath = string.IsNullOrWhiteSpace(launcherRoot) ? "" : Path.Combine(launcherRoot, LauncherExeName);
                var version = File.Exists(exePath) ? FileVersionInfo.GetVersionInfo(exePath).ProductVersion : "";
                var sha = !string.IsNullOrWhiteSpace(asarPath) && File.Exists(asarPath) ? Sha256File(asarPath) : "";
                var text =
                    "SeleZen ZH Mod patch failure\n" +
                    "Time          : " + DateTime.Now.ToString("s") + "\n" +
                    "Launcher root : " + (launcherRoot ?? "") + "\n" +
                    "Launcher ver  : " + version + "\n" +
                    "app.asar      : " + (asarPath ?? "") + "\n" +
                    "SHA256        : " + sha + "\n" +
                    "Error         : " + ex.Message + "\n\n" +
                    ex + "\n";
                File.WriteAllText(reportPath, text, new UTF8Encoding(false));
            }
            catch { }
        }

        private static Dictionary<string, object> ReadJsonObject(string path)
        {
            if (!File.Exists(path)) return null;
            try
            {
                using (var doc = JsonDocument.Parse(File.ReadAllText(path, Encoding.UTF8)))
                {
                    return ConvertObject(doc.RootElement) as Dictionary<string, object>;
                }
            }
            catch
            {
                return null;
            }
        }

        private static object ConvertObject(JsonElement element)
        {
            switch (element.ValueKind)
            {
                case JsonValueKind.Object:
                    var dict = new Dictionary<string, object>();
                    foreach (var prop in element.EnumerateObject()) dict[prop.Name] = ConvertObject(prop.Value);
                    return dict;
                case JsonValueKind.Array:
                    return element.EnumerateArray().Select(ConvertObject).ToList();
                case JsonValueKind.String:
                    return element.GetString();
                case JsonValueKind.Number:
                    if (element.TryGetInt64(out var longValue)) return longValue;
                    return element.GetDouble();
                case JsonValueKind.True:
                    return true;
                case JsonValueKind.False:
                    return false;
                default:
                    return null;
            }
        }

        private static void WriteJsonObject(string path, Dictionary<string, object> obj)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            var opts = new JsonSerializerOptions { WriteIndented = true };
            File.WriteAllText(path, JsonSerializer.Serialize(obj, opts), new UTF8Encoding(false));
        }

        private static string Sha256File(string path)
        {
            using (var sha = SHA256.Create())
            using (var stream = File.OpenRead(path))
            {
                return ToHex(sha.ComputeHash(stream));
            }
        }

        private static string ToHex(byte[] bytes)
        {
            var sb = new StringBuilder(bytes.Length * 2);
            foreach (var b in bytes) sb.Append(b.ToString("x2"));
            return sb.ToString();
        }

        private static void TryDelete(string path)
        {
            try { if (File.Exists(path)) File.Delete(path); } catch { }
        }

        private static void Log(string message)
        {
            try
            {
                Directory.CreateDirectory(LogRoot);
                File.AppendAllText(Path.Combine(LogRoot, "mod.log"), DateTime.Now.ToString("s") + " " + message + Environment.NewLine, Encoding.UTF8);
                if (_verbose) Console.WriteLine(message);
            }
            catch { }
        }

        private sealed class MainForm : Form
        {
            private readonly TextBox _launcherRootBox;
            private readonly TextBox _installerPathBox;
            private readonly CheckBox _installPatchBox;
            private readonly CheckBox _startAfterBox;
            private readonly TextBox _logBox;
            private readonly Label _statusLabel;
            private readonly List<Control> _busyControls = new List<Control>();

            public MainForm()
            {
                Text = "SeleZen 中文增强 Mod 安装器";
                StartPosition = FormStartPosition.CenterScreen;
                MinimumSize = new Size(860, 640);
                Size = new Size(960, 720);
                Font = new Font("Microsoft YaHei UI", 9F);

                var main = new TableLayoutPanel
                {
                    Dock = DockStyle.Fill,
                    ColumnCount = 1,
                    RowCount = 6,
                    Padding = new Padding(18),
                    AutoScroll = true
                };
                main.RowStyles.Add(new RowStyle(SizeType.AutoSize));
                main.RowStyles.Add(new RowStyle(SizeType.AutoSize));
                main.RowStyles.Add(new RowStyle(SizeType.AutoSize));
                main.RowStyles.Add(new RowStyle(SizeType.AutoSize));
                main.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
                main.RowStyles.Add(new RowStyle(SizeType.AutoSize));
                Controls.Add(main);

                var title = new Label
                {
                    Text = "SeleZen 中文增强 Mod 安装器",
                    Dock = DockStyle.Top,
                    AutoSize = true,
                    Font = new Font(Font.FontFamily, 16F, FontStyle.Bold),
                    Margin = new Padding(0, 0, 0, 6)
                };
                var subtitle = new Label
                {
                    Text = "选择客户端位置后，按按钮即可安装中文增强、恢复官方包或启动客户端。",
                    Dock = DockStyle.Top,
                    AutoSize = true,
                    ForeColor = Color.DimGray,
                    Margin = new Padding(0, 0, 0, 12)
                };
                var header = new Panel { Dock = DockStyle.Top, AutoSize = true };
                header.Controls.Add(subtitle);
                header.Controls.Add(title);
                main.Controls.Add(header, 0, 0);

                _launcherRootBox = new TextBox { Dock = DockStyle.Fill };
                var clientBox = CreateGroup("客户端位置", "这里选择 SeleZen Games Launcher 的安装目录。目录里需要有 SeleZen Games Launcher.exe 和 resources\\app.asar。");
                clientBox.Controls.Add(CreatePathRow(_launcherRootBox, "自动检测", DetectLauncher, "浏览...", BrowseLauncherRoot));
                main.Controls.Add(clientBox, 0, 1);

                _installerPathBox = new TextBox { Dock = DockStyle.Fill, Text = ModRoot };
                var installBox = CreateGroup("安装器保存位置", "这是给普通用户保存这个 Mod 安装器 EXE 的位置，不会改变官方客户端路径。");
                installBox.Controls.Add(CreatePathRow(_installerPathBox, "打开文件夹", OpenInstallerFolder, "浏览...", BrowseInstallerPath));
                var saveInstaller = CreateButton("保存安装器副本到这里", SaveInstallerCopy);
                installBox.Controls.Add(CreateButtonRow(saveInstaller, CreateButton("打开 Mod 数据文件夹", OpenModRoot), CreateButton("打开自定义词典", OpenCustomDictionary)));
                main.Controls.Add(installBox, 0, 2);

                _installPatchBox = new CheckBox { Text = "安装/更新中文增强补丁", Checked = true, AutoSize = true, Margin = new Padding(0, 8, 18, 8) };
                _startAfterBox = new CheckBox { Text = "完成后启动客户端", Checked = true, AutoSize = true, Margin = new Padding(0, 8, 18, 8) };
                var optionsFlow = new FlowLayoutPanel { Dock = DockStyle.Top, AutoSize = true, FlowDirection = FlowDirection.LeftToRight, WrapContents = true };
                optionsFlow.Controls.Add(_installPatchBox);
                optionsFlow.Controls.Add(_startAfterBox);

                var actionBox = CreateGroup("操作", "不想打补丁就取消勾选；不想启动客户端就取消启动勾选。");
                actionBox.Controls.Add(optionsFlow);
                actionBox.Controls.Add(CreateButtonRow(
                    CreateButton("执行所选操作", ExecuteSelected),
                    CreateButton("只检查状态", CheckStatus),
                    CreateButton("只启动客户端", StartLauncherFromGui),
                    CreateButton("恢复官方包", RestoreOfficialFromGui)
                ));
                main.Controls.Add(actionBox, 0, 3);

                _logBox = new TextBox
                {
                    Dock = DockStyle.Fill,
                    Multiline = true,
                    ReadOnly = true,
                    ScrollBars = ScrollBars.Vertical,
                    BackColor = Color.FromArgb(248, 248, 248),
                    Font = new Font("Consolas", 9F)
                };
                main.Controls.Add(_logBox, 0, 4);

                _statusLabel = new Label
                {
                    Dock = DockStyle.Fill,
                    AutoSize = true,
                    ForeColor = Color.DimGray,
                    Text = "就绪",
                    Margin = new Padding(0, 10, 0, 0)
                };
                main.Controls.Add(_statusLabel, 0, 5);

                Load += (sender, args) =>
                {
                    DetectLauncher();
                    AppendLog("提示: 双击默认打开这个窗口；高级用户仍可用 --status、--install-only、--launcher-root 等参数。");
                };
            }

            private GroupBox CreateGroup(string title, string note)
            {
                var group = new GroupBox
                {
                    Text = title,
                    Dock = DockStyle.Top,
                    AutoSize = true,
                    Padding = new Padding(12),
                    Margin = new Padding(0, 8, 0, 8)
                };
                var panel = new TableLayoutPanel
                {
                    Dock = DockStyle.Top,
                    AutoSize = true,
                    ColumnCount = 1,
                    RowCount = 2
                };
                panel.Controls.Add(new Label
                {
                    Text = note,
                    Dock = DockStyle.Top,
                    AutoSize = true,
                    ForeColor = Color.DimGray,
                    Margin = new Padding(0, 4, 0, 8)
                }, 0, 0);
                group.Controls.Add(panel);
                return group;
            }

            private Control CreatePathRow(TextBox textBox, string leftButtonText, Action leftAction, string rightButtonText, Action rightAction)
            {
                var row = new TableLayoutPanel
                {
                    Dock = DockStyle.Top,
                    AutoSize = true,
                    ColumnCount = 3,
                    Margin = new Padding(0, 0, 0, 8)
                };
                row.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
                row.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
                row.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
                textBox.Margin = new Padding(0, 4, 8, 4);
                row.Controls.Add(textBox, 0, 0);
                row.Controls.Add(CreateButton(leftButtonText, leftAction), 1, 0);
                row.Controls.Add(CreateButton(rightButtonText, rightAction), 2, 0);
                return row;
            }

            private FlowLayoutPanel CreateButtonRow(params Button[] buttons)
            {
                var row = new FlowLayoutPanel
                {
                    Dock = DockStyle.Top,
                    AutoSize = true,
                    FlowDirection = FlowDirection.LeftToRight,
                    WrapContents = true,
                    Margin = new Padding(0, 8, 0, 4)
                };
                foreach (var button in buttons) row.Controls.Add(button);
                return row;
            }

            private Button CreateButton(string text, Action action)
            {
                var button = new Button
                {
                    Text = text,
                    AutoSize = true,
                    Margin = new Padding(0, 4, 8, 4),
                    Padding = new Padding(10, 4, 10, 4)
                };
                button.Click += (sender, args) => action();
                _busyControls.Add(button);
                return button;
            }

            private void DetectLauncher()
            {
                var found = TryFindLauncherRoot();
                if (!string.IsNullOrWhiteSpace(found))
                {
                    _launcherRootBox.Text = found;
                    SetStatus("已自动检测到客户端。");
                    AppendLog("已检测到客户端: " + found);
                }
                else
                {
                    SetStatus("未自动检测到客户端，请手动选择。");
                    AppendLog("未自动检测到客户端，请点击“浏览...”选择 SeleZen 客户端目录。");
                }
            }

            private void BrowseLauncherRoot()
            {
                using (var dialog = new FolderBrowserDialog())
                {
                    dialog.Description = "选择 SeleZen Games Launcher 安装目录";
                    dialog.SelectedPath = Directory.Exists(_launcherRootBox.Text) ? _launcherRootBox.Text : Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                    if (dialog.ShowDialog(this) != DialogResult.OK) return;
                    _launcherRootBox.Text = NormalizeLauncherRoot(dialog.SelectedPath);
                    AppendLog("已选择客户端目录: " + _launcherRootBox.Text);
                }
            }

            private string NormalizeLauncherRoot(string selected)
            {
                if (string.IsNullOrWhiteSpace(selected)) return "";
                if (File.Exists(Path.Combine(selected, "app.asar")) &&
                    string.Equals(Path.GetFileName(selected), "resources", StringComparison.OrdinalIgnoreCase))
                {
                    return Directory.GetParent(selected)?.FullName ?? selected;
                }
                return selected;
            }

            private void BrowseInstallerPath()
            {
                using (var dialog = new FolderBrowserDialog())
                {
                    dialog.Description = "选择保存 Mod 安装器的位置";
                    dialog.SelectedPath = Directory.Exists(_installerPathBox.Text) ? _installerPathBox.Text : ModRoot;
                    if (dialog.ShowDialog(this) != DialogResult.OK) return;
                    _installerPathBox.Text = dialog.SelectedPath;
                    AppendLog("已选择安装器保存位置: " + dialog.SelectedPath);
                }
            }

            private void OpenInstallerFolder()
            {
                var path = _installerPathBox.Text.Trim();
                if (string.IsNullOrWhiteSpace(path)) path = ModRoot;
                Directory.CreateDirectory(path);
                Process.Start(new ProcessStartInfo { FileName = path, UseShellExecute = true });
            }

            private void OpenModRoot()
            {
                Directory.CreateDirectory(ModRoot);
                Process.Start(new ProcessStartInfo { FileName = ModRoot, UseShellExecute = true });
            }

            private void OpenCustomDictionary()
            {
                EnsureCustomDictionaryFile();
                Process.Start(new ProcessStartInfo { FileName = CustomDictionaryFile, UseShellExecute = true });
            }

            private void SaveInstallerCopy()
            {
                RunBusy("正在保存安装器副本...", () =>
                {
                    var targetDir = _installerPathBox.Text.Trim();
                    if (string.IsNullOrWhiteSpace(targetDir)) targetDir = ModRoot;
                    Directory.CreateDirectory(targetDir);
                    var currentExe = Process.GetCurrentProcess().MainModule.FileName;
                    var targetExe = Path.Combine(targetDir, "SeleZenZHMod.exe");
                    if (!string.Equals(Path.GetFullPath(currentExe), Path.GetFullPath(targetExe), StringComparison.OrdinalIgnoreCase))
                    {
                        File.Copy(currentExe, targetExe, true);
                    }
                    AppendLog("安装器已保存到: " + targetExe);
                });
            }

            private void ExecuteSelected()
            {
                RunBusy("正在执行所选操作...", () =>
                {
                    var launcherRoot = GetValidLauncherRoot();
                    var asarPath = Path.Combine(launcherRoot, "resources", "app.asar");
                    var exePath = Path.Combine(launcherRoot, LauncherExeName);

                    if (!_installPatchBox.Checked && !_startAfterBox.Checked)
                    {
                        AppendLog("未选择任何操作。请勾选“安装/更新中文增强补丁”或“完成后启动客户端”。");
                        return;
                    }

                    if (_installPatchBox.Checked) InstallPatchForGui(launcherRoot, asarPath);
                    if (_startAfterBox.Checked)
                    {
                        StartLauncherNoWait(exePath);
                        AppendLog("客户端已启动。");
                    }
                });
            }

            private void CheckStatus()
            {
                RunBusy("正在检查状态...", () =>
                {
                    var launcherRoot = GetValidLauncherRoot();
                    var asarPath = Path.Combine(launcherRoot, "resources", "app.asar");
                    var exePath = Path.Combine(launcherRoot, LauncherExeName);
                    var status = GetPatchStatus(asarPath);
                    var version = File.Exists(exePath) ? FileVersionInfo.GetVersionInfo(exePath).ProductVersion : "";
                    var settings = ReadJsonObject(SettingsPath);
                    var site = settings != null && settings.ContainsKey("siteTranslation") ? settings["siteTranslation"] as Dictionary<string, object> : null;
                    AppendLog("客户端路径: " + launcherRoot);
                    AppendLog("客户端版本: " + (string.IsNullOrWhiteSpace(version) ? "未知" : version));
                    AppendLog("补丁状态: " + (status.IsPatched ? "已安装" : "需要安装/更新"));
                    AppendLog("缺失标记: " + (status.IsPatched ? "-" : string.Join(", ", status.Markers.Where(kv => !kv.Value).Select(kv => kv.Key))));
                    AppendLog("网站 AI: " + (GetBoolValue(site, "enabled", false) ? "已启用" : "未启用"));
                    AppendLog("DeepSeek Key: " + (HasEncryptedSiteTranslation(site) ? "已保存" : "未保存"));
                    AppendLog("Key 备份: " + (HasEncryptedKeyBackup() ? "有" : "没有"));
                });
            }

            private void StartLauncherFromGui()
            {
                RunBusy("正在启动客户端...", () =>
                {
                    var launcherRoot = GetValidLauncherRoot();
                    StartLauncherNoWait(Path.Combine(launcherRoot, LauncherExeName));
                    AppendLog("客户端已启动。");
                });
            }

            private void RestoreOfficialFromGui()
            {
                if (MessageBox.Show(this, "确定要恢复最近一次官方 app.asar 备份吗？恢复后中文增强会失效，之后可以再安装回来。", "恢复官方包", MessageBoxButtons.YesNo, MessageBoxIcon.Warning) != DialogResult.Yes) return;
                RunBusy("正在恢复官方包...", () =>
                {
                    var launcherRoot = GetValidLauncherRoot();
                    StopLauncherProcesses();
                    RestoreLatestOfficialAsar(Path.Combine(launcherRoot, "resources", "app.asar"));
                    AppendLog("已恢复最近一次官方 app.asar。");
                });
            }

            private void InstallPatchForGui(string launcherRoot, string asarPath)
            {
                var status = GetPatchStatus(asarPath);
                if (!status.IsPatched)
                {
                    AppendLog("正在安装/更新中文增强补丁...");
                    WriteUpdateDetectionLog(launcherRoot, asarPath, status);
                    StopLauncherProcesses();
                    if (!status.HasAnyPatch) BackupOfficialAsar(launcherRoot, asarPath);
                    PatchAsar(asarPath);
                    RestoreSettingsBackupOrDefaults();
                    AppendLog("中文增强补丁已安装。");
                }
                else
                {
                    RestoreSettingsBackupOrDefaults();
                    AppendLog("当前客户端已包含最新中文增强补丁。");
                }
                BackupSettingsIfUseful();
            }

            private string GetValidLauncherRoot()
            {
                var launcherRoot = NormalizeLauncherRoot(_launcherRootBox.Text.Trim());
                if (!IsValidLauncherRoot(launcherRoot))
                {
                    throw new InvalidOperationException("客户端目录不正确。请选择包含 SeleZen Games Launcher.exe 和 resources\\app.asar 的目录。");
                }
                return launcherRoot;
            }

            private void RunBusy(string status, Action action)
            {
                SetBusy(true);
                SetStatus(status);
                Task.Run(() =>
                {
                    try
                    {
                        action();
                        SetStatus("完成");
                    }
                    catch (Exception ex)
                    {
                        Log("GUI ERROR " + ex);
                        AppendLog("失败: " + ex.Message);
                        SetStatus("失败: " + ex.Message);
                    }
                    finally
                    {
                        SetBusy(false);
                    }
                });
            }

            private void SetBusy(bool busy)
            {
                if (InvokeRequired)
                {
                    BeginInvoke(new Action<bool>(SetBusy), busy);
                    return;
                }
                foreach (var control in _busyControls) control.Enabled = !busy;
                UseWaitCursor = busy;
            }

            private void SetStatus(string text)
            {
                if (InvokeRequired)
                {
                    BeginInvoke(new Action<string>(SetStatus), text);
                    return;
                }
                _statusLabel.Text = text;
            }

            private void AppendLog(string message)
            {
                if (InvokeRequired)
                {
                    BeginInvoke(new Action<string>(AppendLog), message);
                    return;
                }
                _logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + message + Environment.NewLine);
            }
        }
    }

    internal sealed class Options
    {
        public string LauncherRoot;
        public bool Status;
        public bool Restore;
        public bool InstallOnly;
        public bool NoStart;
        public bool Verbose;

        public static Options Parse(string[] args)
        {
            var options = new Options();
            for (var i = 0; i < args.Length; i++)
            {
                var arg = args[i];
                if (arg == "--launcher-root" && i + 1 < args.Length) options.LauncherRoot = args[++i];
                else if (arg == "--status") options.Status = true;
                else if (arg == "--restore") options.Restore = true;
                else if (arg == "--install-only") options.InstallOnly = true;
                else if (arg == "--no-start") options.NoStart = true;
                else if (arg == "--verbose") options.Verbose = true;
                else if (arg == "--help" || arg == "-h")
                {
                    Console.WriteLine("SeleZenZHMod.exe [--status] [--install-only] [--restore] [--no-start] [--launcher-root <path>] [--verbose]");
                    Environment.Exit(0);
                }
            }
            return options;
        }
    }

    internal sealed class PatchStatus
    {
        public readonly Dictionary<string, bool> Markers;
        public PatchStatus(Dictionary<string, bool> markers) { Markers = markers; }
        public bool IsPatched { get { return Markers.Values.All(v => v); } }
        public bool HasAnyPatch { get { return Markers.Values.Any(v => v); } }
    }

    internal sealed class AsarArchive
    {
        private readonly AsarNode _root;
        private readonly string _asarPath;
        private readonly long _dataStart;
        public readonly Dictionary<string, byte[]> Files;

        private AsarArchive(string asarPath, AsarNode root, long dataStart, Dictionary<string, byte[]> files)
        {
            _asarPath = asarPath;
            _root = root;
            _dataStart = dataStart;
            Files = files;
        }

        public static AsarArchive Read(string asarPath)
        {
            var bytes = File.ReadAllBytes(asarPath);
            if (bytes.Length < 16) throw new InvalidDataException("Invalid asar file.");
            var headerPayloadSize = BitConverter.ToUInt32(bytes, 8);
            var headerStringSize = BitConverter.ToUInt32(bytes, 12);
            var headerJson = Encoding.UTF8.GetString(bytes, 16, (int)headerStringSize);
            AsarNode root;
            using (var doc = JsonDocument.Parse(headerJson))
            {
                root = AsarNode.FromJson(doc.RootElement);
            }
            var dataStart = 12L + headerPayloadSize;
            var files = new Dictionary<string, byte[]>(StringComparer.Ordinal);
            CollectFiles(root, "", files, bytes, dataStart, asarPath);
            return new AsarArchive(asarPath, root, dataStart, files);
        }

        private static void CollectFiles(AsarNode node, string prefix, Dictionary<string, byte[]> files, byte[] asarBytes, long dataStart, string asarPath)
        {
            if (node.Files != null)
            {
                foreach (var kv in node.Files)
                {
                    var childPath = string.IsNullOrEmpty(prefix) ? kv.Key : prefix + "/" + kv.Key;
                    CollectFiles(kv.Value, childPath, files, asarBytes, dataStart, asarPath);
                }
                return;
            }
            if (node.Unpacked)
            {
                var unpackedPath = Path.Combine(asarPath + ".unpacked", prefix.Replace('/', Path.DirectorySeparatorChar));
                files[prefix] = File.Exists(unpackedPath) ? File.ReadAllBytes(unpackedPath) : new byte[0];
                return;
            }
            var offset = long.Parse(node.Offset ?? "0");
            var data = new byte[node.Size];
            Buffer.BlockCopy(asarBytes, checked((int)(dataStart + offset)), data, 0, checked((int)node.Size));
            files[prefix] = data;
        }

        public string GetText(string path)
        {
            path = path.Replace('\\', '/');
            if (!Files.ContainsKey(path)) throw new FileNotFoundException("asar entry not found: " + path);
            return Encoding.UTF8.GetString(Files[path]);
        }

        public void SetText(string path, string text)
        {
            Files[path.Replace('\\', '/')] = new UTF8Encoding(false).GetBytes(text);
        }

        public void Write(string outputPath)
        {
            var ordered = new List<KeyValuePair<string, byte[]>>();
            UpdateTree(_root, "", ordered);
            var headerJson = SerializeHeader(_root);
            var headerBytes = new UTF8Encoding(false).GetBytes(headerJson);
            var payloadSize = 4 + headerBytes.Length + 1;
            var padding = (4 - (payloadSize % 4)) % 4;
            var headerPayloadSize = payloadSize + padding;

            using (var fs = new FileStream(outputPath, FileMode.Create, FileAccess.Write, FileShare.None))
            using (var bw = new BinaryWriter(fs, Encoding.UTF8))
            {
                bw.Write((uint)4);
                bw.Write((uint)(headerPayloadSize + 4));
                bw.Write((uint)headerPayloadSize);
                bw.Write((uint)headerBytes.Length);
                bw.Write(headerBytes);
                bw.Write((byte)0);
                for (var i = 0; i < padding; i++) bw.Write((byte)0);
                foreach (var kv in ordered)
                {
                    bw.Write(kv.Value);
                }
            }
        }

        private void UpdateTree(AsarNode node, string prefix, List<KeyValuePair<string, byte[]>> ordered)
        {
            if (node.Files != null)
            {
                foreach (var kv in node.Files)
                {
                    var childPath = string.IsNullOrEmpty(prefix) ? kv.Key : prefix + "/" + kv.Key;
                    UpdateTree(kv.Value, childPath, ordered);
                }
                return;
            }
            var data = Files.ContainsKey(prefix) ? Files[prefix] : new byte[0];
            node.Size = data.Length;
            node.Integrity = Integrity.For(data);
            if (node.Unpacked)
            {
                node.Offset = null;
                return;
            }
            var offset = ordered.Sum(kv => (long)kv.Value.Length);
            node.Offset = offset.ToString();
            ordered.Add(new KeyValuePair<string, byte[]>(prefix, data));
        }

        private static string SerializeHeader(AsarNode root)
        {
            using (var ms = new MemoryStream())
            {
                using (var writer = new Utf8JsonWriter(ms, new JsonWriterOptions { Indented = false }))
                {
                    root.WriteJson(writer);
                }
                return Encoding.UTF8.GetString(ms.ToArray());
            }
        }
    }

    internal sealed class AsarNode
    {
        public Dictionary<string, AsarNode> Files;
        public long Size;
        public string Offset;
        public bool Unpacked;
        public Integrity Integrity;

        public static AsarNode FromJson(JsonElement element)
        {
            var node = new AsarNode();
            if (element.TryGetProperty("files", out var filesElement))
            {
                node.Files = new Dictionary<string, AsarNode>(StringComparer.Ordinal);
                foreach (var prop in filesElement.EnumerateObject()) node.Files[prop.Name] = FromJson(prop.Value);
                return node;
            }
            if (element.TryGetProperty("size", out var size)) node.Size = size.GetInt64();
            if (element.TryGetProperty("offset", out var offset)) node.Offset = offset.GetString();
            if (element.TryGetProperty("unpacked", out var unpacked)) node.Unpacked = unpacked.GetBoolean();
            if (element.TryGetProperty("integrity", out var integrity)) node.Integrity = Integrity.FromJson(integrity);
            return node;
        }

        public void WriteJson(Utf8JsonWriter writer)
        {
            writer.WriteStartObject();
            if (Files != null)
            {
                writer.WritePropertyName("files");
                writer.WriteStartObject();
                foreach (var kv in Files)
                {
                    writer.WritePropertyName(kv.Key);
                    kv.Value.WriteJson(writer);
                }
                writer.WriteEndObject();
            }
            else
            {
                writer.WriteNumber("size", Size);
                if (Integrity != null) Integrity.WriteJson(writer);
                if (Unpacked)
                {
                    writer.WriteBoolean("unpacked", true);
                }
                else
                {
                    writer.WriteString("offset", Offset ?? "0");
                }
            }
            writer.WriteEndObject();
        }
    }

    internal sealed class Integrity
    {
        public string Algorithm;
        public string Hash;
        public int BlockSize;
        public List<string> Blocks;

        public static Integrity FromJson(JsonElement element)
        {
            var integrity = new Integrity();
            if (element.TryGetProperty("algorithm", out var algorithm)) integrity.Algorithm = algorithm.GetString();
            if (element.TryGetProperty("hash", out var hash)) integrity.Hash = hash.GetString();
            if (element.TryGetProperty("blockSize", out var blockSize)) integrity.BlockSize = blockSize.GetInt32();
            integrity.Blocks = new List<string>();
            if (element.TryGetProperty("blocks", out var blocks))
            {
                foreach (var block in blocks.EnumerateArray()) integrity.Blocks.Add(block.GetString());
            }
            return integrity;
        }

        public static Integrity For(byte[] data)
        {
            var blockSize = 4194304;
            var blocks = new List<string>();
            using (var sha = SHA256.Create())
            {
                if (data.Length == 0)
                {
                    blocks.Add(ToHex(sha.ComputeHash(data)));
                }
                else
                {
                    for (var offset = 0; offset < data.Length; offset += blockSize)
                    {
                        var count = Math.Min(blockSize, data.Length - offset);
                        blocks.Add(ToHex(sha.ComputeHash(data, offset, count)));
                    }
                }
                return new Integrity
                {
                    Algorithm = "SHA256",
                    Hash = ToHex(sha.ComputeHash(data)),
                    BlockSize = blockSize,
                    Blocks = blocks
                };
            }
        }

        public void WriteJson(Utf8JsonWriter writer)
        {
            writer.WritePropertyName("integrity");
            writer.WriteStartObject();
            writer.WriteString("algorithm", Algorithm ?? "SHA256");
            writer.WriteString("hash", Hash ?? "");
            writer.WriteNumber("blockSize", BlockSize == 0 ? 4194304 : BlockSize);
            writer.WritePropertyName("blocks");
            writer.WriteStartArray();
            foreach (var block in Blocks ?? new List<string>()) writer.WriteStringValue(block);
            writer.WriteEndArray();
            writer.WriteEndObject();
        }

        private static string ToHex(byte[] bytes)
        {
            var sb = new StringBuilder(bytes.Length * 2);
            foreach (var b in bytes) sb.Append(b.ToString("x2"));
            return sb.ToString();
        }
    }
}
