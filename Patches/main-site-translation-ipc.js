// SELEZEN_ZH_MOD_MAIN_TRANSLATION_IPC
// SELEZEN_ZH_MOD_MAIN_TRANSLATION_IPC_V7
ipcMain.handle('site-translation-get-config', () => getSiteTranslationPublicConfig());

ipcMain.handle('site-translation-set-config', (_event, payload = {}) => {
  try {
    const current = ensureSiteTranslationSettingsAvailable();
    const next = normalizeSiteTranslationSettings({
      ...current,
      enabled: payload.enabled,
      model: payload.model
    });
    if (Object.prototype.hasOwnProperty.call(payload, 'apiKey')) {
      const rawKey = String(payload.apiKey || '').trim();
      if (rawKey) next.apiKeyEncrypted = encryptSiteTranslationApiKey(rawKey);
    }
    if (payload.clearApiKey) next.apiKeyEncrypted = '';
    settings.siteTranslation = next;
    saveSettings();
    writeSiteTranslationSettingsBackup();
    broadcastSiteTranslationConfig();
    return getSiteTranslationPublicConfig();
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('site-translation-test', async () => {
  try {
    const cfg = ensureSiteTranslationSettingsAvailable();
    const apiKey = decryptSiteTranslationApiKey();
    if (!apiKey) return { ok: false, error: 'DeepSeek API Key is not saved' };
    const response = await requestDeepSeekTranslation(
      apiKey,
      cfg.model,
      [{ id: 'test', text: 'Translate this short test sentence.' }],
      'connection test'
    );
    const translated = response?.translations?.[0]?.text || '';
    return { ok: true, message: translated || 'DeepSeek responded' };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('site-translation-translate-batch', async (_event, payload) => {
  try {
    return await translateSiteBatch(payload || {});
  } catch (err) {
    broadcastSiteTranslationStatus({ stage: 'error', error: err?.message || String(err) });
    return { ok: false, error: err?.message || String(err), translations: [] };
  }
});

ipcMain.handle('site-translation-clear-cache', () => {
  siteTranslationCache = { version: 1, entries: {} };
  siteTranslationCacheLoaded = true;
  try {
    fs.rmSync(SITE_TRANSLATION_CACHE_FILE, { force: true });
  } catch (_) {}
  broadcastSiteTranslationStatus({ stage: 'cache-cleared' });
  return getSiteTranslationPublicConfig();
});
