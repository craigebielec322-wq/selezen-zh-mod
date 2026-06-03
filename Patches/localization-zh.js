  // SELEZEN_ZH_MOD_LOCALIZATION
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
        openFolderTitle: '打开文件夹'
      },
      library: {
        title: '我的库',
        checkUpdates: '检查更新',
        launch: '启动',
        install: '安装',
        update: '更新',
        remove: '移除'
      },
      installModal: {
        desktopShortcut: '创建桌面快捷方式',
        startShortcut: '创建开始菜单快捷方式',
        installTo: '安装到:',
        configure: '配置'
      },
      notifications: {
        title: '通知'
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

