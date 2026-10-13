// Lazy-loaded expanded geo databases (airport IATA table + admin divisions).
// Runtime files live in weather-macos/data/*.db.js and are injected via
// <script> (not fetch), so they also load on file:// where fetch is blocked.
// Each file assigns one window global, consumed once, then cleaned up.
// Loaded once per session and cached in memory; missing files yield null and
// callers fall back to the plain geocoding-API path.
(function () {
  const cache = { airports: undefined, admin: undefined };
  const pending = {};

  function loadScriptOnce(name) {
    if (!pending[name]) {
      pending[name] = new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'data/' + name;
        s.onload = () => resolve(true);
        s.onerror = () => { s.remove(); resolve(false); };
        document.head.appendChild(s);
      });
    }
    return pending[name];
  }

  function takeGlobal(key) {
    const data = window[key];
    try { delete window[key]; } catch (err) { window[key] = undefined; }
    return data;
  }

  // Map: IATA -> [iata, name, municipality, iso_country, lat, lon]
  async function getAirports() {
    if (cache.airports !== undefined) return cache.airports;
    const ok = await loadScriptOnce('airports.db.js');
    const data = ok ? takeGlobal('__AIRPORTS_DB') : null;
    if (!data || !Array.isArray(data.rows)) { cache.airports = null; return null; }
    const map = new Map();
    for (const r of data.rows) map.set(r[0], r);
    cache.airports = map;
    return map;
  }

  // { byCode: Map, byName: Map name -> rows, chain: (row) -> [province, prefecture, county?] }
  async function getAdmin() {
    if (cache.admin !== undefined) return cache.admin;
    const ok = await loadScriptOnce('admin-divisions_zh-cn.db.js');
    const data = ok ? takeGlobal('__ADMIN_DB') : null;
    if (!data || !Array.isArray(data.rows)) { cache.admin = null; return null; }
    const byCode = new Map();
    const byName = new Map();
    for (const r of data.rows) {
      const row = { code: r[0], name: r[1], parent: r[2], level: r[3] };
      byCode.set(row.code, row);
      if (!byName.has(row.name)) byName.set(row.name, []);
      byName.get(row.name).push(row);
    }
    const chain = (row) => {
      const names = [];
      let cur = row;
      while (cur) { names.unshift(cur.name); cur = byCode.get(cur.parent); }
      return names;
    };
    cache.admin = { byCode, byName, chain };
    return cache.admin;
  }

  window.WeatherMacGeoDB = { getAirports, getAdmin };
})();
