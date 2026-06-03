    // SELEZEN_ZH_MOD_SHELL_TRANSLATION
    // SELEZEN_ZH_MOD_KEY_TRANSLATION_V2
    // SELEZEN_ZH_MOD_GENERAL_AI_V3
    // SELEZEN_ZH_MOD_DETAIL_FIRST_V4
    // SELEZEN_ZH_MOD_SMALL_CONTROLS_V5
    // SELEZEN_ZH_MOD_CUSTOM_DICTIONARY_V6
    const selezenZhMod = (() => {
      let config = { enabled: false, model: 'deepseek-v4-flash', hasKey: false, models: ['deepseek-v4-flash', 'deepseek-v4-pro'], cacheSize: 0 };
      let panelReady = false;
      let statusEl = null;
      let runningTranslation = false;

      function isZh() {
        return currentLanguage === 'zh-CN';
      }

      function setStatus(text) {
        if (statusEl) statusEl.textContent = text || '就绪';
      }

      function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
      }

      async function loadConfig() {
        try {
          const res = await window.electronAPI.siteTranslationGetConfig?.();
          if (res?.ok) config = { ...config, ...res };
        } catch (_) {}
        renderConfig();
        return config;
      }

      function ensurePanel() {
        if (panelReady || !settingsView) return;
        const host = settingsView.querySelector('.settings-form') || settingsView;
        if (!host || document.getElementById('site-translation-panel')) return;
        const group = document.createElement('div');
        group.className = 'settings-group';
        group.id = 'site-translation-panel';
        group.innerHTML = `
          <div class="settings-row">
            <div>
              <div>网站 AI 翻译</div>
              <div class="note">选择简体中文时，通过 DeepSeek 翻译内嵌网站正文和按钮。</div>
            </div>
            <label class="toggle-line"><input id="site-translation-enabled" type="checkbox" /> <span>启用</span></label>
          </div>
          <label class="settings-field settings-field-wide">
            <span>DeepSeek API Key</span>
            <input id="site-translation-api-key" class="search-box" type="password" autocomplete="off" placeholder="输入 DeepSeek API Key" />
            <span class="note" id="site-translation-key-status">未保存密钥</span>
          </label>
          <label class="settings-field settings-field-wide">
            <span>DeepSeek 模型</span>
            <select id="site-translation-model" class="search-box">
              <option value="deepseek-v4-flash">deepseek-v4-flash</option>
              <option value="deepseek-v4-pro">deepseek-v4-pro</option>
            </select>
            <span class="note">Flash 更快更省；Pro 可用于更复杂文本。</span>
          </label>
          <div class="settings-row">
            <div>
              <div>翻译缓存</div>
              <div class="note" id="site-translation-cache-status">缓存: 0</div>
              <div class="note" id="site-translation-status">就绪</div>
            </div>
            <div class="settings-actions">
              <button id="site-translation-save" class="accent" type="button">保存配置</button>
              <button id="site-translation-test" class="ghost" type="button">测试连接</button>
              <button id="site-translation-now" class="ghost" type="button">翻译当前网站</button>
              <button id="site-translation-clear-cache" class="ghost danger" type="button">清除缓存</button>
            </div>
          </div>
        `;
        host.appendChild(group);
        statusEl = group.querySelector('#site-translation-status');
        group.querySelector('#site-translation-save')?.addEventListener('click', saveConfig);
        group.querySelector('#site-translation-test')?.addEventListener('click', testConfig);
        group.querySelector('#site-translation-now')?.addEventListener('click', translateCurrentSiteNow);
        group.querySelector('#site-translation-clear-cache')?.addEventListener('click', clearCache);
        panelReady = true;
        renderConfig();
      }

      function renderConfig() {
        ensurePanel();
        const enabled = document.getElementById('site-translation-enabled');
        const model = document.getElementById('site-translation-model');
        const keyStatus = document.getElementById('site-translation-key-status');
        const cacheStatus = document.getElementById('site-translation-cache-status');
        if (enabled) enabled.checked = !!config.enabled;
        if (model) model.value = config.model || 'deepseek-v4-flash';
        if (keyStatus) keyStatus.textContent = config.hasKey ? '密钥已保存；留空不会覆盖' : '未保存密钥';
        if (cacheStatus) {
          const customCount = Number(config.customDictionaryCount || 0);
          const customError = config.customDictionaryError ? '，词典错误' : '';
          cacheStatus.textContent = `缓存: ${config.cacheSize || 0}，自定义词典: ${customCount}${customError}`;
        }
      }

      async function saveConfig() {
        const enabled = !!document.getElementById('site-translation-enabled')?.checked;
        const model = document.getElementById('site-translation-model')?.value || 'deepseek-v4-flash';
        const keyInput = document.getElementById('site-translation-api-key');
        const apiKey = String(keyInput?.value || '').trim();
        setStatus('正在保存...');
        const payload = { enabled, model };
        if (apiKey) payload.apiKey = apiKey;
        const res = await window.electronAPI.siteTranslationSetConfig?.(payload);
        if (res?.ok) {
          config = { ...config, ...res };
          if (keyInput) keyInput.value = '';
          renderConfig();
          setStatus('翻译设置已保存');
        } else {
          setStatus(`错误: ${res?.error || '保存失败'}`);
        }
      }

      async function testConfig() {
        setStatus('正在测试 DeepSeek...');
        const res = await window.electronAPI.siteTranslationTest?.();
        setStatus(res?.ok ? 'DeepSeek 已响应' : `错误: ${res?.error || '测试失败'}`);
      }

      async function clearCache() {
        const res = await window.electronAPI.siteTranslationClearCache?.();
        if (res?.ok) config = { ...config, ...res };
        renderConfig();
        setStatus('翻译缓存已清除');
      }

      function keySiteTranslationRuntime(payloadJson) {
        const payload = JSON.parse(payloadJson || '{}');
        const enabled = !!payload.enabled;
        const entries = Object.entries(payload.entries || {})
          .filter(([source]) => source)
          .sort((a, b) => b[0].length - a[0].length);
        const map = new Map(entries);
        const russianTextRe = /[А-Яа-яЁё]/;
        const russianMonths = {
          января: 1,
          февраля: 2,
          марта: 3,
          апреля: 4,
          мая: 5,
          июня: 6,
          июля: 7,
          августа: 8,
          сентября: 9,
          октября: 10,
          ноября: 11,
          декабря: 12
        };
        const originals = window.__selezenZhKeyOriginals || new WeakMap();
        window.__selezenZhKeyOriginals = originals;

        function normalize(value) {
          return String(value || '').replace(/\s+/g, ' ').trim();
        }

        function translate(text) {
          const normalized = normalize(text);
          if (map.has(normalized)) return map.get(normalized);
          if (!normalized || !russianTextRe.test(normalized)) return '';
          let next = normalized.replace(/\b(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(\d{4})\b/gi, (_match, day, month, year) => {
            const monthNumber = russianMonths[String(month || '').toLowerCase()] || month;
            return `${year}年${monthNumber}月${Number(day)}日`;
          });
          entries.forEach(([source, target]) => {
            next = next.split(source).join(target);
          });
          return next !== normalized && /[\u4e00-\u9fff]/.test(next) ? next : '';
        }

        function isAllowedTorrentControl(element) {
          return !!element?.closest?.('.torrent-download-btn, .torrent-magnet-btn, .torrent-older__toggle, .dynamic-release-description-toggle, .torrent-actions, .torrent-download-wrap, .keep-action, .keep-full_link, .center-t');
        }

        function isIgnored(element) {
          if (!element) return true;
          if (element.closest?.('.torrent-text') && !isAllowedTorrentControl(element)) return true;
          return !!element.closest?.('script, style, noscript, svg, canvas, code, pre, textarea, input, select, option, .keep-detal_text, .dynamic-release-description-text');
        }

        if (!enabled) {
          let restored = 0;
          document.querySelectorAll('[data-selezen-zh-key="1"]').forEach(node => {
            const original = node.getAttribute('data-selezen-zh-original');
            if (original !== null) {
              node.textContent = original;
              node.removeAttribute('data-selezen-zh-key');
              node.removeAttribute('data-selezen-zh-original');
              restored += 1;
            }
          });
          document.querySelectorAll('[data-selezen-zh-original-title], [data-selezen-zh-original-aria-label], [data-selezen-zh-original-alt], [data-selezen-zh-original-placeholder], [data-selezen-zh-original-data-show], [data-selezen-zh-original-data-hide]').forEach(element => {
            ['title', 'aria-label', 'alt', 'placeholder', 'data-show', 'data-hide'].forEach(attr => {
              const originalAttrName = `data-selezen-zh-original-${attr.replace(/[^a-z0-9_-]/gi, '-')}`;
              const original = element.getAttribute(originalAttrName);
              if (original !== null) {
                element.setAttribute(attr, original);
                element.removeAttribute(originalAttrName);
                restored += 1;
              }
            });
          });
          return { ok: true, restored };
        }

        const filters = window.NodeFilter || { SHOW_TEXT: 4, FILTER_REJECT: 2, FILTER_ACCEPT: 1 };
        let count = 0;
        try {
          const walker = document.createTreeWalker(document.body || document.documentElement, filters.SHOW_TEXT, {
            acceptNode(node) {
              const parent = node.parentElement;
              if (!parent || isIgnored(parent)) return filters.FILTER_REJECT;
              const text = node.nodeValue || '';
              if (!russianTextRe.test(text) || normalize(text).length > 1600) return filters.FILTER_REJECT;
              return filters.FILTER_ACCEPT;
            }
          });
          let node = walker.nextNode();
          while (node) {
            const parent = node.parentElement;
            const original = originals.get(node) || node.nodeValue || '';
            const translated = translate(original);
            if (translated && parent) {
              originals.set(node, original);
              parent.setAttribute('data-selezen-zh-key', '1');
              parent.setAttribute('data-selezen-zh-original', original);
              node.nodeValue = translated;
              count += 1;
            }
            node = walker.nextNode();
          }
          const attrNames = ['title', 'aria-label', 'alt', 'placeholder', 'data-show', 'data-hide'];
          attrNames.forEach(attr => {
            document.querySelectorAll(`[${attr}]`).forEach(element => {
              try {
                if (isIgnored(element) && !isAllowedTorrentControl(element)) return;
                const originalAttrName = `data-selezen-zh-original-${attr.replace(/[^a-z0-9_-]/gi, '-')}`;
                const original = element.getAttribute(originalAttrName) || element.getAttribute(attr) || '';
                const translated = translate(original);
                if (!translated) return;
                if (!element.hasAttribute(originalAttrName)) element.setAttribute(originalAttrName, original);
                element.setAttribute(attr, translated);
                count += 1;
              } catch (_) {}
            });
          });
        } catch (_) {}
        return { ok: true, count };
      }

      const keySiteFallbackTranslations = {
        'Главная': '首页',
        'Игры': '游戏',
        'Фильмы': '电影',
        'Лаунчер': '启动器',
        'Подборки': '合集',
        'Лучшее': '精选',
        'Расширенный поиск': '高级搜索',
        'О сайте': '关于本站',
        'Контакты': '联系方式',
        'Общие правила': '通用规则',
        'Рекламодателям': '广告合作',
        'Издателям': '发行商',
        'VR игры': 'VR 游戏',
        'Случайная игра': '随机游戏',
        'Стол заказов': '求资源',
        'Лучшее за неделю': '本周精选',
        'Лучшее за месяц': '本月精选',
        'Лучшее за год': '年度精选',
        'Лучшее за всё время': '历史精选',
        'Лучшие игры 2026 года': '2026 年最佳游戏',
        'Лучшие игры 2025 года': '2025 年最佳游戏',
        'Последние обновления': '最新更新',
        'Игры по жанрам': '按类型浏览游戏',
        'Игры по годам': '按年份浏览游戏',
        'Репакеры': '整合作者',
        'Горячие новинки': '热门新品',
        'игры с гипервизором': '带 Hypervisor 的游戏',
        'Игры с гипервизором': '带 Hypervisor 的游戏',
        'Входит в топ за месяц': '进入本月榜单',
        'Входит в топ  за месяц': '进入本月榜单',
        'Сейчас популярно': '当前热门',
        'Скачать игры на ПК через торрент': '通过种子下载 PC 游戏',
        'Скачать игры на ПК торрентом': '下载 PC 游戏种子',
        'Года': '年份',
        'Жанры': '类型',
        'Жанры и подборки': '类型与合集',
        'Типы и подборки': '类型与合集',
        'SeleZen Repack': 'SeleZen 整合版',
        'Repack by SeleZen': 'SeleZen 整合版',
        'Repack от SeleZen': 'SeleZen 整合版',
        'RePack от SeleZen': 'SeleZen 整合版',
        'RePack от': '整合制作',
        'Repack от': '整合制作',
        'Репак от': '整合制作',
        'Репак': '整合版',
        'репак': '整合版',
        'Repack': '整合版',
        'Лицензия | Portable | Scene': '正版 | 便携版 | Scene 版',
        'Лицензия': '正版',
        'Хит': '热门',
        'Доступные для установки': '可安装',
        'Ранний доступ': '抢先体验',
        'Предложить магазин': '推荐商店',
        'Трейлер': '预告片',
        'Смотреть трейлер': '观看预告片',
        'Видео': '视频',
        'Смотреть видео': '观看视频',
        'Скачать изображение': '下载图片',
        'Закрыть (Esc)': '关闭 (Esc)',
        'Закрыть': '关闭',
        'Следующее изображение': '下一张图片',
        'Предыдущее изображение': '上一张图片',
        'Просмотр слайдшоу': '幻灯片播放',
        'Полноэкранный режим': '全屏模式',
        'Включить / Выключить уменьшенные копии': '显示 / 隐藏缩略图',
        'Увеличить / Уменьшить': '放大 / 缩小',
        'Экшен': '动作',
        'Экшн': '动作',
        'Шутер': '射击',
        'Шутеры': '射击',
        'Приключения': '冒险',
        'Приключение': '冒险',
        'Ролевая игра': '角色扮演',
        'Ролевые игры': '角色扮演',
        'РПГ': '角色扮演',
        'Гонки': '竞速',
        'Симуляторы': '模拟',
        'Симулятор': '模拟',
        'Стратегии': '策略',
        'Стратегия': '策略',
        'Спорт': '体育',
        'Инди': '独立',
        'Хоррор': '恐怖',
        'Ужасы': '恐怖',
        'Выживание': '生存',
        'Открытый мир': '开放世界',
        'Песочница': '沙盒',
        'Кооператив': '合作',
        'Мультиплеер': '多人',
        'Одиночная игра': '单人',
        'Казуальные': '休闲',
        'Казуальные игры': '休闲游戏',
        'Головоломка': '解谜',
        'Файтинг': '格斗',
        'Платформер': '平台跳跃',
        'Тактика': '战术',
        'Стелс': '潜行',
        'MMO': 'MMO',
        'Аркада': '街机',
        'Поиск': '搜索',
        'Войти': '登录',
        'Логин': '登录名',
        'Имя пользователя': '用户名',
        'Пароль': '密码',
        'Забыли пароль': '忘记密码',
        'Войти в аккаунт': '登录账户',
        'Выйти': '退出登录',
        'Регистрация': '注册',
        'Зарегистрироваться': '注册',
        'Подтвердить': '确认',
        'Отмена': '取消',
        'Вставить': '粘贴',
        'Сохранить': '保存',
        'Удалить': '删除',
        'Загрузка. Пожалуйста, подождите...': '正在加载，请稍候...',
        'Скопировать': '复制',
        'Скопировано!': '已复制!',
        'Установить': '安装',
        'Установить игру': '安装游戏',
        'Скачать торрент': '下载种子',
        'Скачать репак от SeleZen': '下载 SeleZen 整合版',
        'Скачать репак от селезень': '下载 SeleZen 整合版',
        'Скачать Другие раздачи': '下载其他资源',
        'Скачать другие раздачи': '下载其他资源',
        'Другие раздачи': '其他资源',
        'Скачать SeleZen Launcher': '下载 SeleZen Launcher',
        'Скачать лаунчер': '下载启动器',
        'Скачать через лаунчер': '通过启动器下载',
        'Скачать': '下载',
        'Скачать игру': '下载游戏',
        'Скачать сейчас': '立即下载',
        'Показать старые версии': '显示旧版本',
        'Скрыть старые версии': '隐藏旧版本',
        'Старые версии': '旧版本',
        'Старые раздачи': '旧资源',
        'Magnet link': '磁力链接',
        'Seeders': '做种',
        'Peers': '连接',
        'Completed': '完成下载',
        'Button group': '按钮组',
        'Плохо': '很差',
        'Приемлемо': '一般',
        'Средне': '中等',
        'Хорошо': '好',
        'Отлично': '很好',
        'Подробнее': '详情',
        'Развернуть >>': '展开 >>',
        'Развернуть': '展开',
        'Свернуть <<': '收起 <<',
        'Свернуть': '收起',
        'Описание': '简介',
        'Описание:': '简介:',
        'Описание игры': '游戏简介',
        'Об игре': '游戏简介',
        'Подробное описание': '详细简介',
        'Информация': '信息',
        'Информация:': '信息:',
        'Подробная информация': '详细信息',
        'Основная информация': '基础信息',
        'Дата выхода': '发行日期',
        'Дата релиза': '发行日期',
        'Год выпуска': '发行年份',
        'Дата': '日期',
        'Год': '年份',
        'Релиз': '发布',
        'Добавлено': '已添加',
        'Добавлено:': '已添加:',
        'Добавлена': '已添加',
        'Добавлен': '已添加',
        'Добавлены': '已添加',
        'Добавлен Repack версии': '已添加整合版版本',
        'Добавлен репак версии': '已添加整合版版本',
        'Добавлена репак с таблеткой': '已添加含破解补丁的整合版',
        'Добавлен репак от селезень': '已添加 SeleZen 整合版',
        'Добавлена репак от селезень': '已添加 SeleZen 整合版',
        'обновлено до версии': '已更新至版本',
        'Обновлено до версии': '已更新至版本',
        'Обновлёно до версии': '已更新至版本',
        'Обновлено:': '已更新:',
        'Обновлено': '已更新',
        'Обновлёно': '已更新',
        'Последнее обновление': '最后更新',
        'Обновление': '更新',
        'обновление': '更新',
        'Версия игры': '游戏版本',
        'Версия': '版本',
        'Жанры': '类型',
        'Жанр': '类型',
        'Стратегии': '策略',
        'Категория': '分类',
        'Категории': '分类',
        'Платформа': '平台',
        'Платформы': '平台',
        'Тип издания': '版本类型',
        'Тип релиза': '发布类型',
        'Неофициальный': '非官方',
        'Официальный': '官方',
        'Размер игры': '游戏大小',
        'Размер': '大小',
        'Таблетка': '破解补丁',
        'Таблэтка': '破解补丁',
        'Лекарство': '破解补丁',
        'с таблеткой': '含破解补丁',
        'релизной версии': '正式版',
        'полной новости': '完整新闻',
        'список изменений': '更新日志',
        'торрент клиента': '种子客户端',
        'Исправлены ошибки': '修复了错误',
        'добавлены улучшения': '加入了改进',
        'Вшита': '已集成',
        'Вшито': '已集成',
        'Не требуется': '不需要',
        'Требуется': '需要',
        'Присутствует': '已包含',
        'Отсутствует': '无',
        'Нет': '无',
        'Есть': '有',
        'Автор репака': '整合作者',
        'Автор релиза': '发布作者',
        'Разработчики': '开发商',
        'Разработчик': '开发商',
        'Издатели': '发行商',
        'Издатель': '发行商',
        'Языки интерфейса': '界面语言',
        'Язык интерфейса': '界面语言',
        'Языки озвучки': '语音语言',
        'Язык озвучки': '语音语言',
        'Озвучка': '语音',
        'Субтитры': '字幕',
        'Интерфейс': '界面',
        'Мультиплеер': '多人模式',
        'Ничего не вырезано / ничего не перекодировано': '无删减 / 无重新编码',
        'Время установки': '安装时间',
        'зависит от компьютера': '取决于电脑',
        '*Подробнее о языках можно узнать в описании торрент файла': '*更多语言信息可在种子文件说明中查看',
        'Подробнее о языках можно узнать в описании торрент файла': '更多语言信息可在种子文件说明中查看',
        'Системные требования': '系统需求',
        'Минимальные требования': '最低配置',
        'Рекомендуемые требования': '推荐配置',
        'Минимальные': '最低配置',
        'Рекомендуемые': '推荐配置',
        'Требуется 64-разрядные процессор и операционная система': '需要 64 位处理器和操作系统',
        'Требуются 64-разрядные процессор и операционная система': '需要 64 位处理器和操作系统',
        'Только для 64-разрядных процессоров и операционных систем': '仅支持 64 位处理器和操作系统',
        '64-разрядные процессор и операционная система': '64 位处理器和操作系统',
        '64-разрядная операционная система': '64 位操作系统',
        'Операционная система': '操作系统',
        'ОС': '操作系统',
        'Процессор': '处理器',
        'Процессоры': '处理器',
        'Оперативная память': '内存',
        'ОЗУ': '内存',
        'Видеокарта': '显卡',
        'Видеопамять': '显存',
        'Звуковая карта': '声卡',
        'DirectX': 'DirectX',
        'Сеть': '网络',
        'Широкополосное подключение к интернету': '宽带互联网连接',
        'Подключение к интернету': '互联网连接',
        'Место на диске': '磁盘空间',
        'Свободное место': '可用空间',
        'Место для хранения': '存储空间',
        'Дополнительные примечания': '附加说明',
        'Дополнительно': '附加说明',
        'или выше': '或更高',
        'или лучше': '或更高',
        'or higher': '或更高',
        'Required': '必需',
        'SSD Required': '需要 SSD',
        'Требуется SSD': '需要 SSD',
        'ГБ': 'GB',
        'МБ': 'MB',
        'КБ': 'KB',
        'Январь': '一月',
        'января': '一月',
        'янв.': '1月',
        'Февраль': '二月',
        'февраля': '二月',
        'февр.': '2月',
        'Март': '三月',
        'марта': '三月',
        'мар.': '3月',
        'Апрель': '四月',
        'апреля': '四月',
        'апр.': '4月',
        'Май': '五月',
        'мая': '五月',
        'Июнь': '六月',
        'июня': '六月',
        'июн.': '6月',
        'Июль': '七月',
        'июля': '七月',
        'июл.': '7月',
        'Август': '八月',
        'августа': '八月',
        'авг.': '8月',
        'Сентябрь': '九月',
        'сентября': '九月',
        'сен.': '9月',
        'сент.': '9月',
        'Октябрь': '十月',
        'октября': '十月',
        'окт.': '10月',
        'Ноябрь': '十一月',
        'ноября': '十一月',
        'нояб.': '11月',
        'Декабрь': '十二月',
        'декабря': '十二月',
        'дек.': '12月',
        'Русский': '俄语',
        'русский': '俄语',
        'Английский': '英语',
        'английский': '英语',
        'aнглийский': '英语',
        'Китайский (упр.)': '简体中文',
        'Китайский (трад.)': '繁体中文',
        'Китайский': '中文',
        'Французский': '法语',
        'Итальянский': '意大利语',
        'Немецкий': '德语',
        'Испанский - Испания': '西班牙语 - 西班牙',
        'Испанский - Латинская Америка': '西班牙语 - 拉美',
        'Испанский': '西班牙语',
        'Португальский - Бразилия': '葡萄牙语 - 巴西',
        'Португальский - Португалия': '葡萄牙语 - 葡萄牙',
        'Португальский': '葡萄牙语',
        'Польский': '波兰语',
        'Турецкий': '土耳其语',
        'Японский': '日语',
        'Корейский': '韩语',
        'Арабский': '阿拉伯语',
        'Чешский': '捷克语',
        'Датский': '丹麦语',
        'Нидерландский': '荷兰语',
        'Финский': '芬兰语',
        'Греческий': '希腊语',
        'Венгерский': '匈牙利语',
        'Норвежский': '挪威语',
        'Шведский': '瑞典语',
        'Украинский': '乌克兰语',
        'Тайский': '泰语',
        'Вьетнамский': '越南语',
        'Индонезийский': '印度尼西亚语',
        'Малайский': '马来语',
        'Хинди': '印地语',
        'Болгарский': '保加利亚语',
        'Румынский': '罗马尼亚语',
        'Словацкий': '斯洛伐克语',
        'Хорватский': '克罗地亚语',
        'Сербский': '塞尔维亚语',
        'Латинская Америка': '拉美',
        'Испания': '西班牙',
        'Бразилия': '巴西'
      };

      function buildKeySiteTranslationScript(enabled) {
        const customDictionary = config.customDictionary && typeof config.customDictionary === 'object' ? config.customDictionary : {};
        return `(${keySiteTranslationRuntime.toString()})(${JSON.stringify(JSON.stringify({ enabled: !!enabled, entries: { ...keySiteFallbackTranslations, ...customDictionary } }))});`;
      }

      async function applyKeySiteTranslationFallback() {
        if (!siteView || typeof siteView.executeJavaScript !== 'function') return { ok: false, count: 0 };
        try {
          return await siteView.executeJavaScript(buildKeySiteTranslationScript(isZh()));
        } catch (err) {
          return { ok: false, error: err?.message || String(err), count: 0 };
        }
      }

      function detailSiteAiTranslationRuntime(payloadJson) {
        const payload = JSON.parse(payloadJson || '{}');
        const action = payload.action || 'collect';
        const russianTextRe = /[А-Яа-яЁё]/;
        const chineseTextRe = /[\u4e00-\u9fff]/;
        const detailChunkChars = 1500;
        const state = window.__selezenDetailAiTranslator || { version: 2, nextId: 1, items: {} };
        window.__selezenDetailAiTranslator = state;

        function normalize(value) {
          return String(value || '').replace(/\s+/g, ' ').trim();
        }

        function applySpacing(original, translated) {
          const text = String(original || '');
          return `${text.match(/^\s*/)?.[0] || ''}${translated}${text.match(/\s*$/)?.[0] || ''}`;
        }

        function isIgnoredElement(element) {
          if (!element || element.nodeType !== 1) return true;
          return !!element.closest?.('script, style, noscript, svg, canvas, code, pre, textarea, input, select, option, button, nav, header, footer, .dle-comm, .dle-comm_text, .header-fast, .header-search, .modal-login');
        }

        function isDetailPage() {
          return /\/\d+[-a-z0-9]+\.html(?:$|[?#])/i.test(window.location.href) || !!document.querySelector('.keep-full, .keep-detal_text, .dynamic-release-description-text');
        }

        function getContainers() {
          const selectors = ['.keep-detal_text', '.dynamic-release-description-text', '.torrent-text', '.got-slauncher-box p', '.got-slauncher-footer div'];
          const containers = [];
          selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
              if (!containers.some(existing => existing === element || existing.contains(element))) containers.push(element);
            });
          });
          return containers.filter(element => element && !isIgnoredElement(element));
        }

        function shouldTranslateText(value, parent) {
          const text = normalize(value);
          if (text.length < 18 || text.length > 2200) return false;
          if (!russianTextRe.test(text)) return false;
          if (chineseTextRe.test(text) && text.length < 160) return false;
          if (/^https?:\/\//i.test(text)) return false;
          if (/^[\d\s.,:;!?()[\]{}'"«»+\-–—%/|\\<>]+$/.test(text)) return false;
          if (parent?.closest?.('a, button, .keep-full_title, .keep-item_title, .keep-best_title')) return false;
          return true;
        }

        function splitTextIntoChunks(value, limit) {
          const text = String(value || '');
          if (text.length <= limit) return [text];
          const chunks = [];
          let index = 0;
          while (index < text.length) {
            const remaining = text.length - index;
            if (remaining <= limit) {
              chunks.push(text.slice(index));
              break;
            }
            const windowText = text.slice(index, index + limit);
            let cut = -1;
            [/[\.\!\?。！？]\s+/g, /[;；]\s+/g, /\n+/g, /\s{2,}/g].forEach(pattern => {
              let match;
              while ((match = pattern.exec(windowText))) {
                const pos = match.index + match[0].length;
                if (pos > 420) cut = Math.max(cut, pos);
              }
            });
            if (cut < 0) {
              const lastSpace = windowText.lastIndexOf(' ');
              cut = lastSpace > 420 ? lastSpace + 1 : limit;
            }
            chunks.push(text.slice(index, index + cut));
            index += cut;
          }
          return chunks.filter(Boolean);
        }

        function splitLongTextNodes(root) {
          if (!root || root.nodeType !== 1) return;
          const filters = window.NodeFilter || { SHOW_TEXT: 4, FILTER_REJECT: 2, FILTER_ACCEPT: 1 };
          const longNodes = [];
          try {
            const walker = document.createTreeWalker(root, filters.SHOW_TEXT, {
              acceptNode(node) {
                const parent = node.parentElement;
                const text = node.nodeValue || '';
                if (!parent || isIgnoredElement(parent)) return filters.FILTER_REJECT;
                if (!russianTextRe.test(text) || text.length <= detailChunkChars) return filters.FILTER_REJECT;
                return filters.FILTER_ACCEPT;
              }
            });
            let node = walker.nextNode();
            while (node) {
              longNodes.push(node);
              node = walker.nextNode();
            }
          } catch (_) {}
          longNodes.forEach(node => {
            try {
              if (!node.parentNode || node.__selezenDetailAiId) return;
              const chunks = splitTextIntoChunks(node.nodeValue || '', detailChunkChars);
              if (chunks.length <= 1) return;
              const fragment = document.createDocumentFragment();
              chunks.forEach(chunk => fragment.appendChild(document.createTextNode(chunk)));
              node.parentNode.replaceChild(fragment, node);
            } catch (_) {}
          });
        }

        function getTextNodes() {
          if (!isDetailPage()) return [];
          const roots = getContainers();
          const nodes = [];
          const filters = window.NodeFilter || { SHOW_TEXT: 4, FILTER_REJECT: 2, FILTER_ACCEPT: 1 };
          roots.forEach(root => {
            try {
              splitLongTextNodes(root);
              const walker = document.createTreeWalker(root, filters.SHOW_TEXT, {
                acceptNode(node) {
                  const parent = node.parentElement;
                  if (!parent || isIgnoredElement(parent)) return filters.FILTER_REJECT;
                  return shouldTranslateText(node.nodeValue || '', parent) ? filters.FILTER_ACCEPT : filters.FILTER_REJECT;
                }
              });
              let node = walker.nextNode();
              while (node) {
                nodes.push(node);
                node = walker.nextNode();
              }
            } catch (_) {}
          });
          return nodes;
        }

        function getNodeItem(node) {
          if (!node.__selezenDetailAiId) node.__selezenDetailAiId = `d${state.nextId++}`;
          const id = node.__selezenDetailAiId;
          let item = state.items[id];
          const current = node.nodeValue || '';
          if (!item) {
            item = { id, node, original: current, translated: '', pending: false };
            state.items[id] = item;
          } else if (item.translated && current !== item.translated && russianTextRe.test(current)) {
            item.original = current;
            item.translated = '';
            item.pending = false;
            item.node = node;
          } else {
            item.node = node;
          }
          return item;
        }

        function restore() {
          let count = 0;
          Object.keys(state.items).forEach(id => {
            const item = state.items[id];
            try {
              if (item?.node?.isConnected && item.original !== undefined && item.node.nodeValue !== item.original) {
                item.node.nodeValue = item.original;
                count += 1;
              }
              if (item) {
                item.translated = '';
                item.pending = false;
              }
            } catch (_) {}
          });
          return { ok: true, restored: count };
        }

        function collect() {
          if (!payload.enabled) return restore();
          const maxItems = Math.max(1, Math.min(Number(payload.maxItems) || 14, 32));
          const maxChars = Math.max(500, Math.min(Number(payload.maxChars) || 7000, 9000));
          const nodes = getTextNodes();
          const items = [];
          let chars = 0;
          nodes.forEach(node => {
            if (items.length >= maxItems) return;
            const item = getNodeItem(node);
            if (item.pending) return;
            const source = item.original || node.nodeValue || '';
            const text = normalize(source);
            if (!shouldTranslateText(text, node.parentElement)) return;
            if (item.translated && node.nodeValue === item.translated) return;
            if (chars + text.length > maxChars && items.length) return;
            item.pending = true;
            items.push({ id: item.id, text, kind: 'detail' });
            chars += text.length;
          });
          const title = normalize(document.querySelector('h1')?.textContent || document.title || '');
          const pageContext = `${title} | ${window.location.pathname}`.slice(0, 500);
          return { ok: true, pageContext, count: items.length, items };
        }

        function apply() {
          const translations = Array.isArray(payload.translations) ? payload.translations : [];
          const releaseIds = new Set((Array.isArray(payload.releaseIds) ? payload.releaseIds : []).map(id => String(id || '')));
          let count = 0;
          releaseIds.forEach(id => {
            const item = state.items[id];
            if (item) item.pending = false;
          });
          translations.forEach(entry => {
            const item = state.items[String(entry?.id || '')];
            const translated = String(entry?.text || '').trim();
            if (item) item.pending = false;
            if (!item || !item.node?.isConnected || !translated) return;
            item.translated = applySpacing(item.original || item.node.nodeValue || '', translated);
            item.node.nodeValue = item.translated;
            count += 1;
          });
          return { ok: true, applied: count };
        }

        if (action === 'restore') return restore();
        if (action === 'apply') return apply();
        return collect();
      }

      function buildDetailSiteAiTranslationScript(payload) {
        return `(${detailSiteAiTranslationRuntime.toString()})(${JSON.stringify(JSON.stringify(payload || {}))});`;
      }

      function generalSiteAiTranslationRuntime(payloadJson) {
        const payload = JSON.parse(payloadJson || '{}');
        const action = payload.action || 'collect';
        const russianTextRe = /[А-Яа-яЁё]/;
        const chineseTextRe = /[\u4e00-\u9fff]/;
        const state = window.__selezenGeneralAiTranslator || { version: 3, nextId: 1, items: {} };
        window.__selezenGeneralAiTranslator = state;

        function normalize(value) {
          return String(value || '').replace(/\s+/g, ' ').trim();
        }

        function applySpacing(original, translated) {
          const text = String(original || '');
          return `${text.match(/^\s*/)?.[0] || ''}${translated}${text.match(/\s*$/)?.[0] || ''}`;
        }

        function isDetailPage() {
          return /\/\d+[-\w\u0400-\u04ff]+\.html(?:$|[?#])/i.test(window.location.href) || !!document.querySelector('.keep-detal, .keep-detal_text, .dynamic-release-description-text');
        }

        function isIgnoredElement(element) {
          if (!element || element.nodeType !== 1) return true;
          return !!element.closest?.('script, style, noscript, svg, canvas, code, pre, textarea, input, select, option, button, .modal-login, .keep-detal_text, .dynamic-release-description-text, .torrent-text, .keep-full_title, .keep-item_title, .keep-best_title, .header-logo, .torrent-peer-stats, .btn-group');
        }

        function isLikelyGameTitle(text, parent) {
          if (!parent) return false;
          if (parent.closest?.('.keep-full_title, .keep-item_title, .keep-best_title, .header-logo')) return true;
          if (!parent.closest?.('a')) return false;
          if (text.length > 34) return false;
          return !/(Главная|Игры|Фильмы|Лаунчер|Подборки|Лучшее|Последние|Лучшие|Жанры|Года|Скачать|Подробнее|Обновлено|Добавлено|Горячие)/i.test(text);
        }

        function shouldTranslateText(value, parent) {
          const text = normalize(value);
          if (text.length < 18 || text.length > 1200) return false;
          if (!russianTextRe.test(text)) return false;
          if (chineseTextRe.test(text) && text.length < 180) return false;
          if (/^https?:\/\//i.test(text)) return false;
          if (/\.(torrent|rar|zip|7z|exe|bin|iso)$/i.test(text)) return false;
          if (/^[\d\s.,:;!?()[\]{}'"«»+\-–—%/|\\<>]+$/.test(text)) return false;
          if (isIgnoredElement(parent)) return false;
          if (isLikelyGameTitle(text, parent)) return false;
          return true;
        }

        function getRoots() {
          if (isDetailPage()) return [];
          const selectors = [
            '.keep-big_text',
            '.keep-best_text',
            '.keep-big_meta',
            '.keep-big_meta2',
            '.keep-items_head',
            '.keep-upd',
            '.catalog-best',
            '.sidemenu',
            '.keep-cat_item',
            '.keep-upd_meta'
          ];
          const roots = [];
          selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
              if (!roots.some(existing => existing === element || existing.contains(element))) roots.push(element);
            });
          });
          if (!roots.length && document.body) roots.push(document.body);
          return roots.filter(root => root && !isIgnoredElement(root));
        }

        function getTextNodes() {
          const nodes = [];
          const seen = new Set();
          const filters = window.NodeFilter || { SHOW_TEXT: 4, FILTER_REJECT: 2, FILTER_ACCEPT: 1 };
          getRoots().forEach(root => {
            try {
              const walker = document.createTreeWalker(root, filters.SHOW_TEXT, {
                acceptNode(node) {
                  const parent = node.parentElement;
                  if (!parent || seen.has(node)) return filters.FILTER_REJECT;
                  return shouldTranslateText(node.nodeValue || '', parent) ? filters.FILTER_ACCEPT : filters.FILTER_REJECT;
                }
              });
              let node = walker.nextNode();
              while (node) {
                seen.add(node);
                nodes.push(node);
                node = walker.nextNode();
              }
            } catch (_) {}
          });
          return nodes;
        }

        function getNodeItem(node) {
          if (!node.__selezenGeneralAiId) node.__selezenGeneralAiId = `g${state.nextId++}`;
          const id = node.__selezenGeneralAiId;
          let item = state.items[id];
          const current = node.nodeValue || '';
          if (!item) {
            item = { id, node, original: current, translated: '', pending: false };
            state.items[id] = item;
          } else if (item.translated && current !== item.translated && russianTextRe.test(current)) {
            item.original = current;
            item.translated = '';
            item.pending = false;
            item.node = node;
          } else {
            item.node = node;
          }
          return item;
        }

        function restore() {
          let count = 0;
          Object.keys(state.items).forEach(id => {
            const item = state.items[id];
            try {
              if (item?.node?.isConnected && item.original !== undefined && item.node.nodeValue !== item.original) {
                item.node.nodeValue = item.original;
                count += 1;
              }
              if (item) {
                item.translated = '';
                item.pending = false;
              }
            } catch (_) {}
          });
          return { ok: true, restored: count };
        }

        function collect() {
          if (!payload.enabled) return restore();
          if (isDetailPage()) return { ok: true, pageContext: '', count: 0, items: [] };
          const maxItems = Math.max(1, Math.min(Number(payload.maxItems) || 4, 8));
          const maxChars = Math.max(500, Math.min(Number(payload.maxChars) || 1800, 3000));
          const nodes = getTextNodes();
          const items = [];
          let chars = 0;
          nodes.forEach(node => {
            if (items.length >= maxItems) return;
            const item = getNodeItem(node);
            if (item.pending) return;
            const source = item.original || node.nodeValue || '';
            const text = normalize(source);
            if (!shouldTranslateText(text, node.parentElement)) return;
            if (item.translated && node.nodeValue === item.translated) return;
            if (chars + text.length > maxChars && items.length) return;
            item.pending = true;
            items.push({ id: item.id, text, kind: 'general' });
            chars += text.length;
          });
          const title = normalize(document.querySelector('h1')?.textContent || document.title || '');
          const pageContext = `site modules | ${title} | ${window.location.pathname}`.slice(0, 500);
          return { ok: true, pageContext, count: items.length, items };
        }

        function apply() {
          const translations = Array.isArray(payload.translations) ? payload.translations : [];
          const releaseIds = new Set((Array.isArray(payload.releaseIds) ? payload.releaseIds : []).map(id => String(id || '')));
          let count = 0;
          releaseIds.forEach(id => {
            const item = state.items[id];
            if (item) item.pending = false;
          });
          translations.forEach(entry => {
            const item = state.items[String(entry?.id || '')];
            const translated = String(entry?.text || '').trim();
            if (item) item.pending = false;
            if (!item || !item.node?.isConnected || !translated) return;
            item.translated = applySpacing(item.original || item.node.nodeValue || '', translated);
            item.node.nodeValue = item.translated;
            count += 1;
          });
          return { ok: true, applied: count };
        }

        if (action === 'restore') return restore();
        if (action === 'apply') return apply();
        return collect();
      }

      function buildGeneralSiteAiTranslationScript(payload) {
        return `(${generalSiteAiTranslationRuntime.toString()})(${JSON.stringify(JSON.stringify(payload || {}))});`;
      }

      async function runGeneralSiteAiTranslation() {
        if (!isZh()) {
          await siteView?.executeJavaScript?.(buildGeneralSiteAiTranslationScript({ action: 'restore' })).catch(() => null);
          return { ok: true, enabled: false, applied: 0 };
        }
        if (!siteView || typeof siteView.executeJavaScript !== 'function') return { ok: false, error: 'Webview is not ready', applied: 0 };
        await loadConfig();
        if (!config.enabled || !config.hasKey) return { ok: true, enabled: false, applied: 0 };
        let appliedTotal = 0;
        const concurrentRequests = 1;
        for (let pass = 0; pass < 3; pass += 1) {
          const batches = [];
          for (let slot = 0; slot < concurrentRequests; slot += 1) {
            const collected = await siteView.executeJavaScript(buildGeneralSiteAiTranslationScript({ action: 'collect', enabled: true, maxItems: 4, maxChars: 1800 }));
            if (!collected?.items?.length) break;
            batches.push(collected);
          }
          if (!batches.length) break;
          const totalItems = batches.reduce((sum, batch) => sum + (batch.items?.length || 0), 0);
          setStatus(`正在补翻网站模块: ${totalItems}`);
          const results = await Promise.all(batches.map(async collected => {
            try {
              const res = await window.electronAPI.siteTranslationTranslateBatch({ pageContext: collected.pageContext || '', items: collected.items });
              return { collected, res };
            } catch (err) {
              return { collected, error: err?.message || String(err) };
            }
          }));
          for (const result of results) {
            const releaseIds = (result.collected?.items || []).map(item => item.id);
            if (result.error || (!result.res?.ok && !result.res?.translations?.length)) {
              await siteView.executeJavaScript(buildGeneralSiteAiTranslationScript({ action: 'apply', translations: [], releaseIds })).catch(() => null);
              continue;
            }
            const applied = await siteView.executeJavaScript(buildGeneralSiteAiTranslationScript({ action: 'apply', translations: result.res.translations || [], releaseIds }));
            appliedTotal += applied?.applied || 0;
          }
        }
        if (appliedTotal) setStatus(`已补翻网站模块: ${appliedTotal}`);
        return { ok: true, enabled: true, applied: appliedTotal };
      }

      async function runDetailSiteAiTranslation() {
        if (!isZh()) {
          await siteView?.executeJavaScript?.(buildDetailSiteAiTranslationScript({ action: 'restore' })).catch(() => null);
          return { ok: true, enabled: false, applied: 0 };
        }
        if (!siteView || typeof siteView.executeJavaScript !== 'function') return { ok: false, error: 'Webview is not ready', applied: 0 };
        await loadConfig();
        if (!config.enabled || !config.hasKey) return { ok: true, enabled: false, applied: 0 };
        let appliedTotal = 0;
        const concurrentRequests = 2;
        for (let pass = 0; pass < 18; pass += 1) {
          const batches = [];
          for (let slot = 0; slot < concurrentRequests; slot += 1) {
            const collected = await siteView.executeJavaScript(buildDetailSiteAiTranslationScript({ action: 'collect', enabled: true, maxItems: 14, maxChars: 7000 }));
            if (!collected?.items?.length) break;
            batches.push(collected);
          }
          if (!batches.length) break;
          const totalItems = batches.reduce((sum, batch) => sum + (batch.items?.length || 0), 0);
          setStatus(`正在发送到 DeepSeek: ${totalItems}`);
          const results = await Promise.all(batches.map(async collected => {
            try {
              const res = await window.electronAPI.siteTranslationTranslateBatch({ pageContext: collected.pageContext || '', items: collected.items });
              return { collected, res };
            } catch (err) {
              return { collected, error: err?.message || String(err) };
            }
          }));
          for (const result of results) {
            const releaseIds = (result.collected?.items || []).map(item => item.id);
            if (result.error || (!result.res?.ok && !result.res?.translations?.length)) {
              await siteView.executeJavaScript(buildDetailSiteAiTranslationScript({ action: 'apply', translations: [], releaseIds })).catch(() => null);
              continue;
            }
            const applied = await siteView.executeJavaScript(buildDetailSiteAiTranslationScript({ action: 'apply', translations: result.res.translations || [], releaseIds }));
            appliedTotal += applied?.applied || 0;
          }
        }
        if (appliedTotal) setStatus(`已应用翻译: ${appliedTotal}`);
        return { ok: true, enabled: true, applied: appliedTotal };
      }

      async function translateCurrentSiteNow() {
        if (runningTranslation) return;
        runningTranslation = true;
        try {
          setStatus('正在启动当前页面翻译...');
          await loadConfig();
          const keyResult = await applyKeySiteTranslationFallback();
          const detailResult = await runDetailSiteAiTranslation();
          const generalResult = await runGeneralSiteAiTranslation();
          if (!keyResult?.count && !generalResult?.applied && !detailResult?.applied) setStatus('当前页面翻译已启动');
        } catch (err) {
          setStatus(`错误: ${err?.message || String(err)}`);
        } finally {
          runningTranslation = false;
        }
      }

      function scheduleTranslate(delay) {
        setTimeout(() => translateCurrentSiteNow(), delay || 800);
      }

      function init() {
        ensurePanel();
        loadConfig();
        siteView?.addEventListener?.('dom-ready', () => scheduleTranslate(900));
        siteView?.addEventListener?.('did-navigate', () => scheduleTranslate(1200));
        siteView?.addEventListener?.('did-navigate-in-page', () => scheduleTranslate(900));
        window.electronAPI?.onLanguageChanged?.(payload => {
          setTimeout(() => {
            loadConfig();
            scheduleTranslate(300);
          }, 100);
        });
        window.electronAPI?.onSiteTranslationStatusChanged?.(payload => {
          if (!payload?.stage) return;
          if (payload.stage === 'deepseek-request') setStatus(`正在发送到 DeepSeek: ${payload.count || 0}`);
          if (payload.stage === 'cache-cleared') setStatus('翻译缓存已清除');
          if (payload.stage === 'error') setStatus(`错误: ${payload.error || ''}`);
        });
        setTimeout(() => scheduleTranslate(1200), 0);
      }

      return { init, translateCurrentSiteNow, loadConfig };
    })();
    selezenZhMod.init();
