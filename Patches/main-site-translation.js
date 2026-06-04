// SELEZEN_ZH_MOD_MAIN_TRANSLATION
// SELEZEN_ZH_MOD_CUSTOM_DICTIONARY_V6
// SELEZEN_ZH_MOD_KEY_PERSISTENCE_V7
const SITE_TRANSLATION_CACHE_LIMIT = 2000;
const SITE_TRANSLATION_MODELS = ['deepseek-v4-flash', 'deepseek-v4-pro'];
const DEFAULT_SITE_TRANSLATION_MODEL = 'deepseek-v4-flash';
const DEEPSEEK_CHAT_COMPLETIONS_URL = 'https://api.deepseek.com/chat/completions';
const SITE_TRANSLATION_MOD_ROOT = path.join(process.env.LOCALAPPDATA || app.getPath('userData'), 'SeleZen-ZH-Mod');
const SITE_TRANSLATION_CUSTOM_DICTIONARY_FILE = path.join(SITE_TRANSLATION_MOD_ROOT, 'custom-dictionary.json');
const SITE_TRANSLATION_SETTINGS_BACKUP_FILE = path.join(SITE_TRANSLATION_MOD_ROOT, 'settings-backup.json');
let siteTranslationCache = { version: 1, entries: {} };
let siteTranslationCacheLoaded = false;
let siteTranslationLastStatus = null;

function normalizeSiteTranslationSettings(source) {
  const src = source && typeof source === 'object' ? source : {};
  const model = SITE_TRANSLATION_MODELS.includes(src.model) ? src.model : DEFAULT_SITE_TRANSLATION_MODEL;
  return {
    enabled: !!src.enabled,
    model,
    apiKeyEncrypted: typeof src.apiKeyEncrypted === 'string' ? src.apiKeyEncrypted : ''
  };
}

function readSiteTranslationSettingsBackup() {
  try {
    const raw = fs.readFileSync(SITE_TRANSLATION_SETTINGS_BACKUP_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return normalizeSiteTranslationSettings(parsed?.siteTranslation);
  } catch (_) {
    return normalizeSiteTranslationSettings(null);
  }
}

function writeSiteTranslationSettingsBackup() {
  try {
    const cfg = normalizeSiteTranslationSettings(settings.siteTranslation);
    if (!cfg.apiKeyEncrypted) return;
    ensureDir(SITE_TRANSLATION_MOD_ROOT);
    const backup = {
      ...settings,
      language: settings.language || 'zh-CN',
      siteTranslation: cfg
    };
    fs.writeFileSync(SITE_TRANSLATION_SETTINGS_BACKUP_FILE, JSON.stringify(backup, null, 2));
  } catch (err) {
    console.warn('Failed to save site translation settings backup', err);
  }
}

function ensureSiteTranslationSettingsAvailable() {
  const hasCurrentObject = !!(settings.siteTranslation && typeof settings.siteTranslation === 'object');
  const current = normalizeSiteTranslationSettings(settings.siteTranslation);
  if (hasCurrentObject && current.apiKeyEncrypted) return current;

  const backup = readSiteTranslationSettingsBackup();
  let next = current;
  if (backup.apiKeyEncrypted) {
    next = normalizeSiteTranslationSettings({
      enabled: hasCurrentObject ? current.enabled : backup.enabled,
      model: hasCurrentObject ? current.model : backup.model,
      apiKeyEncrypted: current.apiKeyEncrypted || backup.apiKeyEncrypted
    });
  } else if (!hasCurrentObject) {
    next = normalizeSiteTranslationSettings(null);
  }

  const changed =
    !hasCurrentObject ||
    JSON.stringify(normalizeSiteTranslationSettings(settings.siteTranslation)) !== JSON.stringify(next);
  if (changed) {
    settings.siteTranslation = next;
    try {
      saveSettings();
    } catch (err) {
      console.warn('Failed to restore site translation settings', err);
    }
  }
  return next;
}

function encryptSiteTranslationApiKey(apiKey) {
  const value = String(apiKey || '').trim();
  if (!value) return '';
  if (!safeStorage || !safeStorage.isEncryptionAvailable || !safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage is not available');
  }
  return safeStorage.encryptString(value).toString('base64');
}

function decryptSiteTranslationApiKey() {
  const cfg = ensureSiteTranslationSettingsAvailable();
  const encrypted = cfg.apiKeyEncrypted;
  if (!encrypted) return '';
  if (!safeStorage || !safeStorage.isEncryptionAvailable || !safeStorage.isEncryptionAvailable()) return '';
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
  } catch (err) {
    console.warn('Failed to decrypt site translation key', err);
    return '';
  }
}

