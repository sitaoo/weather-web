(function () {
  const Api = window.WeatherMacApi, I18n = window.WeatherMacI18n, Desktop = window.WeatherMacDesktop;
  const state = { cities: [], located: null, activeId: null, unit: 'celsius', lang: 'zh', cache: null, aqi: null };
  // The located city is special: kept outside cities[], always rendered first,
  // addressable via LOCATED_ID. It may coincide with a user city (shown once).
  const LOCATED_ID = '@located';
  const $ = (id) => document.getElementById(id);
  const ct = (key) => I18n.ct(state.lang, key);
  const tt = (key) => I18n.t(state.lang, key);
  function cityId(c) { return `${c.latitude.toFixed(3)},${c.longitude.toFixed(3)}`; }
  function loadState() {
    try {
      state.unit = localStorage.getItem('weatherMac_unit') || 'celsius';
      state.lang = localStorage.getItem('weatherMac_lang') || I18n.defaultLang();
      state.cities = JSON.parse(localStorage.getItem('weatherMac_cities') || '[]');
      state.located = JSON.parse(localStorage.getItem('weatherMac_located') || 'null');
      // Legacy migration: pinned used to live inside cities[].
      const legacyPin = state.cities.find((c) => c.pinned);
      state.cities.forEach((c) => delete c.pinned);
      if (!state.located && legacyPin) state.located = legacyPin;
      state.activeId = localStorage.getItem('weatherMac_active') || (state.cities[0] ? cityId(state.cities[0]) : null);
    } catch { state.cities = []; }
  }
  function saveState() {
    localStorage.setItem('weatherMac_cities', JSON.stringify(state.cities));
    localStorage.setItem('weatherMac_located', JSON.stringify(state.located));
    localStorage.setItem('weatherMac_active', state.activeId || '');
    localStorage.setItem('weatherMac_unit', state.unit);
    localStorage.setItem('weatherMac_lang', state.lang);
  }
  function activeCity() {
    if (state.activeId === LOCATED_ID) return state.located || state.cities[0] || null;
    return state.cities.find((c) => cityId(c) === state.activeId) || state.cities[0] || null;
  }
  function selectLocated() { state.activeId = LOCATED_ID; saveState(); renderCityList(); refreshActive().catch(showToast); }
  function renderCityList() {
    const ul = $('cityList'); ul.innerHTML = '';
    const rows = [];
    if (state.located) rows.push({ place: state.located, located: true });
    for (const c of state.cities) {
      if (state.located && cityId(c) === cityId(state.located)) continue;
      rows.push({ place: c, located: false });
    }
    rows.forEach(({ place: c, located }) => {
      const d = applyPlaceFix(c);
      const li = document.createElement('li');
      if (located ? state.activeId === LOCATED_ID : cityId(c) === state.activeId) li.classList.add('active');
      const nameSpan = document.createElement('span');
      nameSpan.className = 'city-name';
      nameSpan.textContent = d.name;
      nameSpan.addEventListener('mouseenter', () => {
        nameSpan.title = (nameSpan.scrollWidth > nameSpan.clientWidth + 1) ? d.name : '';
      });
      const nameRow = document.createElement('span');
      nameRow.className = 'city-name-row';
      nameRow.appendChild(nameSpan);
      if (showCoords() && Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) {
        const tag = document.createElement('span');
        tag.className = 'coords-tag';
        tag.textContent = `${c.latitude.toFixed(1)},${c.longitude.toFixed(1)}`;
        nameRow.appendChild(tag);
      }
      const textWrap = document.createElement('span');
      textWrap.className = 'city-text';
      textWrap.appendChild(nameRow);
      const sub = [d.admin2, d.admin1, d.country].filter(Boolean).join(' - ');
      if (sub) {
        const subSpan = document.createElement('span');
        subSpan.className = 'city-sub';
        subSpan.textContent = sub;
        textWrap.appendChild(subSpan);
      }
      li.appendChild(textWrap);
      if (located) {
        const tag = document.createElement('span');
        tag.className = 'pinned-tag';
        tag.textContent = ct('located');
        li.appendChild(tag);
      } else {
        const delBtn = document.createElement('button');
        delBtn.className = 'del';
        delBtn.title = ct('delete');
        delBtn.textContent = '×';
        delBtn.addEventListener('click', (e) => { e.stopPropagation(); removeCity(c); });
        li.appendChild(delBtn);
      }
      li.addEventListener('click', () => (located ? selectLocated() : selectCity(c)));
      // The located row stays fixed: not draggable, not a drop target.
      li.draggable = !located;
      li.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', cityId(c));
        e.dataTransfer.effectAllowed = 'move';
        li.classList.add('dragging');
      });
      li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        ul.querySelectorAll('.drop-target').forEach((el) => el.classList.remove('drop-target'));
      });
      li.addEventListener('dragover', (e) => {
        if (located) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        li.classList.add('drop-target');
      });
      li.addEventListener('dragleave', () => li.classList.remove('drop-target'));
      li.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (located) return;
        const fromId = e.dataTransfer.getData('text/plain');
        const toId = cityId(c);
        if (!fromId || fromId === toId) return;
        const fromIdx = state.cities.findIndex((x) => cityId(x) === fromId);
        const toIdx = state.cities.findIndex((x) => cityId(x) === toId);
        if (fromIdx < 0 || toIdx < 0) return;
        const [moved] = state.cities.splice(fromIdx, 1);
        state.cities.splice(toIdx, 0, moved);
        saveState(); renderCityList();
      });
      ul.appendChild(li);
    });
  }
  // Re-locate: replaces the special located city wholesale (single slot, so
  // IP jitter can never accumulate duplicates). Throws on provider failure
  // so callers keep the previous fix.
  async function relocate() {
    const geo = await Api.detectLocationByIP();
    if (!geo || geo.status !== 'success') throw new Error('locate failed');
    const found = await Api.searchCity(geo.city, state.lang);
    if (!found[0]) throw new Error('locate failed');
    state.located = { ...found[0] };
    saveState(); renderCityList();
  }
  async function refreshActive() {
    const city = activeCity(); if (!city) return;
    hideWarnBanner();
    Desktop.setWidgetWarn(null);
    try { await relocate(); } catch { /* keep previous located city */ }
    try {
      const data = await Api.fetchWeather(city, state.unit);
      state.cache = data;
      // AQI rides along but must never break weather rendering.
      try {
        const aqi = await Api.fetchAirQuality(city);
        if (aqi && aqi.current && Number.isFinite(aqi.current.us_aqi)) state.aqi = aqi;
      } catch (err) { /* keep previous AQI */ }
      const info = Api.getWeatherInfo(data.current.weather_code, data.current.is_day === 1, state.lang);
      const unitSym = state.unit === 'fahrenheit' ? '°F' : '°C';
      $('heroCity').textContent = city.name;
      $('heroTemp').textContent = `${Math.round(data.current.temperature_2m)}${unitSym}`;
      $('heroDesc').textContent = info.desc;
      $('heroHL').textContent = `${Math.round(data.daily.temperature_2m_max[0])}° / ${Math.round(data.daily.temperature_2m_min[0])}°`;
      document.getElementById('hero').style.background = Api.getBackgroundGradient(data.current.weather_code, data.current.is_day === 1);
    applyGlassWidget(data);
      Desktop.renderWidget({ city: city.name, temp: `${Math.round(data.current.temperature_2m)}°`, desc: info.desc, hl: `${Math.round(data.daily.temperature_2m_max[0])}° / ${Math.round(data.daily.temperature_2m_min[0])}°`, icon: Api.getWeatherIconUrl(info.icon), pinned: state.activeId === LOCATED_ID });
      renderHourly(data); renderTenDay(data); renderGrid(data);
      refreshWarnings(city);
    } catch (err) {
      showToast(ct('fetchFail'));
      if (state.cache) { renderHourly(state.cache); renderTenDay(state.cache); renderGrid(state.cache); applyGlassWidget(state.cache); }
      refreshWarnings(city);
    }
  }
  function selectCity(c) { state.activeId = cityId(c); saveState(); renderCityList(); refreshActive().catch(showToast); }
  function addCity(c) {
    c = applyPlaceFix(c);
    if (!c.curated) {
      const cache = namesOf(c);
      if (!cache[state.lang]) cache[state.lang] = snapshotOf(c);
    }
    if (!state.cities.some((x) => cityId(x) === cityId(c))) state.cities.push(c);
    state.activeId = cityId(c); saveState(); renderCityList(); refreshActive().catch(showToast);
  }
  function removeCity(c) {
    state.cities = state.cities.filter((x) => cityId(x) !== cityId(c));
    if (state.activeId === cityId(c)) {
      state.activeId = state.located ? LOCATED_ID : (state.cities[0] ? cityId(state.cities[0]) : null);
    }
    saveState(); renderCityList();
    if (state.activeId) refreshActive().catch(showToast);
  }
  const WARN_LEVELS = { '蓝色': 1, '黄色': 2, '橙色': 3, '红色': 4 };
  const WARN_SIGNALS = [
    ['中小河流洪水和山洪气象风险', 'FlashFlood'],
    ['山洪灾害气象风险', 'FlashFlood'],
    ['海上雷雨大风', 'ThunderGale'],
    ['山洪灾害', 'FlashFlood'],
    ['森林（草原）火险', 'FireRisk'],
    ['山洪风险', 'FlashFlood'],
    ['雷雨大风', 'ThunderGale'],
    ['海上大风', 'SeaGale'],
    ['道路结冰', 'RoadIce'],
    ['地质灾害', 'GeoHazard'],
    ['沙尘暴', 'Sandstorm'],
    ['寒潮', 'Coldwave'],
    ['台风', 'Typhoon'],
    ['暴雨', 'Rainstorm'],
    ['暴雪', 'Blizzard'],
    ['大风', 'Gale'],
    ['高温', 'Heat'],
    ['干旱', 'Drought'],
    ['雷电', 'Thunder'],
    ['冰雹', 'Hail'],
    ['霜冻', 'Frost'],
    ['大雾', 'Fog'],
    ['霾', 'Haze'],
    ['山洪', 'FlashFlood']
  ];
  function parseAlarmTitle(title) {
    const m = /发布(.+?)(蓝色|黄色|橙色|红色)预警/.exec(title || '');
    if (!m) return null;
    let signal = null;
    for (const [text, key] of WARN_SIGNALS) {
      if (m[1].includes(text)) { signal = key; break; }
    }
    if (!signal) return null;
    return { signal, level: m[2], publisher: title.split('发布')[0] };
  }
  function normPlace(s) {
    return (s || '').replace(/(自治区|自治州|地区)$/, '').replace(/(省|市|县|区|旗|盟|镇|乡)$/, '');
  }
  // alertid 前 6 位是发布单位行政区划码: 省级结尾 0000 / 地市级结尾 00 / 县级其他。
  function scopeLevel(code) {
    if (!/^\d{6}$/.test(code || '')) return 0;
    if (code.endsWith('0000')) return 1;
    if (code.endsWith('00')) return 2;
    return 3;
  }
  // 任一方向的上下级包含即命中: 省预警覆盖全省, 地市预警覆盖本级及下属区县。
  function alarmApplies(aCode, cCode, cLevel) {
    const aScope = scopeLevel(aCode);
    if (!aScope) return false;
    const aPre = aCode.slice(0, 2 * aScope);
    const cPre = cCode.slice(0, 2 * cLevel);
    return cCode.startsWith(aPre) || aCode.startsWith(cPre);
  }
  function resolveCityAdcode(admin, city) {
    const zhc = (city.names && city.names.zh) || {};
    const keys = [city.name, city.admin2, city.admin1, zhc.name, zhc.admin2, zhc.admin1].filter(Boolean);
    const suffixes = ['', '市', '省', '自治区', '自治州', '县', '区'];
    for (const k of keys) {
      let hits = [];
      for (const s of suffixes) {
        const h = admin.byName.get(k + s);
        if (h && h.length) { hits = h; break; }
      }
      if (!hits.length) continue;
      if (hits.length === 1) return { code: hits[0].code, level: hits[0].level };
      const rest = new Set();
      keys.forEach(x => { if (x !== k) { rest.add(x); rest.add(normPlace(x)); } });
      const ok = hits.filter(r => admin.chain(r).some(nm => rest.has(nm) || rest.has(normPlace(nm))));
      const pick = (ok.length ? ok : hits).sort((a, b) => b.level - a.level)[0];
      return { code: pick.code, level: pick.level };
    }
    return null;
  }
  async function matchAlarms(city, list) {
    if (!city) return [];
    if (city.country_code && city.country_code !== 'CN') return [];
    const parsed = [];
    for (const a of list) {
      const p = parseAlarmTitle(a.title);
      if (p) parsed.push({ ...a, ...p, severity: WARN_LEVELS[p.level] || 0 });
    }
    if (!parsed.length) return [];
    let codeInfo = null;
    try {
      const admin = window.WeatherMacGeoDB && await window.WeatherMacGeoDB.getAdmin();
      if (admin) codeInfo = resolveCityAdcode(admin, city);
    } catch (err) { codeInfo = null; }
    const out = [];
    for (const a of parsed) {
      if (codeInfo) {
        const m = /^(\d{6})/.exec(a.alertid || '');
        if (m) {
          // 区划码有效: 范围外精确排除,不再回退名字匹配,避免跨州误报。
          if (alarmApplies(m[1], codeInfo.code, codeInfo.level)) {
            out.push({ ...a, spec: scopeLevel(m[1]) });
          }
          continue;
        }
      }
      let best = 0;
      const names = [city.name, city.admin2, city.admin1,
        city.names && city.names.zh && city.names.zh.name,
        city.names && city.names.zh && city.names.zh.admin2,
        city.names && city.names.zh && city.names.zh.admin1].filter(Boolean);
      for (const n of names) {
        const nn = normPlace(n);
        if (nn && a.publisher.includes(nn)) best = Math.max(best, nn.length);
      }
      if (best > 0) out.push({ ...a, spec: best >= 3 ? 2 : 1 });
    }
    out.sort((x, y) => (y.severity - x.severity) || (y.spec - x.spec));
    return out;
  }
  function escHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function warnLevelClass(level) {
    return { '蓝色': 'lv-blue', '黄色': 'lv-yellow', '橙色': 'lv-orange', '红色': 'lv-red' }[level] || 'lv-blue';
  }
  function warnLevelKey(level) {
    return { '蓝色': 'warnBlue', '黄色': 'warnYellow', '橙色': 'warnOrange', '红色': 'warnRed' }[level] || 'warnBlue';
  }
  // NMC issuetime looks like "2026/09/10 12:25" (local time); parse manually
  // instead of Date.parse for consistent cross-browser behavior.
  function alarmAgeMs(issuetime) {
    const s = String(issuetime || '');
    if (/T\d{2}:\d{2}/.test(s)) {
      const t = Date.parse(s);
      return Number.isFinite(t) ? Date.now() - t : NaN;
    }
    const m = /^(\d{4})\/(\d{2})\/(\d{2})[ T](\d{2}):(\d{2})/.exec(s);
    if (!m) return NaN;
    return Date.now() - new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime();
  }
  function warnUrl(a) {
    if (!a) return '#';
    return a.kind === 'nws' ? escHtml(a.url) : `https://www.nmc.cn${escHtml(a.url)}`;
  }
  // CN signals map to i18n keys; NWS event names stay in English原文.
  function warnSignalLabel(a) {
    return a && a.kind === 'nws' ? (a.signal || a.title) : ct('warn' + a.signal);
  }
  function hideWarnBanner() {
    const el = document.getElementById('warnBanner');
    if (el) { el.classList.add('hidden'); el.innerHTML = ''; }
  }
  function renderWarnBanner(matched) {
    const bar = document.getElementById('warnBanner');
    if (!bar) return;
    if (!matched.length) { hideWarnBanner(); return; }
    const sorted = matched.slice().sort((a, b) => String(b.issuetime || '').localeCompare(String(a.issuetime || '')));
    const top = sorted[0];
    const rest = sorted.slice(1);
    bar.classList.remove('hidden');
    bar.innerHTML = `
      <div class="warn-head ${warnLevelClass(top.level)}">
        <a class="warn-head-link" href="${warnUrl(top)}" target="_blank" rel="noreferrer">
          ${top.pic ? `<img class="warn-head-icon" src="${escHtml(top.pic)}" alt="">` : ''}
          <span class="warn-head-body">
            <span class="warn-head-title">${escHtml(top.title)}</span>
            <span class="warn-head-text"></span>
            <span class="warn-head-meta">${escHtml(top.publisher)} · ${escHtml(top.issuetime || '')} · ${escHtml(ct(warnLevelKey(top.level)))}</span>
          </span>
        </a>
        ${rest.length ? `<button class="warn-hist" data-act="toggle">
          <span>${escHtml(ct('warnHistory'))} (+${rest.length})</span>
          <span class="warn-chev">▾</span>
        </button>` : ''}
      </div>
      ${rest.length ? `<div class="warn-list hidden">
        ${rest.map((a) => `
          <a class="warn-item" href="${warnUrl(a)}" target="_blank" rel="noreferrer">
            <span class="warn-dot ${warnLevelClass(a.level)}"></span>
            <span class="warn-title">${escHtml(warnSignalLabel(a))} · ${escHtml(ct(warnLevelKey(a.level)))}</span>
            <span class="warn-pub">${escHtml(a.publisher)} ${escHtml((a.issuetime || '').slice(-5))}</span>
          </a>`).join('')}
      </div>` : ''}`;
    const icon = bar.querySelector('.warn-head-icon');
    if (icon) icon.addEventListener('error', () => icon.remove());
    bar.dataset.alertid = top.alertid || top.url;
    Api.fetchAlarmDetail(top).then((d) => {
      if (!d || !d.body) return;
      if (bar.dataset.alertid !== (top.alertid || top.url)) return;
      const body = bar.querySelector('.warn-head-body');
      const el = bar.querySelector('.warn-head-text');
      if (!el) return;
      el.textContent = d.body;
      if (body) body.classList.add('with-body');
      if (el.scrollHeight > el.clientHeight + 1) {
        el.classList.add('expandable');
        el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.toggle('expanded'); });
      }
      const hw = document.getElementById('widgetWarn');
      if (hw) hw.title = d.body;
    }).catch(() => {});
    const toggle = bar.querySelector('.warn-hist');
    if (toggle) toggle.addEventListener('click', () => {
      const list = bar.querySelector('.warn-list');
      list.classList.toggle('hidden');
      const chev = toggle.querySelector('.warn-chev');
      if (chev) chev.textContent = list.classList.contains('hidden') ? '▾' : '▴';
    });
  }
  async function refreshWarnings(city) {
    try {
      if (!city) { hideWarnBanner(); Desktop.setWidgetWarn(null); return; }
      if (city.country_code === 'US') { await refreshUSWarnings(city); return; }
      if (city.country_code && city.country_code !== 'CN') { hideWarnBanner(); Desktop.setWidgetWarn(null); return; }
      const list = await Api.fetchAlarms();
      const matched = await matchAlarms(city, list);
      renderWarnBanner(matched);
      if (!matched.length) { Desktop.setWidgetWarn(null); return; }
      const top = matched.slice().sort((a, b) => String(b.issuetime || '').localeCompare(String(a.issuetime || '')))[0];
      const age = alarmAgeMs(top.issuetime);
      if (Number.isFinite(age) && age > 6 * 60 * 60 * 1000) { Desktop.setWidgetWarn(null); return; }
      Desktop.setWidgetWarn({ label: warnSignalLabel(top), title: top.title, cls: warnLevelClass(top.level) });
    } catch (err) { hideWarnBanner(); Desktop.setWidgetWarn(null); }
  }
  async function refreshUSWarnings(city) {
    const list = await Api.fetchUSAlerts(city);
    renderWarnBanner(list);
    if (!list.length) { Desktop.setWidgetWarn(null); return; }
    const top = list[0];
    // NWS items come from /active so they are in effect by construction;
    // gate the badge on expiry (not sent): a day-long heat warning issued
    // yesterday noon must still badge while effective.
    const end = Date.parse(top.ends || '');
    if (Number.isFinite(end) && end < Date.now()) { Desktop.setWidgetWarn(null); return; }
    Desktop.setWidgetWarn({ label: warnSignalLabel(top), title: top.title, cls: warnLevelClass(top.level) });
  }
  // Liquid-precipitation codes (drizzle/rain/showers/thunderstorm): the precip
  // % shows only under these icons, other hours/days render the icon alone.
  function isRainCode(code) {
    const c = Number(code);
    return (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || (c >= 95 && c <= 99);
  }
  function renderHourly(data) {
  const box = document.getElementById('hourly'); box.innerHTML = '';
  const nowH = new Date(data.current.time).getTime();
  let start = data.hourly.time.findIndex((t) => new Date(t).getTime() >= nowH - 3600000);
  if (start < 0) start = 0;
  const hour12 = normalizeHourClock(localStorage.getItem('weatherMac_hour12')) === '12';
  for (let i = start; i < Math.min(start + 24, data.hourly.time.length); i++) {
    const d = new Date(data.hourly.time[i]);
    const label = hour12
      ? d.toLocaleString('en-US', { hour: 'numeric' })
      : String(d.getHours()).padStart(2, '0') + ':00';
    const info = window.WeatherMacApi.getWeatherInfo(data.hourly.weather_code[i], true, window.WeatherMacWindow.state.lang);
    const div = document.createElement('div');
    div.className = 'hour-cell';
    const p = data.hourly.precipitation_probability?.[i] ?? 0;
    const prec = isRainCode(data.hourly.weather_code[i]) ? `<div class="prec">${p}%</div>` : '';
    div.innerHTML = `<div>${label}</div><div class="h-icon"><img src="${window.WeatherMacApi.getWeatherIconUrl(info.icon)}" alt="${info.desc}">${prec}</div><div>${Math.round(data.hourly.temperature_2m[i])}°</div>`;
    box.appendChild(div);
  }
  updateHourNav();
}
// Narrow day list: hide the rain columns first, keep date/desc/icon/range.
function updateTendayCompact() {
  const box = document.getElementById('tenday');
  if (!box) return;
  box.classList.toggle('compact', box.clientWidth > 0 && box.clientWidth < 380);
}
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(updateTendayCompact).observe(document.getElementById('tenday'));
}
// Hourly pager buttons: smooth-scroll ~one page, grey out at the edges.
function updateHourNav() {
  const strip = document.getElementById('hourly');
  const prev = document.getElementById('hourlyPrev');
  const next = document.getElementById('hourlyNext');
  if (!strip || !prev || !next) return;
  const max = strip.scrollWidth - strip.clientWidth;
  if ('disabled' in prev) prev.disabled = strip.scrollLeft <= 1;
  if ('disabled' in next) next.disabled = strip.scrollLeft >= max - 1;
}
function pageHourly(dir) {
  const strip = document.getElementById('hourly');
  if (!strip) return;
  strip.scrollBy({ left: dir * strip.clientWidth * 0.9, behavior: 'smooth' });
  updateHourNav();
}
// Mouse drag-to-scroll for the hourly strip (touch keeps native scrolling).
(function enableHourlyDragScroll() {
  const strip = document.getElementById('hourly');
  document.getElementById('hourlyPrev').addEventListener('click', () => pageHourly(-1));
  document.getElementById('hourlyNext').addEventListener('click', () => pageHourly(1));
  strip.addEventListener('scroll', updateHourNav);
  let drag = null;
  strip.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, scroll: strip.scrollLeft };
  });
  strip.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4) strip.classList.add('dragging');
    if (strip.classList.contains('dragging')) strip.scrollLeft = drag.scroll - dx;
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    strip.classList.remove('dragging');
  };
  strip.addEventListener('pointerup', end);
  strip.addEventListener('pointercancel', end);
  strip.addEventListener('dragstart', (e) => e.preventDefault());
})();
function renderTenDay(data) {
  const box = document.getElementById('tenday'); box.innerHTML = '';
  const days = window.WeatherMacI18n.weekDaysMap[window.WeatherMacWindow.state.lang] || window.WeatherMacI18n.weekDaysMap.en;
  const los = data.daily.temperature_2m_min;
  const his = data.daily.temperature_2m_max;
  const gmin = Math.min.apply(null, los);
  const gmax = Math.max.apply(null, his);
  const span = (gmax - gmin) || 1;
  const toC = (t) => window.WeatherMacWindow.state.unit === 'fahrenheit' ? (t - 32) * 5 / 9 : t;
  let hasRain = false;
  data.daily.time.forEach((t, i) => {
    const wd = i === 0 ? tt('today') : days[new Date(t).getDay()];
    const info = window.WeatherMacApi.getWeatherInfo(data.daily.weather_code[i], true, window.WeatherMacWindow.state.lang);
    const lo = Math.round(los[i]);
    const hi = Math.round(his[i]);
    const left = Math.max(0, Math.min(100, (los[i] - gmin) / span * 100));
    const width = Math.max(4, Math.min(100 - left, (his[i] - los[i]) / span * 100));
    const row = document.createElement('div');
    row.className = 'day-row';
    const p = data.daily.precipitation_probability_max?.[i] ?? 0;
    const drops = p <= 30 ? 0 : p <= 60 ? 1 : p <= 90 ? 2 : 3;
    const rainy = isRainCode(data.daily.weather_code[i]);
    if (rainy) hasRain = true;
    const dropMeter = rainy ? [0, 1, 2].map((k) => k < drops ? DROPLET_SVG : DROPLET_SVG_OFF).join('') : '';
    const pct = rainy ? `<span class="d-pct" title="${ct('precipProb')}: ${p}%">${p}%</span>` : '<span class="d-pct"></span>';
    row.innerHTML = `<span class="d-wd">${wd}</span>` +
      `<span class="d-desc">${info.desc}</span>` +
      `<span class="d-icon"><img src="${window.WeatherMacApi.getWeatherIconUrl(info.icon)}" alt="${info.desc}"></span>` +
      `<span class="d-drops" title="${ct('precipProb')}: ${p}%">${dropMeter}</span>${pct}` +
      `<span class="d-range"><span class="d-low">${lo}°</span>` +
      `<span class="d-bar">` +
      `<span class="d-fill" style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%;background:linear-gradient(90deg,${tempColor(toC(los[i]))},${tempColor(toC(his[i]))})"></span></span>` +
      `<span class="d-high">${hi}°</span></span>`;
    box.appendChild(row);
  });
  box.classList.toggle('no-rain', !hasRain);
}
// Absolute-temperature color scale (input Celsius), Apple Weather style.
const TEMP_STOPS = [[-30, '#5b5bd6'], [-20, '#4a7de0'], [-10, '#4fa3e3'], [0, '#63c7e6'], [10, '#7ddba3'], [15, '#c9e36b'], [20, '#f6d743'], [25, '#f0a13c'], [30, '#e4572e'], [35, '#c13b8e'], [40, '#8e44ad']];
function tempColor(t) {
  if (t <= TEMP_STOPS[0][0]) return TEMP_STOPS[0][1];
  for (let i = 1; i < TEMP_STOPS.length; i++) {
    if (t <= TEMP_STOPS[i][0]) {
      const [t0, c0] = TEMP_STOPS[i - 1];
      const [t1, c1] = TEMP_STOPS[i];
      const f = (t - t0) / (t1 - t0);
      return '#' + [0, 2, 4].map((k) => {
        const a = parseInt(c0.slice(1 + k, 3 + k), 16);
        const b = parseInt(c1.slice(1 + k, 3 + k), 16);
        return Math.round(a + (b - a) * f).toString(16).padStart(2, '0');
      }).join('');
    }
  }
  return TEMP_STOPS[TEMP_STOPS.length - 1][1];
}
const LAYERS_SVG = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>';
const DROPLET_SVG = '<svg viewBox="0 0 24 24" width="7" height="7" fill="currentColor"><path d="M12 2C12 2 5 10.2 5 15a7 7 0 0 0 14 0C19 10.2 12 2 12 2z"/></svg>';
const DROPLET_SVG_OFF = '<svg viewBox="0 0 24 24" width="7" height="7" fill="none" stroke="currentColor" stroke-width="2.4" opacity="0.35"><path d="M12 2C12 2 5 10.2 5 15a7 7 0 0 0 14 0C19 10.2 12 2 12 2z"/></svg>';
function aqiLevelKey(aqi) {
  if (aqi <= 50) return 'aqiGood';
  if (aqi <= 100) return 'aqiModerate';
  if (aqi <= 150) return 'aqiUsg';
  if (aqi <= 200) return 'aqiUnhealthy';
  if (aqi <= 300) return 'aqiVeryUnhealthy';
  return 'aqiHazardous';
}
function renderGrid(data) {
  const box = document.getElementById('grid9');
  const c = data.current;
  const unitSym = window.WeatherMacWindow.state.unit === 'fahrenheit' ? '°F' : '°C';
  const windSym = window.WeatherMacWindow.state.unit === 'fahrenheit' ? 'mph' : 'km/h';
  const vis = data.hourly?.visibility?.[0] != null ? `${(data.hourly.visibility[0] / 1000).toFixed(1)} km` : '—';
  const aqiNow = window.WeatherMacWindow.state.aqi;
  const aqiVal = aqiNow && aqiNow.current && Number.isFinite(aqiNow.current.us_aqi) ? Math.round(aqiNow.current.us_aqi) : null;
  const cells = [
    [tt('feelsLike'), `${Math.round(c.apparent_temperature)}${unitSym}`],
    [tt('humidity'), `${c.relative_humidity_2m}%`],
    [tt('windSpeed'), `${Math.round(c.wind_speed_10m)} ${windSym}`],
    [tt('precipitation'), `${c.precipitation} mm`],
    [ct('gridUv'), `${data.daily.uv_index_max?.[0] ?? '—'}`],
    [ct('gridSun'), `${(data.daily.sunrise?.[0] || '').slice(11) || '—'} / ${(data.daily.sunset?.[0] || '').slice(11) || '—'}`],
    [ct('gridVis'), vis],
    [ct('gridPressure'), `${Math.round(c.pressure_msl || 0)} hPa`],
    ['AQI', aqiVal === null ? ct('gridAqi') : `${aqiVal} · ${ct(aqiLevelKey(aqiVal))}`]
  ];
  box.innerHTML = cells.map(([k, v]) => `<div class="metric"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
}
function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = String(msg && msg.message || msg);
    el.classList.remove('hidden');
    clearTimeout(showToast._t); showToast._t = setTimeout(() => el.classList.add('hidden'), 3000);
  }
  let refreshTimer = null;
  function applyRefreshTimer() {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
    const mins = parseInt(localStorage.getItem('weatherMac_refresh') || '60', 10);
    if (mins > 0) refreshTimer = setInterval(() => { window.WeatherMacWindow.refreshActive().catch(showToast); }, mins * 60000);
  }
  const GLASS_OPTIONS = [
    { id: 'dark', lk: 'gDark' },
    { id: 'light', lk: 'gLight' },
    { id: 'weather', lk: 'gWeather' }
  ];
  function currentGlass() { return localStorage.getItem('weatherMac_glass') || 'light'; }
  // Legacy values '1'/'0' map to '12'/'24'; anything else defaults to 24-hour.
  function normalizeHourClock(v) { return (v === '12' || v === '1') ? '12' : '24'; }
  function applyGlassWidget(data) {
    const widget = document.getElementById('widgetCard');
    if (currentGlass() === 'weather' && data) {
      widget.style.background = Api.getBackgroundGradient(data.current.weather_code, data.current.is_day === 1);
    } else {
      widget.style.background = '';
    }
  }
  function renderGlassPicker(selected) {
    const picker = document.getElementById('glassPicker');
    picker.innerHTML = '';
    GLASS_OPTIONS.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `wallpaper-option${option.id === selected ? ' selected' : ''}`;
      button.dataset.glass = option.id;
      button.title = ct(option.lk);
      button.setAttribute('aria-label', ct(option.lk));
      const preview = document.createElement('span');
      preview.className = 'wallpaper-preview glass-preview glass-' + option.id;
      preview.innerHTML = '<span class="glass-prev-temp">22°</span><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="7.5" r="2.5"/><path d="M7.5 1.5v1.5M1.5 7.5H3M3.3 3.3l1 1M11.7 3.3l-1 1"/><path d="M18 14h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>';
      const checkmark = document.createElement('span');
      checkmark.className = 'wallpaper-check';
      checkmark.textContent = '✓';
      const label = document.createElement('span');
      label.className = 'wallpaper-label';
      label.textContent = ct(option.lk);
      button.append(preview, checkmark, label);
      button.addEventListener('click', () => {
        localStorage.setItem('weatherMac_glass', option.id);
        document.body.dataset.glass = option.id;
        renderGlassPicker(option.id);
        applyGlassWidget(state.cache);
      });
      picker.appendChild(button);
    });
  }
  const WALLPAPER_OPTIONS = [
    { id: 'sky', lk: 'wSky', preview: 'linear-gradient(135deg,#3a8dde,#9fd4ff)' },
    { id: 'space', lk: 'wSpace', preview: 'linear-gradient(135deg,#0b1e4b,#123a6d)' },
    { id: 'sunset', lk: 'wSunset', preview: 'linear-gradient(135deg,#5b2a86,#ff7e5f)' },
    { id: 'gray', lk: 'wGray', preview: 'linear-gradient(135deg,#5a6270,#2e3440)' },
    { id: 'tahoe-auto', lk: 'wTahoe', shots: 2, preview: "url('data/wallpapers/tahoe-day.jpg')", gallery: ['tahoe-day.jpg', 'tahoe-night.jpg'] },
    { id: 'sequoia-auto', lk: 'wSequoia', shots: 2, preview: "url('data/wallpapers/sequoia-day.jpg')", gallery: ['sequoia-day.jpg', 'sequoia-night.jpg'] },
    { id: 'sonoma-auto', lk: 'wSonoma', shots: 2, preview: "url('data/wallpapers/sonoma-day.jpg')", gallery: ['sonoma-day.jpg', 'sonoma-night.jpg'] },
    { id: 'ventura-auto', lk: 'wVentura', shots: 2, preview: "url('data/wallpapers/ventura-day.jpg')", gallery: ['ventura-day.jpg', 'ventura-night.jpg'] },
    { id: 'bigsur-auto', lk: 'wBigsur', shots: 6, preview: "url('data/wallpapers/bigsur-day.jpg')", gallery: ['bigsur-dawn.jpg', 'bigsur-morning.jpg', 'bigsur-day.jpg', 'bigsur-afternoon.jpg', 'bigsur-dusk.jpg', 'bigsur-night.jpg'] },
    { id: 'time', lk: 'wTime', shots: 5, preview: 'linear-gradient(135deg,#ff9a8b,#243b6b)', gallery: ['sonoma-day.jpg', 'tahoe-day.jpg', 'bigsur-day.jpg', 'sonoma-night.jpg', 'tahoe-night.jpg'] }
  ];
  function renderWallpaperPicker(selected) {
    const picker = document.getElementById('wallpaperPicker');
    picker.innerHTML = '';
    WALLPAPER_OPTIONS.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `wallpaper-option${option.id === selected ? ' selected' : ''}`;
      button.dataset.wallpaper = option.id;
      button.title = ct(option.lk);
      button.setAttribute('aria-label', ct(option.lk));
      const preview = document.createElement('span');
      preview.className = 'wallpaper-preview';
      preview.style.background = option.preview;
      if (option.preview.startsWith('url(')) preview.style.backgroundSize = 'cover';
      const checkmark = document.createElement('span');
      checkmark.className = 'wallpaper-check';
      checkmark.textContent = '✓';
      button.append(preview, checkmark);
      if (option.shots > 1) {
        const badge = document.createElement('span');
        badge.className = 'wallpaper-count';
        badge.setAttribute('role', 'button');
        badge.setAttribute('tabindex', '0');
        badge.setAttribute('aria-label', ct(option.lk));
        badge.innerHTML = `${LAYERS_SVG}<span>${option.shots}</span>`;
        const open = (e) => { e.stopPropagation(); openGallery(option); };
        badge.addEventListener('click', open);
        badge.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGallery(option); }
        });
        button.append(badge);
      }
      const label = document.createElement('span');
      label.className = 'wallpaper-label';
      label.textContent = ct(option.lk);
      button.append(label);
      button.addEventListener('click', () => {
        localStorage.setItem('weatherMac_wallpaper', option.id);
        window.WeatherMacDesktop.setWallpaper(option.id);
        renderWallpaperPicker(option.id);
      });
      picker.appendChild(button);
    });
  }
  let galleryList = [], galleryIdx = 0, galleryName = '';
  function openGallery(option) {
    if (!option.gallery || !option.gallery.length) return;
    galleryList = option.gallery;
    galleryIdx = 0;
    galleryName = ct(option.lk);
    renderGallery();
    document.getElementById('galleryModal').classList.remove('hidden');
  }
  function renderGallery() {
    const img = document.getElementById('galleryImg');
    img.src = 'data/wallpapers/' + galleryList[galleryIdx];
    img.alt = galleryName;
    document.getElementById('galleryCaption').textContent = `${galleryName} · ${galleryIdx + 1} / ${galleryList.length}`;
    [galleryIdx + 1, galleryIdx - 1].forEach((i) => {
      const j = (i + galleryList.length) % galleryList.length;
      const pre = new Image();
      pre.src = 'data/wallpapers/' + galleryList[j];
    });
  }
  function stepGallery(d) {
    if (!galleryList.length) return;
    galleryIdx = (galleryIdx + d + galleryList.length) % galleryList.length;
    renderGallery();
  }
  function closeGallery() {
    document.getElementById('galleryModal').classList.add('hidden');
    galleryList = [];
  }
  function isGalleryOpen() {
    return !document.getElementById('galleryModal').classList.contains('hidden');
  }
  document.getElementById('galleryClose').addEventListener('click', closeGallery);
  document.getElementById('galleryPrev').addEventListener('click', () => stepGallery(-1));
  document.getElementById('galleryNext').addEventListener('click', () => stepGallery(1));
  document.getElementById('galleryModal').addEventListener('click', (e) => {
    if (e.target.id === 'galleryModal') closeGallery();
  });
  document.addEventListener('keydown', (e) => {
    if (!isGalleryOpen()) return;
    if (e.key === 'ArrowLeft') stepGallery(-1);
    else if (e.key === 'ArrowRight') stepGallery(1);
    else if (e.key === 'Escape') closeGallery();
  });
  loadState(); renderCityList();
  (async function bootstrapLocation() {
    try {
      await relocate();
    } catch {
      if (!state.cities.length && !state.located) {
        const bj = (state.lang === 'zh' || state.lang === 'zh-tw')
          ? { name: '北京', country: '中国' }
          : { name: 'Beijing', country: 'China' };
        state.cities.push(Object.assign({ latitude: 39.9, longitude: 116.4, timezone: 'Asia/Shanghai' }, bj));
      }
    }
    // Keep the user's selection; only heal dangling ids (e.g. from older builds).
    const resolves = state.activeId === LOCATED_ID
      ? !!state.located
      : state.cities.some((c) => cityId(c) === state.activeId);
    if (!resolves) {
      state.activeId = state.located ? LOCATED_ID
        : (state.cities[0] ? cityId(state.cities[0]) : null);
    }
    saveState(); renderCityList();
    refreshActive().catch(showToast);
  })();
// Script-aware fallback: CJK/Kana/Hangul/Cyrillic/Arabic/Thai queries only match
// when the geocoding language fits the script (e.g. '北京' + language=en returns []),
// so retry with the detected script language when the UI language yields nothing.
function detectQueryLang(q) {
  if (/[一-鿿]/.test(q)) return 'zh';
  if (/[぀-ヿ]/.test(q)) return 'ja';
  if (/[가-힯]/.test(q)) return 'ko';
  if (/[Ѐ-ӿ]/.test(q)) return 'ru';
  if (/[؀-ۿ]/.test(q)) return 'ar';
  if (/[ก-๿]/.test(q)) return 'th';
  return null;
}
// Parses Wikipedia-style DMS coordinates, e.g. "28°22′N 100°14′E",
// "28°22'30\"N, 100°14'10\"E", "27.826°N 99.707°E". Hemisphere letters decide
// which part is lat (N/S) vs lon (E/W), so order is flexible. Returns {lat, lon} or null.
function parseDMSCoord(q) {
  const part = /(\d+(?:\.\d+)?)\s*°?\s*(?:(\d+(?:\.\d+)?)\s*['′’]?\s*)?(?:(\d+(?:\.\d+)?)\s*["″”]?\s*)?([NSEW])/gi;
  const parts = [];
  let m;
  while ((m = part.exec(q)) !== null) {
    parts.push(m);
    if (parts.length > 2) return null;
  }
  if (parts.length !== 2) return null;
  let lat = null, lon = null;
  for (const p of parts) {
    const min = p[2] === undefined ? 0 : parseFloat(p[2]);
    const sec = p[3] === undefined ? 0 : parseFloat(p[3]);
    if (min >= 60 || sec >= 60) return null;
    let v = parseFloat(p[1]) + min / 60 + sec / 3600;
    const h = p[4].toUpperCase();
    if (h === 'S' || h === 'W') v = -v;
    if (h === 'N' || h === 'S') {
      if (lat !== null) return null;
      lat = v;
    } else {
      if (lon !== null) return null;
      lon = v;
    }
  }
  if (lat === null || lon === null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}
// Curated corrections from data-raw/city-overrides.json (via js/city-overrides.js).
// Exact-alias queries inject the verified place first; fixIds/fixNames patch
// wrong fields on API results. Coordinates are never overwritten by fixes.
function curatedPlacesFor(q) {
  const O = window.WeatherMacOverrides;
  if (!O || !O.entries) return [];
  const norm = q.trim().toLowerCase();
  return O.entries
    .filter((e) => (e.aliases || []).some((a) => String(a).trim().toLowerCase() === norm))
    .map((e) => Object.assign({ curated: true }, e.place));
}
// Curated/admin tables are Simplified-only: convert local hits for zh-tw display.
function traditionalizeLocal(p) {
  const out = Object.assign({}, p);
  for (const k of ['name', 'country', 'admin1', 'admin2']) {
    if (typeof out[k] === 'string' && out[k]) {
      try { out[k] = window.WeatherMacI18n.toTraditional(out[k], false); } catch { /* keep */ }
    }
  }
  return out;
}
function applyPlaceFix(r) {
  const O = window.WeatherMacOverrides;
  if (!O || !O.entries) return r;
  for (const e of O.entries) {
    const byId = (e.fixIds || []).includes(r.id);
    const byName = (e.fixNames || []).some((n) => n === r.name);
    if ((byId || byName) && e.fields && Object.keys(e.fields).length) return Object.assign({}, r, e.fields);
  }
  return r;
}
// Expanded-DB toggles (settings checkboxes, default ON; lazy-loaded so OFF/ON costs nothing until used).
function useExpandedAirports() { return localStorage.getItem('weatherMac_expandAirports') !== '0'; }
function useExpandedAdmin() { return localStorage.getItem('weatherMac_expandAdmin') !== '0'; }
// Authoritative hierarchy fix from the admin-division table (China only).
// Only admin2 (prefecture level, where API errors cluster) is overridden, and
// only on unique county+-level name match or province-confirmed ambiguous match.
// admin1 is left alone (table names carry 省/自治区 suffixes, API display omits
// them). Never touches coordinates.
function applyAdminFix(admin, r) {
  if (!admin || !r || r.country_code !== 'CN') return r;
  const matches = ((admin.byName.get(r.name) || []).filter((m) => m.level >= 2));
  if (!matches.length) return r;
  const pick = matches.length === 1 ? matches[0]
    : matches.find((m) => admin.chain(m)[0] === r.admin1 || admin.chain(m)[0] === r.admin1 + '省' || admin.chain(m)[0] === r.admin1 + '自治区');
  if (!pick) return r;
  const chain = admin.chain(pick);
  if (!chain[1]) return r;
  const out = Object.assign({}, r);
  out.admin2 = chain[1];
  return out;
}
function showSource() { return localStorage.getItem('weatherMac_showSource') === '1'; }
function showCoords() { return localStorage.getItem('weatherMac_showCoords') === '1'; }
// Per-search provenance: dedupe key -> one of dict/airports/admin/meteo.
// Reset at each search start; never persisted (addCity stores clean objects).
let lastSources = new Map();
const SRC_LABEL = { dict: '本地纠错', airports: '本地airports', admin: '本地admin', meteo: 'open-meteo' };
function resultKey(r) { return r.id !== undefined ? 'id:' + r.id : r.latitude + ',' + r.longitude; }
function withSource(text, key) {
  if (!showSource()) return text;
  return text + ' (' + (SRC_LABEL[lastSources.get(key)] || SRC_LABEL.meteo) + ')';
}
document.getElementById('detail').addEventListener('error', (e) => {
  if (e.target.tagName === 'IMG') { e.target.outerHTML = '<span class="img-fallback"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg></span>'; }
}, true);
const searchCtx = { main: { timer: null, seq: 0 }, quick: { timer: null, seq: 0 } };
function bindSearch(inputId, boxId, tag) {
  document.getElementById(inputId).addEventListener('input', (e) => {
    const ctx = searchCtx[tag];
    clearTimeout(ctx.timer);
    const q = e.target.value.trim();
    const box = document.getElementById(boxId);
    if (q.length < 2) { box.innerHTML = ''; box.classList.add('hidden'); searchCtx[tag].seq++; return; }
    ctx.timer = setTimeout(() => { runCitySearch(q, box, e.target, tag).catch(() => {}); }, 300);
  });
}
async function runCitySearch(q, box, inputEl, tag) {
  const ctx = searchCtx[tag];
    box.innerHTML = '';
    const loading = document.createElement('div');
    loading.className = 'search-loading';
    loading.textContent = I18n.t(window.WeatherMacWindow.state.lang, 'searching');
    box.appendChild(loading);
    box.classList.remove('hidden');
    lastSources = new Map();
    const mySeq = ++ctx.seq;
    // Expanded airport DB: exact IATA match short-circuits everything. Coordinates
    // come from the local table; the display name is still resolved in UI language
    // via proximity pick (falls back to the table entry). Toggle off = old path.
    if (useExpandedAirports() && /^[A-Za-z0-9]{3,4}$/.test(q) && window.WeatherMacGeoDB) {
      let hit = null;
      try {
        const table = await window.WeatherMacGeoDB.getAirports();
        hit = table && table.get(q.toUpperCase());
      } catch (err) { hit = null; }
      if (hit) {
        const lang = window.WeatherMacWindow.state.lang;
        let display = { name: hit[1], latitude: hit[4], longitude: hit[5], timezone: 'auto', country: hit[3], admin1: hit[2] };
        try {
          const batch = await Api.searchCity(hit[1], lang);
          let best = null, bestD = 0.5;
          for (const r of batch) {
            const d = Math.hypot(r.latitude - hit[4], r.longitude - hit[5]);
            if (d < bestD) { bestD = d; best = r; }
          }
          if (best) display = best;
          else {
            // No GeoNames record for this airport: keep the proper name (no
            // exonym exists to translate it) but localize the hierarchy.
            try {
              const rev = await Api.reverseGeocode(hit[4], hit[5], lang);
              const f = fieldsFromReverse(rev);
              if (f) display = { name: hit[1], latitude: hit[4], longitude: hit[5], timezone: 'auto',
                country: f.country || hit[3], admin1: f.admin1, admin2: f.admin2 };
            } catch (err) { /* keep table entry */ }
          }
        } catch (err) { /* keep table entry */ }
        const b = document.createElement('button');
        lastSources.set(resultKey(display), 'airports');
        b.textContent = withSource([display.name, display.admin2, display.admin1, display.country].filter(Boolean).join(' · '), resultKey(display));
        b.addEventListener('click', () => {
          window.WeatherMacWindow.addCity(display);
          box.innerHTML = ''; box.classList.add('hidden'); inputEl.value = ''; hideQuickSearch();
        });
        if (mySeq !== ctx.seq) return;
        box.innerHTML = '';
        box.appendChild(b);
        return;
      }
    }
    // wttr.in-style IP lookup: "8.8.8.8" resolves via the IP provider chain, then geocoding.
    const ipm = q.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipm && ipm.slice(1).every((n) => Number(n) <= 255)) {
      let geo = null;
      try { geo = await Api.lookupIP(q); } catch (err) { geo = null; }
      if (geo && geo.status === 'success' && geo.city) {
        let found = [];
        try { found = await Api.searchCity(geo.city, window.WeatherMacWindow.state.lang); } catch (err) { found = []; }
        // Prefer the candidate nearest the IP coordinates (same-name towns exist
        // in many states; raw API order is not reliable here).
        let pick = found[0];
        if (pick && Number.isFinite(geo.lat) && Number.isFinite(geo.lon)) {
          let best = null, bestD = 5;
          for (const r of found) {
            const d = Math.hypot(r.latitude - geo.lat, r.longitude - geo.lon);
            if (d < bestD) { bestD = d; best = r; }
          }
          if (best) pick = best;
        }
        const place = pick || { name: geo.city, latitude: geo.lat, longitude: geo.lon, timezone: geo.timezone || 'auto', country: geo.country, admin1: '' };
        if (mySeq !== ctx.seq) return;
        box.innerHTML = '';
        const b = document.createElement('button');
        b.textContent = [place.name, place.admin2, place.admin1, place.country].filter(Boolean).join(' · ');
        b.addEventListener('click', () => {
          window.WeatherMacWindow.addCity(place);
          box.innerHTML = ''; box.classList.add('hidden'); inputEl.value = ''; hideQuickSearch();
        });
        box.appendChild(b);
      } else {
        if (mySeq !== ctx.seq) return;
        box.innerHTML = '';
        const empty = document.createElement('div');
        empty.className = 'search-empty';
        empty.textContent = I18n.t(window.WeatherMacWindow.state.lang, 'noResults');
        box.appendChild(empty);
      }
      return;
    }
    // wttr.in-style direct coordinates: "39.9,116.4" / "39.9 116.4" / "39.9，116.4",
    // plus Wikipedia DMS: "28°22′N 100°14′E" / "28°22'30"N, 100°14'10"E".
    const m = q.match(/^(-?\d+(?:\.\d+)?)\s*[,，\s]\s*(-?\d+(?:\.\d+)?)$/);
    let coords = null;
    if (m) {
      const lat = parseFloat(m[1]);
      const lon = parseFloat(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        coords = { lat, lon };
      }
    }
    if (!coords) coords = parseDMSCoord(q);
    if (coords) {
      const { lat, lon } = coords;
        let name = `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
        let admin1 = '';
        let country = '';
        try {
          const rev = await window.WeatherMacApi.reverseGeocode(lat, lon, window.WeatherMacWindow.state.lang);
          name = rev.city || rev.locality || name;
          admin1 = rev.principalSubdivision || '';
          country = rev.countryName || '';
        } catch (err) { /* keep coordinate label */ }
        const b = document.createElement('button');
        if (mySeq !== ctx.seq) return;
        box.innerHTML = '';
        b.textContent = [name, admin1, country].filter(Boolean).join(' · ');
        b.addEventListener('click', () => {
          window.WeatherMacWindow.addCity({ name, latitude: lat, longitude: lon, timezone: 'auto', country, admin1 });
          box.innerHTML = ''; box.classList.add('hidden'); inputEl.value = ''; hideQuickSearch();
        });
        box.appendChild(b);
        return;
    }
    const uiLang = window.WeatherMacWindow.state.lang;
    const langs = [uiLang];
    const detected = detectQueryLang(q);
    // zh-tw already searches in Simplified inside searchCity, so a trailing
    // 'zh' batch with the Traditional query would only waste a request.
    if (detected && detected !== langs[0] && !(langs[0] === 'zh-tw' && detected === 'zh')) langs.push(detected);
    // Local dicts are Simplified: match with the Simplified query, then
    // convert curated hits back so they display Traditional under zh-tw.
    const dictQ = langs[0] === 'zh-tw' ? I18n.toSimplified(q) : q;
    const queries = [q];
    // Short CJK queries often miss the well-known place ('大理' finds a Sichuan
    // town but not 大理市 Yunnan), so retry with 市/省 suffixes and merge.
    if (/[一-鿿]$/.test(q) && q.length <= 4 && !/[市省州县区旗盟]$/.test(q)) {
      queries.push(q + '市', q + '省');
    }
    // Expanded admin DB: prefix matches contribute canonical full names as extra
    // queries (data-driven recall, e.g. "迪庆" -> "迪庆藏族自治州"). Toggle off = skip.
    let adminDb = null;
    const adminQueries = new Set();
    if (useExpandedAdmin() && window.WeatherMacGeoDB) {
      try {
        adminDb = await window.WeatherMacGeoDB.getAdmin();
        if (adminDb) {
          let added = 0;
            for (const [name] of adminDb.byName) {
              if (added >= 3) break;
              if (name !== dictQ && name.startsWith(dictQ)) {
              if (!queries.includes(name)) { queries.push(name); added++; adminQueries.add(name); }
            }
          }
        }
      } catch (err) { adminDb = null; }
    }
    // Query every candidate combination and merge by place id, preferring the UI
    // language copy so names display localized whenever the API provides it.
    // Curated override places go in first and win ties; near-duplicates of
    // them (same spot from the API) are dropped.
    // Sort by population so famous places outrank same-name villages.
    const seen = new Map();
    const curated = curatedPlacesFor(dictQ).map((p) => (langs[0] === 'zh-tw' ? traditionalizeLocal(p) : p));
    const nearCurated = (r) => curated.some((p) =>
      Math.abs(p.latitude - r.latitude) < 0.05 && Math.abs(p.longitude - r.longitude) < 0.05);
    for (const p of curated) {
      seen.set(`cur:${p.latitude.toFixed(3)},${p.longitude.toFixed(3)}`, p);
      lastSources.set(resultKey(p), 'dict');
    }
    for (const qq of queries) {
      for (const lg of langs) {
        let batch = [];
        try { batch = await window.WeatherMacApi.searchCity(qq, lg); }
        catch (err) { batch = []; }
        for (const r of batch) {
          let fixed = adminDb ? applyAdminFix(adminDb, r) : r;
          fixed = applyPlaceFix(fixed);
          const key = resultKey(fixed);
          if (!seen.has(key) && !nearCurated(fixed)) {
            seen.set(key, fixed);
            if (!lastSources.has(key)) lastSources.set(key, adminQueries.has(qq) ? 'admin' : 'meteo');
          }
        }
      }
    }
    const ranked = [...seen.values()]
      .sort((a, b) => ((b.curated ? 1 : 0) - (a.curated ? 1 : 0)) || ((b.population || 0) - (a.population || 0)));
    // wttr.in-style airport codes ("PEK"): the API resolves them but buries the
    // airport behind same-code noise, so boost airport-like matches to the top.
    if (/^[A-Za-z]{3,4}$/.test(q)) {
      const isAirport = (r) => /机场|空港|airport/i.test([r.name, r.admin1, r.admin2].filter(Boolean).join(' '));
      ranked.sort((a, b) => ((isAirport(b) ? 1 : 0) - (isAirport(a) ? 1 : 0)));
    }
    const results = ranked.slice(0, 8);
    if (mySeq !== ctx.seq) return;
    box.innerHTML = '';
    if (!results.length) {
      const empty = document.createElement('div');
      empty.className = 'search-empty';
      empty.textContent = I18n.t(window.WeatherMacWindow.state.lang, 'noResults');
      box.appendChild(empty);
      return;
    }
    results.forEach((r) => {
      const b = document.createElement('button');
        b.textContent = withSource([r.name, r.admin2, r.admin1, r.country].filter(Boolean).join(' · '), resultKey(r));
      b.addEventListener('click', () => { window.WeatherMacWindow.addCity(r); box.innerHTML = ''; box.classList.add('hidden'); inputEl.value = ''; hideQuickSearch(); });
      box.appendChild(b);
    });
}
bindSearch('citySearch', 'searchResults', 'main');
// Titlebar controls are rebuilt on every buildAll (language switch), so this
// (re)binds them to the fresh elements. Called once at startup and after each
// buildAll in applyChromeLang.
function bindTitlebarControls() {
  bindSearch('quickSearch', 'quickResults', 'quick');
  $('quickSearch').placeholder = tt('searchPlaceholder');
  // Sidebar collapse toggle + quick search (visible while collapsed).
  document.getElementById('sidebarToggle').addEventListener('click', () => {
  const bar = document.getElementById('sidebar');
  bar.classList.toggle('hidden');
  const collapsed = bar.classList.contains('hidden');
  document.getElementById('quickSearchBtn').classList.toggle('hidden', !collapsed);
  if (!collapsed) hideQuickSearch();
});
document.getElementById('quickSearchBtn').addEventListener('click', () => {
  const btn = document.getElementById('quickSearchBtn');
  const box = document.getElementById('quickSearchBox');
  const input = document.getElementById('quickSearch');
  const results = document.getElementById('quickResults');
  const show = box.classList.contains('hidden');
  btn.classList.toggle('hidden', show);
  box.classList.toggle('hidden', !show);
  if (show) input.focus();
  else { input.value = ''; results.innerHTML = ''; results.classList.add('hidden'); }
});
document.getElementById('quickSearch').addEventListener('blur', (e) => {
  if (!e.target.value.trim()) hideQuickSearch();
});
}
bindTitlebarControls();
// Window drag starts on mousedown anywhere on the handle: keep it from firing
// on the rebuilt titlebar controls (the handle itself persists, one capture
// listener covers all rebuilds).
document.getElementById('windowDragHandle').addEventListener('mousedown', (e) => {
  if (e.target && e.target.closest && e.target.closest('button, input')) e.stopPropagation();
}, true);
function hideQuickSearch() {
  const box = document.getElementById('quickSearchBox');
  const input = document.getElementById('quickSearch');
  const results = document.getElementById('quickResults');
  if (box && !box.classList.contains('hidden')) {
    box.classList.add('hidden');
    document.getElementById('quickSearchBtn').classList.remove('hidden');
    if (input) input.value = '';
  }
  if (results) { results.innerHTML = ''; results.classList.add('hidden'); }
}
function openSettings() { document.getElementById('settingsModal').classList.remove('hidden'); }
// Repaint every non-weather UI string for the current language: static labels,
// titlebars, pickers, city list and clock. Weather data itself re-renders via refreshActive().
function applyChromeLang() {
  const lang = state.lang;
  document.documentElement.lang = lang;
  document.title = ct('appName');
  $('menuAppName').textContent = ct('appName');
  $('desktopWeatherLabel').textContent = ct('weather');
  $('desktopSettingsLabel').textContent = ct('settings');
  $('desktopWeatherIcon').title = ct('openWeather');
  $('desktopSettingsIcon').title = ct('openSettings');
  $('dockWeather').title = ct('weather');
  $('widgetCard').title = ct('openWeather');
  $('weatherWindow').setAttribute('aria-label', ct('weather'));
  $('citySearch').placeholder = tt('searchPlaceholder');
  $('quickSearch').placeholder = tt('searchPlaceholder');
  $('lblUnit').textContent = ct('tempUnit');
  $('lblLang').textContent = ct('language');
  $('lblTheme').textContent = ct('theme');
  $('optDark').textContent = ct('dark');
  $('optLight').textContent = ct('light');
  $('lgWallpaper').textContent = ct('wallpaper');
  $('lgGlass').textContent = ct('glassEffect');
  $('lblHourClock').textContent = ct('hourClock');
  $('optHour12').textContent = ct('hour12');
  $('optHour24').textContent = ct('hour24');
  $('lblRefresh').textContent = ct('refresh');
  $('optRefreshOff').textContent = ct('refreshOff');
  $('lblExpandAirports').textContent = ct('expandAirports');
  $('lblExpandAdmin').textContent = ct('expandAdmin');
  $('lblShowSource').textContent = ct('showSource');
  $('lblShowCoords').textContent = ct('showCoords');
  $('galleryClose').setAttribute('aria-label', ct('close'));
  $('galleryPrev').setAttribute('aria-label', ct('galleryPrev'));
  $('galleryNext').setAttribute('aria-label', ct('galleryNext'));
  window.WeatherMacTitlebar.buildAll(lang);
  bindTitlebarControls();
  renderWallpaperPicker(localStorage.getItem('weatherMac_wallpaper') || 'tahoe-auto');
  renderGlassPicker(currentGlass());
  renderCityList();
  Desktop.renderClock();
}
function namesOf(c) { c.names = c.names || {}; return c.names; }
function snapshotOf(c) { return { name: c.name, admin1: c.admin1, admin2: c.admin2, country: c.country }; }
function applySnapshot(c, snap) {
  let touched = false;
  for (const k of ['name', 'admin1', 'admin2', 'country']) {
    if (snap[k] && snap[k] !== c[k]) { c[k] = snap[k]; touched = true; }
  }
  return touched;
}
// Build display fields from a BigDataCloud reverse-geocode response without
// inventing names: the locality is only used as admin2 when it differs.
function fieldsFromReverse(rev) {
  const name = rev.city || rev.locality;
  if (!name) return null;
  return { name,
    admin1: rev.principalSubdivision || '',
    admin2: (rev.locality && rev.locality !== name) ? rev.locality : '',
    country: rev.countryName || '' };
}
// Language switch: per-city per-language cache first (no network on switch-back),
// otherwise query — exact place via id when available, reverse geocode as fallback.
async function relocalizeCities(lang) {
  let changed = false;
  for (const c of state.cities) {
    if (c.curated) continue;
    const cache = namesOf(c);
    if (cache[lang]) {
      if (applySnapshot(c, cache[lang])) changed = true;
      continue;
    }
    let rec = null;
    if (c.id !== undefined) {
      try {
        const p = await Api.getPlace(c.id, lang);
        if (p && p.name) rec = { name: p.name, admin1: p.admin1, admin2: p.admin2, country: p.country };
      } catch (err) { rec = null; }
    }
    if (!rec) {
      try {
        rec = fieldsFromReverse(await Api.reverseGeocode(c.latitude, c.longitude, lang));
      } catch (err) { rec = null; }
    }
    if (rec && rec.name) {
      cache[lang] = { name: rec.name, admin1: rec.admin1, admin2: rec.admin2, country: rec.country };
      if (applySnapshot(c, cache[lang])) changed = true;
    }
  }
  if (changed) { saveState(); renderCityList(); }
}
function initSwitch(btnId, stateId, key, def, onToggle) {
  const btn = document.getElementById(btnId);
  const st = document.getElementById(stateId);
  const render = () => {
    const on = (localStorage.getItem(key) || def) === '1';
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    st.classList.toggle('on', on);
    st.textContent = on ? 'ON' : 'OFF';
  };
  btn.addEventListener('click', () => {
    localStorage.setItem(key, btn.classList.contains('on') ? '0' : '1');
    render();
    if (onToggle) onToggle();
  });
  render();
}
function initSettings() {
  const langSel = document.getElementById('setLang');
  langSel.innerHTML = window.WeatherMacI18n.LANGUAGES.map((l) => `<option value="${l.code}">${l.native} - ${l.en}</option>`).join('');
  const get = (k, d) => localStorage.getItem(k) || d;
  document.getElementById('setUnit').value = get('weatherMac_unit', 'celsius');
  langSel.value = get('weatherMac_lang', I18n.defaultLang());
  document.getElementById('setTheme').value = get('weatherMac_theme', 'dark');
    renderWallpaperPicker(get('weatherMac_wallpaper', 'tahoe-auto'));
    renderGlassPicker(currentGlass());
  document.getElementById('setHourClock').value = normalizeHourClock(get('weatherMac_hour12', '24'));
  document.getElementById('setRefresh').value = get('weatherMac_refresh', '60');
  initSwitch('setExpandAirports', 'stateExpandAirports', 'weatherMac_expandAirports', '1');
  initSwitch('setExpandAdmin', 'stateExpandAdmin', 'weatherMac_expandAdmin', '1');
  initSwitch('setShowSource', 'stateShowSource', 'weatherMac_showSource', '0');
  initSwitch('setShowCoords', 'stateShowCoords', 'weatherMac_showCoords', '0', () => renderCityList());
  // settings modal traffic lights are bound by the shared titlebar module (js/titlebar.js)
  const apply = () => {
    localStorage.setItem('weatherMac_unit', document.getElementById('setUnit').value);
    localStorage.setItem('weatherMac_lang', langSel.value);
    localStorage.setItem('weatherMac_theme', document.getElementById('setTheme').value);
    localStorage.setItem('weatherMac_hour12', normalizeHourClock(document.getElementById('setHourClock').value));
    localStorage.setItem('weatherMac_refresh', document.getElementById('setRefresh').value);
    const oldLang = window.WeatherMacWindow.state.lang;
    window.WeatherMacWindow.state.unit = document.getElementById('setUnit').value;
    window.WeatherMacWindow.state.lang = langSel.value;
    document.body.dataset.theme = document.getElementById('setTheme').value;
    applyChromeLang();
    window.WeatherMacDesktop.renderClock();
    applyRefreshTimer();
    window.WeatherMacWindow.refreshActive().catch(showToast);
    if (langSel.value !== oldLang) {
      relocalizeCities(langSel.value).then(() => window.WeatherMacWindow.refreshActive().catch(showToast));
    }
  };
  document.getElementById('settingsModal').addEventListener('change', apply);
}
  window.WeatherMacWindow = { state, loadState, saveState, addCity, removeCity, selectCity, refreshActive, openSettings };
window.WeatherMacDesktop.setWallpaper(localStorage.getItem('weatherMac_wallpaper') || 'tahoe-auto');
document.body.dataset.theme = localStorage.getItem('weatherMac_theme') || 'dark';
document.body.dataset.glass = localStorage.getItem('weatherMac_glass') || 'light';
initSettings();
applyChromeLang();
applyRefreshTimer();
})();
