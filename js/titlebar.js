(function () {
  const SLIDERS_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>';

  function makeLight(id, cls, title, disabled, onClick) {
    const btn = document.createElement('button');
    if (id) btn.id = id;
    btn.className = cls;
    btn.title = title;
    if (disabled) btn.disabled = true;
    else btn.addEventListener('click', onClick);
    return btn;
  }

  // Shared macOS-style titlebar: traffic lights + left title + optional settings entry.
  // opts: { title, closeId, minId, onClose, onMin, settings, onSettings,
  //         sidebar } — sidebar adds the collapse toggle + quick search
  // (main window only; rebuilt on every buildAll, behavior binds in
  // weather-window.js bindTitlebarControls).
  const SIDEBAR_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/></svg>';
  const SEARCH_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>';
  function createTitlebar(container, opts) {
    container.innerHTML = '';
    const lights = document.createElement('div');
    lights.className = 'traffic-lights';
    lights.appendChild(makeLight(opts.closeId, 'tl close', opts.closeTip, false, opts.onClose));
    lights.appendChild(makeLight(opts.minId, 'tl min', opts.minTip, false, opts.onMin));
    lights.appendChild(makeLight(null, 'tl max', opts.maxTip, true, null));
    container.appendChild(lights);
    const title = document.createElement('div');
    title.className = 'titlebar-title';
    title.textContent = opts.title;
    if (opts.sidebar) {
      const toggle = document.createElement('button');
      toggle.id = 'sidebarToggle';
      toggle.className = 'tool-btn';
      toggle.setAttribute('aria-label', 'sidebar');
      toggle.innerHTML = SIDEBAR_SVG;
      container.appendChild(toggle);
      const wrap = document.createElement('div');
      wrap.className = 'tb-search-wrap';
      wrap.innerHTML = '<button id="quickSearchBtn" class="tool-btn hidden" aria-label="search">' + SEARCH_SVG + '</button>' +
        '<div id="quickSearchBox" class="city-search hidden"><span class="quick-icon">' + SEARCH_SVG + '</span>' +
        '<input id="quickSearch" class="quick-input" autocomplete="off"></div>' +
        '<div id="quickResults" class="search-results hidden"></div>';
      container.appendChild(wrap);
    }
    container.appendChild(title);
    if (opts.settings) {
      const btn = document.createElement('button');
      btn.className = 'titlebar-settings';
      btn.title = opts.settingsTip;
      btn.innerHTML = SLIDERS_SVG;
      btn.addEventListener('click', opts.onSettings);
      container.appendChild(btn);
    }
    return container;
  }

  function hideSettings() { document.getElementById('settingsModal').classList.add('hidden'); }

  window.WeatherMacTitlebar = { create: createTitlebar, buildAll: buildAll };

  function buildAll(lang) {
    const ct = window.WeatherMacI18n.ct;
    const base = {
      closeTip: ct(lang, 'close'), minTip: ct(lang, 'minimize'), maxTip: ct(lang, 'unavailable')
    };
    createTitlebar(document.getElementById('windowDragHandle'), Object.assign({
      title: ct(lang, 'weather'),
      sidebar: true,
      closeId: 'btnClose',
      minId: 'btnMin',
      onClose: () => window.WeatherMacDesktop.closeWindow(),
      onMin: () => window.WeatherMacDesktop.minimizeWindow(),
      settings: true,
      settingsTip: ct(lang, 'openSettings'),
      onSettings: () => {
        const w = window.WeatherMacWindow;
        if (w && typeof w.openSettings === 'function') w.openSettings();
      }
    }, base));
    createTitlebar(document.getElementById('settingsTitlebar'), Object.assign({
      title: ct(lang, 'settings'),
      closeId: 'closeSettingsRed',
      minId: 'closeSettingsYellow',
      onClose: hideSettings,
      onMin: hideSettings
    }, base));
  }

  buildAll(localStorage.getItem('weatherMac_lang') || window.WeatherMacI18n.defaultLang());
})();
