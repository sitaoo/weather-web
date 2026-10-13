(function () {
  const win = document.getElementById('weatherWindow');
  const desktop = document.getElementById('desktop');
  const widget = document.getElementById('widgetCard');
  const WIDGET_POSITION_KEY = 'weatherMac_widgetPosition';
  function openWindow() { win.classList.remove('hidden'); }
  function closeWindow() { win.classList.add('hidden'); }
  function minimizeWindow() { win.classList.add('hidden'); }
  const cityEl = document.getElementById('widgetCity');
  function renderWidget(m) {
    cityEl.textContent = m.city;
    cityEl.title = m.city;
    marqueeStop();
    document.getElementById('widgetTemp').textContent = m.temp;
    document.getElementById('widgetDesc').textContent = m.desc;
    document.getElementById('widgetHL').textContent = m.hl;
    const icon = document.getElementById('widgetIcon');
    if (m.icon) { icon.src = m.icon; icon.alt = m.desc || ''; icon.style.display = ''; }
    else { icon.removeAttribute('src'); icon.style.display = 'none'; }
    const loc = document.getElementById('widgetLoc');
    if (loc) loc.style.display = m.pinned ? '' : 'none';
  }
  function setWidgetWarn(w) {
    const el = document.getElementById('widgetWarn');
    if (!el) return;
    if (!w) { el.classList.add('hidden'); el.textContent = ''; el.removeAttribute('title'); return; }
    el.textContent = '';
    const mark = document.createElement('span');
    mark.className = 'widget-warn-mark';
    mark.textContent = '!';
    el.appendChild(mark);
    const label = document.createElement('span');
    label.className = 'widget-warn-label';
    label.textContent = w.label || '';
    el.appendChild(label);
    el.className = 'widget-warn ' + (w.cls || 'lv-blue');
    el.title = w.title || '';
  }
  function clockLocale() {
    const lang = localStorage.getItem('weatherMac_lang') || window.WeatherMacI18n.defaultLang();
    try { new Date().toLocaleString(lang); return lang; }
    catch { return 'zh-CN'; }
  }
  function renderClock() {
    document.getElementById('menuClock').textContent = new Date().toLocaleString(clockLocale(), { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  const WALLPAPERS = ['sky', 'space', 'sunset', 'gray', 'tahoe-day', 'tahoe-night', 'sequoia-day', 'sequoia-night', 'sonoma-day', 'sonoma-night', 'ventura-day', 'ventura-night', 'bigsur-day', 'bigsur-night', 'bigsur-dawn', 'bigsur-morning', 'bigsur-afternoon', 'bigsur-dusk', 'tahoe-auto', 'sequoia-auto', 'sonoma-auto', 'ventura-auto', 'bigsur-auto'];
  const WALLPAPER_DAY_NIGHT = {
    'tahoe-auto': ['tahoe-day', 'tahoe-night'],
    'sequoia-auto': ['sequoia-day', 'sequoia-night'],
    'sonoma-auto': ['sonoma-day', 'sonoma-night'],
    'ventura-auto': ['ventura-day', 'ventura-night']
  };
  function autoWallpaperForHour(id, h) {
    if (id === 'bigsur-auto') {
      if (h >= 5 && h < 7) return 'bigsur-dawn';
      if (h >= 7 && h < 11) return 'bigsur-morning';
      if (h >= 11 && h < 15) return 'bigsur-day';
      if (h >= 15 && h < 18) return 'bigsur-afternoon';
      if (h >= 18 && h < 21) return 'bigsur-dusk';
      return 'bigsur-night';
    }
    const pair = WALLPAPER_DAY_NIGHT[id];
    return (h >= 6 && h < 18) ? pair[0] : pair[1];
  }
  function wallpaperForHour(h) {
    if (h >= 5 && h < 8) return 'sonoma-day';
    if (h >= 8 && h < 16) return 'tahoe-day';
    if (h >= 16 && h < 19) return 'bigsur-day';
    if (h >= 19 && h < 23) return 'sonoma-night';
    return 'tahoe-night';
  }
  function setWallpaper(name) {
    if (name === 'time') {
      document.body.dataset.wallpaperMode = 'time';
      document.body.dataset.wallpaper = wallpaperForHour(new Date().getHours());
      return;
    }
    if (WALLPAPER_DAY_NIGHT[name] || name === 'bigsur-auto') {
      document.body.dataset.wallpaperMode = 'auto';
      document.body.dataset.wallpaper = autoWallpaperForHour(name, new Date().getHours());
      return;
    }
    document.body.dataset.wallpaperMode = 'manual';
    document.body.dataset.wallpaper = WALLPAPERS.includes(name) ? name : 'sky';
  }
  function clampWidgetPosition(x, y) {
    const maxX = Math.max(0, desktop.clientWidth - widget.offsetWidth);
    const maxY = Math.max(0, desktop.clientHeight - widget.offsetHeight);
    return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) };
  }
  function saveWidgetPosition(x, y) {
    localStorage.setItem(WIDGET_POSITION_KEY, JSON.stringify({ x, y }));
  }
  function loadWidgetPosition() {
    try {
      const saved = JSON.parse(localStorage.getItem(WIDGET_POSITION_KEY) || 'null');
      if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return;
      const position = clampWidgetPosition(saved.x, saved.y);
      widget.style.left = `${position.x}px`;
      widget.style.top = `${position.y}px`;
      widget.style.right = 'auto';
    } catch { /* invalid persisted position falls back to CSS */ }
  }
  // window traffic lights are bound by the shared titlebar module (js/titlebar.js)

  widget.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openWindow(); } });
  let drag = null;
  widget.addEventListener('pointerdown', (event) => {
    const rect = widget.getBoundingClientRect();
    drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, originX: rect.left, originY: rect.top, moved: false };
    widget.setPointerCapture(event.pointerId);
  });
  widget.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.hypot(dx, dy) > 5) { drag.moved = true; widget.classList.add('is-dragging'); }
    if (!drag.moved) return;
    const desktopRect = desktop.getBoundingClientRect();
    const position = clampWidgetPosition(drag.originX + dx - desktopRect.left, drag.originY + dy - desktopRect.top);
    widget.style.left = `${position.x}px`;
    widget.style.top = `${position.y}px`;
    widget.style.right = 'auto';
  });
  function finishDrag(pointerId, releaseCapture) {
    if (!drag || pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    widget.classList.remove('is-dragging');
    if (moved) {
      saveWidgetPosition(widget.offsetLeft, widget.offsetTop);
      widget.dataset.suppressClick = '1';
      setTimeout(() => { delete widget.dataset.suppressClick; }, 0);
    }
    if (releaseCapture && widget.hasPointerCapture(pointerId)) widget.releasePointerCapture(pointerId);
  }
  widget.addEventListener('pointerup', (event) => {
    finishDrag(event.pointerId, true);
  });
  widget.addEventListener('pointercancel', (event) => {
    finishDrag(event.pointerId, true);
  });
  widget.addEventListener('lostpointercapture', (event) => {
    finishDrag(event.pointerId, false);
  });
  widget.addEventListener('click', (event) => {
    if (widget.dataset.suppressClick === '1') { event.stopImmediatePropagation(); return; }
    openWindow();
  });
  // Marquee drives scrollLeft (the only way to reveal content clipped by
  // overflow:hidden — translating the box would just slide the clipped box).
  let marqueeRaf = null;
  function marqueeStart() {
    marqueeStop();
    const over = cityEl.scrollWidth - cityEl.clientWidth;
    if (over <= 0) return;
    const dur = Math.max(900, (over / 120) * 1000);
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      cityEl.scrollLeft = over * p;
      marqueeRaf = p < 1 ? requestAnimationFrame(step) : null;
    };
    marqueeRaf = requestAnimationFrame(step);
  }
  function marqueeStop() {
    if (marqueeRaf) { cancelAnimationFrame(marqueeRaf); marqueeRaf = null; }
    cityEl.scrollLeft = 0;
  }
  widget.addEventListener('mouseenter', marqueeStart);
  widget.addEventListener('mouseleave', marqueeStop);
  document.getElementById('dockWeather').addEventListener('click', openWindow);
  document.getElementById('desktopWeatherIcon').addEventListener('click', openWindow);
  document.getElementById('desktopSettingsIcon').addEventListener('click', () => {
    if (window.WeatherMacWindow && typeof window.WeatherMacWindow.openSettings === 'function') window.WeatherMacWindow.openSettings();
  });
  const handle = document.getElementById('windowDragHandle');
  let sx = 0, sy = 0, dragging = false;
  handle.addEventListener('mousedown', (e) => { dragging = true; sx = e.clientX; sy = e.clientY; });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (!dragging || win.classList.contains('hidden')) return;
    const r = win.getBoundingClientRect();
    win.style.left = (r.left + r.width / 2 + (e.clientX - sx)) + 'px';
    win.style.top = (r.top + r.height / 2 + (e.clientY - sy)) + 'px';
    win.style.transform = 'translate(-50%,-50%)';
    sx = e.clientX; sy = e.clientY;
  });
  renderClock(); setInterval(renderClock, 30000);
  setWallpaper(localStorage.getItem('weatherMac_wallpaper') || 'tahoe-auto');
  setInterval(() => {
    const stored = localStorage.getItem('weatherMac_wallpaper') || 'tahoe-auto';
    if (stored === 'time' || /-auto$/.test(stored)) setWallpaper(stored);
  }, 60000);
  loadWidgetPosition();
  renderWidget({ city: '', temp: '--', desc: window.WeatherMacI18n.t(localStorage.getItem('weatherMac_lang') || window.WeatherMacI18n.defaultLang(), 'loading'), hl: '' });
  window.WeatherMacDesktop = { openWindow, closeWindow, minimizeWindow, renderWidget, renderClock, setWallpaper, setWidgetWarn };
})();