function getSiteTranslationPublicConfig() {
  ensureSiteTranslationCacheLoaded();
  const cfg = ensureSiteTranslationSettingsAvailable();
  const customDictionary = loadSiteTranslationCustomDictionary();
  return {
    ok: true,
    enabled: cfg.enabled,
    model: cfg.model,
    models: SITE_TRANSLATION_MODELS.slice(),
    hasKey: !!cfg.apiKeyEncrypted,
    safeStorageAvailable: !!(safeStorage?.isEncryptionAvailable?.()),
    cacheSize: Object.keys(siteTranslationCache.entries || {}).length,
    customDictionary: customDictionary.entries,
    customDictionaryCount: customDictionary.count,
    customDictionaryPath: SITE_TRANSLATION_CUSTOM_DICTIONARY_FILE,
    customDictionaryError: customDictionary.error,
    lastStatus: siteTranslationLastStatus
  };
}

function loadSiteTranslationCustomDictionary() {
  try {
    const raw = fs.readFileSync(SITE_TRANSLATION_CUSTOM_DICTIONARY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const source = parsed && typeof parsed.entries === 'object' ? parsed.entries : parsed;
    const entries = {};
    Object.entries(source && typeof source === 'object' ? source : {}).slice(0, 500).forEach(([key, value]) => {
      const from = String(key || '').replace(/\s+/g, ' ').trim();
      const to = String(value || '').replace(/\s+/g, ' ').trim();
      if (!from || !to || from.startsWith('__')) return;
      entries[from.slice(0, 220)] = to.slice(0, 320);
    });
    return { entries, count: Object.keys(entries).length, error: '' };
  } catch (err) {
    if (err && err.code === 'ENOENT') return { entries: {}, count: 0, error: '' };
    return { entries: {}, count: 0, error: err?.message || String(err) };
  }
}

function ensureSiteTranslationCacheLoaded() {
  if (siteTranslationCacheLoaded) return;
  siteTranslationCacheLoaded = true;
  try {
    const raw = fs.readFileSync(SITE_TRANSLATION_CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    siteTranslationCache = {
      version: 1,
      entries: parsed && typeof parsed.entries === 'object' ? parsed.entries : {}
    };
  } catch (_) {
    siteTranslationCache = { version: 1, entries: {} };
  }
}

function saveSiteTranslationCache() {
  try {
    ensureDir(path.dirname(SITE_TRANSLATION_CACHE_FILE));
    fs.writeFileSync(SITE_TRANSLATION_CACHE_FILE, JSON.stringify(siteTranslationCache, null, 2));
  } catch (err) {
    console.warn('Failed to save site translation cache', err);
  }
}

function trimSiteTranslationCache() {
  const entries = siteTranslationCache.entries || {};
  const keys = Object.keys(entries);
  if (keys.length <= SITE_TRANSLATION_CACHE_LIMIT) return;
  keys
    .sort((a, b) => Number(entries[a]?.usedAt || 0) - Number(entries[b]?.usedAt || 0))
    .slice(0, keys.length - SITE_TRANSLATION_CACHE_LIMIT)
    .forEach(key => delete entries[key]);
}

function getSiteTranslationCacheKey(model, pageContext, text) {
  return crypto
    .createHash('sha256')
    .update(String(model || ''))
    .update('\n')
    .update(String(pageContext || ''))
    .update('\n')
    .update(String(text || ''))
    .digest('hex');
}

function parseDeepSeekJson(content) {
  const raw = String(content || '').trim();
  try {
    return JSON.parse(raw);
  } catch (_) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('DeepSeek returned invalid JSON');
  }
}

function requestDeepSeekTranslation(apiKey, model, items, pageContext) {
  const url = new URL(DEEPSEEK_CHAT_COMPLETIONS_URL);
  const body = JSON.stringify({
    model,
    messages: [
      {
        role: 'system',
        content:
          'You translate game website UI, game descriptions, release notes, and system requirements into natural Simplified Chinese. Preserve game titles, brand names, version numbers, URLs, file names, and placeholders exactly. Return only strict JSON shaped as {"translations":[{"id":"same id","text":"translated text"}]}.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          targetLanguage: 'zh-CN',
          pageContext: pageContext || '',
          items: items.map(item => ({ id: item.id, text: item.text }))
        })
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 8192
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 30000
      },
      res => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => {
          data += chunk;
        });
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data || '{}');
          } catch (_) {
            parsed = null;
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(parsed?.error?.message || `DeepSeek HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(parseDeepSeekJson(parsed?.choices?.[0]?.message?.content || ''));
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('DeepSeek request timed out')));
    req.write(body);
    req.end();
  });
}

function broadcastSiteTranslationStatus(status) {
  siteTranslationLastStatus = { ...status, at: Date.now() };
  webContents.getAllWebContents().forEach(contents => {
    try {
      contents.send('site-translation-status-changed', siteTranslationLastStatus);
    } catch (_) {}
  });
}

function broadcastSiteTranslationConfig() {
  const payload = getSiteTranslationPublicConfig();
  webContents.getAllWebContents().forEach(contents => {
    try {
      contents.send('site-translation-config-changed', payload);
    } catch (_) {}
  });
}

async function translateSiteBatch(payload = {}) {
  ensureSiteTranslationCacheLoaded();
  const cfg = ensureSiteTranslationSettingsAvailable();
  if (!cfg.enabled || settings.language !== 'zh-CN') return { ok: true, enabled: false, translations: [] };
  const apiKey = decryptSiteTranslationApiKey();
  if (!apiKey) return { ok: false, error: 'DeepSeek API Key is not saved', translations: [] };
  const model = SITE_TRANSLATION_MODELS.includes(cfg.model) ? cfg.model : DEFAULT_SITE_TRANSLATION_MODEL;
  const pageContext = String(payload.pageContext || '').slice(0, 500);
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const items = rawItems
    .map(item => ({
      id: String(item?.id || '').slice(0, 80),
      text: String(item?.text || '').trim().slice(0, 2200)
    }))
    .filter(item => item.id && item.text);
  if (!items.length) return { ok: true, enabled: true, translations: [] };

  const now = Date.now();
  const translations = [];
  const missing = [];
  items.forEach(item => {
    const key = getSiteTranslationCacheKey(model, pageContext, item.text);
    const cached = siteTranslationCache.entries?.[key];
    if (cached?.text) {
      cached.usedAt = now;
      translations.push({ id: item.id, text: cached.text, cached: true });
    } else {
      missing.push({ ...item, cacheKey: key });
    }
  });
  if (missing.length) {
    broadcastSiteTranslationStatus({ stage: 'deepseek-request', count: missing.length, model });
    const response = await requestDeepSeekTranslation(apiKey, model, missing, pageContext);
    const returned = Array.isArray(response?.translations) ? response.translations : [];
    const byId = new Map(
      returned
        .filter(item => item && item.id !== undefined && typeof item.text === 'string')
        .map(item => [String(item.id), item.text.trim()])
    );
    missing.forEach(item => {
      const translated = byId.get(item.id);
      if (!translated) return;
      siteTranslationCache.entries[item.cacheKey] = { text: translated, createdAt: now, usedAt: now };
      translations.push({ id: item.id, text: translated, cached: false });
    });
    trimSiteTranslationCache();
    saveSiteTranslationCache();
  }
  return { ok: true, enabled: true, translations };
}
