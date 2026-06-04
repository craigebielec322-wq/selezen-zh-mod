  // SELEZEN_ZH_MOD_LOCALIZATION
  // SELEZEN_ZH_MOD_LOCALIZATION_V7
  function __selezenZhClone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function __selezenZhMerge(target, source) {
    Object.keys(source || {}).forEach(key => {
      const value = source[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        target[key] = __selezenZhMerge(target[key] || {}, value);
      } else {
        target[key] = value;
      }
    });
    return target;
  }

  if (LOCALES.ru && LOCALES.ru.languages) LOCALES.ru.languages['zh-CN'] = '简体中文';
  if (LOCALES.en && LOCALES.en.languages) LOCALES.en.languages['zh-CN'] = 'Simplified Chinese';
  LOCALES['zh-CN'] = __selezenZhMerge(__selezenZhClone(LOCALES.en), {
    languages: {
      ru: '俄语',
      en: '英语',
      'zh-CN': '简体中文'
    },
    common: {
      open: '打开',
      change: '更改',
      cancel: '取消',
      install: '安装',
      add: '添加',
      choose: '选择',
      save: '保存',
      reset: '重置',
      clear: '清除',
      clearAll: '全部清除',
      delete: '删除',
      close: '关闭',
      check: '检查',
      download: '下载',
      continue: '继续',
      pause: '暂停',
      start: '开始',
      settings: '设置',
      notifications: '通知',
      game: '游戏',
      torrent: '种子',
      notSelected: '未选择',
      notSet: '未设置',
      unknown: '未知'
    },
    shell: {
      nav: {
        backTitle: '后退',
        forwardTitle: '前进',
        reloadTitle: '刷新',
        site: '网站',
        available: '可安装',
        library: '我的库',
        minimize: '最小化',
        maximize: '最大化',
        close: '关闭'
      },
      sidebar: {
        ariaLabel: '侧边导航',
        downloads: '下载',
        notifications: '通知中心',
        settings: '设置'
      },
      settings: {
        title: '设置',
        languageTitle: '语言',
        languageNote: '切换启动器界面语言。',
        currentVersion: '当前版本: {version}',
        versionUnknown: '版本未知',
        checkUpdates: '检查更新',
        updateStatusDefault: '可以检查启动器更新。',
        autoLaunchTitle: '开机启动',
        autoLaunchNote: '登录 Windows 后自动启动启动器。',
        autoLaunchOn: '已开启',
        autoLaunchOff: '已关闭',
        gamesDirectory: '游戏目录',
        gamesPathMissing: '未设置游戏目录',
        downloadFolder: '下载目录',
        cleanGames: '清理游戏目录',
        cleanGamesNote: '移除不存在或无效的库记录。',
        clearDb: '清空库数据库',
        clearDbNote: '重置本地游戏库数据。',
        clearHistoryTitle: '下载历史',
        clearHistoryNote: '清除已完成和历史下载记录。',
        torrentTitle: '种子下载',
        torrentNote: '调整种子引擎和连接参数。',
        torrentRuntimePort: '种子端口',
        torrentPort: '监听端口',
        torrentPortAuto: '自动',
        torrentStrategy: '下载策略',
        torrentStrategySequential: '顺序下载',
        torrentStrategyRarest: '优先稀有分块',
        torrentStrategyNote: '通常保持默认即可。',
        torrentPeerDiscovery: '节点发现',
        torrentPeerDiscoveryNote: '启用 DHT、PEX、LSD 等节点发现。',
        torrentTrackerPeers: 'Tracker 节点',
        torrentTrackerPeersNote: '从 Tracker 获取更多连接。',
        torrentTrackers: '额外 Tracker',
        torrentTrackersNote: '每行一个 Tracker 地址。',
        torrentExtraTrackers: '额外 Tracker',
        torrentMaxConnections: '最大连接数',
        torrentMaxConnectionsNote: '限制全局连接数量。',
        torrentMaxWebConns: '最大 Web 连接',
        torrentMaxWebConnsNote: '限制 Web 种子连接。',
        torrentUploadSlots: '上传槽位',
        torrentUploadSlotsNote: '限制同时上传连接。',
        torrentDownloadLimit: '下载限速',
        torrentDownloadLimitNote: '留空或 -1 表示不限速。',
        torrentUploadLimit: '上传限速',
        torrentUploadLimitNote: '留空或 -1 表示不限速。',
        torrentRuntime: {
          current: '当前引擎: {runtime}',
          currentWithDhtSuffix: '当前引擎: {runtime}，DHT {dht}',
          unavailable: '种子引擎不可用',
          helperUnavailable: '辅助进程不可用',
          helperRestartRequired: '需要重启辅助进程',
          helperRebuildRequired: '需要重新构建辅助进程',
          pendingRestart: '重启后生效'
        },
        update: {
          checking: '正在检查更新...',
          none: '已是最新版本',
          available: '发现新版本: {version}',
          downloading: '正在下载更新...',
          progress: '正在下载更新: {percent}%',
          downloaded: '更新已下载',
          downloadFailed: '下载更新失败',
          checkError: '检查更新失败',
          updateError: '更新失败'
        },
        alerts: {
          savePathsRequired: '请先设置游戏目录和下载目录。',
          saveSettingsFailed: '保存设置失败。',
          applySettingsFailed: '应用设置失败。',
          autoLaunchFailed: '设置开机启动失败。',
          saveTorrentFailed: '保存种子设置失败。',
          resetTorrentConfirm: '要重置种子设置吗？',
          resetTorrentFailed: '重置种子设置失败。',
          cleanGamesConfirm: '要清理无效游戏记录吗？',
          clearDbConfirm: '要清空本地库数据库吗？'
        },
        toasts: {
          savedTitle: '设置已保存',
          savedStatus: '完成',
          savedSubtitleDone: '设置已经生效。',
          savedSubtitlePending: '部分设置将在重启后生效。',
          resetTitle: '已重置',
          resetStatus: '完成'
        },
        siteTranslationTitle: '网站 AI 翻译',
        siteTranslationNote: '选择简体中文时，通过 DeepSeek 翻译内嵌网站。',
        siteTranslationNow: '翻译当前网站',
        siteTranslationTest: '测试',
        siteTranslationEnabledTitle: '网站翻译',
        siteTranslationEnabled: '翻译网站可见文本',
        siteTranslationApiKey: 'DeepSeek API Key',
        siteTranslationApiKeyPlaceholder: '输入你的 DeepSeek API Key',
        siteTranslationKeyMissing: '未保存密钥',
        siteTranslationKeySaved: '密钥已保存',
        siteTranslationModel: 'DeepSeek 模型',
        siteTranslationModelNote: 'Flash 更快更省；复杂文本可切换到 Pro。',
        siteTranslationCache: '翻译缓存',
        siteTranslationClearCache: '清除缓存',
        siteTranslationStatusIdle: '就绪',
        siteTranslationCacheStatus: '缓存: {count}',
        siteTranslationSaving: '正在保存...',
        siteTranslationSaved: '翻译设置已保存',
        siteTranslationTesting: '正在测试 DeepSeek...',
        siteTranslationTestOk: 'DeepSeek 已响应',
        siteTranslationCacheCleared: '翻译缓存已清除',
        siteTranslationManualStarting: '正在启动当前页面翻译...',
        siteTranslationManualStarted: '当前页面翻译已启动',
        siteTranslationQueued: '发现待翻译文本: {count}',
        siteTranslationRequesting: '正在发送到 DeepSeek: {count}',
        siteTranslationApplied: '已应用翻译: {count}',
        siteTranslationInactive: '网站翻译未开启，或当前语言不是简体中文',
        siteTranslationError: '错误: {error}'
      },
      downloads: {
        title: '下载',
        addLinkTitle: '添加链接',
        addFileTitle: '添加文件',
        removeTitle: '移除',
        resumeTitle: '继续',
        pauseTitle: '暂停',
        recheckTitle: '重新校验',
        openFolderTitle: '打开文件夹',
        actionsFailed: '操作失败',
        columnsReset: '重置列',
        detailSubtitleDefault: '选择一个下载任务查看详情',
        navTooltip: {
          default: '下载',
          active: '下载中',
          hasTasks: '有下载任务',
          errors: '下载出错'
        },
        actions: {
          start: '开始',
          pause: '暂停',
          openFolder: '打开文件夹',
          recheckHash: '重新校验'
        },
        addModal: {
          title: '添加下载',
          close: '关闭',
          manualPlaceholder: '粘贴 Magnet、种子链接或下载链接',
          filePlaceholder: '选择 .torrent 文件',
          pickFile: '选择文件',
          note: '选择保存目录后开始下载。'
        },
        deleteModal: {
          title: '移除下载任务',
          deleteFiles: '同时删除磁盘文件',
          confirm: '移除'
        },
        detail: {
          waitingSelection: '选择一个下载任务',
          notSelected: '未选择下载任务',
          pause: '暂停',
          resume: '继续',
          recheck: '重新校验',
          status: '状态',
          size: '大小',
          speed: '速度',
          source: '来源',
          sourceManual: '手动添加',
          sourceLibrary: '我的库',
          notePath: '路径',
          notePeers: '连接',
          noteId: '任务 ID',
          noteRawStatus: '原始状态'
        },
        filters: {
          all: '全部',
          downloading: '下载中',
          paused: '已暂停',
          completed: '已完成',
          seeding: '做种中',
          checking: '校验中',
          finalizing: '收尾中',
          error: '错误',
          library: '我的库',
          manual: '手动添加'
        },
        headers: {
          name: '名称',
          status: '状态',
          progress: '进度',
          size: '大小',
          down: '下载',
          up: '上传',
          seeds: '做种',
          peers: '连接',
          eta: '剩余',
          added: '添加时间'
        },
        peersShort: {
          seed: '种',
          peer: '连'
        },
        stats: {
          dht: 'DHT',
          peers: '连接'
        },
        status: {
          downloading: '下载中',
          paused: '已暂停',
          completed: '已完成',
          seeding: '做种中',
          checking: '校验中',
          finalizing: '收尾中',
          error: '错误',
          history: '历史'
        }
      },
      library: {
        title: '我的库',
        checkUpdates: '检查更新',
        launch: '启动',
        install: '安装',
        update: '更新',
        remove: '移除',
        addExternal: '添加本地游戏',
        searchPlaceholder: '搜索我的库...',
        emptyTitle: '库里还没有游戏',
        emptyOpenCatalog: '去网站找游戏',
        statusDefault: '选择一个游戏',
        versionPrefix: '版本',
        sizeProgress: '{downloaded} / {total}',
        installDirMissing: '未设置游戏安装目录',
        installDirPrefix: '游戏目录: {path}',
        pathUnset: '未设置路径',
        localGame: '本地游戏',
        externalNote: '这是手动添加的本地游戏。',
        externalPrimaryNote: '使用本地可执行文件启动。',
        openFolder: '打开文件夹',
        openPage: '打开页面',
        changeExe: '更改启动文件',
        copy: '复制',
        posterAlt: '{name} 海报',
        status: {
          installed: '已安装',
          notInstalled: '未安装',
          downloading: '下载中',
          installing: '安装中',
          checking: '校验中',
          finalizing: '收尾中',
          update: '更新中',
          updateAvailable: '有更新',
          broken: '文件缺失',
          error: '错误',
          selectedMissing: '未选择'
        },
        primary: {
          defaultLabel: '选择游戏',
          defaultNote: '从左侧选择一个游戏。',
          downloadLabel: '下载',
          downloadNote: '打开网站下载游戏。',
          openDownloadsLabel: '查看下载',
          openDownloadsNote: '此游戏正在下载。',
          reinstallLabel: '重新安装',
          reinstallNote: '重新安装这个游戏。',
          playLabel: '启动',
          playNote: '启动已安装的游戏。',
          updateLabel: '更新',
          updateNote: '安装可用更新。',
          updateNoteWithVersion: '更新到 {version}。'
        },
        progress: {
          downloading: '下载中',
          checking: '校验中',
          checkingWithPercent: '校验中 {percent}%',
          finalizing: '正在收尾',
          finalizingWithPercent: '正在收尾 {percent}%'
        },
        updateCheck: {
          checking: '正在检查更新...',
          noUpdates: '没有可用更新',
          noUpdatesAt: '没有可用更新，检查时间 {time}',
          error: '检查更新失败'
        },
        alerts: {
          removeFilesConfirm: '要从库中移除并删除游戏文件吗？',
          removeExternalConfirm: '要从库中移除这个本地游戏吗？',
          filesAvailable: '文件校验完成。',
          fileCheckUnavailable: '暂时无法校验文件。',
          copyPathFailed: '复制路径失败'
        },
        clipboard: {
          status: '已复制',
          copiedPath: '路径已复制'
        }
      },
      installModal: {
        desktopShortcut: '创建桌面快捷方式',
        startShortcut: '创建开始菜单快捷方式',
        installTo: '安装到:',
        configure: '配置'
      },
      notifications: {
        title: '通知',
        empty: '暂无通知',
        delete: '删除',
        defaultStatus: '通知中心'
      },
      setup: {
        title: '选择目录',
        note: '设置游戏下载和安装目录。',
        gamesDir: '游戏目录',
        downloadsDir: '下载目录',
        confirm: '确认',
        skip: '跳过'
      }
    },
    sitePreload: {
      button: {
        install: '安装',
        installed: '已安装',
        update: '更新',
        checking: '正在检查...',
        launchingUpdate: '正在启动更新...',
        updating: '正在更新...'
      }
    },
    main: {
      siteTranslation: {
        errors: {
          safeStorageUnavailable: '当前系统无法安全保存 API Key',
          apiKeyMissing: '未保存 DeepSeek API Key',
          timeout: 'DeepSeek 请求超时'
        },
        testSuccess: 'DeepSeek 已响应'
      }
    }
  });
